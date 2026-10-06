// Shared JWT helpers for the auth flow.
//
// Backend tokens always carry an `exp` claim (see
// backend/src/models/User.getSignedJwtToken), but tokens minted before the
// default-expiry fix may not have one. A missing `exp` must never be treated
// as "logged out": the backend remains the authority and rejects genuinely
// invalid tokens with 401.

export function decodeTokenPayload(token) {
  try {
    if (typeof token !== 'string') return null;
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    // JWT uses base64url; convert to standard base64 for atob().
    let base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const pad = base64.length % 4;
    if (pad) base64 += '='.repeat(4 - pad);
    const json =
      typeof atob === 'function'
        ? atob(base64)
        : Buffer.from(base64, 'base64').toString('utf8');
    return JSON.parse(json);
  } catch (error) {
    return null;
  }
}

// True only when the token is missing, undecodable, or past its own expiry.
// Tokens without an `exp` claim are treated as usable; the backend decides.
export function isTokenExpired(token) {
  const payload = decodeTokenPayload(token);
  if (!payload) return true;
  if (typeof payload.exp !== 'number') return false;
  return payload.exp <= Date.now() / 1000;
}
