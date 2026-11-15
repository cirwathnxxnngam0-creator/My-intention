/* เจตจำนงของความคิด — สคริปต์หลัก (ไม่มี backend; บันทึกเก็บในเบราว์เซอร์)
   ส่วนต่าง ๆ: ที่เก็บข้อมูล · ย้อนกลับ · สำนักคิด · นักปราชญ์ · สนทนา · คำสอน · สมุดแยกหน้า · ตั้งค่า (หน้าอ่านสำนัก: school.js, สมอง: brain.js) (ติดตั้ง/อัปเดต/เชื่อม AI/สำรอง) · เชื่อม AI: ai.js */
(function () {
  'use strict';
  var D = window.JCT;
  var SAGES = window.JCT_SAGES || [];
  var KEY = 'jct:v1:';

  // ---------- ที่เก็บข้อมูล (ล้มเหลวได้ ต้องไม่พัง) ----------
  var mem = {};
  function load(id) {
    try {
      var raw = localStorage.getItem(KEY + id);
      return raw ? JSON.parse(raw) : (mem[id] || null);
    } catch (e) { return mem[id] || null; }
  }
  function save(id, obj) {
    mem[id] = obj;
    try { localStorage.setItem(KEY + id, JSON.stringify(obj)); return true; }
    catch (e) { return false; }
  }
  function drop(id) {
    delete mem[id];
    try { localStorage.removeItem(KEY + id); } catch (e) { /* ไม่เป็นไร */ }
  }
  function hasNote(id) {
    var n = load(id);
    return !!(n && (n.orig || n.trans || n.sum || n.one || n.interp));
  }
  function sageNote(id) { return load('sage:' + id) || { interp: '', chat: [] }; }
  function hasSageNote(id) {
    var n = load('sage:' + id);
    return !!(n && (n.interp || (n.chat && n.chat.length)));
  }
  function cfg() { return load('cfg') || {}; }
  function el(sel, root) { return (root || document).querySelector(sel); }
  function els(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function schoolById(id) { for (var i = 0; i < D.schools.length; i++) if (D.schools[i].id === id) return D.schools[i]; return null; }
  function initials(s) { return s.en.replace(/\(.*?\)/g, '').replace(/^The /, '').trim().split(/\s+/).map(function (w) { return w.charAt(0); }).filter(function (c) { return /[A-Z]/.test(c); }).slice(0, 2).join(''); }
  var EAST = { laozi: 1, confucius: 1, buddha: 1 };
  var EARLY = { petrarca: 1, descartes: 1, spinoza: 1, locke: 1, leibniz: 1 };
  function groupOf(s, i) { return EAST[s.id] ? 'east' : EARLY[s.id] ? 'early' : i < 10 ? 'greek' : 'modern'; }
  function copyText(text) {
    try { return navigator.clipboard.writeText(text).then(function () { return true; }, function () { return false; }); }
    catch (e) { return Promise.resolve(false); }
  }
  var isWeb = location.protocol === 'http:' || location.protocol === 'https:';
  // ภาพเคลื่อนไหว: เปิดเป็นค่าเริ่มต้น เว้นแต่ผู้ใช้ปิดไว้ หรือระบบตั้งให้ลดการเคลื่อนไหว
  var prefs = load('prefs') || {};
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (prefs.motion !== false && !reduce) document.documentElement.classList.add('motion');
  var page = document.body.getAttribute('data-page');

  function list(id) { var v = load(id); return Array.isArray(v) ? v : []; }
  function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }
  function sageById(id) { for (var i = 0; i < SAGES.length; i++) if (SAGES[i].id === id) return SAGES[i]; return null; }
  function sagesOf(schoolId) { return SAGES.filter(function (g) { return g.schools.indexOf(schoolId) > -1; }); }
  // ปุ่มที่ต้องกดสองครั้งเพื่อยืนยัน (หน้าใน artifact ใช้ confirm() ไม่ได้)
  function twoStep(btn, label, fn) {
    btn.addEventListener('click', function () {
      if (btn.getAttribute('data-sure') !== '1') {
        btn.setAttribute('data-sure', '1'); btn.textContent = 'กดอีกครั้งเพื่อยืนยัน';
        setTimeout(function () { btn.removeAttribute('data-sure'); btn.textContent = label; }, 4000);
        return;
      }
      btn.removeAttribute('data-sure'); btn.textContent = label; fn();
    });
  }
  // ตัดบรรทัดเฉพาะที่ช่องว่าง (ชื่อไทยยาวจะไม่ขาดกลางคำ)
  function nobreak(t) { return String(t).split(' ').map(function (w) { return '<span class="nw">' + esc(w) + '</span>'; }).join(' '); }
  function fmtDate(t) { try { return new Date(t).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' }); } catch (e) { return ''; } }

  // แบ่งหน้ารายการ: แสดงทีละ per รายการ พร้อมปุ่มก่อนหน้า/ถัดไป
  function paged(box, items, render, per, empty, wrap) {
    per = per || 8;
    var pages = Math.max(1, Math.ceil(items.length / per)), cur = Math.min(+(box.getAttribute('data-p') || 0), pages - 1);
    function draw() {
      box.setAttribute('data-p', cur);
      if (!items.length) { box.innerHTML = '<p class="empty">' + empty + '</p>'; return; }
      box.innerHTML = '<div class="' + (wrap || 'plist') + '">' + items.slice(cur * per, cur * per + per).map(render).join('') + '</div>' +
        (pages > 1 ? '<div class="pager"><button class="btn ghost sm" type="button" data-pg="-1"' + (cur ? '' : ' disabled') + '>← ก่อนหน้า</button><span class="muted small">หน้า ' + (cur + 1) + ' / ' + pages + ' · ' + items.length + ' รายการ</span><button class="btn ghost sm" type="button" data-pg="1"' + (cur < pages - 1 ? '' : ' disabled') + '>ถัดไป →</button></div>' : '');
    }
    box.onclick = function (e) { var b = e.target.closest('[data-pg]'); if (!b || !box.contains(b)) return; cur = Math.max(0, Math.min(pages - 1, cur + +b.getAttribute('data-pg'))); draw(); box.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); };
    draw();
  }
  function annDocs() {
    var out = [];
    try { for (var i = 0; i < localStorage.length; i++) { var k = localStorage.key(i); if (k && k.indexOf(KEY + 'ann:') === 0) { var v = JSON.parse(localStorage.getItem(k)); if (v) out.push({ doc: k.slice((KEY + 'ann:').length), d: v }); } } } catch (e) { /* ไม่เป็นไร */ }
    return out;
  }
  window.JCTApp = { load: load, save: save, el: el, els: els, esc: esc, cfg: cfg, callClaude: function () { return callAI.apply(null, arguments); }, callAI: function () { return callAI.apply(null, arguments); }, aiReady: aiReady, sagesOf: sagesOf, schoolById: schoolById, sageById: sageById, fmtDate: fmtDate };

  // ปุ่มย้อนกลับ: กลับไปหน้าก่อนหน้าถ้ามาจากเว็บนี้ ไม่อย่างนั้นไปหน้าแม่ของห้อง
  document.addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest('[data-back]');
    if (!b) return;
    try {
      var r = document.referrer;
      if (r && history.length > 1 && new URL(r).host === location.host && new URL(r).protocol === location.protocol) { e.preventDefault(); history.back(); }
    } catch (err) { /* ใช้ลิงก์ปกติ */ }
  });

  // หัวข้อย่อยของห้อง: เลื่อนไปยังชั้นที่เลือก
  document.addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest('[data-jump]');
    if (!b) return;
    if (window.JCTZone && window.JCTZone.show(b.getAttribute('data-jump'))) return;
    var t = document.getElementById(b.getAttribute('data-jump'));
    if (t) t.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });

  // ---------- โซน: แสดงทีละโซน + แถบย้อนกลับ/ถัดไปด้านล่าง + ปัดซ้ายขวาบนมือถือ ----------
  var ROOMSEQ = [['index.html', 'หน้าแรก'], ['schools.html', 'สำนักคิด'], ['poems.html', 'เจตจำนง'], ['brain.html', 'สมองและสารสื่อประสาท'], ['sages.html', 'พูดคุยกับนักปราชญ์'], ['notebook.html', 'สมุดบันทึก']];
  var Z = { list: [], cur: -1, hooks: [] };
  function zoneEnds() {
    // ปลายทางเมื่ออยู่โซนแรก/โซนสุดท้าย
    var file = (location.pathname.split('/').pop() || 'index.html'), h = (location.hash || '').replace('#', ''), i, prev = null, next = null;
    if (page === 'school' || page === 'sage') {
      var arr = page === 'school' ? D.schools : SAGES, k = -1;
      for (i = 0; i < arr.length; i++) if (arr[i].id === h) k = i;
      prev = [page === 'school' ? 'schools.html' : 'sages.html', page === 'school' ? 'สำนักคิดทั้งหมด' : 'นักปราชญ์ทั้งหมด'];
      if (k >= 0 && k < arr.length - 1) next = [file + '#' + arr[k + 1].id, arr[k + 1].th];
      else next = prev;
      return { prev: prev, next: next };
    }
    if (file === 'settings.html') return { prev: ['index.html', 'หน้าแรก'], next: ['index.html', 'หน้าแรก'] };
    for (i = 0; i < ROOMSEQ.length; i++) if (ROOMSEQ[i][0] === file) { prev = i > 0 ? ROOMSEQ[i - 1] : null; next = i < ROOMSEQ.length - 1 ? ROOMSEQ[i + 1] : ROOMSEQ[0]; }
    return { prev: prev, next: next };
  }
  function zoneBar() {
    var bar = el('#zonebar'); if (!bar) return;
    var n = Z.list.length, c = Z.cur, ends = zoneEnds();
    var pl = n && c > 0 ? ['#', Z.list[c - 1].label, true] : ends.prev ? [ends.prev[0], ends.prev[1]] : null;
    var nl = n && c < n - 1 ? ['#', Z.list[c + 1].label, true] : ends.next ? [ends.next[0], (n ? 'ต่อไป: ' : '') + ends.next[1]] : null;
    bar.innerHTML = (pl ? '<a class="zb zb-prev" href="' + (pl[2] ? '#' : pl[0]) + '"' + (pl[2] ? ' data-z="-1"' : '') + '><span aria-hidden="true">←</span><span class="zl">' + esc(pl[1]) + '</span></a>' : '<span></span>') +
      '<span class="zdots" aria-hidden="true">' + (n > 1 ? Z.list.map(function (z, i) { return '<i' + (i === c ? ' class="on"' : '') + '></i>'; }).join('') : '') + '</span>' +
      (nl ? '<a class="zb zb-next" href="' + (nl[2] ? '#' : nl[0]) + '"' + (nl[2] ? ' data-z="1"' : '') + '><span class="zl">' + esc(nl[1]) + '</span><span aria-hidden="true">→</span></a>' : '<span></span>');
  }
  function showZone(id, opt) {
    var k = -1; Z.list.forEach(function (z, i) { if (z.id === id) k = i; });
    if (k < 0) return false;
    Z.cur = k;
    Z.list.forEach(function (z, i) { z.el.hidden = i !== k; });
    els('[data-jump]').forEach(function (b) { if (b.getAttribute('data-jump') === id) b.setAttribute('aria-current', 'true'); else b.removeAttribute('aria-current'); });
    if (document.body.getAttribute('data-hashzone') === '1') { try { history.replaceState(null, '', '#' + id); } catch (e) { /* ไม่เป็นไร */ } }
    try { sessionStorage.setItem('jct:zone:' + page, id); } catch (e) { /* ไม่เป็นไร */ }
    zoneBar();
    Z.hooks.forEach(function (f) { f(id); });
    if (!(opt && opt.noScroll)) { var top = el('.subnav') || Z.list[k].el; var y = top.getBoundingClientRect().top + window.scrollY - 76; if (window.scrollY > y || (opt && opt.toTop)) window.scrollTo({ top: Math.max(0, y), behavior: 'smooth' }); }
    return true;
  }
  function stepZone(d) {
    if (Z.list.length && Z.list[Z.cur + d]) { showZone(Z.list[Z.cur + d].id, { toTop: true }); return; }
    var a = el(d < 0 ? '#zonebar .zb-prev' : '#zonebar .zb-next'); if (a && a.getAttribute('href') !== '#') location.href = a.getAttribute('href');
  }
  window.JCTZone = { show: function (id, opt) { return showZone(id, opt); }, on: function (f) { Z.hooks.push(f); }, refresh: zoneBar, current: function () { return Z.list[Z.cur] ? Z.list[Z.cur].id : null; } };
  (function initZones() {
    els('.subnav [data-jump]').forEach(function (b) { var t = document.getElementById(b.getAttribute('data-jump')); if (t) Z.list.push({ id: t.id, label: b.textContent.replace(/\s*\d+$/, '').trim(), el: t }); });
    if (Z.list.length > 1) document.body.classList.add('zoned');
    var bar = document.createElement('nav'); bar.id = 'zonebar'; bar.className = 'zonebar'; bar.setAttribute('aria-label', 'ย้อนกลับและถัดไป'); document.body.appendChild(bar);
    bar.addEventListener('click', function (e) { var a = e.target.closest('[data-z]'); if (!a) return; e.preventDefault(); stepZone(+a.getAttribute('data-z')); });
    var h = (location.hash || '').replace('#', ''), first = null;
    try { var j = sessionStorage.getItem('jct:jump'); if (j && Z.list.some(function (z) { return z.id === j; })) { first = j; sessionStorage.removeItem('jct:jump'); } } catch (e) { /* ไม่เป็นไร */ }
    if (!first && Z.list.some(function (z) { return z.id === h; })) first = h;
    if (!first) { try { var s = sessionStorage.getItem('jct:zone:' + page); if (s && Z.list.some(function (z) { return z.id === s; }) && document.referrer.indexOf(location.pathname) > -1) first = s; } catch (e) { /* ไม่เป็นไร */ } }
    if (Z.list.length > 1) showZone(first || Z.list[0].id, { noScroll: true }); else zoneBar();
    window.addEventListener('hashchange', function () { var id = (location.hash || '').replace('#', ''); if (!showZone(id, { noScroll: false })) zoneBar(); });
    // ปุ่มลูกศรบนแป้นพิมพ์ (เมื่อไม่ได้พิมพ์อยู่)
    document.addEventListener('keydown', function (e) {
      if (e.altKey || e.ctrlKey || e.metaKey || (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight')) return;
      var a = document.activeElement; if (a && /INPUT|TEXTAREA|SELECT/.test(a.tagName) || (a && a.isContentEditable)) return;
      if (String(window.getSelection() || '')) return;
      stepZone(e.key === 'ArrowLeft' ? -1 : 1);
    });
    // ปัดซ้าย/ขวาบนจอสัมผัส
    var sx = null, sy = 0, st = 0;
    document.addEventListener('touchstart', function (e) {
      sx = null;
      if (e.touches.length !== 1) return;
      var t = e.target;
      if (t.closest && t.closest('input,textarea,select,canvas,.v3d,.ink-paper,.tablewrap,.rd-bar,.subnav,.chips,.rd-full')) return;
      sx = e.touches[0].clientX; sy = e.touches[0].clientY; st = Date.now();
    }, { passive: true });
    document.addEventListener('touchend', function (e) {
      if (sx === null) return;
      var t = e.changedTouches[0], dx = t.clientX - sx, dy = t.clientY - sy; sx = null;
      if (Date.now() - st > 700 || Math.abs(dx) < 70 || Math.abs(dx) < Math.abs(dy) * 2) return;
      if (String(window.getSelection() || '')) return;
      stepZone(dx < 0 ? 1 : -1);
    }, { passive: true });
  })();

  // เวอร์ชันท้ายหน้าและในหน้าตั้งค่า
  els('[data-ver]').forEach(function (n) { n.textContent = 'รุ่น ' + D.version; });
  els('[data-rel]').forEach(function (n) { n.textContent = D.released; });

  // ---------- หน้าสำนักคิด ----------
  function initSchools() {
    var list = el('#listbox'), q = el('#q'), cnt = el('#count');
    var filter = 'all';
    function teachLine(s) { var g = sagesOf(s.id)[0]; return g ? g.concepts[0] : ''; }
    function render() {
      var term = (q.value || '').trim().toLowerCase();
      var rows = D.schools.map(function (s, i) { return { s: s, n: i + 1 }; }).filter(function (r) {
        var hay = (r.s.th + ' ' + r.s.en + ' ' + r.s.who + ' ' + sagesOf(r.s.id).map(function (g) { return g.concepts.join(' ') + ' ' + g.worldly.join(' '); }).join(' ')).toLowerCase();
        return (filter === 'all' || r.s.src === filter) && (!term || hay.indexOf(term) > -1);
      });
      var withNotes = D.schools.filter(function (s) { return hasNote(s.id); }).length;
      cnt.textContent = (rows.length === D.schools.length ? 'แสดงทุกสำนัก' : 'ตรงกับคำค้น ' + rows.length + ' สำนัก') + (withNotes ? ' · มีบันทึกแล้ว ' + withNotes : '');
      paged(list, rows, function (r) {
        var s = r.s;
        return '<a class="item" href="school.html#' + s.id + '">' +
          '<span class="num sm" data-s="' + s.src + '" aria-hidden="true">' + r.n + '</span>' +
          '<div><h3>' + esc(s.th) + '</h3><div class="en">' + esc(s.en) + '</div>' +
          '<div class="who">' + esc(teachLine(s) || s.who) + '</div></div>' +
          (hasNote(s.id) ? '<span class="tag"><span class="dot" aria-hidden="true"></span>มีบันทึก</span>' : '<span></span>') + '</a>';
      }, 7, 'ไม่พบสำนักคิดที่ตรงกับคำค้น', 'list');
    }
    q.addEventListener('input', function () { list.removeAttribute('data-p'); render(); });
    render();
  }

  // หน้าอ่านสำนักคิดอยู่ใน js/school.js

  // ---------- นักปราชญ์: รายการ ----------
  function initSages() {
    var list = el('#slist'), q = el('#sq'), cnt = el('#scount');
    var group = 'all';
    function schoolNames(s) { return s.schools.map(function (id) { var x = schoolById(id); return x ? x.th : ''; }).filter(Boolean).join(' · '); }
    function render() {
      var term = (q.value || '').trim().toLowerCase();
      var rows = SAGES.map(function (s, i) { return { s: s, g: groupOf(s, i) }; }).filter(function (r) {
        var s = r.s;
        var hay = (s.th + ' ' + s.en + ' ' + schoolNames(s) + ' ' + s.insights.join(' ') + ' ' + s.concepts.join(' ') + ' ' + s.worldly.join(' ')).toLowerCase();
        return (group === 'all' || r.g === group) && (!term || hay.indexOf(term) > -1);
      });
      var talked = SAGES.filter(function (s) { return hasSageNote(s.id); }).length;
      cnt.textContent = (rows.length === SAGES.length ? 'แสดงทุกคน' : 'ตรงกับคำค้น ' + rows.length + ' คน') + (talked ? ' · เคยคุยหรือจดไว้แล้ว ' + talked : '');
      paged(list, rows, function (r) {
        var s = r.s;
        return '<a class="scard" href="sage.html#' + s.id + '">' +
          '<span class="num sm" data-s="' + (r.g === 'east' ? 'sage' : r.g === 'greek' ? 'gb' : r.g === 'early' ? 'ct' : 'lily') + '" aria-hidden="true">' + esc(initials(s)) + '</span>' +
          '<div><h3>' + (hasSageNote(s.id) ? '<span class="dot" aria-hidden="true"></span>' : '') + esc(s.th) + '</h3>' +
          '<div class="en">' + esc(s.en) + ' · ' + esc(s.years) + '</div>' +
          '<div class="sch">' + esc(schoolNames(s)) + '</div><div class="teach1">' + esc(s.concepts[0]) + '</div></div></a>';
      }, 9, 'ไม่พบนักปราชญ์ที่ตรงกับคำค้น', 'sgrid');
    }
    q.addEventListener('input', function () { list.removeAttribute('data-p'); render(); });
    // บทสนทนาที่บันทึกไว้ (บันทึกอัตโนมัติทุกข้อความ)
    var talks = SAGES.map(function (g) { var n = load('sage:' + g.id); return n && n.chat && n.chat.length ? { g: g, n: n } : null; }).filter(Boolean).sort(function (a, b) { return (b.n.t || 0) - (a.n.t || 0); });
    paged(el('#savedlist'), talks, function (x) {
      var last = x.n.chat[x.n.chat.length - 1];
      return '<a class="pitem" href="sage.html#' + x.g.id + '"><b>' + esc(x.g.th) + '</b><span class="meta2">' + x.n.chat.length + ' ข้อความ · ล่าสุด ' + fmtDate(x.n.t) + '</span><span class="snip">' + esc((last.r === 'u' ? 'คุณ: ' : x.g.th + ': ') + last.t) + '</span></a>';
    }, 6, 'ยังไม่มีบทสนทนา เลือกนักปราชญ์ที่อยากคุยด้วยจากรายชื่อด้านบน');
    els('.chip[data-g]').forEach(function (b) {
      b.addEventListener('click', function () {
        group = b.getAttribute('data-g');
        els('.chip[data-g]').forEach(function (c) { c.setAttribute('aria-pressed', c === b ? 'true' : 'false'); });
        render();
      });
    });
    render();
  }

  // ---------- คำสั่งระบบของ "สนทนานักปราชญ์" (ต้องตรงกับ project-2/สนทนานักปราชญ์.md และ app/src/lib/sage.ts) ----------
  function sagePrompt(s, interp) {
    return [
      'คุณกำลังจำลองบทสนทนากับ ' + s.th + ' (' + s.en + ', ' + s.years + ') เพื่อการเรียนรู้ ตามวิธี "สนทนานักปราชญ์"',
      'พูดเป็นภาษาไทยในบุรุษที่หนึ่งของ' + s.th + ' ตามข้อมูลนี้:',
      '[หลักคำสอน — หัวใจของการสนทนา]',
      'แก่นคำสอน: ' + s.concepts.join(' / '),
      'ข้อคิด: ' + s.insights.join(' / '),
      'คำสอนต่อปัญหาทางโลก: ' + s.worldly.join(' / '),
      'วิธีมองโลกตามคำสอน: ' + s.worldview,
      'เจตจำนงของคำสอน: ' + s.will,
      'ทัศนคติ: ' + s.attitude,
      '[ปัจจัยรอง — ใช้จำลองการพูด]',
      'วิธีให้คำปรึกษา: ' + s.counsel,
      'วิธีพูด: ' + s.speech,
      'การใช้คำสอนในชีวิตของตน: ' + s.behavior,
      'งานหลัก: ' + s.works,
      'ข้อควรระวัง: ' + s.caveat,
      'การตีความของผู้ใช้ต่อคำสอนนี้: ' + (interp && interp.trim() ? interp.trim() : '(ยังไม่มี)'),
      '',
      'กติกา:',
      '1) เน้นหลักคำสอน ไม่เล่าประวัติชีวิต: ตอบโดยยกหลักคำสอนมาใช้กับเรื่องของผู้ใช้ เล่าเรื่องชีวิตตัวเองเฉพาะเมื่อผู้ใช้ถาม และตอบสั้นแล้วกลับมาที่คำสอน',
      '1.1) ใช้น้ำเสียงตาม "วิธีพูด" ให้เหตุผลตาม "หลักคำสอน" และ "วิธีมองโลก" ให้คำปรึกษาตาม "วิธีให้คำปรึกษา" และ "คำสอนต่อปัญหาทางโลก"',
      '2) ตอบสั้น ไม่เกินราว 150–200 คำ เว้นแต่ผู้ใช้ขอยาว ปิดด้วยคำถามกลับหนึ่งข้อเมื่อเข้ากับบุคลิก',
      '3) ห้ามแต่งคำพูดอ้างอิง: ไม่ใส่เครื่องหมายคำพูดแล้วอ้างว่าเป็นถ้อยคำจริง ให้ถอดความ และระบุชื่องานเฉพาะเมื่อแน่ใจ',
      '4) ถ้าคำถามเกินยุคของตน (เทคโนโลยี เหตุการณ์ภายหลัง) ให้บอกสั้น ๆ ว่ายุคของตนไม่มีสิ่งนี้ แล้วใช้หลักเดิมคิดต่อ',
      '5) ไม่เอาใจผู้ใช้ ถ้าบุคคลนี้จะไม่เห็นด้วย ให้ไม่เห็นด้วยตรง ๆ ตามบุคลิก',
      '6) ถ้าความเห็นในบทขัดกับความรู้ปัจจุบันอย่างสำคัญ หรือเข้าข่าย "ข้อควรระวัง" ให้เติมบรรทัดท้ายขึ้นต้นว่า "นอกบท:" หนึ่งถึงสองประโยค',
      '7) หยุดบทบาททันทีและตอบในฐานะผู้ช่วย เมื่อผู้ใช้พูดถึงการทำร้ายตัวเองหรือผู้อื่น อยู่ในภาวะวิกฤตทางใจ ต้องการคำแนะนำทางการแพทย์ กฎหมาย หรือการเงินที่มีผลจริง หรือขอให้ออกจากบท การสนทนานี้ไม่ใช่การบำบัดและไม่แทนผู้เชี่ยวชาญ',
      '8) ถ้าไม่แน่ใจว่าคำสอนใดเป็นของบุคคลนี้จริง (เช่น ถูกบันทึกโดยศิษย์หรือหลักฐานน้อย) ให้บอก',
      '9) เมื่อผู้ใช้เสนอการตีความของตน ให้บอกว่าส่วนไหนตรงกับงานของคุณ ส่วนไหนไปไกลกว่างาน แล้วถามกลับ ห้ามปัดตกเพียงเพราะต่างจากตำรา'
    ].join('\n');
  }

  // เรียก AI ที่ผู้ใช้เลือก (Claude, ChatGPT, Gemini, OpenRouter หรือบริการแบบ OpenAI) ผ่าน ai.js
  function aiReady() { return !!(window.JCTAI && window.JCTAI.ready()); }
  function callAI(system, messages, maxTokens) {
    if (!window.JCTAI) return Promise.reject(new Error('โหลดส่วนเชื่อม AI ไม่ได้'));
    return window.JCTAI.call(system, messages, maxTokens);
  }

  // ---------- นักปราชญ์: รายคน + สนทนา ----------
  function initSage() {
    var current = null, note = null, timer = null, busy = false;
    var msgs = el('#msgs'), input = el('#c-in'), status = el('#c-status');
    function idx() {
      var h = (location.hash || '').replace('#', '');
      for (var i = 0; i < SAGES.length; i++) if (SAGES[i].id === h) return i;
      return -1;
    }
    function persist() { note.t = Date.now(); return save('sage:' + current.id, note); }
    function bubble(cls, who, text) {
      var d = document.createElement('div');
      d.className = 'msg ' + cls;
      if (who) { var w = document.createElement('span'); w.className = 'who'; w.textContent = who; d.appendChild(w); }
      d.appendChild(document.createTextNode(text));
      msgs.appendChild(d);
      msgs.scrollTop = msgs.scrollHeight;
      return d;
    }
    function renderChat() {
      msgs.innerHTML = '';
      if (!note.chat.length) bubble('sys', '', 'ยังไม่มีบทสนทนากับ' + current.th + ' เริ่มจากคำถามด้านล่างหรือพิมพ์เรื่องของคุณ');
      note.chat.forEach(function (m) { bubble(m.r === 'u' ? 'me' : 'sage', m.r === 'u' ? 'คุณ' : current.th, m.t); });
      el('#starters').hidden = note.chat.length > 0;
    }
    function mode() {
      var has = aiReady(), m = el('#c-mode');
      m.className = 'state' + (has ? ' ok' : '');
      m.innerHTML = '<i></i>' + (has ? 'ตอบในหน้านี้ด้วย ' + esc(window.JCTAI.label()) : 'ยังไม่ได้เชื่อม AI · ใช้ปุ่มคัดลอกคำสั่ง');
    }
    function show() {
      var i = idx();
      el('#snf').hidden = i >= 0;
      el('#sok').hidden = i < 0;
      if (i < 0) { document.title = 'ไม่พบนักปราชญ์ · เจตจำนงของความคิด'; return; }
      var s = SAGES[i];
      current = s;
      note = sageNote(s.id);
      if (!note.chat) note.chat = [];
      document.title = 'สนทนากับ' + s.th + ' · เจตจำนงของความคิด';
      el('#s-name').innerHTML = nobreak(s.th);
      el('#s-years').textContent = s.years;
      el('#s-works').textContent = 'งาน: ' + s.works;
      el('#s-medal').textContent = initials(s);
      el('#c-title').textContent = 'สนทนากับ' + s.th;
      el('#s-schools').innerHTML = s.schools.map(function (id) { var x = schoolById(id); return x ? '<a class="chip" href="school.html#' + id + '">' + esc(x.th) + '</a>' : ''; }).join('');
      el('#s-th2').innerHTML = 'หลักคำสอนของ' + nobreak(s.th);
      el('#s-core').innerHTML = s.concepts.map(function (c) { return '<li><div>' + esc(c) + '</div></li>'; }).join('');
      var aspects = [['ข้อคิด', s.insights, 'คติที่ถอดความจากคำสอน'], ['ใช้กับชีวิต', s.worldly, 'หลักคำสอนต่อปัญหาทางโลก'], ['วิธีมองโลก', s.worldview, 'ภาพของโลกตามคำสอน'], ['เจตจำนง', s.will, 'สิ่งที่คำสอนมุ่งให้เกิด'], ['ทัศนคติ', s.attitude, 'ท่าทีต่อผู้คนและโลก']];
      el('#t-tabs').innerHTML = aspects.map(function (a, i) { return '<button class="chip" type="button" role="tab" data-a="' + i + '" aria-pressed="' + (i === 0) + '">' + a[0] + '</button>'; }).join('');
      function showAspect(i) {
        var a = aspects[i];
        els('#t-tabs .chip').forEach(function (b) { b.setAttribute('aria-pressed', b.getAttribute('data-a') === String(i) ? 'true' : 'false'); });
        el('#t-body').innerHTML = '<p class="lead">' + a[2] + '</p>' + (Array.isArray(a[1]) ? '<ul>' + a[1].map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ul>' : '<p>' + esc(a[1]) + '</p>');
      }
      el('#t-tabs').onclick = function (e) { var b = e.target.closest('.chip'); if (b) showAspect(Number(b.getAttribute('data-a'))); };
      showAspect(0);
      el('#s-behind').innerHTML = [['วิธีพูด', s.speech], ['วิธีให้คำปรึกษา', s.counsel], ['พฤติกรรม · การใช้คำสอนในชีวิต', s.behavior], ['ข้อควรระวัง', s.caveat]].map(function (c) { return '<div class="pcell"><h3>' + c[0] + '</h3><p>' + esc(c[1]) + '</p></div>'; }).join('');
      el('#starters').innerHTML = ['ช่วงนี้ฉันลังเลเรื่องการตัดสินใจครั้งใหญ่ ท่านจะให้ฉันเริ่มคิดจากตรงไหน', 'ถ้าต้องสรุปหลักคำสอนของท่านให้คนยุคนี้ฟังในสามประโยค ท่านจะพูดว่าอะไร', 'ฉันตีความแนวคิดของท่านว่า… ท่านเห็นว่าตรงไหม'].map(function (t) { return '<button class="chip" type="button">' + esc(t) + '</button>'; }).join('');
      el('#s-interp').value = note.interp || '';
      el('#s-status').textContent = '';
      status.textContent = '';
      el('#c-promptbox').hidden = true;
      var prev = SAGES[(i + SAGES.length - 1) % SAGES.length], next = SAGES[(i + 1) % SAGES.length];
      if (window.JCTZone) window.JCTZone.refresh();
      renderChat(); mode();
      // ข้อความที่ส่งมาจากห้องคำสอน ("ให้นักปราชญ์อ่าน")
      try { var pre = sessionStorage.getItem('jct:prefill'); if (pre) { sessionStorage.removeItem('jct:prefill'); input.value = pre; status.textContent = 'นำคำสอนจากห้องเจตจำนงมาไว้ในช่องข้อความแล้ว ตรวจแล้วกดส่งได้เลย'; } } catch (e) { /* ไม่เป็นไร */ }
      window.scrollTo(0, 0);
    }
    function apiMessages() {
      var h = note.chat.slice(-20);
      while (h.length && h[0].r !== 'u') h.shift();
      // รวมข้อความผู้ใช้ที่ติดกัน (เช่น ส่งไม่สำเร็จแล้วพิมพ์ต่อ) ให้ API รับได้
      var out = [];
      h.forEach(function (m) {
        var role = m.r === 'u' ? 'user' : 'assistant';
        if (out.length && out[out.length - 1].role === role) out[out.length - 1].content += '\n\n' + m.t;
        else out.push({ role: role, content: m.t });
      });
      return out;
    }
    function promptText(question) {
      var out = sagePrompt(current, note.interp) + '\n';
      if (note.chat.length) out += '\nบทสนทนาที่ผ่านมา:\n' + note.chat.slice(-12).map(function (m) { return (m.r === 'u' ? 'ผู้ใช้: ' : current.th + ': ') + m.t; }).join('\n') + '\n';
      out += '\n' + (question ? 'ข้อความของผู้ใช้: ' + question : 'เริ่มด้วยการทักทายในบทบาทหนึ่งถึงสองประโยค แล้วถามว่าผู้ใช้อยากคุยเรื่องอะไร');
      return out;
    }
    function send() {
      var text = input.value.trim();
      if (busy || !current) return;
      if (!text) { status.textContent = 'พิมพ์ข้อความก่อนส่ง'; input.focus(); return; }
      if (!aiReady()) {
        status.innerHTML = 'ยังไม่ได้เชื่อม AI · <a href="settings.html#ai">ไปที่ตั้งค่า → เชื่อม AI</a> หรือกด “คัดลอกคำสั่งไปใช้กับ AI ใดก็ได้” แล้ววางในแชต Claude, ChatGPT, Gemini หรืออื่น ๆ';
        return;
      }
      note.chat.push({ r: 'u', t: text });
      persist();
      input.value = '';
      renderChat();
      var wait = bubble('sage wait', current.th, 'กำลังคิด…');
      busy = true; el('#c-send').disabled = true; status.textContent = '';
      var who = current;
      callAI(sagePrompt(who, note.interp), apiMessages()).then(function (reply) {
        if (current !== who) return;
        note.chat.push({ r: 'a', t: reply });
        persist(); renderChat();
      }, function (err) {
        if (wait.parentNode) wait.parentNode.removeChild(wait);
        status.textContent = 'ส่งไม่สำเร็จ: ' + err.message + ' · ข้อความของคุณยังอยู่ในบทสนทนา พิมพ์ต่อแล้วกดส่งได้อีกครั้ง';
      }).then(function () { busy = false; el('#c-send').disabled = false; });
    }
    el('#c-send').addEventListener('click', send);
    input.addEventListener('keydown', function (e) { if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') { e.preventDefault(); send(); } });
    el('#starters').addEventListener('click', function (e) {
      var b = e.target.closest('.chip');
      if (b) { input.value = b.textContent; input.focus(); }
    });
    el('#c-tonote').addEventListener('click', function () {
      if (!current || !note.chat.length) { status.textContent = 'ยังไม่มีบทสนทนาให้บันทึก'; return; }
      var body = note.chat.map(function (m) { return (m.r === 'u' ? 'คุณ' : current.th) + ': ' + m.t; }).join('\n\n');
      var obj = { id: uid(), kind: 'chat', sage: current.id, title: 'บทสนทนากับ' + current.th + ' · ' + fmtDate(Date.now()), body: body, tags: 'บทสนทนา, ' + current.th, t: Date.now() };
      var ok = save('notes', list('notes').concat([obj]));
      status.innerHTML = ok ? 'บันทึกสำเนาลงสมุดแล้ว · <a href="notebook.html#chats">เปิดในสมุดบันทึก</a> (บทสนทนาเดิมยังอยู่ คุยต่อได้)' : 'บันทึกไม่สำเร็จ (เบราว์เซอร์ไม่อนุญาตให้เก็บถาวร)';
    });
    el('#c-copy').addEventListener('click', function () {
      var text = promptText(input.value.trim());
      el('#c-prompt').value = text;
      copyText(text).then(function (ok) {
        el('#c-promptbox').hidden = false;
        status.textContent = ok ? 'คัดลอกแล้ว เปิดแชต AI ที่คุณใช้ (ลิงก์ใต้กล่อง) แล้ววางได้เลย' : 'คัดลอกอัตโนมัติไม่ได้ เลือกข้อความในกล่องด้านล่างแล้วกด Ctrl+C';
        if (!ok) el('#c-prompt').select();
      });
    });
    twoStep(el('#c-clear'), 'ล้างบทสนทนา', function () {
      if (!note.chat.length) { status.textContent = 'ยังไม่มีบทสนทนาให้ล้าง'; return; }
      note.chat = []; persist(); renderChat();
      status.textContent = 'ล้างบทสนทนาแล้ว (การตีความของคุณยังอยู่)';
    });
    el('#s-interp').addEventListener('input', function () {
      if (!current) return;
      note.interp = el('#s-interp').value;
      clearTimeout(timer);
      el('#s-status').textContent = 'กำลังบันทึก…';
      timer = setTimeout(function () { el('#s-status').textContent = persist() ? 'บันทึกในเครื่องนี้แล้ว' : 'บันทึกไว้ชั่วคราวเท่านั้น'; }, 500);
    });
    window.addEventListener('hashchange', show);
    show();
  }

  // ห้องสมองอยู่ใน js/brain.js

  // ---------- ห้องเจตจำนง: คำสอนและคติสอนใจ ----------
  function initPoems() {
    var cur = null, timer = null;
    var f = { text: el('#p-text'), author: el('#p-author'), link: el('#p-link'), meaning: el('#p-meaning') };
    var st = el('#p-status');
    f.link.innerHTML = '<option value="">— ไม่ผูก —</option><optgroup label="นักปราชญ์">' +
      SAGES.map(function (g) { return '<option value="sage:' + g.id + '">' + esc(g.th) + '</option>'; }).join('') +
      '</optgroup><optgroup label="สำนักคิด">' + D.schools.map(function (s) { return '<option value="school:' + s.id + '">' + esc(s.th) + '</option>'; }).join('') + '</optgroup>';
    el('#p-reader').innerHTML = SAGES.map(function (g) { return '<option value="' + g.id + '">' + esc(g.th) + '</option>'; }).join('');
    function linkName(v) {
      if (!v) return '';
      var p = v.split(':');
      if (p[0] === 'sage') { var g = sageById(p[1]); return g ? g.th : ''; }
      var s = schoolById(p[1]); return s ? s.th : '';
    }
    function readerFor(v) {
      if (!v) return '';
      var p = v.split(':');
      if (p[0] === 'sage') return p[1];
      var g = sagesOf(p[1])[0]; return g ? g.id : '';
    }
    function render() {
      var term = (el('#pq').value || '').trim().toLowerCase();
      var all = list('poems').sort(function (a, b) { return (b.t || 0) - (a.t || 0); });
      var rows = all.filter(function (p) { return !term || ((p.title || '') + ' ' + p.text + ' ' + (p.author || '') + ' ' + (p.meaning || '') + ' ' + linkName(p.link)).toLowerCase().indexOf(term) > -1; });
      el('#pcount').textContent = all.length ? (term ? 'ตรงกับคำค้น ' + rows.length : 'มีทั้งหมด ' + all.length) : '';
      el('#p-authors').innerHTML = all.map(function (p) { return p.author; }).filter(function (a, i, arr) { return a && arr.indexOf(a) === i; }).map(function (a) { return '<option value="' + esc(a) + '">'; }).join('');
      paged(el('#plist'), rows, function (p) {
        return '<button class="pitem quote" type="button" data-id="' + p.id + '"' + (cur && cur.id === p.id ? ' aria-current="true"' : '') + '>' +
          '<span class="qtext">' + esc(p.text || p.title || '') + '</span>' +
          '<span class="meta2">' + (p.author ? '— ' + esc(p.author) : 'ไม่ระบุผู้แต่ง') + (p.link ? ' · ผูกกับ' + esc(linkName(p.link)) : '') + ' · ' + fmtDate(p.t) + '</span></button>';
      }, 10, all.length ? 'ไม่พบคำที่ตรงกับคำค้น' : 'ยังไม่มีคำสอน กด "เขียนใหม่" เพื่อเริ่ม');
    }
    // คลังคำสอนจากนักปราชญ์ (js/quotes.js)
    var Q = window.JCT_QUOTES || [], qg = 'ทั้งหมด';
    function keptQ(q) { return list('poems').some(function (p) { return p.en && p.en === q.en; }); }
    // แสดงวันละ 5 ข้อ สุ่มด้วยวันที่เป็นเมล็ด: ทั้งวันได้ชุดเดิม พรุ่งนี้ได้ชุดใหม่ (คลังเต็มเก็บไว้เบื้องหลังใน quotes.js)
    var DAILY = 5;
    function todayKey() { var d = new Date(); return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate(); }
    function seeded(str) { var h = 2166136261; for (var k = 0; k < str.length; k++) { h ^= str.charCodeAt(k); h = Math.imul(h, 16777619); } return function () { h ^= h << 13; h ^= h >>> 17; h ^= h << 5; return ((h >>> 0) % 100000) / 100000; }; }
    function dailyPick() {
      var idx = Q.map(function (q, i) { q.i = i; return i; }), rnd = seeded('jct-' + todayKey());
      for (var k = idx.length - 1; k > 0; k--) { var r = Math.floor(rnd() * (k + 1)), t = idx[k]; idx[k] = idx[r]; idx[r] = t; }
      return idx.slice(0, Math.min(DAILY, idx.length)).map(function (i) { return Q[i]; });
    }
    function renderLib() {
      var box = el('#qlib'); if (!box) return;
      var d = new Date();
      el('#qfilter').innerHTML = '<p class="muted small" style="margin:0">คำสอนประจำวันที่ ' + d.toLocaleDateString('th-TH', { day: 'numeric', month: 'long', year: 'numeric' }) + ' · สุ่มใหม่ทุกวัน ' + DAILY + ' ข้อ จากคลัง ' + Q.length + ' ข้อ</p>';
      var rows = dailyPick();
      box.innerHTML = '<div class="plist">' + rows.map(function (q) {
        var kept = keptQ(q);
        return '<div class="pitem quote"><span class="qtext">' + esc(q.th) + '</span>' +
          '<span class="small muted" lang="en">“' + esc(q.en) + '”</span>' +
          '<span class="meta2">— ' + (q.s ? '<a href="sage.html#' + q.s + '">' + esc(q.a) + '</a>' : esc(q.a)) + ' · ' + esc(q.src) + '<span class="qsrc">' + esc(q.g) + '</span></span>' +
          '<span class="btnrow"><button class="btn ' + (kept ? 'ghost' : 'lily') + ' sm" type="button" data-keep="' + q.i + '"' + (kept ? ' disabled' : '') + '>' + (kept ? 'เก็บไว้แล้ว' : 'เก็บเข้าคลังของฉัน') + '</button></span></div>';
      }).join('') + '</div>';
    }
    if (el('#qlib')) {
      el('#qlib').addEventListener('click', function (e) {
        var b = e.target.closest('[data-keep]'); if (!b) return;
        var q = Q[+b.getAttribute('data-keep')]; if (!q || keptQ(q)) return;
        var obj = { id: uid(), text: q.th, author: q.a, link: q.s ? 'sage:' + q.s : '', meaning: '', t: Date.now(), src: q.src, en: q.en };
        save('poems', list('poems').concat([obj]));
        renderLib(); fill(obj); st.textContent = 'เก็บแล้ว เขียนความหมายสำหรับคุณต่อได้เลย';
        b.blur();
      });
      renderLib();
    }
    function fill(p) {
      cur = p;
      f.text.value = p ? p.text || p.title || '' : ''; f.author.value = p ? p.author || '' : '';
      f.link.value = p ? p.link || '' : ''; f.meaning.value = p ? p.meaning || '' : '';
      el('#p-mode').textContent = p ? 'แก้คำสอน' : 'เขียนคำสอนใหม่';
      el('#p-del').hidden = !p;
      var r = readerFor(f.link.value); if (r) el('#p-reader').value = r;
      st.textContent = '';
      render();
    }
    function saveNow(quiet) {
      var text = f.text.value.trim();
      if (!text) { if (!quiet) st.textContent = 'เขียนคำสอนก่อนบันทึก'; return false; }
      var all = list('poems');
      var obj = { id: cur ? cur.id : uid(), text: f.text.value, author: f.author.value.trim(), link: f.link.value, meaning: f.meaning.value, t: Date.now() };
      if (cur && cur.title) obj.title = cur.title;
      if (cur && cur.src) { obj.src = cur.src; obj.en = cur.en; }
      all = all.filter(function (x) { return x.id !== obj.id; }); all.push(obj);
      var ok = save('poems', all);
      cur = obj; el('#p-mode').textContent = 'แก้คำสอน'; el('#p-del').hidden = false;
      st.textContent = ok ? 'บันทึกแล้ว' : 'บันทึกไว้ชั่วคราวเท่านั้น (เบราว์เซอร์ไม่อนุญาตให้เก็บถาวร)';
      render();
      return true;
    }
    ['text', 'author', 'meaning'].forEach(function (k) { f[k].addEventListener('input', function () { if (!cur) return; clearTimeout(timer); st.textContent = 'กำลังบันทึก…'; timer = setTimeout(function () { saveNow(true); }, 700); }); });
    f.link.addEventListener('change', function () { var r = readerFor(f.link.value); if (r) el('#p-reader').value = r; if (cur) saveNow(true); });
    el('#p-save').addEventListener('click', function () { saveNow(false); });
    el('#p-new').addEventListener('click', function () { fill(null); window.JCTZone.show('write'); f.text.focus(); });
    twoStep(el('#p-del'), 'ลบ', function () {
      if (!cur) return;
      save('poems', list('poems').filter(function (x) { return x.id !== cur.id; }));
      fill(null); st.textContent = 'ลบแล้ว';
    });
    el('#plist').addEventListener('click', function (e) {
      var b = e.target.closest('.pitem'); if (!b) return;
      var p = list('poems').filter(function (x) { return x.id === b.getAttribute('data-id'); })[0];
      if (p) { fill(p); window.JCTZone.show('write'); }
    });
    el('#pq').addEventListener('input', function () { el('#plist').removeAttribute('data-p'); render(); });
    el('#p-ask').addEventListener('click', function () {
      var text = f.text.value.trim();
      if (!text) { st.textContent = 'เขียนคำสอนก่อน แล้วค่อยให้นักปราชญ์อ่าน'; return; }
      if (cur) saveNow(true);
      var g = sageById(el('#p-reader').value);
      var msg = 'ช่วยอ่านคำสอนนี้แล้วตีความตามหลักคำสอนของท่าน ว่าตรงหรือต่างจากคำสอนของท่านตรงไหน\n\n“' + text + '”' +
        (f.author.value.trim() ? ' — ' + f.author.value.trim() : '') +
        (f.meaning.value.trim() ? '\n\nฉันเข้าใจคำนี้ว่า: ' + f.meaning.value.trim() : '');
      try { sessionStorage.setItem('jct:prefill', msg); } catch (e) { /* ไม่เป็นไร */ }
      location.href = 'sage.html#' + (g ? g.id : SAGES[0].id);
    });
    var want = null; try { want = sessionStorage.getItem('jct:openpoem'); sessionStorage.removeItem('jct:openpoem'); } catch (e) { /* ไม่เป็นไร */ }
    var w = want && list('poems').filter(function (x) { return x.id === want; })[0];
    fill(w || null);
    if (w) window.JCTZone.show('write', { noScroll: true });
  }

  // ---------- ห้องสมุดบันทึก: แยกหน้าตามประเภท (เปิดทีละหน้าด้วย #free #interp #chats #poems #marks #search) ----------
  function initNotebook() {
    var cur = null, srcFilter = 'all', chatKind = 'live', markKind = 'all';
    var nt = el('#n-title'), nb = el('#n-body'), ng = el('#n-tags'), st = el('#n-status');
    function freeNotes() { return list('notes').filter(function (n) { return n.kind !== 'chat'; }).sort(function (a, b) { return (b.t || 0) - (a.t || 0); }); }
    function savedChats() { return list('notes').filter(function (n) { return n.kind === 'chat'; }).sort(function (a, b) { return (b.t || 0) - (a.t || 0); }); }
    function liveChats() {
      return SAGES.map(function (g) { var n = load('sage:' + g.id); return n && n.chat && n.chat.length ? { g: g, n: n } : null; }).filter(Boolean)
        .sort(function (a, b) { return (b.n.t || 0) - (a.n.t || 0); });
    }
    function schoolOfText(doc) { var m = /^(p|tx):(.+)$/.exec(doc); if (!m) return null; if (m[1] === 'p') return m[2]; return null; }
    function annHref(x, pageNo) {
      var school = (x.d.meta && x.d.meta.school) || schoolOfText(x.doc);
      return school ? 'school.html#' + school : 'schools.html';
    }
    function interps() {
      var out = [];
      D.schools.forEach(function (s) {
        var n = load(s.id); if (!n) return;
        if (n.interp) out.push({ src: 'school', kind: 'การตีความ · สำนัก', title: s.th, text: n.interp, href: 'school.html#' + s.id, jump: 'mine', t: n.t });
        if (n.sum) out.push({ src: 'school', kind: 'สรุป · สำนัก', title: s.th, text: n.sum, href: 'school.html#' + s.id, jump: 'mine', t: n.t });
        if (n.one) out.push({ src: 'school', kind: 'หลักคำสอนในประโยคเดียว', title: s.th, text: n.one, href: 'school.html#' + s.id, jump: 'teach', t: n.t });
      });
      SAGES.forEach(function (g) { var n = load('sage:' + g.id); if (n && n.interp) out.push({ src: 'sage', kind: 'การตีความ · นักปราชญ์', title: g.th, text: n.interp, href: 'sage.html#' + g.id, t: n.t }); });
      list('poems').forEach(function (p) { if (p.meaning) out.push({ src: 'poem', kind: 'ความหมายของคำสอน', title: (p.text || p.title || '').slice(0, 60), text: p.meaning, href: 'poems.html', poem: p.id, t: p.t }); });
      return out.sort(function (a, b) { return (b.t || 0) - (a.t || 0); });
    }
    function marks() {
      var out = [];
      annDocs().forEach(function (x) {
        var title = (x.d.meta && x.d.meta.title) || x.doc, href = annHref(x), jump = x.doc.indexOf('p:') === 0 ? 'prin' : 'src';
        (x.d.marks || []).forEach(function (m) { out.push({ kind: m.note ? 'note' : 'mark', label: (m.type === 'ul' ? 'ขีดเส้นใต้' : 'เน้นสี') + (m.note ? ' + โน้ต' : '') + ' · หน้า ' + (m.page + 1), title: title, quote: m.quote || '', text: m.note || '', href: href, doc: x.doc, page: m.page, jump: jump, color: m.type === 'ul' ? '' : (m.color || 'y'), t: m.t }); });
        Object.keys(x.d.notes || {}).forEach(function (p) { out.push({ kind: 'page', label: 'บันทึกของหน้า ' + (+p + 1), title: title, quote: '', text: x.d.notes[p], href: href, doc: x.doc, page: +p, jump: jump, t: x.d.t }); });
        Object.keys(x.d.tr || {}).forEach(function (p) { out.push({ kind: 'tr', label: 'คำแปลหน้า ' + (+p + 1), title: title, quote: '', text: x.d.tr[p], href: href, doc: x.doc, page: +p, jump: jump, t: x.d.t }); });
      });
      return out.sort(function (a, b) { return (b.t || 0) - (a.t || 0); });
    }
    function link(x, inner) {
      return '<a class="pitem" href="' + x.href + '"' + (x.doc ? ' data-doc="' + esc(x.doc) + '" data-page="' + x.page + '"' : '') + (x.jump ? ' data-jumpto="' + x.jump + '"' : '') + (x.poem ? ' data-poem="' + x.poem + '"' : '') + '>' + inner + '</a>';
    }
    function counts() {
      var c = { free: freeNotes().length, interp: interps().length, chats: liveChats().length + savedChats().length, poems: list('poems').length, marks: marks().length, search: '', ink: inkCount };
      els('[data-cnt]').forEach(function (n) { var v = c[n.getAttribute('data-cnt')]; n.textContent = v === '' ? '' : ' ' + v; });
    }

    // หน้า 1: บันทึกอิสระ
    function renderFree() {
      paged(el('#nlist'), freeNotes(), function (n) {
        return '<button class="pitem" type="button" data-id="' + n.id + '"' + (cur && cur.id === n.id ? ' aria-current="true"' : '') + '><b>' + esc(n.title || 'ไม่มีหัวข้อ') + '</b><span class="meta2">' + fmtDate(n.t) + (n.tags ? ' · ' + esc(n.tags) : '') + '</span><span class="snip">' + esc(n.body || '') + '</span></button>';
      }, 8, 'ยังไม่มีบันทึกอิสระ');
    }
    function fill(n) {
      cur = n; nt.value = n ? n.title || '' : ''; nb.value = n ? n.body || '' : ''; ng.value = n ? n.tags || '' : '';
      el('#n-mode').textContent = n ? 'แก้บันทึก: ' + (n.title || 'ไม่มีหัวข้อ') : 'บันทึกใหม่';
      el('#n-del').hidden = !n; st.textContent = ''; renderFree();
    }
    el('#n-save').addEventListener('click', function () {
      if (!nt.value.trim() && !nb.value.trim()) { st.textContent = 'เขียนหัวข้อหรือบันทึกก่อน'; return; }
      var obj = { id: cur ? cur.id : uid(), title: nt.value.trim(), body: nb.value, tags: ng.value.trim(), t: Date.now() };
      var ok = save('notes', list('notes').filter(function (x) { return x.id !== obj.id; }).concat([obj]));
      cur = obj; el('#n-mode').textContent = 'แก้บันทึก: ' + (obj.title || 'ไม่มีหัวข้อ'); el('#n-del').hidden = false;
      st.textContent = ok ? 'บันทึกแล้ว' : 'บันทึกไว้ชั่วคราวเท่านั้น'; renderFree(); counts();
    });
    el('#n-new').addEventListener('click', function () { fill(null); nt.focus(); });
    twoStep(el('#n-del'), 'ลบบันทึกนี้', function () { if (!cur) return; save('notes', list('notes').filter(function (x) { return x.id !== cur.id; })); fill(null); st.textContent = 'ลบบันทึกแล้ว'; counts(); });
    el('#nlist').addEventListener('click', function (e) { var b = e.target.closest('.pitem'); if (!b) return; var n = list('notes').filter(function (x) { return x.id === b.getAttribute('data-id'); })[0]; if (n) { fill(n); el('#free').scrollIntoView({ behavior: 'smooth', block: 'start' }); } });

    // หน้า 2: การตีความ
    function renderInterp() {
      var rows = interps().filter(function (x) { return srcFilter === 'all' || x.src === srcFilter; });
      paged(el('#ilist'), rows, function (x) { return link(x, '<b>' + esc(x.title) + '</b><span class="meta2">' + esc(x.kind) + (x.t ? ' · ' + fmtDate(x.t) : '') + '</span><span class="snip">' + esc(x.text) + '</span>'); }, 8, 'ยังไม่มีการตีความในหมวดนี้ เขียนได้ที่ห้องสำนักคิด ห้องนักปราชญ์ และห้องเจตจำนง');
    }
    // หน้า 3: บทสนทนา
    function renderChats() {
      if (chatKind === 'live') {
        paged(el('#clist'), liveChats(), function (x) {
          var last = x.n.chat[x.n.chat.length - 1];
          return '<a class="pitem" href="sage.html#' + x.g.id + '"><b>' + esc(x.g.th) + '</b><span class="meta2">' + x.n.chat.length + ' ข้อความ · ล่าสุด ' + fmtDate(x.n.t) + ' · กดเพื่อคุยต่อ</span><span class="snip">' + esc((last.r === 'u' ? 'คุณ: ' : x.g.th + ': ') + last.t) + '</span></a>';
        }, 8, 'ยังไม่มีบทสนทนา เริ่มได้ที่ห้องพูดคุยกับนักปราชญ์');
      } else {
        paged(el('#clist'), savedChats(), function (n) {
          return '<details class="pitem chatcopy"><summary><b>' + esc(n.title) + '</b><span class="meta2">' + fmtDate(n.t) + ' · กดเพื่ออ่านทั้งหมด</span></summary><div class="transcript">' + esc(n.body) + '</div><div class="btnrow">' + (n.sage ? '<a class="btn ghost sm" href="sage.html#' + n.sage + '">คุยต่อกับนักปราชญ์คนนี้</a>' : '') + '<button class="btn warn sm" type="button" data-delnote="' + n.id + '">ลบสำเนานี้</button></div></details>';
        }, 6, 'ยังไม่มีสำเนาบทสนทนา กด “บันทึกบทสนทนาลงสมุด” ในหน้าสนทนา');
      }
    }
    el('#clist').addEventListener('click', function (e) {
      var b = e.target.closest('[data-delnote]'); if (!b) return;
      if (b.getAttribute('data-sure') !== '1') { b.setAttribute('data-sure', '1'); b.textContent = 'กดอีกครั้งเพื่อยืนยัน'; return; }
      var id = b.getAttribute('data-delnote'); save('notes', list('notes').filter(function (x) { return x.id !== id; })); renderChats(); counts();
    });
    // หน้า: คำสอน
    function renderPoems() {
      var rows = list('poems').sort(function (a, b) { return (b.t || 0) - (a.t || 0); });
      paged(el('#polist'), rows, function (p) { return link({ href: 'poems.html', poem: p.id }, '<span class="qtext">' + esc(p.text || p.title || '') + '</span><span class="meta2">' + (p.author ? '— ' + esc(p.author) : 'ไม่ระบุผู้แต่ง') + ' · ' + fmtDate(p.t) + '</span>'); }, 10, 'ยังไม่มีคำสอน');
    }
    // หน้า: เขียนมือ
    var inkCount = '', inkCur = null;
    function renderInk() {
      if (!window.JCTInk) { el('#ink-pad').innerHTML = '<p class="empty">เบราว์เซอร์นี้ใช้ปากกาไม่ได้</p>'; return; }
      window.JCTInk.list('nb:').then(function (rows) {
        rows.sort(function (a, b) { return (b.v.t || 0) - (a.v.t || 0); });
        inkCount = rows.length; counts();
        if (!inkCur) inkCur = rows.length ? rows[0].key : 'nb:' + uid();
        var names = rows.map(function (r) { return '<button class="chip sm" type="button" data-sheet="' + esc(r.key) + '" aria-pressed="' + (r.key === inkCur) + '">' + esc(r.v.name || 'แผ่นไม่มีชื่อ') + '</button>'; });
        if (!rows.some(function (r) { return r.key === inkCur; })) names.unshift('<button class="chip sm" type="button" data-sheet="' + inkCur + '" aria-pressed="true">แผ่นใหม่</button>');
        el('#ink-sheets').innerHTML = names.join('');
        var curRow = rows.filter(function (r) { return r.key === inkCur; })[0];
        el('#ink-name').value = curRow && curRow.v.name || '';
        if (el('#ink-pad').getAttribute('data-key') !== inkCur) {
          el('#ink-pad').setAttribute('data-key', inkCur);
          window.JCTInk.mount(el('#ink-pad'), inkCur, { minHeight: 1100, beforeSave: function (d) { if (!d.name && el('#ink-name').value.trim()) d.name = el('#ink-name').value.trim(); }, onSave: function () { setTimeout(renderInk, 50); } });
        }
      });
    }
    el('#ink-sheets').addEventListener('click', function (e) { var b = e.target.closest('[data-sheet]'); if (!b) return; inkCur = b.getAttribute('data-sheet'); renderInk(); });
    el('#ink-new').addEventListener('click', function () { inkCur = 'nb:' + uid(); renderInk(); });
    el('#ink-name').addEventListener('change', function () {
      var k = inkCur, name = el('#ink-name').value.trim();
      window.JCTInk.get(k).then(function (v) { v = v || { strokes: [], h: 1100 }; v.name = name; v.t = Date.now(); return window.JCTInk.put(k, v); }).then(function () { el('#ink-pad').removeAttribute('data-key'); renderInk(); });
    });
    twoStep(el('#ink-del'), 'ลบแผ่นนี้', function () { window.JCTInk.del(inkCur).then(function () { inkCur = null; el('#ink-pad').removeAttribute('data-key'); renderInk(); }); });
    // หน้า 5: เครื่องหมายในตัวบท
    function renderMarks() {
      var rows = marks().filter(function (x) { return markKind === 'all' ? x.kind !== 'tr' : markKind === 'note' ? x.kind === 'note' : x.kind === markKind; });
      paged(el('#mlist'), rows, function (x) {
        return link(x, '<b>' + esc(x.title) + '</b><span class="meta2">' + esc(x.label) + (x.t ? ' · ' + fmtDate(x.t) : '') + '</span>' + (x.quote ? '<span class="snip"><span class="ann ' + (x.color ? 'ann-hl ann-' + x.color : 'ann-ul') + '">' + esc(x.quote) + '</span></span>' : '') + (x.text ? '<span class="snip">' + esc(x.text) + '</span>' : ''));
      }, 8, 'ยังไม่มีเครื่องหมาย เปิดสำนักคิดใดก็ได้ แล้วเลือกข้อความในหลักการหรือตัวบทเพื่อเน้นสี ขีดเส้นใต้ หรือเขียนโน้ต');
    }
    // หน้า 6: ค้นหา
    function search() {
      var term = (el('#nq').value || '').trim().toLowerCase();
      if (!term) { el('#rlist').innerHTML = '<p class="empty">พิมพ์คำที่ต้องการค้นหา</p>'; return; }
      var pool = interps().concat(freeNotes().map(function (n) { return { kind: 'บันทึกอิสระ', title: n.title || 'ไม่มีหัวข้อ', text: n.body + (n.tags ? '\n' + n.tags : ''), href: 'notebook.html#free', t: n.t }; }))
        .concat(list('poems').map(function (p) { return { kind: 'คำสอน', title: p.author || 'ไม่ระบุผู้แต่ง', text: p.text || p.title || '', href: 'poems.html', poem: p.id, t: p.t }; }))
        .concat(liveChats().map(function (x) { return { kind: 'บทสนทนา', title: x.g.th, text: x.n.chat.map(function (m) { return m.t; }).join('\n'), href: 'sage.html#' + x.g.id, t: x.n.t }; }))
        .concat(savedChats().map(function (n) { return { kind: 'สำเนาบทสนทนา', title: n.title, text: n.body, href: 'notebook.html#chats', t: n.t }; }))
        .concat(marks().map(function (x) { return { kind: x.label, title: x.title, text: (x.quote ? x.quote + '\n' : '') + x.text, href: x.href, doc: x.doc, page: x.page, jump: x.jump, t: x.t }; }));
      var hits = pool.filter(function (x) { return (x.title + ' ' + x.text).toLowerCase().indexOf(term) > -1; });
      el('#rlist').removeAttribute('data-p');
      paged(el('#rlist'), hits, function (x) {
        var i = x.text.toLowerCase().indexOf(term), snip = i > 60 ? '…' + x.text.slice(i - 50) : x.text;
        return link(x, '<b>' + esc(x.title) + '</b><span class="meta2">' + esc(x.kind) + (x.t ? ' · ' + fmtDate(x.t) : '') + '</span><span class="snip">' + esc(snip) + '</span>');
      }, 10, 'ไม่พบในสมุด');
    }
    el('#nq').addEventListener('input', search);

    // ลิงก์ที่ต้องพาไปหน้าหรือตำแหน่งเฉพาะ
    document.addEventListener('click', function (e) {
      var a = e.target.closest('a.pitem'); if (!a) return;
      try {
        if (a.getAttribute('data-doc')) sessionStorage.setItem('jct:goto', JSON.stringify({ doc: a.getAttribute('data-doc'), page: +a.getAttribute('data-page') }));
        if (a.getAttribute('data-jumpto')) sessionStorage.setItem('jct:jump', a.getAttribute('data-jumpto'));
        if (a.getAttribute('data-poem')) sessionStorage.setItem('jct:openpoem', a.getAttribute('data-poem'));
      } catch (err) { /* ไม่เป็นไร */ }
    });
    function chipGroup(attr, set) {
      els('.chip[' + attr + ']').forEach(function (b) {
        b.addEventListener('click', function () { els('.chip[' + attr + ']').forEach(function (c) { c.setAttribute('aria-pressed', c === b ? 'true' : 'false'); }); set(b.getAttribute(attr)); });
      });
    }
    chipGroup('data-src', function (v) { srcFilter = v; el('#ilist').removeAttribute('data-p'); renderInterp(); });
    chipGroup('data-ck', function (v) { chatKind = v; el('#clist').removeAttribute('data-p'); renderChats(); });
    chipGroup('data-mk', function (v) { markKind = v; el('#mlist').removeAttribute('data-p'); renderMarks(); });

    var RENDER = { free: renderFree, ink: renderInk, interp: renderInterp, chats: renderChats, poems: renderPoems, marks: renderMarks, search: search };
    window.JCTZone.on(function (v) { if (RENDER[v]) { RENDER[v](); counts(); } if (v === 'search') el('#nq').focus(); });
    fill(null);
    var v0 = window.JCTZone.current() || 'free'; RENDER[v0](); counts();
    if (v0 !== 'ink') window.JCTInk && window.JCTInk.list('nb:').then(function (r) { inkCount = r.length; counts(); });
  }

  // ---------- หน้าตั้งค่า ----------
  function initSettings() {
    // --- ชั้นที่ 1: ติดตั้ง ---
    var state = el('#state'), installBtn = el('#install'), imsg = el('#imsg');
    function standalone() { return (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) || window.navigator.standalone === true; }
    function refreshState() {
      var ready = isWeb && 'serviceWorker' in navigator && navigator.serviceWorker.controller;
      state.className = 'state' + (ready ? ' ok' : '');
      state.innerHTML = '<i></i>' + (standalone() ? 'ติดตั้งเป็นแอปแล้ว · ' : '') + (ready ? 'พร้อมใช้ออฟไลน์' : (isWeb ? 'กำลังเตรียมออฟไลน์ ลองรีเฟรชหนึ่งครั้ง' : 'เปิดจากไฟล์โดยตรง: ใช้งานได้ แต่ติดตั้งและออฟไลน์เต็มรูปแบบต้องเปิดผ่าน localhost หรือ https'));
    }
    var deferred = null;
    window.addEventListener('beforeinstallprompt', function (e) { e.preventDefault(); deferred = e; imsg.textContent = 'พร้อมติดตั้ง กด “ติดตั้งเป็นแอป” ได้เลย'; });
    window.addEventListener('appinstalled', function () { deferred = null; imsg.textContent = 'ติดตั้งแล้ว เปิดจากไอคอนบนเครื่องได้เลย'; refreshState(); });
    installBtn.addEventListener('click', function () {
      if (deferred) {
        deferred.prompt();
        deferred.userChoice.then(function (c) { deferred = null; imsg.textContent = c && c.outcome === 'accepted' ? 'กำลังติดตั้ง…' : 'ยกเลิกการติดตั้ง กดใหม่ได้ภายหลัง (อาจต้องรีเฟรชหน้า)'; });
        return;
      }
      imsg.textContent = standalone() ? 'แอปติดตั้งอยู่แล้วในเครื่องนี้'
        : !isWeb ? 'ติดตั้งจากไฟล์โดยตรงไม่ได้ ให้เปิดผ่าน localhost ตาม “วิธีติดตั้งด้วยตนเอง” ด้านล่าง'
          : 'เบราว์เซอร์ยังไม่เสนอการติดตั้ง ลองเมนูของเบราว์เซอร์ → “ติดตั้งแอป” หรือ “เพิ่มลงหน้าจอโฮม” (Safari/iPhone ใช้ปุ่มแชร์)';
    });
    var mot = el('#motion');
    mot.checked = document.documentElement.classList.contains('motion');
    mot.addEventListener('change', function () {
      prefs.motion = mot.checked; save('prefs', prefs);
      document.documentElement.classList.toggle('motion', mot.checked);
      imsg.textContent = mot.checked ? 'เปิดภาพเคลื่อนไหวแล้ว' : 'ปิดภาพเคลื่อนไหวแล้ว ภาพจะนิ่ง';
    });
    el('#zip').addEventListener('click', function () { if (isWeb && navigator.onLine === false) imsg.textContent = 'ตอนนี้ออฟไลน์อยู่ ไฟล์ ZIP ต้องดาวน์โหลดขณะเชื่อมต่อกับที่อยู่ของเว็บ'; });

    // --- ชั้นที่ 2: อัปเดตแบบตรวจเอง ---
    var ustate = el('#ustate'), utext = el('#utext'), umsg = el('#umsg'), unotes = el('#unotes'), uapply = el('#uapply'), ucheck = el('#ucheck');
    function setU(cls, text) { ustate.className = 'state' + (cls ? ' ' + cls : ''); utext.textContent = text; }
    var last = load('upd');
    if (last && last.t) setU(last.v === D.version ? 'ok' : '', 'ตรวจล่าสุด ' + new Date(last.t).toLocaleString('th-TH') + ' · ' + (last.v === D.version ? 'เป็นรุ่นล่าสุด' : 'พบรุ่น ' + last.v + ' กดตรวจอีกครั้งเพื่ออัปเดต'));
    function swTarget() {
      if (!('serviceWorker' in navigator)) return Promise.resolve(null);
      if (navigator.serviceWorker.controller) return Promise.resolve(navigator.serviceWorker.controller);
      return navigator.serviceWorker.getRegistration().then(function (r) { return r && (r.active || r.waiting || r.installing) || null; });
    }
    function swCall(msg) {
      return swTarget().then(function (sw) {
        if (!sw) throw new Error('ยังไม่มีตัวจัดการออฟไลน์ ลองรีเฟรชหน้าแล้วกดใหม่');
        return new Promise(function (res, rej) {
          var ch = new MessageChannel();
          var to = setTimeout(function () { rej(new Error('ใช้เวลานานเกินไป ตรวจการเชื่อมต่อแล้วลองใหม่')); }, 120000);
          ch.port1.onmessage = function (ev) { clearTimeout(to); res(ev.data || {}); };
          sw.postMessage(msg, [ch.port2]);
        });
      });
    }
    ucheck.addEventListener('click', function () {
      umsg.textContent = ''; unotes.hidden = true; uapply.hidden = true;
      if (!isWeb) { setU('', 'เปิดจากไฟล์โดยตรง จึงตรวจอัปเดตในแอปไม่ได้'); umsg.textContent = 'ให้ดาวน์โหลดไฟล์เว็บ (ZIP) ชุดใหม่มาแทนโฟลเดอร์เดิม แล้วส่งออก/นำเข้าบันทึกถ้าเปลี่ยนที่อยู่'; return; }
      setU('', 'กำลังตรวจ…'); ucheck.disabled = true;
      fetch('version.json?ts=' + Date.now(), { cache: 'no-store' }).then(function (r) {
        if (!r.ok) throw new Error('อ่าน version.json ไม่ได้ (รหัส ' + r.status + ')');
        return r.json();
      }).then(function (info) {
        save('upd', { t: Date.now(), v: info.version });
        if (info.version === D.version) { setU('ok', 'เป็นรุ่นล่าสุดแล้ว (รุ่น ' + D.version + ') · ตรวจเมื่อ ' + new Date().toLocaleString('th-TH')); return; }
        setU('new', 'พบรุ่นใหม่ ' + info.version + (info.date ? ' (ออกเมื่อ ' + info.date + ')' : '') + ' · ตอนนี้ใช้รุ่น ' + D.version);
        if (info.notes && info.notes.length) { unotes.innerHTML = info.notes.map(function (n) { return '<li>' + esc(n) + '</li>'; }).join(''); unotes.hidden = false; }
        uapply.hidden = false;
        umsg.textContent = 'ยังไม่ได้เปลี่ยนอะไร กด “อัปเดตเดี๋ยวนี้” เมื่อพร้อม';
      }).catch(function (e) {
        setU('', 'ตรวจไม่สำเร็จ');
        umsg.textContent = navigator.onLine === false ? 'ตอนนี้ออฟไลน์อยู่ ต่ออินเทอร์เน็ตหรือเปิดเซิร์ฟเวอร์ของเว็บแล้วลองใหม่' : (e.message || 'เชื่อมต่อที่อยู่ของเว็บไม่ได้');
      }).then(function () { ucheck.disabled = false; });
    });
    uapply.addEventListener('click', function () {
      uapply.disabled = true; ucheck.disabled = true; umsg.textContent = 'กำลังดาวน์โหลดรุ่นใหม่… อย่าปิดหน้านี้';
      swCall({ type: 'UPDATE' }).then(function (d) {
        if (d.type !== 'UPDATED') throw new Error(d.error || 'อัปเดตไม่สำเร็จ');
        save('upd', { t: Date.now(), v: d.version });
        umsg.textContent = 'ดาวน์โหลดรุ่น ' + d.version + ' แล้ว กำลังเปิดใหม่…';
        setTimeout(function () { location.reload(); }, 700);
      }).catch(function (e) {
        umsg.textContent = 'อัปเดตไม่สำเร็จ: ' + (e.message || e) + ' · แอปยังใช้รุ่นเดิมได้ตามปกติ';
        uapply.disabled = false; ucheck.disabled = false;
      });
    });

    // --- ชั้นที่ 3: เชื่อม AI (หลายผู้ให้บริการ) ---
    var AI = window.JCTAI, kmsg = el('#kmsg'), kkey = el('#k-key'), kmodel = el('#k-model'), kbase = el('#k-base'), sel = AI.read().p;
    el('#k-form').addEventListener('submit', function (e) { e.preventDefault(); });
    el('#k-provs').innerHTML = AI.ORDER.map(function (id) { var p = AI.P[id]; return '<button class="prov" type="button" data-prov="' + id + '" aria-pressed="false"><b>' + esc(p.name) + '</b><span>' + esc(p.by) + '</span></button>'; }).join('');
    function fillK() {
      var c = AI.read(), p = AI.P[sel];
      els('[data-prov]').forEach(function (b) { b.setAttribute('aria-pressed', b.getAttribute('data-prov') === sel ? 'true' : 'false'); });
      kkey.value = c.keys[sel] || ''; kkey.placeholder = p.keyPh || '';
      el('#k-keylabel').textContent = 'กุญแจ API ของ ' + p.name + (p.optionalKey ? ' (ไม่บังคับ)' : '');
      kmodel.value = c.models[sel] || ''; kmodel.placeholder = p.model ? 'ค่าเริ่มต้น: ' + p.model : 'เช่น llama3.2, deepseek-chat, typhoon-v2.5';
      el('#k-models').innerHTML = p.models.map(function (m) { return '<option value="' + esc(m) + '">'; }).join('');
      el('#k-basebox').hidden = sel !== 'custom';
      kbase.value = c.base || '';
      el('#k-bases').innerHTML = (AI.P.custom.bases || []).map(function (b) { return '<option value="' + esc(b) + '">'; }).join('');
      el('#k-hint').textContent = p.hint + (c.p === sel && AI.ready() ? ' · ตอนนี้ใช้ตัวนี้อยู่' : '');
    }
    el('#k-provs').addEventListener('click', function (e) { var b = e.target.closest('[data-prov]'); if (b) { sel = b.getAttribute('data-prov'); fillK(); kmsg.textContent = ''; } });
    fillK();
    function saveK() {
      var c = AI.read();
      c.p = sel; c.keys[sel] = kkey.value.trim(); c.models[sel] = kmodel.value.trim();
      if (sel === 'custom') c.base = kbase.value.trim();
      return AI.write(c);
    }
    el('#k-save').addEventListener('click', function () {
      var ok = saveK();
      kmsg.textContent = !ok ? 'เบราว์เซอร์ไม่อนุญาตให้เก็บถาวร' : AI.ready() ? 'บันทึกแล้ว นักปราชญ์จะตอบด้วย ' + AI.label() : (sel === 'custom' ? 'บันทึกแล้ว แต่ยังต้องใส่ที่อยู่ API และชื่อโมเดล' : 'บันทึกแล้ว (ยังไม่มีกุญแจ จะใช้การคัดลอกคำสั่งแทน)');
      fillK();
    });
    el('#k-test').addEventListener('click', function () {
      saveK();
      if (!AI.ready()) { kmsg.textContent = sel === 'custom' ? 'ใส่ที่อยู่ API และชื่อโมเดลก่อนทดสอบ' : 'ใส่กุญแจก่อนทดสอบ'; return; }
      kmsg.textContent = 'กำลังทดสอบ ' + AI.label() + '…';
      callAI('ตอบสั้นที่สุดว่า พร้อม', [{ role: 'user', content: 'ทดสอบการเชื่อมต่อ' }], 32).then(function (t) {
        kmsg.textContent = 'เชื่อมต่อได้ · ' + AI.label() + ' ตอบว่า: ' + t.slice(0, 60);
      }, function (e) { kmsg.textContent = 'ยังเชื่อมต่อไม่ได้: ' + e.message; });
    });
    el('#k-del').addEventListener('click', function () {
      var c = AI.read(); delete c.keys[sel]; delete c.models[sel]; if (sel === 'custom') c.base = '';
      AI.write(c); fillK(); kmsg.textContent = 'ลบกุญแจและการตั้งค่าของ ' + AI.P[sel].name + ' ออกจากเครื่องนี้แล้ว';
    });

    // --- ชั้นที่ 4: สำรอง (ไม่รวมกุญแจ API) ---
    var out = el('#out'), msg = el('#msg');
    function allNotes() {
      var notes = {}, sages = {};
      D.schools.forEach(function (s) { var n = load(s.id); if (n) notes[s.id] = n; });
      SAGES.forEach(function (s) { var n = load('sage:' + s.id); if (n) sages[s.id] = n; });
      var ann = {}; annDocs().forEach(function (x) { ann[x.doc] = x.d; });
      return { app: 'jetchamnong-khong-khwamkhit', version: 4, exported: new Date().toISOString(), notes: notes, sages: sages, poems: list('poems'), journal: list('notes'), annotations: ann };
    }
    function withInk() { var o = allNotes(); return (window.JCTInk ? window.JCTInk.all() : Promise.resolve({})).then(function (ink) { o.ink = ink; o.version = 5; return o; }); }
    function refreshCount() {
      var a = allNotes();
      el('#ncount').textContent = Object.keys(a.notes).length + ' สำนัก · ' + Object.keys(a.sages).length + ' นักปราชญ์ · ' + a.poems.length + ' คำสอน · ' + a.journal.length + ' บันทึก · ' + Object.keys(a.annotations).length + ' ตัวบทที่ทำเครื่องหมายหรือแปลไว้';
      if (window.JCTInk) window.JCTInk.all().then(function (ink) { var n = Object.keys(ink).length; if (n) el('#ncount').textContent += ' · ' + n + ' แผ่นเขียนมือ'; });
    }
    el('#export').addEventListener('click', function () { withInk().then(function (all) {
      var json = JSON.stringify(all, null, 2);
      out.value = json;
      try {
        var blob = new Blob([json], { type: 'application/json' });
        var a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = 'jetchamnong-notes-' + new Date().toISOString().slice(0, 10) + '.json';
        document.body.appendChild(a); a.click(); a.remove();
        msg.textContent = 'ส่งออกแล้ว ถ้าไฟล์ไม่ถูกดาวน์โหลด ให้คัดลอกข้อความในกล่องด้านล่างไปเก็บแทน';
      } catch (e) { msg.textContent = 'ดาวน์โหลดไม่ได้ในเบราว์เซอร์นี้ ให้คัดลอกข้อความในกล่องด้านล่างไปเก็บแทน'; }
    }); });
    el('#copy').addEventListener('click', function () { withInk().then(function (all) {
      var json = JSON.stringify(all, null, 2);
      out.value = json;
      copyText(json).then(function (ok) {
        if (!ok) out.select();
        msg.textContent = ok ? 'คัดลอกแล้ว' : 'คัดลอกอัตโนมัติไม่ได้ ข้อความถูกเลือกไว้ให้แล้ว กด Ctrl+C';
      });
    }); });
    function importText(text) {
      try {
        var obj = JSON.parse(text);
        if (!obj || typeof obj.notes !== 'object' || !obj.notes) throw new Error('bad');
        var n = 0, m = 0;
        D.schools.forEach(function (s) { if (obj.notes[s.id]) { save(s.id, obj.notes[s.id]); n++; } });
        if (obj.sages && typeof obj.sages === 'object') SAGES.forEach(function (s) { if (obj.sages[s.id]) { save('sage:' + s.id, obj.sages[s.id]); m++; } });
        // คำสอนและบันทึกอิสระ: รวมกับของเดิม ไม่ลบของที่มีอยู่ (รายการที่ id ซ้ำ ใช้ของในไฟล์)
        function merge(key, arr) { if (!Array.isArray(arr)) return 0; var cur = list(key).filter(function (x) { return !arr.some(function (y) { return y.id === x.id; }); }); save(key, arr.concat(cur)); return arr.length; }
        var pn = merge('poems', obj.poems), jn = merge('notes', obj.journal), an = 0, inn = 0;
        if (obj.ink && typeof obj.ink === 'object' && window.JCTInk) Object.keys(obj.ink).forEach(function (k) { if (/^(nb|rd):/.test(k) && obj.ink[k] && Array.isArray(obj.ink[k].strokes)) { window.JCTInk.put(k, obj.ink[k]); inn++; } });
        if (obj.annotations && typeof obj.annotations === 'object') Object.keys(obj.annotations).forEach(function (k) { if (/^(p|tx):[\w-]+$/.test(k)) { save('ann:' + k, obj.annotations[k]); an++; } });
        msg.textContent = 'นำเข้าแล้ว ' + n + ' สำนัก ' + m + ' นักปราชญ์ ' + pn + ' คำสอน ' + jn + ' บันทึก ' + an + ' ตัวบท ' + inn + ' แผ่นเขียนมือ (รายการเดียวกันถูกแทนด้วยของในไฟล์)';
        refreshCount();
      } catch (e) { msg.textContent = 'อ่านไฟล์ไม่ได้ ตรวจว่าเป็นไฟล์ที่ส่งออกจากเว็บนี้'; }
    }
    el('#import').addEventListener('change', function (e) {
      var f = e.target.files && e.target.files[0];
      if (!f) return;
      var r = new FileReader();
      r.onload = function () { importText(String(r.result)); };
      r.readAsText(f);
      e.target.value = '';
    });
    el('#paste').addEventListener('click', function () {
      if (!out.value.trim()) { msg.textContent = 'วางข้อความสำรองลงในกล่องก่อน'; out.focus(); return; }
      importText(out.value);
    });
    refreshCount(); refreshState();
    if ('serviceWorker' in navigator && isWeb) navigator.serviceWorker.ready.then(function () { setTimeout(refreshState, 300); }, function () {});
  }

  // ---------- ออฟไลน์ ----------
  if (isWeb && 'serviceWorker' in navigator) {
    try { navigator.serviceWorker.register('sw.js').catch(function () {}); } catch (e) { /* ไม่เป็นไร */ }
  }

  if (page === 'schools') initSchools();
  if (page === 'poems') { if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initPoems); else initPoems(); }
  if (page === 'notebook') initNotebook();
  if (page === 'sages') initSages();
  if (page === 'sage') initSage();
  if (page === 'settings') initSettings();
})();
