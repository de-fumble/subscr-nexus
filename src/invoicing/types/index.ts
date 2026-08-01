export interface InvoiceItem {
  description: string;
  quantity: number;
  unitPrice: number;
}

export interface InvoiceTemplate {
  name: string;
  items: InvoiceItem[];
}

export type CurrencyCode = 'NGN' | 'USD' | 'EUR' | 'GBP' | 'CAD' | 'KES' | 'GHS' | 'ZAR';

export type TemplateId = 'classic' | 'modern' | 'minimal' | 'obsidian' | 'forest';

export interface InvoiceTheme {
  id: TemplateId;
  name: string;
  description: string;
  primaryColor: string;
  accentColor: string;
  bgColor: string;
  textColor: string;
  mutedColor: string;
  headerBg: string;
  headerText: string;
  tableBg: string;
  borderColor: string;
  gradient?: string;
  badge?: string;
}

export type LogoPosition = 'left' | 'right';

export interface InvoiceCustomization {
  themeId: TemplateId;
  primaryColor: string;
  accentColor: string;
  showLogo: boolean;
  showBorder: boolean;
  companyTagline: string;
  footerText: string;
  paymentTerms: string;
  bankDetails: string;
  logoDataUrl?: string;
  logoPosition: LogoPosition;
}

export interface InvoiceData {
  invoiceNumber: string;
  issueDate: string;
  dueDate: string;
  billToName: string;
  billToEmail: string;
  billToAddress?: string;
  billToPhone?: string;
  senderName: string;
  senderEmail: string;
  senderAddress?: string;
  senderPhone?: string;
  items: InvoiceItem[];
  currency: CurrencyCode;
  notes?: string;
  taxRate?: number;
  discountRate?: number;
}
