import { createClient, SupabaseClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

// Supabase configuration
const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY!;

// Create Supabase clients
export const supabase: SupabaseClient = createClient(supabaseUrl, supabaseAnonKey);
export const supabaseAdmin: SupabaseClient = createClient(supabaseUrl, supabaseServiceKey);

// Health check function
export const healthCheck = async (): Promise<{
  status: 'healthy' | 'unhealthy';
  timestamp: string;
  error?: string;
}> => {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('count')
      .limit(1);
    
    if (error) throw error;
    
    return { 
      status: 'healthy', 
      timestamp: new Date().toISOString() 
    };
  } catch (error) {
    return { 
      status: 'unhealthy', 
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString() 
    };
  }
};

// Database helper functions using Supabase
export class Database {
  // Generic select function
  static async select<T>(
    table: string, 
    columns: string = '*', 
    filters?: Record<string, any>
  ): Promise<T[]> {
    let query = supabaseAdmin.from(table).select(columns);
    
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        query = query.eq(key, value);
      });
    }
    
    const { data, error } = await query;
    
    if (error) throw error;
    return data as T[];
  }

  // Generic insert function
  static async insert<T>(table: string, data: any): Promise<T> {
    const { data: result, error } = await supabaseAdmin
      .from(table)
      .insert(data)
      .select()
      .single();
    
    if (error) throw error;
    return result as T;
  }

  // Generic update function
  static async update<T>(
    table: string, 
    id: string, 
    data: any
  ): Promise<T> {
    const { data: result, error } = await supabaseAdmin
      .from(table)
      .update(data)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return result as T;
  }

  // Generic delete function
  static async delete(table: string, id: string): Promise<void> {
    const { error } = await supabaseAdmin
      .from(table)
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  }

  // Execute raw SQL (for complex queries)
  static async query<T>(sql: string, params?: any[]): Promise<T[]> {
    const { data, error } = await supabaseAdmin.rpc('execute_sql', {
      query: sql,
      params: params || []
    });
    
    if (error) throw error;
    return data as T[];
  }
}

export default supabase;