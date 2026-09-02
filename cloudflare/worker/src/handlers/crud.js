// 通用增删改查：所有列名来自资源白名单，所有值走参数绑定

import { notFound, conflict, badRequest } from '../lib/errors.js';
import { validateFields, parsePaging, parseId } from '../lib/validate.js';

function nowIso() {
  return new Date().toISOString();
}

function isUniqueViolation(err) {
  return /UNIQUE constraint failed/i.test(err?.message || '');
}

async function findAlive(env, resource, id) {
  const row = await env.DB.prepare(
    `SELECT * FROM ${resource.table} WHERE id = ? AND deleted_at IS NULL`
  )
    .bind(id)
    .first();
  if (!row) throw notFound(`${resource.label} #${id} 不存在或已删除`);
  return row;
}

/** 列表：分页 + 关键字 + 字段过滤 + 排序 */
export async function list(env, url, resource) {
  const where = ['deleted_at IS NULL'];
  const binds = [];

  for (const f of resource.filterFields) {
    const v = url.searchParams.get(f);
    if (v !== null && v !== '') {
      where.push(`${f} = ?`);
      binds.push(v);
    }
  }

  const q = (url.searchParams.get('q') || '').trim();
  if (q) {
    const cond = resource.searchFields.map((f) => `${f} LIKE ?`).join(' OR ');
    where.push(`(${cond})`);
    const like = `%${q.replace(/[%_]/g, (m) => `\\${m}`)}%`;
    resource.searchFields.forEach(() => binds.push(like));
  }

  const whereSql = `WHERE ${where.join(' AND ')}`;
  const { limit, offset } = parsePaging(url, env);

  const sort = url.searchParams.get('sort') || resource.defaultSort;
  const order = (url.searchParams.get('order') || 'desc').toLowerCase() === 'asc' ? 'ASC' : 'DESC';
  const allowedSort =
    !!resource.fields[sort] || ['id', 'created_at', 'updated_at'].includes(sort);
  const sortCol = allowedSort ? sort : resource.defaultSort;

  const countRow = await env.DB.prepare(`SELECT COUNT(*) AS total FROM ${resource.table} ${whereSql}`)
    .bind(...binds)
    .first();

  const { results } = await env.DB.prepare(
    `SELECT * FROM ${resource.table} ${whereSql} ORDER BY ${sortCol} ${order} LIMIT ? OFFSET ?`
  )
    .bind(...binds, limit, offset)
    .all();

  return { rows: results, total: countRow?.total ?? 0, limit, offset };
}

export async function getById(env, resource, rawId) {
  return findAlive(env, resource, parseId(rawId));
}

export async function create(env, resource, body, actor) {
  const data = validateFields(resource, body);
  const cols = Object.keys(data);
  if (cols.length === 0) throw badRequest('没有可写入的字段');

  const ts = nowIso();
  const sql = `INSERT INTO ${resource.table} (${cols.join(', ')}, created_at, updated_at)
               VALUES (${cols.map(() => '?').join(', ')}, ?, ?)`;
  const values = [...cols.map((c) => data[c]), ts, ts];

  let result;
  try {
    result = await env.DB.prepare(sql).bind(...values).run();
  } catch (err) {
    if (isUniqueViolation(err)) throw conflict('存在重复的唯一字段（如编号、车牌号）', { raw: err.message });
    throw err;
  }

  const id = result?.meta?.last_row_id ?? result?.meta?.lastRowId;
  const row = await env.DB.prepare(`SELECT * FROM ${resource.table} WHERE id = ?`).bind(id).first();
  return { row, actor };
}

export async function update(env, resource, rawId, body) {
  const id = parseId(rawId);
  await findAlive(env, resource, id);

  const data = validateFields(resource, body, { partial: true });
  const cols = Object.keys(data);
  if (cols.length === 0) throw badRequest('没有需要更新的字段');

  const sets = cols.map((c) => `${c} = ?`);
  const values = [...cols.map((c) => data[c]), nowIso(), id];

  try {
    await env.DB.prepare(
      `UPDATE ${resource.table} SET ${sets.join(', ')}, updated_at = ? WHERE id = ? AND deleted_at IS NULL`
    )
      .bind(...values)
      .run();
  } catch (err) {
    if (isUniqueViolation(err)) throw conflict('更新后与其他记录的唯一字段冲突', { raw: err.message });
    throw err;
  }

  return env.DB.prepare(`SELECT * FROM ${resource.table} WHERE id = ?`).bind(id).first();
}

/** 软删除：保留历史数据，可通过 deleted_at 恢复 */
export async function remove(env, resource, rawId) {
  const id = parseId(rawId);
  await findAlive(env, resource, id);
  await env.DB.prepare(
    `UPDATE ${resource.table} SET deleted_at = ?, updated_at = ? WHERE id = ? AND deleted_at IS NULL`
  )
    .bind(nowIso(), nowIso(), id)
    .run();
  return { id, deleted: true };
}

/** 批量写入：单事务，全部成功或全部失败 */
export async function bulkCreate(env, resource, rows) {
  if (!Array.isArray(rows) || rows.length === 0) throw badRequest('rows 必须是非空数组');
  if (rows.length > 200) throw badRequest('单次批量最多 200 条');

  const ts = nowIso();
  const statements = [];
  rows.forEach((r, idx) => {
    const data = validateFields(resource, r);
    const cols = Object.keys(data);
    if (cols.length === 0) throw badRequest(`第 ${idx + 1} 行没有有效字段`);
    const sql = `INSERT INTO ${resource.table} (${cols.join(', ')}, created_at, updated_at)
                 VALUES (${cols.map(() => '?').join(', ')}, ?, ?)`;
    statements.push(env.DB.prepare(sql).bind(...cols.map((c) => data[c]), ts, ts));
  });

  try {
    await env.DB.batch(statements);
  } catch (err) {
    if (isUniqueViolation(err)) throw conflict('批量数据中存在重复的唯一字段', { raw: err.message });
    throw err;
  }
  return { inserted: rows.length };
}
