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

async function testFrontendAuthFlow() {
  console.log('Testing frontend authentication flow...');
  
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing required environment variables');
    return;
  }
  
  // Create a browser-like Supabase client
  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false
    }
  });
  
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
    
    // Step 2: Get session cookies
    const session = authData.session;
    if (!session) {
      console.error('❌ No session available');
      return;
    }
    
    // Step 3: Get available subjects and topics
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
    
    // Step 4: Test the start-session API with proper cookies
    console.log('\n🚀 Step 3: Testing start-session API with session cookies...');
    
    const sessionPayload = {
      subjectId: subject.id,
      topicId: topic.id
    };
    
    console.log('Request payload:', sessionPayload);
    
    // Create cookies string from session
    const accessToken = session.access_token;
    const refreshToken = session.refresh_token;
    
    // Format cookies like Next.js would
    const cookies = [
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
    
    console.log('Using cookies for authentication...');
    
    const response = await fetch('http://localhost:3000/api/tutor/start-session', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': cookies
      },
      body: JSON.stringify(sessionPayload)
    });
    
    console.log('Response status:', response.status);
    console.log('Response headers:', Object.fromEntries(response.headers.entries()));
    
    const responseText = await response.text();
    console.log('Response body length:', responseText.length);
    
    if (response.ok) {
      try {
        const responseData = JSON.parse(responseText);
        console.log('\n✅ Session started successfully!');
        console.log('Session ID:', responseData.sessionId);
        console.log('Lesson plan preview:', responseData.lessonPlan?.lesson_overview || 'No overview');
        console.log('Key concepts:', responseData.lessonPlan?.key_concepts || []);
      } catch (e) {
        console.log('✅ Session API responded successfully (non-JSON response)');
        console.log('Response preview:', responseText.substring(0, 200) + '...');
      }
    } else {
      console.log('❌ Session start failed');
      try {
        const errorData = JSON.parse(responseText);
        console.log('Error details:', errorData);
      } catch (e) {
        console.log('Error response (raw):', responseText.substring(0, 500));
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

testFrontendAuthFlow().catch(console.error);