const CHARSET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export function generateFriendCode(length = 8): string {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  let out = '';
  for (let i = 0; i < length; i++) {
    out += CHARSET[bytes[i]! % CHARSET.length];
  }
  return out;
}

export function normalizeFriendCode(raw: string): string {
  return raw.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
}

export function friendInviteUrl(code: string): string {
  const base = import.meta.env.BASE_URL.replace(/\/$/, '') || '';
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const path = base ? `${base}/` : '/';
  return `${origin}${path}?friend=${encodeURIComponent(normalizeFriendCode(code))}`;
}
