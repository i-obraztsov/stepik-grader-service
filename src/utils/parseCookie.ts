export function parseSetCookie(setCookieHeader: string | null): string {
  if (!setCookieHeader) return '';

  const cookies = [];
  const parts = setCookieHeader.split(',');

  for (const part of parts) {
    const match = part.trim().match(/^([^;]+)/);
    if (match) {
      cookies.push(match[1].trim());
    }
  }

  return cookies.join('; ');
}