/* 云存储适配器 v2 —— 让原版单机系统具备多设备数据同步能力
 *
 * 原理（不改动原系统任何业务代码）：
 *   1. 页面加载时，用同步请求把云端数据预填进本地存储，之后原系统照常读取
 *   2. 拦截本地存储的写入操作，变更自动同步到云端数据库
 *   3. 定时拉取云端最新数据，实现多设备之间的一致性
 *
 * v2 修复：
 *   - 管理口令不再同步到云端（读取接口为公开可读，明文口令会泄露），改为各设备本地保存
 *   - 口令门改为强制阻塞，未通过验证前系统不可用，避免静默降级成单机模式
 *   - 口令验证通过后全量上传本地数据，实现旧单机数据的一键迁移
 *   - 同步失败可见：连续失败会弹出提示条，而不是只改徽章颜色
 *   - 定时拉取改为异步，避免同步 XHR 卡住界面
 */
(function () {
  'use strict';

  var NS = 'zlg';
  var API = '/api';
  var PWD_KEY = 'adminPassword'; // 仅保存在本地，绝不上云
  var PULL_INTERVAL = 30000;
  var FLUSH_DELAY = 1000;
  var MAX_FAIL = 3;

  // 需要跨设备同步的业务数据键，与原系统 script.js 中的常量一一对应
  var SYNC_KEYS = [
    'hr_management_employees', 'hr_management_auth', 'hr_management_local_data',
    'vehicle_info_data', 'vehicle_repair_data', 'vehicle_mileage_data', 'vehicle_import_history',
    'toilet_data', 'toilet_import_history',
    'project_data', 'project_import_history',
    'business_municipal_data', 'business_greenery_data', 'business_sanitation_data',
    'warehouse_all_months_data', 'warehouse_search_history', 'import_history'
  ];

  var SYNC_SET = Object.create(null);
  SYNC_KEYS.forEach(function (k) { SYNC_SET[k] = true; });

  var token = null;
  var dirty = Object.create(null);
  var failCount = Object.create(null);
  var timer = null;
  var syncing = false;
  var online = false;
  var lastError = '';
  var pullTimer = null;

  var origSetItem = Storage.prototype.setItem;
  var origRemoveItem = Storage.prototype.removeItem;

  // ---------- 基础工具 ----------

  function safeParse(text) {
    if (text === null || text === undefined) return null;
    try { return JSON.parse(text); } catch (e) { return text; }
  }

  // 同步请求：页面首次加载必须在原系统脚本执行前拿到数据，因此不能用异步
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

  function readServerError(j, fallback) {
    return (j && j.error && (j.error.message || j.error.text)) || (j && j.message) || fallback;
  }

  // ---------- 状态提示 ----------

  var badge = null;
  var banner = null;

  function ensureBadge() {
    if (badge) return badge;
    try {
      badge = document.createElement('div');
      badge.style.cssText =
        'position:fixed;right:14px;bottom:14px;z-index:99999;padding:6px 12px;' +
        'border-radius:999px;font-size:12px;font-family:"Microsoft YaHei",sans-serif;' +
        'background:rgba(10,14,26,.82);color:#c8d6e5;border:1px solid rgba(79,195,247,.35);' +
        'cursor:default;user-select:none;';
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

  function showBanner(message, actionLabel, onAction) {
    try {
      hideBanner();
      banner = document.createElement('div');
      banner.style.cssText =
        'position:fixed;left:50%;transform:translateX(-50%);top:16px;z-index:100001;' +
        'max-width:520px;padding:10px 16px;border-radius:8px;font-size:13px;line-height:1.6;' +
        'font-family:"Microsoft YaHei",sans-serif;background:#7f1d1d;color:#fee2e2;' +
        'border:1px solid #b91c1c;box-shadow:0 10px 30px rgba(0,0,0,.45);display:flex;' +
        'align-items:center;gap:12px;';

      var span = document.createElement('span');
      span.textContent = message;
      banner.appendChild(span);

      if (actionLabel && onAction) {
        var btn = document.createElement('button');
        btn.textContent = actionLabel;
        btn.style.cssText =
          'padding:4px 12px;border:none;border-radius:5px;background:#fee2e2;color:#7f1d1d;' +
          'font-size:12px;cursor:pointer;white-space:nowrap;';
        btn.addEventListener('click', function () { hideBanner(); onAction(); });
        banner.appendChild(btn);
      }

      var close = document.createElement('span');
      close.textContent = '×';
      close.style.cssText = 'cursor:pointer;font-size:18px;line-height:1;opacity:.7;';
      close.addEventListener('click', hideBanner);
      banner.appendChild(close);

      document.body.appendChild(banner);
    } catch (e) { /* 忽略 */ }
  }

  function hideBanner() {
    try { if (banner && banner.parentNode) banner.parentNode.removeChild(banner); } catch (e) { /* 忽略 */ }
    banner = null;
  }

  // ---------- 拉取云端数据 ----------

  function applyItems(items) {
    var changed = [];
    for (var i = 0; i < items.length; i += 1) {
      var it = items[i];
      if (!it || !it.ok || it.value === null || it.value === undefined) continue;
      // 本地有尚未提交成功的改动时，不覆盖，等它同步上去再说
      if (Object.prototype.hasOwnProperty.call(dirty, it.key)) continue;
      var next;
      try { next = JSON.stringify(it.value); } catch (e) { continue; }
      var prev = null;
      try { prev = localStorage.getItem(it.key); } catch (e) { /* 忽略 */ }
      if (prev === next) continue;
      // 走原始方法写入，避免把云端数据当成新的本地改动再次提交
      try {
        origSetItem.call(localStorage, it.key, next);
        changed.push(it.key);
      } catch (e) { /* 容量不足时忽略 */ }
    }
    return changed;
  }

  function pullAll() {
    var res = syncGet(API + '/kv/' + NS + '?keys=' + encodeURIComponent(SYNC_KEYS.join(',')));
    if (!res || !res.ok || !res.data) return false;
    applyItems(res.data.items || []);
    return true;
  }

  function pullAsync() {
    if (syncing) return;
    return fetch(API + '/kv/' + NS + '?keys=' + encodeURIComponent(SYNC_KEYS.join(','))
      + '&t=' + Date.now(), { headers: { Accept: 'application/json' } })
      .then(function (r) { return r.json(); })
      .then(function (j) {
        if (!j || !j.ok) return;
        var changed = applyItems((j.data && j.data.items) || []);
        if (changed.length) {
          showBanner('云端数据有更新（' + changed.length + ' 项）', '刷新查看', function () {
            location.reload();
          });
        }
        lastError = '';
        setStatus('ok');
      })
      .catch(function (e) {
        lastError = (e && e.message) || '网络异常';
        setStatus('error');
      });
  }

  // ---------- 拦截本地写入 ----------

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
    if (timer) clearTimeout(timer);
    timer = setTimeout(flush, FLUSH_DELAY);
  }

  // ---------- 登录与提交 ----------

  function currentPassword() {
    try { return localStorage.getItem(PWD_KEY) || ''; } catch (e) { return ''; }
  }

  function login(password) {
    return request('POST', '/auth/login', { username: 'admin', password: password }, false)
      .then(function (j) {
        if (!j || !j.ok) throw new Error(readServerError(j, '口令不正确'));
        token = j.data.token;
        return token;
      });
  }

  function ensureToken() {
    if (token) return Promise.resolve(token);
    var pwd = currentPassword();
    if (!pwd) return Promise.reject(new Error('尚未设置云端管理口令'));
    return login(pwd);
  }

  function putKey(key) {
    var raw;
    try { raw = localStorage.getItem(key); } catch (e) { raw = null; }
    return request('PUT', '/kv/' + NS + '/' + encodeURIComponent(key), { value: safeParse(raw) }, true)
      .then(function (j) {
        if (!j || !j.ok) throw new Error(readServerError(j, '写入失败'));
        delete dirty[key];
        delete failCount[key];
      });
  }

  function flush() {
    if (syncing) return Promise.resolve();
    var keys = Object.keys(dirty);
    if (!keys.length) return Promise.resolve();
    if (!token) {
      // 还没有凭证时不静默丢弃改动，留给口令门验证通过后再统一上传
      return Promise.resolve();
    }

    syncing = true;
    setStatus('syncing');

    return ensureToken()
      .then(function () {
        var queue = keys.slice();
        function next() {
          if (!queue.length) return Promise.resolve();
          return putKey(queue.shift()).then(next);
        }
        return next();
      })
      .then(function () {
        hideBanner();
        lastError = '';
        setStatus('ok');
      })
      .catch(function (err) {
        lastError = (err && err.message) || '未知错误';
        token = null;
        setStatus('error');
        var dead = [];
        keys.forEach(function (k) {
          failCount[k] = (failCount[k] || 0) + 1;
          if (failCount[k] >= MAX_FAIL) {
            delete dirty[k];
            dead.push(k);
          }
        });
        if (dead.length) {
          showBanner('有 ' + dead.length + ' 项数据连续同步失败已暂停重试：' + lastError
            + '。请检查网络后刷新页面。', '重试', function () {
              Object.keys(failCount).forEach(function (k) { delete failCount[k]; });
              SYNC_KEYS.forEach(function (k) { dirty[k] = true; });
              flush();
            });
        }
      })
      .then(function () { syncing = false; });
  }

  // 首次接入：把本机已有数据全量推送到云端（旧单机数据迁移）
  function uploadAll() {
    SYNC_KEYS.forEach(function (k) {
      var v = null;
      try { v = localStorage.getItem(k); } catch (e) { /* 忽略 */ }
      if (v !== null) dirty[k] = true;
    });
    return flush();
  }

  // ---------- 口令门（未通过验证前系统不可用） ----------

  function showGate(options) {
    var opt = options || {};
    var existing = document.getElementById('__cloudGate');
    try {
      var isSetup = !!opt.isSetup;
      var reason = opt.reason || '';
      var title = isSetup ? '首次使用 · 请设置管理口令' : '请输入云端管理口令';
      var hint = isSetup
        ? '这个口令用来保护云端数据，设置后请牢记。其他设备打开本网址时，输入同一个口令即可看到相同的数据。'
        : (reason || '在别的设备上打开同一个网址，输入同一个口令即可看到相同的数据。');

      if (existing) {
        // 只更新文案，保留用户输入焦点和按钮状态
        try {
          var h3 = existing.querySelector('h3');
          var p = existing.querySelector('p');
          if (h3) h3.textContent = title;
          if (p) p.textContent = hint;
          var err = existing.querySelector('#__gateErr');
          if (err && opt.error) err.textContent = opt.error;
        } catch (e) { /* 忽略 */ }
        return;
      }

      var wrap = document.createElement('div');
      wrap.id = '__cloudGate';
      wrap.style.cssText =
        'position:fixed;inset:0;z-index:100000;display:flex;align-items:center;justify-content:center;' +
        'background:rgba(6,10,20,.96);font-family:"Microsoft YaHei",sans-serif;';

      var box = document.createElement('div');
      box.style.cssText =
        'width:360px;padding:28px;border-radius:12px;background:#111827;' +
        'border:1px solid rgba(79,195,247,.3);box-shadow:0 18px 50px rgba(0,0,0,.6);color:#c8d6e5;';

      box.innerHTML =
        '<h3 style="margin:0 0 8px;font-size:16px;color:#4fc3f7;font-weight:600;">' + title + '</h3>'
        + '<p style="margin:0 0 16px;font-size:13px;line-height:1.7;color:#9fb3c8;">' + hint + '</p>'
        + '<input id="__gatePwd" type="password" placeholder="' + (isSetup ? '口令至少 6 位' : '请输入口令')
        + '" style="width:100%;box-sizing:border-box;padding:10px;border-radius:6px;'
        + 'border:1px solid #2b3a52;background:#0a0e1a;color:#e6f1fb;font-size:14px;outline:none;" />'
        + '<div id="__gateErr" style="min-height:18px;margin-top:8px;font-size:12px;color:#ef5350;">' + (opt.error || '') + '</div>'
        + '<button id="__gateOk" style="width:100%;padding:10px;border:none;border-radius:6px;'
        + 'background:#1976d2;color:#fff;font-size:14px;cursor:pointer;">'
        + (isSetup ? '确定并启用云端同步' : '确定')
        + '</button>';

      wrap.appendChild(box);
      document.body.appendChild(wrap);

      var input = box.querySelector('#__gatePwd');
      var err = box.querySelector('#__gateErr');
      var btn = box.querySelector('#__gateOk');
      input.focus();

      function submit() {
        var pwd = (input.value || '').trim();
        if (pwd.length < 6) { err.textContent = '口令至少 6 位'; return; }
        btn.disabled = true;
        btn.textContent = '处理中…';
        err.textContent = '';

        var task = isSetup
          ? request('POST', '/auth/bootstrap', { username: 'admin', password: pwd }, false)
          : login(pwd);

        task
          .then(function (j) {
            if (!isSetup) return true;
            if (!j || !j.ok) throw new Error(readServerError(j, '初始化失败'));
            token = j.data.token;
            return true;
          })
          .then(function () {
            try { origSetItem.call(localStorage, PWD_KEY, pwd); } catch (e) { /* 忽略 */ }
            if (wrap.parentNode) wrap.parentNode.removeChild(wrap);
            startPolling();
            setStatus('syncing');
            // 本机可能已有数据，接入云端后先全量上传一次
            return uploadAll().then(function () {
              setStatus('ok');
              showBanner('云端同步已启用，本机现有数据已上传。', null, null);
              setTimeout(hideBanner, 4000);
            });
          })
          .catch(function (e) {
            err.textContent = (e && e.message) || '失败，请重试';
            btn.disabled = false;
            btn.textContent = isSetup ? '确定并启用云端同步' : '确定';
            input.select();
          });
      }

      btn.addEventListener('click', submit);
      input.addEventListener('keydown', function (e) { if (e.key === 'Enter') submit(); });
    } catch (e) { /* 忽略 */ }
  }

  // ---------- 启动 ----------

  function startPolling() {
    if (pullTimer) return;
    pullTimer = setInterval(function () { pullAsync(); }, PULL_INTERVAL);
  }

  function probeAndGate() {
    fetch(API + '/auth/status', { headers: { Accept: 'application/json' } })
      .then(function (r) { return r.json(); })
      .then(function (j) {
        var initialized = !!(j && j.ok && j.data && j.data.initialized);
        if (initialized && currentPassword()) {
          // 本机存过口令，先静默验证一次
          login(currentPassword())
            .then(function () {
              startPolling();
              setStatus('ok');
              uploadAll();
            })
            .catch(function () {
              showGate({ isSetup: false, reason: '本机保存的口令与云端不一致，请重新输入。' });
            });
          return;
        }
        // 网络已通，不再显示"无法连接"，而是根据实际情况提示
        showGate({ isSetup: !initialized, reason: initialized ? '' : '' });
      })
      .catch(function (e) {
        // 只有 status 接口真的失败，才提示无法连接
        showGate({ isSetup: false, reason: '无法连接云端服务，请检查网络后刷新页面。(' + ((e && e.message) || '网络异常') + ')' });
      });
  }

  function boot() {
    try {
      online = pullAll();
      if (!online) {
        setStatus('offline');
        // kv 读取失败不直接阻塞；继续探测 auth/status，避免网络偶发抖动导致无法使用
      }
      probeAndGate();
    } catch (e) {
      online = false;
      setStatus('offline');
      showGate({ isSetup: false, reason: '初始化失败：' + ((e && e.message) || '网络异常') });
    }

    // 手机切后台 / 关闭页面时尽量把改动推出去
    window.addEventListener('beforeunload', function () {
      if (Object.keys(dirty).length && token) flush();
    });
    window.addEventListener('pagehide', function () {
      if (Object.keys(dirty).length && token) flush();
    });
    document.addEventListener('visibilitychange', function () {
      if (document.visibilityState === 'hidden' && Object.keys(dirty).length && token) flush();
    });
  }

  window.CloudSync = {
    flush: flush,
    pull: pullAsync,
    uploadAll: uploadAll,
    isOnline: function () { return online; },
    status: function () {
      return {
        online: online,
        hasToken: !!token,
        pending: Object.keys(dirty).length,
        failed: failCount,
        error: lastError
      };
    }
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
