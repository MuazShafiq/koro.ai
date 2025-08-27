import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export interface ResourceRequest {
  subjectId: string;
  topicId: string;
  title: string;
  description?: string;
  fileUrl: string;
  contentType: string;
  contentText?: string;
}

export interface ResourceResponse {
  success: boolean;
  resourceId?: string;
  resources?: any[];
  error?: string;
}

/**
 * POST /api/resources - Create a new resource
 */
export async function POST(request: NextRequest) {
  try {
    const body: ResourceRequest = await request.json();
    const {
      subjectId,
      topicId,
      title,
      description,
      fileUrl,
      contentType,
      contentText
    } = body;

    // Validate required fields
    if (!subjectId || !topicId || !title || !fileUrl || !contentType) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Missing required fields: subjectId, topicId, title, fileUrl, contentType' 
        },
        { status: 400 }
      );
    }

    // Get authenticated user (admin check could be added here)
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value || '';
          },
          set(name: string, value: string, options: any) {
            cookieStore.set({ name, value, ...options });
          },
          remove(name: string, options: any) {
            cookieStore.set({ name, value: '', ...options });
          },
        },
      }
    );
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Create resource
    const { data, error } = await supabase
      .from('resources')
      .insert({
        subject_id: subjectId,
        topic_id: topicId,
        title,
        description,
        file_url: fileUrl,
        content_type: contentType,
        content_text: contentText
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating resource:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to create resource' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      resourceId: data.id,
      resource: data
    }, { status: 201 });

  } catch (error) {
    console.error('Error in POST /api/resources:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/resources - Get resources by subject/topic
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const subjectId = searchParams.get('subjectId');
    const topicId = searchParams.get('topicId');

    // Get authenticated user
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value || '';
          },
          set(name: string, value: string, options: any) {
            cookieStore.set({ name, value, ...options });
          },
          remove(name: string, options: any) {
            cookieStore.set({ name, value: '', ...options });
          },
        },
      }
    );
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Build query
    let query = supabase
      .from('resources')
      .select(`
        id,
        title,
        description,
        file_url,
        content_type,
        created_at,
        subjects:subject_id(name),
        topics:topic_id(name)
      `)
      .order('created_at', { ascending: false });

    if (subjectId) {
      query = query.eq('subject_id', subjectId);
    }

    if (topicId) {
      query = query.eq('topic_id', topicId);
    }

    const { data: resources, error } = await query;

    if (error) {
      console.error('Error fetching resources:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch resources' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      resources: resources || []
    });

  } catch (error) {
    console.error('Error in GET /api/resources:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/resources - Delete a resource
 */
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const resourceId = searchParams.get('resourceId');

    if (!resourceId) {
      return NextResponse.json(
        { success: false, error: 'resourceId parameter is required' },
        { status: 400 }
      );
    }

    // Get authenticated user (admin check could be added here)
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value || '';
          },
          set(name: string, value: string, options: any) {
            cookieStore.set({ name, value, ...options });
          },
          remove(name: string, options: any) {
            cookieStore.set({ name, value: '', ...options });
          },
        },
      }
    );
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Delete resource
    const { error } = await supabase
      .from('resources')
      .delete()
      .eq('id', resourceId);

    if (error) {
      console.error('Error deleting resource:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to delete resource' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Resource deleted successfully'
    });

  } catch (error) {
    console.error('Error in DELETE /api/resources:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}