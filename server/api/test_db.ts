import { supabase, Database } from './src/database/supabase';
import dotenv from 'dotenv';

dotenv.config();

// Test Supabase connection
async function testConnection(): Promise<void> {
  try {
    console.log('🔄 Testing Supabase connection...');
    
    // Test basic connection
    const { data, error } = await supabase
      .from('users')
      .select('count')
      .limit(1);
    
    if (error) {
      throw error;
    }
    
    console.log('✅ Supabase connected successfully!');
    
    // Test sample data
    const users = await Database.select('users', 'id, email, first_name, last_name');
    const properties = await Database.select('properties', 'id, title, city');
    
    console.log('👥 Users in database:', users.length);
    console.log('🏠 Properties in database:', properties.length);
    
    if (users.length > 0) {
      console.log('📋 Sample users:');
      users.forEach(user => {
        console.log(`  - ${user.first_name} ${user.last_name} (${user.email})`);
      });
    }
    
    if (properties.length > 0) {
      console.log('📋 Sample properties:');
      properties.forEach(property => {
        console.log(`  - ${property.title} in ${property.city}`);
      });
    }
    
    console.log('✅ Supabase test completed successfully!');
  } catch (error) {
    console.error('❌ Supabase connection failed:', error instanceof Error ? error.message : 'Unknown error');
    process.exit(1);
  }
}

testConnection();