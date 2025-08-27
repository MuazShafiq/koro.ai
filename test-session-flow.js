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

async function testSessionFlow() {
  console.log('🧪 Testing complete session flow...');
  
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
    
    // Step 2: Get subjects that belong to this user
    console.log('\n📚 Step 2: Fetching user subjects...');
    const { data: subjects, error: subjectsError } = await supabase
      .from('subjects')
      .select('id, name')
      .eq('user_id', authData.user.id)
      .limit(1);
    
    if (subjectsError || !subjects || subjects.length === 0) {
      console.error('❌ Failed to fetch user subjects:', subjectsError?.message || 'No subjects found for this user');
      return;
    }
    
    const subject = subjects[0];
    console.log('✅ Found subject:', subject.name, '(', subject.id, ')');
    
    // Step 3: Get topics for the subject
    console.log('\n📖 Step 3: Fetching topics...');
    const { data: topics, error: topicsError } = await supabase
      .from('topics')
      .select('id, name')
      .eq('subject_id', subject.id)
      .limit(1);
    
    if (topicsError || !topics || topics.length === 0) {
      console.error('❌ Failed to fetch topics:', topicsError?.message || 'No topics found');
      return;
    }
    
    const topic = topics[0];
    console.log('✅ Found topic:', topic.name, '(', topic.id, ')');
    
    // Step 4: Create session cookies for API call
    const session = authData.session;
    const accessToken = session.access_token;
    const refreshToken = session.refresh_token;
    
    // Create cookie string similar to browser
    const cookieString = [
      `sb-${supabaseUrl.split('//')[1].split('.')[0]}-auth-token=${JSON.stringify({
        access_token: accessToken,
        refresh_token: refreshToken,
        expires_at: session.expires_at,
        token_type: session.token_type,
        user: session.user
      })}`,
      `sb-${supabaseUrl.split('//')[1].split('.')[0]}-auth-token.0=${accessToken}`,
      `sb-${supabaseUrl.split('//')[1].split('.')[0]}-auth-token.1=${refreshToken}`
    ].join('; ');
    
    // Step 5: Call start-session API
    console.log('\n🚀 Step 4: Starting session...');
    const response = await fetch('http://localhost:3000/api/tutor/start-session', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': cookieString
      },
      body: JSON.stringify({
        subjectId: subject.id,
        topicId: topic.id
      })
    });
    
    const responseText = await response.text();
    
    if (response.ok) {
      console.log('✅ Session started successfully!');
      const sessionData = JSON.parse(responseText);
      console.log('Session ID:', sessionData.sessionId);
      console.log('Welcome message:', sessionData.welcomeMessage?.substring(0, 100) + '...');
      
      // Step 6: Test session endpoint
      console.log('\n🔍 Step 5: Testing session endpoint...');
      const sessionResponse = await fetch(`http://localhost:3000/api/tutor/session/${sessionData.sessionId}`, {
        headers: {
          'Cookie': cookieString
        }
      });
      
      if (sessionResponse.ok) {
        const sessionDetails = await sessionResponse.json();
        console.log('✅ Session endpoint working!');
        console.log('Assessment questions:', sessionDetails.assessmentQuestions?.length || 0);
        console.log('Session status:', sessionDetails.sessionData?.status);
      } else {
        console.error('❌ Session endpoint failed:', sessionResponse.status);
        console.log('Response:', await sessionResponse.text());
      }
      
    } else {
      console.error('❌ Session start failed:', response.status);
      console.log('Response:', responseText);
    }
    
    // Clean up: sign out
    await supabase.auth.signOut();
    console.log('\n🚪 Signed out successfully');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testSessionFlow();