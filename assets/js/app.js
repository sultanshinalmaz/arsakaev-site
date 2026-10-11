/* Сайт-визитка Ислама Арсакаева. Контент берётся из data.js, здесь только сборка
   и поведение: табло вылетов, карта маршрутов, часы, появление блоков. */
(function () {
  'use strict';
  var S = window.SITE;
  if (!S) return;

  var $ = function (sel, root) { return (root || document).querySelector(sel); };
  var $$ = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };
  var esc = function (s) {
    return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; });
  };
  var get = function (path) {
    return path.split('.').reduce(function (o, k) { return o == null ? o : o[k]; }, S);
  };
  var icon = function (name, cls) {
    return '<svg class="' + (cls || 'i') + '" aria-hidden="true"><use href="#i-' + name + '"/></svg>';
  };
  var link = function (id) {
    return S.links.filter(function (l) { return l.id === id; })[0] || {};
  };

  /* ---------- простые тексты ---------- */
  $$('[data-text]').forEach(function (el) {
    var v = get(el.getAttribute('data-text'));
    if (v != null) el.textContent = v;
  });
  $$('[data-year]').forEach(function (el) { el.textContent = new Date().getFullYear(); });

  /* ---------- кнопки ---------- */
  var ext = function (el, url) {
    if (!url) return;
    el.href = url;
    el.target = '_blank';
    el.rel = 'noopener';
  };
  $$('[data-wa]').forEach(function (el) { ext(el, link('whatsapp').url); });
  $$('[data-channel]').forEach(function (el) { ext(el, link('channel').url); });
  $$('[data-direct-tg]').forEach(function (el) { ext(el, link('direct').url); });
  $$('[data-vcard]').forEach(function (el) { el.href = S.contacts.vcard; });
  $$('[data-tel]').forEach(function (el) { el.href = 'tel:' + S.contacts.phone; });

  /* ---------- цифры ---------- */
  var facts = $('[data-facts]');
  if (facts) facts.innerHTML = S.facts.map(function (f) {
    return '<li class="fact"><b class="fact__v">' + esc(f.value) + '</b><span class="fact__l">' + esc(f.label) + '</span></li>';
  }).join('');

  /* ---------- посадочные талоны ---------- */
  // Штрихкод на корешке: полосы из кодов символов ника — у каждой карточки свой
  function barcode(seed) {
    var x = 0, bars = '', h = 0;
    for (var i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
    while (x < 60) {
      h = (h * 1103515245 + 12345) >>> 0;
      var w = 1 + (h >>> 16) % 3;
      bars += '<rect x="' + x + '" y="0" width="' + w + '" height="18"/>';
      x += w + 1 + (h >>> 20) % 2;
    }
    return '<svg class="ticket__code" viewBox="0 0 62 18" preserveAspectRatio="none" aria-hidden="true">' + bars + '</svg>';
  }
  var tickets = $('[data-links]');
  if (tickets) tickets.innerHTML = S.links.map(function (l) {
    return '<a class="ticket' + (l.accent ? ' ticket--accent' : '') + '" href="' + esc(l.url) + '" target="_blank" rel="noopener">' +
      '<span class="ticket__main">' +
        '<span class="ticket__top">' + icon(l.icon, 'ticket__icon') + '<span class="ticket__kind">' + esc(l.kind) + '</span></span>' +
        '<span class="ticket__title">' + esc(l.title) + '</span>' +
        '<span class="ticket__handle">' + esc(l.handle) + '</span>' +
        '<span class="ticket__text">' + esc(l.text) + '</span>' +
        '<span class="ticket__note">' + esc(l.note) + '</span>' +
      '</span>' +
      '<span class="ticket__stub" aria-hidden="true">' +
        '<span class="ticket__gate-l">Выход</span>' +
        '<span class="ticket__gate">' + esc(l.gate) + '</span>' +
        icon('arrow', 'ticket__go') +
        barcode(l.handle) +
      '</span>' +
    '</a>';
  }).join('');

  var direct = $('[data-direct]');
  if (direct) {
    var c = S.contacts;
    direct.innerHTML =
      '<a class="chip" href="tel:' + esc(c.phone) + '">' + icon('phone') + '<span class="chip__t"><small>Позвонить</small>' + esc(c.phoneText) + '</span></a>' +
      '<a class="chip" href="mailto:' + esc(c.email) + '">' + icon('mail') + '<span class="chip__t"><small>Почта</small>' + esc(c.email) + '</span></a>' +
      '<a class="chip chip--save" href="' + esc(c.vcard) + '" download>' + icon('card') + '<span class="chip__t"><small>В телефонную книгу</small>Сохранить контакт</span></a>';
  }

  /* ---------- табло вылетов ---------- */
  var R = S.routes, AP = R.airports;
  var rad = Math.PI / 180;
  function km(a, b) {
    var p1 = a.lat * rad, p2 = b.lat * rad, dp = p2 - p1, dl = (b.lon - a.lon) * rad;
    var h = Math.sin(dp / 2) * Math.sin(dp / 2) + Math.cos(p1) * Math.cos(p2) * Math.sin(dl / 2) * Math.sin(dl / 2);
    return Math.round(6371 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h)) / 10) * 10;
  }
  var flaps = function (code) {
    return '<span class="flaps">' + code.split('').map(function (ch) {
      return '<span class="flap" data-ch="' + ch + '">' + ch + '</span>';
    }).join('') + '</span>';
  };
  var board = $('[data-board]');
  if (board) board.innerHTML = R.list.map(function (r) {
    var a = AP[r[0]], b = AP[r[1]];
    return '<div class="row" role="row">' +
      '<span class="cell" role="cell">' + flaps(r[0]) + '<span class="city">' + esc(a.city) + '</span></span>' +
      '<span class="cell" role="cell">' + flaps(r[1]) + '<span class="city">' + esc(b.city) + '</span></span>' +
      '<span class="cell board__km" role="cell">' + km(a, b).toLocaleString('ru-RU') + ' км</span>' +
      '<span class="cell" role="cell"><span class="status">' + esc(R.status) + '</span></span>' +
    '</div>';
  }).join('');
  var airlines = $('[data-airlines]');
  if (airlines) airlines.textContent = R.airlines.join(' · ');

  // Перекидные буквы: каждая ячейка пролистывает алфавит и встаёт на свою
  var ABC = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  function flipBoard() {
    $$('.flap', board).forEach(function (el, i) {
      var target = el.getAttribute('data-ch');
      var turns = 7 + (i % 6) * 2 + Math.floor(Math.random() * 4);
      var n = 0;
      setTimeout(function tick() {
        el.classList.remove('is-flip');
        void el.offsetWidth;
        el.classList.add('is-flip');
        if (++n >= turns) { el.textContent = target; return; }
        el.textContent = ABC[Math.floor(Math.random() * ABC.length)];
        setTimeout(tick, 62);
      }, i * 45);
    });
  }

  var conds = $('[data-conds]');
  if (conds) conds.innerHTML = R.conditions.map(function (c) {
    return '<li class="cond"><b>' + esc(c.title) + '</b><span>' + esc(c.text) + '</span></li>';
  }).join('');
  var rcta = $('[data-routes-cta]');
  if (rcta) { ext(rcta, R.cta.url); $('span', rcta).textContent = R.cta.text; }

  // Часы: Грозный и Медина живут в одном поясе, UTC+3
  var clock = $('[data-clock]');
  if (clock) {
    var fmt;
    try { fmt = new Intl.DateTimeFormat('ru-RU', { timeZone: 'Europe/Moscow', hour: '2-digit', minute: '2-digit' }); } catch (e) { fmt = null; }
    var tickClock = function () {
      var t = fmt ? fmt.format(new Date()) : '';
      clock.innerHTML = '<span class="board__tz">Грозный · Медина</span> ' + t;
    };
    tickClock();
    setInterval(tickClock, 15000);
  }

  /* ---------- карта маршрутов ---------- */
  // Равнопромежуточная проекция с поправкой на широту ~32°: пропорции суши не плывут
  var B = { lon0: 29, lon1: 57, lat0: 16.5, lat1: 47.5 };
  var KY = 20, KX = KY * Math.cos(32 * rad);
  var W = Math.round((B.lon1 - B.lon0) * KX), H = Math.round((B.lat1 - B.lat0) * KY);
  var P = function (lon, lat) { return [+((lon - B.lon0) * KX).toFixed(1), +((B.lat1 - lat) * KY).toFixed(1)]; };
  var poly = function (pts) { return 'M' + pts.map(function (p) { return P(p[0], p[1]).join(' '); }).join('L') + 'Z'; };

  // Береговые линии упрощены до 20–60 точек по координатам портов и мысов
  var SEAS = [
    { name: 'Чёрное море', at: [34.6, 43.1], pts: [[29.05,41.25],[28.2,41.5],[28,41.95],[27.55,42.45],[27.9,42.85],[27.95,43.2],[28.55,43.5],[28.65,44.2],[29,44.75],[29.65,45.2],[29.7,45.6],[30.25,46.05],[30.75,46.5],[31.5,46.6],[31.9,46.3],[32.9,46],[33.6,46.1],[32.5,45.4],[33.4,45.15],[33.55,44.6],[34.3,44.45],[35.1,44.8],[35.4,45.05],[36.45,45.05],[36.65,45.1],[37.3,44.95],[37.8,44.65],[38.6,44.3],[39.1,44.1],[39.75,43.6],[40.3,43.3],[41,42.95],[41.6,42.6],[41.65,42.1],[41.6,41.6],[41,41.15],[40.3,40.95],[39.7,41],[38.6,40.95],[37.9,41.05],[37,41.2],[36.4,41.3],[35.9,41.7],[35.15,42.05],[34.2,41.95],[33.3,42],[32.3,41.75],[31.4,41.3],[30.2,41.2]] },
    { pts: [[36.6,45.35],[35.5,45.3],[35,45.7],[34.8,46.2],[35.4,46.4],[36.2,46.65],[36.8,46.75],[37.5,47.05],[38.2,47.1],[39.2,47.25],[38.6,47],[38.25,46.7],[37.95,46.4],[38.15,46.05],[37.6,45.6],[37.4,45.3],[36.85,45.4]] },
    { name: 'Каспийское море', at: [51.15, 40.3], rotate: 65, pts: [[49.3,46.55],[50.3,46.85],[51.2,47.05],[51.9,47.1],[53.1,46.8],[53.2,46],[52.75,45.35],[51.6,45.35],[51.3,45.15],[50.25,44.6],[50.85,44.2],[51.15,43.65],[51.3,43.15],[52.6,42.65],[52.95,41.55],[53,41.05],[53.15,40.6],[53,40],[53.1,39.4],[53.6,38.5],[53.97,37.47],[54,36.85],[53.3,36.85],[52.65,36.72],[51.5,36.65],[50.6,37],[49.45,37.47],[48.88,38.42],[48.85,38.75],[49.2,39.3],[49.4,39.6],[49.85,40.35],[50.4,40.45],[49.65,40.6],[49.1,41.2],[48.3,42.05],[47.5,42.98],[47.55,43.5],[47.6,43.85],[47.3,44.3],[47,44.7],[47.2,45.3],[47.8,45.75],[48.6,45.95]] },
    { name: 'Средиземное море', at: [32.6, 33.3], pts: [[26,37],[28,36.75],[29.1,36.6],[29.7,36.15],[30.5,36.4],[30.6,36.85],[31.4,36.75],[32.1,36.5],[32.8,36.05],[33.6,36.15],[34.2,36.3],[34.6,36.8],[35.3,36.6],[35.9,36.85],[36.15,36.6],[35.8,36.3],[35.8,35.5],[35.9,34.9],[35.6,34.3],[35.5,33.9],[35.2,33.2],[35,32.8],[34.9,32.4],[34.75,32.05],[34.5,31.6],[34.2,31.3],[33.8,31.15],[33.1,31.1],[32.3,31.27],[31.9,31.5],[31.1,31.55],[30.3,31.45],[29.9,31.2],[29,30.85],[26,30.9]] },
    { name: 'Красное море', at: [37.2, 21.4], rotate: 58, pts: [[32.55,29.95],[32.6,29.6],[32.75,29.2],[33,28.75],[33.3,28.3],[33.6,27.85],[33.85,27.25],[33.95,26.75],[34.3,26.1],[34.9,25.1],[35.3,24.3],[35.48,23.95],[35.8,23.9],[35.6,23.5],[36,22.9],[36.65,22.22],[36.9,21.4],[37.2,20.6],[37.22,19.62],[37.33,19.1],[38.1,18.5],[38.6,18],[39,16.5],[39.5,15.5],[40.5,14.5],[43,13],[43.3,14],[42.95,14.8],[42.7,15.7],[42.75,16.4],[42.55,16.9],[42,17.6],[41.55,18.2],[41.08,19.13],[40.27,20.15],[39.6,20.9],[39.15,21.5],[39.1,22.3],[39,22.8],[38.6,23.5],[38.05,24.08],[37.6,24.5],[37.25,25.05],[36.45,26.22],[36.1,26.8],[35.7,27.35],[35.2,27.95],[34.6,28.02],[34.75,28.4],[34.8,28.95],[34.95,29.35],[35,29.53],[34.9,29.5],[34.75,29.1],[34.66,28.97],[34.52,28.5],[34.4,28.05],[34.33,27.9],[34.25,27.73],[33.95,27.95],[33.62,28.24],[33.2,28.65],[33.1,29.05],[32.7,29.6]] },
    { name: 'Персидский залив', at: [50.9, 27.6], rotate: -35, pts: [[48.5,29.95],[48,29.95],[47.9,29.4],[48.2,28.9],[48.5,28.4],[49.2,27.5],[49.65,27],[50.15,26.65],[50.1,26.45],[50.2,26.2],[50.6,25.4],[50.8,24.75],[50.85,25.5],[51.25,26.15],[51.55,25.3],[51.6,24.65],[51.8,24],[52.6,24.15],[53.6,24.1],[54.4,24.5],[55,24.95],[55.3,25.25],[55.4,25.35],[55.95,25.8],[56.15,26.1],[56.35,26.4],[56.4,26],[56.27,25.62],[56.35,25.1],[56.75,24.35],[57.6,23.8],[58.6,23.6],[59.5,22.6],[59.8,22.5],[59,21],[58.8,20.4],[57.8,19],[56.8,18.5],[55.5,17.6],[54.1,17],[52.2,15.6],[52,14],[75,14],[75,24],[66.6,25.4],[64,25.3],[62.3,25.15],[60.6,25.3],[57.8,25.65],[57.3,26.6],[56.3,27.18],[55,26.6],[54.9,26.55],[53.6,26.8],[52.6,27.5],[51.4,27.9],[50.85,28.95],[50.2,29.9],[49.4,30.1],[48.9,30.4]] }
  ];
  var ISLANDS = [[[32.3,35.05],[32.95,35.4],[33.9,35.35],[34.6,35.7],[34,35.05],[33.9,34.95],[33,34.6],[32.4,34.75]]];

  function chart() {
    var host = $('[data-chart]');
    if (!host) return;
    var s = '<svg class="map" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="Карта: прямые рейсы из Грозного и Махачкалы в Медину и Джидду">' +
      '<defs>' +
        '<pattern id="hatch" width="6" height="4" patternUnits="userSpaceOnUse"><path d="M0 .5H6" class="hatch"/></pattern>' +
        '<clipPath id="frame"><rect width="' + W + '" height="' + H + '"/></clipPath>' +
      '</defs><g clip-path="url(#frame)">';
    // сетка
    for (var lon = 30; lon <= 55; lon += 5) {
      var x = P(lon, 0)[0];
      s += '<line class="grat" x1="' + x + '" y1="0" x2="' + x + '" y2="' + H + '"/>' +
           '<text class="grat-t" x="' + (x + 3) + '" y="' + (H - 6) + '">' + lon + '°E</text>';
    }
    for (var lat = 20; lat <= 45; lat += 5) {
      var y = P(0, lat)[1];
      s += '<line class="grat" x1="0" y1="' + y + '" x2="' + W + '" y2="' + y + '"/>' +
           '<text class="grat-t" x="4" y="' + (y - 4) + '">' + lat + '°N</text>';
    }
    // моря
    SEAS.forEach(function (sea) { s += '<path class="sea" d="' + poly(sea.pts) + '"/>'; });
    ISLANDS.forEach(function (isl) { s += '<path class="isle" d="' + poly(isl) + '"/>'; });
    SEAS.forEach(function (sea) {
      if (!sea.name) return;
      var p = P(sea.at[0], sea.at[1]);
      s += '<text class="sea-t" x="' + p[0] + '" y="' + p[1] + '"' + (sea.rotate ? ' transform="rotate(' + sea.rotate + ' ' + p[0] + ' ' + p[1] + ')"' : '') + '>' + sea.name + '</text>';
    });
    // маршруты: дуги, как на картах авиакомпаний
    R.list.forEach(function (r, i) {
      var a = P(AP[r[0]].lon, AP[r[0]].lat), b = P(AP[r[1]].lon, AP[r[1]].lat);
      var dx = b[0] - a[0], dy = b[1] - a[1], len = Math.sqrt(dx * dx + dy * dy);
      var bow = (r[0] === 'GRV' ? 1 : -1) * len * (r[1] === 'JED' ? 0.16 : 0.1);
      var cx = (a[0] + b[0]) / 2 - dy / len * bow, cy = (a[1] + b[1]) / 2 + dx / len * bow;
      s += '<path id="rt' + i + '" class="route" pathLength="100" d="M' + a.join(' ') + 'Q' + cx.toFixed(1) + ' ' + cy.toFixed(1) + ' ' + b.join(' ') + '" style="--d:' + (i * 0.25) + 's"/>';
    });
    // самолёт летит по первому маршруту
    s += '<g class="jet"><g transform="rotate(90) translate(-9 -9) scale(.75)"><use href="#i-plane" width="24" height="24"/></g>' +
         '<animateMotion dur="9s" repeatCount="indefinite" rotate="auto" keyPoints="0;1" keyTimes="0;1" calcMode="linear"><mpath href="#rt0"/></animateMotion></g>';
    // аэропорты
    var LBL = { GRV: [-8, -10, 'end'], MCX: [9, 4, 'start'], MED: [10, 4, 'start'], JED: [10, 6, 'start'] };
    Object.keys(AP).forEach(function (code) {
      var a = AP[code], p = P(a.lon, a.lat), l = LBL[code] || [8, 4, 'start'];
      s += '<circle class="ap-ring" cx="' + p[0] + '" cy="' + p[1] + '" r="7"/><circle class="ap" cx="' + p[0] + '" cy="' + p[1] + '" r="3.2"/>' +
        '<text class="ap-code" x="' + (p[0] + l[0]) + '" y="' + (p[1] + l[1]) + '" text-anchor="' + l[2] + '">' + code +
        '<tspan class="ap-city" dx="5">' + a.city + '</tspan></text>';
    });
    s += '</g></svg>';
    host.innerHTML = s;
  }
  chart();

  /* ---------- услуги ---------- */
  var svc = $('[data-services]');
  if (svc) svc.innerHTML = S.services.map(function (x) {
    return '<li class="svc__item"><span class="svc__n">' + esc(x.n) + '</span><h3 class="svc__t">' + esc(x.title) + '</h3><p class="svc__p">' + esc(x.text) + '</p></li>';
  }).join('');

  /* ---------- обо мне ---------- */
  var A = S.about;
  var at = $('[data-about-text]');
  if (at) at.innerHTML = A.paragraphs.map(function (p) { return '<p>' + esc(p) + '</p>'; }).join('');
  var langs = $('[data-langs]');
  if (langs) langs.innerHTML = A.languages.map(function (l) { return '<li>' + esc(l) + '</li>'; }).join('');
  var pth = $('[data-path]');
  if (pth) pth.innerHTML = A.path.map(function (p) {
    return '<li class="path__i"><b class="path__s">' + esc(p.step) + '</b><span class="path__t">' + esc(p.text) + '</span></li>';
  }).join('');
  var vt = $('[data-values-text]');
  if (vt) vt.textContent = A.values.text;
  var vw = $('[data-values-words]');
  if (vw) vw.innerHTML = A.values.words.map(function (w) { return '<li>' + esc(w) + '</li>'; }).join('');

  /* ---------- доверие ---------- */
  var T = S.trust;
  var story = $('[data-story]');
  if (story) story.innerHTML =
    '<p class="story__label">' + esc(T.story.label) + '</p>' +
    '<h3 class="story__title">' + esc(T.story.title) + '</h3>' +
    T.story.text.map(function (p) { return '<p class="story__p">' + esc(p) + '</p>'; }).join('') +
    '<a class="story__src" href="' + esc(T.story.source.url) + '" target="_blank" rel="noopener">' + esc(T.story.source.text) + icon('arrow') + '</a>';
  var pts = $('[data-points]');
  if (pts) pts.innerHTML = T.points.map(function (p) {
    return '<li class="point"><b>' + esc(p.title) + '</b><span>' + esc(p.text) + '</span></li>';
  }).join('');

  /* ---------- появление при прокрутке ---------- */
  var watch = $$('.head, .ticket, .direct, .board, .cond, .chart, .svc__item, .about__main, .path__i, .values, .quote, .story, .point, .final__inner');
  var boardFlipped = false;
  var show = function (el) {
    el.classList.add('is-in');
    if (!boardFlipped && el.classList.contains('board')) { boardFlipped = true; flipBoard(); }
  };
  if ('IntersectionObserver' in window) {
    document.documentElement.classList.add('js-reveal');
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { show(e.target); io.unobserve(e.target); }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    watch.forEach(function (el) { io.observe(el); });
  } else {
    watch.forEach(show);
  }

  /* ---------- нижняя панель на телефоне ---------- */
  // Видна, пока кнопка WhatsApp первого экрана не видна целиком и финальный блок не на экране
  var mbar = $('.mbar');
  if (mbar && 'IntersectionObserver' in window) {
    var seen = new Map();
    var sync = function () {
      var any = false;
      seen.forEach(function (v) { any = any || v; });
      mbar.classList.toggle('is-on', !any);
    };
    var mio = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        seen.set(e.target, e.target.classList.contains('btn') ? e.intersectionRatio > 0.98 : e.isIntersecting);
      });
      sync();
    }, { threshold: [0, 1] });
    $$('.hero .btn--green, .final, .foot').forEach(function (el) { seen.set(el, true); mio.observe(el); });
  }

  /* ---------- шапка: фон после первого экрана ---------- */
  var bar = $('.bar');
  var onScroll = function () { bar.classList.toggle('is-solid', window.scrollY > 40); };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
})();
