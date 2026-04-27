export interface Contact {
  contactId: string;
  name: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  email: string | null;
  tags: string[];
  dateAdded: string | null;
  hasPhone: boolean;
  hasEmail: boolean;
}
