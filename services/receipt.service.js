const PDFDocument = require("pdfkit");
const { APP_TIMEZONE } = require("../constants/common.constants");
const {
  OFFLINE_PAYMENT_MODE,
  PAYMENT_METHOD,
  PAYMENT_STATUS,
} = require("../constants/payment.constants");

const BRAND = {
  green: "#0F7B3F",
  ink: "#0B1F17",
  muted: "#5B6B63",
  line: "#DCE5E0",
  orange: "#F28C28",
};
const SUPPORT_EMAIL = "maidaan.app@gmail.com";

const OFFLINE_MODE_LABELS = {
  [OFFLINE_PAYMENT_MODE.CASH]: "Cash",
  [OFFLINE_PAYMENT_MODE.UPI]: "UPI",
  [OFFLINE_PAYMENT_MODE.BANK_TRANSFER]: "Bank transfer",
  [OFFLINE_PAYMENT_MODE.OTHER]: "Other",
};

// Built-in PDF fonts have no ₹ glyph, so amounts use the ISO code
const formatMoney = (value) =>
  `INR ${Number(value).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const formatDateTime = (date) =>
  new Date(date).toLocaleString("en-IN", {
    timeZone: APP_TIMEZONE,
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

const methodLabel = (payment) =>
  payment.method === PAYMENT_METHOD.ONLINE
    ? "Online (Razorpay)"
    : `Offline (${OFFLINE_MODE_LABELS[payment.offlineMode] ?? "Other"})`;

const PAGE_MARGIN = 50;

const drawRows = (doc, rows, { x, width }) => {
  rows.forEach(([label, value]) => {
    const y = doc.y;
    doc.font("Helvetica").fontSize(10).fillColor(BRAND.muted).text(label, x, y, { width: 150 });
    doc
      .font("Helvetica")
      .fillColor(BRAND.ink)
      .text(value ?? "-", x + 160, y, { width: width - 160 });
    doc.moveDown(0.5);
  });
};

const drawAmounts = (doc, payment, { x, width }) => {
  const rows = [["Entry fee", payment.entryFee]];
  if (Number(payment.convenienceFee) > 0) rows.push(["Convenience fee", payment.convenienceFee]);
  doc
    .moveTo(x, doc.y)
    .lineTo(x + width, doc.y)
    .strokeColor(BRAND.line)
    .stroke();
  doc.moveDown(0.6);
  rows.forEach(([label, value]) => {
    const y = doc.y;
    doc.font("Helvetica").fontSize(11).fillColor(BRAND.ink).text(label, x, y);
    doc.text(formatMoney(value), x, y, { width, align: "right" });
    doc.moveDown(0.5);
  });
  doc
    .moveTo(x, doc.y)
    .lineTo(x + width, doc.y)
    .strokeColor(BRAND.line)
    .stroke();
  doc.moveDown(0.6);
  const y = doc.y;
  doc.font("Helvetica-Bold").fontSize(13).fillColor(BRAND.ink).text("Total paid", x, y);
  doc.text(formatMoney(payment.amount), x, y, { width, align: "right" });
};

// Streams an A4 receipt into the given writable (the HTTP response)
const writeReceipt = (output, { payment, team }) => {
  const doc = new PDFDocument({
    size: "A4",
    margin: PAGE_MARGIN,
    info: { Title: `Receipt ${payment.receiptNumber}`, Author: "Maidaan" },
  });
  doc.pipe(output);
  const width = doc.page.width - PAGE_MARGIN * 2;
  const x = PAGE_MARGIN;

  // Header band
  doc.rect(0, 0, doc.page.width, 90).fill(BRAND.green);
  doc.font("Helvetica-Bold").fontSize(26).fillColor("#FFFFFF").text("Maidaan", x, 30);
  doc
    .font("Helvetica")
    .fontSize(10)
    .fillColor("#FFFFFF")
    .text("maidaanapp.live", x, 38, { width, align: "right" });

  doc.y = 120;
  doc.font("Helvetica-Bold").fontSize(18).fillColor(BRAND.ink).text("Payment receipt", x);
  doc.moveDown(0.3);
  doc
    .font("Helvetica")
    .fontSize(10)
    .fillColor(BRAND.muted)
    .text(`Receipt no. ${payment.receiptNumber}`, x);
  doc.moveDown(1.2);

  const captainName = payment.paidBy?.fullName ?? team.captain?.fullName;
  drawRows(
    doc,
    [
      ["Date", formatDateTime(payment.paidAt)],
      ["Received from", captainName ? `${captainName} (captain)` : "-"],
      ["Team", `${team.name} (${team.shortName})`],
      ["Tournament", team.tournament.name],
      ["Payment method", methodLabel(payment)],
      [
        payment.method === PAYMENT_METHOD.ONLINE ? "Razorpay payment ID" : "Reference",
        payment.method === PAYMENT_METHOD.ONLINE ? payment.gatewayPaymentId : payment.reference,
      ],
      ...(payment.recordedBy ? [["Recorded by", payment.recordedBy.fullName]] : []),
    ],
    { x, width },
  );
  doc.moveDown(1);

  drawAmounts(doc, payment, { x, width });
  doc.moveDown(2);

  if (payment.status === PAYMENT_STATUS.REFUND_DUE) {
    doc
      .font("Helvetica-Bold")
      .fontSize(10)
      .fillColor(BRAND.orange)
      .text(
        "Refund due: this payment arrived after the team was already confirmed, withdrawn or removed. The amount will be refunded.",
        x,
        doc.y,
        { width },
      );
    doc.moveDown(1);
  }

  doc
    .font("Helvetica")
    .fontSize(9)
    .fillColor(BRAND.muted)
    .text(
      `This is a computer-generated receipt and needs no signature. Questions? Write to ${SUPPORT_EMAIL}.`,
      x,
      doc.y,
      { width },
    );

  doc.end();
};

module.exports = { writeReceipt, formatMoney };
