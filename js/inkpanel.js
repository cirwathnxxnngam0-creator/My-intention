/* แถบเครื่องมือเขียนแนวตั้งด้านขวาจอ (คล้ายสมุดโน้ต) — เขียนทับบนแผ่นกระดาษ A4 ของตัวอ่าน
   ใช้: JCTInkPanel.attach(paperEl, 'รหัสแผ่น')  ทุกครั้งที่หน้าเปลี่ยน
   เก็บใน IndexedDB ผ่าน JCTInk.get/put (คีย์ ov:<doc>:<page>:<lang>) จึงรวมอยู่ในไฟล์สำรองด้วย
   พิกัดเก็บแบบสัดส่วนกับความกว้าง 1000 หน่วย กลับมาแก้ ลบ หรือเขียนเพิ่มได้ภายหลัง */
(function () {
  'use strict';
  var W = 1000, PREF = 'jct:v1:inkpanel';
  var COLORS = ['#1f2433', '#1d4ed8', '#c2410c', '#15803d', '#7c3aed', '#ffd84a', '#f472b6', '#38bdf8'];
  var HL = ['#ffd84a', '#f7b6cf', '#9fd0ff', '#a7e3b5'];
  var st = { open: false, tool: 'pen', pen: COLORS[0], hl: HL[0], w: 3, finger: false };
  try { var sv = JSON.parse(localStorage.getItem(PREF) || 'null'); if (sv) for (var k in sv) st[k] = sv[k]; } catch (e) { /* ไม่เป็นไร */ }
  function keep() { try { localStorage.setItem(PREF, JSON.stringify(st)); } catch (e) { /* ไม่เป็นไร */ } }
  var sheets = [], panel = null, fab = null, statusEl = null;

  function esc(s) { return String(s).replace(/"/g, '&quot;'); }
  function build() {
    if (panel) return;
    fab = document.createElement('button');
    fab.type = 'button'; fab.className = 'ipn-fab'; fab.setAttribute('aria-label', 'เปิดแถบเครื่องมือเขียน');
    fab.innerHTML = '<span aria-hidden="true">✎</span><span class="ipn-fabt">เขียน</span>';
    panel = document.createElement('aside');
    panel.className = 'ipn'; panel.setAttribute('aria-label', 'เครื่องมือเขียนบนกระดาษ');
    var sw = function (list, kind) { return list.map(function (c) { return '<button type="button" class="ipn-c" data-' + kind + '="' + c + '" style="background:' + c + '" aria-label="สี ' + c + '"></button>'; }).join(''); };
    panel.innerHTML =
      '<button type="button" class="ipn-b ipn-close" data-a="close" title="ปิดแถบ (กลับไปเลือกข้อความ)">✕</button>' +
      '<div class="ipn-g">' +
      '<button type="button" class="ipn-b" data-t="select" title="เลือกข้อความ / เลื่อนหน้า">⌶<i>เลือก</i></button>' +
      '<button type="button" class="ipn-b" data-t="pen" title="ปากกา">✒<i>ปากกา</i></button>' +
      '<button type="button" class="ipn-b" data-t="hl" title="ไฮไลต์">▮<i>ไฮไลต์</i></button>' +
      '<button type="button" class="ipn-b" data-t="erase" title="ยางลบ (ลบทีละเส้น)">⌫<i>ยางลบ</i></button>' +
      '</div>' +
      '<div class="ipn-g ipn-cols" data-for="pen">' + sw(COLORS, 'pc') + '</div>' +
      '<div class="ipn-g ipn-cols" data-for="hl">' + sw(HL, 'hc') + '</div>' +
      '<div class="ipn-g">' +
      '<button type="button" class="ipn-b ipn-w" data-w="1.5" title="เส้นเล็ก"><b style="height:2px"></b></button>' +
      '<button type="button" class="ipn-b ipn-w" data-w="3" title="เส้นกลาง"><b style="height:4px"></b></button>' +
      '<button type="button" class="ipn-b ipn-w" data-w="6" title="เส้นใหญ่"><b style="height:8px"></b></button>' +
      '</div>' +
      '<div class="ipn-g">' +
      '<button type="button" class="ipn-b" data-a="undo" title="ย้อน">↶<i>ย้อน</i></button>' +
      '<button type="button" class="ipn-b" data-a="redo" title="ทำซ้ำ">↷<i>ทำซ้ำ</i></button>' +
      '<button type="button" class="ipn-b" data-a="hide" title="ซ่อน/แสดงลายมือ">◐<i>ซ่อน</i></button>' +
      '<button type="button" class="ipn-b" data-a="clear" title="ล้างลายมือของหน้านี้">🗑<i>ล้าง</i></button>' +
      '</div>' +
      '<label class="ipn-fg" title="ใช้นิ้วเขียน (ปิดไว้ = นิ้วเลื่อนหน้า ปากกาเขียน)"><input type="checkbox" data-a="finger"><i>นิ้วเขียน</i></label>' +
      '<p class="ipn-st" aria-live="polite"></p>';
    document.body.appendChild(fab); document.body.appendChild(panel);
    statusEl = panel.querySelector('.ipn-st');
    fab.addEventListener('click', function () { setOpen(true); });
    panel.addEventListener('click', onClick);
    panel.querySelector('[data-a=finger]').addEventListener('change', function () { st.finger = this.checked; keep(); sync(); });
    sync();
  }
  function setOpen(v) { st.open = v; if (v && st.tool === 'select') st.tool = 'pen'; keep(); sync(); }
  function say(t) { if (statusEl) statusEl.textContent = t; }
  function sync() {
    if (!panel) return;
    document.documentElement.classList.toggle('ipn-on', st.open);
    panel.hidden = !st.open; fab.hidden = st.open || !sheets.length;
    panel.querySelectorAll('[data-t]').forEach(function (b) { b.setAttribute('aria-pressed', b.getAttribute('data-t') === st.tool ? 'true' : 'false'); });
    panel.querySelectorAll('[data-pc]').forEach(function (b) { b.setAttribute('aria-pressed', b.getAttribute('data-pc') === st.pen ? 'true' : 'false'); });
    panel.querySelectorAll('[data-hc]').forEach(function (b) { b.setAttribute('aria-pressed', b.getAttribute('data-hc') === st.hl ? 'true' : 'false'); });
    panel.querySelectorAll('[data-w]').forEach(function (b) { b.setAttribute('aria-pressed', +b.getAttribute('data-w') === st.w ? 'true' : 'false'); });
    panel.querySelector('[data-for=pen]').hidden = st.tool !== 'pen';
    panel.querySelector('[data-for=hl]').hidden = st.tool !== 'hl';
    panel.querySelector('[data-a=finger]').checked = st.finger;
    var drawing = st.open && st.tool !== 'select';
    sheets.forEach(function (s) { s.cv.classList.toggle('ipn-live', drawing); s.cv.style.cursor = st.tool === 'erase' ? 'cell' : 'crosshair'; });
  }
  function active() { // แผ่นที่มองเห็นมากที่สุด
    var best = null, bv = -1;
    sheets.forEach(function (s) { if (!s.paper.isConnected) return; var r = s.paper.getBoundingClientRect(), v = Math.min(r.bottom, innerHeight) - Math.max(r.top, 0); if (r.width && v > bv) { bv = v; best = s; } });
    return best;
  }
  function onClick(e) {
    var b = e.target.closest('button'); if (!b) return;
    if (b.hasAttribute('data-t')) { st.tool = b.getAttribute('data-t'); keep(); sync(); say(st.tool === 'select' ? 'โหมดเลือกข้อความ: ลากเพื่อเน้นสีหรือเขียนโน้ตได้ตามเดิม' : ''); return; }
    if (b.hasAttribute('data-pc')) { st.pen = b.getAttribute('data-pc'); keep(); sync(); return; }
    if (b.hasAttribute('data-hc')) { st.hl = b.getAttribute('data-hc'); keep(); sync(); return; }
    if (b.hasAttribute('data-w')) { st.w = +b.getAttribute('data-w'); keep(); sync(); return; }
    var a = b.getAttribute('data-a'), s = active();
    if (a === 'close') { setOpen(false); return; }
    if (!s) return;
    if (a === 'undo' && s.data.strokes.length) { s.redo.push(s.data.strokes.pop()); s.draw(); s.save(); }
    if (a === 'redo' && s.redo.length) { s.data.strokes.push(s.redo.pop()); s.draw(); s.save(); }
    if (a === 'hide') { s.hidden = !s.hidden; sheets.forEach(function (x) { x.hidden = s.hidden; x.cv.style.opacity = x.hidden ? '0' : ''; }); b.setAttribute('aria-pressed', s.hidden ? 'true' : 'false'); say(s.hidden ? 'ซ่อนลายมือไว้ (ยังบันทึกอยู่)' : ''); }
    if (a === 'clear') {
      if (b.getAttribute('data-sure') !== '1') { b.setAttribute('data-sure', '1'); say('กด 🗑 อีกครั้งเพื่อล้างลายมือของหน้านี้'); setTimeout(function () { b.removeAttribute('data-sure'); }, 4000); return; }
      b.removeAttribute('data-sure'); s.redo = s.data.strokes.slice().reverse(); s.data.strokes = []; s.draw(); s.save(); say('ล้างแล้ว กด ↷ เพื่อเอาคืนทีละเส้น');
    }
  }

  function Sheet(paper, key) {
    var self = this, cv = document.createElement('canvas'), ctx = cv.getContext('2d');
    cv.className = 'ipn-cv'; paper.appendChild(cv);
    this.paper = paper; this.cv = cv; this.key = key; this.data = { strokes: [], t: 0 }; this.redo = []; this.hidden = false;
    var scale = 1, cur = null, erased = false, dirty = false;
    function size() {
      var w = paper.clientWidth, h = paper.clientHeight, dpr = Math.min(devicePixelRatio || 1, 2);
      if (!w || !h) return;
      scale = w / W; cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr); cv.style.width = w + 'px'; cv.style.height = h + 'px';
      ctx.setTransform(dpr * scale, 0, 0, dpr * scale, 0, 0); self.draw();
    }
    function line(s) {
      var p = s.p; if (!p.length) return;
      ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.strokeStyle = s.c; ctx.fillStyle = s.c;
      if (s.k === 'hl') { ctx.globalAlpha = 0.38; ctx.globalCompositeOperation = 'multiply'; ctx.lineCap = 'butt'; ctx.lineWidth = s.w * 6; ctx.beginPath(); ctx.moveTo(p[0], p[1]); for (var i = 3; i < p.length; i += 3) ctx.lineTo(p[i], p[i + 1]); if (p.length <= 3) ctx.lineTo(p[0] + 1, p[1]); ctx.stroke(); ctx.restore(); return; }
      if (p.length <= 3) { ctx.beginPath(); ctx.arc(p[0], p[1], s.w * 0.6, 0, 7); ctx.fill(); ctx.restore(); return; }
      for (var j = 3; j < p.length; j += 3) { ctx.lineWidth = s.w * (0.4 + 0.9 * (p[j + 2] || 0.5)); ctx.beginPath(); ctx.moveTo(p[j - 3], p[j - 2]); ctx.lineTo(p[j], p[j + 1]); ctx.stroke(); }
      ctx.restore();
    }
    this.draw = function () { ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, cv.width, cv.height); ctx.restore(); self.data.strokes.forEach(line); if (cur && cur.p) line(cur); };
    this.save = function () {
      self.data.t = Date.now(); say('กำลังบันทึก…');
      var p = self.data.strokes.length ? window.JCTInk.put(self.key, self.data) : window.JCTInk.del(self.key).then(function () { return true; });
      p.then(function (ok) { say(ok === false ? 'บันทึกไว้ชั่วคราว (เบราว์เซอร์ไม่อนุญาตให้เก็บถาวร)' : 'บันทึกลายมือแล้ว'); });
    };
    function pt(e) { var r = cv.getBoundingClientRect(); return [(e.clientX - r.left) / scale, (e.clientY - r.top) / scale, e.pointerType === 'pen' && e.pressure ? e.pressure : 0.5]; }
    function eraseAt(x, y) {
      var rr = 12, n = self.data.strokes.length;
      self.data.strokes = self.data.strokes.filter(function (s) { for (var i = 0; i < s.p.length; i += 3) if (Math.abs(s.p[i] - x) < rr + s.w && Math.abs(s.p[i + 1] - y) < rr + s.w * (s.k === 'hl' ? 3 : 1)) return false; return true; });
      if (self.data.strokes.length !== n) { self.draw(); return true; } return false;
    }
    var scrollY0 = null;
    cv.addEventListener('pointerdown', function (e) {
      if (!st.open || st.tool === 'select') return;
      if (e.pointerType === 'touch' && !st.finger) { scrollY0 = e.clientY; return; }
      e.preventDefault(); try { cv.setPointerCapture(e.pointerId); } catch (x) { /* ไม่เป็นไร */ }
      var q = pt(e);
      if (st.tool === 'erase') { cur = { erase: true }; erased = eraseAt(q[0], q[1]); return; }
      cur = { k: st.tool, c: st.tool === 'hl' ? st.hl : st.pen, w: st.w, p: [Math.round(q[0] * 10) / 10, Math.round(q[1] * 10) / 10, Math.round(q[2] * 100) / 100] };
    });
    cv.addEventListener('pointermove', function (e) {
      if (scrollY0 !== null && e.pointerType === 'touch') { scrollBy(0, scrollY0 - e.clientY); scrollY0 = e.clientY; return; }
      if (!cur) return;
      (e.getCoalescedEvents ? e.getCoalescedEvents() : [e]).forEach(function (ev) {
        var q = pt(ev);
        if (cur.erase) { if (eraseAt(q[0], q[1])) erased = true; return; }
        var p = cur.p, n = p.length;
        if (Math.abs(q[0] - p[n - 3]) + Math.abs(q[1] - p[n - 2]) < 0.8) return;
        if (cur.k === 'hl') q[1] = p[1] + (q[1] - p[1]) * 0.15; // ปากกาเน้นวิ่งตามแนวบรรทัด
        p.push(Math.round(q[0] * 10) / 10, Math.round(q[1] * 10) / 10, Math.round(q[2] * 100) / 100);
        dirty = true;
      });
      if (dirty) { dirty = false; self.draw(); }
    });
    function end() {
      scrollY0 = null; if (!cur) return;
      if (cur.erase) { cur = null; if (erased) self.save(); erased = false; return; }
      self.data.strokes.push(cur); self.redo = []; cur = null; self.draw(); self.save();
    }
    cv.addEventListener('pointerup', end); cv.addEventListener('pointercancel', end);
    if (window.ResizeObserver) { this.ro = new ResizeObserver(size); this.ro.observe(paper); }
    size();
    window.JCTInk.get(key).then(function (v) { if (v && v.strokes && self.key === key) { self.data = v; self.draw(); } });
  }

  window.JCTInkPanel = {
    // ล้างแผ่นเดิมของตัวอ่าน แล้วผูกแผ่นใหม่
    // owner = ตัวอ่านแต่ละชุด (หนึ่งหน้าเว็บมีได้หลายชุด) แทนที่เฉพาะแผ่นของชุดนั้น
    attach: function (owner, papers, keyFn) {
      if (!window.JCTInk) return;
      build();
      sheets = sheets.filter(function (s) {
        var drop = s.owner === owner || !s.paper.isConnected;
        if (drop) { if (s.ro) s.ro.disconnect(); if (s.cv.parentNode) s.cv.parentNode.removeChild(s.cv); }
        return !drop;
      });
      Array.prototype.forEach.call(papers, function (p, i) { var sh = new Sheet(p, keyFn(p, i)); sh.owner = owner; sheets.push(sh); });
      sync();
    },
    open: function (v) { build(); setOpen(v !== false); }
  };
})();
