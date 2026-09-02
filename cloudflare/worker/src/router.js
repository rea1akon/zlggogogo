// 路由分发：/api/health · /api/meta · /api/auth/* · /api/:resource[/:id|bulk] · /api/kv[/:ns[/:key]]

import { ok, fail, methodNotAllowed } from './lib/resp.js';
import { ApiError, notFound, badRequest } from './lib/errors.js';
import { getResource, resourceMeta, RESOURCES } from './resources.js';
import * as crud from './handlers/crud.js';
import * as kv from './handlers/kv.js';
import { login, logout, currentUser, writeAuthEnabled } from './lib/auth.js';
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
    if (action === 'me') {
      if (method !== 'GET') return methodNotAllowed(request, env, 'GET');
      return ok({ user: await currentUser(env, request) });
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
    if (ns && !key) {
      if (method !== 'GET') return methodNotAllowed(request, env, 'GET');
      return ok(await kv.listKeys(env, decodeURIComponent(ns)));
    }
    const namespace = decodeURIComponent(ns);
    const k = decodeURIComponent(key);
    if (method === 'GET') return ok(await kv.getValue(env, namespace, k));
    if (method === 'PUT' || method === 'POST') {
      const body = await readJson(request);
      return ok(await kv.putValue(env, namespace, k, body?.value));
    }
    if (method === 'DELETE') return ok(await kv.removeValue(env, namespace, k));
    return methodNotAllowed(request, env, 'GET, PUT, DELETE');
  }

  // ---------- 通用资源 CRUD ----------
  const m = RE_RESOURCE.exec(path);
  if (!m) throw notFound('接口不存在');
  const [, resourceKey, idOrAction] = m;
  if (!Object.prototype.hasOwnProperty.call(RESOURCES, resourceKey)) {
    throw notFound(`资源 ${resourceKey} 不存在`, { available: Object.keys(RESOURCES) });
  }
  const resource = getResource(resourceKey);

  // 写操作鉴权
  const isWrite = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method);
  let user = null;
  if (isWrite && writeAuthEnabled(env)) {
    user = await currentUser(env, request);
  }

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
      return ok(data.rows, { total: data.total, limit: data.limit, offset: data.offset });
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
  if (method === 'GET') return ok(await crud.getById(env, resource, idOrAction));
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
