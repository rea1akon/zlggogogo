/**
 * V8.0 材料明细：列宽 + 单元格悬浮提示 —— 静态守护测试
 *
 * 背景（踩坑记录）：
 *   表格使用 table-layout: fixed，浏览器在计算列宽时只会把 <col> 按「可见列」顺序应用，
 *   会跳过 display:none 的隐藏列（仓库号/物料编码/批号/备注）。
 *   因此 colgroup 只能按 17 个可见列声明；若按 21 个真实列声明，列宽会整体错位 3 列，
 *   材料名称列会被挤到 0 宽。
 *
 * 运行：node cloudflare/tools/test-warehouse-tooltip.mjs
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import assert from 'node:assert/strict';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '../..');
const HTML = readFileSync(resolve(ROOT, '庄骆贵一体化养护管理系统V4.html'), 'utf8');
const CSS = readFileSync(resolve(ROOT, 'style.css'), 'utf8');
const JS = readFileSync(resolve(ROOT, 'script.js'), 'utf8');

let passed = 0;
const cases = [];
function test(name, fn) { cases.push([name, fn]); }

/* ---------- 1. colgroup 结构 ---------- */

function getTableBlock() {
    const start = HTML.indexOf('<table class="wh-table" id="whMaterialTable">');
    assert.ok(start > -1, '未找到 #whMaterialTable 表格');
    const end = HTML.indexOf('</table>', start);
    return HTML.slice(start, end);
}

test('colgroup 存在且按 17 个可见列声明（不是 21 个真实列）', () => {
    const block = getTableBlock();
    const cgMatch = block.match(/<colgroup>([\s\S]*?)<\/colgroup>/);
    assert.ok(cgMatch, '未找到 colgroup');
    const cols = cgMatch[1].match(/<col\b/g) || [];
    assert.equal(cols.length, 17, `colgroup 应为 17 个 <col>（可见列），实际 ${cols.length} 个`);
});

test('colgroup 宽度合计为 100%', () => {
    const block = getTableBlock();
    const cg = block.match(/<colgroup>([\s\S]*?)<\/colgroup>/)[1];
    const widths = [...cg.matchAll(/width:\s*([\d.]+)%/g)].map((m) => parseFloat(m[1]));
    assert.equal(widths.length, 17, `应有 17 个宽度定义，实际 ${widths.length}`);
    const sum = widths.reduce((a, b) => a + b, 0);
    assert.ok(Math.abs(sum - 100) < 0.01, `宽度合计应为 100%，实际 ${sum}%`);
});

test('材料名称列宽度 ≥ 12%（保证可读）', () => {
    const block = getTableBlock();
    const cg = block.match(/<colgroup>([\s\S]*?)<\/colgroup>/)[1];
    const widths = [...cg.matchAll(/width:\s*([\d.]+)%/g)].map((m) => parseFloat(m[1]));
    // 可见列顺序：选择, 序号, 材料名称, 单位, (数量,单价,金额)*4, 操作
    assert.ok(widths[2] >= 12, `材料名称列宽度应 ≥12%，实际 ${widths[2]}%`);
});

test('隐藏列数量为 4（仓库号/物料编码/批号/备注）', () => {
    const block = getTableBlock();
    const thead = block.slice(block.indexOf('<thead>'), block.indexOf('</thead>'));
    const hidden = thead.match(/wh-col-hidden/g) || [];
    assert.equal(hidden.length, 4, `表头隐藏列应为 4 个，实际 ${hidden.length} 个`);
});

test('tbody 渲染列数 = 可见列 + 隐藏列（21）', () => {
    const start = JS.indexOf('function whRenderTable() {');
    assert.ok(start > -1, '未找到 whRenderTable');
    const end = JS.indexOf('\nfunction ', start + 10);
    const body = JS.slice(start, end);
    const tds = body.match(/<td[\s>]/g) || [];
    assert.equal(tds.length, 21, `whRenderTable 应渲染 21 个 <td>，实际 ${tds.length} 个`);
});

/* ---------- 2. 悬浮提示 ---------- */

test('style.css 含气泡样式 .wh-cell-tip 与 .show', () => {
    assert.ok(/\.wh-cell-tip\s*\{/.test(CSS), '缺少 .wh-cell-tip 样式');
    assert.ok(/\.wh-cell-tip\.show\s*\{/.test(CSS), '缺少 .wh-cell-tip.show 样式');
});

test('文本单元格启用省略号（配合气泡可感知截断）', () => {
    const seg = CSS.slice(CSS.indexOf('#warehouse-detail-tab .wh-table tbody td'));
    assert.ok(/text-overflow:\s*ellipsis/.test(seg.slice(0, 400)), '数据单元格缺少 text-overflow: ellipsis');
});

test('script.js 定义 whInstallCellTooltip 并在 initWarehouseModule 中调用', () => {
    assert.ok(/function whInstallCellTooltip\s*\(\)/.test(JS), '缺少 whInstallCellTooltip 定义');
    const start = JS.indexOf('function initWarehouseModule() {');
    const end = JS.indexOf('}', start);
    const body = JS.slice(start, end);
    assert.ok(body.includes('whInstallCellTooltip();'), 'initWarehouseModule 未调用 whInstallCellTooltip');
});

test('气泡仅在内容被截断时触发（含 canvas 实测与 canvas 判定）', () => {
    const start = JS.indexOf('function whInstallCellTooltip()');
    const end = JS.indexOf('function initWarehouseModule()');
    const body = JS.slice(start, end);
    assert.ok(body.includes('isClipped'), '缺少 isClipped 截断判定');
    assert.ok(body.includes('measureText'), '缺少 canvas 文本宽度实测');
    assert.ok(/if\s*\(!text\s*\|\|\s*!isClipped\(td\)\)/.test(body), 'show() 未先做截断判定');
});

test('复选框列与操作列不弹气泡', () => {
    const start = JS.indexOf('function whInstallCellTooltip()');
    const end = JS.indexOf('function initWarehouseModule()');
    const body = JS.slice(start, end);
    assert.ok(body.includes('input[type="checkbox"]'), '未排除复选框列');
    assert.ok(body.includes('querySelector(\'button\')') || body.includes("querySelector('button')"), '未排除操作列按钮');
});

test('滚动/离开/ESC 时关闭气泡', () => {
    const start = JS.indexOf('function whInstallCellTooltip()');
    const end = JS.indexOf('function initWarehouseModule()');
    const body = JS.slice(start, end);
    assert.ok(body.includes("'mouseleave'"), '未监听 mouseleave');
    assert.ok(body.includes("'scroll'"), '未监听 scroll');
    assert.ok(body.includes('Escape'), '未监听 ESC');
});

/* ---------- 执行 ---------- */

let failed = 0;
for (const [name, fn] of cases) {
    try {
        fn();
        passed++;
        console.log('  ✓ ' + name);
    } catch (e) {
        failed++;
        console.log('  ✗ ' + name + '\n      → ' + e.message);
    }
}
console.log(`\n${failed === 0 ? '✅' : '❌'} 通过 ${passed}/${cases.length}`);
process.exit(failed === 0 ? 0 : 1);
