import { logger } from '../utils/logger';

export class WebhookService {
  static async sendDiscordAlert(
    webhookUrl: string,
    isDown: boolean,
    monitorName: string,
    url: string,
    details: string,
    durationSeconds?: number | null
  ): Promise<boolean> {
    try {
      const color = isDown ? 0xef4444 : 0x10b981; // Red : Green
      const title = isDown
        ? `🚨 [ALERT] ${monitorName} is DOWN`
        : `✅ [RECOVERED] ${monitorName} is back UP`;

      const fields = [
        { name: 'Target URL', value: url, inline: false },
        {
          name: isDown ? 'Failure Reason' : 'Duration',
          value: isDown
            ? details
            : durationSeconds
            ? `${Math.floor(durationSeconds / 60)}m ${durationSeconds % 60}s`
            : 'Recovered',
          inline: true,
        },
        { name: 'Timestamp', value: new Date().toUTCString(), inline: true },
      ];

      const payload = {
        username: 'DevPulse Bot',
        embeds: [
          {
            title,
            color,
            fields,
            footer: { text: 'DevPulse — Zero-Budget Monitoring SaaS' },
          },
        ],
      };

      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        logger.error(`Discord webhook failed with HTTP ${response.status}`);
        return false;
      }

      logger.info(`💬 Discord alert sent to webhook for ${monitorName}`);
      return true;
    } catch (err: any) {
      logger.error('Failed to post to Discord webhook:', err.message);
      return false;
    }
  }

  static async sendSlackAlert(
    webhookUrl: string,
    isDown: boolean,
    monitorName: string,
    url: string,
    details: string
  ): Promise<boolean> {
    try {
      const text = isDown
        ? `🚨 *[DevPulse ALERT]* *${monitorName}* is *DOWN*!\nTarget: ${url}\nReason: \`${details}\``
        : `✅ *[DevPulse RECOVERY]* *${monitorName}* has *RECOVERED*!\nTarget: ${url}`;

      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });

      return response.ok;
    } catch (err: any) {
      logger.error('Failed to post to Slack webhook:', err.message);
      return false;
    }
  }
}
