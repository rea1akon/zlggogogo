// 路由分发：/api/health · /api/meta · /api/auth/* · /api/:resource[/:id|bulk] · /api/kv[/:ns[/:key]]

import { ok, fail, methodNotAllowed } from './lib/resp.js';
import { ApiError, notFound, badRequest } from './lib/errors.js';
import { getResource, resourceMeta, RESOURCES } from './resources.js';
import * as crud from './handlers/crud.js';
import * as kv from './handlers/kv.js';
import { syncGps, getMileage } from './handlers/gps.js';
import { login, logout, currentUser, requireWriteRole, bootstrapAdmin, authStatus } from './lib/auth.js';
import { redact, needRedact } from './lib/redact.js';
import { logOperation } from './lib/log.js';

const RE_RESOURCE = /^\/api\/([a-zA-Z_]+)(?:\/([^/]+))?\/?$/;
const RE_KV = /^\/api\/kv(?:\/([^/]+))?(?:\/([^/]+))?\/?$/;

async function readJson(request) {
  const text = await request.text();
  if (!text) throw badRequest('请求体不能为空');
  try {
    return JSON.parse(text);
  } catch {
    throw badRequest('请求体不是合法的 JSON');
  }
}

function health(env) {
  return { status: 'ok', service: env.API_TITLE, version: env.API_VERSION, environment: env.ENVIRONMENT };
}

// 键值存储的写操作鉴权：未开启写鉴权时直接放行，开启后必须持有有效会话且非访客
async function requireKvWrite(env, request) {
  return requireWriteRole(env, request);
}

/**
 * 读取权限判定（用于脱敏）：
 *   - 携带有效且未过期的管理员会话 → 返回明文
 *   - 无凭证 / 凭证无效 / 非管理员角色 → 读取结果统一脱敏
 * 这样即使有人绕过前端直接请求接口，敏感明文也不会下发。
 */
async function shouldRedact(env, request) {
  try {
    const user = await currentUser(env, request);
    return needRedact(user);
  } catch {
    return true; // 未携带有效凭证，按访客处理
  }
}

export async function route(request, env) {
  const url = new URL(request.url);
  const path = url.pathname;
  const method = request.method.toUpperCase();

  // ---------- 健康检查 ----------
  if (path === '/api/health' || path === '/health') {
    if (method !== 'GET') return methodNotAllowed(request, env, 'GET');
    await env.DB.prepare('SELECT 1 AS ok').first(); // 顺带验证 D1 连通
    return ok({ ...health(env), db: 'connected' });
  }

  // ---------- 资源元数据（供前端动态渲染表单） ----------
  if (path === '/api/meta') {
    if (method !== 'GET') return methodNotAllowed(request, env, 'GET');
    return ok({ resources: resourceMeta() });
  }

  // ---------- 鉴权 ----------
  if (path.startsWith('/api/auth/')) {
    const action = path.replace('/api/auth/', '');
    if (action === 'login') {
      if (method !== 'POST') return methodNotAllowed(request, env, 'POST');
      const body = await readJson(request);
      const data = await login(env, body, request);
      await logOperation(env, request, { actor: data.user.username, action: 'login', targetType: 'user', targetId: data.user.id });
      return ok(data);
    }
    if (action === 'logout') {
      if (method !== 'POST') return methodNotAllowed(request, env, 'POST');
      return ok(await logout(env, request));
    }
    if (action === 'status') {
      if (method !== 'GET') return methodNotAllowed(request, env, 'GET');
      return ok(await authStatus(env));
    }
    if (action === 'me') {
      if (method !== 'GET') return methodNotAllowed(request, env, 'GET');
      return ok({ user: await currentUser(env, request) });
    }
    if (action === 'bootstrap') {
      if (method !== 'POST') return methodNotAllowed(request, env, 'POST');
      const body = await readJson(request);
      const data = await bootstrapAdmin(env, body, request);
      await logOperation(env, request, {
        actor: data.user.username,
        action: 'bootstrap',
        targetType: 'user',
        targetId: data.user.id,
      });
      return ok(data, {}, 201);
    }
    throw notFound('未知的鉴权接口');
  }

  // ---------- 通用键值存储 ----------
  if (path.startsWith('/api/kv')) {
    const m = RE_KV.exec(path);
    if (!m) throw notFound('键值接口路径不正确');
    const [, ns, key] = m;

    if (!ns) {
      if (method !== 'GET') return methodNotAllowed(request, env, 'GET');
      return ok(await kv.listNamespaces(env));
    }

    const namespace = decodeURIComponent(ns);
    // 批量写入：POST /api/kv/:ns/_bulk
    if (key === '_bulk') {
      if (method !== 'POST') return methodNotAllowed(request, env, 'POST');
      await requireKvWrite(env, request);
      const body = await readJson(request);
      return ok(await kv.putMany(env, namespace, body?.items));
    }

    // 读取是否需要脱敏（访客/未登录一律脱敏）
    const redactFlag = await shouldRedact(env, request);

    if (!key) {
      if (method !== 'GET') return methodNotAllowed(request, env, 'GET');
      // 带 keys 参数走批量读取：GET /api/kv/:ns?keys=a,b,c
      const keysParam = url.searchParams.get('keys');
      if (keysParam) {
        const keys = keysParam.split(',').map((s) => s.trim()).filter(Boolean);
        return ok(await kv.getMany(env, namespace, keys, redactFlag));
      }
      return ok(await kv.listKeys(env, namespace, redactFlag));
    }

    const k = decodeURIComponent(key);
    if (method === 'GET') return ok(await kv.getValue(env, namespace, k, redactFlag));
    if (method === 'PUT' || method === 'POST') {
      await requireKvWrite(env, request);
      const body = await readJson(request);
      return ok(await kv.putValue(env, namespace, k, body?.value));
    }
    if (method === 'DELETE') {
      await requireKvWrite(env, request);
      return ok(await kv.removeValue(env, namespace, k));
    }
    return methodNotAllowed(request, env, 'GET, PUT, DELETE');
  }

  // ---------- GPS 车载里程（只读查询 + 手动同步） ----------
  if (path === '/api/gps/mileage') {
    if (method !== 'GET') return methodNotAllowed(request, env, 'GET');
    return ok(await getMileage(env, url));
  }
  if (path === '/api/gps/sync') {
    if (method !== 'POST' && method !== 'GET') return methodNotAllowed(request, env, 'POST');
    const key = request.headers.get('x-gps-sync-key') || url.searchParams.get('key');
    if (!env.GPS_SYNC_KEY || key !== env.GPS_SYNC_KEY) {
      throw new ApiError(403, 'FORBIDDEN', '同步密钥不正确');
    }
    const full = url.searchParams.get('full') === '1';
    return ok(await syncGps(env, { full, acc: true }));
  }

  // ---------- 通用资源 CRUD ----------
  const m = RE_RESOURCE.exec(path);
  if (!m) throw notFound('接口不存在');
  const [, resourceKey, idOrAction] = m;
  if (!Object.prototype.hasOwnProperty.call(RESOURCES, resourceKey)) {
    throw notFound(`资源 ${resourceKey} 不存在`, { available: Object.keys(RESOURCES) });
  }
  const resource = getResource(resourceKey);

  // 写操作鉴权（含访客只读守卫）
  const isWrite = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method);
  let user = null;
  if (isWrite) {
    user = await requireWriteRole(env, request);
  } else {
    try { user = await currentUser(env, request); } catch { user = null; }
  }
  // 读取出口脱敏：非管理员不返回敏感明文
  const maskRows = (rows) => (needRedact(user) && Array.isArray(rows) ? rows.map(redact) : rows);

  // 批量写入：POST /api/:resource/bulk
  if (idOrAction === 'bulk') {
    if (method !== 'POST') return methodNotAllowed(request, env, 'POST');
    const body = await readJson(request);
    const result = await crud.bulkCreate(env, resource, body?.rows);
    await logOperation(env, request, {
      actor: user?.username,
      action: 'bulk_create',
      targetType: resourceKey,
      targetId: null,
      detail: result,
    });
    return ok(result, {}, 201);
  }

  // 集合：GET 列表 / POST 新增
  if (!idOrAction) {
    if (method === 'GET') {
      const data = await crud.list(env, url, resource);
      return ok(maskRows(data.rows), { total: data.total, limit: data.limit, offset: data.offset });
    }
    if (method === 'POST') {
      const body = await readJson(request);
      const { row } = await crud.create(env, resource, body, user?.username);
      await logOperation(env, request, {
        actor: user?.username,
        action: 'create',
        targetType: resourceKey,
        targetId: row?.id,
        detail: row,
      });
      return ok(row, {}, 201);
    }
    return methodNotAllowed(request, env, 'GET, POST');
  }

  // 单条：GET / PUT / DELETE
  if (method === 'GET') return ok(needRedact(user) ? redact(await crud.getById(env, resource, idOrAction)) : await crud.getById(env, resource, idOrAction));
  if (method === 'PUT' || method === 'PATCH') {
    const body = await readJson(request);
    const row = await crud.update(env, resource, idOrAction, body);
    await logOperation(env, request, {
      actor: user?.username,
      action: 'update',
      targetType: resourceKey,
      targetId: idOrAction,
      detail: row,
    });
    return ok(row);
  }
  if (method === 'DELETE') {
    const result = await crud.remove(env, resource, idOrAction);
    await logOperation(env, request, {
      actor: user?.username,
      action: 'delete',
      targetType: resourceKey,
      targetId: idOrAction,
    });
    return ok(result);
  }
  return methodNotAllowed(request, env, 'GET, PUT, DELETE');
}

export { ApiError, fail };
