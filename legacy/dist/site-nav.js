// Shared nav bar + footer for every "Extra Features" / new-experience page.
// Usage: <div id="gtbg-nav-mount"></div> near the top of <body>,
//        <div id="gtbg-footer-mount"></div> near the end of <body>,
//        <script src="/site-nav.js" data-current="camera"></script>
(function () {
  // Captured synchronously -- document.currentScript is only valid while this script is
  // actually executing, so it must not be read from inside the deferred render() call below.
  var CURRENT_PAGE = document.currentScript ? document.currentScript.getAttribute('data-current') : null;

  // Five groups organized by why someone would open them, not by when they were built --
  // each item carries the one-line description and icon that appear in the card menu.
  var GROUPS = [
    {
      name: 'Explore', icon: 'compass', why: 'Drive the map yourself',
      items: [
        { id: 'search',    href: '/search.html',    label: 'Search Everything', icon: 'search',   desc: 'Find any regiment, place, or moment by name.' },
        { id: 'compare',   href: '/compare.html',   label: 'Compare Moments',   icon: 'shuffle',  desc: 'Two maps side by side at two different times.' },
        { id: 'camera',    href: '/camera.html',    label: 'Camera Modes',      icon: 'camera',   desc: 'Auto-fly to the action, or follow one unit.' },
        { id: 'viewshed',  href: '/viewshed.html',  label: 'What They Could See', icon: 'eye',    desc: 'Real elevation, ranked by vantage point.' },
        { id: 'sandbox',   href: '/sandbox.html',   label: 'What-If Sandbox',   icon: 'flag',     desc: 'Drag units and explore hypotheticals, just for fun.' },
      ],
    },
    {
      name: 'Learn', icon: 'book', why: 'Get the story explained',
      items: [
        { id: 'historian',   href: '/historian.html',   label: 'Ask the Historian', icon: 'broadcast', desc: 'A search-and-answer assistant built from the map’s own records.', star: true },
        { id: 'documentary', href: '/documentary.html', label: 'Documentary Mode', icon: 'film',  desc: 'All 24 key moments, narrated, in order.' },
        { id: 'turning-points', href: '/turning-points.html', label: 'Turning Points', icon: 'pulse', desc: 'Nine decisions historians still argue over.' },
        { id: 'education',   href: '/education.html',   label: 'For Students',    icon: 'book',   desc: 'A simple, classroom-friendly walkthrough.' },
        { id: 'aftermath',   href: '/aftermath.html',   label: 'Aftermath',       icon: 'clock',  desc: 'What happened after July 3rd.' },
      ],
    },
    {
      name: 'Data & Records', icon: 'chart', why: 'Research a unit or ancestor',
      items: [
        { id: 'regiment',     href: '/regiment.html',     label: 'Regimental Biography', icon: 'flag', desc: 'One unit’s whole battle, told as a single story.' },
        { id: 'find-ancestor', href: '/find-ancestor.html', label: 'Find Your Ancestor', icon: 'users', desc: 'Search regiments by state or commander’s name.' },
        { id: 'dashboard',    href: '/dashboard.html',    label: 'Casualty Dashboard',  icon: 'chart', desc: 'Strength and losses, corps by corps.' },
        { id: 'report',       href: '/report.html',       label: 'Battle Reports',      icon: 'book',  desc: 'A printable one-page reference per regiment.' },
      ],
    },
    {
      name: 'Experience It', icon: 'pulse', why: 'Feel the scale of it',
      items: [
        { id: 'immersive',        href: '/immersive.html',        label: 'Immersive Mode',      icon: 'broadcast', desc: 'Live cannon and musket sound tied to real troop density.' },
        { id: 'living-ledger',    href: '/living-ledger.html',    label: 'The Living Ledger',   icon: 'pulse',     desc: 'The human cost, rising minute by minute.' },
        { id: 'ground-remembers', href: '/ground-remembers.html', label: 'The Ground Remembers', icon: 'pin',      desc: 'A heatmap that builds across all three days.' },
        { id: 'ar',               href: '/ar.html',               label: 'Battlefield AR',      icon: 'phone-ar',  desc: 'See historical vantage points through your phone, on-site.' },
      ],
    },
    {
      name: 'Share', icon: 'users', why: 'Bring others along',
      items: [
        { id: 'watch-together',   href: '/watch-together.html',   label: 'Watch Together',   icon: 'users',    desc: 'Build a guided tour and watch it live with someone else.' },
        { id: 'cinematic-export', href: '/cinematic-export.html', label: 'Cinematic Export', icon: 'download', desc: 'Export a real video of any stretch of the battle.' },
      ],
    },
  ];

  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;' }[c]; }); }
  function icon(name, extraClass) {
    return '<svg class="gicon' + (extraClass ? ' ' + extraClass : '') + '" aria-hidden="true"><use href="#' + name + '"></use></svg>';
  }

  // Inlined directly rather than fetched: this used to be a separate network request
  // (fetch('/icons.svg')) on every single page load. Same-document <use href="#id">
  // references need the sprite present in this document regardless (external-file <use>
  // is flaky in Safari/iOS, which matters most on the Battlefield AR page), so inlining it
  // gets that reliability without the extra round trip -- one fewer thing on the critical
  // path of every page.
  var ICON_SPRITE_SVG = '<svg xmlns="http://www.w3.org/2000/svg" style="display:none"><defs>' +
    '<symbol id="compass" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><polygon points="12,7 14,12 12,17 10,12" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1" fill="currentColor" stroke="none"/></symbol>' +
    '<symbol id="sabers" viewBox="0 0 24 24"><line x1="4" y1="20" x2="18" y2="6"/><line x1="4" y1="6" x2="18" y2="20"/><path d="M15 3l3 3M18 3l-3 3"/><path d="M6 15l-3 3M3 18l3-3"/></symbol>' +
    '<symbol id="film" viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="14" rx="1.5"/><line x1="8" y1="5" x2="8" y2="19"/><line x1="16" y1="5" x2="16" y2="19"/><line x1="3" y1="9" x2="8" y2="9"/><line x1="3" y1="15" x2="8" y2="15"/><line x1="16" y1="9" x2="21" y2="9"/><line x1="16" y1="15" x2="21" y2="15"/></symbol>' +
    '<symbol id="book" viewBox="0 0 24 24"><path d="M4 5.5C4 4.7 4.7 4 5.5 4H12v16H5.5C4.7 20 4 19.3 4 18.5z"/><path d="M20 5.5C20 4.7 19.3 4 18.5 4H12v16h6.5c.8 0 1.5-.7 1.5-1.5z"/></symbol>' +
    '<symbol id="pin" viewBox="0 0 24 24"><path d="M12 21s7-6.4 7-11.5A7 7 0 0 0 5 9.5C5 14.6 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.4"/></symbol>' +
    '<symbol id="pulse" viewBox="0 0 24 24"><path d="M3 12h4l2 7 4-14 2 7h6"/></symbol>' +
    '<symbol id="broadcast" viewBox="0 0 24 24"><circle cx="12" cy="12" r="2" fill="currentColor" stroke="none"/><path d="M8.5 8.5a5 5 0 0 0 0 7"/><path d="M15.5 8.5a5 5 0 0 1 0 7"/><path d="M5.5 5.5a9 9 0 0 0 0 13"/><path d="M18.5 5.5a9 9 0 0 1 0 13"/></symbol>' +
    '<symbol id="search" viewBox="0 0 24 24"><circle cx="10.5" cy="10.5" r="6.5"/><line x1="20" y1="20" x2="15.3" y2="15.3"/></symbol>' +
    '<symbol id="clock" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.5 2"/></symbol>' +
    '<symbol id="chart" viewBox="0 0 24 24"><line x1="4" y1="20" x2="4" y2="4"/><line x1="4" y1="20" x2="21" y2="20"/><path d="M6 16l4-6 3 4 6-9"/></symbol>' +
    '<symbol id="camera" viewBox="0 0 24 24"><path d="M4 8h3l1.5-2h7L17 8h3a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1z"/><circle cx="12" cy="13.5" r="3.5"/></symbol>' +
    '<symbol id="eye" viewBox="0 0 24 24"><path d="M2 12s3.8-6.5 10-6.5S22 12 22 12s-3.8 6.5-10 6.5S2 12 2 12z"/><circle cx="12" cy="12" r="2.6"/></symbol>' +
    '<symbol id="eye-off" viewBox="0 0 24 24"><path d="M2 12s3.8-6.5 10-6.5c1.9 0 3.5.5 4.9 1.3M22 12s-1.3 2.3-3.7 4.1M9.5 9.7A2.6 2.6 0 0 0 12 14.6c.6 0 1.1-.2 1.6-.5"/><line x1="3" y1="3" x2="21" y2="21"/></symbol>' +
    '<symbol id="shuffle" viewBox="0 0 24 24"><path d="M3 7h4l6 10h4"/><path d="M3 17h4l2.2-3.6"/><path d="M14 7h3"/><path d="M17 4l3 3-3 3"/><path d="M17 20l3-3-3-3"/></symbol>' +
    '<symbol id="download" viewBox="0 0 24 24"><path d="M12 3v13"/><path d="M7 11l5 5 5-5"/><path d="M4 20h16"/></symbol>' +
    '<symbol id="users" viewBox="0 0 24 24"><circle cx="9" cy="8" r="3"/><path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6"/><circle cx="17" cy="9" r="2.4"/><path d="M15.5 14.2c2.6.4 4.5 2.6 4.5 5.3"/></symbol>' +
    '<symbol id="phone-ar" viewBox="0 0 24 24"><rect x="7" y="2" width="10" height="20" rx="2"/><line x1="11" y1="19" x2="13" y2="19"/><path d="M9.5 6.5L14.5 11.5M14.5 6.5L9.5 11.5" opacity="0.55"/></symbol>' +
    '<symbol id="flag" viewBox="0 0 24 24"><line x1="5" y1="21" x2="5" y2="3"/><path d="M5 4h13l-3.5 4L18 12H5"/></symbol>' +
    '<symbol id="menu" viewBox="0 0 24 24"><line x1="4" y1="7" x2="20" y2="7"/><line x1="4" y1="12" x2="20" y2="12"/><line x1="4" y1="17" x2="20" y2="17"/></symbol>' +
    '</defs></svg>';

  // Injected via requestIdleCallback (falling back to a short setTimeout where that API
  // isn't available) -- icons only ever pop in visually where a fixed-size .gicon box was
  // already reserved, so deferring this costs nothing visually, and it keeps this off the
  // critical path the browser is measuring for first paint.
  function loadIconSprite() {
    if (document.getElementById('gtbg-icon-sprite')) return;
    var inject = function () {
      if (document.getElementById('gtbg-icon-sprite')) return;
      var wrap = document.createElement('div');
      wrap.id = 'gtbg-icon-sprite';
      wrap.style.display = 'none';
      wrap.innerHTML = ICON_SPRITE_SVG;
      document.body.insertBefore(wrap, document.body.firstChild);
    };
    if (window.requestIdleCallback) requestIdleCallback(inject, { timeout: 1500 });
    else setTimeout(inject, 50);
  }

  function findCurrentGroup(current) {
    for (var g = 0; g < GROUPS.length; g++) {
      for (var i = 0; i < GROUPS[g].items.length; i++) {
        if (GROUPS[g].items[i].id === current) return GROUPS[g].name;
      }
    }
    return null;
  }

  function itemCardHtml(item, current) {
    var cls = 'gtbg-item' + (item.id === current ? ' current' : '') + (item.star ? ' star' : '');
    return (
      '<a class="' + cls + '" href="' + item.href + '">' +
        '<span class="gtbg-item-icon">' + icon(item.icon) + '</span>' +
        '<span class="gtbg-item-text">' +
          '<span class="gtbg-item-label">' + esc(item.label) + (item.star ? ' <span class="gtbg-star">★</span>' : '') + '</span>' +
          '<span class="gtbg-item-desc">' + esc(item.desc) + '</span>' +
        '</span>' +
      '</a>'
    );
  }

  // Shared, single source of truth for the menu's content -- used both by the standard
  // sticky nav on sub-pages, and directly by index.html's own floating overlay (which has
  // its own button/positioning since it sits on top of the live map, but must show the
  // exact same groups and descriptions so the two never drift apart).
  function buildGroupsHtml(current) {
    var currentGroupName = findCurrentGroup(current);
    return GROUPS.map(function (g) {
      var hereTag = g.name === currentGroupName ? '<span class="gtbg-here">you are here</span>' : '';
      return (
        '<div class="gtbg-group">' +
          '<div class="gtbg-group-head">' +
            '<span class="gtbg-group-icon">' + icon(g.icon) + '</span>' +
            '<span><span class="gtbg-group-name">' + esc(g.name) + '</span>' +
            '<span class="gtbg-group-why">' + esc(g.why) + '</span></span>' +
            hereTag +
          '</div>' +
          '<div class="gtbg-group-items">' + g.items.map(function (it) { return itemCardHtml(it, current); }).join('') + '</div>' +
        '</div>'
      );
    }).join('');
  }
  window.GTBG_MENU = { buildGroupsHtml: buildGroupsHtml, loadIconSprite: loadIconSprite, GROUPS: GROUPS };

  function render() {
    var current = CURRENT_PAGE;
    var navMount = document.getElementById('gtbg-nav-mount');
    var footerMount = document.getElementById('gtbg-footer-mount');

    if (navMount) {
      var groupsHtml = buildGroupsHtml(current);

      navMount.outerHTML =
        '<nav id="gtbg-nav" aria-label="Site">' +
          '<a class="brand" href="/">&larr; GETTYSBURG</a>' +
          '<div class="gtbg-nav-spacer"></div>' +
          '<a class="gtbg-historian-pin" href="/historian.html" title="Ask the Historian" aria-label="Ask the Historian">' + icon('broadcast') + '<span>Ask the Historian</span></a>' +
          '<button type="button" class="gtbg-menu-btn" id="gtbg-menu-btn" aria-expanded="false">' + icon('menu') + '<span>Explore</span></button>' +
          '<div class="gtbg-menu-panel" id="gtbg-menu-panel">' + groupsHtml + '</div>' +
        '</nav>';

      var btn = document.getElementById('gtbg-menu-btn');
      var panel = document.getElementById('gtbg-menu-panel');
      function closePanel() { panel.classList.remove('open'); btn.setAttribute('aria-expanded', 'false'); }
      function openPanel() { panel.classList.add('open'); btn.setAttribute('aria-expanded', 'true'); }
      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        panel.classList.contains('open') ? closePanel() : openPanel();
      });
      document.addEventListener('click', function (e) {
        if (panel.classList.contains('open') && !panel.contains(e.target) && e.target !== btn) closePanel();
      });
      document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closePanel(); });
    }

    if (footerMount) {
      var year = new Date().getFullYear();
      footerMount.outerHTML =
        '<footer id="gtbg-footer">' +
          '<span>&copy; ' + year + ' Gettysburg Animated Battlefield Map</span>' +
          '<a href="/privacy.html">Privacy</a>' +
          '<a href="/terms.html">Terms</a>' +
          '<a href="mailto:gettysburginteractivemap@gmail.com">Contact</a>' +
          '<div class="gtbg-footer-spacer"></div>' +
          '<a href="/user-guide.pdf">User Guide (PDF)</a>' +
        '</footer>';
    }

    wireBackLinks();
  }

  // Every link back to the map (both this page's own original "Back to the map" link and
  // the brand link this script just added) used to be a plain href="/" -- a fresh forward
  // navigation, which always fully reloads the frozen React app and replays its entire
  // boot splash and onboarding sequence from the start. A genuine history.back() instead
  // asks the browser to return to the map exactly as it was left (now that netlify.toml no
  // longer blocks that page from the back-forward cache) -- instant, no reload, onboarding
  // already done. Falls back to the plain link for the rare case there's no real map visit
  // in this tab's history to return to (e.g. a sub-page opened directly from a bookmark).
  function wireBackLinks() {
    var links = document.querySelectorAll('a[href="/"]');
    links.forEach(function (a) {
      a.addEventListener('click', function (e) {
        var cameFromThisSite = document.referrer && document.referrer.indexOf(location.origin) === 0;
        if (cameFromThisSite && history.length > 1) {
          e.preventDefault();
          var leftPage = false;
          window.addEventListener('pagehide', function () { leftPage = true; }, { once: true });
          history.back();
          // Safety net: if history.back() didn't actually navigate us away (some edge
          // browser case), fall through to a normal navigation rather than doing nothing.
          setTimeout(function () { if (!leftPage) location.href = '/'; }, 700);
        }
        // else: let the click proceed as a normal link to "/"
      });
    });
  }

  loadIconSprite();

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', render);
  } else {
    render();
  }
})();
