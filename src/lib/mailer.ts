import "server-only";
import nodemailer from "nodemailer";
import { db } from "./db";

export type Email = { to: string; subject: string; html: string; text: string; taskId?: string };

/** True when SMTP settings are present in .env. */
export function mailConfigured() {
  return Boolean(process.env.SMTP_HOST && process.env.MAIL_FROM);
}

export function appUrl() {
  return (process.env.APP_URL || "http://localhost:3200").replace(/\/$/, "");
}

let transport: nodemailer.Transporter | null = null;
function getTransport() {
  if (!transport) {
    const port = Number(process.env.SMTP_PORT || 587);
    transport = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port,
      secure: port === 465,
      auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined,
    });
  }
  return transport;
}

/**
 * Send an email and record it in the Outbox. Never throws: a mail problem must not
 * stop the task update that triggered it.
 */
export async function sendEmail(email: Email) {
  let status = "SENT";
  let error = "";
  if (!email.to) {
    status = "NO_ADDRESS";
    error = "This person has no email address in Contacts.";
  } else if (!mailConfigured()) {
    status = "NOT_CONFIGURED";
    error = "Email sending is not set up (SMTP settings in .env). Shown here instead.";
  } else {
    try {
      await getTransport().sendMail({ from: process.env.MAIL_FROM, to: email.to, subject: email.subject, html: email.html, text: email.text });
    } catch (e) {
      status = "FAILED";
      error = e instanceof Error ? e.message : String(e);
    }
  }
  try {
    await db.emailLog.create({ data: { ...email, taskId: email.taskId ?? null, status, error } });
  } catch (e) {
    console.error("Could not record email", e);
  }
  if (status !== "SENT") console.warn(`[email ${status}] to=${email.to || "(none)"} subject="${email.subject}" ${error}`);
  return status;
}
