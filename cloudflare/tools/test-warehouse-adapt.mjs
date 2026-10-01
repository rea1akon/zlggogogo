// 仓库模块适配 + 街道筛选 逻辑单测（Node 运行，不依赖浏览器）
// 用法：node cloudflare/tools/test-warehouse-adapt.mjs
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url));
const SCRIPT = join(HERE, '..', '..', 'script.js');
const src = readFileSync(SCRIPT, 'utf8');

function slice(startMarker, endMarker, name) {
  const s = src.indexOf(startMarker);
  if (s === -1) throw new Error(`无法定位起始片段：${name}`);
  const e = src.indexOf(endMarker, s + 1);
  if (e === -1) throw new Error(`无法定位结束片段：${name}`);
  return src.slice(s, e);
}

// 抽取待测代码片段
const whBlock = slice('/* ========== 仓库维度适配', '/* ========== ', '仓库适配块');
const streetBlock = slice('// 街道名称归一化', 'function getFilteredToiletData', '街道工具块');

// 最小桩环境
const sandbox = {
  whAllMonthsData: [],
  whCurrentMonth: '202608',
  document: { getElementById: () => null },
  // 桩：与 script.js 中同名函数行为一致
  getCurrentMonthWarehouseData: function () {
    const m = sandbox.whAllMonthsData.find(x => x.month === sandbox.whCurrentMonth);
    return m ? m.data : [];
  }
};
const factory = new Function('ctx', `
  const WH_HOLDER = {};
  with (ctx) {
    ${streetBlock}
    ${whBlock}
    return { normalizeStreetName, streetIsSame, whResolveWarehouse, whWarehouseName, whRowWarehouse, whRenumberMonth, whScopeData, whScopePairs, WH_WAREHOUSES, setWarehouse: function (v) { whCurrentWarehouse = v; } };
  }
`);
const api = factory(sandbox);

let fail = 0;
function check(name, got, expect) {
  const g = JSON.stringify(got);
  const e = JSON.stringify(expect);
  const ok = g === e;
  if (!ok) fail++;
  console.log(`${ok ? 'PASS' : 'FAIL'} | ${name}${ok ? '' : ` (期望 ${e}，实际 ${g})`}`);
}

// ---- 1. 街道名称容错 ----
check('街道归一化-去后缀', api.normalizeStreetName('庄市街道'), '庄市');
check('街道归一化-无后缀', api.normalizeStreetName('骆驼'), '骆驼');
check('街道匹配-带后缀 vs 无后缀', api.streetIsSame('庄市街道', '庄市'), true);
check('街道匹配-同形', api.streetIsSame('贵驷街道', '贵驷街道'), true);
check('街道匹配-不同街道', api.streetIsSame('贵驷街道', '骆驼街道'), false);
check('街道匹配-空值', api.streetIsSame('', '庄市'), false);

// ---- 2. 仓库判定：靠文件名区分（两文件表内都是 CK001） ----
check('文件名-环卫', api.whResolveWarehouse('材料库存202608（环卫仓库）.xlsx', 'CK001'), 'CK002');
check('文件名-庄骆贵', api.whResolveWarehouse('8月材料库存（庄骆贵仓库）.xlsx', 'CK001'), 'CK001');
check('文件名-片所', api.whResolveWarehouse('片所本级库存.xlsx', ''), 'CK001');
check('文件名无关键词-回退表内CK002', api.whResolveWarehouse('库存.xlsx', 'CK002'), 'CK002');
check('文件名无关键词-回退表内空', api.whResolveWarehouse('库存.xlsx', ''), 'CK001');
check('仓库名映射', api.whWarehouseName('CK002'), '环卫仓库');
check('仓库名映射-未知编码', api.whWarehouseName('CK999'), 'CK999');

// ---- 3. 序号按仓库各自编号 ----
const monthEntry = {
  month: '202608',
  data: [
    { warehouse: 'CK001', materialName: 'A' },
    { warehouse: 'CK002', materialName: 'B' },
    { warehouse: 'CK001', materialName: 'C' },
    { warehouse: 'CK002', materialName: 'D' }
  ]
};
api.whRenumberMonth(monthEntry);
check('分仓序号-CK001第一条', monthEntry.data[0].serial, 1);
check('分仓序号-CK002第一条', monthEntry.data[1].serial, 1);
check('分仓序号-CK001第二条', monthEntry.data[2].serial, 2);
check('分仓序号-CK002第二条', monthEntry.data[3].serial, 2);

// ---- 4. 合并导入：导入环卫仓库不能覆盖片所本级仓库（数据安全核心） ----
function mergeImport(all, imported) {
  imported.forEach(im => {
    const idx = all.findIndex(m => m.month === im.month);
    if (idx === -1) all.push({ month: im.month, data: im.data });
    else {
      const kept = all[idx].data.filter(r => (r.warehouse || 'CK001') !== im.warehouse);
      all[idx].data = kept.concat(im.data);
    }
  });
  return all;
}
let store = [{ month: '202608', data: [{ warehouse: 'CK001', materialName: '拖把', endQty: 5 }] }];
store = mergeImport(store, [{ month: '202608', warehouse: 'CK002', data: [{ warehouse: 'CK002', materialName: '扫把', endQty: 100 }] }]);
check('合并导入-月份仍为1个', store.length, 1);
check('合并导入-片所数据保留', store[0].data.filter(r => r.warehouse === 'CK001').length, 1);
check('合并导入-环卫数据入库', store[0].data.filter(r => r.warehouse === 'CK002').length, 1);

// 同仓库重复导入：替换而非叠加
store = mergeImport(store, [{ month: '202608', warehouse: 'CK002', data: [{ warehouse: 'CK002', materialName: '扫把(更新)', endQty: 88 }] }]);
check('重复导入-同仓库仅保留最新', store[0].data.filter(r => r.warehouse === 'CK002').length, 1);
check('重复导入-片所数据未受影响', store[0].data.filter(r => r.warehouse === 'CK001').length, 1);

// 新月份追加
store = mergeImport(store, [{ month: '202609', warehouse: 'CK002', data: [{ warehouse: 'CK002', materialName: '垃圾桶', endQty: 3 }] }]);
check('新月份追加', store.length, 2);

// ---- 5. 作用域筛选 ----
sandbox.whAllMonthsData = [{ month: '202608', data: [{ warehouse: 'CK001', endAmount: 10 }, { warehouse: 'CK002', endAmount: 20 }] }];
api.setWarehouse('all');
check('全部仓库-数量', api.whScopeData().length, 2);
api.setWarehouse('CK002');
check('筛选环卫-数量', api.whScopeData().length, 1);
check('筛选环卫-金额', api.whScopeData()[0].endAmount, 20);
check('筛选环卫-原始下标保留', api.whScopePairs()[0].idx, 1);
api.setWarehouse('CK001');
check('筛选片所-数量', api.whScopeData().length, 1);
check('筛选片所-金额', api.whScopeData()[0].endAmount, 10);

console.log(fail === 0 ? '\n全部通过' : `\n有 ${fail} 例失败`);
process.exit(fail === 0 ? 0 : 1);
