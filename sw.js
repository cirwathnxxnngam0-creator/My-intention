/* ออฟไลน์ + อัปเดตแบบตรวจเอง
   - ไฟล์นี้ตั้งใจให้ "ไม่เปลี่ยน" ระหว่างรุ่น เบราว์เซอร์จึงไม่อัปเดตแอปเอง
   - รายชื่อไฟล์และเลขรุ่นอยู่ใน version.json (สร้างด้วย node release.mjs)
   - แอปเปลี่ยนรุ่นเมื่อผู้ใช้กด "อัปเดตเดี๋ยวนี้" ในหน้าตั้งค่าเท่านั้น (ส่งข้อความ UPDATE มาที่นี่) */
const PREFIX = 'jct-';

async function readManifest() {
  const r = await fetch('version.json?ts=' + Date.now(), { cache: 'no-store' });
  if (!r.ok) throw new Error('อ่าน version.json ไม่ได้ (รหัส ' + r.status + ')');
  const m = await r.json();
  if (!m.version || !Array.isArray(m.files)) throw new Error('version.json ไม่ครบ');
  return m;
}
// ดาวน์โหลดไฟล์ทั้งชุดลงแคชใหม่ ถ้าไฟล์ใดล้มเหลว จะไม่แตะแคชเดิมเลย
async function fillCache(m) {
  const name = PREFIX + m.version;
  const tmp = await caches.open(name + '-tmp');
  for (const f of m.files) {
    const res = await fetch(f, { cache: 'reload' });
    if (!res.ok) throw new Error('ดาวน์โหลด ' + f + ' ไม่ได้ (รหัส ' + res.status + ')');
    await tmp.put(f === './' ? './' : f, res);
  }
  const keys = await tmp.keys();
  const real = await caches.open(name);
  for (const k of keys) await real.put(k, await tmp.match(k));
  await caches.delete(name + '-tmp');
  for (const k of await caches.keys()) if (k.startsWith(PREFIX) && k !== name) await caches.delete(k);
  return name;
}

self.addEventListener('install', (e) => {
  e.waitUntil((async () => {
    const has = (await caches.keys()).some((k) => k.startsWith(PREFIX) && !k.endsWith('-tmp'));
    if (!has) await fillCache(await readManifest());
    await self.skipWaiting();
  })());
});
self.addEventListener('activate', (e) => { e.waitUntil(self.clients.claim()); });

self.addEventListener('message', (e) => {
  const port = e.ports && e.ports[0];
  if (!port || !e.data || e.data.type !== 'UPDATE') return;
  e.waitUntil((async () => {
    try {
      const m = await readManifest();
      await fillCache(m);
      port.postMessage({ type: 'UPDATED', version: m.version });
    } catch (err) {
      port.postMessage({ type: 'ERROR', error: String(err && err.message || err) });
    }
  })());
});

// เปิดจากแคชก่อนเสมอ (รุ่นที่ติดตั้งไว้) ถ้าไม่มีในแคชจึงไปเครือข่าย โดยไม่เก็บลงแคชเพิ่ม เพื่อไม่ให้รุ่นปนกัน
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;
  if (url.pathname.endsWith('/version.json')) return;
  e.respondWith((async () => {
    const hit = await caches.match(req, { ignoreSearch: true });
    if (hit) return hit;
    try { return await fetch(req); }
    catch (err) {
      if (req.mode === 'navigate') return (await caches.match('index.html')) || Response.error();
      return Response.error();
    }
  })());
});
