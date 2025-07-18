export type WorkflowStatus = 
  | 'contact_received'
  | 'contact_processed' 
  | 'quote_created'
  | 'email_sent'
  | 'completed'
  | 'error';

export type AgentName = 
  | 'contact-reader'
  | 'quote-maker' 
  | 'email-sender';

export interface ContactData {
  name: string;
  company: string;
  email: string;
  phone?: string;
  message: string;
  requirements?: string;
}

export interface QuoteData {
  amount: number;
  currency: string;
  description: string;
  items: QuoteItem[];
  validUntil: string;
  terms?: string;
}

export interface QuoteItem {
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface EmailData {
  to: string;
  subject: string;
  body: string;
  sentAt?: string;
  messageId?: string;
}

export interface Workflow {
  id: string;
  status: WorkflowStatus;
  contactData?: ContactData;
  quoteData?: QuoteData;
  emailData?: EmailData;
  currentAgent?: AgentName;
  createdAt: string;
  updatedAt: string;
}

export interface AgentLog {
  id: string;
  workflowId: string;
  agentName: AgentName;
  action: string;
  inputData: any;
  outputData: any;
  status: 'success' | 'error' | 'processing';
  processingTimeMs?: number;
  errorMessage?: string;
  createdAt: string;
}

export interface AgentResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  processingTimeMs: number;
}
