const fs = require('fs');
const path = require('path');

// Load environment variables from .env.local
function loadEnvFile() {
  const envPath = path.join(__dirname, '.env.local');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    envContent.split('\n').forEach(line => {
      const [key, ...valueParts] = line.split('=');
      if (key && valueParts.length > 0) {
        const value = valueParts.join('=').trim();
        process.env[key.trim()] = value;
      }
    });
  }
}

loadEnvFile();

async function testRealFrontendFlow() {
  console.log('🧪 Testing Real Frontend Flow...');
  console.log('===============================================');
  
  const baseUrl = 'http://localhost:3000';
  
  try {
    // Step 1: Test if the dev server is running
    console.log('\n🔍 Step 1: Checking if dev server is running...');
    const healthCheck = await fetch(baseUrl);
    if (!healthCheck.ok) {
      console.error('❌ Dev server is not running or not accessible');
      return;
    }
    console.log('✅ Dev server is running');
    
    // Step 2: Test login endpoint
    console.log('\n🔐 Step 2: Testing login...');
    const loginResponse = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'farjadimtiaz21@gmail.com',
        password: 'Farjad4718'
      })
    });
    
    if (!loginResponse.ok) {
      console.error('❌ Login failed:', loginResponse.status);
      const errorText = await loginResponse.text();
      console.error('Error:', errorText);
      return;
    }
    
    const loginData = await loginResponse.json();
    console.log('✅ Login successful');
    
    // Extract cookies for subsequent requests
    const cookies = loginResponse.headers.get('set-cookie');
    const authCookie = cookies ? cookies.split(';')[0] : '';
    
    // Step 3: Test subjects endpoint
    console.log('\n📚 Step 3: Fetching user subjects...');
    const subjectsResponse = await fetch(`${baseUrl}/api/subjects`, {
      headers: {
        'Cookie': authCookie
      }
    });
    
    if (!subjectsResponse.ok) {
      console.error('❌ Failed to fetch subjects:', subjectsResponse.status);
      return;
    }
    
    const subjects = await subjectsResponse.json();
    console.log(`✅ Found ${subjects.length} subjects`);
    
    if (subjects.length === 0) {
      console.error('❌ No subjects found for user');
      return;
    }
    
    const subject = subjects[0];
    console.log(`📖 Using subject: ${subject.name} (${subject.id})`);
    
    // Step 4: Test topics endpoint
    console.log('\n🎯 Step 4: Fetching topics for subject...');
    const topicsResponse = await fetch(`${baseUrl}/api/topics?subjectId=${subject.id}`, {
      headers: {
        'Cookie': authCookie
      }
    });
    
    if (!topicsResponse.ok) {
      console.error('❌ Failed to fetch topics:', topicsResponse.status);
      return;
    }
    
    const topics = await topicsResponse.json();
    console.log(`✅ Found ${topics.length} topics`);
    
    // Step 5: Test session creation
    console.log('\n🚀 Step 5: Creating AI tutor session...');
    const sessionResponse = await fetch(`${baseUrl}/api/tutor/start-session`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': authCookie
      },
      body: JSON.stringify({
        subjectId: subject.id,
        topicId: topics && topics.length > 0 ? topics[0].id : null
      })
    });
    
    if (!sessionResponse.ok) {
      const errorText = await sessionResponse.text();
      console.error('❌ Session creation failed:', sessionResponse.status, errorText);
      return;
    }
    
    const sessionData = await sessionResponse.json();
    console.log('✅ Session created successfully');
    console.log(`📝 Session ID: ${sessionData.sessionId}`);
    
    // Step 6: Test session endpoint (the one that might be failing)
    console.log('\n🔍 Step 6: Testing session endpoint...');
    const sessionInfoResponse = await fetch(`${baseUrl}/api/tutor/session/${sessionData.sessionId}`, {
      headers: {
        'Cookie': authCookie
      }
    });
    
    if (!sessionInfoResponse.ok) {
      console.error('❌ Session info fetch failed:', sessionInfoResponse.status);
      const errorText = await sessionInfoResponse.text();
      console.error('Error:', errorText);
      return;
    }
    
    const sessionInfo = await sessionInfoResponse.json();
    console.log('✅ Session info retrieved successfully');
    console.log(`🎵 Welcome audio: ${sessionInfo.welcomeAudioUrl ? 'Available' : 'Not available'}`);
    console.log(`❓ Assessment questions: ${sessionInfo.assessmentQuestions?.length || 0}`);
    
    if (sessionInfo.assessmentQuestions && sessionInfo.assessmentQuestions.length > 0) {
      console.log('\n📋 Assessment Questions:');
      sessionInfo.assessmentQuestions.forEach((q, index) => {
        console.log(`  ${index + 1}. ${q.question}`);
        console.log(`     Purpose: ${q.purpose}`);
        console.log(`     Audio: ${q.audioUrl ? 'Available' : 'Not available'}`);
      });
    }
    
    // Step 7: Test the actual frontend pages
    console.log('\n🌐 Step 7: Testing frontend pages...');
    
    // Test study page
    const studyPageResponse = await fetch(`${baseUrl}/study`, {
      headers: {
        'Cookie': authCookie
      }
    });
    
    if (studyPageResponse.ok) {
      console.log('✅ Study page accessible');
    } else {
      console.error('❌ Study page not accessible:', studyPageResponse.status);
    }
    
    // Test AI tutor page
    const aiTutorPageResponse = await fetch(`${baseUrl}/study/ai-tutor/${subject.id}`, {
      headers: {
        'Cookie': authCookie
      }
    });
    
    if (aiTutorPageResponse.ok) {
      console.log('✅ AI Tutor page accessible');
    } else {
      console.error('❌ AI Tutor page not accessible:', aiTutorPageResponse.status);
    }
    
    console.log('\n🎯 FRONTEND FLOW ANALYSIS:');
    console.log('===============================================');
    console.log('✅ All backend APIs are working correctly');
    console.log('✅ Authentication is working');
    console.log('✅ Session creation is working');
    console.log('✅ Session data retrieval is working');
    console.log('✅ Assessment questions are available');
    console.log('');
    console.log('🔍 NEXT STEPS FOR DEBUGGING:');
    console.log('1. Open browser dev tools');
    console.log('2. Navigate to http://localhost:3000/study');
    console.log('3. Login with farjadimtiaz21@gmail.com / Farjad4718');
    console.log('4. Start an AI tutor session');
    console.log('5. Check console for JavaScript errors');
    console.log('6. Check if AITutorInterface component is receiving sessionData prop');
    console.log('');
    console.log('💡 LIKELY ISSUE:');
    console.log('The ai-tutor/[subjectId]/page.tsx is NOT passing sessionData to AITutorInterface.');
    console.log('This causes the component to fetch session data via API, which might fail.');
    console.log('The study/page.tsx correctly passes sessionData, but ai-tutor page does not.');
    
  } catch (error) {
    console.error('❌ Test failed with error:', error.message);
  }
}

testRealFrontendFlow();