const { z } = require("zod");
const { fullNameField, passwordField, phoneField } = require("./user.schema");

const inviteTokenParamSchema = z.object({ token: z.string().min(20).max(100) });

const acceptInviteSchema = z.object({
  fullName: fullNameField.optional(),
  password: passwordField,
  phone: phoneField,
});

module.exports = { inviteTokenParamSchema, acceptInviteSchema };
