import { NextResponse } from "next/server";

// GHL's public API does not expose smart list definitions.
// We return practical built-in filter categories instead.
export async function GET() {
  return NextResponse.json({
    smartLists: [
      {
        id: "all",
        name: "All Contacts",
        description: "Every contact in your account",
      },
      {
        id: "has-phone",
        name: "Has Phone Number",
        description: "Contacts with a phone number (SMS / WhatsApp)",
      },
      {
        id: "has-email",
        name: "Has Email",
        description: "Contacts with an email address",
      },
    ],
  });
}
