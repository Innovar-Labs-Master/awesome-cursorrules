import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';

/**
 * Workflow Orchestrator
 * Coördineert de samenwerking tussen de 3 gespecialiseerde agents
 */

// POST: Start nieuwe workflow
export async function POST(request: NextRequest) {
  try {
    const { rawFormData } = await request.json();

    if (!rawFormData) {
      return NextResponse.json(
        { error: 'rawFormData is verplicht' },
        { status: 400 }
      );
    }

    // Maak nieuwe workflow
    const { data: workflow, error } = await supabase
      .from('workflows')
      .insert({
        status: 'contact_received',
        current_agent: 'contact-reader',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Database error: ${error.message}`);
    }

    // Start Agent 1: Contact Reader
    const contactReaderResponse = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/agents/contact-reader`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        rawFormData,
        workflowId: workflow.id
      })
    });

    const contactResult = await contactReaderResponse.json();

    if (!contactResult.success) {
      // Update workflow status naar error
      await supabase
        .from('workflows')
        .update({
          status: 'error',
          updated_at: new Date().toISOString()
        })
        .eq('id', workflow.id);

      return NextResponse.json(
        { 
          success: false, 
          error: 'Contact Reader Agent gefaald',
          details: contactResult.error
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      workflowId: workflow.id,
      status: 'contact_processed',
      data: {
        contactData: contactResult.data,
        processingTimeMs: contactResult.processingTimeMs
      },
      nextStep: 'quote-maker'
    });

  } catch (error) {
    console.error('Workflow Start Error:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Onbekende fout' 
      },
      { status: 500 }
    );
  }
}

// GET: Haal workflow status op
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const workflowId = searchParams.get('id');

    if (!workflowId) {
      // Haal alle workflows op
      const { data: workflows, error } = await supabase
        .from('workflows')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) {
        throw new Error(`Database error: ${error.message}`);
      }

      return NextResponse.json({
        success: true,
        workflows: workflows || []
      });
    }

    // Haal specifieke workflow op
    const { data: workflow, error: workflowError } = await supabase
      .from('workflows')
      .select('*')
      .eq('id', workflowId)
      .single();

    if (workflowError) {
      throw new Error(`Workflow niet gevonden: ${workflowError.message}`);
    }

    // Haal agent logs op
    const { data: logs, error: logsError } = await supabase
      .from('agent_logs')
      .select('*')
      .eq('workflow_id', workflowId)
      .order('created_at', { ascending: true });

    if (logsError) {
      console.warn('Kon agent logs niet ophalen:', logsError.message);
    }

    return NextResponse.json({
      success: true,
      workflow,
      logs: logs || []
    });

  } catch (error) {
    console.error('Workflow Get Error:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Onbekende fout' 
      },
      { status: 500 }
    );
  }
}

// PUT: Continue workflow naar volgende agent
export async function PUT(request: NextRequest) {
  try {
    const { workflowId, action } = await request.json();

    if (!workflowId || !action) {
      return NextResponse.json(
        { error: 'workflowId en action zijn verplicht' },
        { status: 400 }
      );
    }

    // Haal huidige workflow op
    const { data: workflow, error } = await supabase
      .from('workflows')
      .select('*')
      .eq('id', workflowId)
      .single();

    if (error) {
      throw new Error(`Workflow niet gevonden: ${error.message}`);
    }

    let result;

    switch (action) {
      case 'create-quote':
        if (!workflow.contact_data) {
          throw new Error('Contact data ontbreekt');
        }

        // Start Agent 2: Quote Maker
        const quoteResponse = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/agents/quote-maker`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            contactData: workflow.contact_data,
            workflowId: workflow.id
          })
        });

        result = await quoteResponse.json();
        break;

      case 'send-email':
        if (!workflow.contact_data || !workflow.quote_data) {
          throw new Error('Contact data en quote data zijn verplicht');
        }

        // Start Agent 3: Email Sender
        const emailResponse = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/agents/email-sender`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            contactData: workflow.contact_data,
            quoteData: workflow.quote_data,
            workflowId: workflow.id
          })
        });

        result = await emailResponse.json();
        break;

      default:
        throw new Error(`Onbekende actie: ${action}`);
    }

    return NextResponse.json(result);

  } catch (error) {
    console.error('Workflow Continue Error:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Onbekende fout' 
      },
      { status: 500 }
    );
  }
}
