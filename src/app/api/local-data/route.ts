import { NextResponse } from 'next/server';
import { isLocalMode } from '@/lib/local-mode';
import {
  exportLocalResources,
  resetLocalResources,
} from '@/lib/local-resources';
import {
  exportLocalTutorSessions,
  resetLocalTutorSessions,
} from '@/lib/local-tutor';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function localModeOnly() {
  return NextResponse.json(
    { error: 'Local data management is only available in local mode' },
    { status: 404 },
  );
}

export async function GET() {
  if (!isLocalMode()) return localModeOnly();
  return NextResponse.json({
    exportedAt: new Date().toISOString(),
    tutorSessions: exportLocalTutorSessions(),
    resources: exportLocalResources(),
  });
}

export async function DELETE() {
  if (!isLocalMode()) return localModeOnly();
  resetLocalTutorSessions();
  resetLocalResources();
  return NextResponse.json({ reset: true });
}
