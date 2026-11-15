/* ตัวอ่านแบบแบ่งหน้า พร้อมเน้นสี ขีดเส้นใต้ เขียนโน้ต แก้ ลบ และบันทึก
   ใช้ในหน้าสำนักคิด: (1) หลักการ ไทย/อังกฤษ  (2) ตัวบทต้นฉบับอังกฤษ + คำแปลไทยของผู้ใช้
   ที่เก็บ: localStorage  jct:v1:ann:<doc>  = { marks:[{id,page,lang,s,e,type,color,note,t}], tr:{page:text}, notes:{page:text}, last:page } */
(function () {
  'use strict';
  var KEY = 'jct:v1:ann:';
  function load(doc) { try { return JSON.parse(localStorage.getItem(KEY + doc)) || null; } catch (e) { return null; } }
  function save(doc, d) { try { localStorage.setItem(KEY + doc, JSON.stringify(d)); return true; } catch (e) { return false; } }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }
  var COLORS = { y: 'เหลือง', p: 'ชมพู', b: 'ฟ้า', g: 'เขียว' };

  // แปลงข้อความ + เครื่องหมาย เป็น HTML (ข้อความเป็น pre-wrap ตำแหน่งตัวอักษรจึงตรงกับต้นฉบับ)
  function renderMarked(text, marks) {
    var cuts = [0, text.length];
    marks.forEach(function (m) { cuts.push(Math.max(0, Math.min(text.length, m.s)), Math.max(0, Math.min(text.length, m.e))); });
    cuts = cuts.filter(function (v, i, a) { return a.indexOf(v) === i; }).sort(function (a, b) { return a - b; });
    var out = '';
    for (var i = 0; i < cuts.length - 1; i++) {
      var a = cuts[i], b = cuts[i + 1], seg = esc(text.slice(a, b));
      var on = marks.filter(function (m) { return m.s <= a && m.e >= b; });
      if (!on.length) { out += seg; continue; }
      var cls = [], id = on[on.length - 1].id, note = '';
      on.forEach(function (m) { cls.push(m.type === 'ul' ? 'ann-ul' : 'ann-hl ann-' + (m.color || 'y')); if (m.note) note = m.note; });
      out += '<span class="ann ' + cls.join(' ') + (note ? ' ann-note' : '') + '" data-mid="' + id + '"' + (note ? ' title="' + esc(note) + '"' : '') + '>' + seg + '</span>';
    }
    return out;
  }
  // ตำแหน่งตัวอักษรของจุดเลือกภายในกล่อง
  function offsetIn(box, node, off) {
    var w = document.createTreeWalker(box, NodeFilter.SHOW_TEXT, null), n, pos = 0;
    while ((n = w.nextNode())) { if (n === node) return pos + off; pos += n.nodeValue.length; }
    if (node === box) { var len = 0, k; for (k = 0; k < off; k++) len += (box.childNodes[k].textContent || '').length; return len; }
    return -1;
  }

  /* สร้างตัวอ่าน
     opts: { root, doc, pages(): จำนวนหน้า, title(i), langs: [{id:'en', label, text(i, data), editable}], pageLabel(i), onPage(i) } */
  function Reader(opts) {
    var root = opts.root, doc = opts.doc;
    var data = load(doc) || { marks: [], tr: {}, notes: {}, last: 0 };
    data.marks = data.marks || []; data.tr = data.tr || {}; data.notes = data.notes || {};
    if (opts.meta) data.meta = { school: (data.meta && data.meta.school) || opts.meta.school, title: opts.meta.title };
    var page = Math.min(data.last || 0, Math.max(0, opts.pages() - 1));
    try { var g = JSON.parse(sessionStorage.getItem('jct:goto') || 'null'); if (g && g.doc === doc) { page = g.page; sessionStorage.removeItem('jct:goto'); } } catch (e) { /* ไม่เป็นไร */ }
    var attached = -1, editing = {}, timer = null;
    var VKEY = 'jct:v1:rdview', mobileLang = 'both';
    var hasTh = opts.langs.some(function (l) { return l.id === 'th'; });
    mobileLang = hasTh ? 'th' : opts.langs[0].id;
    try { var sv = localStorage.getItem(VKEY); if (sv && (sv === 'both' || opts.langs.some(function (l) { return l.id === sv; }))) mobileLang = sv; } catch (e) { /* ไม่เป็นไร */ }
    function persist(msg) { data.t = Date.now(); data.last = page; var ok = save(doc, data); setStatus(ok ? (msg || 'บันทึกแล้ว') : 'บันทึกไว้ชั่วคราวเท่านั้น (เบราว์เซอร์ไม่อนุญาตให้เก็บถาวร)'); }
    function setStatus(t) { var s = root.querySelector('.rd-status'); if (s) s.textContent = t; }
    root.innerHTML =
      '<div class="rd-top"><div class="rd-nav"><button class="btn ghost sm" type="button" data-go="-1">←</button>' +
      '<label class="rd-pg">หน้า <input class="text rd-num" type="number" min="1"> / <span class="rd-total"></span></label>' +
      '<button class="btn ghost sm" type="button" data-go="1">→</button></div>' +
      '<div class="chips rd-langtabs" role="group" aria-label="เลือกภาษาที่จะอ่าน">' + opts.langs.slice().sort(function (a, b) { return (a.id === 'th' ? 0 : 1) - (b.id === 'th' ? 0 : 1); }).map(function (l) { return '<button class="chip sm" type="button" data-lang="' + l.id + '">' + l.label + '</button>'; }).join('') + '<button class="chip sm" type="button" data-lang="both">แสดงคู่กัน</button></div>' +
      '<button class="btn sm rd-fullbtn" type="button" data-full="1" aria-pressed="false">📖 อ่านเต็มจอ</button></div>' +
      '<h3 class="h3 rd-title"></h3>' +
      '<div class="rd-cols">' + opts.langs.map(function (l) { return '<section class="rd-col" data-col="' + l.id + '"><div class="rd-head"><span class="eyebrow">' + l.label + ' <span class="rd-badge"></span></span><span class="rd-tools"></span></div><div class="rd-paper"><div class="rd-text" lang="' + l.id + '"></div><div class="rd-folio" aria-hidden="true"></div></div></section>'; }).join('') + '</div>' +
      '<div class="rd-foot"><button class="btn ghost sm" type="button" data-go="-1">← หน้าก่อน</button><span class="rd-pgb muted small"></span><button class="btn sm" type="button" data-go="1">หน้าถัดไป →</button></div>' +
      '<div class="rd-bar" hidden><button class="chip sm" type="button" data-mk="hl:y">เน้นเหลือง</button><button class="chip sm" type="button" data-mk="hl:p">เน้นชมพู</button><button class="chip sm" type="button" data-mk="hl:b">เน้นฟ้า</button><button class="chip sm" type="button" data-mk="ul">ขีดเส้นใต้</button><button class="chip sm" type="button" data-mk="note">+ โน้ต</button></div>' +
      '<div class="rd-pop" hidden><p class="small rd-popq"></p><label class="sr" for="' + doc + '-pn">โน้ต</label><textarea class="low rd-popnote" id="' + doc + '-pn" placeholder="เขียนโน้ตของจุดนี้"></textarea><div class="btnrow"><button class="btn sm" type="button" data-pop="save">บันทึกโน้ต</button><button class="btn ghost sm" type="button" data-pop="ul">สลับขีดเส้นใต้/เน้นสี</button><button class="btn warn sm" type="button" data-pop="del">ลบเครื่องหมาย</button><button class="btn ghost sm" type="button" data-pop="close">ปิด</button></div></div>' +
      '<div class="field rd-pnote"><label>บันทึกของหน้านี้</label><textarea class="low rd-pagenote" placeholder="เขียน สรุป หรือถามตัวเองเกี่ยวกับหน้านี้"></textarea></div>' +
      '<details class="more rd-ink" hidden><summary>ลายมือเดิมของหน้านี้ (แบบเก่า)</summary><div class="rd-inkpad"></div></details>' +
      '<p class="muted small rd-inkhint">✎ เขียนบนกระดาษ: กดปุ่ม "เขียน" ที่ขอบขวาของจอ เลือกปากกา ปากกาเน้น หรือยางลบ ลายมือบันทึกเองและแก้ได้ภายหลัง</p>' +
      '<p class="status rd-status" aria-live="polite"></p>';
    var bar = root.querySelector('.rd-bar'), pop = root.querySelector('.rd-pop'), sel = null, popMark = null;

    function marksOf(lang) { return data.marks.filter(function (m) { return m.page === page && m.lang === lang; }); }
    function textOf(l) { return l.text(page, data) || ''; }
    function draw() {
      var total = opts.pages();
      root.querySelector('.rd-total').textContent = total;
      var num = root.querySelector('.rd-num'); num.value = page + 1; num.max = total;
      root.querySelector('.rd-title').textContent = opts.title(page);
      root.querySelector('.rd-pgb').textContent = 'หน้า ' + (page + 1) + ' / ' + total;
      root.querySelectorAll('[data-go]').forEach(function (b) { b.disabled = +b.getAttribute('data-go') < 0 ? page <= 0 : page >= total - 1; });
      root.querySelectorAll('.rd-folio').forEach(function (f) { f.textContent = '— ' + (page + 1) + ' —'; });
      opts.langs.forEach(function (l) {
        var col = root.querySelector('[data-col="' + l.id + '"]'), box = col.querySelector('.rd-text'), tools = col.querySelector('.rd-tools');
        var t = textOf(l);
        var bd = col.querySelector('.rd-badge'); if (bd) bd.textContent = l.badge ? l.badge(page, data) : '';
        if (l.editable) {
          tools.innerHTML = editing[l.id]
            ? '<button class="chip sm" type="button" data-ed="done">เสร็จ</button>'
            : '<button class="chip sm" type="button" data-ed="edit">' + (t ? 'แก้คำแปล' : 'เขียนคำแปล') + '</button>' + (l.ai ? '<button class="chip sm" type="button" data-ed="ai">แปลหน้านี้ด้วย AI</button>' : '') + (t ? '<button class="chip sm" type="button" data-ed="clear">ลบคำแปลหน้านี้</button>' : '');
        }
        if (editing[l.id]) { box.innerHTML = '<textarea class="rd-edit" lang="' + l.id + '"></textarea>'; box.querySelector('textarea').value = t; }
        else box.innerHTML = t ? renderMarked(t, marksOf(l.id)) : '<span class="muted">' + (l.empty || 'ยังไม่มีข้อความ') + '</span>';
        col.classList.toggle('show', mobileLang === 'both' || l.id === mobileLang);
      });
      root.querySelector('.rd-pagenote').value = data.notes[page] || '';
      var ink = root.querySelector('.rd-ink'), pad = root.querySelector('.rd-inkpad');
      if (ink.open && window.JCTInk) window.JCTInk.mount(pad, 'rd:' + doc + ':' + page, { minHeight: 500 }); else pad.innerHTML = '';
      // ลายมือแบบเก่า (ช่องด้านล่าง): แสดงเฉพาะหน้าที่เคยเขียนไว้
      ink.hidden = true;
      if (window.JCTInk) { var pg0 = page; window.JCTInk.get('rd:' + doc + ':' + page).then(function (v) { if (pg0 === page && v && v.strokes && v.strokes.length) ink.hidden = false; }); }
      // ลายมือบนแผ่นกระดาษ (แถบเครื่องมือด้านขวา)
      if (window.JCTInkPanel && attached !== page) { attached = page; window.JCTInkPanel.attach(root, root.querySelectorAll('.rd-paper'), function (p) { return 'ov:' + doc + ':' + page + ':' + p.parentNode.getAttribute('data-col'); }); }
      root.querySelectorAll('[data-lang]').forEach(function (x) { x.setAttribute('aria-pressed', x.getAttribute('data-lang') === mobileLang ? 'true' : 'false'); });
      root.querySelector('.rd-cols').setAttribute('data-view', mobileLang === 'both' ? 'both' : 'one');
      bar.hidden = true; pop.hidden = true;
      if (opts.onPage) opts.onPage(page);
    }
    function go(p) { var total = opts.pages(); page = Math.max(0, Math.min(total - 1, p)); data.last = page; save(doc, data); draw(); setStatus(''); }
    root.addEventListener('click', function (e) {
      var b = e.target.closest('[data-go]'); if (b) { go(page + +b.getAttribute('data-go')); if (root.classList.contains('rd-full')) root.scrollTop = 0; else root.scrollIntoView({ behavior: 'smooth', block: 'start' }); return; }
      var lb = e.target.closest('[data-lang]'); if (lb) { mobileLang = lb.getAttribute('data-lang'); try { localStorage.setItem(VKEY, mobileLang); } catch (x) { /* ไม่เป็นไร */ } draw(); return; }
      var fb = e.target.closest('[data-full]'); if (fb) { setFull(!root.classList.contains('rd-full')); return; }
      var ed = e.target.closest('[data-ed]');
      if (ed) {
        var lang = ed.closest('[data-col]').getAttribute('data-col'), act = ed.getAttribute('data-ed'), L = opts.langs.filter(function (x) { return x.id === lang; })[0];
        if (act === 'edit') { editing[lang] = true; draw(); return; }
        if (act === 'done') {
          var v = root.querySelector('[data-col="' + lang + '"] textarea').value;
          var old = data.tr[page] || '';
          if (v.trim()) data.tr[page] = v; else delete data.tr[page];
          if (v !== old) { var before = data.marks.length; data.marks = data.marks.filter(function (m) { return !(m.page === page && m.lang === lang && m.e > v.length); }); if (data.marks.length < before) setStatus('ลบเครื่องหมายที่เกินข้อความใหม่แล้ว'); }
          editing[lang] = false; persist('บันทึกคำแปลแล้ว'); draw(); return;
        }
        if (act === 'clear') {
          if (ed.getAttribute('data-sure') !== '1') { ed.setAttribute('data-sure', '1'); ed.textContent = 'กดอีกครั้งเพื่อยืนยัน'; return; }
          delete data.tr[page]; data.marks = data.marks.filter(function (m) { return !(m.page === page && m.lang === lang); }); persist('ลบคำแปลหน้านี้แล้ว'); draw(); return;
        }
        if (act === 'ai' && L.ai) {
          setStatus('กำลังแปล…'); ed.disabled = true;
          L.ai(page).then(function (txt) { data.tr[page] = txt; persist('แปลแล้ว ตรวจและแก้ได้ด้วยปุ่ม "แก้คำแปล"'); draw(); }, function (err) { setStatus('แปลไม่สำเร็จ: ' + err.message); ed.disabled = false; });
          return;
        }
      }
      var mk = e.target.closest('[data-mk]');
      if (mk && sel) {
        var spec = mk.getAttribute('data-mk'), m = { id: uid(), page: page, lang: sel.lang, s: sel.s, e: sel.e, t: Date.now(), type: spec === 'ul' ? 'ul' : 'hl', color: spec.indexOf('hl:') === 0 ? spec.slice(3) : 'y', note: '', quote: sel.q.slice(0, 300) };
        data.marks.push(m); persist(spec === 'note' ? 'สร้างเครื่องหมายแล้ว เขียนโน้ตได้เลย' : 'บันทึกเครื่องหมายแล้ว');
        window.getSelection().removeAllRanges(); sel = null; draw();
        if (spec === 'note') openPop(m);
        return;
      }
      var ann = e.target.closest('.ann');
      if (ann && !e.target.closest('textarea')) { var mm = data.marks.filter(function (x) { return x.id === ann.getAttribute('data-mid'); })[0]; if (mm) openPop(mm); return; }
      var pb = e.target.closest('[data-pop]');
      if (pb && popMark) {
        var a2 = pb.getAttribute('data-pop');
        if (a2 === 'save') { popMark.note = root.querySelector('.rd-popnote').value.trim(); persist('บันทึกโน้ตแล้ว'); }
        if (a2 === 'ul') { popMark.type = popMark.type === 'ul' ? 'hl' : 'ul'; persist(); }
        if (a2 === 'del') { data.marks = data.marks.filter(function (x) { return x !== popMark; }); persist('ลบเครื่องหมายแล้ว'); }
        pop.hidden = true; popMark = null; draw();
      }
    });
    // โหมดเต็มจอ: ตัวอ่านขยายเต็มหน้าต่างเว็บ กด Esc หรือปุ่มเดิมเพื่อออก
    function setFull(on) {
      root.classList.toggle('rd-full', on); document.documentElement.classList.toggle('rd-fullon', on);
      var b = root.querySelector('.rd-fullbtn'); b.setAttribute('aria-pressed', on ? 'true' : 'false'); b.textContent = on ? '✕ ออกจากเต็มจอ' : '📖 อ่านเต็มจอ';
      if (on) root.scrollTop = 0; else root.scrollIntoView({ block: 'start' });
    }
    // เต็มจอ: ปัดซ้าย/ขวาเพื่อพลิกหน้า ลูกศรซ้าย/ขวาบนคีย์บอร์ดก็ได้
    var tsx = null, tsy = 0, tst = 0;
    root.addEventListener('touchstart', function (e) { tsx = null; if (!root.classList.contains('rd-full') || e.touches.length !== 1 || e.target.closest('textarea,input,.rd-bar,.rd-pop,.ipn-cv.ipn-live')) return; tsx = e.touches[0].clientX; tsy = e.touches[0].clientY; tst = Date.now(); }, { passive: true });
    root.addEventListener('touchend', function (e) { if (tsx === null) return; var t = e.changedTouches[0], dx = t.clientX - tsx, dy = t.clientY - tsy; tsx = null; if (Date.now() - tst > 700 || Math.abs(dx) < 60 || Math.abs(dx) < Math.abs(dy) * 1.8 || String(window.getSelection() || '')) return; go(page + (dx < 0 ? 1 : -1)); root.scrollTop = 0; }, { passive: true });
    document.addEventListener('keydown', function (e) { if (!root.classList.contains('rd-full') || e.target.closest('input,textarea')) return; if (e.key === 'ArrowRight') { e.stopPropagation(); go(page + 1); root.scrollTop = 0; } if (e.key === 'ArrowLeft') { e.stopPropagation(); go(page - 1); root.scrollTop = 0; } }, true);
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && root.classList.contains('rd-full') && !document.querySelector('.rd-pop:not([hidden])')) setFull(false); });
    function openPop(m) { popMark = m; pop.hidden = false; root.querySelector('.rd-popq').textContent = '“' + (m.quote || '').slice(0, 160) + ((m.quote || '').length > 160 ? '…' : '') + '”'; root.querySelector('.rd-popnote').value = m.note || ''; root.querySelector('.rd-popnote').focus(); }
    root.querySelector('.rd-ink').addEventListener('toggle', function () { var pad = root.querySelector('.rd-inkpad'); if (this.open && window.JCTInk) window.JCTInk.mount(pad, 'rd:' + doc + ':' + page, { minHeight: 500 }); });
    root.querySelector('.rd-num').addEventListener('change', function () { go((+this.value || 1) - 1); });
    root.querySelector('.rd-pagenote').addEventListener('input', function () { var v = this.value; clearTimeout(timer); setStatus('กำลังบันทึก…'); timer = setTimeout(function () { if (v.trim()) data.notes[page] = v; else delete data.notes[page]; persist('บันทึกของหน้านี้แล้ว'); }, 600); });
    // จับการเลือกข้อความ
    function checkSel() {
      var s = window.getSelection(); if (!s || s.isCollapsed || !s.rangeCount) { bar.hidden = true; sel = null; return; }
      var r = s.getRangeAt(0), box = r.commonAncestorContainer.nodeType === 1 ? r.commonAncestorContainer.closest('.rd-text') : r.commonAncestorContainer.parentNode.closest('.rd-text');
      if (!box || !root.contains(box) || box.querySelector('textarea')) { bar.hidden = true; sel = null; return; }
      var a = offsetIn(box, r.startContainer, r.startOffset), b = offsetIn(box, r.endContainer, r.endOffset);
      if (a < 0 || b < 0 || b <= a) { bar.hidden = true; sel = null; return; }
      sel = { lang: box.getAttribute('lang'), s: a, e: b, q: s.toString() };
      var rect = r.getBoundingClientRect(), host = root.getBoundingClientRect();
      bar.hidden = false; bar.style.top = (rect.bottom - host.top + 8) + 'px'; bar.style.left = Math.max(0, Math.min(host.width - 340, rect.left - host.left)) + 'px';
    }
    document.addEventListener('selectionchange', function () { clearTimeout(checkSel.t); checkSel.t = setTimeout(checkSel, 120); });
    draw();
    return { go: go, data: function () { return data; } };
  }
  window.JCTReader = Reader;
  window.JCTReaderStore = { load: load, KEY: KEY };
})();
