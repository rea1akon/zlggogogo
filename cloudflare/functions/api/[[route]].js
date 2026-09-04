// 同源反向代理：/api/* → Worker
// 解决两个问题：
// 1. *.workers.dev 域名在国内被 DNS 污染，浏览器直连必然 Failed to fetch
// 2. 跨域 CORS 依赖 ALLOWED_ORIGINS 配置，同源后彻底免除
const WORKER_ORIGIN = "https://zlg-maintenance-api.rea1akon.workers.dev";

export async function onRequest(context) {
  const url = new URL(context.request.url);
  const target = WORKER_ORIGIN + url.pathname + url.search;
  const request = new Request(target, context.request);
  return fetch(request);
}
