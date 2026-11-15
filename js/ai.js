/* เจตจำนงของความคิด — เชื่อม AI ได้หลายผู้ให้บริการ (ไม่มี backend)
   กุญแจเก็บใน localStorage คีย์ jct:v1:cfg เท่านั้น ไม่อยู่ในไฟล์สำรอง และส่งตรงไปที่ผู้ให้บริการที่เลือกเท่านั้น
   cfg = { p: 'anthropic', keys: {p: key}, models: {p: model}, base: 'http://…/v1' } (รุ่นเก่า {key, model} = Claude) */
(function () {
  'use strict';
  var CFG = 'jct:v1:cfg';
  var P = {
    anthropic: {
      name: 'Claude', by: 'Anthropic', host: 'api.anthropic.com', kind: 'anthropic',
      url: 'https://api.anthropic.com/v1/messages', model: 'claude-sonnet-5-5',
      models: ['claude-sonnet-5-5', 'claude-opus-5-5', 'claude-haiku-5-5'],
      keyPh: 'sk-ant-…', hint: 'รับกุญแจได้ที่ console.anthropic.com'
    },
    openai: {
      name: 'ChatGPT', by: 'OpenAI', host: 'api.openai.com', kind: 'openai',
      url: 'https://api.openai.com/v1/chat/completions', model: 'chat-latest',
      models: ['chat-latest', 'gpt-5.5'],
      keyPh: 'sk-…', hint: 'รับกุญแจได้ที่ platform.openai.com · ถ้าเบราว์เซอร์ถูกปิดกั้น (CORS) ให้ใช้ OpenRouter แทน ซึ่งเรียกโมเดล GPT ได้เหมือนกัน'
    },
    gemini: {
      name: 'Gemini', by: 'Google', host: 'generativelanguage.googleapis.com', kind: 'gemini',
      url: 'https://generativelanguage.googleapis.com/v1beta/models/', model: 'gemini-flash-latest',
      models: ['gemini-flash-latest', 'gemini-flash-lite-latest'],
      keyPh: 'AIza…', hint: 'รับกุญแจได้ที่ aistudio.google.com (มีโควตาใช้ฟรี)'
    },
    openrouter: {
      name: 'OpenRouter', by: 'รวมทุกค่าย', host: 'openrouter.ai', kind: 'openai',
      url: 'https://openrouter.ai/api/v1/chat/completions', model: 'openrouter/auto',
      models: ['openrouter/auto'],
      keyPh: 'sk-or-…', hint: 'กุญแจเดียวใช้ได้หลายร้อยโมเดล ทั้ง Claude, GPT, Gemini, Llama, DeepSeek, Qwen และอื่น ๆ ดูชื่อโมเดลที่ openrouter.ai/models (เช่น รูปแบบ ค่าย/ชื่อโมเดล) · openrouter/auto เลือกโมเดลให้เอง'
    },
    custom: {
      name: 'อื่น ๆ', by: 'รูปแบบ OpenAI', host: '', kind: 'openai', url: '', model: '', models: [],
      keyPh: 'ไม่ต้องใส่ถ้าเป็นโมเดลบนเครื่อง', optionalKey: true,
      hint: 'ใช้ได้กับบริการใดก็ได้ที่มี /chat/completions แบบ OpenAI เช่น DeepSeek, Groq, Mistral, xAI (Grok), Together, Typhoon, หรือโมเดลบนเครื่องผ่าน Ollama / LM Studio / llama.cpp',
      bases: ['http://localhost:11434/v1', 'http://localhost:1234/v1', 'http://127.0.0.1:8080/v1', 'https://api.deepseek.com/v1', 'https://api.groq.com/openai/v1', 'https://api.mistral.ai/v1', 'https://api.x.ai/v1', 'https://api.together.xyz/v1', 'https://api.opentyphoon.ai/v1']
    }
  };
  var ORDER = ['anthropic', 'openai', 'gemini', 'openrouter', 'custom'];

  function read() {
    var c; try { c = JSON.parse(localStorage.getItem(CFG) || 'null'); } catch (e) { c = null; }
    c = c || {};
    if (c.key !== undefined || (c.model !== undefined && !c.p)) { // รุ่นเก่า: Claude อย่างเดียว
      c = { p: 'anthropic', keys: { anthropic: c.key || '' }, models: { anthropic: c.model || '' }, base: '' };
    }
    c.p = P[c.p] ? c.p : 'anthropic'; c.keys = c.keys || {}; c.models = c.models || {}; c.base = c.base || '';
    return c;
  }
  function write(c) {
    try {
      var empty = !Object.keys(c.keys).some(function (k) { return c.keys[k]; }) && !c.base;
      if (empty && !Object.keys(c.models).some(function (k) { return c.models[k]; })) localStorage.removeItem(CFG);
      else localStorage.setItem(CFG, JSON.stringify(c));
      return true;
    } catch (e) { return false; }
  }
  function cur() {
    var c = read(), p = P[c.p];
    return { id: c.p, p: p, key: (c.keys[c.p] || '').trim(), model: (c.models[c.p] || '').trim() || p.model, base: (c.base || '').trim().replace(/\/+$/, '') };
  }
  function ready() {
    var x = cur();
    if (x.id === 'custom') return !!(x.base && x.model);
    return !!x.key;
  }
  function label() { var x = cur(); return x.p.name + (x.id === 'custom' && x.base ? ' (' + hostOf(x.base) + ')' : '') + ' · ' + x.model; }
  function hostOf(u) { try { return new URL(u).host; } catch (e) { return u; } }

  function fail(r, j, host) {
    var why = { 400: 'คำขอไม่ถูกต้อง', 401: 'กุญแจ API ไม่ถูกต้อง ตรวจในหน้าตั้งค่า', 403: 'กุญแจนี้ไม่มีสิทธิ์ใช้งานโมเดลนี้', 404: 'ไม่พบโมเดลหรือที่อยู่นี้ ตรวจชื่อโมเดลในหน้าตั้งค่า', 429: 'เรียกถี่เกินไปหรือเครดิตหมด ลองใหม่ภายหลัง', 500: 'เซิร์ฟเวอร์ของผู้ให้บริการขัดข้อง', 503: 'ผู้ให้บริการไม่ว่างชั่วคราว', 529: 'ระบบกำลังหนาแน่น ลองใหม่อีกครั้ง' }[r.status] || ('เซิร์ฟเวอร์ตอบรหัส ' + r.status);
    var e = j && (j.error || (Array.isArray(j) && j[0] && j[0].error));
    var msg = e ? (typeof e === 'string' ? e : e.message) : '';
    return new Error(why + (msg ? ' (' + String(msg).slice(0, 200) + ')' : ''));
  }
  function post(url, headers, body, host, pick) {
    return fetch(url, { method: 'POST', headers: headers, body: JSON.stringify(body) }).then(function (r) {
      return r.json().catch(function () { return {}; }).then(function (j) {
        if (!r.ok) throw fail(r, j, host);
        var text = (pick(j) || '').replace(/<think>[\s\S]*?<\/think>/g, '').trim();
        if (!text) throw new Error('ไม่ได้รับข้อความตอบกลับ');
        return text;
      });
    }, function () {
      throw new Error(navigator.onLine === false ? 'ไม่มีการเชื่อมต่ออินเทอร์เน็ต' :
        'เชื่อมต่อ ' + host + ' ไม่ได้ ผู้ให้บริการบางรายไม่อนุญาตให้เว็บเบราว์เซอร์เรียกตรง (CORS) หรือเครือข่ายปิดกั้น ลองใช้ OpenRouter ซึ่งเรียกได้ทั้ง GPT, Gemini และ Claude ด้วยกุญแจเดียว' +
        (/localhost|127\.0\.0\.1/.test(host) ? ' · ถ้าเป็นโมเดลบนเครื่อง ต้องเปิดโปรแกรมไว้และอนุญาต CORS (เช่น Ollama ตั้ง OLLAMA_ORIGINS=*)' : ''));
    });
  }

  // system: ข้อความระบบ · messages: [{role:'user'|'assistant', content}]
  function call(system, messages, maxTokens) {
    var x = cur(), max = maxTokens || 1024;
    if (!ready()) return Promise.reject(new Error('ยังไม่ได้เชื่อม AI (ตั้งค่า → เชื่อม AI)'));
    if (x.p.kind === 'anthropic') {
      return post(x.p.url, { 'content-type': 'application/json', 'x-api-key': x.key, 'anthropic-version': '2023-06-01', 'anthropic-dangerous-direct-browser-access': 'true' },
        { model: x.model, max_tokens: max, system: system, messages: messages }, x.p.host,
        function (j) { return (j.content || []).map(function (b) { return b.type === 'text' ? b.text : ''; }).join(''); });
    }
    if (x.p.kind === 'gemini') {
      return post(x.p.url + encodeURIComponent(x.model) + ':generateContent', { 'content-type': 'application/json', 'x-goog-api-key': x.key },
        { systemInstruction: { parts: [{ text: system }] }, contents: messages.map(function (m) { return { role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.content }] }; }), generationConfig: { maxOutputTokens: Math.max(max, 2048) } },
        x.p.host, function (j) { var c = j.candidates && j.candidates[0]; return c && c.content && (c.content.parts || []).map(function (p) { return p.thought ? '' : (p.text || ''); }).join(''); });
    }
    var url = x.id === 'custom' ? x.base + '/chat/completions' : x.p.url;
    var h = { 'content-type': 'application/json' };
    if (x.key) h.authorization = 'Bearer ' + x.key;
    if (x.id === 'openrouter') h['X-Title'] = 'เจตจำนงของความคิด';
    var body = { model: x.model, messages: [{ role: 'system', content: system }].concat(messages) };
    if (x.id === 'openai') body.max_completion_tokens = Math.max(max, 1024); else body.max_tokens = max;
    return post(url, h, body, x.id === 'custom' ? hostOf(x.base) : x.p.host, function (j) { var c = j.choices && j.choices[0]; return c && c.message && (typeof c.message.content === 'string' ? c.message.content : (c.message.content || []).map(function (p) { return p.text || ''; }).join('')); });
  }

  window.JCTAI = { P: P, ORDER: ORDER, read: read, write: write, cur: cur, ready: ready, label: label, call: call };
})();
