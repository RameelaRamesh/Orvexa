import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

export interface SendInvitationOptions {
  to: string;
  firstName?: string;
  workspaceName: string;
  inviteLink: string;
  invitedByName?: string;
  senderEmail?: string;
  senderName?: string;
  roleName?: string;
}

export interface SendPasswordResetOptions {
  to: string;
  firstName?: string;
  resetLink: string;
}

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private transporter: nodemailer.Transporter | null = null;
  private readonly isConfigured: boolean = false;
  private readonly fromAddress: string;

  constructor(private readonly configService: ConfigService) {
    const host = this.configService.get<string>('SMTP_HOST') || 'smtp.gmail.com';
    const portNum = Number(this.configService.get('SMTP_PORT')) || 465;
    const user = this.configService.get<string>('SMTP_USER');
    const rawPass = this.configService.get<string>('SMTP_PASS');
    const pass = rawPass ? rawPass.replace(/\s+/g, '') : undefined;
    const secureVal = this.configService.get('SMTP_SECURE');
    const secure = secureVal !== undefined ? String(secureVal) === 'true' : portNum === 465;
    this.fromAddress =
      this.configService.get<string>('SMTP_FROM') ||
      (user ? `ORVEXA Notifications <${user}>` : 'ORVEXA Notifications <noreply@orvexa.io>');

    if (host && user && pass) {
      try {
        this.transporter = nodemailer.createTransport({
          host,
          port: portNum,
          secure,
          auth: {
            user,
            pass,
          },
        });
        this.isConfigured = true;
        this.logger.log(`SMTP configured using host: ${host}:${portNum} (secure: ${secure}, user: ${user})`);
      } catch (err: any) {
        this.logger.error(`Failed to initialize SMTP transporter: ${err.message}`);
        this.transporter = null;
        this.isConfigured = false;
      }
    } else {
      this.logger.warn(
        'SMTP credentials not detected. Outgoing emails will be logged to console and links will be available in the dashboard.',
      );
      this.isConfigured = false;
    }
  }

  get hasSmtp(): boolean {
    return this.isConfigured && !!this.transporter;
  }

  async sendInvitationEmail(options: SendInvitationOptions): Promise<{ delivered: boolean; error?: string }> {
    const { to, firstName, workspaceName, inviteLink, invitedByName, senderEmail, senderName, roleName } = options;
    const recipientName = firstName ? firstName : to.split('@')[0];
    const inviter = senderName || invitedByName || 'Workspace Administrator';
    const roleText = roleName ? ` as a ${roleName}` : '';

    const subject = `${inviter} invited you to join ${workspaceName} on ORVEXA`;

    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f4f5f7; margin: 0; padding: 24px; color: #1e293b; }
    .card { max-width: 580px; margin: 0 auto; background: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.05); }
    .header { background: #0f172a; padding: 32px 28px; text-align: center; }
    .logo { color: #ffffff; font-size: 24px; font-weight: 800; letter-spacing: -0.5px; }
    .content { padding: 32px 28px; }
    h2 { margin-top: 0; font-size: 20px; font-weight: 700; color: #0f172a; }
    p { font-size: 14px; line-height: 1.6; color: #475569; margin: 12px 0; }
    .sender-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px 16px; margin: 16px 0; font-size: 13px; }
    .btn-container { text-align: center; margin: 28px 0; }
    .btn { display: inline-block; background-color: #2563eb; color: #ffffff !important; padding: 12px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 14px; }
    .link-box { background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 6px; padding: 12px; font-family: monospace; font-size: 11px; word-break: break-all; color: #334155; margin-top: 16px; }
    .footer { padding: 20px 28px; background-color: #f8fafc; border-top: 1px solid #e2e8f0; text-align: center; font-size: 12px; color: #94a3b8; }
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <div class="logo">ORVEXA</div>
    </div>
    <div class="content">
      <h2>Welcome, ${recipientName}!</h2>
      <p><strong>${inviter}</strong>${senderEmail ? ` (${senderEmail})` : ''} has invited you to join the <strong>${workspaceName}</strong> organization${roleText} on ORVEXA.</p>
      
      <div class="sender-box">
        <div style="color: #334155; margin-bottom: 4px;"><strong>From (Sender):</strong> ${inviter}${senderEmail ? ` &lt;${senderEmail}&gt;` : ''}</div>
        <div style="color: #334155;"><strong>To (Receiver):</strong> ${to}</div>
      </div>

      <p>Click the button below to accept your invitation, set up your password, and access your workspace dashboard.</p>
      <div class="btn-container">
        <a href="${inviteLink}" class="btn" target="_blank" style="color: #ffffff;">Accept Invitation &amp; Join Workspace</a>
      </div>
      <p style="font-size: 12px; color: #64748b;">This invitation link will expire in 7 days. If the button above does not work, copy and paste this link into your browser:</p>
      <div class="link-box">${inviteLink}</div>
    </div>
    <div class="footer">
      &copy; ${new Date().getFullYear()} ORVEXA SaaS Platform. All rights reserved.
    </div>
  </div>
</body>
</html>
`;

    const textContent = `
Hello ${recipientName},

${inviter}${senderEmail ? ` (${senderEmail})` : ''} has invited you to join the ${workspaceName} organization${roleText} on ORVEXA.

From (Sender): ${inviter}${senderEmail ? ` <${senderEmail}>` : ''}
To (Receiver): ${to}

Click the link below to accept your invitation and activate your account:
${inviteLink}

This link will expire in 7 days.
`;

    const senderEmailAddress =
      senderEmail ||
      (this.fromAddress.includes('<')
        ? this.fromAddress.split('<')[1].replace('>', '').trim()
        : this.fromAddress);
    const displayName = senderName ? `${senderName} via ORVEXA` : 'ORVEXA Notifications';
    const fromHeader = `"${displayName}" <${senderEmailAddress}>`;

    if (this.hasSmtp && this.transporter) {
      try {
        const info = await this.transporter.sendMail({
          from: fromHeader,
          to,
          replyTo: senderEmail || senderEmailAddress,
          subject,
          text: textContent,
          html: htmlContent,
        });
        this.logger.log(`Invitation email delivered from ${fromHeader} to ${to} (Message ID: ${info.messageId})`);
        return { delivered: true };
      } catch (err: any) {
        this.logger.error(`Error delivering email from ${fromHeader} to ${to}: ${err.message}`);
        return { delivered: false, error: err.message };
      }
    } else {
      this.logger.log(`
================================================================================
📧 [INVITATION EMAIL DISPATCH]
From (Sender Account): ${inviter}${senderEmail ? ` <${senderEmail}>` : ''}
To (Receiver Account): ${to}
Subject: ${subject}
Invitation Link: ${inviteLink}
================================================================================
      `);
      return { delivered: false, error: 'SMTP credentials not configured' };
    }
  }

  async sendPasswordResetEmail(options: SendPasswordResetOptions): Promise<{ delivered: boolean; error?: string }> {
    const { to, firstName, resetLink } = options;
    const recipientName = firstName ? firstName : to.split('@')[0];
    const subject = 'Reset your ORVEXA password';

    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f4f5f7; margin: 0; padding: 24px; color: #1e293b; }
    .card { max-width: 580px; margin: 0 auto; background: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.05); }
    .header { background: #0f172a; padding: 32px 28px; text-align: center; }
    .logo { color: #ffffff; font-size: 24px; font-weight: 800; letter-spacing: -0.5px; }
    .content { padding: 32px 28px; }
    h2 { margin-top: 0; font-size: 20px; font-weight: 700; color: #0f172a; }
    p { font-size: 14px; line-height: 1.6; color: #475569; margin: 12px 0; }
    .btn-container { text-align: center; margin: 28px 0; }
    .btn { display: inline-block; background-color: #2563eb; color: #ffffff !important; padding: 12px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 14px; }
    .link-box { background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 6px; padding: 12px; font-family: monospace; font-size: 11px; word-break: break-all; color: #334155; margin-top: 16px; }
    .footer { padding: 20px 28px; background-color: #f8fafc; border-top: 1px solid #e2e8f0; text-align: center; font-size: 12px; color: #94a3b8; }
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <div class="logo">ORVEXA</div>
    </div>
    <div class="content">
      <h2>Password Reset Request</h2>
      <p>Hello ${recipientName},</p>
      <p>You requested to reset your password for your ORVEXA account. Click the button below to set a new password:</p>
      <div class="btn-container">
        <a href="${resetLink}" class="btn" target="_blank" style="color: #ffffff;">Reset My Password</a>
      </div>
      <p style="font-size: 12px; color: #64748b;">This link will expire in 1 hour. If you did not request this, you can safely ignore this email.</p>
      <div class="link-box">${resetLink}</div>
    </div>
    <div class="footer">
      &copy; ${new Date().getFullYear()} ORVEXA SaaS Platform. All rights reserved.
    </div>
  </div>
</body>
</html>
`;

    const textContent = `
Hello ${recipientName},

You requested to reset your password for your ORVEXA account.
Click the link below to set a new password:
${resetLink}

This link expires in 1 hour. If you did not request this, you can ignore this email.
`;

    if (this.hasSmtp && this.transporter) {
      try {
        await this.transporter.sendMail({
          from: this.fromAddress,
          to,
          subject,
          text: textContent,
          html: htmlContent,
        });
        this.logger.log(`Password reset email delivered to ${to}`);
        return { delivered: true };
      } catch (err: any) {
        this.logger.error(`Error sending password reset email to ${to}: ${err.message}`);
        return { delivered: false, error: err.message };
      }
    } else {
      this.logger.log(`[MailService] Password reset link for ${to}: ${resetLink}`);
      return { delivered: false };
    }
  }
}
