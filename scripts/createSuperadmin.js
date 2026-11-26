const readline = require("readline");
const { Writable } = require("stream");
const { z } = require("zod");
const { sequelize } = require("../models");
const userRepository = require("../repositories/user.repository");
const { hashPassword } = require("../services/password.service");
const { emailField, fullNameField, passwordField } = require("../validations/user.schema");
const { ACCOUNT_ROLE, ACCOUNT_STATUS } = require("../constants/user.constants");

const inputSchema = z.object({
  fullName: fullNameField,
  email: emailField,
  password: passwordField,
});

// Reads answers line by line (works when typing and when input is piped) and hides the password echo
const createPrompter = () => {
  let isMuted = false;
  const output = new Writable({
    write(chunk, encoding, callback) {
      if (!isMuted) process.stdout.write(chunk);
      callback();
    },
  });
  const rl = readline.createInterface({
    input: process.stdin,
    output,
    terminal: Boolean(process.stdin.isTTY),
  });
  const lines = rl[Symbol.asyncIterator]();

  const ask = async (question, { hidden = false } = {}) => {
    process.stdout.write(question);
    isMuted = hidden;
    const { value } = await lines.next();
    isMuted = false;
    if (hidden) process.stdout.write("\n");
    return value ?? "";
  };

  return { ask, close: () => rl.close() };
};

const run = async () => {
  const prompter = createPrompter();
  try {
    const fullName = await prompter.ask("Full name: ");
    const email = await prompter.ask("Email: ");
    const password = await prompter.ask("Password: ", { hidden: true });
    const parsed = inputSchema.safeParse({ fullName, email, password });
    if (!parsed.success) {
      parsed.error.issues.forEach((issue) =>
        console.error(`- ${issue.path.join(".")}: ${issue.message}`),
      );
      process.exitCode = 1;
      return;
    }

    if (await userRepository.findUserByEmail(parsed.data.email)) {
      console.error("A user with this email already exists.");
      process.exitCode = 1;
      return;
    }

    await userRepository.createUser({
      fullName: parsed.data.fullName,
      email: parsed.data.email,
      passwordHash: await hashPassword(parsed.data.password),
      accountRole: ACCOUNT_ROLE.SUPERADMIN,
      accountStatus: ACCOUNT_STATUS.VERIFIED,
      emailVerifiedAt: new Date(),
    });
    process.stdout.write(
      `Superadmin ${parsed.data.email} created. Add a mobile number from the profile page.\n`,
    );
  } finally {
    prompter.close();
    await sequelize.close();
  }
};

run().catch((err) => {
  console.error("Failed to create superadmin:", err.message);
  process.exit(1);
});
