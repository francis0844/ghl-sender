import type { Contact } from "./contact";

export type Channel = "SMS" | "Email" | "WhatsApp";

export interface SendRecord {
  id: string;
  contact: Contact;
  channel: Channel;
  message: string;
  sentAt: string; // ISO-8601
}
