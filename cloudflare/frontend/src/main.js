import { api, API_BASE, getToken, setToken, ApiError } from './api.js';

// ---------- 字段中文名 ----------
const LABELS = {
  id: 'ID', name: '名称', code: '编号', gender: '性别', id_card: '身份证号', birth_date: '出生日期',
  age: '年龄', phone: '联系电话', native_place: '籍贯', position: '岗位', area: '所在片区',
  employment_type: '用工性质', hire_date: '入职时间', address: '家庭住址', remark: '备注',
  plate_no: '车牌号', vehicle_type: '车辆类型', model: '型号', driver_name: '驾驶员',
  driver_phone: '驾驶员电话', status: '状态', mileage: '里程(km)', last_maintain_at: '上次保养',
  next_maintain_at: '下次保养', category: '分类', spec: '规格', unit: '单位', quantity: '库存',
  min_stock: '预警库存', unit_price: '单价', location: '存放位置', manager: '负责人',
  contractor: '施工单位', start_date: '开始日期', end_date: '结束日期', budget: '预算',
  progress: '进度(%)', record_no: '记录编号', record_type: '记录类型', road_name: '道路名称',
  content: '内容', amount: '金额', occurred_at: '发生时间', operator: '经办人',
  created_at: '创建时间', updated_at: '更新时间',
};
const label = (k) => LABELS[k] || k;
const STATUS_TEXT = { idle: '空闲', working: '作业中', maintenance: '维修中', scrapped: '已报废',
  planned: '计划中', ongoing: '进行中', paused: '暂停', done: '已完成', archived: '已归档',
  pending: '待处理', processing: '处理中', rejected: '已驳回', active: '正常', disabled: '停用' };

// ---------- 状态 ----------
const state = {
  resources: [],
  current: null,
  limit: 10,
  offset: 0,
  total: 0,
  user: null,
};

// ---------- DOM ----------
const $ = (id) => document.getElementById(id);
const els = {
  healthDot: $('healthDot'), healthText: $('healthText'), envBadge: $('envBadge'),
  username: $('username'), password: $('password'), loginBtn: $('loginBtn'),
  logoutBtn: $('logoutBtn'), userInfo: $('userInfo'),
  tabs: $('tabs'), search: $('search'), filterField: $('filterField'), filterValue: $('filterValue'),
  reloadBtn: $('reloadBtn'), totalText: $('totalText'), table: $('dataTable'),
  prevBtn: $('prevBtn'), nextBtn: $('nextBtn'), pageText: $('pageText'),
  createForm: $('createForm'), createBtn: $('createBtn'), resetBtn: $('resetBtn'),
  kvNs: $('kvNs'), kvKey: $('kvKey'), kvValue: $('kvValue'), kvOut: $('kvOut'),
  kvGetBtn: $('kvGetBtn'), kvPutBtn: $('kvPutBtn'), kvDelBtn: $('kvDelBtn'), kvListBtn: $('kvListBtn'),
  toast: $('toast'),
};

// ---------- 提示 ----------
let toastTimer;
function toast(msg, type = 'info') {
  els.toast.textContent = msg;
  els.toast.className = `toast show ${type}`;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => (els.toast.className = 'toast'), 3200);
}
function errText(err) {
  if (err instanceof ApiError) {
    const d = Array.isArray(err.details) && err.details.length
      ? `（${err.details.map((x) => `${label(x.field)}: ${x.message}`).join('；')}）`
      : '';
    return `[${err.status} ${err.code}] ${err.message}${d}`;
  }
  return err.message || '未知错误';
}

// ---------- 初始化 ----------
async function initHealth() {
  try {
    const r = await api.health();
    els.healthDot.className = 'dot online';
    els.healthText.textContent = `接口正常 · D1 ${r.data.db === 'connected' ? '已连接' : '未连接'} · ${r.data.version}`;
    els.envBadge.textContent = r.data.environment || 'dev';
  } catch (err) {
    els.healthDot.className = 'dot offline';
    els.healthText.textContent = `接口不可用：${errText(err)}`;
  }
}

async function initMeta() {
  const r = await api.meta();
  state.resources = r.data.resources;
  state.current = state.resources[0];
  renderTabs();
  renderFilterFields();
  renderForm();
  await loadList();
}

function renderTabs() {
  els.tabs.innerHTML = state.resources
    .map((r) => `<button class="tab${r.key === state.current?.key ? ' active' : ''}" data-key="${r.key}">${r.label}</button>`)
    .join('');
  els.tabs.querySelectorAll('.tab').forEach((btn) =>
    btn.addEventListener('click', () => {
      state.current = state.resources.find((r) => r.key === btn.dataset.key);
      state.offset = 0;
      renderTabs();
      renderFilterFields();
      renderForm();
      loadList();
    })
  );
}

function renderFilterFields() {
  const fs = state.current?.filterFields || [];
  els.filterField.innerHTML = ['<option value="">筛选字段</option>']
    .concat(fs.map((f) => `<option value="${f}">${label(f)}</option>`))
    .join('');
  els.filterValue.innerHTML = '<option value="">全部</option>';
  const field = els.filterField.value;
  if (field) {
    const spec = state.current.fields.find((f) => f.name === field);
    if (spec?.values) {
      els.filterValue.innerHTML = ['<option value="">全部</option>']
        .concat(spec.values.map((v) => `<option value="${v}">${STATUS_TEXT[v] || v}</option>`))
        .join('');
    }
  }
}

// ---------- 列表 ----------
async function loadList() {
  const res = state.current;
  if (!res) return;
  const params = { limit: state.limit, offset: state.offset, sort: 'id', order: 'desc' };
  const q = els.search.value.trim();
  if (q) params.q = q;
  const ff = els.filterField.value;
  const fv = els.filterValue.value;
  if (ff && fv) params[ff] = fv;

  try {
    const r = await api.list(res.key, params);
    state.total = r.meta?.total ?? 0;
    renderTable(res, r.data);
    els.totalText.textContent = `共 ${state.total} 条`;
    const page = Math.floor(state.offset / state.limit) + 1;
    els.pageText.textContent = `第 ${page} / ${Math.max(Math.ceil(state.total / state.limit), 1)} 页`;
    els.prevBtn.disabled = state.offset === 0;
    els.nextBtn.disabled = state.offset + state.limit >= state.total;
  } catch (err) {
    toast(errText(err), 'error');
  }
}

function renderTable(res, rows) {
  const cols = res.fields.slice(0, 5).map((f) => f.name);
  const head = ['ID', ...cols.map(label), '创建时间', '操作'];
  els.table.querySelector('thead').innerHTML = `<tr>${head.map((h) => `<th>${h}</th>`).join('')}</tr>`;

  if (!rows.length) {
    els.table.querySelector('tbody').innerHTML = `<tr><td colspan="${head.length}" class="empty">暂无数据</td></tr>`;
    return;
  }

  els.table.querySelector('tbody').innerHTML = rows
    .map((row) => {
      const cells = cols.map((c) => {
        let v = row[c];
        if (v === null || v === undefined || v === '') v = '—';
        if (STATUS_TEXT[v]) v = STATUS_TEXT[v];
        return `<td>${escapeHtml(String(v))}</td>`;
      });
      return `<tr>
        <td class="mono">${row.id}</td>${cells.join('')}
        <td class="mono small">${(row.created_at || '').replace('T', ' ').slice(0, 19)}</td>
        <td><button class="link danger" data-del="${row.id}">删除</button></td>
      </tr>`;
    })
    .join('');

  els.table.querySelectorAll('[data-del]').forEach((btn) =>
    btn.addEventListener('click', async () => {
      if (!confirm(`确认删除 #${btn.dataset.del}？（软删除，数据仍保留在库中）`)) return;
      try {
        await api.remove(state.current.key, btn.dataset.del);
        toast('删除成功', 'success');
        loadList();
      } catch (err) {
        toast(errText(err), 'error');
      }
    })
  );
}

function escapeHtml(s) {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
}

// ---------- 新增表单 ----------
function renderForm() {
  const res = state.current;
  if (!res) return;
  els.createForm.innerHTML = res.fields
    .map((f) => {
      const required = f.required ? '<span class="req">*</span>' : '';
      let input;
      if (f.values) {
        input = `<select name="${f.name}"><option value="">请选择</option>${f.values
          .map((v) => `<option value="${v}">${STATUS_TEXT[v] || v}</option>`)
          .join('')}</select>`;
      } else if (f.type === 'date') {
        input = `<input type="date" name="${f.name}" />`;
      } else if (f.type === 'integer' || f.type === 'real') {
        input = `<input type="number" name="${f.name}" step="${f.type === 'real' ? '0.01' : '1'}" />`;
      } else if (['remark', 'content', 'address'].includes(f.name)) {
        input = `<textarea name="${f.name}" rows="2"></textarea>`;
      } else {
        input = `<input type="text" name="${f.name}" />`;
      }
      return `<label><span>${label(f.name)}${required}</span>${input}</label>`;
    })
    .join('');
}

function collectForm() {
  const body = {};
  els.createForm.querySelectorAll('[name]').forEach((el) => {
    const v = el.value.trim();
    if (v !== '') body[el.name] = v;
  });
  return body;
}

// ---------- 登录 ----------
async function doLogin() {
  try {
    const r = await api.login(els.username.value.trim(), els.password.value);
    setToken(r.data.token);
    state.user = r.data.user;
    els.userInfo.textContent = `已登录：${r.data.user.display_name}（${r.data.user.username} · ${r.data.user.role}）`;
    els.logoutBtn.classList.remove('hidden');
    els.loginBtn.textContent = '重新登录';
    toast('登录成功', 'success');
  } catch (err) {
    toast(errText(err), 'error');
  }
}

async function doLogout() {
  try {
    await api.logout();
  } finally {
    setToken('');
    state.user = null;
    els.userInfo.textContent = '已退出登录';
    els.logoutBtn.classList.add('hidden');
    els.loginBtn.textContent = '登录';
  }
}

// ---------- KV ----------
async function kvGet() {
  try {
    const r = await api.kvGet(els.kvNs.value.trim(), els.kvKey.value.trim());
    els.kvValue.value = JSON.stringify(r.data.value, null, 2);
    els.kvOut.textContent = JSON.stringify(r.data, null, 2);
    toast('读取成功', 'success');
  } catch (err) {
    els.kvOut.textContent = errText(err);
    toast(errText(err), 'error');
  }
}

async function kvPut() {
  let value;
  try {
    value = JSON.parse(els.kvValue.value || 'null');
  } catch {
    toast('值必须是合法 JSON', 'error');
    return;
  }
  try {
    const r = await api.kvPut(els.kvNs.value.trim(), els.kvKey.value.trim(), value);
    els.kvOut.textContent = JSON.stringify(r.data, null, 2);
    toast('写入成功', 'success');
  } catch (err) {
    els.kvOut.textContent = errText(err);
    toast(errText(err), 'error');
  }
}

// ---------- 事件绑定 ----------
els.loginBtn.addEventListener('click', doLogin);
els.logoutBtn.addEventListener('click', doLogout);
els.reloadBtn.addEventListener('click', () => loadList());

let searchTimer;
els.search.addEventListener('input', () => {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => {
    state.offset = 0;
    loadList();
  }, 300);
});
els.filterField.addEventListener('change', () => {
  renderFilterFields();
  state.offset = 0;
  loadList();
});
els.filterValue.addEventListener('change', () => {
  state.offset = 0;
  loadList();
});
els.prevBtn.addEventListener('click', () => {
  state.offset = Math.max(0, state.offset - state.limit);
  loadList();
});
els.nextBtn.addEventListener('click', () => {
  state.offset += state.limit;
  loadList();
});
els.createBtn.addEventListener('click', async () => {
  try {
    const r = await api.create(state.current.key, collectForm());
    toast(`新增成功，ID=${r.data?.id}`, 'success');
    els.createForm.querySelectorAll('[name]').forEach((el) => (el.value = ''));
    state.offset = 0;
    loadList();
  } catch (err) {
    toast(errText(err), 'error');
  }
});
els.resetBtn.addEventListener('click', () => els.createForm.querySelectorAll('[name]').forEach((el) => (el.value = '')));
els.kvGetBtn.addEventListener('click', kvGet);
els.kvPutBtn.addEventListener('click', kvPut);
els.kvDelBtn.addEventListener('click', async () => {
  try {
    await api.kvDel(els.kvNs.value.trim(), els.kvKey.value.trim());
    els.kvOut.textContent = '已删除';
    toast('删除成功', 'success');
  } catch (err) {
    toast(errText(err), 'error');
  }
});
els.kvListBtn.addEventListener('click', async () => {
  try {
    const r = await api.kvList(els.kvNs.value.trim());
    els.kvOut.textContent = JSON.stringify(r.data, null, 2);
  } catch (err) {
    toast(errText(err), 'error');
  }
});

// ---------- 启动 ----------
(async function boot() {
  console.log(`[zlg] API_BASE = ${API_BASE}`);
  await initHealth();
  try {
    await initMeta();
  } catch (err) {
    toast(`元数据加载失败：${errText(err)}`, 'error');
  }
  if (getToken()) {
    try {
      const r = await api.me();
      state.user = r.data.user;
      els.userInfo.textContent = `已登录：${r.data.user.display_name}（${r.data.user.username}）`;
      els.logoutBtn.classList.remove('hidden');
      els.loginBtn.textContent = '重新登录';
    } catch {
      setToken('');
    }
  }
})();
