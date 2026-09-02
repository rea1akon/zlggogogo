// 通用键值存储：承接前端多命名空间的本地存储数据，value 以 JSON 文本保存

import { notFound, badRequest } from '../lib/errors.js';

const NAME_RE = /^[A-Za-z0-9_\-\u4e00-\u9fa5]{1,64}$/;
const MAX_VALUE_BYTES = 256 * 1024;

function checkName(v, label) {
  const s = String(v ?? '').trim();
  if (!NAME_RE.test(s)) {
    throw badRequest(`${label} 只能包含中英文、数字、下划线或短横线，长度 1-64`);
  }
  return s;
}

function nowIso() {
  return new Date().toISOString();
}

function decode(row) {
  if (!row) return null;
  let value = row.value;
  if (value !== null && value !== undefined) {
    try {
      value = JSON.parse(value);
    } catch {
      /* 非 JSON 时按字符串返回 */
    }
  }
  return { namespace: row.namespace, key: row.key, value, updated_at: row.updated_at };
}

export async function listNamespaces(env) {
  const { results } = await env.DB.prepare(
    `SELECT namespace, COUNT(*) AS count, MAX(updated_at) AS updated_at
     FROM kv_store GROUP BY namespace ORDER BY namespace`
  ).all();
  return results;
}

export async function listKeys(env, namespace) {
  const ns = checkName(namespace, '命名空间');
  const { results } = await env.DB.prepare(
    `SELECT * FROM kv_store WHERE namespace = ? ORDER BY key`
  )
    .bind(ns)
    .all();
  return results.map(decode);
}

export async function getValue(env, namespace, key) {
  const ns = checkName(namespace, '命名空间');
  const k = checkName(key, '键名');
  const row = await env.DB.prepare(
    `SELECT * FROM kv_store WHERE namespace = ? AND key = ?`
  )
    .bind(ns, k)
    .first();
  if (!row) throw notFound(`键 ${ns}/${k} 不存在`);
  return decode(row);
}

export async function putValue(env, namespace, key, value) {
  const ns = checkName(namespace, '命名空间');
  const k = checkName(key, '键名');
  if (value === undefined) throw badRequest('value 不能为空');

  const text = JSON.stringify(value);
  if (text.length > MAX_VALUE_BYTES) throw badRequest('单个键值不能超过 256KB');

  await env.DB.prepare(
    `INSERT INTO kv_store (namespace, key, value, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(namespace, key)
     DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`
  )
    .bind(ns, k, text, nowIso(), nowIso())
    .run();

  return { namespace: ns, key: k, value, updated_at: nowIso() };
}

export async function removeValue(env, namespace, key) {
  const ns = checkName(namespace, '命名空间');
  const k = checkName(key, '键名');
  const res = await env.DB.prepare(`DELETE FROM kv_store WHERE namespace = ? AND key = ?`)
    .bind(ns, k)
    .run();
  if ((res?.meta?.changes ?? 0) === 0) throw notFound(`键 ${ns}/${k} 不存在`);
  return { namespace: ns, key: k, deleted: true };
}
