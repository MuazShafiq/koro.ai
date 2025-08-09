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

async function testStartSession() {
  console.log('Testing AI Tutor Start Session API...');
  
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing required environment variables');
    return;
  }
  
  try {
    // Create Supabase client
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // First, get available subjects
    console.log('\n📚 Fetching available subjects...');
    const { data: subjects, error: subjectsError } = await supabase
      .from('subjects')
      .select('id, name, description')
      .limit(5);
    
    if (subjectsError) {
      console.error('❌ Failed to fetch subjects:', subjectsError);
      return;
    }
    
    if (!subjects || subjects.length === 0) {
      console.log('⚠️  No subjects found in database');
      return;
    }
    
    console.log('✅ Found subjects:', subjects.map(s => `${s.name} (${s.id})`));
    
    // Get topics for the first subject
    const firstSubject = subjects[0];
    console.log(`\n🎯 Fetching topics for subject: ${firstSubject.name}`);
    
    const { data: topics, error: topicsError } = await supabase
      .from('topics')
      .select('id, name')
      .eq('subject_id', firstSubject.id)
      .limit(3);
    
    if (topicsError) {
      console.error('❌ Failed to fetch topics:', topicsError);
      return;
    }
    
    console.log('✅ Found topics:', topics?.map(t => `${t.name} (${t.id})`) || ['No topics']);
    
    // Test the start-session API endpoint
    console.log('\n🚀 Testing start-session API endpoint...');
    
    const testPayload = {
      subjectId: firstSubject.id,
      topicId: topics && topics.length > 0 ? topics[0].id : null
    };
    
    console.log('Request payload:', testPayload);
    
    const response = await fetch('http://localhost:3000/api/tutor/start-session', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Note: In a real scenario, we would need proper authentication headers
        // For testing, we'll see how the API handles unauthenticated requests
      },
      body: JSON.stringify(testPayload)
    });
    
    console.log('Response status:', response.status);
    console.log('Response headers:', Object.fromEntries(response.headers.entries()));
    
    const responseData = await response.text();
    console.log('Response body:', responseData);
    
    if (response.ok) {
      console.log('\n✅ Start session API test successful!');
      try {
        const jsonData = JSON.parse(responseData);
        console.log('Session created:', {
          sessionId: jsonData.sessionId,
          phase: jsonData.currentPhase,
          hasLessonPlan: !!jsonData.lessonPlan
        });
      } catch (e) {
        console.log('Response is not JSON:', responseData);
      }
    } else {
      console.log('\n⚠️  Start session API returned error status:', response.status);
      try {
        const errorData = JSON.parse(responseData);
        console.log('Error details:', errorData);
      } catch (e) {
        console.log('Error response:', responseData);
      }
    }
    
  } catch (error) {
    console.error('❌ Test failed with error:', error);
    console.error('Error details:', {
      name: error.name,
      message: error.message,
      stack: error.stack?.split('\n').slice(0, 5).join('\n')
    });
  }
}

testStartSession().catch(console.error);

// Also test the database function directly
async function testDatabaseFunction() {
  console.log('\n\n🔧 Testing database function directly...');
  
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const supabase = createClient(supabaseUrl, supabaseKey);
  
  try {
    // Get a subject and topic for testing
    const { data: subjects } = await supabase
      .from('subjects')
      .select('id')
      .limit(1);
    
    const { data: topics } = await supabase
      .from('topics')
      .select('id')
      .limit(1);
    
    if (subjects && subjects.length > 0 && topics && topics.length > 0) {
      console.log('Testing get_resources_by_topic function...');
      
      const { data: resources, error: resourcesError } = await supabase
        .rpc('get_resources_by_topic', {
          subject_uuid: subjects[0].id,
          topic_uuid: topics[0].id
        });
      
      if (resourcesError) {
        console.error('❌ Database function error:', resourcesError);
      } else {
        console.log('✅ Database function works! Found', resources?.length || 0, 'resources');
      }
    }
  } catch (error) {
    console.error('❌ Database function test failed:', error.message);
  }
}

// Run both tests
setTimeout(testDatabaseFunction, 2000);