-- Specialized AI Agents Database Schema
-- Workflow management voor gespecialiseerde AI agents

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Workflows table
CREATE TABLE workflows (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  status TEXT NOT NULL DEFAULT 'contact_received' CHECK (
    status IN (
      'contact_received',
      'contact_processed', 
      'quote_created',
      'email_sent',
      'completed',
      'error'
    )
  ),
  contact_data JSONB,
  quote_data JSONB,
  email_data JSONB,
  current_agent TEXT CHECK (
    current_agent IN ('contact-reader', 'quote-maker', 'email-sender') 
    OR current_agent IS NULL
  ),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Agent logs table
CREATE TABLE agent_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workflow_id UUID NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
  agent_name TEXT NOT NULL CHECK (
    agent_name IN ('contact-reader', 'quote-maker', 'email-sender')
  ),
  action TEXT NOT NULL,
  input_data JSONB,
  output_data JSONB,
  status TEXT NOT NULL CHECK (
    status IN ('processing', 'success', 'error')
  ),
  processing_time_ms INTEGER,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes voor performance
CREATE INDEX idx_workflows_status ON workflows(status);
CREATE INDEX idx_workflows_current_agent ON workflows(current_agent);
CREATE INDEX idx_workflows_created_at ON workflows(created_at DESC);
CREATE INDEX idx_agent_logs_workflow_id ON agent_logs(workflow_id);
CREATE INDEX idx_agent_logs_agent_name ON agent_logs(agent_name);
CREATE INDEX idx_agent_logs_status ON agent_logs(status);
CREATE INDEX idx_agent_logs_created_at ON agent_logs(created_at DESC);

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger voor auto-update van updated_at
CREATE TRIGGER update_workflows_updated_at 
  BEFORE UPDATE ON workflows 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- RLS (Row Level Security) policies
ALTER TABLE workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_logs ENABLE ROW LEVEL SECURITY;

-- Voor nu: allow all (in productie zou je hier echte auth policies maken)
CREATE POLICY "Allow all operations on workflows" ON workflows
  FOR ALL USING (true);

CREATE POLICY "Allow all operations on agent_logs" ON agent_logs
  FOR ALL USING (true);

-- Comments voor documentatie
COMMENT ON TABLE workflows IS 'Hoofdtabel voor workflow tracking tussen gespecialiseerde AI agents';
COMMENT ON TABLE agent_logs IS 'Audit log voor alle agent acties en resultaten';

COMMENT ON COLUMN workflows.status IS 'Huidige status van de workflow';
COMMENT ON COLUMN workflows.contact_data IS 'Gestructureerde contact informatie van Agent 1';
COMMENT ON COLUMN workflows.quote_data IS 'Offerte gegevens van Agent 2';
COMMENT ON COLUMN workflows.email_data IS 'Email informatie van Agent 3';
COMMENT ON COLUMN workflows.current_agent IS 'Welke agent momenteel aan de beurt is';

COMMENT ON COLUMN agent_logs.agent_name IS 'Naam van de agent die de actie uitvoerde';
COMMENT ON COLUMN agent_logs.action IS 'Beschrijving van de uitgevoerde actie';
COMMENT ON COLUMN agent_logs.processing_time_ms IS 'Verwerkingstijd in milliseconden';
COMMENT ON COLUMN agent_logs.status IS 'Resultaat van de agent actie';
