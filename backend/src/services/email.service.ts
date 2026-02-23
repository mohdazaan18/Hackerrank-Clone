import { Resend } from "resend";
import { getEnv } from "../config/env";

let resendClient: Resend | null = null;

function getResendClient(): Resend {
    if (!resendClient) {
        const env = getEnv();
        resendClient = new Resend(env.RESEND_API_KEY);
    }
    return resendClient;
}

export async function sendInviteEmail(
    to: string,
    token: string,
    testTitle: string
): Promise<void> {
    const resend = getResendClient();
    const env = getEnv();

    const inviteUrl =
        env.NODE_ENV === "production"
            ? `${process.env.FRONTEND_URL || "https://yourdomain.com"}/invite/${token}`
            : `http://localhost:3000/invite/${token}`;

    try {
        await resend.emails.send({
            from: "AI Assessment Platform <onboarding@resend.dev>",
            to,
            subject: `You're invited to take: ${testTitle}`,
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                    <h2 style="color: #1a1a2e;">AI Coding Assessment Platform</h2>
                    <p>You've been invited to take the following coding assessment:</p>
                    <div style="background-color: #f0f0f5; padding: 16px; border-radius: 8px; margin: 16px 0;">
                        <h3 style="margin: 0; color: #16213e;">${testTitle}</h3>
                    </div>
                    <p>Click the button below to begin your assessment:</p>
                    <a href="${inviteUrl}" 
                       style="display: inline-block; background-color: #0f3460; color: white; padding: 12px 24px; 
                              text-decoration: none; border-radius: 6px; margin: 16px 0; font-weight: bold;">
                        Start Assessment
                    </a>
                    <p style="color: #666; font-size: 14px; margin-top: 24px;">
                        This invitation will expire in 7 days. If the button doesn't work, copy and paste this link:
                        <br/>
                        <a href="${inviteUrl}" style="color: #0f3460;">${inviteUrl}</a>
                    </p>
                </div>
            `,
        });
    } catch (error) {
        console.error(`Failed to send invite email to ${to}:`, error);
        // Don't throw — email failure shouldn't block invitation creation
    }
}
