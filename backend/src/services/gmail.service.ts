import nodemailer from "nodemailer";
import { getEnv } from "../config/env";

export async function sendGmail(
  to: string,
  subject: string,
  html: string,
): Promise<nodemailer.SentMessageInfo> {
  const env = getEnv();

  if (!env.GMAIL_USER || !env.GMAIL_PASS) {
    throw new Error("Gmail credentials not configured");
  }

  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: env.GMAIL_USER,
      pass: env.GMAIL_PASS,
    },
  });

  const info = await transporter.sendMail({
    from: `AI Assessment Platform <${env.GMAIL_USER}>`,
    to,
    subject,
    html,
  });

  return info as any;
}

export default { sendGmail };
