import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

// Load environment variables manually
const envContent = readFileSync('.env.local', 'utf8');
const envVars = {};
envContent.split('\n').forEach(line => {
  const [key, value] = line.split('=');
  if (key && value) {
    envVars[key.trim()] = value.trim();
  }
});

// Set environment variables
Object.assign(process.env, envVars);

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function debugSessionLookup() {
  console.log('Debugging session lookup...');
  
  try {
    // First, let's see all sessions in the database
    console.log('\nAll sessions in database:');
    const { data: allSessions, error: allError } = await supabase
      .from('lesson_sessions')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10);
    
    if (allError) {
      console.error('Error fetching all sessions:', allError);
    } else {
      console.log('Found sessions:', allSessions?.length || 0);
      allSessions?.forEach(session => {
        console.log(`  - ID: ${session.id}`);
        console.log(`    User: ${session.user_id}`);
        console.log(`    Subject: ${session.subject_id}`);
        console.log(`    Topic: ${session.topic_id}`);
        console.log(`    Status: ${session.status}`);
        console.log(`    Phase: ${session.current_phase}`);
        console.log(`    Created: ${session.created_at}`);
        console.log('');
      });
    }
    
    // Now let's try to find the most recent session
    if (allSessions && allSessions.length > 0) {
      const latestSession = allSessions[0];
      console.log(`\nTesting session endpoint for latest session: ${latestSession.id}`);
      
      // Test the session lookup with joins
      const { data: sessionWithJoins, error: joinError } = await supabase
        .from('lesson_sessions')
        .select(`
          *,
          subjects(name, description),
          topics(name)
        `)
        .eq('id', latestSession.id)
        .single();
      
      if (joinError) {
        console.error('Error with joins:', joinError);
      } else {
        console.log('Session with joins found:');
        console.log('  Session data:', {
          id: sessionWithJoins.id,
          user_id: sessionWithJoins.user_id,
          subject_id: sessionWithJoins.subject_id,
          topic_id: sessionWithJoins.topic_id,
          status: sessionWithJoins.status,
          current_phase: sessionWithJoins.current_phase
        });
        console.log('  Subject:', sessionWithJoins.subjects);
        console.log('  Topic:', sessionWithJoins.topics);
      }
    }
    
  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

debugSessionLookup();