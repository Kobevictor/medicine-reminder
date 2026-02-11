import nodemailer from "nodemailer";
import { getEmailSettings } from "./db";

// ─── Transporter Factory (per-user SMTP from DB) ───────────────

async function getUserTransporter(userId: number) {
  const settings = await getEmailSettings(userId);
  if (!settings || !settings.isEnabled) {
    console.warn(`[Email] No SMTP configured or disabled for user ${userId}`);
    return null;
  }

  return {
    transporter: nodemailer.createTransport({
      host: settings.smtpHost,
      port: settings.smtpPort,
      secure: settings.smtpSecure,
      auth: {
        user: settings.smtpUser,
        pass: settings.smtpPass,
      },
    }),
    from: settings.smtpFrom || settings.smtpUser,
  };
}

/**
 * Create a transporter from raw SMTP config (for testing before saving).
 */
function createTransporterFromConfig(config: {
  smtpHost: string;
  smtpPort: number;
  smtpUser: string;
  smtpPass: string;
  smtpSecure: boolean;
  smtpFrom?: string | null;
}) {
  return {
    transporter: nodemailer.createTransport({
      host: config.smtpHost,
      port: config.smtpPort,
      secure: config.smtpSecure,
      auth: {
        user: config.smtpUser,
        pass: config.smtpPass,
      },
    }),
    from: config.smtpFrom || config.smtpUser,
  };
}

// ─── Email Templates ────────────────────────────────────────────

function buildLowStockEmailHtml(params: {
  recipientName: string;
  userName: string;
  medications: Array<{
    name: string;
    dosage: string;
    remainingQuantity: number;
    daysRemaining: number;
    predictedExhaustDate: string;
    dailyUsage: number;
  }>;
}): string {
  const { recipientName, userName, medications } = params;

  const medRows = medications
    .map(
      (med) => `
      <tr>
        <td style="padding:12px 16px; border-bottom:1px solid #f0e6d0; font-size:16px; color:#1a2744;">
          <strong>${med.name}</strong>
        </td>
        <td style="padding:12px 16px; border-bottom:1px solid #f0e6d0; font-size:16px; color:#555;">
          ${med.dosage}
        </td>
        <td style="padding:12px 16px; border-bottom:1px solid #f0e6d0; font-size:16px; color:#555;">
          剩余 ${med.remainingQuantity} 份
        </td>
        <td style="padding:12px 16px; border-bottom:1px solid #f0e6d0; font-size:16px; color:#555;">
          每日 ${med.dailyUsage} 份
        </td>
        <td style="padding:12px 16px; border-bottom:1px solid #f0e6d0; font-size:16px; font-weight:bold; color:${med.daysRemaining <= 3 ? '#dc2626' : '#ea580c'};">
          ${med.daysRemaining <= 0 ? '已用尽' : `${med.daysRemaining} 天`}
        </td>
        <td style="padding:12px 16px; border-bottom:1px solid #f0e6d0; font-size:16px; color:#555;">
          ${med.predictedExhaustDate}
        </td>
      </tr>`
    )
    .join("");

  return `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0; padding:0; background-color:#faf6f0; font-family:'Noto Sans SC', 'Microsoft YaHei', 'PingFang SC', sans-serif;">
  <div style="max-width:640px; margin:0 auto; padding:24px;">
    <!-- Header -->
    <div style="background: linear-gradient(135deg, #1a2744, #2a3a5c); border-radius:16px 16px 0 0; padding:32px; text-align:center;">
      <h1 style="color:#c9a84c; font-size:28px; margin:0 0 8px 0;">💊 药智提醒</h1>
      <p style="color:#e8dcc8; font-size:16px; margin:0;">智能药物管理助手 · 药物用尽预警通知</p>
    </div>

    <!-- Content -->
    <div style="background:#ffffff; padding:32px; border-left:1px solid #e8dcc8; border-right:1px solid #e8dcc8;">
      <p style="font-size:18px; color:#1a2744; margin:0 0 16px 0;">
        尊敬的 <strong>${recipientName}</strong>，您好！
      </p>
      <p style="font-size:16px; color:#555; line-height:1.8; margin:0 0 24px 0;">
        您关注的 <strong style="color:#1a2744;">${userName}</strong> 的以下药物即将用尽或已经用完，请及时关注并帮助补充购买：
      </p>

      <!-- Medication Table -->
      <div style="overflow-x:auto; margin:0 0 24px 0;">
        <table style="width:100%; border-collapse:collapse; border:1px solid #e8dcc8; border-radius:12px; overflow:hidden;">
          <thead>
            <tr style="background:#faf6f0;">
              <th style="padding:12px 16px; text-align:left; font-size:14px; color:#888; font-weight:600; border-bottom:2px solid #c9a84c;">药物名称</th>
              <th style="padding:12px 16px; text-align:left; font-size:14px; color:#888; font-weight:600; border-bottom:2px solid #c9a84c;">剂量</th>
              <th style="padding:12px 16px; text-align:left; font-size:14px; color:#888; font-weight:600; border-bottom:2px solid #c9a84c;">剩余量</th>
              <th style="padding:12px 16px; text-align:left; font-size:14px; color:#888; font-weight:600; border-bottom:2px solid #c9a84c;">每日用量</th>
              <th style="padding:12px 16px; text-align:left; font-size:14px; color:#888; font-weight:600; border-bottom:2px solid #c9a84c;">剩余天数</th>
              <th style="padding:12px 16px; text-align:left; font-size:14px; color:#888; font-weight:600; border-bottom:2px solid #c9a84c;">预计用尽</th>
            </tr>
          </thead>
          <tbody>
            ${medRows}
          </tbody>
        </table>
      </div>

      <!-- Alert box -->
      <div style="background:#fff7ed; border:1px solid #fed7aa; border-radius:12px; padding:16px 20px; margin:0 0 24px 0;">
        <p style="font-size:16px; color:#ea580c; margin:0; line-height:1.6;">
          ⚠️ 请尽快帮助 <strong>${userName}</strong> 补充以上药物，确保用药不中断。
        </p>
      </div>

      <p style="font-size:14px; color:#999; line-height:1.6; margin:0;">
        此邮件由「药智提醒」系统自动发送，如有疑问请联系用户本人。
      </p>
    </div>

    <!-- Footer -->
    <div style="background:#faf6f0; border:1px solid #e8dcc8; border-top:none; border-radius:0 0 16px 16px; padding:20px 32px; text-align:center;">
      <p style="font-size:13px; color:#aaa; margin:0;">
        药智提醒 — 守护健康，关爱家人
      </p>
    </div>
  </div>
</body>
</html>`;
}

// ─── Send Email Functions ───────────────────────────────────────

export type LowStockMedInfo = {
  name: string;
  dosage: string;
  remainingQuantity: number;
  daysRemaining: number;
  predictedExhaustDate: string;
  dailyUsage: number;
};

/**
 * Send a low-stock alert email to a family contact using the user's SMTP config from DB.
 */
export async function sendLowStockEmail(params: {
  userId: number;
  recipientName: string;
  recipientEmail: string;
  userName: string;
  medications: LowStockMedInfo[];
}): Promise<boolean> {
  const smtp = await getUserTransporter(params.userId);
  if (!smtp) return false;

  const html = buildLowStockEmailHtml({
    recipientName: params.recipientName,
    userName: params.userName,
    medications: params.medications,
  });

  const urgentMeds = params.medications.filter((m) => m.daysRemaining <= 3);
  const subject =
    urgentMeds.length > 0
      ? `🚨 紧急：${params.userName}的${urgentMeds.length}种药物即将用尽`
      : `⚠️ 提醒：${params.userName}的${params.medications.length}种药物需要补充`;

  try {
    await smtp.transporter.sendMail({
      from: `"药智提醒" <${smtp.from}>`,
      to: params.recipientEmail,
      subject,
      html,
    });
    console.log(`[Email] Sent low-stock alert to ${params.recipientEmail}`);
    return true;
  } catch (error) {
    console.error("[Email] Failed to send:", error);
    return false;
  }
}

/**
 * Send a test email using raw SMTP config (before saving to DB).
 */
export async function sendTestEmailWithConfig(
  config: {
    smtpHost: string;
    smtpPort: number;
    smtpUser: string;
    smtpPass: string;
    smtpSecure: boolean;
    smtpFrom?: string | null;
  },
  toEmail: string
): Promise<boolean> {
  const { transporter, from } = createTransporterFromConfig(config);

  try {
    await transporter.sendMail({
      from: `"药智提醒" <${from}>`,
      to: toEmail,
      subject: "✅ 药智提醒 — 邮件配置测试成功",
      html: `
<!DOCTYPE html>
<html lang="zh-CN">
<head><meta charset="UTF-8"></head>
<body style="margin:0; padding:0; background-color:#faf6f0; font-family:sans-serif;">
  <div style="max-width:480px; margin:40px auto; padding:32px; background:#fff; border-radius:16px; border:1px solid #e8dcc8; text-align:center;">
    <h2 style="color:#1a2744; margin:0 0 16px 0;">✅ 邮件配置成功</h2>
    <p style="color:#555; font-size:16px; line-height:1.6;">
      您的「药智提醒」邮件通知功能已配置成功。<br/>
      当药物即将用尽时，系统将自动向亲友发送邮件提醒。
    </p>
    <p style="color:#c9a84c; font-size:14px; margin-top:24px;">药智提醒 — 守护健康，关爱家人</p>
  </div>
</body>
</html>`,
    });
    return true;
  } catch (error) {
    console.error("[Email] Test email failed:", error);
    return false;
  }
}

/**
 * Send a test email using the user's saved SMTP config from DB.
 */
export async function sendTestEmailFromDb(userId: number, toEmail: string): Promise<boolean> {
  const smtp = await getUserTransporter(userId);
  if (!smtp) return false;

  try {
    await smtp.transporter.sendMail({
      from: `"药智提醒" <${smtp.from}>`,
      to: toEmail,
      subject: "✅ 药智提醒 — 邮件配置测试成功",
      html: `
<!DOCTYPE html>
<html lang="zh-CN">
<head><meta charset="UTF-8"></head>
<body style="margin:0; padding:0; background-color:#faf6f0; font-family:sans-serif;">
  <div style="max-width:480px; margin:40px auto; padding:32px; background:#fff; border-radius:16px; border:1px solid #e8dcc8; text-align:center;">
    <h2 style="color:#1a2744; margin:0 0 16px 0;">✅ 邮件配置成功</h2>
    <p style="color:#555; font-size:16px; line-height:1.6;">
      您的「药智提醒」邮件通知功能已配置成功。<br/>
      当药物即将用尽时，系统将自动向亲友发送邮件提醒。
    </p>
    <p style="color:#c9a84c; font-size:14px; margin-top:24px;">药智提醒 — 守护健康，关爱家人</p>
  </div>
</body>
</html>`,
    });
    return true;
  } catch (error) {
    console.error("[Email] Test email failed:", error);
    return false;
  }
}
