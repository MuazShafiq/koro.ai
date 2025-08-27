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

async function testCompleteFlow() {
  console.log('🧪 Testing complete student journey flow...');
  
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
    
    // Step 4: Start session
    console.log('\n🚀 Step 4: Starting AI tutor session...');
    const sessionResponse = await fetch('http://localhost:3000/api/tutor/start-session', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': `sb-access-token=${authData.session.access_token}; sb-refresh-token=${authData.session.refresh_token}`
      },
      body: JSON.stringify({
        subjectId: subject.id,
        topicId: topic.id
      })
    });
    
    if (!sessionResponse.ok) {
      const errorText = await sessionResponse.text();
      console.error('❌ Session start failed:', sessionResponse.status, errorText);
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
        'Cookie': `sb-access-token=${authData.session.access_token}; sb-refresh-token=${authData.session.refresh_token}`
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
    
    // Step 6: Simulate assessment submission
    if (sessionInfo.assessmentQuestions && sessionInfo.assessmentQuestions.length > 0) {
      console.log('\n📝 Step 6: Testing assessment submission...');
      
      // Create sample answers for all questions
      const sampleAnswers = sessionInfo.assessmentQuestions.map((q, index) => ({
        question: q.question,
        answer: `Sample answer ${index + 1} for testing purposes`
      }));
      
      const assessmentResponse = await fetch('http://localhost:3000/api/tutor/assessment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': `sb-access-token=${authData.session.access_token}; sb-refresh-token=${authData.session.refresh_token}`
        },
        body: JSON.stringify({
          sessionId: sessionData.sessionId,
          answers: sampleAnswers
        })
      });
      
      if (!assessmentResponse.ok) {
        const errorText = await assessmentResponse.text();
        console.error('❌ Assessment submission failed:', assessmentResponse.status, errorText);
      } else {
        const assessmentResult = await assessmentResponse.json();
        console.log('✅ Assessment submitted successfully!');
        console.log('Understanding level:', assessmentResult.evaluation?.understanding_level || 'Unknown');
        console.log('Lesson plan generated:', assessmentResult.lessonPlan ? 'Yes' : 'No');
        
        // Step 7: Test lesson delivery
        console.log('\n📚 Step 7: Testing lesson delivery...');
        const deliveryResponse = await fetch('http://localhost:3000/api/tutor/deliver-chunk', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Cookie': `sb-access-token=${authData.session.access_token}; sb-refresh-token=${authData.session.refresh_token}`
          },
          body: JSON.stringify({
            sessionId: sessionData.sessionId,
            chunkIndex: 0
          })
        });
        
        if (!deliveryResponse.ok) {
          const errorText = await deliveryResponse.text();
          console.error('❌ Lesson delivery failed:', deliveryResponse.status, errorText);
        } else {
          const chunkData = await deliveryResponse.json();
          console.log('✅ Lesson delivery working!');
          console.log('Chunk content length:', chunkData.content?.length || 0);
          console.log('Audio URL:', chunkData.audioUrl ? 'Available' : 'Not available');
        }
      }
    } else {
      console.log('⚠️ No assessment questions found - this might be the issue!');
    }
    
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
  }
}

testCompleteFlow();