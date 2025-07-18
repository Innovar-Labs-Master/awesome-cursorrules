import OpenAI from 'openai';
import { ContactData, QuoteData, QuoteItem, AgentResponse } from '../types/workflow';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Agent 2: Quote Maker
 * Specialiteit: Contact informatie omzetten naar professionele offertes
 */
export class QuoteMakerAgent {
  private agentName = 'quote-maker';

  async createQuote(contactData: ContactData): Promise<AgentResponse<QuoteData>> {
    const startTime = Date.now();
    
    try {
      const prompt = `
Je bent een gespecialiseerde AI agent voor het maken van offertes.
Je taak is ALLEEN het maken van professionele offertes op basis van contact informatie.

INSTRUCTIES:
- Analyseer de klant requirements
- Maak een realistische offerte
- Gebruik standaard prijzen voor web development
- Geef gedetailleerde breakdown
- Doe GEEN contact verwerking
- Verstuur GEEN emails
- Focus alleen op offerte creatie

CONTACT INFORMATIE:
Naam: ${contactData.name}
Bedrijf: ${contactData.company}
Requirements: ${contactData.requirements}
Bericht: ${contactData.message}

PRIJSRICHTLIJNEN:
- Eenvoudige website: €2.500 - €5.000
- Bedrijfswebsite: €5.000 - €10.000  
- E-commerce: €10.000 - €20.000
- Custom applicatie: €15.000 - €50.000

Geef een JSON response terug met deze structuur:
{
  "amount": number,
  "currency": "EUR",
  "description": "string - korte beschrijving",
  "items": [
    {
      "description": "string",
      "quantity": number,
      "unitPrice": number,
      "total": number
    }
  ],
  "validUntil": "YYYY-MM-DD",
  "terms": "string - betalingsvoorwaarden"
}
`;

      const completion = await openai.chat.completions.create({
        model: "gpt-4",
        messages: [
          {
            role: "system",
            content: "Je bent een gespecialiseerde offerte maker. Geef alleen geldige JSON terug met realistische prijzen."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.2,
        max_tokens: 800
      });

      const responseText = completion.choices[0].message.content;
      if (!responseText) {
        throw new Error('Geen response van OpenAI');
      }

      // Parse JSON response
      const quoteData: QuoteData = JSON.parse(responseText);
      
      // Validatie
      if (!quoteData.amount || quoteData.amount <= 0) {
        throw new Error('Offerte bedrag moet groter zijn dan 0');
      }

      if (!quoteData.items || quoteData.items.length === 0) {
        throw new Error('Offerte moet minimaal 1 item bevatten');
      }

      // Bereken totaal
      const calculatedTotal = quoteData.items.reduce((sum, item) => sum + item.total, 0);
      if (Math.abs(calculatedTotal - quoteData.amount) > 0.01) {
        quoteData.amount = calculatedTotal; // Corrigeer als nodig
      }

      const processingTime = Date.now() - startTime;

      return {
        success: true,
        data: quoteData,
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
   * Valideer quote data
   */
  validateQuoteData(data: QuoteData): boolean {
    if (!data.amount || data.amount <= 0) return false;
    if (!data.items || data.items.length === 0) return false;
    if (!data.description?.trim()) return false;
    
    // Valideer items
    for (const item of data.items) {
      if (!item.description?.trim()) return false;
      if (item.quantity <= 0) return false;
      if (item.unitPrice <= 0) return false;
      if (Math.abs(item.total - (item.quantity * item.unitPrice)) > 0.01) return false;
    }
    
    return true;
  }

  /**
   * Genereer offerte PDF (placeholder)
   */
  async generateQuotePDF(quoteData: QuoteData, contactData: ContactData): Promise<string> {
    // In een echte implementatie zou hier PDF generatie komen
    // Voor nu returnen we een placeholder URL
    return `https://example.com/quotes/${Date.now()}.pdf`;
  }
}
