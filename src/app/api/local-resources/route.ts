import { NextRequest, NextResponse } from 'next/server';
import { isLocalMode } from '@/lib/local-mode';
import {
  deleteLocalResource,
  ingestLocalPdf,
  listLocalResources,
} from '@/lib/local-resources';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function localModeOnly() {
  return NextResponse.json(
    { error: 'Local resources are only available in local mode' },
    { status: 404 },
  );
}

export async function GET(request: NextRequest) {
  if (!isLocalMode()) return localModeOnly();

  const subjectId = request.nextUrl.searchParams.get('subjectId') || undefined;
  const topicId = request.nextUrl.searchParams.get('topicId') || undefined;
  return NextResponse.json({
    resources: listLocalResources(subjectId, topicId),
  });
}

export async function POST(request: NextRequest) {
  if (!isLocalMode()) return localModeOnly();

  try {
    const formData = await request.formData();
    const file = formData.get('file');
    const subjectId = String(formData.get('subjectId') || '').trim();
    const topicId = String(formData.get('topicId') || '').trim();
    const title = String(formData.get('title') || '').trim();

    if (!(file instanceof File) || !subjectId || !topicId) {
      return NextResponse.json(
        { error: 'A PDF, subject, and topic are required' },
        { status: 400 },
      );
    }
    if (file.type && file.type !== 'application/pdf') {
      return NextResponse.json(
        { error: 'Only PDF files are supported' },
        { status: 415 },
      );
    }

    const result = await ingestLocalPdf({
      bytes: new Uint8Array(await file.arrayBuffer()),
      fileName: file.name,
      title,
      subjectId,
      topicId,
    });
    return NextResponse.json(result, { status: result.duplicate ? 200 : 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'PDF ingestion failed';
    console.warn('Local PDF ingestion failed:', error);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(request: NextRequest) {
  if (!isLocalMode()) return localModeOnly();

  const resourceId = request.nextUrl.searchParams.get('resourceId');
  if (!resourceId) {
    return NextResponse.json(
      { error: 'Resource ID is required' },
      { status: 400 },
    );
  }

  return deleteLocalResource(resourceId)
    ? NextResponse.json({ deleted: true })
    : NextResponse.json({ error: 'Resource not found' }, { status: 404 });
}
