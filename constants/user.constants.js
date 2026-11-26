// Numeric codes are stored in the DB; never compare against raw numbers
const ACCOUNT_ROLE = Object.freeze({
  SUPERADMIN: 1,
  ADMIN: 2,
  ORGANIZER: 3,
  MEMBER: 4,
});

// GUEST = created by someone else and not yet claimed (no password)
const ACCOUNT_STATUS = Object.freeze({
  GUEST: 1,
  PENDING_VERIFICATION: 2,
  VERIFIED: 3,
  BLOCKED: 4,
});

const ACCOUNT_ROLE_LABEL = Object.freeze({
  [ACCOUNT_ROLE.SUPERADMIN]: "Super Admin",
  [ACCOUNT_ROLE.ADMIN]: "Admin",
  [ACCOUNT_ROLE.ORGANIZER]: "Organizer",
  [ACCOUNT_ROLE.MEMBER]: "Member",
});

const GENDER = Object.freeze({
  MALE: 1,
  FEMALE: 2,
  OTHER: 3,
});

// Which account role may create which (business rules 2.2 and 3)
const CREATABLE_ROLES_BY_ROLE = Object.freeze({
  [ACCOUNT_ROLE.SUPERADMIN]: [ACCOUNT_ROLE.ADMIN, ACCOUNT_ROLE.ORGANIZER],
  [ACCOUNT_ROLE.ADMIN]: [ACCOUNT_ROLE.ORGANIZER],
});

const USER_RULES = Object.freeze({
  FULL_NAME_MIN: 2,
  FULL_NAME_MAX: 100,
  PASSWORD_MIN: 8,
  PASSWORD_MAX: 64,
  // Indian mobile numbers, stored without +91
  PHONE_REGEX: /^[6-9]\d{9}$/,
  CITY_MAX: 100,
  BIO_MAX: 500,
  MAX_POSITIONS: 4,
  BCRYPT_ROUNDS: 12,
});

module.exports = {
  ACCOUNT_ROLE,
  ACCOUNT_ROLE_LABEL,
  ACCOUNT_STATUS,
  GENDER,
  CREATABLE_ROLES_BY_ROLE,
  USER_RULES,
};
