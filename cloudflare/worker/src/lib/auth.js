// 账号口令与会话。口令使用「随机 salt + SHA-256(salt:password)」存储，不存明文

import { unauthorized, badRequest } from './errors.js';

const SESSION_TTL_HOURS = 12;

async function sha256(text) {
  const data = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export async function hashPassword(salt, password) {
  return sha256(`${salt}:${password}`);
}

function randomToken() {
  const buf = new Uint8Array(32);
  crypto.getRandomValues(buf);
  return Array.from(buf)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function clientIp(request) {
  return request.headers.get('CF-Connecting-IP') || request.headers.get('X-Forwarded-For') || null;
}

export async function login(env, body, request) {
  const username = String(body?.username ?? '').trim();
  const password = String(body?.password ?? '');
  if (!username || !password) throw badRequest('用户名和密码不能为空');

  const user = await env.DB.prepare(
    `SELECT id, username, password_hash, salt, display_name, role, area, status
     FROM users WHERE username = ?`
  )
    .bind(username)
    .first();

  // 账号不存在时也执行一次哈希，避免通过响应时间枚举用户名
  const salt = user?.salt || 'decoy-salt';
  const hash = await hashPassword(salt, password);

  if (!user || user.password_hash !== hash) throw unauthorized('账号或密码错误');
  if (user.status !== 'active') throw unauthorized('账号已被停用');

  const token = randomToken();
  const expiresAt = new Date(Date.now() + SESSION_TTL_HOURS * 3600 * 1000).toISOString();

  await env.DB.batch([
    env.DB.prepare('DELETE FROM sessions WHERE expires_at < ?').bind(new Date().toISOString()),
    env.DB.prepare(
      'INSERT INTO sessions (token, user_id, expires_at, ip, user_agent) VALUES (?, ?, ?, ?, ?)'
    ).bind(token, user.id, expiresAt, clientIp(request), request.headers.get('User-Agent')),
    env.DB.prepare('UPDATE users SET last_login_at = ?, updated_at = ? WHERE id = ?').bind(
      new Date().toISOString(),
      new Date().toISOString(),
      user.id
    ),
  ]);

  return {
    token,
    expires_at: expiresAt,
    user: {
      id: user.id,
      username: user.username,
      display_name: user.display_name,
      role: user.role,
      area: user.area,
    },
  };
}

export async function currentUser(env, request) {
  const header = request.headers.get('Authorization') || '';
  const m = /^Bearer\s+(.+)$/i.exec(header.trim());
  if (!m) throw unauthorized('缺少登录凭证');

  const row = await env.DB.prepare(
    `SELECT s.token, s.expires_at, u.id, u.username, u.display_name, u.role, u.area, u.status
     FROM sessions s JOIN users u ON u.id = s.user_id
     WHERE s.token = ?`
  )
    .bind(m[1])
    .first();

  if (!row) throw unauthorized('登录凭证无效');
  if (row.expires_at < new Date().toISOString()) throw unauthorized('登录已过期，请重新登录');
  if (row.status !== 'active') throw unauthorized('账号已被停用');

  return {
    id: row.id,
    username: row.username,
    display_name: row.display_name,
    role: row.role,
    area: row.area,
    token: row.token,
  };
}

export async function logout(env, request) {
  const header = request.headers.get('Authorization') || '';
  const m = /^Bearer\s+(.+)$/i.exec(header.trim());
  if (m) {
    await env.DB.prepare('DELETE FROM sessions WHERE token = ?').bind(m[1]).run();
  }
  return { logged_out: true };
}

/** 写操作是否需要登录（默认需要；设置 REQUIRE_AUTH=false 可在本机调试时放开） */
export function writeAuthEnabled(env) {
  return String(env.REQUIRE_AUTH ?? 'true').toLowerCase() !== 'false';
}
