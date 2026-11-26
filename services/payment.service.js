const { sequelize } = require("../models");
const config = require("../config/env");
const logger = require("../config/logger");
const paymentRepository = require("../repositories/payment.repository");
const teamRepository = require("../repositories/team.repository");
const gateway = require("./paymentGateway.service");
const teamService = require("./team.service");
const { canManageTournament } = require("./tournamentAccess.service");
const ApiError = require("../utils/ApiError");
const { APP_TIMEZONE } = require("../constants/common.constants");
const { TOURNAMENT_STATUS } = require("../constants/tournament.constants");
const { TEAM_STATUS } = require("../constants/team.constants");
const {
  GATEWAY_EVENT,
  PAYMENT_METHOD,
  PAYMENT_RULES,
  PAYMENT_STATUS,
  RECEIPT_STATUSES,
} = require("../constants/payment.constants");

// Online payment stays open until the tournament starts
const PAYABLE_TOURNAMENT_STATUSES = [TOURNAMENT_STATUS.DRAFT, TOURNAMENT_STATUS.REGISTRATION_OPEN];

// ---------- money (integer paise, never floats) ----------

const toPaise = (rupees) => Math.round(Number(rupees ?? 0) * 100);
const toRupees = (paise) => (paise / 100).toFixed(2);

// Convenience fee = entry fee × platform rate, rounded up to the whole rupee
const computeCharges = (entryFee) => {
  const entryFeePaise = toPaise(entryFee);
  const feeRupees = Math.ceil((entryFeePaise * config.payments.convenienceFeeBps) / 1000000);
  const convenienceFeePaise = feeRupees * 100;
  return {
    entryFeePaise,
    convenienceFeePaise,
    totalPaise: entryFeePaise + convenienceFeePaise,
  };
};

const presentCharges = ({ entryFeePaise, convenienceFeePaise, totalPaise }) => ({
  entryFee: entryFeePaise / 100,
  convenienceFee: convenienceFeePaise / 100,
  total: totalPaise / 100,
  convenienceFeePercent: config.payments.convenienceFeeBps / 100,
  currency: PAYMENT_RULES.CURRENCY,
});

// ---------- presenters ----------

const presentPerson = (user) => user && { id: user.uuid, fullName: user.fullName };

const presentPayment = (payment) => ({
  id: payment.uuid,
  method: payment.method,
  status: payment.status,
  offlineMode: payment.offlineMode,
  reference: payment.reference,
  entryFee: Number(payment.entryFee),
  convenienceFee: Number(payment.convenienceFee),
  amount: Number(payment.amount),
  currency: payment.currency,
  receiptNumber: payment.receiptNumber,
  gatewayPaymentId: payment.gatewayPaymentId,
  paidAt: payment.paidAt,
  paidBy: presentPerson(payment.paidBy),
  recordedBy: presentPerson(payment.recordedBy),
});

// ---------- helpers ----------

const canSeePayments = (viewer, team) =>
  teamService.isCaptainOf(viewer, team) || canManageTournament(viewer, team.tournament);

const isTournamentPayable = (tournament) => PAYABLE_TOURNAMENT_STATUSES.includes(tournament.status);

const receiptNumberFor = (payment, paidAt) => {
  const year = paidAt.toLocaleDateString("en-CA", { timeZone: APP_TIMEZONE }).slice(0, 4);
  return `${PAYMENT_RULES.RECEIPT_PREFIX}-${year}-${String(payment.id).padStart(6, "0")}`;
};

// Marks a payment received; confirms the team only if it is still waiting for payment
const settlePayment = async (payment, changes, actor, { transaction }) => {
  const team = await teamRepository.findTeamById(payment.teamId, { transaction, lock: true });
  const paidAt = new Date();
  const confirmsTeam = team.status === TEAM_STATUS.AWAITING_PAYMENT;
  if (confirmsTeam) {
    await teamRepository.updateTeam(
      team,
      { status: TEAM_STATUS.CONFIRMED, confirmedAt: paidAt, confirmedBy: actor?.id ?? null },
      { transaction },
    );
  }
  await paymentRepository.updatePayment(
    payment,
    {
      ...changes,
      status: confirmsTeam ? PAYMENT_STATUS.PAID : PAYMENT_STATUS.REFUND_DUE,
      paidAt,
      receiptNumber: receiptNumberFor(payment, paidAt),
      failureReason: null,
    },
    { transaction },
  );
  if (!confirmsTeam) {
    logger.warn({ paymentId: payment.uuid, teamStatus: team.status }, "Payment marked refund due");
  }
  return payment;
};

// Shared by the checkout callback and the webhook; safe to run twice
const settleOnlinePayment = ({ orderId, paymentId, amountPaise }) =>
  sequelize.transaction(async (transaction) => {
    const payment = await paymentRepository.findPaymentByOrderId(orderId, {
      transaction,
      lock: true,
    });
    if (!payment) {
      logger.warn({ orderId }, "Payment event for an unknown order");
      return null;
    }
    if (payment.status !== PAYMENT_STATUS.CREATED) return payment;
    if (amountPaise !== undefined && amountPaise !== toPaise(payment.amount)) {
      logger.error({ orderId, amountPaise }, "Paid amount doesn't match the order");
      return payment;
    }
    return settlePayment(payment, { gatewayPaymentId: paymentId }, null, { transaction });
  });

// ---------- queries ----------

const getTeamPayments = async (viewer, teamUuid) => {
  const team = await teamService.findTeam(teamUuid);
  if (!canSeePayments(viewer, team)) throw ApiError.forbidden("You can't see this team's payments");
  const hasFee = toPaise(team.tournament.entryFee) > 0;
  const [payments, openPayment] = await Promise.all([
    paymentRepository.findReceiptPaymentsByTeam(team.id),
    paymentRepository.findOpenOnlinePayment(team.id),
  ]);
  return {
    charges: hasFee ? presentCharges(computeCharges(team.tournament.entryFee)) : null,
    isOnlineEnabled: gateway.isEnabled(),
    canPayOnline:
      hasFee &&
      gateway.isEnabled() &&
      teamService.isCaptainOf(viewer, team) &&
      team.status === TEAM_STATUS.AWAITING_PAYMENT &&
      isTournamentPayable(team.tournament),
    // Why the captain's last online attempt failed (cleared once paid)
    lastFailureReason:
      team.status === TEAM_STATUS.AWAITING_PAYMENT ? (openPayment?.failureReason ?? null) : null,
    payments: payments.map(presentPayment),
  };
};

// ---------- commands ----------

const createPaymentOrder = async (user, teamUuid) => {
  const team = await teamService.findTeam(teamUuid);
  if (!teamService.isCaptainOf(user, team))
    throw ApiError.forbidden("Only the captain can pay the entry fee");
  if (team.status !== TEAM_STATUS.AWAITING_PAYMENT)
    throw ApiError.conflict("This team isn't waiting for payment");
  if (!isTournamentPayable(team.tournament))
    throw ApiError.badRequest("Online payment is closed because the tournament has started");
  if (toPaise(team.tournament.entryFee) === 0)
    throw ApiError.badRequest("This tournament has no entry fee");

  const charges = computeCharges(team.tournament.entryFee);
  const amount = toRupees(charges.totalPaise);

  // Retrying reuses the open order while the amount is unchanged
  let payment = await paymentRepository.findOpenOnlinePayment(team.id, amount);
  if (!payment) {
    const order = await gateway.createOrder({
      amountPaise: charges.totalPaise,
      receipt: `team-${team.id}-${Date.now()}`,
      notes: { teamId: team.uuid, tournamentId: team.tournament.uuid },
    });
    payment = await paymentRepository.createPayment({
      teamId: team.id,
      tournamentId: team.tournamentId,
      method: PAYMENT_METHOD.ONLINE,
      status: PAYMENT_STATUS.CREATED,
      entryFee: toRupees(charges.entryFeePaise),
      convenienceFee: toRupees(charges.convenienceFeePaise),
      amount,
      currency: PAYMENT_RULES.CURRENCY,
      gatewayOrderId: order.orderId,
      paidByUserId: user.id,
    });
  }

  return {
    paymentId: payment.uuid,
    keyId: gateway.keyId(),
    orderId: payment.gatewayOrderId,
    amountPaise: charges.totalPaise,
    currency: PAYMENT_RULES.CURRENCY,
    description: `Entry fee · ${team.name} · ${team.tournament.name}`,
    charges: presentCharges(charges),
    prefill: {
      name: user.fullName,
      email: user.email,
      contact: user.phone ? `+91${user.phone}` : undefined,
    },
  };
};

const findOwnOnlinePayment = async (user, paymentUuid) => {
  const payment = await paymentRepository.findPaymentByUuid(paymentUuid);
  if (!payment || payment.method !== PAYMENT_METHOD.ONLINE || payment.paidByUserId !== user.id)
    throw ApiError.notFound("Payment not found");
  return payment;
};

const verifyCheckoutPayment = async (user, paymentUuid, { orderId, paymentId, signature }) => {
  const payment = await findOwnOnlinePayment(user, paymentUuid);
  if (
    payment.gatewayOrderId !== orderId ||
    !gateway.isCheckoutSignatureValid({ orderId, paymentId, signature })
  ) {
    throw ApiError.badRequest(
      "We couldn't verify this payment. If money was deducted, it will be confirmed automatically or refunded by Razorpay.",
    );
  }
  const settled = await settleOnlinePayment({ orderId, paymentId });
  return presentPayment(settled);
};

// Informational: shows the captain why the last attempt failed
const recordCheckoutFailure = async (user, paymentUuid, { reason }) => {
  const payment = await findOwnOnlinePayment(user, paymentUuid);
  if (payment.status === PAYMENT_STATUS.CREATED) {
    await paymentRepository.updatePayment(payment, {
      failureReason: reason.slice(0, PAYMENT_RULES.FAILURE_REASON_MAX_LENGTH),
    });
  }
  return null;
};

// Razorpay webhooks: unknown or irrelevant events are acknowledged and ignored
const handleWebhook = async (rawBody, signature) => {
  if (!gateway.isWebhookSignatureValid(rawBody, signature))
    throw ApiError.badRequest("Invalid webhook signature");

  const event = JSON.parse(rawBody.toString("utf8"));
  const entity = event.payload?.payment?.entity;
  if (!entity?.order_id) return;

  if ([GATEWAY_EVENT.PAYMENT_CAPTURED, GATEWAY_EVENT.ORDER_PAID].includes(event.event)) {
    await settleOnlinePayment({
      orderId: entity.order_id,
      paymentId: entity.id,
      amountPaise: entity.amount,
    });
  } else if (event.event === GATEWAY_EVENT.PAYMENT_FAILED) {
    const payment = await paymentRepository.findPaymentByOrderId(entity.order_id);
    if (payment?.status === PAYMENT_STATUS.CREATED) {
      await paymentRepository.updatePayment(payment, {
        failureReason: (entity.error_description ?? "Payment failed").slice(
          0,
          PAYMENT_RULES.FAILURE_REASON_MAX_LENGTH,
        ),
      });
    }
  }
};

// Organizer/admin confirms a team that paid at the ground, by UPI, etc.
const recordOfflinePayment = async (actor, teamUuid, { amount, mode, reference }) => {
  await sequelize.transaction(async (transaction) => {
    const team = await teamService.findTeam(teamUuid, { transaction, lock: true });
    if (!canManageTournament(actor, team.tournament))
      throw ApiError.forbidden("You can't manage this team");
    if (team.status !== TEAM_STATUS.AWAITING_PAYMENT)
      throw ApiError.conflict("Only teams awaiting payment can be confirmed");
    const payment = await paymentRepository.createPayment(
      {
        teamId: team.id,
        tournamentId: team.tournamentId,
        method: PAYMENT_METHOD.OFFLINE,
        status: PAYMENT_STATUS.CREATED,
        offlineMode: mode,
        reference: reference || null,
        entryFee: toRupees(toPaise(amount)),
        convenienceFee: "0.00",
        amount: toRupees(toPaise(amount)),
        currency: PAYMENT_RULES.CURRENCY,
        paidByUserId: team.captainUserId,
        recordedByUserId: actor.id,
      },
      { transaction },
    );
    await settlePayment(payment, {}, actor, { transaction });
  });
  return teamService.getTeamForViewer(actor, teamUuid);
};

// Receipt data for the PDF; only the captain, the organizer and admins can open it
const getReceiptPayment = async (viewer, paymentUuid) => {
  const payment = await paymentRepository.findPaymentWithDetails(paymentUuid);
  if (!payment || !RECEIPT_STATUSES.includes(payment.status))
    throw ApiError.notFound("Receipt not found");
  const team = await teamService.findTeam(payment.team.uuid);
  if (!canSeePayments(viewer, team)) throw ApiError.forbidden("You can't open this receipt");
  return { payment, team };
};

module.exports = {
  computeCharges,
  presentPayment,
  getTeamPayments,
  createPaymentOrder,
  verifyCheckoutPayment,
  recordCheckoutFailure,
  handleWebhook,
  recordOfflinePayment,
  getReceiptPayment,
};
