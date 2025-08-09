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

async function createTestUser() {
  console.log('Creating test user for authentication testing...');
  
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing required environment variables');
    return;
  }
  
  const supabase = createClient(supabaseUrl, supabaseKey);
  
  // Test user credentials
  const testEmail = 'test@koro.ai';
  const testPassword = 'testpass123';
  
  try {
    console.log('Attempting to sign up test user...');
    
    const { data, error } = await supabase.auth.signUp({
      email: testEmail,
      password: testPassword,
      options: {
        data: {
          full_name: 'Test User',
          grade_level: '12',
          learning_goals: 'Testing the AI tutor functionality'
        }
      }
    });
    
    if (error) {
      if (error.message.includes('already registered')) {
        console.log('✅ Test user already exists, attempting to sign in...');
        
        const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
          email: testEmail,
          password: testPassword
        });
        
        if (signInError) {
          console.error('❌ Sign in failed:', signInError.message);
          return;
        }
        
        console.log('✅ Successfully signed in test user');
        console.log('User ID:', signInData.user?.id);
        console.log('Email:', signInData.user?.email);
        
      } else {
        console.error('❌ Sign up failed:', error.message);
        return;
      }
    } else {
      console.log('✅ Test user created successfully');
      console.log('User ID:', data.user?.id);
      console.log('Email:', data.user?.email);
      console.log('⚠️  Please check email for confirmation if required');
    }
    
    console.log('\n📝 Test user credentials:');
    console.log('Email:', testEmail);
    console.log('Password:', testPassword);
    console.log('\nYou can now use these credentials to test the authentication flow.');
    
  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

createTestUser().catch(console.error);