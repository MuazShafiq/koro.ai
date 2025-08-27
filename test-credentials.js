const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load environment variables from .env.local
function loadEnvFile() {
  const envPath = path.join(__dirname, '.env.local');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    const lines = envContent.split('\n');
    
    lines.forEach(line => {
      const trimmedLine = line.trim();
      if (trimmedLine && !trimmedLine.startsWith('#')) {
        const [key, ...valueParts] = trimmedLine.split('=');
        if (key && valueParts.length > 0) {
          const value = valueParts.join('=').replace(/^["']|["']$/g, '');
          process.env[key] = value;
        }
      }
    });
  }
}

loadEnvFile();

async function testCredentials() {
  console.log('Testing credentials: farjadimtiaz21@gmail.com');
  
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing Supabase environment variables');
    console.log('URL:', supabaseUrl ? 'Present' : 'Missing');
    console.log('Key:', supabaseKey ? 'Present' : 'Missing');
    return;
  }
  
  try {
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    console.log('🔐 Attempting to sign in...');
    const { data, error } = await supabase.auth.signInWithPassword({
      email: 'farjadimtiaz21@gmail.com',
      password: 'Farjad4718'
    });
    
    if (error) {
      console.error('❌ Authentication failed:', error.message);
      return;
    }
    
    if (data.session) {
      console.log('✅ Authentication successful!');
      console.log('User ID:', data.user.id);
      console.log('Email:', data.user.email);
      
      // Test fetching user data
      console.log('\n📊 Testing data access...');
      const { data: subjects, error: subjectsError } = await supabase
        .from('subjects')
        .select('id, name')
        .limit(3);
      
      if (subjectsError) {
        console.error('❌ Failed to fetch subjects:', subjectsError.message);
      } else {
        console.log('✅ Successfully fetched subjects:', subjects.length);
        subjects.forEach(subject => {
          console.log(`  - ${subject.name} (${subject.id})`);
        });
      }
      
      // Sign out
      await supabase.auth.signOut();
      console.log('\n🚪 Signed out successfully');
    } else {
      console.error('❌ No session returned');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testCredentials();