import { NextResponse } from 'next/server';
import { isLocalMode } from '@/lib/local-mode';
import { getLocalAIStatus } from '@/lib/services/localAI';

export const dynamic = 'force-dynamic';

export async function GET() {
  if (!isLocalMode()) {
    return NextResponse.json(
      { error: 'Local AI status is only available in local mode' },
      { status: 404 },
    );
  }

  return NextResponse.json(await getLocalAIStatus());
}
