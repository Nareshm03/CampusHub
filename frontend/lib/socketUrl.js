// Derives the Socket.io host URL from the API base URL.
//
// NEXT_PUBLIC_API_URL points at the API prefix (e.g.
// "https://host/api/v1"), but the Socket.io server handshakes at the host
// root ("/socket.io/"). Connecting to the full API URL would request
// "/api/v1/socket.io/" and never connect.

export function getSocketUrl(apiUrl) {
  const raw = (apiUrl || '').trim();
  if (!raw) return 'http://localhost:5000';
  return (
    raw
      .replace(/\/api\/v1\/?$/, '')
      .replace(/\/api\/?$/, '')
      .replace(/\/+$/, '') || 'http://localhost:5000'
  );
}
