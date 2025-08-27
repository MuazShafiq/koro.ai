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

async function debugSubjects() {
  console.log('🔍 Debugging subjects and user relationships...');
  
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing Supabase environment variables');
    return;
  }
  
  try {
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Step 1: Authenticate
    console.log('🔐 Step 1: Authenticating...');
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: 'farjadimtiaz21@gmail.com',
      password: 'Farjad4718'
    });
    
    if (authError) {
      console.error('❌ Authentication failed:', authError.message);
      return;
    }
    
    console.log('✅ Authentication successful!');
    console.log('User ID:', authData.user.id);
    
    // Step 2: Check all subjects in database
    console.log('\n📚 Step 2: Checking all subjects...');
    const { data: allSubjects, error: allSubjectsError } = await supabase
      .from('subjects')
      .select('id, name, user_id');
    
    if (allSubjectsError) {
      console.error('❌ Failed to fetch all subjects:', allSubjectsError.message);
      return;
    }
    
    console.log('All subjects in database:');
    allSubjects.forEach(subject => {
      console.log(`  - ${subject.name} (${subject.id}) - User: ${subject.user_id}`);
    });
    
    // Step 3: Check subjects for this specific user
    console.log('\n👤 Step 3: Checking subjects for authenticated user...');
    const { data: userSubjects, error: userSubjectsError } = await supabase
      .from('subjects')
      .select('id, name, user_id')
      .eq('user_id', authData.user.id);
    
    if (userSubjectsError) {
      console.error('❌ Failed to fetch user subjects:', userSubjectsError.message);
      return;
    }
    
    console.log(`Subjects for user ${authData.user.id}:`);
    if (userSubjects.length === 0) {
      console.log('  ❌ No subjects found for this user!');
      console.log('  This explains why the start-session API fails.');
    } else {
      userSubjects.forEach(subject => {
        console.log(`  - ${subject.name} (${subject.id})`);
      });
    }
    
    // Step 4: Check topics for the first subject we tried
    const firstSubject = allSubjects[0];
    if (firstSubject) {
      console.log(`\n📖 Step 4: Checking topics for subject ${firstSubject.name}...`);
      const { data: topics, error: topicsError } = await supabase
        .from('topics')
        .select('id, name, subject_id')
        .eq('subject_id', firstSubject.id);
      
      if (topicsError) {
        console.error('❌ Failed to fetch topics:', topicsError.message);
      } else {
        console.log(`Topics for ${firstSubject.name}:`);
        topics.forEach(topic => {
          console.log(`  - ${topic.name} (${topic.id})`);
        });
      }
    }
    
    // Clean up: sign out
    await supabase.auth.signOut();
    console.log('\n🚪 Signed out successfully');
    
  } catch (error) {
    console.error('❌ Debug failed:', error.message);
  }
}

debugSubjects();