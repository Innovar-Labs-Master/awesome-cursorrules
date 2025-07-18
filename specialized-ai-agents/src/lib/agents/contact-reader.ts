import OpenAI from 'openai';
import { ContactData, AgentResponse } from '../types/workflow';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Agent 1: Contact Reader
 * Specialiteit: Raw contact form data omzetten naar gestructureerde contact informatie
 */
export class ContactReaderAgent {
  private agentName = 'contact-reader';

  async processContactForm(rawFormData: string): Promise<AgentResponse<ContactData>> {
    const startTime = Date.now();
    
    try {
      const prompt = `
Je bent een gespecialiseerde AI agent voor het verwerken van contact formulieren.
Je taak is ALLEEN het lezen en structureren van contact informatie.

INSTRUCTIES:
- Lees de ruwe contact form data
- Extraheer naam, bedrijf, email, telefoon, bericht
- Identificeer wat de klant wil (website, app, etc.)
- Geef gestructureerde output terug
- Doe GEEN offerte berekeningen
- Schrijf GEEN emails
- Focus alleen op data extractie en validatie

RUWE CONTACT DATA:
${rawFormData}

Geef een JSON response terug met deze structuur:
{
  "name": "string",
  "company": "string", 
  "email": "string",
  "phone": "string (optioneel)",
  "message": "string",
  "requirements": "string - wat wil de klant"
}
`;

      const completion = await openai.chat.completions.create({
        model: "gpt-4",
        messages: [
          {
            role: "system",
            content: "Je bent een gespecialiseerde contact form parser. Geef alleen geldige JSON terug."
          },
          {
            role: "user", 
            content: prompt
          }
        ],
        temperature: 0.1,
        max_tokens: 500
      });

      const responseText = completion.choices[0].message.content;
      if (!responseText) {
        throw new Error('Geen response van OpenAI');
      }

      // Parse JSON response
      const contactData: ContactData = JSON.parse(responseText);
      
      // Validatie
      if (!contactData.name || !contactData.email) {
        throw new Error('Naam en email zijn verplicht');
      }

      const processingTime = Date.now() - startTime;

      return {
        success: true,
        data: contactData,
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

  /**
   * Valideer contact data
   */
  validateContactData(data: ContactData): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    
    return !!(
      data.name?.trim() &&
      data.email?.trim() &&
      emailRegex.test(data.email) &&
      data.message?.trim()
    );
  }

  /**
   * Normaliseer contact data
   */
  normalizeContactData(data: ContactData): ContactData {
    return {
      name: data.name?.trim() || '',
      company: data.company?.trim() || '',
      email: data.email?.toLowerCase().trim() || '',
      phone: data.phone?.trim() || undefined,
      message: data.message?.trim() || '',
      requirements: data.requirements?.trim() || ''
    };
  }
}
