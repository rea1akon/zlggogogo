// 通用键值存储：承接前端多命名空间的本地存储数据
// 大值(>48KB)自动切片存入 kv_chunk，绕开 D1 单条 SQL 约 100KB 的绑定参数上限
// 小值仍走 kv_store，保持与旧版兼容

import { notFound, badRequest } from '../lib/errors.js';
import { redact } from '../lib/redact.js';

const NAME_RE = /^[A-Za-z0-9_\-\u4e00-\u9fa5]{1,64}$/;
const CHUNK_SIZE = 48 * 1024; // 单片 48KB，留出足够安全余量
const MAX_TOTAL_BYTES = 20 * 1024 * 1024; // 单键总量上限 20MB，防异常数据撑爆
const MAX_BATCH_KEYS = 50;

// 系统保留键：这些数据只能留在各自设备的本地存储里，禁止经接口读写。
// 读取接口为公开可读（前端需在脚本执行前同步预填数据，无法携带凭证），
// 因此口令类键一旦写入就会被任何人通过 GET 拿走。
const RESERVED_KEYS = new Set([
  'adminpassword', 'admin_password', 'password', 'pwd',
  'token', 'secret', 'session', 'sessionid'
]);

function checkName(v, label) {
  const s = String(v ?? '').trim();
  if (!NAME_RE.test(s)) {
    throw badRequest(`${label} 只能包含中英文、数字、下划线或短横线，长度 1-64`);
  }
  if (RESERVED_KEYS.has(s.toLowerCase())) {
    throw badRequest(`${label} 属于系统保留键，不允许通过云端接口读写`);
  }
  return s;
}

function nowIso() {
  return new Date().toISOString();
}

function parseValue(text) {
  try {
    return JSON.parse(text);
  } catch {
    return text; // 非 JSON 时按字符串返回
  }
}

// ---------- 分片读写 ----------

async function readChunks(env, ns, k) {
  const { results } = await env.DB.prepare(
    `SELECT chunk_index, data, updated_at FROM kv_chunk WHERE namespace = ? AND key = ? ORDER BY chunk_index`
  )
    .bind(ns, k)
    .all();
  if (!results || results.length === 0) return null;
  return { text: results.map((r) => r.data).join(''), updated_at: results[0].updated_at, chunks: results.length };
}

async function writeChunks(env, ns, k, text) {
  const total = Math.ceil(text.length / CHUNK_SIZE);
  const stmts = [];
  for (let i = 0; i < total; i += 1) {
    const part = text.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE);
    stmts.push(
      env.DB.prepare(
        `INSERT INTO kv_chunk (namespace, key, chunk_index, data, updated_at)
         VALUES (?, ?, ?, ?, ?)
         ON CONFLICT(namespace, key, chunk_index)
         DO UPDATE SET data = excluded.data, updated_at = excluded.updated_at`
      ).bind(ns, k, i, part, nowIso())
    );
  }
  // 清掉比本次更长的残留分片
  stmts.push(
    env.DB.prepare(`DELETE FROM kv_chunk WHERE namespace = ? AND key = ? AND chunk_index >= ?`).bind(ns, k, total)
  );
  await env.DB.batch(stmts);
  return total;
}

async function clearChunks(env, ns, k) {
  await env.DB.prepare(`DELETE FROM kv_chunk WHERE namespace = ? AND key = ?`).bind(ns, k).run();
}

// ---------- 对外接口 ----------

export async function listNamespaces(env) {
  const { results } = await env.DB.prepare(
    `SELECT namespace, COUNT(*) AS count, MAX(updated_at) AS updated_at
     FROM kv_store GROUP BY namespace ORDER BY namespace`
  ).all();
  return results;
}

// 读取出口统一过脱敏：访客/未登录请求拿不到敏感明文，管理员不受影响
function project(row, redactFlag) {
  if (!row) return row;
  return redactFlag ? { ...row, value: redact(row.value) } : row;
}

function decode(row, redactFlag) {
  if (!row) return null;
  let value = row.value;
  if (value !== null && value !== undefined) {
    value = parseValue(value);
  }
  return project({ namespace: row.namespace, key: row.key, value, updated_at: row.updated_at }, redactFlag);
}

export async function listKeys(env, namespace, redactFlag) {
  const ns = checkName(namespace, '命名空间');
  const { results } = await env.DB.prepare(`SELECT * FROM kv_store WHERE namespace = ? ORDER BY key`)
    .bind(ns)
    .all();
  return results.map((r) => decode(r, redactFlag));
}

export async function getValue(env, namespace, key, redactFlag) {
  const ns = checkName(namespace, '命名空间');
  const k = checkName(key, '键名');

  const chunked = await readChunks(env, ns, k);
  if (chunked) {
    return project(
      {
        namespace: ns,
        key: k,
        value: parseValue(chunked.text),
        updated_at: chunked.updated_at,
        chunks: chunked.chunks
      },
      redactFlag
    );
  }

  const row = await env.DB.prepare(`SELECT * FROM kv_store WHERE namespace = ? AND key = ?`).bind(ns, k).first();
  if (!row) throw notFound(`键 ${ns}/${k} 不存在`);
  return decode(row, redactFlag);
}

export async function putValue(env, namespace, key, value) {
  const ns = checkName(namespace, '命名空间');
  const k = checkName(key, '键名');
  if (value === undefined) throw badRequest('value 不能为空');

  const text = JSON.stringify(value);
  if (text.length > MAX_TOTAL_BYTES) {
    throw badRequest(`单个键值不能超过 ${Math.floor(MAX_TOTAL_BYTES / 1024 / 1024)}MB`);
  }

  const updatedAt = nowIso();

  if (text.length > CHUNK_SIZE) {
    const chunks = await writeChunks(env, ns, k, text);
    await env.DB.prepare(`DELETE FROM kv_store WHERE namespace = ? AND key = ?`).bind(ns, k).run();
    return { namespace: ns, key: k, value, updated_at: updatedAt, chunks };
  }

  await env.DB.prepare(
    `INSERT INTO kv_store (namespace, key, value, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(namespace, key)
     DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`
  )
    .bind(ns, k, text, updatedAt, updatedAt)
    .run();
  await clearChunks(env, ns, k);
  return { namespace: ns, key: k, value, updated_at: updatedAt, chunks: 0 };
}

export async function removeValue(env, namespace, key) {
  const ns = checkName(namespace, '命名空间');
  const k = checkName(key, '键名');
  await clearChunks(env, ns, k);
  const res = await env.DB.prepare(`DELETE FROM kv_store WHERE namespace = ? AND key = ?`).bind(ns, k).run();
  if ((res?.meta?.changes ?? 0) === 0) throw notFound(`键 ${ns}/${k} 不存在`);
  return { namespace: ns, key: k, deleted: true };
}

// ---------- 批量接口（前端启动时全量拉取 / 批量提交） ----------

export async function getMany(env, namespace, keys, redactFlag) {
  const ns = checkName(namespace, '命名空间');
  if (!Array.isArray(keys) || keys.length === 0) throw badRequest('keys 不能为空');
  if (keys.length > MAX_BATCH_KEYS) throw badRequest(`一次最多读取 ${MAX_BATCH_KEYS} 个键`);

  const items = [];
  for (const key of keys) {
    const k = checkName(key, '键名');
    try {
      const r = await getValue(env, ns, k, redactFlag);
      items.push({ key: k, value: r.value, updated_at: r.updated_at, ok: true });
    } catch (err) {
      // 键不存在时返回 null，不中断整批读取
      items.push({ key: k, value: null, ok: false, error: err?.code || 'READ_ERROR' });
    }
  }
  return { namespace: ns, items };
}

export async function putMany(env, namespace, items) {
  const ns = checkName(namespace, '命名空间');
  if (!Array.isArray(items) || items.length === 0) throw badRequest('items 不能为空');
  if (items.length > MAX_BATCH_KEYS) throw badRequest(`一次最多写入 ${MAX_BATCH_KEYS} 个键`);

  const result = [];
  for (const item of items) {
    const k = checkName(item?.key, '键名');
    try {
      const r = await putValue(env, ns, k, item?.value);
      result.push({ key: k, ok: true, chunks: r.chunks, updated_at: r.updated_at });
    } catch (err) {
      result.push({ key: k, ok: false, error: err?.code || 'WRITE_ERROR', message: err?.message });
    }
  }
  return { namespace: ns, items: result };
}
