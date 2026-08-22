import nodemailer, { Transporter } from "nodemailer";
import { EmailProvider, SendEmailInput } from "./email-provider";
import { env } from "../../config/env";

export class GoogleEmailProvider implements EmailProvider {
  private transporter: Transporter;

  constructor() {
    this.transporter = nodemailer.createTransport({
      host: env.GOOGLE_SMTP_HOST,
      port: env.GOOGLE_SMTP_PORT,
      secure: env.GOOGLE_SMTP_PORT === 465,
      auth: {
        user: env.GOOGLE_WORKSPACE_USER,
        pass: env.GOOGLE_WORKSPACE_APP_PASSWORD,
      },
    });
  }

  async send(input: SendEmailInput): Promise<void> {
    await this.transporter.sendMail({
      from: `"${env.EMAIL_FROM_NAME}" <${env.EMAIL_FROM}>`,
      to: input.to,
      subject: input.subject,
      text: input.text,
      html: input.html,
    });
  }
}
