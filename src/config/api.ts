import axios from 'axios';

export const API_BASE_URL = String(import.meta.env.VITE_API_BASE_URL || '').trim();

if (!API_BASE_URL) {
  console.warn('[config] VITE_API_BASE_URL is not set');
}

export const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: false,
  timeout: 10 * 60 * 1000, // 10 minutes timeout for large uploads
  headers: {
    Accept: 'application/json',
  },
});

api.interceptors.request.use((config) => {
  try {
    const token = localStorage.getItem('auth_token');
    const hasAuthHeader = Boolean((config.headers as any)?.Authorization || (config.headers as any)?.authorization);
    if (token && !hasAuthHeader) {
      config.headers = {
        ...(config.headers as any),
        Authorization: `Bearer ${token}`,
      };
    }
  } catch {
    // ignore
  }

  try {
    const headers = (config.headers || {}) as any;
    const hasContentType = Boolean(headers['Content-Type'] || headers['content-type']);
    const isFormData = typeof FormData !== 'undefined' && config.data instanceof FormData;
    if (!hasContentType && config.data != null && !isFormData) {
      config.headers = {
        ...headers,
        'Content-Type': 'application/json',
      };
    }
  } catch {
    // ignore
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    const status = err?.response?.status;
    if (status === 401) {
      console.warn('[api] 401 Unauthorized');
    } else if (status === 403) {
      console.warn('[api] 403 Forbidden');
    } else if (status === 503) {
      console.warn('[api] 503 Service Unavailable');
    }

    const url = err?.config?.url;
    const method = err?.config?.method;
    const message = err?.response?.data?.message || err?.message;
    console.error('[api] request failed', { method, url, status, message });
    return Promise.reject(err);
  }
);

export const apiUrl = (path: string) => {
  const base = API_BASE_URL.replace(/\/$/, '');
  const p = String(path || '');
  if (!p) return base;
  return p.startsWith('/') ? `${base}${p}` : `${base}/${p}`;
};
