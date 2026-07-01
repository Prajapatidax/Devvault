/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import nodemailer from "nodemailer";

// Retrieve environment variables with standard fallbacks for local testing
const SMTP_SERVER = process.env.SMTP_SERVER || "localhost";
const SMTP_PORT = parseInt(process.env.SMTP_PORT || "587", 10);
const SMTP_USERNAME = process.env.SMTP_USERNAME || "";
const SMTP_PASSWORD = process.env.SMTP_PASSWORD || "";
const MAIL_FROM = process.env.MAIL_FROM || "no-reply@devvault.com";

// Setup standard Nodemailer transporter
const transporter = nodemailer.createTransport({
  host: SMTP_SERVER,
  port: SMTP_PORT,
  secure: SMTP_PORT === 465, // True for 465, false for others
  auth: SMTP_USERNAME && SMTP_PASSWORD ? {
    user: SMTP_USERNAME,
    pass: SMTP_PASSWORD
  } : undefined,
  connectionTimeout: 10000, // 10 seconds timeout
  greetingTimeout: 10000,
  socketTimeout: 10000,
  tls: {
    rejectUnauthorized: false // Avoid issues with self-signed certs in local/relay testing
  }
});

/**
 * Generates the clean HTML email template
 */
function getHtmlTemplate(otp: string): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Verify Your Email</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      background-color: #09090b;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      color: #e4e4e7;
    }
    .wrapper {
      width: 100%;
      table-layout: fixed;
      background-color: #09090b;
      padding: 40px 0;
    }
    .container {
      max-width: 500px;
      margin: 0 auto;
      background-color: #18181b;
      border: 1px solid #27272a;
      border-radius: 12px;
      padding: 32px;
      box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.4);
    }
    .header {
      text-align: center;
      margin-bottom: 32px;
    }
    .logo-container {
      display: inline-flex;
      align-items: center;
      gap: 8px;
    }
    .logo-text {
      font-size: 24px;
      font-weight: 700;
      color: #ffffff;
      letter-spacing: -0.025em;
    }
    .logo-dot {
      color: #ff5c00;
    }
    .title {
      font-size: 20px;
      font-weight: 600;
      color: #ffffff;
      margin-top: 0;
      margin-bottom: 12px;
      text-align: center;
    }
    .paragraph {
      font-size: 14px;
      line-height: 20px;
      color: #a1a1aa;
      margin-top: 0;
      margin-bottom: 24px;
    }
    .otp-box {
      background-color: #27272a;
      border: 1px solid #3f3f46;
      border-radius: 8px;
      padding: 16px;
      text-align: center;
      margin-bottom: 24px;
    }
    .otp-code {
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
      font-size: 32px;
      font-weight: 700;
      color: #ff5c00;
      letter-spacing: 0.15em;
      margin: 0;
    }
    .footer {
      border-top: 1px solid #27272a;
      padding-top: 24px;
      font-size: 12px;
      color: #71717a;
      text-align: center;
      line-height: 16px;
    }
  </style>
</head>
<body>
  <table class="wrapper" width="100%" cellpadding="0" cellspacing="0" border="0">
    <tr>
      <td align="center">
        <table class="container" width="100%" cellpadding="0" cellspacing="0" border="0">
          <!-- Logo Section -->
          <tr>
            <td class="header">
              <div class="logo-container">
                <span class="logo-text">Dev<span class="logo-dot">Vault</span></span>
              </div>
            </td>
          </tr>
          
          <!-- Content Section -->
          <tr>
            <td>
              <h2 class="title">Verify Your Email</h2>
              <p class="paragraph">Hello,</p>
              <p class="paragraph">Your verification code is:</p>
            </td>
          </tr>
          
          <!-- OTP Display Box -->
          <tr>
            <td class="otp-box">
              <h1 class="otp-code">${otp}</h1>
            </td>
          </tr>
          
          <!-- Instructions -->
          <tr>
            <td>
              <p class="paragraph">This code expires in 10 minutes.</p>
              <p class="paragraph">If you did not create this account, please ignore this email.</p>
              <p class="paragraph">Regards,<br>DevVault Team</p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td class="footer">
              This email was sent by DevVault. Please do not reply directly to this email.<br>
              &copy; 2026 DevVault. All rights reserved.
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;
}

/**
 * Sends the OTP code via Brevo SMTP (or configured SMTP)
 */
export async function sendOtpEmail(email: string, otp: string): Promise<void> {
  const mailOptions = {
    from: MAIL_FROM,
    to: email,
    subject: "Verify Your Email",
    text: `Hello,

Your verification code is:

${otp}

This code expires in 10 minutes.

If you did not create this account, please ignore this email.

Regards,
DevVault Team`,
    html: getHtmlTemplate(otp)
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(`[SMTP] Verification email sent to ${email}. Message ID: ${info.messageId}`);
  } catch (error) {
    console.error(`[SMTP] Failed to send email to ${email}:`, error);
    throw new Error("Failed to transmit verification email. Please check your network or SMTP credentials.");
  }
}
