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

async function testAuthenticatedSession() {
  console.log('Testing authenticated AI tutor session...');
  
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing required environment variables');
    return;
  }
  
  const supabase = createClient(supabaseUrl, supabaseKey);
  
  try {
    // Step 1: Sign in with test user
    console.log('\n🔐 Step 1: Signing in with test user...');
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: 'test@koro.ai',
      password: 'testpass123'
    });
    
    if (authError) {
      console.error('❌ Authentication failed:', authError.message);
      return;
    }
    
    console.log('✅ Successfully authenticated');
    console.log('User ID:', authData.user?.id);
    console.log('Session:', authData.session ? 'Active' : 'None');
    
    // Step 2: Get available subjects and topics
    console.log('\n📚 Step 2: Fetching subjects and topics...');
    const { data: subjects, error: subjectsError } = await supabase
      .from('subjects')
      .select('id, name')
      .limit(1);
    
    if (subjectsError) {
      console.error('❌ Failed to fetch subjects:', subjectsError.message);
      return;
    }
    
    if (!subjects || subjects.length === 0) {
      console.error('❌ No subjects found');
      return;
    }
    
    const subject = subjects[0];
    console.log('✅ Found subject:', subject.name, '(ID:', subject.id + ')');
    
    const { data: topics, error: topicsError } = await supabase
      .from('topics')
      .select('id, name')
      .eq('subject_id', subject.id)
      .limit(1);
    
    if (topicsError) {
      console.error('❌ Failed to fetch topics:', topicsError.message);
      return;
    }
    
    if (!topics || topics.length === 0) {
      console.error('❌ No topics found for subject');
      return;
    }
    
    const topic = topics[0];
    console.log('✅ Found topic:', topic.name, '(ID:', topic.id + ')');
    
    // Step 3: Test the start-session API endpoint with authentication
    console.log('\n🚀 Step 3: Testing start-session API with authentication...');
    
    const sessionPayload = {
      subjectId: subject.id,
      topicId: topic.id
    };
    
    console.log('Request payload:', sessionPayload);
    
    // Get the session token for API request
    const session = authData.session;
    if (!session) {
      console.error('❌ No session token available');
      return;
    }
    
    const response = await fetch('http://localhost:3000/api/tutor/start-session', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`
      },
      body: JSON.stringify(sessionPayload)
    });
    
    console.log('Response status:', response.status);
    console.log('Response headers:', Object.fromEntries(response.headers.entries()));
    
    const responseText = await response.text();
    console.log('Response body:', responseText);
    
    if (response.ok) {
      try {
        const responseData = JSON.parse(responseText);
        console.log('\n✅ Session started successfully!');
        console.log('Session ID:', responseData.sessionId);
        console.log('Lesson plan preview:', responseData.lessonPlan?.title || 'No title');
      } catch (e) {
        console.log('✅ Session API responded successfully (non-JSON response)');
      }
    } else {
      console.log('❌ Session start failed');
      try {
        const errorData = JSON.parse(responseText);
        console.log('Error details:', errorData);
      } catch (e) {
        console.log('Error response (raw):', responseText);
      }
    }
    
  } catch (error) {
    console.error('❌ Test failed with error:', error);
  } finally {
    // Clean up: sign out
    console.log('\n🔓 Cleaning up: Signing out...');
    await supabase.auth.signOut();
    console.log('✅ Signed out successfully');
  }
}

testAuthenticatedSession().catch(console.error);