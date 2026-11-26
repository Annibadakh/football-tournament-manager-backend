const { z } = require("zod");
const { OTP_RULES } = require("../constants/auth.constants");
const { emailField, fullNameField, passwordField, phoneField } = require("./user.schema");

const otpField = z
  .string()
  .trim()
  .regex(new RegExp(`^\\d{${OTP_RULES.LENGTH}}$`), `Enter the ${OTP_RULES.LENGTH}-digit code`);

const registerSchema = z.object({
  fullName: fullNameField,
  email: emailField,
  password: passwordField,
});

const loginSchema = z.object({
  email: emailField,
  password: z.string().min(1, "Password is required"),
});

// Web sends the refresh token as a cookie; the mobile app sends it in the body
const refreshSchema = z.object({ refreshToken: z.string().min(1).optional() });

const verifyEmailSchema = z.object({ otp: otpField, phone: phoneField });

const passwordResetRequestSchema = z.object({ email: emailField });

const passwordResetSchema = z.object({
  email: emailField,
  otp: otpField,
  newPassword: passwordField,
});

module.exports = {
  registerSchema,
  loginSchema,
  refreshSchema,
  verifyEmailSchema,
  passwordResetRequestSchema,
  passwordResetSchema,
};
