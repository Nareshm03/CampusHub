// Secure token storage utility
class SecureStorage {
  constructor() {
    this.isClient = typeof window !== 'undefined';
  }

  // Store token securely (httpOnly cookie preferred)
  setToken(token) {
    if (!this.isClient) return;
    
    // Use sessionStorage as fallback (more secure than localStorage)
    sessionStorage.setItem('token', token);
    
    // Set httpOnly cookie via API call for better security
    this.setSecureCookie('auth_token', token);
  }

  getToken() {
    if (!this.isClient) return null;
    return sessionStorage.getItem('token');
  }

  removeToken() {
    if (!this.isClient) return;
    sessionStorage.removeItem('token');
    this.removeSecureCookie('auth_token');
  }

  setSecureCookie(name, value) {
    // This should be handled by backend API
    fetch('/api/auth/set-cookie', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, value })
    }).catch(console.error);
  }

  removeSecureCookie(name) {
    fetch('/api/auth/remove-cookie', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name })
    }).catch(console.error);
  }
}

export default new SecureStorage();