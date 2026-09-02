// Worker 入口：CORS 预检 → 路由 → 统一异常兜底

import { route } from './router.js';
import { corsHeaders, preflight, fail, json } from './lib/resp.js';
import { ApiError } from './lib/errors.js';

export default {
  async fetch(request, env) {
    // 浏览器预检
    if (request.method === 'OPTIONS') {
      return preflight(request, env);
    }

    try {
      if (!env.DB) {
        return fail(500, 'DB_NOT_BOUND', 'D1 数据库未绑定，请检查 wrangler.toml 的 d1_databases 配置');
      }

      const response = await route(request, env);
      // 统一补跨域头
      const cors = corsHeaders(request, env);
      Object.entries(cors).forEach(([k, v]) => response.headers.set(k, v));
      return response;
    } catch (err) {
      if (err instanceof ApiError) {
        return fail(err.status, err.code, err.message, err.details);
      }
      const status = err?.status || 500;
      const code = err?.code || 'INTERNAL_ERROR';
      const response =
        status === 404 && !request.url.includes('/api/')
          ? json(
              {
                ok: false,
                error: {
                  code: 'NOT_FOUND',
                  message: '接口不存在。可用接口见 /api/health 与 /api/meta',
                },
              },
              404
            )
          : fail(status, code, err?.message || '服务器内部错误');

      const cors = corsHeaders(request, env);
      Object.entries(cors).forEach(([k, v]) => response.headers.set(k, v));
      return response;
    }
  },
};
