// Inline-styled HTML because most email clients ignore <style> blocks
const BRAND_GREEN = "#0F7B3F";
const INK = "#0B1F17";

const escapeHtml = (value = "") =>
  String(value).replace(
    /[&<>"']/g,
    (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char],
  );

const layout = (title, bodyHtml) => `<!doctype html>
<html><body style="margin:0;background:#F5F7F6;font-family:Arial,Helvetica,sans-serif;color:${INK}">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:24px 12px">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#ffffff;border-radius:12px;padding:28px">
        <tr><td style="font-size:24px;font-weight:bold;padding-bottom:16px">Maid<span style="color:#D9741A">aa</span>n</td></tr>
        <tr><td style="font-size:18px;font-weight:bold;padding-bottom:12px">${escapeHtml(title)}</td></tr>
        <tr><td style="font-size:15px;line-height:1.6">${bodyHtml}</td></tr>
        <tr><td style="font-size:12px;color:#66736C;padding-top:24px">If you didn't expect this email, you can ignore it.</td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;

const otpBlock = (code) =>
  `<p style="font-size:32px;font-weight:bold;letter-spacing:8px;color:${BRAND_GREEN};margin:16px 0">${escapeHtml(code)}</p>`;

const buttonBlock = (url, label) =>
  `<p style="margin:20px 0"><a href="${escapeHtml(url)}" style="background:${BRAND_GREEN};color:#ffffff;text-decoration:none;padding:12px 20px;border-radius:8px;font-weight:bold;display:inline-block">${escapeHtml(label)}</a></p>
   <p style="font-size:12px;color:#66736C;word-break:break-all">Or open this link: ${escapeHtml(url)}</p>`;

const emailVerificationOtp = ({ fullName, code, ttlMinutes }) => ({
  subject: `${code} is your Maidaan verification code`,
  html: layout(
    "Verify your email",
    `<p>Hi ${escapeHtml(fullName)},</p><p>Use this code to verify your email address:</p>${otpBlock(code)}<p>It expires in ${ttlMinutes} minutes.</p>`,
  ),
  text: `Your Maidaan verification code is ${code}. It expires in ${ttlMinutes} minutes.`,
});

const passwordResetOtp = ({ fullName, code, ttlMinutes }) => ({
  subject: `${code} is your Maidaan password reset code`,
  html: layout(
    "Reset your password",
    `<p>Hi ${escapeHtml(fullName)},</p><p>Use this code to reset your password:</p>${otpBlock(code)}<p>It expires in ${ttlMinutes} minutes.</p>`,
  ),
  text: `Your Maidaan password reset code is ${code}. It expires in ${ttlMinutes} minutes.`,
});

const accountSetupInvite = ({ fullName, inviterName, roleLabel, url, ttlDays }) => ({
  subject: "You're invited to Maidaan",
  html: layout(
    "Set up your Maidaan account",
    `<p>Hi ${escapeHtml(fullName)},</p><p>${escapeHtml(inviterName)} added you to Maidaan as <b>${escapeHtml(roleLabel)}</b>. Set your password to activate your account.</p>${buttonBlock(url, "Set up my account")}<p>This link expires in ${ttlDays} days.</p>`,
  ),
  text: `${inviterName} added you to Maidaan as ${roleLabel}. Set up your account: ${url} (expires in ${ttlDays} days).`,
});

// Guests set a password while accepting; verified players just log in and accept
const accountHint = (needsAccountSetup) =>
  needsAccountSetup
    ? "<p>You'll set a password and mobile number to activate your Maidaan account.</p>"
    : "";

const teamInvite = ({
  fullName,
  captainName,
  teamName,
  tournamentName,
  positionName,
  jerseyNumber,
  url,
  ttlDays,
  needsAccountSetup,
}) => ({
  subject: `${captainName} invited you to ${teamName}`,
  html: layout(
    `Join ${teamName}`,
    `<p>Hi ${escapeHtml(fullName)},</p><p>${escapeHtml(captainName)} invited you to play for <b>${escapeHtml(teamName)}</b> in <b>${escapeHtml(tournamentName)}</b> as <b>${escapeHtml(positionName)}</b> (jersey #${escapeHtml(jerseyNumber)}).</p>${accountHint(needsAccountSetup)}${buttonBlock(url, "View invitation")}<p>This link expires in ${ttlDays} days.</p>`,
  ),
  text: `${captainName} invited you to play for ${teamName} in ${tournamentName}. Respond here: ${url} (expires in ${ttlDays} days).`,
});

const staffInvite = ({
  fullName,
  inviterName,
  roleLabel,
  tournamentName,
  url,
  ttlDays,
  needsAccountSetup,
}) => ({
  subject: `You're invited as ${roleLabel} for ${tournamentName}`,
  html: layout(
    `${roleLabel} invitation`,
    `<p>Hi ${escapeHtml(fullName)},</p><p>${escapeHtml(inviterName)} invited you to be a <b>${escapeHtml(roleLabel)}</b> for <b>${escapeHtml(tournamentName)}</b>.</p>${accountHint(needsAccountSetup)}${buttonBlock(url, "View invitation")}<p>This link expires in ${ttlDays} days.</p>`,
  ),
  text: `${inviterName} invited you to be ${roleLabel} for ${tournamentName}. Respond here: ${url} (expires in ${ttlDays} days).`,
});

const captainAssigned = ({ fullName, teamName, tournamentName, url, needsAccountSetup }) => ({
  subject: `You're the captain of ${teamName}`,
  html: layout(
    `Captain of ${teamName}`,
    `<p>Hi ${escapeHtml(fullName)},</p><p>The organizer added <b>${escapeHtml(teamName)}</b> to <b>${escapeHtml(tournamentName)}</b> with you as captain. You can now build your squad.</p>${accountHint(needsAccountSetup)}${buttonBlock(url, needsAccountSetup ? "Activate my account" : "Open Maidaan")}`,
  ),
  text: `You're the captain of ${teamName} in ${tournamentName}. Open: ${url}`,
});

const teamRequestDecision = ({
  fullName,
  teamName,
  tournamentName,
  isApproved,
  reason,
  url,
  canRequestAgain,
}) => ({
  subject: isApproved
    ? `${teamName} is in ${tournamentName}`
    : `Update on your ${teamName} request`,
  html: layout(
    isApproved ? "Request approved" : "Request not approved",
    isApproved
      ? `<p>Hi ${escapeHtml(fullName)},</p><p>Your request to register <b>${escapeHtml(teamName)}</b> for <b>${escapeHtml(tournamentName)}</b> was approved.</p>${buttonBlock(url, "Open my team")}`
      : `<p>Hi ${escapeHtml(fullName)},</p><p>Your request to register <b>${escapeHtml(teamName)}</b> for <b>${escapeHtml(tournamentName)}</b> was not approved.</p>${reason ? `<p>Reason: ${escapeHtml(reason)}</p>` : ""}<p>${canRequestAgain ? "You can send one more request." : "This decision is final for this tournament."}</p>`,
  ),
  text: isApproved
    ? `Your team ${teamName} was approved for ${tournamentName}. ${url}`
    : `Your request for ${teamName} in ${tournamentName} was not approved.${reason ? ` Reason: ${reason}.` : ""}`,
});

module.exports = {
  emailVerificationOtp,
  passwordResetOtp,
  accountSetupInvite,
  teamInvite,
  staffInvite,
  captainAssigned,
  teamRequestDecision,
};
