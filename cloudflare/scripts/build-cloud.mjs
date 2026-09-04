// 生成云端版部署目录：复制原版文件 + 注入云同步适配器
// 产物目录 zlg-v4-cloud/ 已是 .gitignore 忽略项，可随时重建
// 用法：node cloudflare/scripts/build-cloud.mjs

import { mkdirSync, copyFileSync, readFileSync, writeFileSync, rmSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url)); // cloudflare/scripts
const CLOUDFLARE_DIR = join(HERE, '..');
const ROOT = join(CLOUDFLARE_DIR, '..'); // 仓库根
const OUT = join(ROOT, 'zlg-v4-cloud');

const MAIN = '庄骆贵一体化养护管理系统V4.html';
const STATIC_FILES = ['index.html', MAIN, 'script.js', 'style.css', 'back.mp4'];
const ADAPTER_SRC = join(CLOUDFLARE_DIR, 'tools', 'cloud-sync.js');
const ANCHOR = '<script src="script.js"></script>';
const INJECTED = '<script src="cloud-sync.js"></script>\n    ' + ANCHOR;

if (!existsSync(ADAPTER_SRC)) throw new Error(`找不到适配器源码：${ADAPTER_SRC}`);

rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });

for (const name of STATIC_FILES) {
  const src = join(ROOT, name);
  if (!existsSync(src)) throw new Error(`缺少文件：${src}`);
  copyFileSync(src, join(OUT, name));
}
copyFileSync(ADAPTER_SRC, join(OUT, 'cloud-sync.js'));

const htmlPath = join(OUT, MAIN);
const html = readFileSync(htmlPath, 'utf8');
if (!html.includes(ANCHOR)) throw new Error(`注入失败：${MAIN} 中未找到 ${ANCHOR}`);
writeFileSync(htmlPath, html.replace(ANCHOR, INJECTED), 'utf8');

console.log(`✅ 云端版部署目录已生成：${OUT}`);
console.log('   下一步：cd cloudflare && npx wrangler pages deploy ../zlg-v4-cloud --project-name zlg-maintenance');
