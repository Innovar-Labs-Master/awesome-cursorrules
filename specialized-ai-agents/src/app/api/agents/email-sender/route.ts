import { NextRequest, NextResponse } from 'next/server';
import { EmailSenderAgent } from '@/lib/agents/email-sender';
import { supabase } from '@/lib/supabase/client';
import { ContactData, QuoteData } from '@/lib/types/workflow';

export async function POST(request: NextRequest) {
  try {
    const { contactData, quoteData, workflowId } = await request.json();

    if (!contactData || !quoteData) {
      return NextResponse.json(
        { error: 'contactData en quoteData zijn verplicht' },
        { status: 400 }
      );
    }

    // Initialiseer Agent 3
    const emailSender = new EmailSenderAgent();
    
    // Log start van verwerking
    const logStart = await supabase
      .from('agent_logs')
      .insert({
        workflow_id: workflowId,
        agent_name: 'email-sender',
        action: 'compose_and_send_email',
        input_data: { contactData, quoteData },
        status: 'processing'
      })
      .select()
      .single();

    // Compose en verstuur email
    const result = await emailSender.composeAndSendEmail(
      contactData as ContactData, 
      quoteData as QuoteData
    );

    if (result.success && result.data) {
      // Valideer email data
      const isValid = emailSender.validateEmailData(result.data);

      if (!isValid) {
        throw new Error('Email data validatie gefaald');
      }

      // Update workflow in database
      await supabase
        .from('workflows')
        .update({
          email_data: result.data,
          status: 'email_sent',
          current_agent: null, // Workflow voltooid
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
        workflowComplete: true
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
    console.error('Email Sender Agent Error:', error);
    
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
    agent: 'email-sender',
    status: 'active',
    capabilities: [
      'Compose professional Dutch emails',
      'Include quote details in email content',
      'Send emails with proper formatting',
      'Track email delivery status',
      'Generate email previews'
    ],
    version: '1.0.0'
  });
}
