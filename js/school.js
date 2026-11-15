/* หน้าสำนักคิด: หลักคำสอน + หลักการเต็มไทย/อังกฤษ + ตัวบทต้นฉบับแบ่งหน้าพร้อมคำแปล + สรุปและการตีความ
   ต้องโหลดหลัง app.js (ใช้ window.JCTApp), principles.js และ reader.js */
(function () {
  'use strict';
  var A = window.JCTApp, D = window.JCT, P = window.JCT_PRINCIPLES || {};
  if (!A || document.body.getAttribute('data-page') !== 'school') return;
  var el = A.el, els = A.els, esc = A.esc;
  var texts = {}, waiting = {};
  // ตัวบทเป็นไฟล์ .js (ใช้ได้ทั้งเปิดจากไฟล์และผ่านเว็บ) เรียก JCT_TEXT_LOAD เมื่อโหลดเสร็จ
  window.JCT_TEXT_LOAD = function (t) { texts[t.key] = t; (waiting[t.key] || []).forEach(function (f) { f.ok(t); }); delete waiting[t.key]; };
  function loadText(key) {
    if (texts[key]) return Promise.resolve(texts[key]);
    return new Promise(function (ok, fail) {
      var first = !waiting[key];
      (waiting[key] = waiting[key] || []).push({ ok: ok, fail: fail });
      if (!first) return;
      var s = document.createElement('script');
      s.src = 'texts/' + key + '.js';
      s.onerror = function () { (waiting[key] || []).forEach(function (f) { f.fail(new Error('โหลดตัวบทไม่ได้')); }); delete waiting[key]; s.remove(); };
      document.head.appendChild(s);
    });
  }
  var thx = {}, thw = {};
  window.JCT_TR_LOAD = function (t) { thx[t.key] = t; (thw[t.key] || []).forEach(function (f) { f(t); }); delete thw[t.key]; };
  function loadTh(key) {
    if (thx[key]) return Promise.resolve(thx[key]);
    return new Promise(function (ok) {
      var first = !thw[key]; (thw[key] = thw[key] || []).push(ok);
      if (!first) return;
      var s = document.createElement('script'); s.src = 'texts/th/' + key + '.th.js';
      s.onerror = function () { (thw[key] || []).forEach(function (f) { f(null); }); delete thw[key]; s.remove(); };
      document.head.appendChild(s);
    });
  }
  function fresh(box) { box.innerHTML = ''; var d = document.createElement('div'); d.className = 'rd'; box.appendChild(d); return d; }

  var timer = null, current = null;
  var FIELDS = ['orig', 'trans', 'sum', 'interp', 'one'];
  function idx() { var h = (location.hash || '').replace('#', ''); for (var i = 0; i < D.schools.length; i++) if (D.schools[i].id === h) return i; return -1; }

  function principles(s) {
    var pr = P[s.id], box = el('#prin-reader');
    if (!pr || !pr.items || !pr.items.length) { box.innerHTML = '<p class="muted">ยังไม่มีหลักการของสำนักนี้</p>'; return; }
    window.JCTReader({
      root: fresh(box), doc: 'p:' + s.id, meta: { school: s.id, title: 'หลักการ · ' + s.th },
      pages: function () { return pr.items.length; },
      title: function (i) { return 'หลักการที่ ' + (i + 1) + ' จาก ' + pr.items.length + ' · ' + pr.items[i].th[0]; },
      langs: [
        { id: 'th', label: 'ภาษาไทย', text: function (i) { return pr.items[i].th[0] + '\n\n' + pr.items[i].th[1]; } },
        { id: 'en', label: 'English', text: function (i) { return pr.items[i].en[0] + '\n\n' + pr.items[i].en[1]; } }
      ]
    });
  }

  function source(s) {
    var pr = P[s.id] || {}, key = pr.text, box = el('#src-reader');
    el('#src-meta').textContent = '';
    if (!key) {
      el('#src-title').textContent = 'ตัวบทต้นฉบับ';
      box.innerHTML = '<p class="note">งานหลักของสำนักนี้ยังมีลิขสิทธิ์ จึงไม่มีตัวบทเต็มในสมุด อ่านหลักการไทย/อังกฤษด้านบน และวางข้อความที่คุณมีสิทธิ์ใช้ในช่อง “ข้อความที่คุณวางเอง” ได้</p>';
      return;
    }
    box.innerHTML = '<p class="muted">กำลังโหลดตัวบท…</p>';
    var who = s;
    Promise.all([loadText(key), loadTh(key)]).then(function (r) {
      var t = r[0], mt = r[1];
      if (current !== who) return;
      el('#src-title').textContent = t.title;
      el('#src-meta').textContent = (t.author || 'ไม่ระบุผู้แต่ง') + (t.translator ? ' · ฉบับอังกฤษของ ' + t.translator : '') + ' · ' + t.pages.length + ' หน้า';
      window.JCTReader({
        root: fresh(box), doc: 'tx:' + key, meta: { school: who.id, title: t.title },
        pages: function () { return t.pages.length; },
        title: function (i) { return t.title + ' · หน้า ' + (i + 1); },
        langs: [
          { id: 'en', label: 'ต้นฉบับ (อังกฤษ)', text: function (i) { return t.pages[i]; } },
          { id: 'th', label: 'ภาษาไทย', editable: true, empty: 'หน้านี้ยังแปลด้วยเครื่องไม่เสร็จ กด “เขียนคำแปล” หรือ “แปลหน้านี้ด้วย AI” ได้เลย',
            text: function (i, d) { return d.tr[i] || (mt && mt.pages[i]) || ''; },
            badge: function (i, d) { return d.tr[i] ? 'คำแปลของฉัน' : (mt && mt.pages[i]) ? 'แปลด้วยเครื่อง ตรวจและแก้ได้' : ''; },
            ai: function (i) {
              if (!A.aiReady()) return Promise.reject(new Error('ยังไม่ได้เชื่อม AI (ตั้งค่า → เชื่อม AI) หรือเขียนคำแปลเองด้วยปุ่ม “เขียนคำแปล”'));
              return A.callAI('คุณเป็นผู้แปลงานปรัชญาจากอังกฤษเป็นไทย แปลให้ครบทุกประโยค ตรงความหมาย อ่านลื่นเป็นภาษาไทยปัจจุบัน คงการแบ่งย่อหน้าเดิม (คั่นด้วยบรรทัดว่าง) คงชื่อเฉพาะ ใส่ศัพท์ปรัชญาภาษาอังกฤษในวงเล็บเมื่อจำเป็น ตอบเฉพาะคำแปล ไม่ต้องอธิบาย',
                [{ role: 'user', content: 'ตัวบทจาก ' + t.title + ' (' + t.author + ') หน้า ' + (i + 1) + ':\n\n' + t.pages[i] }], 4096);
            } }
        ]
      });
    }, function (e) { if (current === who) box.innerHTML = '<p class="note pink">' + esc(e.message) + ' ลองรีเฟรชหน้า หรือเปิดต้นฉบับจากลิงก์ด้านบน</p>'; });
  }

  function show() {
    var i = idx();
    el('#nf').hidden = i >= 0; el('#ok').hidden = i < 0;
    if (i < 0) { document.title = 'ไม่พบสำนักคิด · เจตจำนงของความคิด'; return; }
    var s = D.schools[i]; current = s;
    var note = A.load(s.id) || {};
    var prev = D.schools[(i + D.schools.length - 1) % D.schools.length], next = D.schools[(i + 1) % D.schools.length];
    document.title = s.th + ' · เจตจำนงของความคิด';
    el('#t-name').textContent = s.th;
    el('#t-name2').textContent = 'หลักคำสอนของ' + s.th;
    el('#t-en').textContent = s.en + ' · ' + s.who;
    el('#t-n').textContent = String(i + 1);
    var warn = '';
    el('#t-warn').innerHTML = warn;
    var mine = A.sagesOf(s.id);
    el('#t-teach').innerHTML = mine.length ? '<ol class="core">' + mine.map(function (g) {
      return g.concepts.slice(0, 3).map(function (c, j) {
        return '<li><div>' + (j === 0 ? '<span class="by">' + esc(g.th) + '</span>' : '') + esc(c) + (j === 0 ? ' <a href="sage.html#' + g.id + '">อ่านทั้งหมดและสนทนา →</a>' : '') + '</div></li>';
      }).join('');
    }).join('') + '</ol>' : '<p class="muted">ยังไม่มีข้อมูลหลักคำสอน</p>';
    FIELDS.forEach(function (k) { el('#f-' + k).value = note[k] || ''; });
    if (window.JCTZone) window.JCTZone.refresh();
    el('#status').textContent = 'พิมพ์ได้เลย ทุกช่องบันทึกเองในเครื่องนี้';
    principles(s); source(s);

  }
  function onInput() {
    if (!current) return;
    var obj = { t: Date.now() };
    FIELDS.forEach(function (k) { obj[k] = el('#f-' + k).value; });
    clearTimeout(timer);
    var id = current.id;
    el('#status').textContent = 'กำลังบันทึก…';
    timer = setTimeout(function () { el('#status').textContent = A.save(id, obj) ? 'บันทึกในเครื่องนี้แล้ว' : 'บันทึกไว้ชั่วคราวเท่านั้น (เบราว์เซอร์ไม่อนุญาตให้เก็บถาวร)'; }, 500);
  }
  FIELDS.forEach(function (k) { el('#f-' + k).addEventListener('input', onInput); });
  els('.seg button').forEach(function (b) {
    b.addEventListener('click', function () {
      var t = b.getAttribute('data-t');
      els('.seg button').forEach(function (x) { x.setAttribute('aria-pressed', x === b ? 'true' : 'false'); });
      els('.panel[data-tab]').forEach(function (p) { p.classList.toggle('show', p.getAttribute('data-tab') === t); });
    });
  });
  window.addEventListener('hashchange', show);
  show();
})();
