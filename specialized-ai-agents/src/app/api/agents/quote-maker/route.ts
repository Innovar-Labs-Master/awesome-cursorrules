import { NextRequest, NextResponse } from 'next/server';
import { QuoteMakerAgent } from '@/lib/agents/quote-maker';
import { supabase } from '@/lib/supabase/client';
import { ContactData } from '@/lib/types/workflow';

export async function POST(request: NextRequest) {
  try {
    const { contactData, workflowId } = await request.json();

    if (!contactData) {
      return NextResponse.json(
        { error: 'contactData is verplicht' },
        { status: 400 }
      );
    }

    // Initialiseer Agent 2
    const quoteMaker = new QuoteMakerAgent();
    
    // Log start van verwerking
    const logStart = await supabase
      .from('agent_logs')
      .insert({
        workflow_id: workflowId,
        agent_name: 'quote-maker',
        action: 'create_quote',
        input_data: { contactData },
        status: 'processing'
      })
      .select()
      .single();

    // Maak offerte
    const result = await quoteMaker.createQuote(contactData as ContactData);

    if (result.success && result.data) {
      // Valideer quote data
      const isValid = quoteMaker.validateQuoteData(result.data);

      if (!isValid) {
        throw new Error('Quote data validatie gefaald');
      }

      // Update workflow in database
      await supabase
        .from('workflows')
        .update({
          quote_data: result.data,
          status: 'quote_created',
          current_agent: 'email-sender',
          updated_at: new Date().toISOString()
        })
        .eq('id', workflowId);

      // Log success
      await supabase
        .from('agent_logs')
        .update({
          output_data: result.data,
          status: 'success',
          processing_time_ms: result.processingTimeMs
        })
        .eq('id', logStart.data.id);

      return NextResponse.json({
        success: true,
        data: result.data,
        processingTimeMs: result.processingTimeMs,
        nextAgent: 'email-sender'
      });

    } else {
      // Log error
      await supabase
        .from('agent_logs')
        .update({
          status: 'error',
          error_message: result.error,
          processing_time_ms: result.processingTimeMs
        })
        .eq('id', logStart.data.id);

      return NextResponse.json(
        { 
          success: false, 
          error: result.error,
          processingTimeMs: result.processingTimeMs
        },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('Quote Maker Agent Error:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Onbekende fout' 
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    agent: 'quote-maker',
    status: 'active',
    capabilities: [
      'Analyze customer requirements',
      'Generate professional quotes',
      'Calculate pricing based on project scope',
      'Create detailed quote breakdowns',
      'Validate quote data accuracy'
    ],
    version: '1.0.0'
  });
}
