import { env } from '../config/env';
import { logger } from '../utils/logger';

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export class EmailService {
  static async sendEmail(options: EmailOptions): Promise<boolean> {
    if (!env.RESEND_API_KEY) {
      logger.info(
        `[MOCK EMAIL DISPATCH] (No RESEND_API_KEY configured)\n` +
          `  To: ${options.to}\n` +
          `  From: ${env.RESEND_FROM_EMAIL}\n` +
          `  Subject: ${options.subject}\n` +
          `  Body: ${options.text || options.html.slice(0, 100)}...`
      );
      return true;
    }

    try {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${env.RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: env.RESEND_FROM_EMAIL,
          to: options.to,
          subject: options.subject,
          html: options.html,
          text: options.text,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        logger.error('Resend API error:', errorData);
        return false;
      }

      logger.info(`📧 Email sent successfully via Resend to ${options.to}`);
      return true;
    } catch (err: any) {
      logger.error('Failed to send email via Resend:', err.message);
      return false;
    }
  }

  static async sendDownAlert(
    recipient: string,
    monitorName: string,
    url: string,
    reason: string
  ): Promise<boolean> {
    const subject = `🚨 ALERT: ${monitorName} is DOWN`;
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #0c0e15; color: #f3f4f6; border-radius: 8px;">
        <h2 style="color: #ef4444; margin-top: 0;">🚨 Service Outage Detected</h2>
        <p>DevPulse has detected an outage for your service:</p>
        <div style="background: #11131a; padding: 15px; border-radius: 6px; border: 1px solid #232838; margin: 15px 0;">
          <p style="margin: 0 0 8px 0;"><strong>Service:</strong> ${monitorName}</p>
          <p style="margin: 0 0 8px 0;"><strong>Endpoint:</strong> <a href="${url}" style="color: #6366f1;">${url}</a></p>
          <p style="margin: 0 0 8px 0;"><strong>Failure Reason:</strong> <span style="color: #f87171;">${reason}</span></p>
          <p style="margin: 0;"><strong>Detected At:</strong> ${new Date().toUTCString()}</p>
        </div>
        <p style="font-size: 12px; color: #94a3b8;">Log in to your DevPulse dashboard to investigate or post status updates.</p>
      </div>
    `;

    return this.sendEmail({ to: recipient, subject, html, text: `${monitorName} is DOWN: ${reason}` });
  }

  static async sendRecoveryAlert(
    recipient: string,
    monitorName: string,
    url: string,
    durationSeconds?: number | null
  ): Promise<boolean> {
    const subject = `✅ RECOVERED: ${monitorName} is back UP`;
    const durationText = durationSeconds ? `${Math.floor(durationSeconds / 60)} minutes` : 'a few moments';

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #0c0e15; color: #f3f4f6; border-radius: 8px;">
        <h2 style="color: #10b981; margin-top: 0;">✅ Service Restored</h2>
        <p>Your service is now healthy and passing all health probes:</p>
        <div style="background: #11131a; padding: 15px; border-radius: 6px; border: 1px solid #232838; margin: 15px 0;">
          <p style="margin: 0 0 8px 0;"><strong>Service:</strong> ${monitorName}</p>
          <p style="margin: 0 0 8px 0;"><strong>Endpoint:</strong> <a href="${url}" style="color: #6366f1;">${url}</a></p>
          <p style="margin: 0 0 8px 0;"><strong>Downtime Duration:</strong> ${durationText}</p>
          <p style="margin: 0;"><strong>Recovered At:</strong> ${new Date().toUTCString()}</p>
        </div>
        <p style="font-size: 12px; color: #94a3b8;">DevPulse will continue continuous automated monitoring.</p>
      </div>
    `;

    return this.sendEmail({ to: recipient, subject, html, text: `${monitorName} has RECOVERED after ${durationText}.` });
  }
}
