import { EmailProvider, SendEmailInput } from "./email-provider";
import { logger } from "../../utils/logger";

export class ConsoleEmailProvider implements EmailProvider {
  async send(input: SendEmailInput): Promise<void> {
    logger.info(
      { to: input.to },
      `\n [console email] ${input.subject}\n${input.text ?? input.html}\n`,
    );
  }
}
