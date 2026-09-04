/* 云存储适配器 —— 让原版单机系统具备多设备数据同步能力
 *
 * 原理（不改动原系统任何业务代码）：
 *   1. 页面加载时，用同步请求把云端数据预填进本地存储，之后原系统照常读取
 *   2. 拦截本地存储的写入操作，变更自动同步到云端数据库
 *   3. 定时拉取云端最新数据，实现多设备之间的一致性
 */
(function () {
  'use strict';

  var NS = 'zlg';
  var API = '/api';
  var PWD_KEY = 'adminPassword';
  var PULL_INTERVAL = 45000;

  var SYNC_KEYS = [
    'hr_management_employees', 'hr_management_auth', 'hr_management_local_data',
    'vehicle_info_data', 'vehicle_repair_data', 'vehicle_mileage_data', 'vehicle_import_history',
    'toilet_data', 'toilet_import_history',
    'project_data', 'project_import_history',
    'business_municipal_data', 'business_greenery_data', 'business_sanitation_data',
    'warehouse_all_months_data', 'warehouse_search_history', 'import_history',
    'adminPassword'
  ];

  var SYNC_SET = {};
  SYNC_KEYS.forEach(function (k) { SYNC_SET[k] = true; });

  var token = null;
  var dirty = Object.create(null);
  var timer = null;
  var syncing = false;
  var online = false;
  var lastError = '';

  // ---------- 基础工具 ----------

  function safeParse(text) {
    if (text === null || text === undefined) return null;
    try { return JSON.parse(text); } catch (e) { return text; }
  }

  // 同步请求：必须在原系统脚本执行前拿到数据，因此不能用异步
  function syncGet(url) {
    try {
      var xhr = new XMLHttpRequest();
      xhr.open('GET', url, false);
      xhr.setRequestHeader('Accept', 'application/json');
      xhr.timeout = 15000;
      xhr.send(null);
      if (xhr.status >= 200 && xhr.status < 300) return JSON.parse(xhr.responseText);
      return null;
    } catch (e) {
      return null;
    }
  }

  function request(method, path, body, withAuth) {
    var headers = { 'Content-Type': 'application/json' };
    if (withAuth && token) headers['Authorization'] = 'Bearer ' + token;
    return fetch(API + path, {
      method: method,
      headers: headers,
      body: body === undefined ? undefined : JSON.stringify(body)
    }).then(function (r) { return r.json(); });
  }

  // ---------- 状态提示 ----------

  var badge = null;

  function ensureBadge() {
    if (badge) return badge;
    try {
      badge = document.createElement('div');
      badge.style.cssText =
        'position:fixed;right:14px;bottom:14px;z-index:99999;padding:6px 12px;' +
        'border-radius:999px;font-size:12px;font-family:"Microsoft YaHei",sans-serif;' +
        'background:rgba(10,14,26,.82);color:#c8d6e5;border:1px solid rgba(79,195,247,.35);' +
        'backdrop-filter:blur(6px);cursor:default;user-select:none;';
      document.body.appendChild(badge);
    } catch (e) { /* 忽略 */ }
    return badge;
  }

  function setStatus(state) {
    var el = ensureBadge();
    if (!el) return;
    var text = '云端同步';
    var color = '#4fc3f7';
    if (state === 'syncing') { text = '同步中…'; color = '#ffb74d'; }
    else if (state === 'ok') { text = '已同步 ' + new Date().toTimeString().slice(0, 5); color = '#66bb6a'; }
    else if (state === 'error') { text = '同步失败'; color = '#ef5350'; }
    else if (state === 'offline') { text = '离线模式'; color = '#9e9e9e'; }
    el.textContent = text;
    el.style.color = color;
    el.title = lastError || '数据自动同步到云端';
  }

  // ---------- 拉取云端数据 ----------

  function pullAll() {
    var res = syncGet(API + '/kv/' + NS + '?keys=' + encodeURIComponent(SYNC_KEYS.join(',')));
    if (!res || !res.ok || !res.data) return false;
    var items = (res.data && res.data.items) || [];
    for (var i = 0; i < items.length; i++) {
      var it = items[i];
      if (!it || !it.ok || it.value === null || it.value === undefined) continue;
      if (Object.prototype.hasOwnProperty.call(dirty, it.key)) continue; // 本地有未提交改动，不覆盖
      // 直接调用原始方法写入，避免把云端数据当作本地改动再次提交
      try { origSetItem.call(localStorage, it.key, JSON.stringify(it.value)); } catch (e) { /* 容量不足时忽略 */ }
    }
    return true;
  }

  // ---------- 拦截本地写入 ----------

  var origSetItem = Storage.prototype.setItem;
  var origRemoveItem = Storage.prototype.removeItem;

  Storage.prototype.setItem = function (key, value) {
    origSetItem.call(this, key, value);
    if (this === localStorage && SYNC_SET[key]) markDirty(key);
  };

  Storage.prototype.removeItem = function (key) {
    origRemoveItem.call(this, key);
    if (this === localStorage && SYNC_SET[key]) markDirty(key);
  };

  function markDirty(key) {
    dirty[key] = true;
    scheduleFlush();
  }

  function scheduleFlush() {
    if (!online) return;
    if (timer) clearTimeout(timer);
    timer = setTimeout(flush, 1200);
  }

  // ---------- 登录与提交 ----------

  function currentPassword() {
    try { return localStorage.getItem(PWD_KEY) || ''; } catch (e) { return ''; }
  }

  function ensureToken() {
    if (token) return Promise.resolve(token);
    var pwd = currentPassword();
    if (!pwd) return Promise.reject(new Error('尚未设置云端管理口令'));
    return request('POST', '/auth/login', { username: 'admin', password: pwd }, false)
      .then(function (j) {
        if (!j || !j.ok) throw new Error((j && j.error && j.error.message) || '云端登录失败');
        token = j.data.token;
        return token;
      });
  }

  function putKey(key) {
    var raw;
    try { raw = localStorage.getItem(key); } catch (e) { raw = null; }
    return request('PUT', '/kv/' + NS + '/' + encodeURIComponent(key), { value: safeParse(raw) }, true)
      .then(function (j) {
        if (!j || !j.ok) throw new Error((j && j.error && j.error.message) || '写入失败');
        delete dirty[key];
      });
  }

  function flush() {
    if (syncing) return Promise.resolve();
    var keys = Object.keys(dirty);
    if (!keys.length) return Promise.resolve();

    syncing = true;
    setStatus('syncing');

    return ensureToken()
      .then(function () {
        var queue = keys.slice();
        function next() {
          if (!queue.length) return Promise.resolve();
          var k = queue.shift();
          return putKey(k).then(next);
        }
        return next();
      })
      .then(function () { lastError = ''; setStatus('ok'); })
      .catch(function (err) {
        lastError = err && err.message ? err.message : '未知错误';
        token = null;
        setStatus('error');
      })
      .then(function () { syncing = false; });
  }

  // ---------- 首次使用：设置云端管理口令 ----------

  function showSetupPanel() {
    try {
      if (document.getElementById('__cloudSetup')) return;

      var wrap = document.createElement('div');
      wrap.id = '__cloudSetup';
      wrap.style.cssText =
        'position:fixed;inset:0;z-index:100000;display:flex;align-items:center;justify-content:center;' +
        'background:rgba(6,10,20,.92);font-family:"Microsoft YaHei",sans-serif;';

      var box = document.createElement('div');
      box.style.cssText =
        'width:340px;padding:26px;border-radius:12px;background:#111827;border:1px solid rgba(79,195,247,.3);' +
        'box-shadow:0 18px 50px rgba(0,0,0,.6);color:#c8d6e5;';

      box.innerHTML =
        '<h3 style="margin:0 0 8px;font-size:16px;color:#4fc3f7;font-weight:600;">首次使用云端版</h3>' +
        '<p style="margin:0 0 16px;font-size:13px;line-height:1.7;color:#9fb3c8;">' +
        '设置一个管理口令，用于保护云端数据。设置后请牢记，其他设备也用它登录。</p>' +
        '<input id="__cloudPwd" type="password" placeholder="口令至少 6 位" ' +
        'style="width:100%;box-sizing:border-box;padding:10px;border-radius:6px;' +
        'border:1px solid #2b3a52;background:#0a0e1a;color:#e6f1fb;font-size:14px;outline:none;" />' +
        '<div id="__cloudErr" style="min-height:18px;margin-top:8px;font-size:12px;color:#ef5350;"></div>' +
        '<button id="__cloudOk" style="width:100%;padding:10px;border:none;border-radius:6px;' +
        'background:#1976d2;color:#fff;font-size:14px;cursor:pointer;">确定并启用云端同步</button>';

      wrap.appendChild(box);
      document.body.appendChild(wrap);

      var input = box.querySelector('#__cloudPwd');
      var err = box.querySelector('#__cloudErr');
      var btn = box.querySelector('#__cloudOk');

      input.focus();

      function submit() {
        var pwd = (input.value || '').trim();
        if (pwd.length < 6) { err.textContent = '口令至少 6 位'; return; }
        btn.disabled = true;
        btn.textContent = '处理中…';

        // 先尝试首次初始化，若系统已初始化则改用登录验证
        request('POST', '/auth/bootstrap', { username: 'admin', password: pwd }, false)
          .catch(function () { return null; })
          .then(function (j) {
            if (j && j.ok && j.data) { token = j.data.token; return true; }
            return request('POST', '/auth/login', { username: 'admin', password: pwd }, false)
              .then(function (r) {
                if (!r || !r.ok) throw new Error((r && r.error && r.error.message) || '口令不正确');
                token = r.data.token;
                return true;
              });
          })
          .then(function () {
            try { localStorage.setItem(PWD_KEY, pwd); } catch (e) { /* 忽略 */ }
            wrap.parentNode && wrap.parentNode.removeChild(wrap);
            setStatus('ok');
          })
          .catch(function (e) {
            err.textContent = (e && e.message) || '设置失败，请重试';
            btn.disabled = false;
            btn.textContent = '确定并启用云端同步';
          });
      }

      btn.addEventListener('click', submit);
      input.addEventListener('keydown', function (e) { if (e.key === 'Enter') submit(); });
    } catch (e) { /* 忽略 */ }
  }

  // ---------- 启动 ----------

  function boot() {
    try {
      online = pullAll();
      setStatus(online ? 'ok' : 'offline');

      if (online) {
        if (!currentPassword()) showSetupPanel();

        setInterval(function () {
          if (syncing) return;
          if (pullAll()) setStatus('ok');
        }, PULL_INTERVAL);

        window.addEventListener('beforeunload', function () {
          if (Object.keys(dirty).length) flush();
        });
      }
    } catch (e) {
      online = false;
      setStatus('offline');
    }
  }

  window.CloudSync = {
    flush: flush,
    pull: pullAll,
    isOnline: function () { return online; },
    status: function () { return { online: online, pending: Object.keys(dirty).length, error: lastError }; }
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
