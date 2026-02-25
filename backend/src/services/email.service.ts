import nodemailer from "nodemailer";
import { getEnv } from "../config/env";

let transporter: nodemailer.Transporter | null = null;

function getTransporter(): nodemailer.Transporter | null {
  if (!transporter) {
    const env = getEnv();

    // Prefer SMTP environment config
    if (env.SMTP_HOST && env.SMTP_USER && env.SMTP_PASS) {
      transporter = nodemailer.createTransport({
        host: env.SMTP_HOST,
        port: env.SMTP_PORT || 587,
        secure: (env.SMTP_PORT || 587) === 465,
        auth: {
          user: env.SMTP_USER,
          pass: env.SMTP_PASS,
        },
      });
      return transporter;
    }

    // Fallback to Gmail service if available
    if (env.GMAIL_USER && env.GMAIL_PASS) {
      transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
          user: env.GMAIL_USER,
          pass: env.GMAIL_PASS,
        },
      });
      return transporter;
    }

    return null;
  }
  return transporter;
}

export async function sendInviteEmail(
  to: string,
  token: string,
  testTitle: string,
): Promise<void> {
  const env = getEnv();
  const transporter = getTransporter();

  if (!transporter) {
    console.warn("Email service not configured. Skipping invitation email.", {
      to,
      subject: `You're invited to take: ${testTitle}`,
    });
    return;
  }

  const frontendUrl =
    env.NODE_ENV === "production"
      ? process.env.FRONTEND_URL || "https://yourdomain.com"
      : "http://localhost:3000";

  const inviteUrl = `${frontendUrl}/invite/${token}`;

  const html = `
<div style="background-color:#FFFFFF; margin:0; padding:0; width:100%; -webkit-text-size-adjust:none; -ms-text-size-adjust:none;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#FFFFFF; margin:0; padding:0; width:100%;">
    <tr>
      <td align="center" style="padding:40px 20px 80px 20px; font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Helvetica Neue', Arial, sans-serif;">
        
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:480px; background-color: #ffffff; border-radius: 40px; border: 1px solid #F2F2F7; box-shadow: 0 40px 120px rgba(0,0,0,0.06); border-collapse: separate;">
          <tr>
            <td style="padding: 64px 48px;">
              
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom: 56px;">
                <tr>
                  <td align="center">
                    <table cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td width="20" style="border-bottom: 1px solid rgba(0,0,0,0.1); font-size: 1px; line-height: 1px;">&nbsp;</td>
                        <td style="padding: 0 12px; font-size: 10px; font-weight: 700; color: #000000; letter-spacing: 3px; text-transform: uppercase; line-height: 1;">Ready</td>
                        <td width="20" style="border-bottom: 1px solid rgba(0,0,0,0.1); font-size: 1px; line-height: 1px;">&nbsp;</td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <h1 style="margin: 0; font-size: 38px; font-weight: 600; color: #000000; letter-spacing: -1.8px; line-height: 1.1; text-align: center;">
                Assessment.
              </h1>
              
              <p style="margin: 24px 0 0 0; font-size: 17px; color: #86868b; font-weight: 400; line-height: 1.5; text-align: center; letter-spacing: -0.2px;">
                You are invited to the <span style="color: #000000; font-weight: 500;">${testTitle}</span> environment.
              </p>

              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin: 56px 0 48px 0; border-top: 1px solid #F2F2F7; border-bottom: 1px solid #F2F2F7;">
                <tr>
                  <td align="center" style="padding: 24px 0;">
                    <table cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td valign="middle" style="line-height: 1px; font-size: 1px; padding-right: 12px;">
                          <table cellpadding="0" cellspacing="0" border="0">
                            <tr>
                              <td width="6" height="6" bgcolor="#34C759" style="width: 6px; height: 6px; border-radius: 50%; font-size: 1px; line-height: 1px; mso-line-height-rule: exactly;">&nbsp;</td>
                            </tr>
                          </table>
                        </td>
                        <td valign="middle" style="font-size: 13px; color: #86868b; font-weight: 400; letter-spacing: -0.1px; line-height: 1;">
                          Opening the link starts the timer.
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td align="center">
                    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse: separate;">
                      <tr>
                        <td align="center" bgcolor="#000000" style="border-radius: 14px; padding: 0;">
                          <a href="${inviteUrl}" target="_blank" style="display: block; font-size: 15px; font-weight: 600; color: #ffffff; text-decoration: none; padding: 22px 0; width: 100%; letter-spacing: 0.5px; border-radius: 14px;">
                            Start Test
                          </a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top: 64px;">
                <tr>
                  <td align="center" style="font-size: 10px; color: #D2D2D7; letter-spacing: 2px; text-transform: uppercase; font-weight: 600;">
                    CodeAI / 2026
                  </td>
                </tr>
              </table>

            </td>
          </tr>
        </table>

      </td>
    </tr>
  </table>
</div>
  `;

  try {
    const senderEmail =
      env.SMTP_USER || env.GMAIL_USER || "no-reply@assessmentplatform.com";
    await transporter.sendMail({
      from: `AI Assessment Platform <${senderEmail}>`,
      to,
      subject: `You're invited to take: ${testTitle}`,
      html,
    });
    console.info(`Invitation email sent successfully to ${to}`);
  } catch (error) {
    console.error(
      `Failed to send invitation email to ${to}:`,
      error instanceof Error ? error.message : error,
    );
  }
}
