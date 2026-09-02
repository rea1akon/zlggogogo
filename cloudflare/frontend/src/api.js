// 统一 API 客户端
// 开发环境走 Vite 代理（/api）；生产环境用 VITE_API_BASE 指向 Worker 域名

export const API_BASE = import.meta.env.VITE_API_BASE || '/api';

let token = localStorage.getItem('zlg_token') || '';
export const getToken = () => token;
export const setToken = (t) => {
  token = t || '';
  t ? localStorage.setItem('zlg_token', t) : localStorage.removeItem('zlg_token');
};

export class ApiError extends Error {
  constructor(status, code, message, details) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

async function request(path, { method = 'GET', body } = {}) {
  const headers = {};
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  let payload;
  try {
    payload = await res.json();
  } catch {
    throw new ApiError(res.status, 'BAD_RESPONSE', '服务端返回了非 JSON 内容');
  }

  if (!payload.ok) {
    const e = payload.error || {};
    throw new ApiError(res.status, e.code || 'ERROR', e.message || '请求失败', e.details);
  }
  return payload;
}

export const api = {
  health: () => request('/health'),
  meta: () => request('/meta'),
  login: (username, password) => request('/auth/login', { method: 'POST', body: { username, password } }),
  logout: () => request('/auth/logout', { method: 'POST' }),
  me: () => request('/auth/me'),

  list: (resource, params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/${resource}${qs ? `?${qs}` : ''}`);
  },
  get: (resource, id) => request(`/${resource}/${id}`),
  create: (resource, body) => request(`/${resource}`, { method: 'POST', body }),
  update: (resource, id, body) => request(`/${resource}/${id}`, { method: 'PUT', body }),
  remove: (resource, id) => request(`/${resource}/${id}`, { method: 'DELETE' }),

  kvGet: (ns, key) => request(`/kv/${encodeURIComponent(ns)}/${encodeURIComponent(key)}`),
  kvList: (ns) => request(`/kv/${encodeURIComponent(ns)}`),
  kvPut: (ns, key, value) =>
    request(`/kv/${encodeURIComponent(ns)}/${encodeURIComponent(key)}`, { method: 'PUT', body: { value } }),
  kvDel: (ns, key) =>
    request(`/kv/${encodeURIComponent(ns)}/${encodeURIComponent(key)}`, { method: 'DELETE' }),
};
