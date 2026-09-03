function normalizePublicUrl(value: string | undefined): string | null {
  const candidate = value?.trim();
  if (!candidate) return null;
  try {
    const url = new URL(candidate);
    if (url.protocol !== 'https:' && url.protocol !== 'http:') return null;
    return url.toString().replace(/\/$/, '');
  } catch {
    return null;
  }
}

export const externalLinks = {
  challenge: normalizePublicUrl(process.env.NEXT_PUBLIC_CHALLENGE_URL),
} as const;

export function displayPublicUrl(value: string): string {
  return value.replace(/^https?:\/\//, '').replace(/\/$/, '');
}
