/**
 * UAOA — pin revealed Continue segments to the top of the lesson scrollport.
 *
 * Runs in Course Settings → Custom JS (parent page). Fade-reveal embeds call
 * `UAOA.pinBlockToTop(target)` after unveiling a segment.
 *
 * Why parent JS: embeds run in iframes and often scroll the wrong container.
 * Veiled (display:none) content below clamps max scroll — we temporarily grow a
 * trailing spacer so Continues can pin the next block to the TOP (not merely
 * into view at the bottom edge).
 *
 * Behavior:
 * - Always hard-pin on unveil (smooth scrollTo). Never rely on scrollIntoView
 *   `nearest` for the pin — that only lands content on the bottom edge.
 * - Grow a temporary spacer so there is enough scroll room under the target.
 * - After the pin settles, trim the spacer to the exact remaining need. Do NOT
 *   wipe it on the last in-slide reveal — clearing drops scrollHeight mid-pin
 *   and snaps the view back down (e.g. Continue before Key takeaways).
 */
(function () {
  // Allow redeploy to replace logic on full reload; same-page hot path uses pin API.
  window.UAOA = window.UAOA || {};
  if (window.UAOA.__scrollPinVersion === 5) return;
  window.UAOA.__scrollPinVersion = 5;
  window.UAOA.__scrollPinInstalled = true;

  var SPACER_ATTR = 'data-uaoa-pin-spacer';
  var VEIL_ATTR = 'data-uaoa-veiled';
  var BREAK_ATTR = 'data-uaoa-scroll-fade';
  var PAD_BELOW_CHROME = 24;
  var activeToken = 0;

  function topInset() {
    var inset = 0;
    var nodes = document.querySelectorAll(
      'header, nav, [class*="header"], [class*="Header"], [class*="toolbar"], [class*="TopBar"], [class*="top-bar"]'
    );
    for (var i = 0; i < nodes.length; i++) {
      var el = nodes[i];
      var st = window.getComputedStyle(el);
      if (st.position !== 'fixed' && st.position !== 'sticky') continue;
      var r = el.getBoundingClientRect();
      if (r.top <= 8 && r.bottom > inset && r.height > 0 && r.height < 160) {
        inset = r.bottom;
      }
    }
    return inset + PAD_BELOW_CHROME;
  }

  function blockListParent(target) {
    var node = target;
    while (node && node.parentElement) {
      if (node.parentElement.children && node.parentElement.children.length >= 2) {
        return node.parentElement;
      }
      node = node.parentElement;
    }
    return document.body;
  }

  function ensureSpacer(target) {
    var parent = blockListParent(target);
    var spacer = parent.querySelector('[' + SPACER_ATTR + ']');
    if (!spacer) {
      spacer = document.createElement('div');
      spacer.setAttribute(SPACER_ATTR, '1');
      spacer.setAttribute('aria-hidden', 'true');
      spacer.style.cssText =
        'display:block;width:100%;height:0;margin:0;padding:0;border:0;' +
        'pointer-events:none;flex:none;flex-shrink:0;';
      parent.appendChild(spacer);
    }
    return spacer;
  }

  function clearSpacers() {
    var spacers = document.querySelectorAll('[' + SPACER_ATTR + ']');
    for (var i = 0; i < spacers.length; i++) {
      if (spacers[i].parentNode) spacers[i].parentNode.removeChild(spacers[i]);
    }
  }

  function fadeBreakIn(el) {
    if (!el) return null;
    if (el.getAttribute && el.getAttribute(BREAK_ATTR) != null && el.tagName === 'IFRAME') {
      return el;
    }
    return el.querySelector ? el.querySelector('iframe[' + BREAK_ATTR + ']') : null;
  }

  /**
   * True when another Continue or still-veiled segment sits after the pin
   * target. Used only to decide whether to keep a spacer after settle — not
   * whether to hard-pin (we always hard-pin on unveil).
   *
   * Count later Continue iframes even when height is 0 / parent is veiled
   * (offsetHeight is 0 inside display:none, which previously skipped them).
   */
  function hasMoreToPinPast(target) {
    if (!target) return false;
    var parent = blockListParent(target);
    var kids = parent.children;
    var found = false;
    for (var i = 0; i < kids.length; i++) {
      var el = kids[i];
      if (!found) {
        if (el === target || (el.contains && el.contains(target))) found = true;
        continue;
      }
      if (el.getAttribute && el.getAttribute(VEIL_ATTR) != null) return true;
      if (el.querySelector && el.querySelector('[' + VEIL_ATTR + ']')) return true;
      if (fadeBreakIn(el)) return true;
    }
    // Also scan the whole document for later veiled nodes / breaks (block
    // list parent is not always a flat sibling list in the ScormStack DOM).
    var veiled = document.querySelectorAll('[' + VEIL_ATTR + ']');
    for (var v = 0; v < veiled.length; v++) {
      if (
        !(target.compareDocumentPosition(veiled[v]) & Node.DOCUMENT_POSITION_FOLLOWING)
      ) {
        continue;
      }
      return true;
    }
    var breaks = document.querySelectorAll('iframe[' + BREAK_ATTR + ']');
    for (var b = 0; b < breaks.length; b++) {
      var br = breaks[b];
      if (br.offsetParent === null && br.offsetHeight === 0) {
        // collapsed used break — ignore if it's the one we just left
      }
      if (
        target.compareDocumentPosition(br) & Node.DOCUMENT_POSITION_FOLLOWING &&
        br.getBoundingClientRect().height >= 0
      ) {
        // Following continue that still has a host (even if veiled → height 0)
        var host = br.parentElement;
        while (host && host !== document.body) {
          if (host.getAttribute && host.getAttribute(VEIL_ATTR) != null) return true;
          host = host.parentElement;
        }
        // Visible later continue still in the stack
        if (br.offsetHeight > 2) return true;
      }
    }
    return false;
  }

  function scrollables(target) {
    var out = [];
    var node = target && target.parentElement;
    while (node && node !== document.documentElement) {
      var st = window.getComputedStyle(node);
      var oy = st.overflowY;
      if (
        (oy === 'auto' || oy === 'scroll' || oy === 'overlay' || oy === 'hidden') &&
        node.scrollHeight > node.clientHeight + 1
      ) {
        out.push(node);
      }
      node = node.parentElement;
    }
    return out;
  }

  function isPageScroller(sc) {
    return (
      !sc ||
      sc === document.scrollingElement ||
      sc === document.documentElement ||
      sc === document.body
    );
  }

  /**
   * Prefer the scroller that actually moves lesson content. Score by how much
   * of the target’s ancestor chain it covers and how tall it is.
   */
  function primaryScroller(target) {
    var list = scrollables(target);
    if (!list.length) {
      return document.scrollingElement || document.documentElement;
    }
    // Prefer the innermost scroller that is large enough to be the lesson pane
    // (avoids scrolling a tiny nested clip while the main column stays put).
    var best = list[0];
    var bestScore = -1;
    for (var i = 0; i < list.length; i++) {
      var sc = list[i];
      var h = sc.clientHeight || 0;
      var room = Math.max(0, sc.scrollHeight - sc.clientHeight);
      var score = h + room * 0.25;
      // Strongly prefer scrollers roughly viewport-sized
      if (h >= window.innerHeight * 0.45) score += 2000;
      if (score > bestScore) {
        bestScore = score;
        best = sc;
      }
    }
    return best;
  }

  /** Viewport Y where the target’s top should land. */
  function desiredPinY(sc) {
    var inset = topInset();
    if (isPageScroller(sc)) return inset;
    var sRect = sc.getBoundingClientRect();
    // Sticky nav overlapping the scroller → use absolute inset; else pad from pane top
    if (inset > sRect.top + 4) return inset;
    return sRect.top + PAD_BELOW_CHROME;
  }

  function deltaToY(target, y) {
    return target.getBoundingClientRect().top - y;
  }

  /**
   * Grow spacer until the target can physically reach the pin Y.
   * Uses the active scroller’s visible height so we aren’t under-spaced.
   */
  function prepareRoom(target) {
    if (!target || !target.isConnected) return;
    var sc = primaryScroller(target);
    var desired = desiredPinY(sc);
    var delta = deltaToY(target, desired);
    var spacer = ensureSpacer(target);
    var paneH = isPageScroller(sc) ? window.innerHeight : sc.clientHeight;
    // Room needed below the target’s top so it can sit at `desired`
    var needBelow = Math.max(0, Math.ceil(paneH - (desired - (isPageScroller(sc) ? 0 : sc.getBoundingClientRect().top))));
    // Also add any current shortfall (target still below pin line)
    var grow = Math.max(0, Math.ceil(delta + 32), needBelow);
    var cur = parseFloat(spacer.style.height) || 0;
    if (grow > cur) spacer.style.height = grow + 'px';

    // Recompute exact need after growth
    settleSpacerForPin(target, sc);
  }

  function currentScrollTop(sc) {
    if (isPageScroller(sc)) {
      return window.pageYOffset || document.documentElement.scrollTop || 0;
    }
    return sc.scrollTop || 0;
  }

  function currentMaxScroll(sc) {
    if (isPageScroller(sc)) {
      return Math.max(
        0,
        (document.documentElement.scrollHeight || document.body.scrollHeight) - window.innerHeight
      );
    }
    return Math.max(0, sc.scrollHeight - sc.clientHeight);
  }

  function settleSpacerForPin(target, scOpt) {
    if (!target || !target.isConnected) return;
    var sc = scOpt || primaryScroller(target);
    var desired = desiredPinY(sc);
    var spacer = ensureSpacer(target);
    var tRect = target.getBoundingClientRect();
    var parent = blockListParent(target);
    var parentBottom = parent.getBoundingClientRect().bottom;
    var spacerH = parseFloat(spacer.style.height) || 0;
    var contentBottom = parentBottom - spacerH;
    var contentBelowTarget = Math.max(0, contentBottom - tRect.top);
    var paneH = isPageScroller(sc) ? window.innerHeight : sc.clientHeight;
    var pinOffset = isPageScroller(sc)
      ? desired
      : Math.max(0, desired - sc.getBoundingClientRect().top);
    var need = Math.max(0, Math.ceil(paneH - pinOffset - contentBelowTarget));

    // Grow freely; only shrink when it won't clamp scrollTop / undo the pin.
    if (need >= spacerH) {
      if (need !== Math.round(spacerH)) spacer.style.height = need + 'px';
      return;
    }
    if (spacerH <= 0) return;

    var beforeTop = currentScrollTop(sc);
    var beforeMax = currentMaxScroll(sc);
    var shrink = spacerH - need;
    // If shrinking would drop maxScroll below the current scroll position,
    // keep enough pad so the pinned block does not snap back down.
    var safeNeed = need;
    if (beforeTop > beforeMax - shrink + 1) {
      safeNeed = Math.max(need, Math.ceil(spacerH - (beforeMax - beforeTop)));
    }
    if (safeNeed !== Math.round(spacerH)) spacer.style.height = safeNeed + 'px';

    // If pin drifted after trim, snap back (no smooth fight).
    if (Math.abs(deltaToY(target, desired)) > 8) {
      scrollToDesired(target, false);
    }
  }

  function scrollToDesired(target, smooth) {
    if (!target || !target.isConnected) return;
    var sc = primaryScroller(target);
    var desired = desiredPinY(sc);
    var delta = deltaToY(target, desired);
    if (Math.abs(delta) < 2) return;

    var behavior = smooth ? 'smooth' : 'auto';

    if (isPageScroller(sc)) {
      var pageY = window.pageYOffset || document.documentElement.scrollTop || 0;
      var max = Math.max(
        0,
        (document.documentElement.scrollHeight || document.body.scrollHeight) - window.innerHeight
      );
      var top = Math.min(Math.max(0, pageY + delta), max);
      try {
        window.scrollTo({ top: top, behavior: behavior });
      } catch (e) {
        window.scrollTo(0, top);
      }
      return;
    }

    var sRect = sc.getBoundingClientRect();
    var tRect = target.getBoundingClientRect();
    var max = Math.max(0, sc.scrollHeight - sc.clientHeight);
    var chromeOverlap = Math.max(0, desired - sRect.top);
    var nextTop = sc.scrollTop + (tRect.top - sRect.top) - chromeOverlap;
    nextTop = Math.min(Math.max(0, nextTop), max);
    try {
      if (typeof sc.scrollTo === 'function') {
        sc.scrollTo({ top: nextTop, behavior: behavior });
      } else {
        sc.scrollTop = nextTop;
      }
    } catch (e) {
      sc.scrollTop = nextTop;
    }

    // Nudge nested scrollers if the primary didn’t absorb the full delta
    var list = scrollables(target);
    for (var i = 0; i < list.length; i++) {
      if (list[i] === sc) continue;
      var inner = list[i];
      var d = deltaToY(target, desired);
      if (Math.abs(d) < 2) break;
      var imax = Math.max(0, inner.scrollHeight - inner.clientHeight);
      inner.scrollTop = Math.min(Math.max(0, inner.scrollTop + d), imax);
    }
  }

  function pin(target) {
    if (!target || !target.isConnected) return;
    var token = ++activeToken;

    // Always hard-pin. Soft nearest-scroll is what left blocks on the bottom edge.
    prepareRoom(target);

    function go() {
      if (token !== activeToken || !target.isConnected) return;
      prepareRoom(target);
      scrollToDesired(target, true);
    }

    try {
      requestAnimationFrame(function () {
        requestAnimationFrame(go);
      });
    } catch (e) {
      go();
    }

    // Correct after Continue collapse + fade-in layout shifts
    [400, 700, 1100].forEach(function (ms) {
      setTimeout(function () {
        if (token !== activeToken || !target.isConnected) return;
        prepareRoom(target);
        var sc = primaryScroller(target);
        var desired = desiredPinY(sc);
        var delta = deltaToY(target, desired);
        if (Math.abs(delta) < 6) return;
        // Snap if still far off (smooth fight); otherwise smooth nudge
        scrollToDesired(target, Math.abs(delta) < 140);
      }, ms);
    });

    // After pin settles: trim spacer to the exact need, without clamping
    // scrollTop (that snap-back is what killed the last Continue → Key takeaways).
    // Never clearSpacers() here — only on page/slide leave.
    [500, 1200].forEach(function (ms) {
      setTimeout(function () {
        if (token !== activeToken || !target.isConnected) return;
        settleSpacerForPin(target);
      }, ms);
    });
  }

  document.addEventListener('uaoa-scroll-fade-pin', function (ev) {
    var t = ev && ev.detail && ev.detail.target;
    if (t) pin(t);
  });

  window.addEventListener('pagehide', clearSpacers);
  window.addEventListener('hashchange', function () {
    setTimeout(clearSpacers, 50);
  });

  window.UAOA.pinBlockToTop = pin;
  window.UAOA.clearPinSpacers = clearSpacers;
})();
