'use client';
import { createContext, useContext, useState, useEffect } from 'react';
import api from '../lib/axios';
import { isTokenExpired } from '../lib/tokenUtils';
import { useRouter } from 'next/navigation';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  // Normalize the authoritative profile: guarantee both id forms so all
  // existing readers (user.id and user._id) keep working.
  const normalizeUser = (profile) => {
    if (!profile || typeof profile !== 'object') return profile;
    const id = profile.id || profile._id;
    return { ...profile, id, _id: profile._id || profile.id };
  };

  // Single authoritative source: GET /auth/me. On non-auth failures the
  // cached user is kept (offline/refresh resilience); a 401 flows through
  // the axios interceptor (genuinely invalid token -> logout + redirect).
  const fetchProfile = async (fallbackUser = null) => {
    try {
      const response = await api.get('/auth/me');
      const profile = normalizeUser(response.data?.data);
      if (profile && profile.role) {
        localStorage.setItem('user', JSON.stringify(profile));
        setUser(profile);
        return profile;
      }
    } catch (error) {
      if (!error.response && fallbackUser) {
        setUser(fallbackUser);
        return fallbackUser;
      }
      throw error;
    }
    if (fallbackUser) {
      setUser(fallbackUser);
      return fallbackUser;
    }
    throw new Error('Invalid profile response');
  };

  useEffect(() => {
    if (typeof window === 'undefined') {
      setLoading(false);
      return;
    }
    const storedToken = localStorage.getItem('token');
    const userData = localStorage.getItem('user');

    // Missing, undecodable, or elapsed token: clear and stay logged out.
    // (Tokens without `exp` remain usable — the backend decides.)
    if (!storedToken || isTokenExpired(storedToken)) {
      if (storedToken) {
        localStorage.removeItem('user');
        localStorage.removeItem('token');
        setToken(null);
      }
      setLoading(false);
      return;
    }
    const token = storedToken;

    let cachedUser = null;
    if (userData && userData !== 'undefined') {
      try {
        cachedUser = normalizeUser(JSON.parse(userData));
        setUser(cachedUser);
        setToken(token);
      } catch (error) {
        localStorage.removeItem('user');
        localStorage.removeItem('token');
        setLoading(false);
        return;
      }
    }

    // Revalidate against the authoritative profile (refresh-safe).
    fetchProfile(cachedUser)
      .catch(() => {
        // Non-401 failures keep the cached user; 401s are handled by the
        // axios interceptor. If there is no cached user either, force logout.
        if (!cachedUser) {
          localStorage.removeItem('user');
          localStorage.removeItem('token');
          setToken(null);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  const login = async (email, password) => {
    try {
      const response = await api.post('/auth/login', { email, password });
      const { data, token, success } = response.data;

      if (success && token && data) {
        localStorage.setItem('token', token);
        setToken(token);
        // Hydrate the complete profile from the authoritative source.
        // Falls back to the login payload if the profile fetch fails
        // without invalidating the session (e.g. transient network error).
        const fallbackUser = normalizeUser(data);
        localStorage.setItem('user', JSON.stringify(fallbackUser));
        let finalUser = fallbackUser;
        try {
          finalUser = await fetchProfile(fallbackUser);
        } catch (error) {
          // If the session was invalidated (interceptor cleared storage on
          // a 401), fail the login; otherwise keep the login payload.
          if (!localStorage.getItem('token')) throw error;
        }
        return { success: true, data: finalUser, role: finalUser.role };
      } else {
        throw new Error('Invalid response format');
      }
    } catch (error) {
      throw error;
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    setToken(null);
    router.push('/login');
  };

  const updateProfilePhoto = (photo) => {
    setUser(prev => {
      const updated = { ...prev, profilePhoto: photo };
      localStorage.setItem('user', JSON.stringify(updated));
      return updated;
    });
  };

  const validateToken = () => {
    if (typeof window === 'undefined') return false;
    const token = localStorage.getItem('token');
    if (!token) return false;

    // Missing `exp` means usable (backend decides); only an elapsed `exp`
    // or an undecodable token fails validation.
    return !isTokenExpired(token);
  };

  return (
    <AuthContext.Provider value={{ user, token, setUser, login, logout, loading, validateToken, updateProfilePhoto }}>
      {children}
    </AuthContext.Provider>
  );
};