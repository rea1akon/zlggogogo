// 端到端冒烟：用两份真实标准文件验证导入解析 + 两仓库合并（不写任何文件）
// 用法：node cloudflare/tools/smoke-warehouse-import.mjs
import { createRequire } from 'node:module';
import { existsSync } from 'node:fs';

const require = createRequire(import.meta.url);
const XLSX = require('xlsx');

const FILES = [
  'C:/Users/rea1akon/Desktop/8月材料库存（庄骆贵仓库）.xlsx',
  'C:/Users/rea1akon/Desktop/材料库存202608（环卫仓库）.xlsx'
];

// 与 script.js 中 whResolveWarehouse 完全一致的判定规则
function whResolveWarehouse(fileName) {
  const name = String(fileName || '');
  if (name.indexOf('环卫') > -1) return 'CK002';
  if (name.indexOf('庄骆贵') > -1 || name.indexOf('片所') > -1) return 'CK001';
  return 'CK001';
}

// 与 script.js 中 whImportExcel 的解析规则一致
function parseFile(path, fileName) {
  const targetWh = whResolveWarehouse(fileName);
  const wb = XLSX.read(require('node:fs').readFileSync(path), { cellNF: true, cellText: true });
  let monthSheets = wb.SheetNames.filter(s => /^\d{6}$/.test(String(s).trim()));
  if (monthSheets.length === 0) monthSheets = wb.SheetNames;

  const months = [];
  for (const sName of monthSheets) {
    const rows = XLSX.utils.sheet_to_json(wb.Sheets[sName], { header: 1, defval: '' });
    if (!rows || rows.length < 4) continue;
    const data = [];
    for (let i = 3; i < rows.length; i++) {
      const row = rows[i];
      if (!row || row.length < 4) continue;
      const materialCode = row[2] ? String(row[2]).trim() : '';
      const materialName = row[3] ? String(row[3]).trim() : '';
      if (materialCode === '合计' || materialName === '合计') continue;
      if (!materialCode && !materialName) continue;
      data.push({
        warehouse: targetWh,
        materialCode,
        materialName,
        unit: row[5] ? String(row[5]).trim() : '',
        beginQty: Number(row[6]) || 0,
        endQty: Number(row[15]) || 0,
        endAmount: Number(row[17]) || 0
      });
    }
    if (data.length) months.push({ month: String(sName).trim(), data, warehouse: targetWh });
  }
  return { targetWh, months };
}

// 与 script.js 中导入合并规则一致
function mergeInto(all, imported) {
  let added = 0, replaced = 0, newMonths = 0;
  imported.forEach(im => {
    const idx = all.findIndex(m => m.month === im.month);
    if (idx === -1) { all.push({ month: im.month, data: im.data }); newMonths++; }
    else {
      const kept = all[idx].data.filter(r => (r.warehouse || 'CK001') !== im.warehouse);
      replaced += all[idx].data.length - kept.length;
      all[idx].data = kept.concat(im.data);
    }
    added += im.data.length;
  });
  return { added, replaced, newMonths };
}

let fail = 0;
function assert(name, cond, extra = '') {
  if (!cond) fail++;
  console.log(`${cond ? 'PASS' : 'FAIL'} | ${name}${extra ? ' | ' + extra : ''}`);
}

// 空物料编码行是否被正确处理，是这次适配的关键点
let store = [];
for (const path of FILES) {
  if (!existsSync(path)) { console.log('SKIP | 文件不存在：' + path); continue; }
  const fileName = path.split('/').pop();
  const { targetWh, months } = parseFile(path, fileName);
  console.log(`\n== ${fileName} → 仓库 ${targetWh} ==`);
  months.forEach(m => console.log(`   ${m.month}: ${m.data.length} 条`));
  const total = months.reduce((s, m) => s + m.data.length, 0);
  assert('解析出 8 个月份', months.length === 8, `实际 ${months.length}`);
  assert('解析出有效数据行', total > 0, `合计 ${total} 条`);
  const r = mergeInto(store, months);
  console.log(`   合并：新增 ${r.added} 条，替换 ${r.replaced} 条，新增月份 ${r.newMonths} 个`);
}

// 合并结果校验
const m608 = store.find(m => m.month === '202608');
console.log('\n== 合并后 202608 ==');
console.log('   总行数:', m608 ? m608.data.length : 0);
if (m608) {
  const c1 = m608.data.filter(r => (r.warehouse || 'CK001') === 'CK001').length;
  const c2 = m608.data.filter(r => r.warehouse === 'CK002').length;
  console.log(`   片所本级仓库: ${c1} 条 / 环卫仓库: ${c2} 条`);
  assert('两个仓库数据共存（导入第二个文件未覆盖第一个）', c1 > 0 && c2 > 0);
}
assert('月份总数为 8', store.length === 8, `实际 ${store.length}`);
const noCodeRows = store.reduce((s, m) => s + m.data.filter(r => !r.materialCode).length, 0);
assert('兼容空物料编码的行（庄骆贵仓库）', noCodeRows > 0, `共 ${noCodeRows} 条`);

console.log(fail === 0 ? '\n冒烟测试全部通过' : `\n有 ${fail} 例失败`);
process.exit(fail === 0 ? 0 : 1);
