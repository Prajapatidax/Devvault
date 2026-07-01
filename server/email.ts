/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Resend } from "resend";

// Retrieve configuration variables from environment
const RESEND_API_KEY = process.env.RESEND_API_KEY || "";
const MAIL_FROM = process.env.MAIL_FROM || "DevVault <onboarding@resend.dev>";

// Initialize Resend SDK instance
const resend = new Resend(RESEND_API_KEY);

/**
 * Returns the dark theme HTML template wrapper
 */
function getEmailWrapper(title: string, contentHtml: string): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
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
    .footer {
      border-top: 1px solid #27272a;
      padding-top: 24px;
      font-size: 12px;
      color: #71717a;
      text-align: center;
      line-height: 16px;
      margin-top: 24px;
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
              ${contentHtml}
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td class="footer">
              This email was sent from DevVault. Please do not reply directly to this email.<br>
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

class EmailService {
  /**
   * Sends a cryptographically secure 6-digit OTP verification email
   */
  async sendOTP(email: string, otp: string): Promise<void> {
    const title = "Verify Your Email";
    const contentHtml = `
      <h2 style="font-size: 20px; font-weight: 600; color: #ffffff; margin-top: 0; margin-bottom: 12px; text-align: center;">Verify Your Email</h2>
      <p style="font-size: 14px; line-height: 20px; color: #a1a1aa; margin-top: 0; margin-bottom: 24px;">Hello,</p>
      <p style="font-size: 14px; line-height: 20px; color: #a1a1aa; margin-top: 0; margin-bottom: 24px;">Your verification code is:</p>
      
      <div style="background-color: #27272a; border: 1px solid #3f3f46; border-radius: 8px; padding: 16px; text-align: center; margin-bottom: 24px;">
        <h1 style="font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; font-size: 32px; font-weight: 700; color: #ff5c00; letter-spacing: 0.15em; margin: 0;">${otp}</h1>
      </div>
      
      <p style="font-size: 14px; line-height: 20px; color: #a1a1aa; margin-top: 0; margin-bottom: 24px;">This code expires in 10 minutes.</p>
      <p style="font-size: 14px; line-height: 20px; color: #a1a1aa; margin-top: 0; margin-bottom: 24px;">If you did not create this account, please ignore this email.</p>
      <p style="font-size: 14px; line-height: 20px; color: #a1a1aa; margin-top: 0; margin-bottom: 24px;">Regards,<br>DevVault Team</p>
    `;

    const html = getEmailWrapper(title, contentHtml);

    try {
      console.log(`[OTP] OTP Requested for ${email}`);
      const response = await resend.emails.send({
        from: MAIL_FROM,
        to: email,
        subject: "Verify Your Email",
        html
      });

      if (response.error) {
        throw new Error(response.error.message || "Unknown Resend error");
      }

      console.log(`[Email] Email Sent to ${email}. ID: ${response.data?.id}`);
    } catch (error) {
      console.error(`[Email] Email Failed to ${email}:`, error);
      throw new Error("Failed to send verification email via Resend API.");
    }
  }

  /**
   * Helper method to send verification emails (maps directly to sendOTP)
   */
  async sendVerificationEmail(email: string, otp: string): Promise<void> {
    return this.sendOTP(email, otp);
  }

  /**
   * Sends a password reset link/token email
   */
  async sendPasswordResetEmail(email: string, resetToken: string): Promise<void> {
    const title = "Reset Your decrypt Key";
    const resetLink = `http://localhost:3000/reset-password?token=${resetToken}&email=${encodeURIComponent(email)}`;
    
    const contentHtml = `
      <h2 style="font-size: 20px; font-weight: 600; color: #ffffff; margin-top: 0; margin-bottom: 12px; text-align: center;">Reset Your decrypt Key</h2>
      <p style="font-size: 14px; line-height: 20px; color: #a1a1aa; margin-top: 0; margin-bottom: 24px;">Hello,</p>
      <p style="font-size: 14px; line-height: 20px; color: #a1a1aa; margin-top: 0; margin-bottom: 24px;">You requested a decryption key reset for your DevVault workspace. Click the button below to decrypt and reset your master password:</p>
      
      <div style="text-align: center; margin-bottom: 28px; margin-top: 10px;">
        <a href="${resetLink}" style="background-color: #ff5c00; color: #ffffff; padding: 12px 24px; font-size: 14px; font-weight: 600; text-decoration: none; border-radius: 8px; display: inline-block;">Reset Password Key</a>
      </div>
      
      <p style="font-size: 14px; line-height: 20px; color: #a1a1aa; margin-top: 0; margin-bottom: 24px;">This link will expire in 1 hour. If you did not request a password reset, please ignore this email.</p>
      <p style="font-size: 14px; line-height: 20px; color: #a1a1aa; margin-top: 0; margin-bottom: 24px;">Regards,<br>DevVault Team</p>
    `;

    const html = getEmailWrapper(title, contentHtml);

    try {
      const response = await resend.emails.send({
        from: MAIL_FROM,
        to: email,
        subject: "Reset Your Master decrypt Key",
        html
      });

      if (response.error) {
        throw new Error(response.error.message || "Unknown Resend error");
      }

      console.log(`[Email] Email Sent to ${email}. ID: ${response.data?.id}`);
    } catch (error) {
      console.error(`[Email] Email Failed to ${email}:`, error);
      throw new Error("Failed to send password reset email via Resend API.");
    }
  }

  /**
   * Sends a welcome email after successful onboarding
   */
  async sendWelcomeEmail(email: string, name: string): Promise<void> {
    const title = "Welcome to DevVault";
    const contentHtml = `
      <h2 style="font-size: 20px; font-weight: 600; color: #ffffff; margin-top: 0; margin-bottom: 12px; text-align: center;">Welcome to DevVault!</h2>
      <p style="font-size: 14px; line-height: 20px; color: #a1a1aa; margin-top: 0; margin-bottom: 16px;">Hello ${name},</p>
      <p style="font-size: 14px; line-height: 20px; color: #a1a1aa; margin-top: 0; margin-bottom: 16px;">Your premium developer workstation workspace has been provisioned and is fully armed. You now have access to:</p>
      
      <ul style="font-size: 14px; color: #a1a1aa; padding-left: 20px; margin-bottom: 24px; line-height: 22px;">
        <li><strong>Project Manager</strong>: Track stack, pipelines, and timelines.</li>
        <li><strong>Secrets Vault</strong>: Encrypted general variables and API keys.</li>
        <li><strong>Snippet boards</strong>: Manage boilerplate nodes and favorite templates.</li>
        <li><strong>AI Developer</strong>: Context-aware codebase chat assistant.</li>
      </ul>
      
      <p style="font-size: 14px; line-height: 20px; color: #a1a1aa; margin-top: 0; margin-bottom: 24px;">Click the button below to access your dashboard:</p>
      
      <div style="text-align: center; margin-bottom: 28px;">
        <a href="http://localhost:3000" style="background-color: #ff5c00; color: #ffffff; padding: 12px 24px; font-size: 14px; font-weight: 600; text-decoration: none; border-radius: 8px; display: inline-block;">Launch Vault Dashboard</a>
      </div>
      
      <p style="font-size: 14px; line-height: 20px; color: #a1a1aa; margin-top: 0; margin-bottom: 24px;">If you have any questions, feel free to reach out to our team.</p>
      <p style="font-size: 14px; line-height: 20px; color: #a1a1aa; margin-top: 0; margin-bottom: 24px;">Regards,<br>DevVault Team</p>
    `;

    const html = getEmailWrapper(title, contentHtml);

    try {
      const response = await resend.emails.send({
        from: MAIL_FROM,
        to: email,
        subject: "Welcome to DevVault!",
        html
      });

      if (response.error) {
        throw new Error(response.error.message || "Unknown Resend error");
      }

      console.log(`[Email] Email Sent to ${email}. ID: ${response.data?.id}`);
    } catch (error) {
      console.error(`[Email] Email Failed to ${email}:`, error);
      throw new Error("Failed to send welcome email via Resend API.");
    }
  }

  /**
   * Sends an email notification when a user is invited to a project
   */
  async sendProjectInvitationEmail(
    toEmail: string, 
    inviterName: string, 
    projectName: string, 
    role: string
  ): Promise<void> {
    const title = "Project Invitation Request";
    const contentHtml = `
      <h2 style="font-size: 20px; font-weight: 600; color: #ffffff; margin-top: 0; margin-bottom: 12px; text-align: center;">Project Invitation Request</h2>
      <p style="font-size: 14px; line-height: 20px; color: #a1a1aa; margin-top: 0; margin-bottom: 24px;">Hello,</p>
      <p style="font-size: 14px; line-height: 20px; color: #a1a1aa; margin-top: 0; margin-bottom: 24px;">
        <strong>${inviterName}</strong> has invited you to collaborate on the project <strong>"${projectName}"</strong> as a <strong>${role}</strong>.
      </p>
      <p style="font-size: 14px; line-height: 20px; color: #a1a1aa; margin-top: 0; margin-bottom: 24px;">
        Please sign in to your DevVault workspace to review and accept this request.
      </p>
      
      <div style="text-align: center; margin-bottom: 28px; margin-top: 10px;">
        <a href="http://localhost:3000" style="background-color: #ff5c00; color: #ffffff; padding: 12px 24px; font-size: 14px; font-weight: 600; text-decoration: none; border-radius: 8px; display: inline-block;">Open Workspace</a>
      </div>
      
      <p style="font-size: 14px; line-height: 20px; color: #a1a1aa; margin-top: 0; margin-bottom: 24px;">Regards,<br>DevVault Team</p>
    `;

    const html = getEmailWrapper(title, contentHtml);

    try {
      console.log(`[Email] Sending project invitation email to ${toEmail}`);
      const response = await resend.emails.send({
        from: MAIL_FROM,
        to: toEmail,
        subject: `Project Invitation: ${projectName}`,
        html
      });

      if (response.error) {
        throw new Error(response.error.message || "Unknown Resend error");
      }

      console.log(`[Email] Invitation Email Sent to ${toEmail}. ID: ${response.data?.id}`);
    } catch (error) {
      console.error(`[Email] Invitation Email Failed to ${toEmail}:`, error);
    }
  }

  /**
   * Sends an email notification when a user accepts a project invitation
   */
  async sendInvitationAcceptedEmail(
    toEmail: string, 
    inviteeName: string, 
    projectName: string
  ): Promise<void> {
    const title = "Project Invitation Accepted";
    const contentHtml = `
      <h2 style="font-size: 20px; font-weight: 600; color: #ffffff; margin-top: 0; margin-bottom: 12px; text-align: center;">Invitation Accepted</h2>
      <p style="font-size: 14px; line-height: 20px; color: #a1a1aa; margin-top: 0; margin-bottom: 24px;">Hello,</p>
      <p style="font-size: 14px; line-height: 20px; color: #a1a1aa; margin-top: 0; margin-bottom: 24px;">
        <strong>${inviteeName}</strong> has accepted your invitation to join the project <strong>"${projectName}"</strong>.
      </p>
      <p style="font-size: 14px; line-height: 20px; color: #a1a1aa; margin-top: 0; margin-bottom: 24px;">
        They now have access to collaborate on the project in the workspace.
      </p>
      
      <div style="text-align: center; margin-bottom: 28px; margin-top: 10px;">
        <a href="http://localhost:3000" style="background-color: #ff5c00; color: #ffffff; padding: 12px 24px; font-size: 14px; font-weight: 600; text-decoration: none; border-radius: 8px; display: inline-block;">View Project</a>
      </div>
      
      <p style="font-size: 14px; line-height: 20px; color: #a1a1aa; margin-top: 0; margin-bottom: 24px;">Regards,<br>DevVault Team</p>
    `;

    const html = getEmailWrapper(title, contentHtml);

    try {
      console.log(`[Email] Sending invitation accepted email to ${toEmail}`);
      const response = await resend.emails.send({
        from: MAIL_FROM,
        to: toEmail,
        subject: `Invitation Accepted: ${projectName}`,
        html
      });

      if (response.error) {
        throw new Error(response.error.message || "Unknown Resend error");
      }

      console.log(`[Email] Acceptance Email Sent to ${toEmail}. ID: ${response.data?.id}`);
    } catch (error) {
      console.error(`[Email] Acceptance Email Failed to ${toEmail}:`, error);
    }
  }
}

export const emailService = new EmailService();
