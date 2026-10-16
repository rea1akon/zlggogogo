/**
 * V8.1 人事管理「所在片区」—— 选项单一数据源 + 编辑回填保底 守护测试
 *
 * 背景：
 *   1) 片区选项原先在 handlePositionChange / resetForm / editEmployee 三处各写一份，
 *      HTML 里还有两份静态选项，加一个片区要改 5 个地方。
 *   2) 编辑时 areaSelect.value = employee.area 对不在选项内的历史值（数据中大量存在
 *      的「默认」）赋值会失败 → 片区被清空 → 保存时被校验拦下，用户被迫重选。
 *
 * 运行：node cloudflare/tools/test-employee-area.mjs
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import assert from 'node:assert/strict';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '../..');
const HTML = readFileSync(resolve(ROOT, '庄骆贵一体化养护管理系统V4.html'), 'utf8');
const JS = readFileSync(resolve(ROOT, 'script.js'), 'utf8');

/* ---------- 从 script.js 抽取被测代码 ---------- */

function extractFunction(src, name) {
    const start = src.indexOf('function ' + name);
    assert.ok(start > -1, `未找到函数 ${name}`);
    const open = src.indexOf('{', start);
    let depth = 0;
    for (let j = open; j < src.length; j++) {
        if (src[j] === '{') depth++;
        else if (src[j] === '}') {
            depth--;
            if (depth === 0) return src.slice(start, j + 1);
        }
    }
    throw new Error(`函数体不完整: ${name}`);
}
function extractConstLine(src, name) {
    const start = src.indexOf('const ' + name);
    assert.ok(start > -1, `未找到常量 ${name}`);
    return src.slice(start, src.indexOf('\n', start));
}

const code = [
    extractConstLine(JS, 'AREA_BASE_OPTIONS'),
    extractConstLine(JS, 'AREA_GREENERY_OPTIONS'),
    extractFunction(JS, 'getAreaValues'),
    extractFunction(JS, 'fillAreaSelect'),
    extractFunction(JS, 'syncFilterAreaOptions'),
].join('\n\n');

/* ---------- 轻量 DOM mock ---------- */

const escapeHtml = (s) => String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

function makeSelect() {
    return {
        value: '',
        dataset: {},
        _opts: [],
        set innerHTML(html) {
            this._opts = Array.from(html.matchAll(/<option value="([^"]*)">([^<]*)<\/option>/g))
                .map((m) => ({ value: m[1], text: m[2] }));
        },
        get innerHTML() { return ''; },
        get options() { return this._opts; },
        appendChild(o) { this._opts.push({ value: o.value, text: o.textContent }); },
    };
}

const dom = { filterArea: makeSelect() };
const mockDocument = {
    createElement: (tag) => ({ tagName: tag.toUpperCase(), value: '', textContent: '', dataset: {} }),
    getElementById: (id) => (id === 'filterArea' ? dom.filterArea : null),
};

const employeesRef = [];
const factory = new Function(
    'document', 'escapeHtml', 'employees',
    code + '\n\nreturn { AREA_BASE_OPTIONS, AREA_GREENERY_OPTIONS, getAreaValues, fillAreaSelect, syncFilterAreaOptions };'
);
const api = factory(mockDocument, escapeHtml, employeesRef);

/* ---------- 单测 ---------- */

let passed = 0;
const cases = [];
function test(name, fn) { cases.push([name, fn]); }

// --- 选项集合 ---
test('基础片区包含「车队」', () => {
    assert.ok(api.AREA_BASE_OPTIONS.includes('车队'), '「车队」未加入基础片区');
});
test('基础片区仍保留原有 4 项', () => {
    ['片所本级', '庄市', '骆驼', '贵驷'].forEach((v) => {
        assert.ok(api.AREA_BASE_OPTIONS.includes(v), `缺少原有片区 ${v}`);
    });
});
test('绿化岗位使用独立片区集合（庄一/庄二/庄三）', () => {
    assert.deepEqual(api.getAreaValues('绿化作业人员'), ['庄一', '庄二', '庄三', '骆驼']);
});
test('非绿化岗位使用基础片区集合', () => {
    assert.deepEqual(api.getAreaValues('驾驶员'), api.AREA_BASE_OPTIONS);
    assert.deepEqual(api.getAreaValues(''), api.AREA_BASE_OPTIONS);
});

// --- 表单下拉填充 ---
test('fillAreaSelect 正常选中选项内的值', () => {
    const sel = makeSelect();
    api.fillAreaSelect(sel, '驾驶员', '车队', true);
    assert.equal(sel.value, '车队');
    assert.ok(sel.options.some((o) => o.value === '车队'), '选项里没有车队');
});
test('fillAreaSelect 编辑时保留选项外的历史值（核心回归）', () => {
    const sel = makeSelect();
    api.fillAreaSelect(sel, '环卫作业人员', '默认', true);
    assert.equal(sel.value, '默认', '历史片区值未被保留，编辑会丢数据');
    assert.ok(sel.options.some((o) => o.value === '默认'), '未动态追加历史值选项');
});
test('fillAreaSelect 追加的历史值排在标准选项之后', () => {
    const sel = makeSelect();
    api.fillAreaSelect(sel, '驾驶员', '蛟川', true);
    const last = sel.options[sel.options.length - 1];
    assert.equal(last.value, '蛟川');
});
test('fillAreaSelect 无 presetValue 时回到占位项', () => {
    const sel = makeSelect();
    api.fillAreaSelect(sel, '', '', false);
    assert.equal(sel.value, '');
    assert.equal(sel.options[0].text, '请选择');
});
test('切换岗位时选项外的值被清空（keepLegacy=false）', () => {
    const sel = makeSelect();
    api.fillAreaSelect(sel, '驾驶员', '蛟川', false);
    assert.equal(sel.value, '');
    assert.ok(!sel.options.some((o) => o.value === '蛟川'), '不应追加历史值');
});
test('切换岗位时原有值仍在新选项内则保留', () => {
    const sel = makeSelect();
    api.fillAreaSelect(sel, '绿化作业人员', '骆驼', false);
    assert.equal(sel.value, '骆驼');
});
test('历史值含空格也能正确追加', () => {
    const sel = makeSelect();
    api.fillAreaSelect(sel, '驾驶员', '  默认  ', true);
    assert.equal(sel.value, '默认');
});

// --- 筛选下拉联动 ---
test('筛选下拉并入数据中出现的额外片区值', () => {
    dom.filterArea = makeSelect();
    mockDocument.getElementById = () => dom.filterArea;
    employeesRef.length = 0;
    employeesRef.push({ area: '默认' }, { area: '车队' }, { area: '庄市' });
    api.syncFilterAreaOptions();
    const values = dom.filterArea.options.map((o) => o.value);
    assert.ok(values.includes('默认'), '额外片区值「默认」未并入筛选下拉');
    assert.equal(values.filter((v) => v === '车队').length, 1, '车队不应重复');
});
test('筛选下拉不重复并入基础选项已有的值', () => {
    const values = dom.filterArea.options.map((o) => o.value);
    assert.equal(values.filter((v) => v === '庄市').length, 1);
});
test('选项集合无变化时不重建（避免闪烁）', () => {
    const snapshot = dom.filterArea;      // 引用不变即为未重建
    api.syncFilterAreaOptions();
    assert.equal(dom.filterArea, snapshot);
});
test('筛选后当前选中值被保留', () => {
    dom.filterArea = makeSelect();
    mockDocument.getElementById = () => dom.filterArea;
    employeesRef.length = 0;
    employeesRef.push({ area: '默认' });
    api.syncFilterAreaOptions();
    dom.filterArea.value = '默认';
    employeesRef.push({ area: '蛟川' });
    api.syncFilterAreaOptions();
    assert.equal(dom.filterArea.value, '默认');
});

// --- 静态一致性 ---
test('HTML 表单下拉含「车队」', () => {
    const seg = HTML.slice(HTML.indexOf('<select id="area" required>'));
    assert.ok(/<option value="车队">车队<\/option>/.test(seg.slice(0, 700)), '表单片区下拉缺「车队」');
});
test('HTML 筛选下拉含「车队」', () => {
    const seg = HTML.slice(HTML.indexOf('<select id="filterArea"'));
    assert.ok(/<option value="车队">车队<\/option>/.test(seg.slice(0, 700)), '筛选片区下拉缺「车队」');
});
test('script.js 已无重复的片区选项定义', () => {
    assert.ok(!JS.includes('const defaultOptions = ['), '仍存在重复的 defaultOptions 定义');
    assert.ok(!JS.includes('const greeneryOptions = ['), '仍存在重复的 greeneryOptions 定义');
});
test('编辑回填走 fillAreaSelect 且开启 keepLegacy', () => {
    const seg = JS.slice(JS.indexOf('function editEmployee'));
    assert.ok(/fillAreaSelect\([\s\S]{0,200}?employee\.area\s*,\s*true\)/.test(seg.slice(0, 4000)), '编辑未使用保底回填');
});
test('列表渲染时同步筛选下拉选项', () => {
    const seg = JS.slice(JS.indexOf('function renderEmployeeList'));
    assert.ok(seg.slice(0, 500).includes('syncFilterAreaOptions();'), 'renderEmployeeList 未同步筛选下拉');
});
test('保存逻辑对找不到原记录做兜底', () => {
    assert.ok(JS.includes('原记录已不存在，已作为新记录保存'), '缺少 findIndex 兜底提示');
    assert.ok(/\(\(employees\.find\(emp => emp\.id === employeeId\) \|\| \{\}\)\.createdAt/.test(JS), 'createdAt 取原记录时无空值兜底');
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
