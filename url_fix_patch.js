// Patch for fixing Invalid URL error in start-session route
// Replace line around 411 in src/app/api/tutor/start-session/route.ts

// BEFORE (causing Invalid URL error):
// const response = await fetch('/api/tutor/generate-question-audio', {

// AFTER (fixed with absolute URL):
// const response = await fetch(`${baseUrl}/api/tutor/generate-question-audio`, {

// Ensure the baseUrl is constructed as:
// const protocol = request.headers.get('x-forwarded-proto') || 'http';
// const host = request.headers.get('host') || 'localhost:3000';
// const baseUrl = `${protocol}://${host}`;

// This fix ensures server-side fetch