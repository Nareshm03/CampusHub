import api from './axios';

// Maps a stored upload reference to the authenticated file endpoint
// (GET /api/v1/files/:category/:filename, see backend fileRoutes).
// Stored values are either full paths (/uploads/<category>/<file>) or bare
// profile-photo filenames (students category). Returns null when the value
// cannot be mapped — callers must render a fallback, never the raw path.

const objectUrlCache = new Map();

export function toSecureFileEndpoint(stored) {
  if (!stored || typeof stored !== 'string') return null;
  const clean = stored.split('?')[0].split('#')[0];
  const match = clean.match(/^\/?uploads\/([A-Za-z0-9_-]+)\/([^/]+)$/);
  if (match) {
    return `/files/${match[1]}/${match[2]}`;
  }
  // Bare filename → legacy profile-photo reference (students category).
  if (/^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/.test(clean) && !clean.includes('/')) {
    return `/files/students/${clean}`;
  }
  return null;
}

export async function fetchSecureObjectUrl(stored) {
  const endpoint = toSecureFileEndpoint(stored);
  if (!endpoint) throw new Error('Unmappable file reference');
  if (objectUrlCache.has(endpoint)) return objectUrlCache.get(endpoint);
  const res = await api.get(endpoint, { responseType: 'blob' });
  const url = URL.createObjectURL(res.data);
  objectUrlCache.set(endpoint, url);
  return url;
}
