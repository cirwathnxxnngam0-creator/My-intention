/* ห้องสมอง: แบบจำลอง 3 มิติ (WebGL เขียนเอง ไม่ใช้ไลบรารีภายนอก) + เนื้อหาการคิด เครือข่าย สารสื่อประสาท ความผิดปกติ
   ข้อมูล: js/brain3d-data.js (รูปทรง), js/brain-content.js (เนื้อหา) */
(function () {
  'use strict';
  var B = window.BRAIN, G = window.BRAIN3D;
  if (!B || document.body.getAttribute('data-page') !== 'brain') return;
  function el(s, r) { return (r || document).querySelector(s); }
  function els(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function ul(a) { return '<ul>' + a.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ul>'; }
  var SAGES = window.JCT_SAGES || [];
  function sageName(id) { for (var i = 0; i < SAGES.length; i++) if (SAGES[i].id === id) return SAGES[i].th; return id; }
  var REG = B.regions;

  // ================= แบบจำลอง 3 มิติ =================
  var V = { ok: false };
  function hexToRgb(h) { var n = parseInt(h.slice(1), 16); return [(n >> 16 & 255) / 255, (n >> 8 & 255) / 255, (n & 255) / 255]; }
  var GRAY = [0.30, 0.34, 0.50], BASE_MIX = 0.55;
  function mix(a, b, t) { return [a[0] * (1 - t) + b[0] * t, a[1] * (1 - t) + b[1] * t, a[2] * (1 - t) + b[2] * t]; }

  // ตัวแสดงผล WebGL ที่เขียนเอง (ไม่พึ่งไลบรารีภายนอก ใช้ได้ทั้งเปิดจากไฟล์ ผ่านเว็บ และใน artifact)
  function initViewer() {
    var host = el('#v3d'), msg = el('#v3d-msg');
    if (!G) { msg.textContent = 'โหลดข้อมูลแบบจำลองไม่ได้ ใช้รายการบริเวณด้านล่างแทนได้'; return; }
    var canvas = document.createElement('canvas');
    var gl = canvas.getContext('webgl', { antialias: true, alpha: true, premultipliedAlpha: false }) || canvas.getContext('experimental-webgl');
    if (!gl) { msg.textContent = 'เบราว์เซอร์นี้ไม่รองรับภาพ 3 มิติ (WebGL) ใช้รายการบริเวณด้านล่างแทนได้'; return; }
    host.appendChild(canvas);
    var u32 = gl.getExtension('OES_element_index_uint');
    // ---- เชดเดอร์ ----
    function sh(type, src) { var s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s)); return s; }
    var prog = gl.createProgram();
    gl.attachShader(prog, sh(gl.VERTEX_SHADER, 'attribute vec3 p;attribute vec3 n;attribute vec3 c;uniform mat4 vp;uniform vec3 off;varying vec3 vn;varying vec3 vc;void main(){vn=n;vc=c;gl_Position=vp*vec4(p+off,1.0);}'));
    gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, 'precision mediump float;varying vec3 vn;varying vec3 vc;uniform vec3 ld;uniform float a;uniform float em;void main(){vec3 n=normalize(vn);float d=abs(dot(n,ld));float l=0.34+0.62*d+0.08*n.y;gl_FragColor=vec4(vc*l+vc*em,a);}'));
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog));
    gl.useProgram(prog);
    var L = { p: gl.getAttribLocation(prog, 'p'), n: gl.getAttribLocation(prog, 'n'), c: gl.getAttribLocation(prog, 'c') };
    var U = { vp: gl.getUniformLocation(prog, 'vp'), off: gl.getUniformLocation(prog, 'off'), ld: gl.getUniformLocation(prog, 'ld'), a: gl.getUniformLocation(prog, 'a'), em: gl.getUniformLocation(prog, 'em') };
    // ---- ข้อมูลรูปทรง ----
    var raw = atob(G.b64), buf = new ArrayBuffer(raw.length), u8 = new Uint8Array(buf);
    for (var i = 0; i < raw.length; i++) u8[i] = raw.charCodeAt(i);
    function normals(pos, idx) {
      var n = new Float32Array(pos.length);
      for (var t = 0; t < idx.length; t += 3) {
        var a = idx[t] * 3, b = idx[t + 1] * 3, c = idx[t + 2] * 3;
        var ux = pos[b] - pos[a], uy = pos[b + 1] - pos[a + 1], uz = pos[b + 2] - pos[a + 2];
        var vx = pos[c] - pos[a], vy = pos[c + 1] - pos[a + 1], vz = pos[c + 2] - pos[a + 2];
        var nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
        n[a] += nx; n[a + 1] += ny; n[a + 2] += nz; n[b] += nx; n[b + 1] += ny; n[b + 2] += nz; n[c] += nx; n[c + 1] += ny; n[c + 2] += nz;
      }
      for (var k = 0; k < n.length; k += 3) { var l = Math.hypot(n[k], n[k + 1], n[k + 2]) || 1; n[k] /= l; n[k + 1] /= l; n[k + 2] /= l; }
      return n;
    }
    function upload(pos, idx, extra) {
      var m = extra || {};
      m.pos = pos; m.idx = idx; m.nv = pos.length / 3; m.col = new Float32Array(pos.length);
      m.bp = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, m.bp); gl.bufferData(gl.ARRAY_BUFFER, pos, gl.STATIC_DRAW);
      m.bn = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, m.bn); gl.bufferData(gl.ARRAY_BUFFER, normals(pos, idx), gl.STATIC_DRAW);
      m.bc = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, m.bc); gl.bufferData(gl.ARRAY_BUFFER, m.col, gl.DYNAMIC_DRAW);
      m.bi = gl.createBuffer(); gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, m.bi); gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, idx, gl.STATIC_DRAW);
      m.itype = idx instanceof Uint32Array ? gl.UNSIGNED_INT : gl.UNSIGNED_SHORT;
      m.off = m.off || [0, 0, 0]; m.visible = true; m.em = 0;
      return m;
    }
    var REGS = G.regions, cortex = [], subs = [], all = [];
    G.meshes.forEach(function (md) {
      var q = new Int16Array(buf, md.pos, md.nv * 3), pos = new Float32Array(md.nv * 3);
      for (var k = 0; k < md.nv; k++) { pos[k * 3] = q[k * 3] / 100; pos[k * 3 + 1] = q[k * 3 + 2] / 100; pos[k * 3 + 2] = -q[k * 3 + 1] / 100; } // MNI (x,y,z) → (x, z, -y)
      var idx = md.idxType === 'u16' ? new Uint16Array(buf.slice(md.idx, md.idx + md.nf * 6)) : new Uint32Array(buf.slice(md.idx, md.idx + md.nf * 12));
      if (idx instanceof Uint32Array && !u32) return;
      var m;
      if (md.reg !== undefined) {
        var r = new Uint8Array(buf, md.reg, md.nv), ids = new Array(md.nv);
        for (var j = 0; j < md.nv; j++) ids[j] = r[j] ? REGS[r[j] - 1] : null;
        m = upload(pos, idx, { cortex: true, regIds: ids, hemi: md.name.slice(-1) });
        cortex.push(m);
      } else { m = upload(pos, idx, { region: md.region }); subs.push(m); }
      all.push(m);
    });
    // ทรงกลมสำหรับนิวเคลียสขนาดเล็ก
    var sp = [], si = [], R = 2.4, NA = 10, NB = 14;
    for (var a = 0; a <= NA; a++) for (var b = 0; b <= NB; b++) { var th = a / NA * Math.PI, ph = b / NB * 2 * Math.PI; sp.push(R * Math.sin(th) * Math.cos(ph), R * Math.cos(th), R * Math.sin(th) * Math.sin(ph)); }
    for (a = 0; a < NA; a++) for (b = 0; b < NB; b++) { var p0 = a * (NB + 1) + b, p1 = p0 + NB + 1; si.push(p0, p1, p0 + 1, p1, p1 + 1, p0 + 1); }
    var sphPos = new Float32Array(sp), sphIdx = new Uint16Array(si);
    (G.markers || []).concat(B.extraMarkers || []).forEach(function (mk) {
      var m = upload(sphPos, sphIdx, { region: mk.region, marker: true, off: [mk.pos[0], mk.pos[2], -mk.pos[1]] });
      subs.push(m); all.push(m);
    });
    // ---- ไขสันหลัง กระดูกสันหลัง และเส้นประสาท (brain-nerves.js) สร้างเป็นท่อ/ทรงรีด้วยโค้ด ----
    var body = [], showBody = false;
    function toR(p) { return [p[0], p[2], -p[1]]; } // MNI → พิกัดภาพ
    function buildPart(pt) {
      var P = [], I = [];
      function flush() { if (!I.length) return; var m = upload(new Float32Array(P), new Uint16Array(I), { region: pt.region, body: true }); m.visible = false; body.push(m); subs.push(m); all.push(m); P = []; I = []; }
      pt.tubes.forEach(function (t) {
        var pts = t.p.map(toR), n = pts.length, S = t.sides || 8, sx = t.sx || 1;
        if (P.length / 3 + n * S + 2 > 65000) flush();
        var base = P.length / 3, prevN = null;
        for (var i = 0; i < n; i++) {
          var a = pts[Math.max(0, i - 1)], b = pts[Math.min(n - 1, i + 1)], d = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], dl = Math.hypot(d[0], d[1], d[2]) || 1; d = [d[0] / dl, d[1] / dl, d[2] / dl];
          var ref = Math.abs(d[0]) < 0.9 ? [1, 0, 0] : [0, 0, 1];
          var u = prevN || ref, w; // ทิศอ้างอิงต่อเนื่องเพื่อไม่ให้ท่อบิด
          w = [d[1] * u[2] - d[2] * u[1], d[2] * u[0] - d[0] * u[2], d[0] * u[1] - d[1] * u[0]]; var wl = Math.hypot(w[0], w[1], w[2]) || 1; w = [w[0] / wl, w[1] / wl, w[2] / wl];
          u = [w[1] * d[2] - w[2] * d[1], w[2] * d[0] - w[0] * d[2], w[0] * d[1] - w[1] * d[0]]; prevN = u;
          var r = Array.isArray(t.r) ? t.r[i] : t.r;
          for (var k = 0; k < S; k++) { var th = k / S * 2 * Math.PI, c = Math.cos(th) * r * sx, s2 = Math.sin(th) * r; P.push(pts[i][0] + u[0] * c + w[0] * s2, pts[i][1] + u[1] * c + w[1] * s2, pts[i][2] + u[2] * c + w[2] * s2); }
        }
        for (i = 0; i < n - 1; i++) for (var k2 = 0; k2 < S; k2++) { var p0 = base + i * S + k2, p1 = base + i * S + (k2 + 1) % S; I.push(p0, p1, p0 + S, p1, p1 + S, p0 + S); }
        if (t.cap) [0, n - 1].forEach(function (e) { var ci = P.length / 3; P.push(pts[e][0], pts[e][1], pts[e][2]); for (var k3 = 0; k3 < S; k3++) I.push(ci, base + e * S + k3, base + e * S + (k3 + 1) % S); });
      });
      pt.balls.forEach(function (bl) {
        if (P.length / 3 + 200 > 65000) flush();
        var base = P.length / 3, c = toR(bl.c), NA2 = 8, NB2 = 12;
        for (var a2 = 0; a2 <= NA2; a2++) for (var b2 = 0; b2 <= NB2; b2++) { var th2 = a2 / NA2 * Math.PI, ph = b2 / NB2 * 2 * Math.PI; P.push(c[0] + bl.r * Math.sin(th2) * Math.cos(ph), c[1] + bl.r * bl.sy * Math.cos(th2), c[2] + bl.r * Math.sin(th2) * Math.sin(ph)); }
        for (a2 = 0; a2 < NA2; a2++) for (b2 = 0; b2 < NB2; b2++) { var q0 = base + a2 * (NB2 + 1) + b2, q1 = q0 + NB2 + 1; I.push(q0, q1, q0 + 1, q1, q1 + 1, q0 + 1); }
      });
      flush();
    }
    if (B.body) B.body.parts.forEach(buildPart);
    function setBody(on) {
      showBody = !!on; body.forEach(function (m) { m.visible = showBody; });
      var cb = el('#bodyOn'); if (cb) cb.checked = showBody;
      center = showBody ? bodyCenter : brainCenter; cam.r = showBody ? 1000 : 310; render();
    }
    var byHemi = {}; cortex.forEach(function (m) { byHemi[m.hemi] = m; });
    // จุดศูนย์กลาง
    var mn = [1e9, 1e9, 1e9], mx = [-1e9, -1e9, -1e9];
    cortex.forEach(function (m) { for (var k = 0; k < m.pos.length; k += 3) for (var d = 0; d < 3; d++) { var v = m.pos[k + d]; if (v < mn[d]) mn[d] = v; if (v > mx[d]) mx[d] = v; } });
    var center = [(mn[0] + mx[0]) / 2, (mn[1] + mx[1]) / 2, (mn[2] + mx[2]) / 2], brainCenter = center.slice();
    var bodyCenter = B.body ? [0, (mx[1] + toR(B.body.bottom)[1]) / 2, center[2] + 10] : center;
    // ---- กล้อง ----
    var cam = { az: -Math.PI / 2, el: 0.1, r: 310, fov: 32 * Math.PI / 180 }, opacity = 1;
    function eye() { return [center[0] + cam.r * Math.cos(cam.el) * Math.sin(cam.az), center[1] + cam.r * Math.sin(cam.el), center[2] + cam.r * Math.cos(cam.el) * Math.cos(cam.az)]; }
    function sub3(a, b) { return [a[0] - b[0], a[1] - b[1], a[2] - b[2]]; }
    function cross(a, b) { return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]; }
    function norm(a) { var l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; }
    function dot(a, b) { return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]; }
    function basis() { var e = eye(), f = norm(sub3(center, e)), r = norm(cross(f, [0, 1, 0])), u = cross(r, f); return { e: e, f: f, r: r, u: u }; }
    function viewProj() {
      var k = basis(), asp = canvas.width / canvas.height || 1, t = 1 / Math.tan(cam.fov / 2), near = 10, far = 4000;
      var V = [k.r[0], k.u[0], -k.f[0], 0, k.r[1], k.u[1], -k.f[1], 0, k.r[2], k.u[2], -k.f[2], 0, -dot(k.r, k.e), -dot(k.u, k.e), dot(k.f, k.e), 1];
      var P = [t / asp, 0, 0, 0, 0, t, 0, 0, 0, 0, (far + near) / (near - far), -1, 0, 0, 2 * far * near / (near - far), 0];
      var M = new Float32Array(16);
      for (var c = 0; c < 4; c++) for (var r = 0; r < 4; r++) { var s = 0; for (var q = 0; q < 4; q++) s += P[q * 4 + r] * V[c * 4 + q]; M[c * 4 + r] = s; }
      return { M: M, k: k };
    }
    // ---- วาด ----
    var pending = false;
    function render() { if (pending) return; pending = true; requestAnimationFrame(draw); }
    function drawMesh(m, alpha) {
      gl.bindBuffer(gl.ARRAY_BUFFER, m.bp); gl.vertexAttribPointer(L.p, 3, gl.FLOAT, false, 0, 0);
      gl.bindBuffer(gl.ARRAY_BUFFER, m.bn); gl.vertexAttribPointer(L.n, 3, gl.FLOAT, false, 0, 0);
      gl.bindBuffer(gl.ARRAY_BUFFER, m.bc); gl.vertexAttribPointer(L.c, 3, gl.FLOAT, false, 0, 0);
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, m.bi);
      gl.uniform3fv(U.off, m.off); gl.uniform1f(U.a, alpha); gl.uniform1f(U.em, m.em);
      gl.drawElements(gl.TRIANGLES, m.idx.length, m.itype, 0);
    }
    function draw() {
      pending = false;
      var w = canvas.width, h = canvas.height;
      gl.viewport(0, 0, w, h); gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
      gl.enable(gl.DEPTH_TEST); gl.disable(gl.CULL_FACE);
      [L.p, L.n, L.c].forEach(function (x) { gl.enableVertexAttribArray(x); });
      var vp = viewProj(), k = vp.k, ld = norm([-k.f[0] + k.u[0] * 0.5 - k.r[0] * 0.4, -k.f[1] + k.u[1] * 0.5 - k.r[1] * 0.4, -k.f[2] + k.u[2] * 0.5 - k.r[2] * 0.4]);
      gl.uniformMatrix4fv(U.vp, false, vp.M); gl.uniform3fv(U.ld, ld);
      gl.disable(gl.BLEND); gl.depthMask(true);
      subs.forEach(function (m) { if (m.visible) drawMesh(m, 1); });
      if (opacity >= 0.98) { cortex.forEach(function (m) { if (m.visible) drawMesh(m, 1); }); }
      else { gl.enable(gl.BLEND); gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA); gl.depthMask(false); cortex.forEach(function (m) { if (m.visible) drawMesh(m, opacity); }); gl.depthMask(true); }
    }
    function resize() {
      var dpr = Math.min(window.devicePixelRatio || 1, 2), w = host.clientWidth, h = host.clientHeight || Math.round(w * 0.75);
      canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr); canvas.style.width = w + 'px'; canvas.style.height = h + 'px'; render();
    }
    // ---- สี ----
    var hl = null;
    function regionColor(rid) {
      if (!rid) return GRAY;
      var base = hexToRgb((REG[rid] && REG[rid].color) || '#888888');
      if (!hl) return mix(base, GRAY, 0.25);
      if (hl.set[rid]) return hexToRgb(hl.set[rid]);
      return mix(GRAY, [0.12, 0.14, 0.25], 0.35);
    }
    function paint() {
      all.forEach(function (m) {
        var c = m.col;
        if (m.cortex) { for (var k = 0; k < m.nv; k++) { var rgb = regionColor(m.regIds[k]); c[k * 3] = rgb[0]; c[k * 3 + 1] = rgb[1]; c[k * 3 + 2] = rgb[2]; } }
        else { var rgb2 = regionColor(m.region); for (var j = 0; j < m.nv; j++) { c[j * 3] = rgb2[0]; c[j * 3 + 1] = rgb2[1]; c[j * 3 + 2] = rgb2[2]; } m.em = hl && hl.set[m.region] && m.marker ? 0.5 : 0; }
        gl.bindBuffer(gl.ARRAY_BUFFER, m.bc); gl.bufferData(gl.ARRAY_BUFFER, c, gl.DYNAMIC_DRAW);
      });
      el('#v3d-legend').innerHTML = hl ? '<b>' + esc(hl.label) + '</b> · ' + Object.keys(hl.set).map(function (r) { return '<span class="dotc" style="background:' + hl.set[r] + '"></span>' + esc(REG[r] ? REG[r].th : r); }).join(' ') + ' <button class="chip sm" type="button" id="v3d-clear">ล้างไฮไลต์</button>' : 'สีตามบริเวณ · คลิกบนสมองหรือเลือกจากรายการเพื่ออ่านรายละเอียด';
      var cb = el('#v3d-clear'); if (cb) cb.onclick = function () { highlight(null); };
      render();
    }
    function setOpacity(v) { opacity = v; render(); }
    function highlight(regions, label, colors) {
      if (!regions) { hl = null; paint(); return; }
      var set = {};
      regions.forEach(function (r, i) { set[r] = (colors && colors[i]) || (REG[r] && REG[r].color) || '#ffd84a'; });
      hl = { set: set, label: label || '' };
      if (!showBody && regions.some(function (r) { return REG[r] && REG[r].body; })) setBody(true);
      var deep = regions.some(function (r) { return subs.some(function (m) { return m.region === r && !m.body; }); });
      if (deep && +el('#v3d-op').value > 0.55) { el('#v3d-op').value = 0.35; setOpacity(0.35); }
      paint();
    }
    // ---- คลิกเลือกบริเวณ (ยิงรังสีหาสามเหลี่ยม) ----
    function pick(cx, cy) {
      var rc = canvas.getBoundingClientRect(), x = ((cx - rc.left) / rc.width) * 2 - 1, y = -(((cy - rc.top) / rc.height) * 2 - 1);
      var k = basis(), t = Math.tan(cam.fov / 2), asp = rc.width / rc.height;
      var d = norm([k.f[0] + k.r[0] * x * t * asp + k.u[0] * y * t, k.f[1] + k.r[1] * x * t * asp + k.u[1] * y * t, k.f[2] + k.r[2] * x * t * asp + k.u[2] * y * t]);
      var hits = [];
      all.forEach(function (m) {
        if (!m.visible) return;
        var o = sub3(k.e, m.off), P = m.pos, I = m.idx, best = Infinity, face = -1;
        for (var q = 0; q < I.length; q += 3) {
          var a = I[q] * 3, b = I[q + 1] * 3, c = I[q + 2] * 3;
          var e1x = P[b] - P[a], e1y = P[b + 1] - P[a + 1], e1z = P[b + 2] - P[a + 2], e2x = P[c] - P[a], e2y = P[c + 1] - P[a + 1], e2z = P[c + 2] - P[a + 2];
          var px = d[1] * e2z - d[2] * e2y, py = d[2] * e2x - d[0] * e2z, pz = d[0] * e2y - d[1] * e2x, det = e1x * px + e1y * py + e1z * pz;
          if (Math.abs(det) < 1e-9) continue;
          var inv = 1 / det, tx = o[0] - P[a], ty = o[1] - P[a + 1], tz = o[2] - P[a + 2], u = (tx * px + ty * py + tz * pz) * inv;
          if (u < 0 || u > 1) continue;
          var qx = ty * e1z - tz * e1y, qy = tz * e1x - tx * e1z, qz = tx * e1y - ty * e1x, v = (d[0] * qx + d[1] * qy + d[2] * qz) * inv;
          if (v < 0 || u + v > 1) continue;
          var dist = (e2x * qx + e2y * qy + e2z * qz) * inv;
          if (dist > 0 && dist < best) { best = dist; face = q; }
        }
        if (face >= 0) hits.push({ m: m, t: best, rid: m.cortex ? (m.regIds[I[face]] || m.regIds[I[face + 1]] || m.regIds[I[face + 2]]) : m.region });
      });
      hits.sort(function (p, q) { return p.t - q.t; });
      if (opacity < 0.6) { var inner = hits.filter(function (h) { return !h.m.cortex; }); if (inner.length) hits = inner; }
      for (var j = 0; j < hits.length; j++) if (hits[j].rid && REG[hits[j].rid]) { showRegion(hits[j].rid, hits[j].m.hemi); return; }
    }
    // ---- การควบคุม: ลากหมุน ล้อ/ถ่างนิ้วซูม ----
    var ptrs = {}, down = null, pinch = 0;
    canvas.addEventListener('pointerdown', function (e) { canvas.setPointerCapture(e.pointerId); ptrs[e.pointerId] = [e.clientX, e.clientY]; down = [e.clientX, e.clientY, Date.now()]; pinch = 0; });
    canvas.addEventListener('pointermove', function (e) {
      var p = ptrs[e.pointerId]; if (!p) return;
      var ids = Object.keys(ptrs);
      if (ids.length === 2) {
        ptrs[e.pointerId] = [e.clientX, e.clientY];
        var a = ptrs[ids[0]], b = ptrs[ids[1]], dd = Math.hypot(a[0] - b[0], a[1] - b[1]);
        if (pinch) { cam.r = Math.max(120, Math.min(1500, cam.r * pinch / dd)); render(); }
        pinch = dd; down = null; return;
      }
      cam.az -= (e.clientX - p[0]) * 0.008; cam.el = Math.max(-1.55, Math.min(1.55, cam.el + (e.clientY - p[1]) * 0.008));
      ptrs[e.pointerId] = [e.clientX, e.clientY]; render();
    });
    function up(e) {
      if (down && Math.abs(e.clientX - down[0]) + Math.abs(e.clientY - down[1]) < 6) pick(e.clientX, e.clientY);
      delete ptrs[e.pointerId]; down = null;
    }
    canvas.addEventListener('pointerup', up);
    canvas.addEventListener('pointercancel', function (e) { delete ptrs[e.pointerId]; down = null; });
    canvas.addEventListener('wheel', function (e) { e.preventDefault(); cam.r = Math.max(120, Math.min(1500, cam.r * Math.exp(e.deltaY * 0.001))); render(); }, { passive: false });
    var VIEWS = { left: [-1, 0.1, 0], right: [1, 0.1, 0], top: [0, 1, 0.001], bottom: [0, -1, 0.001], front: [0, 0.05, -1], back: [0, 0.1, 1], medial: [1, 0.05, 0] };
    function view(name) {
      var dv = norm(VIEWS[name] || VIEWS.left);
      cam.el = Math.max(-1.55, Math.min(1.55, Math.asin(dv[1]))); cam.az = Math.atan2(dv[0], dv[2]); cam.r = showBody ? 1000 : 310;
      if (name === 'medial') { if (byHemi.R) byHemi.R.visible = false; el('#hideR').checked = true; if (byHemi.L) byHemi.L.visible = true; el('#hideL').checked = false; }
      render();
    }
    el('#v3d-op').addEventListener('input', function () { setOpacity(+this.value); });
    if (el('#bodyOn')) el('#bodyOn').addEventListener('change', function () { setBody(this.checked); });
    el('#hideL').addEventListener('change', function () { if (byHemi.L) byHemi.L.visible = !this.checked; render(); });
    el('#hideR').addEventListener('change', function () { if (byHemi.R) byHemi.R.visible = !this.checked; render(); });
    els('[data-view]').forEach(function (b) { b.addEventListener('click', function () { view(b.getAttribute('data-view')); }); });
    el('#v3d-reset').addEventListener('click', function () { cortex.forEach(function (m) { m.visible = true; }); el('#hideL').checked = el('#hideR').checked = false; el('#v3d-op').value = 1; setOpacity(1); highlight(null); setBody(false); view('left'); });
    canvas.addEventListener('webglcontextlost', function (e) { e.preventDefault(); msg.hidden = false; msg.textContent = 'ภาพ 3 มิติหยุดทำงาน (หน่วยความจำกราฟิกไม่พอ) รีเฟรชหน้าเพื่อเปิดใหม่'; });
    if (window.ResizeObserver) new ResizeObserver(resize).observe(host); else window.addEventListener('resize', resize);
    msg.hidden = true;
    V = { ok: true, highlight: highlight, setBody: setBody };
    resize(); view('left'); paint();
    if (pendingHL) { highlight(pendingHL[0], pendingHL[1], pendingHL[2]); pendingHL = null; }
  }

  // ================= แผงข้อมูลบริเวณ =================
  function showRegion(id, hemi) {
    var r = REG[id]; if (!r) return;
    var inTopics = B.topics.filter(function (t) { return t.regions.indexOf(id) > -1; });
    var inNt = B.nts.filter(function (n) { return n.src.indexOf(id) > -1 || n.targets.indexOf(id) > -1; });
    var inNet = B.networks.filter(function (n) { return n.regions.indexOf(id) > -1; });
    var inEmo = (B.emotions || []).filter(function (e) { return e.regions.indexOf(id) > -1; });
    el('#rinfo').innerHTML =
      '<p class="eyebrow">' + esc(r.lobe) + (hemi ? ' · ซีก' + (hemi === 'L' ? 'ซ้าย' : 'ขวา') : '') + (r.approx ? ' · ตำแหน่งโดยประมาณ' : '') + '</p>' +
      '<h3 class="h3">' + esc(r.th) + '</h3><p class="muted small">' + esc(r.en) + '</p>' +
      '<div class="rsec"><h4>หน้าที่</h4>' + ul(r.func) + '</div>' +
      '<div class="rsec"><h4>เกี่ยวกับการคิด</h4><p>' + esc(r.think) + '</p></div>' +
      '<div class="rsec"><h4>การเชื่อมต่อ</h4><p>' + esc(r.conn) + '</p></div>' +
      '<div class="rsec"><h4>ทางคลินิก</h4>' + ul(r.clinic) + '</div>' +
      '<div class="rsec"><h4>การประเมิน</h4><p>' + esc(r.exam) + '</p></div>' +
      (inNet.length ? '<div class="rsec"><h4>อยู่ในเครือข่าย</h4><div class="chips">' + inNet.map(function (n) { return '<button class="chip sm" type="button" data-net="' + n.id + '">' + esc(n.th) + '</button>'; }).join('') + '</div></div>' : '') +
      (inTopics.length ? '<div class="rsec"><h4>หัวข้อการคิดที่เกี่ยวข้อง</h4><div class="chips">' + inTopics.map(function (t) { return '<button class="chip sm" type="button" data-topic="' + t.id + '">' + esc(t.th) + '</button>'; }).join('') + '</div></div>' : '') +
      (inEmo.length ? '<div class="rsec"><h4>อารมณ์ที่เกี่ยวข้อง</h4><div class="chips">' + inEmo.map(function (e) { return '<button class="chip sm" type="button" data-emo="' + e.id + '">' + esc(e.th) + '</button>'; }).join('') + '</div></div>' : '') +
      (inNt.length ? '<div class="rsec"><h4>สารเคมีในสมอง</h4><div class="chips">' + inNt.map(function (n) { return '<button class="chip sm" type="button" data-nt="' + n.id + '">' + esc(n.th) + (n.src.indexOf(id) > -1 ? ' (แหล่งกำเนิด)' : '') + '</button>'; }).join('') + '</div></div>' : '');
    els('.rchip').forEach(function (c) { c.setAttribute('aria-pressed', c.getAttribute('data-r') === id ? 'true' : 'false'); });
    if (V.ok && (!V.cur || V.cur !== id)) { V.cur = id; V.highlight([id], r.th); }
  }

  // ================= ตัวเลือกแบบหน้า (ทีละหัวข้อ) =================
  function pager(boxSel, items, labelFn, renderFn, startId) {
    var box = el(boxSel), i = 0;
    box.innerHTML = '<div class="chips pagechips">' + items.map(function (it, k) { return '<button class="chip" type="button" data-k="' + k + '">' + esc(labelFn(it, k)) + '</button>'; }).join('') + '</div><div class="pagebody"></div><div class="pn"><button class="btn ghost sm" type="button" data-step="-1">← ก่อนหน้า</button><span class="muted small pagecount"></span><button class="btn ghost sm" type="button" data-step="1">ถัดไป →</button></div>';
    function go(k) {
      i = (k + items.length) % items.length;
      els('.pagechips .chip', box).forEach(function (c) { c.setAttribute('aria-pressed', c.getAttribute('data-k') === String(i) ? 'true' : 'false'); });
      el('.pagebody', box).innerHTML = renderFn(items[i]);
      el('.pagecount', box).textContent = (i + 1) + ' / ' + items.length;
    }
    box.addEventListener('click', function (e) {
      var c = e.target.closest('[data-k]'); if (c && box.contains(c) && c.closest('.pagechips')) { go(+c.getAttribute('data-k')); return; }
      var s = e.target.closest('[data-step]'); if (s) { go(i + +s.getAttribute('data-step')); box.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
    });
    var st = 0; if (startId) items.forEach(function (it, k) { if (it.id === startId) st = k; });
    go(st);
    return { go: function (id) { items.forEach(function (it, k) { if (it.id === id) go(k); }); } };
  }
  function regionChips(ids) { return '<div class="chips">' + ids.map(function (r) { return REG[r] ? '<button class="chip sm" type="button" data-reg="' + r + '">' + esc(REG[r].th) + '</button>' : ''; }).join('') + '</div>'; }

  function renderTopic(t) {
    return '<h3 class="h3">' + esc(t.th) + '</h3><p class="muted small">' + esc(t.en) + '</p>' +
      '<div class="rsec"><h4>แก่น</h4>' + ul(t.core) + '</div>' +
      '<div class="pgrid">' +
      '<div class="pcell"><h3>กลไกในสมอง</h3><p>' + esc(t.brain) + '</p></div>' +
      '<div class="pcell"><h3>สารสื่อประสาท</h3><p>' + esc(t.chem) + '</p></div>' +
      '<div class="pcell"><h3>ทางคลินิก</h3><p>' + esc(t.clinic) + '</p></div>' +
      '<div class="pcell"><h3>การประเมิน</h3><p>' + esc(t.assess) + '</p></div>' +
      '<div class="pcell wide"><h3>เชื่อมกับหลักคำสอน</h3><ul>' + t.teach.map(function (x) { return '<li><a href="sage.html#' + x[0] + '">' + esc(sageName(x[0])) + '</a>: ' + esc(x[1]) + '</li>'; }).join('') + '</ul></div>' +
      '</div><div class="rsec"><h4>บริเวณที่เกี่ยวข้อง</h4>' + regionChips(t.regions) + '</div>' +
      '<div class="btnrow"><button class="btn" type="button" data-show="' + t.regions.join(',') + '" data-label="' + esc(t.th) + '">ดูบริเวณในแบบจำลอง 3 มิติ</button></div>';
  }
  function renderNet(n) {
    return '<h3 class="h3">' + esc(n.th) + '</h3><p class="muted small">' + esc(n.en) + '</p><p>' + esc(n.desc) + '</p><p class="note">' + esc(n.clinic) + '</p>' +
      '<div class="rsec"><h4>บริเวณหลัก</h4>' + regionChips(n.regions) + '</div><div class="btnrow"><button class="btn" type="button" data-show="' + n.regions.join(',') + '" data-label="' + esc(n.th) + '" data-col="' + n.color + '">ดูเครือข่ายในแบบจำลอง 3 มิติ</button></div>';
  }
  function renderNt(n) {
    return '<h3 class="h3">' + esc(n.th) + '</h3><p class="muted small">' + esc(n.en) + '</p>' +
      '<div class="pgrid"><div class="pcell"><h3>การสร้าง</h3><p>' + esc(n.synth) + '</p></div><div class="pcell"><h3>การหยุดฤทธิ์</h3><p>' + esc(n.inact) + '</p></div>' +
      '<div class="pcell wide"><h3>ตัวรับ</h3><p>' + esc(n.receptors) + '</p></div></div>' +
      (n.paths && n.paths.length ? '<div class="rsec"><h4>ทางเดิน</h4><div class="tablewrap"><table class="tbl"><thead><tr><th>ทาง</th><th>จาก → ไป</th><th>หน้าที่และความสำคัญทางคลินิก</th></tr></thead><tbody>' + n.paths.map(function (p) { return '<tr><td>' + esc(p[0]) + '</td><td>' + esc(p[1]) + '</td><td>' + esc(p[2]) + '</td></tr>'; }).join('') + '</tbody></table></div></div>' : '') +
      '<div class="rsec"><h4>บทบาทต่อการคิด</h4><p>' + esc(n.cognition) + '</p></div>' +
      (n.emo ? '<div class="rsec"><h4>บทบาทต่ออารมณ์</h4><p>' + esc(n.emo) + '</p></div>' : '') +
      (n.caveat ? '<p class="caveat">' + esc(n.caveat) + '</p>' : '') +
      (emoOf(n.id).length ? '<div class="rsec"><h4>อารมณ์ที่เกี่ยวข้อง</h4><div class="chips">' + emoOf(n.id).map(function (e) { return '<button class="chip sm" type="button" data-emo="' + e.id + '">' + esc(e.th) + '</button>'; }).join('') + '</div></div>' : '') +
      '<div class="pgrid"><div class="pcell"><h3>ภาวะที่เกี่ยวข้อง</h3>' + ul(n.clinic) + '</div><div class="pcell"><h3>ยาที่ออกฤทธิ์ต่อระบบนี้</h3><p>' + esc(n.drugs) + '</p></div></div>' +
      (n.src.length || n.targets.length ? '<div class="btnrow"><button class="btn" type="button" data-nt-show="' + n.id + '">' + (n.src.length ? 'ดูแหล่งกำเนิดและเป้าหมายในแบบจำลอง' : 'ดูบริเวณเป้าหมายในแบบจำลอง') + '</button></div>' : '') +
      (n.src.length ? '' : '<p class="muted small">สร้างนอกสมองหรือสร้างทั่วไปในเซลล์ประสาท จึงไม่มีแหล่งกำเนิดเฉพาะในแบบจำลอง</p>');
  }
  function emoOf(ntId) { return (B.emotions || []).filter(function (e) { return (e.chemIds || []).indexOf(ntId) > -1; }); }
  function ntName(id) { var n = B.nts.filter(function (x) { return x.id === id; })[0]; return n ? n.th : id; }
  function renderEmo(e) {
    function cell(h, t, wide) { return t ? '<div class="pcell' + (wide ? ' wide' : '') + '"><h3>' + h + '</h3><p>' + esc(t) + '</p></div>' : ''; }
    return '<h3 class="h3">' + esc(e.th) + '</h3><p class="muted small">' + esc(e.en) + ' <span class="tag">' + esc(e.g) + '</span></p>' +
      '<div class="pgrid">' + cell('หน้าที่ทางวิวัฒนาการ', e.fn) + cell('สิ่งที่กระตุ้น (การประเมิน)', e.appr) + cell('วงจรในสมอง', e.brain, true) +
      '<div class="pcell wide"><h3>สารเคมีที่เกี่ยวข้อง</h3><p>' + esc(e.chem) + '</p>' + (e.chemIds && e.chemIds.length ? '<div class="chips">' + e.chemIds.map(function (c) { return '<button class="chip sm" type="button" data-nt="' + c + '">' + esc(ntName(c)) + '</button>'; }).join('') + '</div>' : '') + '</div>' +
      cell('ร่างกายและสีหน้า', e.body) + cell('ผลต่อการคิด', e.think) + cell('ทางคลินิก', e.clinic, true) + cell('การกำกับอารมณ์', e.reg, true) + '</div>' +
      (e.caveat ? '<p class="caveat">' + esc(e.caveat) + '</p>' : '') +
      (e.teach && e.teach.length ? '<div class="rsec"><h4>เชื่อมกับหลักคำสอน</h4><ul>' + e.teach.map(function (x) { return '<li><a href="sage.html#' + x[0] + '">' + esc(sageName(x[0])) + '</a>: ' + esc(x[1]) + '</li>'; }).join('') + '</ul></div>' : '') +
      '<div class="rsec"><h4>บริเวณที่เกี่ยวข้อง</h4>' + regionChips(e.regions) + '</div>' +
      '<div class="btnrow"><button class="btn" type="button" data-show="' + e.regions.join(',') + '" data-label="' + esc(e.th) + '">ดูวงจรของอารมณ์นี้ในแบบจำลอง 3 มิติ</button></div>';
  }
  // ตัวเลือกแบบหน้าที่กรองตามกลุ่มได้
  function groupedPager(filterSel, boxSel, all, groupOf, labelFn, renderFn, groups) {
    var cur = 'ทั้งหมด', pg = null, fbox = el(filterSel);
    var gs = ['ทั้งหมด'].concat(groups || all.map(groupOf).filter(function (g, i, a) { return g && a.indexOf(g) === i; }));
    function draw(goId) {
      fbox.innerHTML = gs.map(function (g) { var n = g === 'ทั้งหมด' ? all.length : all.filter(function (x) { return groupOf(x) === g; }).length; return n ? '<button class="chip sm" type="button" data-grp="' + esc(g) + '" aria-pressed="' + (g === cur) + '">' + esc(g) + ' <span class="cnt">' + n + '</span></button>' : ''; }).join('');
      var items = all.filter(function (x) { return cur === 'ทั้งหมด' || groupOf(x) === cur; });
      var box = el(boxSel), fresh = box.cloneNode(false); box.parentNode.replaceChild(fresh, box);
      pg = pager(boxSel, items, labelFn, renderFn, goId);
    }
    fbox.addEventListener('click', function (e) { var b = e.target.closest('[data-grp]'); if (b) { cur = b.getAttribute('data-grp'); draw(); } });
    draw();
    return { go: function (id) { var it = all.filter(function (x) { return x.id === id; })[0]; if (!it) return; if (cur !== 'ทั้งหมด' && groupOf(it) !== cur) { cur = 'ทั้งหมด'; draw(id); } else pg.go(id); } };
  }
  function renderDis(d) {
    return '<h3 class="h3">' + esc(d.th) + '</h3><p class="muted small">' + esc(d.en) + '</p><div class="pgrid">' +
      '<div class="pcell wide"><h3>การคิดเปลี่ยนไปอย่างไร</h3><p>' + esc(d.think) + '</p></div>' +
      '<div class="pcell"><h3>กลไกทางสมอง</h3><p>' + esc(d.neuro) + '</p></div>' +
      '<div class="pcell"><h3>เกณฑ์โดยย่อ</h3><p>' + esc(d.criteria) + '</p></div>' +
      '<div class="pcell wide"><h3>แนวการดูแล</h3><p>' + esc(d.care) + '</p></div></div>';
  }

  var pendingHL = null;
  function hlOrQueue(ids, label, cols) { if (V.ok) V.highlight(ids, label, cols); else pendingHL = [ids, label, cols]; }
  function goZone(id) { if (window.JCTZone && window.JCTZone.show(id, { toTop: true })) return; el('#' + id).scrollIntoView({ behavior: 'smooth', block: 'start' }); }
  function init() {
    // รายการบริเวณ (ใช้ได้แม้ไม่มี 3 มิติ)
    var lobes = {};
    Object.keys(REG).forEach(function (k) { (lobes[REG[k].lobe] = lobes[REG[k].lobe] || []).push(k); });
    el('#rlist').innerHTML = Object.keys(lobes).map(function (l) { return '<div class="rgroup"><span class="eyebrow">' + esc(l) + '</span><div class="chips">' + lobes[l].map(function (k) { return '<button class="chip sm rchip" type="button" data-r="' + k + '">' + esc(REG[k].th) + '</button>'; }).join('') + '</div></div>'; }).join('');
    el('#rlist').addEventListener('click', function (e) { var c = e.target.closest('.rchip'); if (c) showRegion(c.getAttribute('data-r')); });
    var topics = pager('#topicbox', B.topics, function (t, k) { return (k + 1) + '. ' + t.th.split(':')[0]; }, renderTopic);
    var nets = pager('#netbox', B.networks, function (n) { return n.th; }, renderNet);
    var nts = groupedPager('#ntfilter', '#ntbox', B.nts, function (n) { return n.group; }, function (n) { return n.th; }, renderNt, B.ntGroups);
    var emos = B.emotions ? groupedPager('#emofilter', '#emobox', B.emotions, function (e) { return e.g; }, function (e) { return e.th; }, renderEmo) : null;
    if (B.emoTheory && el('#emotheorybox')) el('#emotheorybox').innerHTML = B.emoTheory.map(function (t) { return '<div class="rsec"><h4>' + esc(t[0]) + '</h4><p>' + esc(t[1]) + '</p></div>'; }).join('');
    pager('#disbox', B.disorders, function (d) { return d.th; }, renderDis);
    el('#mse').innerHTML = '<p>' + esc(B.mse.intro) + '</p><div class="pgrid"><div class="pcell"><h3>รูปแบบของความคิด (thought process)</h3><ul>' + B.mse.process.map(function (x) { return '<li><b>' + esc(x[0]) + '</b> — ' + esc(x[1]) + '</li>'; }).join('') + '</ul></div><div class="pcell"><h3>เนื้อหาของความคิด (thought content)</h3><ul>' + B.mse.content.map(function (x) { return '<li><b>' + esc(x[0]) + '</b> — ' + esc(x[1]) + '</li>'; }).join('') + '</ul></div></div>';
    // ปุ่มเชื่อมเนื้อหากับแบบจำลอง
    document.addEventListener('click', function (e) {
      var s = e.target.closest('[data-show]');
      if (s) { var ids = s.getAttribute('data-show').split(','), col = s.getAttribute('data-col'); hlOrQueue(ids, s.getAttribute('data-label'), col ? ids.map(function () { return col; }) : null); goZone('map'); return; }
      var n = e.target.closest('[data-nt-show]');
      if (n) { var nt = B.nts.filter(function (x) { return x.id === n.getAttribute('data-nt-show'); })[0]; var ids2 = nt.src.concat(nt.targets); hlOrQueue(ids2, nt.th + (nt.src.length ? ' · แหล่งกำเนิดสีเข้ม เป้าหมายสีอ่อน' : ' · บริเวณเป้าหมาย'), ids2.map(function (r, i) { return i < nt.src.length ? nt.color : '#cfe6fb'; })); goZone('map'); return; }
      var r = e.target.closest('[data-reg]'); if (r) { showRegion(r.getAttribute('data-reg')); goZone('map'); return; }
      var t = e.target.closest('[data-topic]'); if (t) { topics.go(t.getAttribute('data-topic')); goZone('think'); return; }
      var nn = e.target.closest('[data-net]'); if (nn) { nets.go(nn.getAttribute('data-net')); goZone('nets'); return; }
      var em = e.target.closest('[data-emo]'); if (em && emos) { emos.go(em.getAttribute('data-emo')); goZone('emo'); return; }
      var x = e.target.closest('[data-nt]'); if (x) { nts.go(x.getAttribute('data-nt')); goZone('nts'); }
    });
    // โหลดแบบจำลองเมื่อเลื่อนมาใกล้ (ไม่ถ่วงหน้า)
    var started = false;
    function start() { if (started) return; started = true; try { initViewer(); } catch (err) { el('#v3d-msg').textContent = 'แสดงแบบจำลองไม่ได้: ' + err.message; } showRegion('dlpfc'); }
    if ('IntersectionObserver' in window) { var io = new IntersectionObserver(function (en) { if (en.some(function (x) { return x.isIntersecting; })) { io.disconnect(); start(); } }, { rootMargin: '200px' }); io.observe(el('#v3d')); } else start();
  }
  init();
})();
