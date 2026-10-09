'use client';

import { useState, useEffect } from 'react';
import api from '../lib/axios';
import { toSecureFileEndpoint } from '../lib/secureFile';

/**
 * Image rendered from an authenticated blob fetch.
 * Stored upload paths (/uploads/...) are never used as <img> src directly:
 * plain <img> sends no Authorization header, so JWT-protected file routes
 * would 401. No token in URL, no secret leakage.
 */
export default function SecureImg({ src, alt = '', className = '', fallback = null }) {
  const [objectUrl, setObjectUrl] = useState(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setObjectUrl(null);
    setFailed(false);
    const endpoint = toSecureFileEndpoint(src);
    if (!endpoint) {
      setFailed(true);
      return;
    }
    api.get(endpoint, { responseType: 'blob' })
      .then((res) => {
        if (cancelled) return;
        setObjectUrl(URL.createObjectURL(res.data));
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, [src]);

  useEffect(() => {
    return () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [objectUrl]);

  if (failed || !src) return fallback;
  if (!objectUrl) return fallback;
  return <img src={objectUrl} alt={alt} className={className} />;
}
