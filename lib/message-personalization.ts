import type { Contact } from "@/types/contact";

export interface Variable {
  label: string;
  token: string;
}

export function getAvailableVariables(): Variable[] {
  return [
    { label: "First Name", token: "{{firstName}}" },
    { label: "Last Name", token: "{{lastName}}" },
    { label: "Full Name", token: "{{name}}" },
    { label: "Email", token: "{{email}}" },
    { label: "Phone", token: "{{phone}}" },
  ];
}

export function renderMessageTemplate(template: string, contact: Contact): string {
  return template
    .replace(/\{\{firstName\}\}/g, contact.firstName || "")
    .replace(/\{\{lastName\}\}/g, contact.lastName || "")
    .replace(/\{\{name\}\}/g, contact.name || "")
    .replace(/\{\{email\}\}/g, contact.email || "")
    .replace(/\{\{phone\}\}/g, contact.phone || "");
}

export function containsVariables(message: string): boolean {
  return /\{\{[a-zA-Z]+\}\}/.test(message);
}
