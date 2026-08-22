import { ParsedMail } from "mailparser";

export interface ParsedEmailLead {
  name?: string;
  phone?: string;
  email?: string;
  subject?: string;
  message?: string;
  rawFrom?: string;
}

const INDIAN_MOBILE_RE = /(?:\+91[\s-]?|0)?([6-9]\d{9})/g;
const INTL_PHONE_RE = /\+(\d[\d\s-]{8,14}\d)/g;

function extractPhone(text: string): string | undefined {
  const indianMatch = INDIAN_MOBILE_RE.exec(text);
  INDIAN_MOBILE_RE.lastIndex = 0;
  if (indianMatch) return indianMatch[0].replace(/[\s-]/g, "");

  const intlMatch = INTL_PHONE_RE.exec(text);
  INTL_PHONE_RE.lastIndex = 0;
  if (intlMatch) return "+" + intlMatch[1].replace(/[\s-]/g, "");

  return undefined;
}

function stripHtml(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+/g, " ")
    .trim();
}

export function parseEmailToLead(mail: ParsedMail): ParsedEmailLead {
  const result: ParsedEmailLead = {};

  const from = mail.from?.value?.[0];
  if (from) {
    result.rawFrom = mail.from?.text;
    result.email = from.address?.toLowerCase();
    result.name = from.name?.trim() || undefined;
  }

  result.subject = mail.subject?.trim();

  const htmlContent = typeof mail.html === "string" ? mail.html : "";
  const bodyText = mail.text?.trim() || stripHtml(htmlContent);
  result.message = bodyText.slice(0, 2000) || undefined;

  const searchText = [result.subject, bodyText].filter(Boolean).join(" ");
  result.phone = extractPhone(searchText);

  if (!result.name && bodyText) {
    const nameMatch =
      /^Name\s*:\s*(.+)$/im.exec(bodyText) ||
      /^Full\s*Name\s*:\s*(.+)$/im.exec(bodyText);
    if (nameMatch?.[1]) {
      result.name = nameMatch[1].trim().slice(0, 255);
    }
  }

  return result;
}
