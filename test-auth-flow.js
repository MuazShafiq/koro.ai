const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load environment variables from .env.local
function loadEnvFile() {
  try {
    const envPath = path.join(__dirname, '.env.local');
    const envContent = fs.readFileSync(envPath, 'utf8');
    const lines = envContent.split('\n');
    
    lines.forEach(line => {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        const [key, ...valueParts] = trimmed.split('=');
        if (key && valueParts.length > 0) {
          process.env[key] = valueParts.join('=');
        }
      }
    });
  } catch (error) {
    console.warn('Could not load .env.local file:', error.message);
  }
}

loadEnvFile();

// Retry utility function (similar to what we implemented)
async function withRetry(operation, maxRetries = 3, baseDelay = 1000) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      console.log(`Attempt ${attempt} failed:`, error.message);
      
      if (attempt === maxRetries) {
        throw error;
      }
      
      const delay = baseDelay * Math.pow(2, attempt - 1);
      console.log(`Retrying in ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
}

async function testAuthenticationFlow() {
  console.log('Testing authentication flow similar to start-session API...');
  
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing required environment variables');
    return;
  }
  
  try {
    // Create Supabase client (server-side style)
    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });
    
    console.log('✅ Supabase client created with server-side config');
    
    // Test 1: Authentication check with retry (simulating API route)
    console.log('\n🔐 Testing authentication with retry logic...');
    const authResult = await withRetry(async () => {
      const { data, error } = await supabase.auth.getUser();
      if (error) {
        console.log('Auth error:', error.message, 'Status:', error.status);
        throw error;
      }
      return data;
    });
    
    console.log('Auth result:', authResult.user ? 'User authenticated' : 'No user (anonymous)');
    
    // Test 2: Database operations with retry
    console.log('\n📊 Testing database operations with retry...');
    
    // Test subjects table
    const subjectsResult = await withRetry(async () => {
      const { data, error } = await supabase
        .from('subjects')
        .select('*')
        .limit(3);
      
      if (error) {
        console.log('Subjects query error:', error.message);
        throw error;
      }
      return data;
    });
    
    console.log('✅ Subjects query successful:', subjectsResult.length, 'records');
    
    // Test topics table
    const topicsResult = await withRetry(async () => {
      const { data, error } = await supabase
        .from('topics')
        .select('*')
        .limit(3);
      
      if (error) {
        console.log('Topics query error:', error.message);
        throw error;
      }
      return data;
    });
    
    console.log('✅ Topics query successful:', topicsResult.length, 'records');
    
    // Test lesson_sessions table structure
    console.log('\n📝 Testing lesson_sessions table...');
    const sessionsResult = await withRetry(async () => {
      const { data, error } = await supabase
        .from('lesson_sessions')
        .select('*')
        .limit(1);
      
      if (error) {
        console.log('Sessions query error:', error.message);
        throw error;
      }
      return data;
    });
    
    console.log('✅ Lesson sessions query successful:', sessionsResult.length, 'records');
    
    console.log('\n🎉 All tests completed successfully!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    console.error('Error details:', {
      name: error.name,
      message: error.message,
      status: error.status,
      statusCode: error.statusCode
    });
  }
}

testAuthenticationFlow().catch(console.error);