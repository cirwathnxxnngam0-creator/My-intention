/* เขียนด้วยปากกา (แบบสมุดโน้ต) — พื้นที่ยาวลงไปได้ไม่จำกัด เก็บใน IndexedDB ของเครื่อง
   ใช้: JCTInk.mount(กล่อง, 'รหัสแผ่น', { minHeight }) · JCTInk.list() · JCTInk.get/put/del · JCTInk.all() (สำหรับสำรอง)
   พิกัดเก็บแบบสัดส่วนกับความกว้างตรรกะ 1000 หน่วย จึงย่อขยายตามจอได้ */
(function () {
  'use strict';
  var DB = 'jct-ink', ST = 'sheets', W = 1000, dbp = null, mem = {};
  function db() {
    if (dbp) return dbp;
    dbp = new Promise(function (ok, no) {
      try {
        var r = indexedDB.open(DB, 1);
        r.onupgradeneeded = function () { r.result.createObjectStore(ST); };
        r.onsuccess = function () { ok(r.result); };
        r.onerror = function () { no(r.error); };
      } catch (e) { no(e); }
    });
    return dbp;
  }
  function tx(mode, fn) {
    return db().then(function (d) {
      return new Promise(function (ok, no) { var t = d.transaction(ST, mode), s = t.objectStore(ST), out = fn(s); t.oncomplete = function () { ok(out && typeof out === 'object' && 'readyState' in out ? out.result : out); }; t.onerror = function () { no(t.error); }; });
    });
  }
  var API = {
    get: function (k) { return tx('readonly', function (s) { return s.get(k); }).then(function (v) { return v || mem[k] || null; }, function () { return mem[k] || null; }); },
    put: function (k, v) { mem[k] = v; return tx('readwrite', function (s) { s.put(v, k); }).then(function () { return true; }, function () { return false; }); },
    del: function (k) { delete mem[k]; return tx('readwrite', function (s) { s.delete(k); }).catch(function () {}); },
    all: function () {
      return db().then(function (d) {
        return new Promise(function (ok) {
          var out = {}, t = d.transaction(ST, 'readonly'), c = t.objectStore(ST).openCursor();
          c.onsuccess = function () { var cur = c.result; if (cur) { out[cur.key] = cur.value; cur.continue(); } else ok(out); };
          c.onerror = function () { ok(out); };
        });
      }, function () { return mem; });
    }
  };
  API.list = function (prefix) { return API.all().then(function (o) { return Object.keys(o).filter(function (k) { return !prefix || k.indexOf(prefix) === 0; }).map(function (k) { return { key: k, v: o[k] }; }); }); };

  var COLORS = [['#fff3b0', 'ครีม'], ['#ffd84a', 'เหลือง'], ['#7fb2ee', 'ฟ้า'], ['#f7b6cf', 'ชมพู'], ['#7fcf9a', 'เขียว'], ['#ff7a59', 'ส้มแดง'], ['#0b1236', 'น้ำเงินเข้ม']];
  API.mount = function (box, key, opt) {
    opt = opt || {};
    var minH = opt.minHeight || 900;
    box.innerHTML = '<div class="ink-bar" role="toolbar" aria-label="เครื่องมือปากกา">' +
      '<div class="chips"><button class="chip sm" type="button" data-tool="pen" aria-pressed="true">ปากกา</button><button class="chip sm" type="button" data-tool="hl" aria-pressed="false">ปากกาเน้น</button><button class="chip sm" type="button" data-tool="erase" aria-pressed="false">ยางลบ</button></div>' +
      '<div class="ink-colors">' + COLORS.map(function (c, i) { return '<button type="button" class="ink-c" data-c="' + c[0] + '" aria-label="สี' + c[1] + '" aria-pressed="' + (i === 0) + '" style="background:' + c[0] + '"></button>'; }).join('') + '</div>' +
      '<div class="chips"><button class="chip sm" type="button" data-w="2">เส้นเล็ก</button><button class="chip sm" type="button" data-w="4" aria-pressed="true">กลาง</button><button class="chip sm" type="button" data-w="8">ใหญ่</button></div>' +
      '<div class="chips"><button class="chip sm" type="button" data-act="undo">ย้อน</button><button class="chip sm" type="button" data-act="redo">ทำซ้ำ</button><button class="chip sm" type="button" data-act="more">+ เพิ่มพื้นที่</button><button class="chip sm" type="button" data-act="clear">ล้างแผ่น</button></div>' +
      '<label class="switch ink-finger"><input type="checkbox"> <span>ใช้นิ้วเขียน (ปิดไว้ = ใช้นิ้วเลื่อนหน้า ปากกาเขียน)</span></label>' +
      '</div><div class="ink-paper"><canvas></canvas></div><p class="status small ink-st" aria-live="polite"></p>';
    var cv = box.querySelector('canvas'), paper = box.querySelector('.ink-paper'), st = box.querySelector('.ink-st'), ctx = cv.getContext('2d');
    var data = { strokes: [], h: minH * W / Math.max(320, box.clientWidth || 800), t: 0 }, redo = [];
    var tool = 'pen', color = COLORS[0][0], width = 4, finger = false, cur = null, scale = 1;
    try { finger = localStorage.getItem('jct:v1:inkfinger') === '1'; } catch (e) { /* ไม่เป็นไร */ }
    box.querySelector('.ink-finger input').checked = finger;
    function save() { data.t = Date.now(); if (opt.beforeSave) opt.beforeSave(data); st.textContent = 'กำลังบันทึก…'; API.put(key, data).then(function (ok) { st.textContent = ok ? 'บันทึกในเครื่องแล้ว' : 'บันทึกไว้ชั่วคราว (เบราว์เซอร์ไม่อนุญาตให้เก็บถาวร)'; if (opt.onSave) opt.onSave(data); }); }
    function size() {
      var w = paper.clientWidth || 800, dpr = Math.min(window.devicePixelRatio || 1, 2);
      scale = w / W;
      var h = Math.max(data.h * scale, minH);
      cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr); cv.style.width = w + 'px'; cv.style.height = h + 'px';
      ctx.setTransform(dpr * scale, 0, 0, dpr * scale, 0, 0);
      redraw();
    }
    function lines() {
      ctx.save(); ctx.globalAlpha = 0.09; ctx.strokeStyle = '#cfe6fb'; ctx.lineWidth = 1 / scale;
      for (var y = 40; y < cv.height / (ctx.getTransform().d); y += 40) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
      ctx.restore();
    }
    function stroke(s) {
      var p = s.p; if (!p.length) return;
      ctx.save();
      ctx.globalAlpha = s.k === 'hl' ? 0.32 : 1; ctx.strokeStyle = s.c; ctx.fillStyle = s.c; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      if (p.length <= 3) { ctx.beginPath(); ctx.arc(p[0], p[1], s.w * (s.k === 'hl' ? 2.5 : 0.6), 0, 7); ctx.fill(); ctx.restore(); return; }
      if (s.k === 'hl') { ctx.lineWidth = s.w * 4; ctx.beginPath(); ctx.moveTo(p[0], p[1]); for (var i = 3; i < p.length; i += 3) ctx.lineTo(p[i], p[i + 1]); ctx.stroke(); ctx.restore(); return; }
      for (var j = 3; j < p.length; j += 3) {
        ctx.lineWidth = s.w * (0.35 + 0.9 * (p[j + 2] || 0.5));
        ctx.beginPath(); ctx.moveTo(p[j - 3], p[j - 2]); ctx.lineTo(p[j], p[j + 1]); ctx.stroke();
      }
      ctx.restore();
    }
    function redraw() { ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, cv.width, cv.height); ctx.restore(); lines(); data.strokes.forEach(stroke); }
    function pt(e) { var r = cv.getBoundingClientRect(); return [(e.clientX - r.left) / scale, (e.clientY - r.top) / scale, e.pressure && e.pointerType === 'pen' ? e.pressure : 0.5]; }
    function eraseAt(x, y) {
      var rr = 14, before = data.strokes.length;
      data.strokes = data.strokes.filter(function (s) { for (var i = 0; i < s.p.length; i += 3) if (Math.abs(s.p[i] - x) < rr && Math.abs(s.p[i + 1] - y) < rr) return false; return true; });
      if (data.strokes.length !== before) { redraw(); return true; }
      return false;
    }
    var scrollFrom = null, erased = false;
    cv.addEventListener('pointerdown', function (e) {
      if (e.pointerType === 'touch' && !finger) { scrollFrom = e.clientY; return; }
      e.preventDefault(); cv.setPointerCapture(e.pointerId);
      var q = pt(e);
      if (tool === 'erase') { cur = { erase: true }; erased = eraseAt(q[0], q[1]) || false; return; }
      cur = { k: tool, c: color, w: width, p: [Math.round(q[0] * 10) / 10, Math.round(q[1] * 10) / 10, Math.round(q[2] * 100) / 100] };
    });
    cv.addEventListener('pointermove', function (e) {
      if (scrollFrom !== null && e.pointerType === 'touch') { window.scrollBy(0, scrollFrom - e.clientY); scrollFrom = e.clientY; return; }
      if (!cur) return;
      var evs = e.getCoalescedEvents ? e.getCoalescedEvents() : [e];
      evs.forEach(function (ev) {
        var q = pt(ev);
        if (cur.erase) { if (eraseAt(q[0], q[1])) erased = true; return; }
        var p = cur.p, n = p.length;
        if (Math.abs(q[0] - p[n - 3]) + Math.abs(q[1] - p[n - 2]) < 0.8) return;
        p.push(Math.round(q[0] * 10) / 10, Math.round(q[1] * 10) / 10, Math.round(q[2] * 100) / 100);
        ctx.save(); ctx.globalAlpha = cur.k === 'hl' ? 0.32 : 1; ctx.strokeStyle = cur.c; ctx.lineCap = 'round';
        ctx.lineWidth = cur.k === 'hl' ? cur.w * 4 : cur.w * (0.35 + 0.9 * q[2]);
        ctx.beginPath(); ctx.moveTo(p[n - 3], p[n - 2]); ctx.lineTo(q[0], q[1]); ctx.stroke(); ctx.restore();
      });
    });
    function end() {
      scrollFrom = null;
      if (!cur) return;
      if (cur.erase) { if (erased) save(); cur = null; return; }
      data.strokes.push(cur); redo = []; cur = null;
      redraw();
      // ใกล้ขอบล่าง: ต่อพื้นที่ให้อัตโนมัติ
      var maxY = 0; data.strokes.forEach(function (s) { for (var i = 1; i < s.p.length; i += 3) if (s.p[i] > maxY) maxY = s.p[i]; });
      if (maxY > data.h - 300) { data.h = maxY + 900; size(); }
      save();
    }
    cv.addEventListener('pointerup', end); cv.addEventListener('pointercancel', end); cv.addEventListener('pointerleave', function (e) { if (e.pointerType !== 'touch') end(); });
    box.querySelector('.ink-bar').addEventListener('click', function (e) {
      var b = e.target.closest('button'); if (!b) return;
      if (b.hasAttribute('data-tool')) { tool = b.getAttribute('data-tool'); box.querySelectorAll('[data-tool]').forEach(function (x) { x.setAttribute('aria-pressed', x === b ? 'true' : 'false'); }); }
      if (b.hasAttribute('data-c')) { color = b.getAttribute('data-c'); box.querySelectorAll('[data-c]').forEach(function (x) { x.setAttribute('aria-pressed', x === b ? 'true' : 'false'); }); if (tool === 'erase') box.querySelector('[data-tool=pen]').click(); }
      if (b.hasAttribute('data-w')) { width = +b.getAttribute('data-w'); box.querySelectorAll('[data-w]').forEach(function (x) { x.setAttribute('aria-pressed', x === b ? 'true' : 'false'); }); }
      var a = b.getAttribute('data-act');
      if (a === 'undo' && data.strokes.length) { redo.push(data.strokes.pop()); redraw(); save(); }
      if (a === 'redo' && redo.length) { data.strokes.push(redo.pop()); redraw(); save(); }
      if (a === 'more') { data.h += 1000; size(); save(); paper.scrollIntoView({ block: 'end', behavior: 'smooth' }); }
      if (a === 'clear') {
        if (b.getAttribute('data-sure') !== '1') { b.setAttribute('data-sure', '1'); b.textContent = 'กดอีกครั้งเพื่อล้าง'; setTimeout(function () { b.removeAttribute('data-sure'); b.textContent = 'ล้างแผ่น'; }, 4000); return; }
        b.removeAttribute('data-sure'); b.textContent = 'ล้างแผ่น'; redo = data.strokes.slice().reverse(); data.strokes = []; redraw(); save(); st.textContent = 'ล้างแล้ว กด "ทำซ้ำ" เพื่อเอาคืนทีละเส้น';
      }
    });
    box.querySelector('.ink-finger input').addEventListener('change', function () { finger = this.checked; try { localStorage.setItem('jct:v1:inkfinger', finger ? '1' : '0'); } catch (e) { /* ไม่เป็นไร */ } });
    if (window.ResizeObserver) new ResizeObserver(function () { if (paper.clientWidth && Math.abs(paper.clientWidth / W - scale) > 0.001) size(); }).observe(paper);
    API.get(key).then(function (v) { if (v && v.strokes) { data = v; data.h = Math.max(data.h || 0, minH * W / Math.max(320, paper.clientWidth || 800)); } size(); });
    size();
    return { data: function () { return data; } };
  };
  window.JCTInk = API;
})();
