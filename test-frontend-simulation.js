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

async function testFrontendSimulation() {
  console.log('🧪 Testing frontend authentication simulation...');
  
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing Supabase environment variables');
    return;
  }
  
  try {
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Step 1: Authenticate
    console.log('🔐 Step 1: Authenticating with provided credentials...');
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
    console.log('Access Token:', authData.session.access_token.substring(0, 20) + '...');
    
    // Step 2: Get user's subjects
    console.log('\n📚 Step 2: Fetching user subjects...');
    const { data: subjects, error: subjectsError } = await supabase
      .from('subjects')
      .select('id, name')
      .eq('user_id', authData.user.id);
    
    if (subjectsError || !subjects || subjects.length === 0) {
      console.error('❌ Failed to fetch user subjects:', subjectsError?.message || 'No subjects found for this user');
      return;
    }
    
    const subject = subjects[0];
    console.log(`✅ Found subject: ${subject.name} (${subject.id})`);
    
    // Step 3: Get topics for this subject
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
    console.log(`✅ Found topic: ${topic.name} (${topic.id})`);
    
    // Step 4: Test with proper cookie format
    console.log('\n🚀 Step 4: Testing session start with proper authentication...');
    
    // Format cookies properly for Next.js
    const cookieString = [
      `sb-${supabaseUrl.split('//')[1].split('.')[0]}-auth-token=${JSON.stringify({
        access_token: authData.session.access_token,
        refresh_token: authData.session.refresh_token,
        expires_at: authData.session.expires_at,
        token_type: authData.session.token_type,
        user: authData.user
      })}`,
      `sb-${supabaseUrl.split('//')[1].split('.')[0]}-auth-token-code-verifier=`,
    ].join('; ');
    
    console.log('Cookie format prepared...');
    
    const sessionResponse = await fetch('http://localhost:3000/api/tutor/start-session', {
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
    
    console.log('Response status:', sessionResponse.status);
    
    if (!sessionResponse.ok) {
      const errorText = await sessionResponse.text();
      console.error('❌ Session start failed:', sessionResponse.status, errorText);
      
      // Try alternative approach - test with the test user ID that the API supports
      console.log('\n🔄 Trying with test user approach...');
      const testResponse = await fetch('http://localhost:3000/api/tutor/start-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          subjectId: 'test-subject-id',
          topicId: null
        })
      });
      
      if (testResponse.ok) {
        const testData = await testResponse.json();
        console.log('✅ Test session created successfully!');
        console.log('Test Session ID:', testData.sessionId);
        
        // Test the session endpoint with test session
        console.log('\n🔍 Testing session endpoint with test session...');
        const testSessionResponse = await fetch(`http://localhost:3000/api/tutor/session/${testData.sessionId}`);
        
        if (testSessionResponse.ok) {
          const testSessionData = await testSessionResponse.json();
          console.log('✅ Test session endpoint working!');
          console.log('Assessment questions:', testSessionData.assessmentQuestions?.length || 0);
          console.log('Current phase:', testSessionData.currentPhase || 'planning');
        } else {
          console.error('❌ Test session endpoint failed:', testSessionResponse.status);
        }
      } else {
        const testErrorText = await testResponse.text();
        console.error('❌ Test session also failed:', testResponse.status, testErrorText);
      }
      
      return;
    }
    
    const sessionData = await sessionResponse.json();
    console.log('✅ Session started successfully!');
    console.log('Session ID:', sessionData.sessionId);
    console.log('Subject:', sessionData.subject.name);
    console.log('Topic:', sessionData.topic?.name || 'General');
    
    // Step 5: Test session endpoint
    console.log('\n🔍 Step 5: Testing session endpoint...');
    const sessionInfoResponse = await fetch(`http://localhost:3000/api/tutor/session/${sessionData.sessionId}`, {
      headers: {
        'Cookie': cookieString
      }
    });
    
    if (!sessionInfoResponse.ok) {
      console.error('❌ Session endpoint failed:', sessionInfoResponse.status);
      return;
    }
    
    const sessionInfo = await sessionInfoResponse.json();
    console.log('✅ Session endpoint working!');
    console.log('Assessment questions:', sessionInfo.assessmentQuestions?.length || 0);
    console.log('Current phase:', sessionInfo.currentPhase || 'planning');
    console.log('Welcome audio URL:', sessionInfo.welcomeAudioUrl ? 'Available' : 'Not available');
    
    // Clean up: sign out
    await supabase.auth.signOut();
    console.log('\n🚪 Signed out successfully');
    
    console.log('\n🎯 Summary:');
    console.log('- Authentication: ✅ Working');
    console.log('- Subject/Topic fetching: ✅ Working');
    console.log('- Session creation: ✅ Working');
    console.log('- Session endpoint: ✅ Working');
    console.log('- Assessment questions:', sessionInfo.assessmentQuestions?.length > 0 ? '✅ Available' : '❌ Missing');
    
    if (sessionInfo.assessmentQuestions?.length === 0) {
      console.log('\n🔍 Root cause identified: No assessment questions in session data!');
      console.log('This explains why the assessment phase doesn\'t start in the frontend.');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Stack trace:', error.stack);
  }
}

testFrontendSimulation();