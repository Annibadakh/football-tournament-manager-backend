const { Payment, User } = require("../models");
const {
  PAYMENT_METHOD,
  PAYMENT_STATUS,
  RECEIPT_STATUSES,
} = require("../constants/payment.constants");

const PERSON_ATTRIBUTES = ["id", "uuid", "fullName", "email", "phone"];

const PAYMENT_INCLUDES = [
  { model: User, as: "paidBy", attributes: PERSON_ATTRIBUTES },
  { model: User, as: "recordedBy", attributes: PERSON_ATTRIBUTES },
];

const lockOption = (transaction, lock) => lock && transaction && { lock: transaction.LOCK.UPDATE };

const createPayment = (data, { transaction } = {}) => Payment.create(data, { transaction });

const updatePayment = (payment, changes, { transaction } = {}) =>
  payment.update(changes, { transaction });

const findPaymentByUuid = (uuid, { transaction, lock = false } = {}) =>
  Payment.findOne({ where: { uuid }, transaction, ...lockOption(transaction, lock) });

const findPaymentByOrderId = (gatewayOrderId, { transaction, lock = false } = {}) =>
  Payment.findOne({ where: { gatewayOrderId }, transaction, ...lockOption(transaction, lock) });

// An unpaid order for the same amount can be reused when the captain retries
const findOpenOnlinePayment = (teamId, amount) =>
  Payment.findOne({
    where: {
      teamId,
      method: PAYMENT_METHOD.ONLINE,
      status: PAYMENT_STATUS.CREATED,
      ...(amount !== undefined && { amount }),
    },
    order: [["createdAt", "DESC"]],
  });

// Payments with a receipt (paid or refund due), newest first
const findReceiptPaymentsByTeam = (teamId) =>
  Payment.findAll({
    where: { teamId, status: RECEIPT_STATUSES },
    include: PAYMENT_INCLUDES,
    order: [["paidAt", "DESC"]],
  });

// Latest receipt-bearing payment per team, for the organizer's teams list
const findReceiptPaymentsByTeams = (teamIds) =>
  teamIds.length
    ? Payment.findAll({
        where: { teamId: teamIds, status: RECEIPT_STATUSES },
        attributes: [
          "id",
          "uuid",
          "teamId",
          "method",
          "status",
          "amount",
          "receiptNumber",
          "paidAt",
        ],
        order: [["paidAt", "DESC"]],
      })
    : [];

const findPaymentWithDetails = (uuid) =>
  Payment.findOne({ where: { uuid }, include: [...PAYMENT_INCLUDES, "team", "tournament"] });

module.exports = {
  createPayment,
  updatePayment,
  findPaymentByUuid,
  findPaymentByOrderId,
  findOpenOnlinePayment,
  findReceiptPaymentsByTeam,
  findReceiptPaymentsByTeams,
  findPaymentWithDetails,
};
