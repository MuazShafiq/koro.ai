# Supabase Integration for Koro.ai

This document provides instructions for setting up and using Supabase with the Koro.ai application.

## Setup Instructions

### 1. Create a Supabase Project

1. Sign up or log in to [Supabase](https://supabase.com)
2. Create a new project
3. Note your project URL and anon key (found in Project Settings > API)

### 2. Configure Environment Variables

Create or update your `.env.local` file with the following variables:

```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 3. Set Up Database Schema

Run the SQL script in `supabase/schema.sql` in the Supabase SQL Editor to create the necessary tables and policies.

## Database Structure

### Tables

1. **profiles**
   - Extends the auth.users table
   - Stores user profile information
   - Contains streak, XP, and session data

2. **subjects**
   - Stores subject information
   - Linked to user profiles

3. **topics**
   - Stores topic information
   - Linked to subjects
   - Tracks completion and progress

4. **achievements**
   - Stores user achievements
   - Linked to user profiles

## Authentication Flow

1. Users sign up or log in through the `/login` page
2. Authentication is handled by Supabase Auth
3. After successful authentication, users are redirected to the dashboard
4. Protected routes are secured via middleware

## Row Level Security (RLS)

All tables have Row Level Security enabled with policies that:

1. Allow users to view their own data
2. Allow users to insert/update/delete only their own data
3. Prevent unauthorized access to other users' data

## User Profile Management

Users can manage their profiles through the `/profile` page, which allows:

1. Updating username and full name
2. Setting avatar URL and website
3. Viewing streak and XP information

## Study Progress Tracking

The application tracks and stores:

1. Subject and topic progress
2. Study session data
3. User achievements
4. Streak and XP information

## Automatic User Creation

When a new user signs up, a trigger function automatically creates a profile record in the `profiles` table.