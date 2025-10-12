import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Supabase configuration
const supabaseUrl = process.env.SUPABASE_URL || 'https://hjjbyuejfsiwyeswpwzb.supabase.co';
const supabaseKey = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhqamJ5dWVqZnNpd3llc3dwd3piIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAyMjM4NjcsImV4cCI6MjA3NTc5OTg2N30.lfyIYx3Mgai3K7vBNhVu8ZM0yWjxvtGFHS_1_POH6VA';

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase environment variables');
}

// Create Supabase client
const supabase: SupabaseClient = createClient(supabaseUrl, supabaseKey);

// Database utility class
export class Database {
  // Generic select method
  static async select<T>(
    table: string,
    columns: string = '*',
    filters: Record<string, any> = {},
    options: {
      orderBy?: string;
      ascending?: boolean;
      limit?: number;
      offset?: number;
    } = {}
  ): Promise<T[]> {
    try {
      let query = supabase.from(table).select(columns);

      // Apply filters
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          query = query.eq(key, value);
        }
      });

      // Apply ordering
      if (options.orderBy) {
        query = query.order(options.orderBy, { ascending: options.ascending ?? true });
      }

      // Apply pagination
      if (options.limit) {
        query = query.limit(options.limit);
      }
      if (options.offset) {
        query = query.range(options.offset, options.offset + (options.limit || 10) - 1);
      }

      const { data, error } = await query;

      if (error) {
        throw new Error(`Database select error: ${error.message}`);
      }

      return data || [];
    } catch (error) {
      console.error('Database select error:', error);
      throw error;
    }
  }

  // Generic insert method
  static async insert<T>(table: string, data: Record<string, any>): Promise<T> {
    try {
      const { data: result, error } = await supabase
        .from(table)
        .insert(data)
        .select()
        .single();

      if (error) {
        throw new Error(`Database insert error: ${error.message}`);
      }

      return result;
    } catch (error) {
      console.error('Database insert error:', error);
      throw error;
    }
  }

  // Generic update method
  static async update<T>(
    table: string,
    data: Record<string, any>,
    filters: Record<string, any>
  ): Promise<T> {
    try {
      let query = supabase.from(table).update(data);

      // Apply filters
      Object.entries(filters).forEach(([key, value]) => {
        query = query.eq(key, value);
      });

      const { data: result, error } = await query.select().single();

      if (error) {
        throw new Error(`Database update error: ${error.message}`);
      }

      return result;
    } catch (error) {
      console.error('Database update error:', error);
      throw error;
    }
  }

  // Generic delete method
  static async delete(table: string, filters: Record<string, any>): Promise<void> {
    try {
      let query = supabase.from(table).delete();

      // Apply filters
      Object.entries(filters).forEach(([key, value]) => {
        query = query.eq(key, value);
      });

      const { error } = await query;

      if (error) {
        throw new Error(`Database delete error: ${error.message}`);
      }
    } catch (error) {
      console.error('Database delete error:', error);
      throw error;
    }
  }

  // Count records
  static async count(table: string, filters: Record<string, any> = {}): Promise<number> {
    try {
      let query = supabase.from(table).select('*', { count: 'exact', head: true });

      // Apply filters
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          query = query.eq(key, value);
        }
      });

      const { count, error } = await query;

      if (error) {
        throw new Error(`Database count error: ${error.message}`);
      }

      return count || 0;
    } catch (error) {
      console.error('Database count error:', error);
      throw error;
    }
  }

  // Execute raw SQL query
  static async query<T>(sql: string, params: any[] = []): Promise<T[]> {
    try {
      const { data, error } = await supabase.rpc('execute_sql', {
        query: sql,
        params
      });

      if (error) {
        throw new Error(`Database query error: ${error.message}`);
      }

      return data || [];
    } catch (error) {
      console.error('Database query error:', error);
      throw error;
    }
  }
}

// Health check function
export const healthCheck = async (): Promise<{ status: string; timestamp: string }> => {
  try {
    // Simple query to test database connection
    const { data, error } = await supabase
      .from('users')
      .select('id')
      .limit(1);

    if (error) {
      throw new Error(`Database health check failed: ${error.message}`);
    }

    return {
      status: 'healthy',
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    console.error('Database health check error:', error);
    return {
      status: 'unhealthy',
      timestamp: new Date().toISOString()
    };
  }
};

export default supabase;