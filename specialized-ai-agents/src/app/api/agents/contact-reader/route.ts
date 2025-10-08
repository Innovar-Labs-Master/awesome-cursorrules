import { NextRequest, NextResponse } from 'next/server';
import { ContactReaderAgent } from '@/lib/agents/contact-reader';
import { supabase } from '@/lib/supabase/client';

export async function POST(request: NextRequest) {
  try {
    const { rawFormData, workflowId } = await request.json();

    if (!rawFormData) {
      return NextResponse.json(
        { error: 'rawFormData is verplicht' },
        { status: 400 }
      );
    }

    // Initialiseer Agent 1
    const contactReader = new ContactReaderAgent();
    
    // Log start van verwerking
    const logStart = await supabase
      .from('agent_logs')
      .insert({
        workflow_id: workflowId,
        agent_name: 'contact-reader',
        action: 'process_contact_form',
        input_data: { rawFormData },
        status: 'processing'
      })
      .select()
      .single();

    // Verwerk contact form
    const result = await contactReader.processContactForm(rawFormData);

    if (result.success && result.data) {
      // Valideer en normaliseer data
      const normalizedData = contactReader.normalizeContactData(result.data);
      const isValid = contactReader.validateContactData(normalizedData);

      if (!isValid) {
        throw new Error('Contact data validatie gefaald');
      }

      // Update workflow in database
      await supabase
        .from('workflows')
        .update({
          contact_data: normalizedData,
          status: 'contact_processed',
          current_agent: 'quote-maker',
          updated_at: new Date().toISOString()
        })
        .eq('id', workflowId);

      // Log success
      await supabase
        .from('agent_logs')
        .update({
          output_data: normalizedData,
          status: 'success',
          processing_time_ms: result.processingTimeMs
        })
        .eq('id', logStart.data.id);

      return NextResponse.json({
        success: true,
        data: normalizedData,
        processingTimeMs: result.processingTimeMs,
        nextAgent: 'quote-maker'
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
    console.error('Contact Reader Agent Error:', error);
    
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
    agent: 'contact-reader',
    status: 'active',
    capabilities: [
      'Parse raw contact form data',
      'Extract structured contact information', 
      'Validate email addresses and required fields',
      'Normalize contact data format'
    ],
    version: '1.0.0'
  });
}
