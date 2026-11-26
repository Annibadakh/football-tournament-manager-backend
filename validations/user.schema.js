const { z } = require("zod");
const { ACCOUNT_ROLE, ACCOUNT_STATUS, GENDER, USER_RULES } = require("../constants/user.constants");
const { paginationQuerySchema } = require("./common.schema");

// Reusable field schemas shared by auth, invite and profile endpoints
const emailField = z.string().trim().toLowerCase().pipe(z.email("Enter a valid email address"));

const fullNameField = z
  .string()
  .trim()
  .min(USER_RULES.FULL_NAME_MIN, "Full name is required")
  .max(
    USER_RULES.FULL_NAME_MAX,
    `Full name must be at most ${USER_RULES.FULL_NAME_MAX} characters`,
  );

const passwordField = z
  .string()
  .min(USER_RULES.PASSWORD_MIN, `Password must be at least ${USER_RULES.PASSWORD_MIN} characters`)
  .max(USER_RULES.PASSWORD_MAX, `Password must be at most ${USER_RULES.PASSWORD_MAX} characters`)
  .regex(/[A-Za-z]/, "Password must contain a letter")
  .regex(/\d/, "Password must contain a number");

const phoneField = z
  .string()
  .trim()
  .regex(USER_RULES.PHONE_REGEX, "Enter a valid 10-digit mobile number");

const userIdParamSchema = z.object({ userId: z.uuid("Invalid user id") });

const updateProfileSchema = z
  .object({
    fullName: fullNameField,
    dateOfBirth: z.iso.date("Enter a valid date").nullable(),
    gender: z.enum(GENDER).nullable(),
    cityPlaceId: z.uuid("Select a city from the suggestions").nullable(),
    bio: z.string().trim().max(USER_RULES.BIO_MAX).nullable(),
    photoKey: z.string().trim().min(1).max(255).nullable(),
  })
  .partial()
  .refine((data) => Object.keys(data).length > 0, "Nothing to update")
  .refine((data) => !data.dateOfBirth || new Date(data.dateOfBirth) < new Date(), {
    message: "Date of birth must be in the past",
    path: ["dateOfBirth"],
  });

const replacePositionsSchema = z
  .object({
    positions: z
      .array(
        z.object({
          positionId: z.coerce.number().int().positive(),
          isPrimary: z.boolean().default(false),
        }),
      )
      .max(USER_RULES.MAX_POSITIONS, `Select at most ${USER_RULES.MAX_POSITIONS} positions`),
  })
  .refine(
    (data) => new Set(data.positions.map((p) => p.positionId)).size === data.positions.length,
    {
      message: "Each position can be selected only once",
      path: ["positions"],
    },
  )
  .refine(
    (data) => !data.positions.length || data.positions.filter((p) => p.isPrimary).length === 1,
    {
      message: "Mark exactly one position as primary",
      path: ["positions"],
    },
  );

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: passwordField,
});

const listUsersQuerySchema = paginationQuerySchema.extend({
  accountRole: z.coerce.number().pipe(z.enum(ACCOUNT_ROLE)).optional(),
  accountStatus: z.coerce.number().pipe(z.enum(ACCOUNT_STATUS)).optional(),
});

const createStaffUserSchema = z.object({
  fullName: fullNameField,
  email: emailField,
  accountRole: z.enum(
    { ADMIN: ACCOUNT_ROLE.ADMIN, ORGANIZER: ACCOUNT_ROLE.ORGANIZER },
    "Choose Admin or Organizer",
  ),
});

const updateBlockStatusSchema = z.object({ isBlocked: z.boolean() });

module.exports = {
  emailField,
  fullNameField,
  passwordField,
  phoneField,
  userIdParamSchema,
  updateProfileSchema,
  replacePositionsSchema,
  changePasswordSchema,
  listUsersQuerySchema,
  createStaffUserSchema,
  updateBlockStatusSchema,
};
