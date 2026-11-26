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

module.exports = { emailVerificationOtp, passwordResetOtp, accountSetupInvite };
