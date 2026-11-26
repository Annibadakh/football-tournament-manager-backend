const { Op } = require("sequelize");
const { AuthOtp } = require("../models");

const findLatestOtp = (userId, purpose, { transaction } = {}) =>
  AuthOtp.findOne({ where: { userId, purpose }, order: [["createdAt", "DESC"]], transaction });

const createOtp = (data, { transaction } = {}) => AuthOtp.create(data, { transaction });

// A new code makes older unused ones for the same purpose invalid
const consumeOpenOtps = (userId, purpose, { transaction } = {}) =>
  AuthOtp.update(
    { consumedAt: new Date() },
    { where: { userId, purpose, consumedAt: { [Op.is]: null } }, transaction },
  );

const incrementOtpAttempts = (otp, { transaction } = {}) =>
  otp.increment("attempts", { transaction });

const markOtpConsumed = (otp, { transaction } = {}) =>
  otp.update({ consumedAt: new Date() }, { transaction });

module.exports = {
  findLatestOtp,
  createOtp,
  consumeOpenOtps,
  incrementOtpAttempts,
  markOtpConsumed,
};
