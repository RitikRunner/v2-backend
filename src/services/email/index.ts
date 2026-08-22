import { env } from "../../config/env";
import { EmailProvider } from "./email-provider";
import { ConsoleEmailProvider } from "./console-provider";
import { GoogleEmailProvider } from "./google-provider";

let instance: EmailProvider | null = null;

export function getEmailProvider(): EmailProvider {
  if (!instance) {
    instance =
      env.EMAIL_PROVIDER === "google"
        ? new GoogleEmailProvider()
        : new ConsoleEmailProvider();
  }
  return instance;
}
