import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

export interface AlertPayload {
  runId: string;
  workflowName: string;
  workflowId: string;
  organizationName: string;
  errorMessage: string | null;
  duration: number | null;
  startedAt: Date;
  provider?: string;
  traceCount?: number;
}

@Injectable()
export class AlertsService {
  private readonly logger = new Logger(AlertsService.name);
  private readonly slackWebhookUrl = process.env.SLACK_WEBHOOK_URL;
  private readonly resendApiKey = process.env.RESEND_API_KEY;
  private readonly alertEmail = process.env.ALERT_EMAIL;
  private readonly appUrl = process.env.APP_URL ?? 'http://localhost:3000';

  constructor(private readonly httpService: HttpService) {}

  async sendFailureAlert(payload: AlertPayload): Promise<void> {
    const promises: Promise<void>[] = [];

    if (this.slackWebhookUrl) {
      promises.push(this.sendSlackAlert(payload));
    }
    if (this.resendApiKey && this.alertEmail) {
      promises.push(this.sendEmailAlert(payload));
    }

    if (!promises.length) {
      this.logger.debug('No alert channels configured (SLACK_WEBHOOK_URL / RESEND_API_KEY)');
      return;
    }

    await Promise.allSettled(promises);
  }

  private async sendSlackAlert(payload: AlertPayload): Promise<void> {
    const runUrl = `${this.appUrl}/dashboard/runs/${payload.runId}`;
    const durationText = payload.duration ? `${(payload.duration / 1000).toFixed(2)}s` : 'unknown';

    const body = {
      text: `🚨 Alert: Workflow "${payload.workflowName}" Failed`,
      blocks: [
        {
          type: 'header',
          text: { type: 'plain_text', text: '🚨 Workflow Execution Failed', emoji: true },
        },
        {
          type: 'context',
          elements: [
            { type: 'mrkdwn', text: `*Org:* ${payload.organizationName}  |  *Run ID:* \`${payload.runId}\`` }
          ]
        },
        {
          type: 'divider',
        },
        {
          type: 'section',
          fields: [
            { type: 'mrkdwn', text: `*Workflow*\n${payload.workflowName}` },
            { type: 'mrkdwn', text: `*Platform / Provider*\n\`${payload.provider ?? 'unknown'}\`` },
            { type: 'mrkdwn', text: `*Duration*\n⏱️ ${durationText}` },
            { type: 'mrkdwn', text: `*AI LLM Calls*\n🤖 ${payload.traceCount ?? 0} traces` },
          ],
        },
        {
          type: 'divider',
        },
        ...(payload.errorMessage
          ? [
              {
                type: 'section',
                text: { type: 'mrkdwn', text: `*Error Details*\n\`\`\`${payload.errorMessage}\`\`\`` },
              },
            ]
          : []),
        {
          type: 'actions',
          elements: [
            {
              type: 'button',
              text: { type: 'plain_text', text: '🔍 Inspect in FlowOps', emoji: true },
              url: runUrl,
              style: 'danger',
            },
          ],
        },
      ],
    };

    try {
      await firstValueFrom(
        this.httpService.post(this.slackWebhookUrl!, body),
      );
      this.logger.log(`Slack alert sent for run ${payload.runId}`);
    } catch (err) {
      this.logger.error(`Slack alert failed: ${err.message}`);
    }
  }

  private async sendEmailAlert(payload: AlertPayload): Promise<void> {
    const runUrl = `${this.appUrl}/dashboard/runs/${payload.runId}`;
    const durationText = payload.duration ? `${(payload.duration / 1000).toFixed(2)}s` : 'unknown';

    const html = `
      <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;max-width:600px;margin:0 auto;padding:32px 24px;background-color:#080809;color:#f2f2f7;border-radius:12px;border:1px solid #222228;">
        <!-- Header -->
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:24px;">
          <div style="width:24px;height:24px;background:#6366f1;border-radius:6px;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:12px;color:#fff;">A</div>
          <span style="font-size:14px;font-weight:700;color:#9494a8;letter-spacing:-0.01em;">AKRA FlowOps</span>
        </div>
        
        <!-- Main Alert Banner -->
        <div style="background:rgba(239,68,68,0.1);border:1px solid rgba(239,68,68,0.25);border-radius:8px;padding:20px;margin-bottom:28px;">
          <h1 style="color:#ef4444;margin:0 0 8px 0;font-size:20px;font-weight:700;letter-spacing:-0.02em;display:flex;align-items:center;gap:8px;">
            🚨 Workflow Execution Failed
          </h1>
          <p style="margin:0;font-size:14px;color:#9494a8;line-height:1.5;">
            Workflow <strong>${payload.workflowName}</strong> encountered a terminal failure. Immediate inspection is recommended.
          </p>
        </div>

        <!-- Details Card -->
        <div style="background:#0f0f12;border:1px solid #222228;border-radius:8px;padding:20px;margin-bottom:28px;">
          <h2 style="font-size:12px;font-weight:600;color:#44445a;text-transform:uppercase;letter-spacing:0.06em;margin:0 0 16px 0;">Execution Summary</h2>
          
          <table style="width:100%;border-collapse:collapse;">
            <tr>
              <td style="padding:8px 0;border-bottom:1px solid #1a1a20;color:#9494a8;font-size:13px;width:150px;">Workflow Name</td>
              <td style="padding:8px 0;border-bottom:1px solid #1a1a20;color:#f2f2f7;font-size:13px;font-weight:600;">${payload.workflowName}</td>
            </tr>
            <tr>
              <td style="padding:8px 0;border-bottom:1px solid #1a1a20;color:#9494a8;font-size:13px;">Provider / Platform</td>
              <td style="padding:8px 0;border-bottom:1px solid #1a1a20;color:#f2f2f7;font-size:13px;"><code style="background:#16161b;padding:2px 6px;border-radius:4px;font-size:12px;color:#a5b4fc;">${payload.provider ?? 'unknown'}</code></td>
            </tr>
            <tr>
              <td style="padding:8px 0;border-bottom:1px solid #1a1a20;color:#9494a8;font-size:13px;">Organization</td>
              <td style="padding:8px 0;border-bottom:1px solid #1a1a20;color:#f2f2f7;font-size:13px;">${payload.organizationName}</td>
            </tr>
            <tr>
              <td style="padding:8px 0;border-bottom:1px solid #1a1a20;color:#9494a8;font-size:13px;">Duration</td>
              <td style="padding:8px 0;border-bottom:1px solid #1a1a20;color:#f2f2f7;font-size:13px;">⏱️ ${durationText}</td>
            </tr>
            <tr>
              <td style="padding:8px 0;border-bottom:1px solid #1a1a20;color:#9494a8;font-size:13px;">AI LLM Traces</td>
              <td style="padding:8px 0;border-bottom:1px solid #1a1a20;color:#f2f2f7;font-size:13px;">🤖 ${payload.traceCount ?? 0} calls</td>
            </tr>
            <tr>
              <td style="padding:8px 0;color:#9494a8;font-size:13px;">Run ID</td>
              <td style="padding:8px 0;color:#9494a8;font-size:13px;font-family:monospace;letter-spacing:-0.02em;">${payload.runId}</td>
            </tr>
          </table>
        </div>

        <!-- Error Details (if any) -->
        ${payload.errorMessage ? `
        <div style="background:#16161b;border:1px solid #ef4444;border-left:4px solid #ef4444;border-radius:6px;padding:16px;margin-bottom:28px;">
          <h3 style="margin:0 0 8px 0;font-size:13px;font-weight:700;color:#ef4444;text-transform:uppercase;letter-spacing:0.04em;">Error Message</h3>
          <pre style="margin:0;font-family:monospace;font-size:12px;color:#f2f2f7;white-space:pre-wrap;word-break:break-all;">${payload.errorMessage}</pre>
        </div>
        ` : ''}

        <!-- CTA -->
        <div style="text-align:center;margin-top:12px;">
          <a href="${runUrl}" style="display:inline-block;background:#6366f1;color:#ffffff;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;box-shadow:0 4px 12px rgba(99,102,241,0.25);">
            🔍 Inspect in FlowOps Dashboard
          </a>
        </div>

        <!-- Footer Info -->
        <div style="margin-top:32px;border-top:1px solid #222228;padding-top:16px;text-align:center;">
          <p style="margin:0;font-size:11px;color:#44445a;line-height:1.5;">
            This alert was automatically generated by AKRA FlowOps.<br />
            To configure alert conditions or mute channels, visit your organization settings.
          </p>
        </div>
      </div>
    `;

    try {
      await firstValueFrom(
        this.httpService.post(
          'https://api.resend.com/emails',
          {
            from: 'AKRA FlowOps <alerts@your-domain.com>',
            to: [this.alertEmail!],
            subject: `🚨 [FlowOps] Workflow Failure Alert: ${payload.workflowName}`,
            html,
          },
          { headers: { Authorization: `Bearer ${this.resendApiKey}` } },
        ),
      );
      this.logger.log(`Email alert sent for run ${payload.runId}`);
    } catch (err) {
      this.logger.error(`Email alert failed: ${err.message}`);
    }
  }
}
