const { z } = require("zod");
const { fullNameField, passwordField, phoneField } = require("./user.schema");

const inviteTokenParamSchema = z.object({ token: z.string().min(20).max(100) });

// Guests send password + phone (account setup); logged-in players accept with an empty body
const acceptInviteSchema = z.object({
  fullName: fullNameField.optional(),
  password: passwordField.optional(),
  phone: phoneField.optional(),
});

module.exports = { inviteTokenParamSchema, acceptInviteSchema };
