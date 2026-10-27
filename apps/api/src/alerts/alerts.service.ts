import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import * as nodemailer from 'nodemailer';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';

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

  // SMTP via nodemailer
  private readonly smtpHost = process.env.SMTP_HOST;
  private readonly smtpPort = parseInt(process.env.SMTP_PORT ?? '465', 10);
  private readonly smtpUser = process.env.SMTP_USER;
  private readonly smtpPass = process.env.SMTP_PASS;
  private readonly smtpFrom = process.env.SMTP_FROM ?? process.env.SMTP_USER;

  constructor(
    private readonly httpService: HttpService,
    private readonly prisma: PrismaService,
  ) {}

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
              text: { type: 'plain_text', text: '🔍 Inspect in Selixes', emoji: true },
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
          <div style="width:24px;height:24px;background:#6366f1;border-radius:6px;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:12px;color:#fff;">S</div>
          <span style="font-size:14px;font-weight:700;color:#9494a8;letter-spacing:-0.01em;">Selixes Gateway</span>
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
            🔍 Inspect in Selixes Dashboard
          </a>
        </div>

        <!-- Footer Info -->
        <div style="margin-top:32px;border-top:1px solid #222228;padding-top:16px;text-align:center;">
          <p style="margin:0;font-size:11px;color:#44445a;line-height:1.5;">
            This alert was automatically generated by Selixes Gateway.<br />
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
            from: 'Selixes Gateway <alerts@selixes.com>',
            to: [this.alertEmail!],
            subject: `🚨 [Selixes] Workflow Failure Alert: ${payload.workflowName}`,
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

  async sendPilotRequestEmail(payload: {
    name: string;
    email: string;
    company: string;
    interest: string;
    message: string;
  }): Promise<void> {
    const to = this.alertEmail ?? this.smtpUser;
    if (!to) {
      this.logger.warn('[Pilot Request] No destination email configured (ALERT_EMAIL or SMTP_USER). Logging only.');
      this.logger.log(`[Pilot Request Log] Name: ${payload.name}, Email: ${payload.email}, Company: ${payload.company}, Interest: ${payload.interest}, Message: ${payload.message}`);
      return;
    }

    const html = `
      <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;max-width:600px;margin:0 auto;padding:32px 24px;background-color:#080809;color:#f2f2f7;border-radius:12px;border:1px solid #222228;">
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:24px;">
          <div style="width:24px;height:24px;background:#6366f1;border-radius:6px;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:12px;color:#fff;">S</div>
          <span style="font-size:14px;font-weight:700;color:#9494a8;letter-spacing:-0.01em;">Selixes Gateway</span>
        </div>
        
        <div style="background:rgba(99,102,241,0.1);border:1px solid rgba(99,102,241,0.25);border-radius:8px;padding:20px;margin-bottom:28px;">
          <h1 style="color:#a5b4fc;margin:0 0 8px 0;font-size:20px;font-weight:700;letter-spacing:-0.02em;">
            🚀 New Pilot Request Submitted
          </h1>
          <p style="margin:0;font-size:14px;color:#9494a8;line-height:1.5;">
            A visitor has requested pilot access or custom support from the Selixes contact page.
          </p>
        </div>

        <div style="background:#0f0f12;border:1px solid #222228;border-radius:8px;padding:20px;margin-bottom:28px;">
          <h2 style="font-size:12px;font-weight:600;color:#44445a;text-transform:uppercase;letter-spacing:0.06em;margin:0 0 16px 0;">Request Details</h2>
          
          <table style="width:100%;border-collapse:collapse;">
            <tr>
              <td style="padding:8px 0;border-bottom:1px solid #1a1a20;color:#9494a8;font-size:13px;width:150px;">Name</td>
              <td style="padding:8px 0;border-bottom:1px solid #1a1a20;color:#f2f2f7;font-size:13px;font-weight:600;">${payload.name}</td>
            </tr>
            <tr>
              <td style="padding:8px 0;border-bottom:1px solid #1a1a20;color:#9494a8;font-size:13px;">Email</td>
              <td style="padding:8px 0;border-bottom:1px solid #1a1a20;color:#f2f2f7;font-size:13px;"><a href="mailto:${payload.email}" style="color:#a5b4fc;text-decoration:none;">${payload.email}</a></td>
            </tr>
            <tr>
              <td style="padding:8px 0;border-bottom:1px solid #1a1a20;color:#9494a8;font-size:13px;">Company</td>
              <td style="padding:8px 0;border-bottom:1px solid #1a1a20;color:#f2f2f7;font-size:13px;">${payload.company}</td>
            </tr>
            <tr>
              <td style="padding:8px 0;border-bottom:1px solid #1a1a20;color:#9494a8;font-size:13px;">Interest</td>
              <td style="padding:8px 0;border-bottom:1px solid #1a1a20;color:#f2f2f7;font-size:13px;"><code style="background:#16161b;padding:2px 6px;border-radius:4px;font-size:12px;color:#a5b4fc;">${payload.interest}</code></td>
            </tr>
          </table>
        </div>

        <div style="background:#16161b;border:1px solid #222228;border-radius:6px;padding:16px;">
          <h3 style="margin:0 0 8px 0;font-size:13px;font-weight:700;color:#9494a8;text-transform:uppercase;letter-spacing:0.04em;">Message / Workload Details</h3>
          <p style="margin:0;font-size:13px;color:#cbd5e1;line-height:1.5;white-space:pre-wrap;">${payload.message || 'No additional details provided.'}</p>
        </div>
      </div>
    `;

    // --- Primary: SMTP via nodemailer ---
    if (this.smtpHost && this.smtpUser && this.smtpPass) {
      try {
        const transporter = nodemailer.createTransport({
          host: this.smtpHost,
          port: this.smtpPort,
          secure: this.smtpPort === 465,
          auth: { user: this.smtpUser, pass: this.smtpPass },
        });
        await transporter.sendMail({
          from: `"Selixes Gateway" <${this.smtpFrom}>`,
          to,
          subject: `🚀 [Selixes Contact] New Pilot Request: ${payload.company}`,
          html,
        });
        this.logger.log(`[Pilot Request] SMTP email sent to ${to}`);
        return;
      } catch (err) {
        this.logger.error(`[Pilot Request] SMTP send failed: ${err.message}. Falling back to Resend.`);
      }
    }

    // --- Fallback: Resend ---
    if (this.resendApiKey && this.alertEmail) {
      try {
        await firstValueFrom(
          this.httpService.post(
            'https://api.resend.com/emails',
            {
              from: `Selixes Gateway <${this.smtpFrom ?? 'noreply@selixes.com'}>`,
              to: [this.alertEmail],
              subject: `🚀 [Selixes Contact] New Pilot Request: ${payload.company}`,
              html,
            },
            { headers: { Authorization: `Bearer ${this.resendApiKey}` } },
          ),
        );
        this.logger.log(`[Pilot Request] Resend email sent to ${this.alertEmail}`);
      } catch (err) {
        this.logger.error(`[Pilot Request] Resend fallback also failed: ${err.message}`);
      }
    } else {
      this.logger.error('[Pilot Request] No email channel available (SMTP or Resend). Submission lost to logs only.');
    }
  }

  async sendFounderAlert(title: string, message: string, details?: Record<string, any>): Promise<void> {
    const promises: Promise<void>[] = [];

    if (this.slackWebhookUrl) {
      promises.push(this.sendFounderSlackAlert(title, message, details));
    }
    if (this.alertEmail || this.smtpUser) {
      promises.push(this.sendFounderEmailAlert(title, message, details));
    }

    if (!promises.length) {
      this.logger.debug('[Founder Alert] No alert channels configured.');
      this.logger.log(`[Founder Alert Log] ${title}: ${message} | ${JSON.stringify(details || {})}`);
      return;
    }

    await Promise.allSettled(promises);
  }

  private async sendFounderSlackAlert(title: string, message: string, details?: Record<string, any>): Promise<void> {
    const fields = details
      ? Object.entries(details).map(([k, v]) => ({
          type: 'mrkdwn',
          text: `*${k}:*\n${typeof v === 'object' ? JSON.stringify(v) : v}`,
        }))
      : [];

    const body: any = {
      text: title,
      blocks: [
        {
          type: 'header',
          text: { type: 'plain_text', text: title, emoji: true },
        },
        {
          type: 'section',
          text: { type: 'mrkdwn', text: message },
        },
      ],
    };

    if (fields.length > 0) {
      body.blocks.push({
        type: 'section',
        fields,
      });
    }

    try {
      await firstValueFrom(this.httpService.post(this.slackWebhookUrl!, body));
      this.logger.log(`Founder Slack alert sent: ${title}`);
    } catch (err) {
      this.logger.error(`Founder Slack alert failed: ${err.message}`);
    }
  }

  private async sendFounderEmailAlert(title: string, message: string, details?: Record<string, any>): Promise<void> {
    const to = this.alertEmail ?? this.smtpUser;
    if (!to) return;

    let detailsHtml = '';
    if (details) {
      detailsHtml = Object.entries(details)
        .map(
          ([k, v]) =>
            `<tr><td style="padding:8px 0;border-bottom:1px solid #1a1a20;color:#9494a8;font-size:13px;width:150px;">${k}</td>
             <td style="padding:8px 0;border-bottom:1px solid #1a1a20;color:#f2f2f7;font-size:13px;font-weight:600;">${
               typeof v === 'object' ? JSON.stringify(v) : v
             }</td></tr>`
        )
        .join('');
    }

    const html = `
      <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;max-width:600px;margin:0 auto;padding:32px 24px;background-color:#080809;color:#f2f2f7;border-radius:12px;border:1px solid #222228;">
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:24px;">
          <div style="width:24px;height:24px;background:#10b981;border-radius:6px;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:12px;color:#fff;">F</div>
          <span style="font-size:14px;font-weight:700;color:#9494a8;letter-spacing:-0.01em;">Founder Alert</span>
        </div>
        
        <div style="background:rgba(16,185,129,0.1);border:1px solid rgba(16,185,129,0.25);border-radius:8px;padding:20px;margin-bottom:28px;">
          <h1 style="color:#34d399;margin:0 0 8px 0;font-size:20px;font-weight:700;letter-spacing:-0.02em;">
            ${title}
          </h1>
          <p style="margin:0;font-size:14px;color:#9494a8;line-height:1.5;">
            ${message}
          </p>
        </div>

        ${
          detailsHtml
            ? `<div style="background:#0f0f12;border:1px solid #222228;border-radius:8px;padding:20px;margin-bottom:28px;">
                 <h2 style="font-size:12px;font-weight:600;color:#44445a;text-transform:uppercase;letter-spacing:0.06em;margin:0 0 16px 0;">Event Details</h2>
                 <table style="width:100%;border-collapse:collapse;">${detailsHtml}</table>
               </div>`
            : ''
        }
      </div>
    `;

    if (this.smtpHost && this.smtpUser && this.smtpPass) {
      try {
        const transporter = nodemailer.createTransport({
          host: this.smtpHost,
          port: this.smtpPort,
          secure: this.smtpPort === 465,
          auth: { user: this.smtpUser, pass: this.smtpPass },
        });
        await transporter.sendMail({
          from: `"Selixes Gateway" <${this.smtpFrom}>`,
          to,
          subject: `[Founder] ${title}`,
          html,
        });
        return;
      } catch (err) {}
    }

    if (this.resendApiKey && this.alertEmail) {
      try {
        await firstValueFrom(
          this.httpService.post(
            'https://api.resend.com/emails',
            {
              from: `Selixes Gateway <${this.smtpFrom ?? 'noreply@selixes.com'}>`,
              to: [this.alertEmail],
              subject: `[Founder] ${title}`,
              html,
            },
            { headers: { Authorization: `Bearer ${this.resendApiKey}` } },
          ),
        );
      } catch (err) {}
    }
  }

  @Cron('0 8 * * *') // Every day at 8:00 AM UTC
  async generateDailyFounderDashboard() {
    this.logger.log('Generating Daily Founder Dashboard...');
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    try {
      const newOrgsToday = await this.prisma.organization.count({ where: { createdAt: { gte: oneDayAgo } } });
      const newOrgsWeek = await this.prisma.organization.count({ where: { createdAt: { gte: sevenDaysAgo } } });
      
      const integrationsSql: any[] = await this.prisma.$queryRaw`
        SELECT COUNT(DISTINCT "organizationId") as count 
        FROM (
          SELECT "organizationId", MIN("createdAt") as first_req
          FROM "UsageRecord"
          GROUP BY "organizationId"
        ) as first_reqs
        WHERE first_req >= ${oneDayAgo}
      `;
      const firstIntegrations = Number(integrationsSql[0]?.count || 0);

      const activeOrgs7dSql: any[] = await this.prisma.$queryRaw`
        SELECT COUNT(DISTINCT "organizationId") as count
        FROM "UsageRecord"
        WHERE "createdAt" >= ${sevenDaysAgo}
      `;
      const weeklyActiveOrgs = Number(activeOrgs7dSql[0]?.count || 0);

      const failoversSql: any[] = await this.prisma.$queryRaw`
        SELECT COUNT(*) as count
        FROM "UsageRecord"
        WHERE "createdAt" >= ${oneDayAgo} AND "providerChain" LIKE '%,%'
      `;
      const failoversHandled = Number(failoversSql[0]?.count || 0);

      const ttfrSql: any[] = await this.prisma.$queryRaw`
        SELECT AVG(EXTRACT(EPOCH FROM (first_req - org_created))) as avg_ttfr_seconds
        FROM (
          SELECT u."organizationId", MIN(u."createdAt") as first_req, MIN(o."createdAt") as org_created
          FROM "UsageRecord" u
          JOIN "Organization" o ON u."organizationId" = o.id
          GROUP BY u."organizationId"
        ) as sub
        WHERE first_req >= ${oneDayAgo}
      `;
      const avgTtfrSeconds = Number(ttfrSql[0]?.avg_ttfr_seconds || 0);
      const avgTtfrText = avgTtfrSeconds > 0 ? `${Math.floor(avgTtfrSeconds / 60)}m ${Math.floor(avgTtfrSeconds % 60)}s` : 'N/A';

      const pendingFollowUps = await this.prisma.followUp.count({ where: { status: 'PENDING' } });

      await this.sendFounderAlert('📊 Founder Intelligence Dashboard', 'Your daily product analytics summary.', {
        '⭐ North Star (Weekly Active Orgs)': weeklyActiveOrgs,
        '--- Acquisition ---': '',
        'New Orgs (Today)': newOrgsToday,
        'New Orgs (Week)': newOrgsWeek,
        '--- Activation ---': '',
        'First Integrations (24h)': firstIntegrations,
        'Avg Time to First Request': avgTtfrText,
        '--- Reliability ---': '',
        'Failovers Handled (24h)': failoversHandled,
        '--- Action Items ---': '',
        'Pending Follow-ups Queue': pendingFollowUps > 0 ? `🚨 ${pendingFollowUps} Follow-ups need your attention!` : '✅ All caught up'
      });

    } catch (error) {
      this.logger.error(`Failed to generate Founder Dashboard: ${error.message}`);
    }
  }
}
