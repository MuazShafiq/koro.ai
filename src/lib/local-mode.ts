export function isLocalMode(): boolean {
  return (
    process.env.NEXT_PUBLIC_KORO_LOCAL_MODE === 'true' ||
    (typeof window === 'undefined' && process.env.KORO_LOCAL_MODE === 'true')
  );
}

