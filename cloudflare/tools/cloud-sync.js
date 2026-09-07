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
  var PWD_KEY = 'adminPassword'; // 已废弃：系统不再使用数据口令，仅用于清理历史残留
  var TOKEN_KEY = 'cloud_token'; // 登录凭证，仅保存在本机，绝不上云
  var IDENTITY_KEY = 'cloud_identity'; // 'admin' | 'guest'，用于左下角身份显示
  var ADMIN_USER = 'admin'; // 系统唯一管理员账号
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
  var readonly = false; // 访客只读模式：为 true 时不向云端推送任何改动
  var READONLY_KEY = '__readonly_mode';
  var identity = 'guest'; // 当前身份：'admin' | 'guest'
  var identityUser = ''; // 当前登录账号名（由服务端返回）
  var identityBar = null;

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
    else if (state === 'readonly') { text = '只读模式'; color = '#7dd3fc'; }
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
    if (readonly) return; // 只读模式：本地仍写入，但不再上报云端
    if (this === localStorage && SYNC_SET[key]) markDirty(key);
  };

  Storage.prototype.removeItem = function (key) {
    origRemoveItem.call(this, key);
    if (readonly) return;
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

  function saveSession(nextToken, username) {
    token = nextToken;
    if (username) identityUser = username;
    try {
      origSetItem.call(localStorage, TOKEN_KEY, nextToken);
      origSetItem.call(localStorage, IDENTITY_KEY, 'admin');
    } catch (e) { /* 忽略 */ }
    identity = 'admin';
    updateIdentityBar();
  }

  function clearSession() {
    token = null;
    try {
      origRemoveItem.call(localStorage, TOKEN_KEY);
      origRemoveItem.call(localStorage, IDENTITY_KEY);
    } catch (e) { /* 忽略 */ }
  }

  function login(username, password) {
    return request('POST', '/auth/login', { username: username, password: password }, false)
      .then(function (j) {
        if (!j || !j.ok) throw new Error(readServerError(j, '账号或密码错误'));
        saveSession(j.data.token, (j.data.user && j.data.user.username) || ADMIN_USER);
        return j.data.token;
      });
  }

  function ensureToken() {
    if (token) return Promise.resolve(token);
    return Promise.reject(new Error('尚未登录，修改不会保存到云端'));
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
    if (readonly) return Promise.resolve(); // 只读模式：永不推送
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
        // 会话失效（过期/被踢）时回到登录界面，避免改动静默丢失
        if (/凭证|登录|未授权|权限/.test(lastError)) {
          clearSession();
          updateIdentityBar();
          showLogin({ error: '登录已失效，请重新登录' });
        }
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

  // 注意：系统为一套共享数据，云端数据为准。
  // 已移除"登录即全量上传本机数据"的逻辑，避免本机旧数据覆盖云端已上传的数据。

  // ---------- 左下角身份标识：管理员 / 访客（实时切换） ----------

  function ensureIdentityBar() {
    if (identityBar && identityBar.parentNode) return identityBar;
    try {
      var el = document.createElement('div');
      el.id = '__identityBar';
      el.style.cssText =
        'position:fixed;left:14px;bottom:14px;z-index:99998;display:flex;align-items:center;gap:10px;' +
        'padding:6px 14px;border-radius:999px;font-size:12px;font-family:"Microsoft YaHei",sans-serif;' +
        'background:rgba(10,14,26,.88);border:1px solid rgba(79,195,247,.35);color:#c8d6e5;user-select:none;';
      document.body.appendChild(el);
      identityBar = el;
    } catch (e) { /* 忽略 */ }
    return identityBar;
  }

  function updateIdentityBar() {
    var el = ensureIdentityBar();
    if (!el) return;
    var isAdmin = identity === 'admin';
    el.innerHTML = '';

    var label = document.createElement('span');
    label.textContent = isAdmin
      ? '🛡 管理员 · ' + (identityUser || ADMIN_USER)
      : '👁 访客 · 只读浏览';
    label.style.color = isAdmin ? '#66bb6a' : '#7dd3fc';
    el.appendChild(label);

    var btn = document.createElement('button');
    btn.type = 'button';
    btn.textContent = isAdmin ? '切换为访客' : '管理员登录';
    btn.style.cssText =
      'padding:2px 10px;border-radius:999px;border:1px solid rgba(148,163,184,.45);' +
      'background:transparent;color:#94a3b8;font-size:11px;cursor:pointer;';
    btn.addEventListener('click', function () {
      if (isAdmin) enterGuestMode(false);
      else showLogin();
    });
    el.appendChild(btn);
  }

  // ---------- 管理员登录界面（全系统一套数据，不设数据口令） ----------

  function hideLogin() {
    try {
      var g = document.getElementById('__cloudGate');
      if (g && g.parentNode) g.parentNode.removeChild(g);
    } catch (e) { /* 忽略 */ }
  }

  function showLogin(options) {
    var opt = options || {};
    try {
      var existing = document.getElementById('__cloudGate');
      if (existing) {
        var errBox = existing.querySelector('#__gateErr');
        if (errBox && opt.error) errBox.textContent = opt.error;
        existing.style.display = 'flex';
        return;
      }

      var wrap = document.createElement('div');
      wrap.id = '__cloudGate';
      wrap.style.cssText =
        'position:fixed;inset:0;z-index:100000;display:flex;align-items:center;justify-content:center;' +
        'background:rgba(6,10,20,.96);font-family:"Microsoft YaHei",sans-serif;';

      var box = document.createElement('div');
      box.style.cssText =
        'position:relative;width:360px;padding:28px;border-radius:12px;background:#111827;' +
        'border:1px solid rgba(79,195,247,.3);box-shadow:0 18px 50px rgba(0,0,0,.6);color:#c8d6e5;';

      var close = document.createElement('span');
      close.textContent = '×';
      close.title = '关闭（继续以访客身份浏览）';
      close.style.cssText =
        'position:absolute;right:12px;top:8px;font-size:20px;line-height:1;color:#64748b;cursor:pointer;';
      close.addEventListener('click', hideLogin);
      box.appendChild(close);

      var inputCss =
        'width:100%;box-sizing:border-box;padding:10px;border-radius:6px;'
        + 'border:1px solid #2b3a52;background:#0a0e1a;color:#e6f1fb;font-size:14px;outline:none;';

      box.innerHTML =
        '<h3 style="margin:0 0 8px;font-size:16px;color:#4fc3f7;font-weight:600;">管理员登录</h3>'
        + '<p style="margin:0 0 16px;font-size:13px;line-height:1.7;color:#9fb3c8;">'
        + '全系统共用一套数据。登录后即可编辑；不登录可直接以访客身份浏览。</p>'
        + '<input id="__gateUser" value="' + ADMIN_USER + '" autocomplete="username" style="' + inputCss + '" />'
        + '<input id="__gatePwd" type="password" placeholder="请输入密码" autocomplete="current-password" '
        + 'style="' + inputCss + 'margin-top:10px;" />'
        + '<div id="__gateErr" style="min-height:18px;margin-top:8px;font-size:12px;color:#ef5350;">'
        + (opt.error || '') + '</div>'
        + '<button id="__gateOk" style="width:100%;padding:10px;border:none;border-radius:6px;'
        + 'background:#1976d2;color:#fff;font-size:14px;cursor:pointer;">登 录</button>'
        + '<a id="__gateGuest" href="javascript:void(0)" style="display:block;margin-top:14px;text-align:center;'
        + 'color:#7dd3fc;font-size:12px;cursor:pointer;text-decoration:underline;">以访客身份浏览（只读）→</a>';

      wrap.appendChild(box);
      document.body.appendChild(wrap);

      var userInput = box.querySelector('#__gateUser');
      var input = box.querySelector('#__gatePwd');
      var err = box.querySelector('#__gateErr');
      var btn = box.querySelector('#__gateOk');
      input.focus();

      function submit() {
        var pwd = (input.value || '').trim();
        if (!pwd) { err.textContent = '请输入密码'; return; }
        btn.disabled = true;
        btn.textContent = '登录中…';
        err.textContent = '';
        login((userInput.value || ADMIN_USER).trim(), pwd)
          .then(function () {
            hideLogin();
            setStatus('ok');
            startPolling();
            showBanner('已以管理员身份登录，修改将同步到云端。', null, null);
            setTimeout(hideBanner, 3000);
          })
          .catch(function (e) {
            err.textContent = (e && e.message) || '登录失败，请重试';
            btn.disabled = false;
            btn.textContent = '登 录';
            input.select();
          });
      }

      btn.addEventListener('click', submit);
      input.addEventListener('keydown', function (e) { if (e.key === 'Enter') submit(); });
      userInput.addEventListener('keydown', function (e) { if (e.key === 'Enter') input.focus(); });

      var guestLink = box.querySelector('#__gateGuest');
      if (guestLink) {
        guestLink.addEventListener('click', function () { enterGuestMode(false); });
      }
    } catch (e) { /* 忽略 */ }
  }

  // ---------- 访客只读模式 ----------

  function injectReadonlyStyle() {
    if (document.getElementById('__readonlyStyle')) return;
    try {
      var s = document.createElement('style');
      s.id = '__readonlyStyle';
      s.textContent =
        'body[data-readonly="true"] input,'
        + 'body[data-readonly="true"] textarea,'
        + 'body[data-readonly="true"] select {'
        + 'background:#16203a !important;color:#8aa0b8 !important;pointer-events:none;'
        + 'border-color:#2b3a52 !important;}'
        + 'body[data-readonly="true"] button {opacity:.55 !important;}';
      document.head.appendChild(s);
    } catch (e) { /* 忽略 */ }
  }

  function showReadonlyBanner() {
    showBanner('访客只读模式：可查看全部数据，修改不会保存。如需编辑请点左下角「管理员登录」。', '管理员登录', function () {
      showLogin();
    });
    // 提示条 5 秒后自动收起，不遮挡界面
    setTimeout(hideBanner, 5000);
  }

  function applyReadonlyUi() {
    try { document.body.setAttribute('data-readonly', 'true'); } catch (e) { /* 忽略 */ }
    injectReadonlyStyle();
    setStatus('readonly');
    showReadonlyBanner();
  }

  // fromBoot=true 表示从页面加载时直接进入（已记录只读标记），不再二次刷新
  function enterGuestMode(fromBoot) {
    readonly = true;
    identity = 'guest';
    try { origSetItem.call(localStorage, IDENTITY_KEY, 'guest'); } catch (e) { /* 忽略 */ }
    updateIdentityBar();
    online = pullAll();
    if (fromBoot) {
      // 置原系统登录态：访客直达主界面，不被原登录页卡住
      try { sessionStorage.setItem('isLoggedIn', 'true'); } catch (e) { /* 忽略 */ }
      applyReadonlyUi();
      if (!online) setStatus('offline');
      startPolling();
      return;
    }
    // 来自按钮：先置登录态再刷新，让原系统直接进入主界面（云端数据已预填）
    try { sessionStorage.setItem('isLoggedIn', 'true'); } catch (e) { /* 忽略 */ }
    try { origSetItem.call(localStorage, READONLY_KEY, '1'); } catch (e) { /* 忽略 */ }
    location.reload();
  }

  // ---------- 启动 ----------

  function startPolling() {
    if (pullTimer) return;
    pullTimer = setInterval(function () { pullAsync(); }, PULL_INTERVAL);
  }

  // 校验本机保存的会话是否仍然有效
  function verifySession() {
    return request('GET', '/auth/me', undefined, true).then(function (j) {
      if (!j || !j.ok) throw new Error('登录已失效');
      identity = 'admin';
      identityUser = (j.data && j.data.user && j.data.user.username) || ADMIN_USER;
      updateIdentityBar();
      return true;
    });
  }

  function boot() {
    // 清理历史"数据口令"残留：系统已改为固定账号登录，不再使用数据口令
    try { origRemoveItem.call(localStorage, PWD_KEY); } catch (e) { /* 忽略 */ }

    var savedIdentity = null;
    var savedToken = null;
    try {
      savedIdentity = localStorage.getItem(IDENTITY_KEY);
      savedToken = localStorage.getItem(TOKEN_KEY);
    } catch (e) { /* 忽略 */ }

    // 启动不弹任何登录框：默认直接以访客（只读）身份进入系统
    if (savedIdentity === 'guest' || localStorage.getItem(READONLY_KEY) === '1') {
      enterGuestMode(true);
      return;
    }

    identity = 'guest';
    updateIdentityBar();

    online = pullAll();
    if (!online) setStatus('offline');

    if (savedToken) {
      // 本机有未过期的管理员会话：静默恢复管理员身份
      token = savedToken;
      verifySession()
        .then(function () {
          setStatus('ok');
          startPolling();
        })
        .catch(function () {
          // 会话失效：降级为访客只读，不打扰用户
          clearSession();
          enterGuestMode(true);
        });
    } else {
      enterGuestMode(true);
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
    login: showLogin,
    isOnline: function () { return online; },
    status: function () {
      return {
        online: online,
        identity: identity,
        readonly: readonly,
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
