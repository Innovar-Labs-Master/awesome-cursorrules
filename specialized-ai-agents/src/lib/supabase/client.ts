import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type Database = {
  public: {
    Tables: {
      workflows: {
        Row: {
          id: string;
          status: string;
          contact_data: any;
          quote_data: any;
          email_data: any;
          current_agent: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          status?: string;
          contact_data?: any;
          quote_data?: any;
          email_data?: any;
          current_agent?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          status?: string;
          contact_data?: any;
          quote_data?: any;
          email_data?: any;
          current_agent?: string | null;
          updated_at?: string;
        };
      };
      agent_logs: {
        Row: {
          id: string;
          workflow_id: string;
          agent_name: string;
          action: string;
          input_data: any;
          output_data: any;
          status: string;
          processing_time_ms: number | null;
          error_message: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          workflow_id: string;
          agent_name: string;
          action: string;
          input_data?: any;
          output_data?: any;
          status: string;
          processing_time_ms?: number | null;
          error_message?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          workflow_id?: string;
          agent_name?: string;
          action?: string;
          input_data?: any;
          output_data?: any;
          status?: string;
          processing_time_ms?: number | null;
          error_message?: string | null;
        };
      };
    };
  };
};
