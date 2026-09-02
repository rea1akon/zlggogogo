// 统一响应与跨域处理

const BASE_HEADERS = {
  'Content-Type': 'application/json; charset=utf-8',
  'X-Content-Type-Options': 'nosniff',
};

/**
 * 解析允许的来源。无 Origin（脚本/服务端调用）返回 *；
 * 有 Origin 时回显，便于 Pages 预览域名自动可用。
 * 生产环境建议把 ALLOWED_ORIGINS 配成精确域名并改为严格匹配。
 */
function resolveOrigin(request, env) {
  const origin = request.headers.get('Origin');
  if (!origin) return '*';
  const allowed = (env.ALLOWED_ORIGINS || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  if (allowed.length === 0 || allowed.includes('*')) return origin;
  return allowed.includes(origin) ? origin : origin;
}

export function corsHeaders(request, env) {
  return {
    'Access-Control-Allow-Origin': resolveOrigin(request, env),
    'Access-Control-Allow-Methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  };
}

export function json(payload, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...BASE_HEADERS, ...extraHeaders },
  });
}

export function ok(data, meta = {}, status = 200) {
  return json({ ok: true, data, meta }, status);
}

export function fail(status, code, message, details = null) {
  const error = { code, message };
  if (details) error.details = details;
  return json({ ok: false, error }, status);
}

/** 预检请求 */
export function preflight(request, env) {
  return new Response(null, { status: 204, headers: corsHeaders(request, env) });
}

/** 405 方法不允许 */
export function methodNotAllowed(request, env, allow) {
  return json(
    { ok: false, error: { code: 'METHOD_NOT_ALLOWED', message: `不支持的请求方法，允许：${allow}` } },
    405,
    { ...corsHeaders(request, env), Allow: allow }
  );
}
