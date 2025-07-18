import OpenAI from 'openai';
import { ContactData, QuoteData, EmailData, AgentResponse } from '../types/workflow';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Agent 3: Email Sender  
 * Specialiteit: Professionele emails schrijven en versturen met offertes
 */
export class EmailSenderAgent {
  private agentName = 'email-sender';

  async composeAndSendEmail(
    contactData: ContactData, 
    quoteData: QuoteData
  ): Promise<AgentResponse<EmailData>> {
    const startTime = Date.now();
    
    try {
      // Stap 1: Compose email
      const emailContent = await this.composeEmail(contactData, quoteData);
      
      // Stap 2: Send email (placeholder)
      const emailResult = await this.sendEmail(emailContent);
      
      const processingTime = Date.now() - startTime;

      return {
        success: true,
        data: emailResult,
        processingTimeMs: processingTime
      };

    } catch (error) {
      const processingTime = Date.now() - startTime;
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Onbekende fout',
        processingTimeMs: processingTime
      };
    }
  }

  private async composeEmail(contactData: ContactData, quoteData: QuoteData): Promise<EmailData> {
    const prompt = `
Je bent een gespecialiseerde AI agent voor het schrijven van professionele emails.
Je taak is ALLEEN het schrijven van mooie, professionele emails met offertes.

INSTRUCTIES:
- Schrijf een professionele email in het Nederlands
- Gebruik een vriendelijke maar zakelijke toon
- Verwijs naar de offerte details
- Voeg een duidelijke call-to-action toe
- Doe GEEN contact verwerking
- Maak GEEN nieuwe offertes
- Focus alleen op email compositie

CONTACT GEGEVENS:
Naam: ${contactData.name}
Bedrijf: ${contactData.company}
Email: ${contactData.email}

OFFERTE DETAILS:
Bedrag: €${quoteData.amount}
Beschrijving: ${quoteData.description}
Geldig tot: ${quoteData.validUntil}

Geef een JSON response terug met deze structuur:
{
  "subject": "string - email onderwerp",
  "body": "string - email inhoud in HTML formaat"
}
`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: "Je bent een gespecialiseerde email writer. Schrijf professionele Nederlandse emails. Geef alleen geldige JSON terug."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.3,
      max_tokens: 1000
    });

    const responseText = completion.choices[0].message.content;
    if (!responseText) {
      throw new Error('Geen response van OpenAI');
    }

    const emailContent = JSON.parse(responseText);
    
    return {
      to: contactData.email,
      subject: emailContent.subject,
      body: emailContent.body
    };
  }

  private async sendEmail(emailData: EmailData): Promise<EmailData> {
    // Placeholder voor echte email verzending
    // In productie zou hier integratie met SendGrid, Mailgun, etc. komen
    
    // Simuleer email verzending
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const messageId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    return {
      ...emailData,
      sentAt: new Date().toISOString(),
      messageId: messageId
    };
  }

  /**
   * Valideer email data
   */
  validateEmailData(data: EmailData): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    
    return !!(
      data.to?.trim() &&
      emailRegex.test(data.to) &&
      data.subject?.trim() &&
      data.body?.trim()
    );
  }

  /**
   * Preview email (voor testing)
   */
  previewEmail(emailData: EmailData): string {
    return `
TO: ${emailData.to}
SUBJECT: ${emailData.subject}

${emailData.body}
    `.trim();
  }

  /**
   * Check email delivery status (placeholder)
   */
  async checkDeliveryStatus(messageId: string): Promise<'delivered' | 'pending' | 'failed'> {
    // Placeholder voor delivery status check
    return 'delivered';
  }
}
