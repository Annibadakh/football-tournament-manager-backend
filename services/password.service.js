const bcrypt = require("bcrypt");
const userRepository = require("../repositories/user.repository");
const ApiError = require("../utils/ApiError");
const { USER_RULES } = require("../constants/user.constants");

// Compared against when the email doesn't exist, so login timing doesn't reveal registered emails
const DUMMY_HASH = bcrypt.hashSync("maidaan-timing-guard", USER_RULES.BCRYPT_ROUNDS);

const hashPassword = (password) => bcrypt.hash(password, USER_RULES.BCRYPT_ROUNDS);

const verifyPassword = (password, passwordHash) =>
  bcrypt.compare(password, passwordHash ?? DUMMY_HASH);

const assertPhoneAvailable = async (phone, ownUserId, { transaction } = {}) => {
  const owner = await userRepository.findUserByPhone(phone, { transaction });
  if (owner && owner.id !== ownUserId) {
    const message = "This mobile number is already linked to another account";
    throw ApiError.conflict(message, [{ field: "phone", message }]);
  }
};

module.exports = { hashPassword, verifyPassword, assertPhoneAvailable };
