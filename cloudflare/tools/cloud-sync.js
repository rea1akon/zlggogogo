/* 云存储适配器 v2 —— 让原版单机系统具备多设备数据同步能力
 *
 * 版本：V7.4
 * 迭代规则：后续功能修改按 V7.5、V7.6... 递增版本号
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

  var CLOUD_SYNC_VERSION = 'V7.4';
  // 完整版本字符串由构建脚本从 cloudflare/config/version.json 注入
  var APP_VERSION = '__ZLG_VERSION_FULL__';
  console.log('[zlg-cloud-sync] version', CLOUD_SYNC_VERSION, APP_VERSION);

  // 页面加载瞬间先隐藏原登录卡片，避免用户看到「无访客按钮/无版本号」的原始界面
  // 等适配器完成改造（注入访客按钮、版本号、预填 admin）后再淡入显示
  var loginHideStyle = document.createElement('style');
  loginHideStyle.id = '__zlgLoginHide';
  loginHideStyle.textContent =
    '.login-box{opacity:0 !important;visibility:hidden !important;transition:none !important;animation:none !important;}';
  document.head.appendChild(loginHideStyle);

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
  // 注意：hr_management_auth（登录凭证）不参与云同步，由各设备本地固定为 admin/zlg@123
  var SYNC_KEYS = [
    'hr_management_employees', 'hr_management_local_data',
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
      banner.id = '__zlgBanner';
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
        // 会话失效（过期/被踢）时提示重新登录，修改暂存本地不丢失
        if (/凭证|登录|未授权|权限/.test(lastError)) {
          clearSession();
          showBanner('登录已失效：修改已暂存本机，重新登录后将自动同步。', '重新登录', backToLogin);
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

    // 登录界面阶段不显示身份条（尚未确定身份）
    var loggedIn = false;
    try { loggedIn = sessionStorage.getItem('isLoggedIn') === 'true'; } catch (e) { /* 忽略 */ }
    if (!readonly && !loggedIn) {
      el.style.display = 'none';
      return;
    }
    el.style.display = 'flex';

    var isAdmin = identity === 'admin';
    var stateKey = identity + '|' + (identityUser || '') + '|' + readonly + '|' + loggedIn;
    if (el.getAttribute('data-state') === stateKey) return; // 状态未变，避免重建导致闪烁
    el.setAttribute('data-state', stateKey);
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
      else backToLogin();
    });
    el.appendChild(btn);
  }

  // ---------- 原系统登录界面挂钩（不弹任何自定义窗口） ----------

  // 在原登录卡片内注入"访客进入"按钮，并监听登录表单：
  // 输入 admin/zlg@123 通过原系统校验 = 管理员，同时静默登录云端获取同步凭证
  function revealLoginBox() {
    try {
      var box = document.querySelector('.login-box');
      if (box) {
        box.style.transition = 'opacity .25s ease, visibility .25s ease';
        box.style.visibility = 'visible';
        box.style.opacity = '1';
      }
      var hs = document.getElementById('__zlgLoginHide');
      if (hs) hs.remove();
    } catch (e) { /* 忽略 */ }
  }

  function hookLoginUi() {
    var form = document.getElementById('loginForm');
    if (!form || form.getAttribute('data-cloud-hooked') === '1') return;
    form.setAttribute('data-cloud-hooked', '1');

    // 预填管理员账号（固定 admin），减少用户输入
    var uEl = document.getElementById('loginUsername');
    if (uEl && !uEl.value) uEl.value = 'admin';

    // 确保版本号徽标已注入（它依赖 login-footer，可能与 form 同时就绪）
    injectVersionBadge();

    // 访客进入按钮（贴合原登录卡片的浅色风格）
    if (!document.getElementById('__guestEntry')) {
      var g = document.createElement('button');
      g.id = '__guestEntry';
      g.type = 'button';
      g.textContent = '👁 访客进入（只读浏览）';
      g.style.cssText =
        'display:block;width:100%;margin-top:12px;padding:11px;border-radius:8px;'
        + 'border:1px solid #c7d2fe;background:#ffffff;color:#6366f1;'
        + 'font-size:14px;cursor:pointer;font-family:inherit;transition:background .15s;';
      g.addEventListener('mouseenter', function () { g.style.background = '#eef2ff'; });
      g.addEventListener('mouseleave', function () { g.style.background = '#ffffff'; });
      g.addEventListener('click', function () { enterGuestMode(false); });
      form.parentNode.insertBefore(g, form.nextSibling);
    }

    // 改造完成，淡入显示登录卡片
    revealLoginBox();

    // 登录表单提交：读取输入的账号密码静默登录云端（原系统校验逻辑保持不变）
    form.addEventListener('submit', function () {
      var uEl = document.getElementById('loginUsername');
      var pEl = document.getElementById('loginPassword');
      var u = ((uEl && uEl.value) || '').trim();
      var p = (pEl && pEl.value) || '';
      if (!u || !p) return;
      login(u, p)
        .then(function () {
          setStatus('ok');
          startPolling();
        })
        .catch(function () {
          // 云端登录失败不影响本地使用；修改暂存本地，待网络恢复后同步
        });
      // 原系统校验通过后会置登录态：延迟刷新左下角身份条
      setTimeout(function () {
        var loggedIn = false;
        try { loggedIn = sessionStorage.getItem('isLoggedIn') === 'true'; } catch (e) { /* 忽略 */ }
        if (loggedIn) {
          identity = 'admin';
          identityUser = u;
          updateIdentityBar();
        }
      }, 1000);
    }, true);
  }

  // 适配器先于 script.js 加载，登录表单是动态生成的：轮询等待其出现后再挂钩
  function hookLoginUiWhenReady() {
    if (document.getElementById('loginForm')) { hookLoginUi(); return; }
    var tries = 0;
    var timer = setInterval(function () {
      tries++;
      if (document.getElementById('loginForm')) {
        clearInterval(timer);
        hookLoginUi();
      } else if (tries > 100) {
        clearInterval(timer); // 最多等 20 秒
        // 兜底：如果一直等不到登录表单，至少把登录框显示出来，避免白屏
        revealLoginBox();
      }
    }, 200);
  }

  // 访客 / 退出登录 -> 返回系统主页面
  function backToLogin() {
    try {
      sessionStorage.removeItem('isLoggedIn');
      sessionStorage.removeItem('__guestSession');
    } catch (e) { /* 忽略 */ }
    try { localStorage.removeItem(READONLY_KEY); } catch (e) { /* 忽略 */ }
    location.href = 'https://zlg-maintenance.pages.dev/%E5%BA%84%E9%AA%86%E8%B4%B5%E4%B8%80%E4%BD%93%E5%8C%96%E5%85%BB%E6%8A%A4%E7%AE%A1%E7%90%86%E7%B3%BB%E7%BB%9FV4#';
  }

  // ---------- 访客只读模式 ----------

  function injectReadonlyStyle() {
    if (document.getElementById('__readonlyStyle')) return;
    try {
      var s = document.createElement('style');
      s.id = '__readonlyStyle';
      // 只读模式不禁用输入控件：筛选下拉、搜索框、分页等查看类交互必须可用；
      // 修改类操作由 installWriteBlocker 按按钮语义拦截，后端 401 兜底
      s.textContent =
        'body[data-readonly="true"] .__zlg-blocked {opacity:.5 !important;cursor:not-allowed !important;}';
      document.head.appendChild(s);
    } catch (e) { /* 忽略 */ }
  }

  // 修改/功能类按钮关键词：命中即拦截点击（查看/搜索/筛选/重置/翻页等均放行）
  var WRITE_BLOCK_RE = /(保存|提交|删除|新增|添加|新建|编辑|修改|导入|导出|上传|下载|清空|备份|恢复|去重|初始化|批量|报表|打印|同步|注销|登出)/;
  var WRITE_BLOCK_CLS_RE = /(edit|delete|save|add|del|remove|import|export|upload|download|backup|restore|dedup|init|initialize|report|print|sync)/i;

  function isWriteButton(el) {
    var tag = el.tagName;
    if (tag !== 'BUTTON' && tag !== 'A' && el.getAttribute('role') !== 'button') return false;
    if (el.closest('#__identityBar') || el.closest('#__zlgBanner')) return false;
    var txt = (el.textContent || '').replace(/\s/g, '');
    var cls = String(el.className || '');
    return WRITE_BLOCK_RE.test(txt) || WRITE_BLOCK_CLS_RE.test(cls);
  }

  function installWriteBlocker() {
    if (window.__zlgWriteBlocker) return;
    window.__zlgWriteBlocker = true;
    document.addEventListener('click', function (e) {
      try {
        if (document.body.getAttribute('data-readonly') !== 'true') return;
        var el = e.target;
        while (el && el !== document.body) {
          if (isWriteButton(el)) {
            e.preventDefault();
            e.stopPropagation();
            try { el.classList.add('__zlg-blocked'); } catch (e) { /* 忽略 */ }
            showBanner('访客只读模式：修改类操作已禁用，如需编辑请用管理员账号登录。', null, null);
            setTimeout(hideBanner, 2500);
            return;
          }
          el = el.parentNode;
        }
      } catch (err) { /* 拦截器自身异常不阻断页面 */ }
    }, true);
  }

  // 进入访客模式时预扫描页面，给所有功能类按钮加上视觉禁用样式
  function markBlockedButtons() {
    if (document.body.getAttribute('data-readonly') !== 'true') return;
    try {
      var els = document.querySelectorAll('button, a, [role="button"]');
      for (var i = 0; i < els.length; i++) {
        if (isWriteButton(els[i])) els[i].classList.add('__zlg-blocked');
      }
    } catch (e) { /* 忽略 */ }
  }

  // 版本号徽标：从项目版本配置读取，显示在登录页底部右侧
  function injectVersionBadge() {
    if (document.getElementById('__zlgVersionBadge')) return;
    var footer = document.querySelector('.login-footer');
    if (!footer) {
      // 适配器先于 script.js 加载时 DOM 可能未就绪，稍后再试
      if (typeof setTimeout !== 'undefined') setTimeout(injectVersionBadge, 300);
      return;
    }
    try {
      var badge = document.createElement('span');
      badge.id = '__zlgVersionBadge';
      badge.className = 'zlg-version-badge';
      badge.setAttribute('aria-label', '应用版本号');
      badge.textContent = APP_VERSION;
      footer.appendChild(badge);
    } catch (e) { /* 忽略 */ }
  }

  // 移动端增强：修复小屏下输入框缩放、触控目标、溢出等问题
  function injectMobileStyle() {
    if (document.getElementById('__zlgMobileStyle')) return;
    try {
      var s = document.createElement('style');
      s.id = '__zlgMobileStyle';
      s.textContent =
        'html,body{min-width:0;}' +
        'img,video,svg{max-width:100%;height:auto;}' +
        'button,a,label,.btn,.nav-link,.nav-group-title,.tab-btn{cursor:pointer;touch-action:manipulation;-webkit-tap-highlight-color:transparent;}' +
        'input,select,textarea{font-size:16px;}' +
        '.login-container{display:flex;align-items:center;justify-content:center;padding:max(16px,env(safe-area-inset-top)) 16px max(16px,env(safe-area-inset-bottom));min-height:100vh;box-sizing:border-box;overflow:hidden;}' +
        '.login-box{width:100%;max-width:400px;box-sizing:border-box;}' +
        '.zlg-version-badge{display:block;text-align:right;font-size:11px;color:rgba(148,163,184,0.7);letter-spacing:0.3px;margin-top:8px;pointer-events:none;user-select:none;}' +
        '@media (max-width:480px){' +
        '.login-box{padding:28px 20px;border-radius:16px;max-width:min(400px,calc(100vw - 24px));}' +
        '.login-header h1{font-size:17px;letter-spacing:0.5px;}' +
        '.login-subtitle{font-size:12px;}' +
        '.form-label{font-size:12px;}' +
        '.login-input{min-height:44px;font-size:16px;padding:0 44px 0 14px;}' +
        '.login-btn{min-height:44px;font-size:14px;}' +
        '.btn-link{font-size:12px;padding:8px 14px;}' +
        '.login-footer{margin-top:22px;}' +
        '.login-footer p{font-size:11px;}' +
        '.zlg-version-badge{font-size:10px;margin-top:6px;}' +
        '}' +
        '@media (max-width:360px){' +
        '.login-box{padding:24px 18px;}' +
        '.login-header h1{font-size:16px;}' +
        '.login-input{min-height:42px;}' +
        '.zlg-version-badge{font-size:9px;}' +
        '}';
      document.head.appendChild(s);
    } catch (e) { /* 忽略 */ }
  }

  function showReadonlyBanner() {
    showBanner('访客只读模式：可查看全部数据，修改不会保存。', '管理员登录', backToLogin);
    // 提示条 5 秒后自动收起，不遮挡界面
    setTimeout(hideBanner, 5000);
  }

  function applyReadonlyUi() {
    try { document.body.setAttribute('data-readonly', 'true'); } catch (e) { /* 忽略 */ }
    injectReadonlyStyle();
    installWriteBlocker();
    markBlockedButtons();
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
    // 标记本标签页会话为访客，刷新后仍是访客（新开页面则回到登录界面）
    try { sessionStorage.setItem('__guestSession', '1'); } catch (e) { /* 忽略 */ }
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
    // 清理历史"数据口令"残留
    try { origRemoveItem.call(localStorage, PWD_KEY); } catch (e) { /* 忽略 */ }

    // 统一登录凭证为 admin/zlg@123（仅本机保存；该键已移出云同步白名单）
    try {
      origSetItem.call(localStorage, 'hr_management_auth',
        JSON.stringify({ username: 'admin', password: 'zlg@123' }));
    } catch (e) { /* 忽略 */ }

    var savedToken = null;
    try { savedToken = localStorage.getItem(TOKEN_KEY); } catch (e) { /* 忽略 */ }

    online = pullAll();
    if (!online) setStatus('offline');

    // 访客标记仅在本标签页会话内有效，新开页面一律回登录界面
    var guestSession = false;
    try { guestSession = sessionStorage.getItem('__guestSession') === '1'; } catch (e) { /* 忽略 */ }
    if (guestSession && localStorage.getItem(READONLY_KEY) === '1') {
      enterGuestMode(true);
      return;
    }
    try { origRemoveItem.call(localStorage, READONLY_KEY); } catch (e) { /* 忽略 */ }

    // 不设置原系统登录态：原系统自带的登录界面即系统登录入口
    identity = 'guest';
    updateIdentityBar();
    injectMobileStyle();
    injectVersionBadge();
    hookLoginUiWhenReady();

    if (savedToken) {
      // 静默恢复云端会话（通过原登录界面登录后即可直接同步）
      token = savedToken;
      verifySession()
        .then(function () { setStatus('ok'); startPolling(); })
        .catch(function () { clearSession(); });
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
    login: hookLoginUiWhenReady,
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
