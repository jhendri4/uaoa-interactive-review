/**
 * UAOA — stacked corner controls (bottom-left)
 *
 * Concatenated into Course Settings → Advanced → Custom JS
 * (see scripts/deploy_custom_js.py).
 *
 * - Always: "Need to take a break?" pill → Support options dialog
 * - Mini Dictionary pill: visible only after the learner docks it (open+close)
 *   or completes that block (scrolled past the embed on the Module 1 dictionary
 *   slide). Not shown on open alone, and not merely because they are on a later
 *   slide.
 */
(function () {
  var HOST_ATTR = 'data-uaoa-support-floater';
  var DOCK_ATTR = 'data-uaoa-dict-docked';
  var HTML_STORE_KEY = 'uaoa-mini-dict-html';
  /* v2: invalidate unlocks from the prior bug that set unlocked on mere "open". */
  var UNLOCK_KEY = 'uaoa-mini-dict-unlocked-v2';
  var DICT_SLIDE_ID = '4c2d5f1a-37dd-4f89-9410-75ee3dface2a';
  var PRE_SURVEY_SLIDE_ID = 'f11326b4-0133-4106-b4f5-6ce8842de2bf';
  // Course slide order (ScormStack source_id). Do not infer from full document HTML.
  var SLIDE_IDS_ORDERED = [
    'ab3c7036-4eff-4989-97c6-13b819492121', // About This Course
    'a366e60b-a619-46f0-b98a-cf6b88540ae5', // Welcome
    PRE_SURVEY_SLIDE_ID, // Pre-course survey (between Welcome and Module 1)
    DICT_SLIDE_ID, // Module 1 — Mini Dictionary lives here
    'b4fb888c-e41c-4b92-ba33-c3c6b9cfaeb4',
    '69085f32-b529-456b-bef0-6ceae5b34c1d',
    '63c299a3-9125-4dae-9126-8417d7c6dd50',
    'e0eab6ca-b4df-4308-a725-19a2c232272b',
    'd4f62e1d-6153-42a0-893d-a2433efb98fe',
    'bab16c8a-29e9-4d4a-820c-8b6877179f25'
  ];
  var DICT_SLIDE_INDEX = SLIDE_IDS_ORDERED.indexOf(DICT_SLIDE_ID);
  var M1_SLIDE_ID = DICT_SLIDE_ID;
  var SLIDE_ORDER = SLIDE_IDS_ORDERED.map(function (id, i) {
    return {
      id: id,
      dict: id === DICT_SLIDE_ID,
      after: i > DICT_SLIDE_INDEX
    };
  });
  var wasDocked = false;
  try { wasDocked = document.documentElement.getAttribute(DOCK_ATTR) === '1'; } catch (e) {}

  if (window.UAOA && window.UAOA.__supportFloaterInstalled) {
    var old = document.querySelector('[' + HOST_ATTR + ']');
    if (old && old.parentNode) old.parentNode.removeChild(old);
    window.UAOA.__supportFloaterInstalled = false;
  }
  window.UAOA = window.UAOA || {};
  window.UAOA.__supportFloaterInstalled = true;
  // Preserve dock across Custom JS reinstalls in the same page view
  window.UAOA.__miniDictDocked = wasDocked || !!window.UAOA.__miniDictDocked;

  /* Baked by scripts/deploy_custom_js.py --locale (defaults = English). */
  var F = window.UAOA_I18N_FLOATER || {};
  function ft(key, fallback) {
    var v = F[key];
    return (typeof v === 'string' && v) ? v : fallback;
  }
  var ROWS = Array.isArray(F.rows) && F.rows.length ? F.rows : [
    ['users', 'Someone you trust', 'A friend, family member, teammate or coach.'],
    ['shield-check', "Your organisation's welfare or safeguarding lead",
      'Clubs and federations can offer support and act on abuse.'],
    ['flag', 'Platform reporting tools', 'Every major platform lets you report posts and accounts.'],
    ['phone', 'Emergency services',
      'If you or someone else is in immediate danger, contact your local emergency number.']
  ];

  var ICONS = {
    'heart-handshake': '<path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/><path d="M12 5 9.04 7.96a2.17 2.17 0 0 0 0 3.08c.82.82 2.13.85 3 .07l2.07-1.9a2.82 2.82 0 0 1 3.79 0l2.96 2.66"/><path d="m18 15-2-2"/><path d="m15 18-2-2"/>',
    'book-open': '<path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>',
    'users': '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
    'shield-check': '<path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/><path d="m9 12 2 2 4-4"/>',
    'flag': '<path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" x2="4" y1="22" y2="15"/>',
    'phone': '<path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>',
    'x': '<path d="M18 6 6 18"/><path d="m6 6 12 12"/>'
  };

  function icon(name, size) {
    return '<svg width="' + size + '" height="' + size + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + ICONS[name] + '</svg>';
  }

  var CSS = [
    ':host { all: initial; }',
    '* { box-sizing: border-box; }',
    '.stack { position: fixed; z-index: 2147483000; display: none; flex-direction: column; gap: 10px;',
    '  align-items: stretch; bottom: max(16px, env(safe-area-inset-bottom));',
    '  left: max(16px, env(safe-area-inset-left));',
    '  font-family: "Cerebri Sans Pro", system-ui, -apple-system, sans-serif; }',
    '.stack.open { display: flex; }',
    '.pill { display: inline-flex; align-items: center; gap: 10px; width: 100%;',
    '  margin: 0; padding: 12px 16px; cursor: pointer; text-align: left;',
    '  color: #fff; background: #2a2140; border: 1.5px solid #8b6fb0; border-radius: 12px;',
    '  box-shadow: 0 10px 28px rgba(14,27,51,.35);',
    '  font: inherit; font-size: 14px; line-height: 20px; font-weight: 800; }',
    '.pill svg { flex: none; color: #fff; }',
    '.pill:hover { background: #3a2d55; }',
    '.pill:focus-visible { outline: none; box-shadow: 0 0 0 2px #fff, 0 0 0 4px #7C5297, 0 10px 28px rgba(14,27,51,.35); }',
    '.pill-dict { display: none !important; }',
    '.pill-dict.show { display: inline-flex !important; }',
    '.scrim { display: none; position: fixed; inset: 0; z-index: 2147483646; align-items: center;',
    '  justify-content: center; padding: 24px; background: rgba(14,27,51,.64);',
    '  font-family: "Cerebri Sans Pro", system-ui, -apple-system, sans-serif; color: #091324; }',
    '.scrim.open { display: flex; }',
    '.dialog { width: min(560px, 100%); max-height: calc(100dvh - 48px); overflow: auto; background: #fff;',
    '  border: 1px solid #DFE3EA; border-radius: 16px; padding: 32px; display: flex; flex-direction: column; gap: 16px;',
    '  box-shadow: 0 16px 40px rgba(28,53,100,.18); }',
    '.dialog-head { display: flex; justify-content: space-between; gap: 16px; align-items: flex-start; }',
    '.dialog-title { margin: 0; font-size: 22px; line-height: 30px; font-weight: 900; color: #1C3564; }',
    '.dialog-body { font-size: 16px; line-height: 26px; color: #091324; }',
    '.dialog-body > p { margin: 0 0 12px; }',
    '.row { display: grid; grid-template-columns: 24px 1fr; gap: 2px 14px; padding: 14px 0; border-top: 1px solid #DFE3EA; }',
    '.row-icon { color: #21b7cb; padding-top: 2px; }',
    '.row b { color: #1C3564; }',
    '.row-desc { grid-column: 2; font-size: 14px; line-height: 22px; color: #091324; }',
    '.dialog-foot { display: flex; justify-content: flex-end; }',
    '.close, .ghost { font: inherit; font-weight: 700; cursor: pointer; border-radius: 8px; }',
    '.close { border: 0; background: #1C3564; color: #fff; padding: 10px 16px; }',
    '.ghost { border: 0; background: transparent; color: #1C3564; width: 40px; height: 40px; margin: -8px -12px 0 0; }'
  ].join('\n');

  function rowsHtml() {
    return ROWS.map(function (r) {
      return '<div class="row"><span class="row-icon">' + icon(r[0], 20) + '</span><b>' + r[1] +
        '</b><span class="row-desc">' + r[2] + '</span></div>';
    }).join('');
  }

  var host, root, stack, breakBtn, dictBtn, scrim;
  var dictMounted = null;

  function isDocked() {
    try {
      if (document.documentElement.getAttribute(DOCK_ATTR) === '1') return true;
    } catch (e) {}
    return !!(window.UAOA && window.UAOA.__miniDictDocked);
  }

  function setDocked(on) {
    window.UAOA.__miniDictDocked = !!on;
    try {
      if (on) document.documentElement.setAttribute(DOCK_ATTR, '1');
      else document.documentElement.removeAttribute(DOCK_ATTR);
    } catch (e) {}
  }

  function storeDictHtml(html) {
    if (typeof html !== 'string' || html.indexOf('scrim') === -1) return;
    window.UAOA.__miniDictHtml = html;
    try { sessionStorage.setItem(HTML_STORE_KEY, html); } catch (e) {}
  }

  function restoreDictHtml() {
    if (window.UAOA.__miniDictHtml) return;
    try {
      var stored = sessionStorage.getItem(HTML_STORE_KEY);
      if (stored) window.UAOA.__miniDictHtml = stored;
    } catch (e) {}
  }

  function locationBlob() {
    try {
      return [location.hash, location.search, location.pathname].join(' ');
    } catch (e) { return ''; }
  }

  function slideIndexForId(id) {
    for (var i = 0; i < SLIDE_IDS_ORDERED.length; i++) {
      if (SLIDE_IDS_ORDERED[i] === id) return i;
    }
    return -1;
  }

  function currentSlideId() {
    var loc = locationBlob();
    var bestIdx = -1;
    var bestId = null;
    for (var i = 0; i < SLIDE_IDS_ORDERED.length; i++) {
      if (loc.indexOf(SLIDE_IDS_ORDERED[i]) !== -1 && i > bestIdx) {
        bestIdx = i;
        bestId = SLIDE_IDS_ORDERED[i];
      }
    }
    if (bestId) return bestId;

    var act = document.querySelector(
      '[aria-current="page"], [aria-current="true"], [aria-current="location"], nav [aria-selected="true"], aside [aria-selected="true"]'
    );
    if (!act) return null;
    var link = act.closest ? act.closest('a[href]') : null;
    var href = (link && link.getAttribute('href')) || '';
    for (var j = 0; j < SLIDE_IDS_ORDERED.length; j++) {
      if (href.indexOf(SLIDE_IDS_ORDERED[j]) !== -1) return SLIDE_IDS_ORDERED[j];
    }
    return null;
  }

  function slideFromUrl() {
    var id = currentSlideId();
    if (!id) return null;
    for (var i = 0; i < SLIDE_ORDER.length; i++) {
      if (SLIDE_ORDER[i].id === id) return SLIDE_ORDER[i];
    }
    return null;
  }

  function isUnlocked() {
    try { return sessionStorage.getItem(UNLOCK_KEY) === '1'; } catch (e) { return false; }
  }

  function setUnlocked(on) {
    try {
      if (on) sessionStorage.setItem(UNLOCK_KEY, '1');
      else sessionStorage.removeItem(UNLOCK_KEY);
    } catch (e) {}
  }

  function findDictEmbed() {
    var iframes = document.getElementsByTagName('iframe');
    for (var i = 0; i < iframes.length; i++) {
      var f = iframes[i];
      var meta = [
        f.getAttribute('title') || '',
        f.getAttribute('aria-label') || '',
        f.getAttribute('name') || '',
        f.id || ''
      ].join(' ').toLowerCase();
      if (meta.indexOf('mini dictionary') !== -1) return f;
      try {
        var d = f.contentDocument;
        if (d && (d.getElementById('dictSection') || d.getElementById('openDict') || d.getElementById('dialogTpl'))) {
          return f;
        }
      } catch (e) {}
    }
    return null;
  }

  function scrolledPastDictEmbed() {
    var el = findDictEmbed();
    if (!el) return null;
    var r = el.getBoundingClientRect();
    // Treat as "after the dictionary page" once the embed has left the viewport.
    return r.bottom < 64;
  }

  function isAfterMiniDictPage() {
    return isDocked() || isUnlocked();
  }

  function shouldShowDictPill() {
    return isDocked() || isUnlocked();
  }

  function maybeUnlockFromProgress() {
    if (isDocked() || isUnlocked()) return;
    // Unlock only when the learner has reached/past the dictionary embed on its
    // own slide — not when they skip ahead to a later module via the nav.
    var idx = slideIndexForId(currentSlideId());
    if (idx === DICT_SLIDE_INDEX && scrolledPastDictEmbed() === true) setUnlocked(true);
  }

  /** Open dictionary from HTML cached on the course window (works after iframe is gone). */
  function openMiniDictionaryFromCache() {
    if (dictMounted) return true;
    var html = window.UAOA.__miniDictHtml;
    if (!html) return false;

    var existing = document.querySelector('[data-uaoa-mini-dictionary]');
    if (existing && existing.parentNode) existing.parentNode.removeChild(existing);

    var dictHost = document.createElement('div');
    dictHost.setAttribute('data-uaoa-mini-dictionary', '');
    dictHost.style.cssText = 'position:fixed;inset:0;z-index:2147483647;';
    var shadow = dictHost.attachShadow ? dictHost.attachShadow({ mode: 'open' }) : dictHost;
    shadow.innerHTML = html;
    document.body.appendChild(dictHost);

    var dictScrim = shadow.querySelector('.scrim');
    function closeDict() {
      document.removeEventListener('keydown', onKey);
      if (dictHost.parentNode) dictHost.parentNode.removeChild(dictHost);
      dictMounted = null;
    }
    function onKey(e) { if (e.key === 'Escape') closeDict(); }

    var closeX = shadow.querySelector('.js-close-x');
    var closeBtn = shadow.querySelector('.js-close');
    if (closeX) closeX.addEventListener('click', closeDict);
    if (closeBtn) closeBtn.addEventListener('click', closeDict);
    if (dictScrim) {
      dictScrim.addEventListener('click', function (e) {
        if (e.target === dictScrim) closeDict();
      });
    }
    document.addEventListener('keydown', onKey);
    dictMounted = { host: dictHost, close: closeDict };
    try { if (closeBtn) closeBtn.focus(); else if (closeX) closeX.focus(); } catch (e) {}
    return true;
  }

  function openMiniDictionary() {
    // Prefer cached HTML on the course page — independent of the Module 1 iframe.
    if (openMiniDictionaryFromCache()) return;
    // Fallbacks: registered opener from embed, then ping any iframe still listening.
    if (typeof window.UAOA.__miniDictOpener === 'function') {
      try { window.UAOA.__miniDictOpener(); return; } catch (e) {}
    }
    try { window.postMessage({ source: 'uaoa-mini-dictionary', type: 'open' }, '*'); } catch (e) {}
  }

  function ensure() {
    if (host && host.isConnected) return;
    var prev = document.querySelector('[' + HOST_ATTR + ']');
    if (prev && prev.parentNode) prev.parentNode.removeChild(prev);

    host = document.createElement('div');
    host.setAttribute(HOST_ATTR, '');
    root = host.attachShadow ? host.attachShadow({ mode: 'open' }) : host;
    var breakLabel = ft('breakPill', 'Need to take a break?');
    var dictLabel = ft('dictPill', 'Mini Dictionary');
    var regionAria = ft('regionAria', 'Course support');
    var supportTitle = ft('supportTitle', 'Support options');
    var supportIntro = ft('supportIntro', 'If anything in this course has affected you, you can pause and come back when you feel ready.');
    var closeLabel = ft('close', 'Close');
    var closeAria = ft('closeAria', 'Close');
    root.innerHTML = '<style>' + CSS + '</style>' +
      '<div class="stack" id="stack" role="complementary" aria-label="' + regionAria.replace(/"/g, '&quot;') + '">' +
      '<button type="button" class="pill pill-dict" id="dictBtn">' +
      icon('book-open', 20) + '<span>' + dictLabel + '</span></button>' +
      '<button type="button" class="pill" id="breakBtn">' +
      icon('heart-handshake', 20) + '<span>' + breakLabel + '</span></button>' +
      '</div>' +
      '<div class="scrim" id="scrim" role="dialog" aria-modal="true" aria-labelledby="uaoaSupportTitle">' +
      '<div class="dialog"><div class="dialog-head"><h2 class="dialog-title" id="uaoaSupportTitle">' + supportTitle + '</h2>' +
      '<button type="button" class="ghost" id="closeX" aria-label="' + closeAria.replace(/"/g, '&quot;') + '">' + icon('x', 20) + '</button></div>' +
      '<div class="dialog-body"><p>' + supportIntro + '</p>' +
      rowsHtml() + '</div><div class="dialog-foot"><button type="button" class="close" id="closeBtn">' + closeLabel + '</button></div></div></div>';
    document.body.appendChild(host);
    stack = root.getElementById('stack');
    breakBtn = root.getElementById('breakBtn');
    dictBtn = root.getElementById('dictBtn');
    scrim = root.getElementById('scrim');
    breakBtn.addEventListener('click', openSupport);
    dictBtn.addEventListener('click', openMiniDictionary);
    root.getElementById('closeX').addEventListener('click', closeSupport);
    root.getElementById('closeBtn').addEventListener('click', closeSupport);
    scrim.addEventListener('click', function (e) { if (e.target === scrim) closeSupport(); });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && scrim.classList.contains('open')) closeSupport();
    });
  }

  function openSupport() {
    ensure();
    scrim.classList.add('open');
    stack.classList.remove('open');
    try { root.getElementById('closeX').focus(); } catch (e) {}
  }

  function closeSupport() {
    if (!scrim) return;
    scrim.classList.remove('open');
    syncStack();
  }

  function findRail() {
    var candidates = document.querySelectorAll(
      'nav, aside, [class*="sidebar"], [class*="Sidebar"], [data-sidebar], [class*="navigation"], [class*="Navigation"]'
    );
    var best = null;
    for (var i = 0; i < candidates.length; i++) {
      var el = candidates[i];
      var r = el.getBoundingClientRect();
      var visible = r.height >= 120 && r.left >= -4 && r.left < 100 && r.right > 40 &&
        r.width >= 48 && r.width < window.innerWidth * 0.55;
      if (!visible) continue;
      if (!best || r.width > best.rect.width) best = { el: el, rect: r };
    }
    return best;
  }

  function navState() {
    if (window.innerWidth < 768) {
      return { open: false, left: 16, width: Math.min(280, window.innerWidth - 32) };
    }
    var rail = findRail();
    if (!rail) return { open: false, left: 16, width: 260 };
    var open = rail.rect.width >= 180 && rail.rect.left >= -4 && rail.rect.right >= 160;
    if (open) {
      var left = Math.max(12, Math.round(rail.rect.left + 12));
      var width = Math.min(280, Math.max(180, Math.round(rail.rect.width - 24)));
      return { open: true, left: left, width: width };
    }
    return { open: false, left: Math.round(Math.max(16, rail.rect.right + 12)), width: 260 };
  }

  function syncStack() {
    ensure();
    maybeUnlockFromProgress();
    var dialogOpen = scrim.classList.contains('open');
    if (dialogOpen) {
      stack.classList.remove('open');
      return;
    }

    var state = navState();
    stack.classList.add('open');
    stack.style.left = state.left + 'px';
    stack.style.width = state.width + 'px';
    dictBtn.classList.toggle('show', shouldShowDictPill());
  }

  function dockMiniDictionary() {
    setDocked(true);
    setUnlocked(true);
    ensure();
    syncStack();
  }

  function registerMiniDictionary(opener, html) {
    if (typeof opener === 'function') {
      window.UAOA.__miniDictOpener = opener;
    }
    if (html) storeDictHtml(html);
    // Course-window opener always preferred by the docked pill
    window.UAOA.openMiniDictionary = openMiniDictionary;
    syncStack();
  }

  window.UAOA.openSupport = openSupport;
  window.UAOA.closeSupport = closeSupport;
  window.UAOA.syncSupportFloater = syncStack;
  window.UAOA.dockMiniDictionary = dockMiniDictionary;
  window.UAOA.registerMiniDictionary = registerMiniDictionary;
  window.UAOA.openMiniDictionary = openMiniDictionary;
  window.UAOA.isMiniDictionaryDocked = isDocked;
  window.UAOA.isAfterMiniDictPage = isAfterMiniDictPage;

  window.addEventListener('message', function (ev) {
    var data = ev && ev.data;
    if (!data || data.source !== 'uaoa-mini-dictionary') return;
    if (data.html) storeDictHtml(data.html);
    // Pill unlocks only after dock (open+close) or scrolled-past — not on mere open.
    if (data.type === 'dock') dockMiniDictionary();
    if (data.type === 'register') {
      window.UAOA.openMiniDictionary = openMiniDictionary;
      syncStack();
    }
  });

  function boot() {
    restoreDictHtml();
    ensure();
    syncStack();
    window.addEventListener('resize', syncStack);
    window.addEventListener('scroll', syncStack, true);
    setInterval(syncStack, 500);
    var obs = new MutationObserver(function () { syncStack(); });
    obs.observe(document.body, { childList: true, subtree: true, attributes: true });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
