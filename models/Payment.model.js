const { DataTypes } = require("sequelize");
const {
  OFFLINE_PAYMENT_MODE,
  PAYMENT_METHOD,
  PAYMENT_STATUS,
} = require("../constants/payment.constants");

module.exports = (sequelize) => {
  const Payment = sequelize.define(
    "Payment",
    {
      id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
      uuid: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        allowNull: false,
        unique: true,
      },
      teamId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
      tournamentId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
      method: {
        type: DataTypes.TINYINT.UNSIGNED,
        allowNull: false,
        validate: { isIn: [Object.values(PAYMENT_METHOD)] },
      },
      status: {
        type: DataTypes.TINYINT.UNSIGNED,
        allowNull: false,
        validate: { isIn: [Object.values(PAYMENT_STATUS)] },
      },
      offlineMode: {
        type: DataTypes.TINYINT.UNSIGNED,
        allowNull: true,
        validate: { isIn: [Object.values(OFFLINE_PAYMENT_MODE)] },
      },
      reference: { type: DataTypes.STRING(100), allowNull: true },
      entryFee: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
      convenienceFee: { type: DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 0 },
      amount: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
      currency: { type: DataTypes.CHAR(3), allowNull: false, defaultValue: "INR" },
      gatewayOrderId: { type: DataTypes.STRING(40), allowNull: true },
      gatewayPaymentId: { type: DataTypes.STRING(40), allowNull: true },
      failureReason: { type: DataTypes.STRING(255), allowNull: true },
      receiptNumber: { type: DataTypes.STRING(20), allowNull: true },
      paidByUserId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
      recordedByUserId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
      paidAt: { type: DataTypes.DATE, allowNull: true },
    },
    { tableName: "payments" },
  );

  Payment.associate = (models) => {
    Payment.belongsTo(models.Team, { foreignKey: "teamId", as: "team" });
    Payment.belongsTo(models.Tournament, { foreignKey: "tournamentId", as: "tournament" });
    Payment.belongsTo(models.User, { foreignKey: "paidByUserId", as: "paidBy" });
    Payment.belongsTo(models.User, { foreignKey: "recordedByUserId", as: "recordedBy" });
  };

  return Payment;
};
