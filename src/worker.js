export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;

    if (path === '/api/upload' && request.method === 'POST') {
      return handleUpload(request, env);
    }
    if (path.startsWith('/api/get/') && request.method === 'POST') {
      return handleGet(path, request, env);
    }
    if (path.startsWith('/view/')) {
      return new Response(VIEW_HTML, { headers: { 'Content-Type': 'text/html;charset=utf-8' } });
    }
    return new Response(UPLOAD_HTML, { headers: { 'Content-Type': 'text/html;charset=utf-8' } });
  }
};

async function handleUpload(request, env) {
  try {
    const { encrypted, iv, salt, filename, type } = await request.json();
    const id = crypto.randomUUID();
    await env.STORE.put(id, JSON.stringify({ encrypted, iv, salt, filename, type }), { expirationTtl: 86400 });
    return Response.json({ id });
  } catch {
    return Response.json({ error: '上传失败' }, { status: 400 });
  }
}

async function handleGet(path, request, env) {
  const id = path.replace('/api/get/', '');
  const data = await env.STORE.get(id);
  if (!data) {
    return Response.json({ error: '内容不存在或已销毁' }, { status: 404 });
  }
  // 阅后即焚：取出后立即删除
  await env.STORE.delete(id);
  return new Response(data, { headers: { 'Content-Type': 'application/json' } });
}

// ===== 上传页面 =====
const UPLOAD_HTML = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>阅后即焚</title>
<style>
* { margin:0; padding:0; box-sizing:border-box; }
body { font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif; background:#0a0a0a; color:#e0e0e0; min-height:100vh; display:flex; align-items:center; justify-content:center; }
.container { max-width:480px; width:90%; padding:40px 30px; background:#1a1a1a; border-radius:16px; border:1px solid #333; }
h1 { text-align:center; font-size:28px; margin-bottom:8px; }
.subtitle { text-align:center; color:#888; margin-bottom:30px; font-size:14px; }
.upload-area { border:2px dashed #444; border-radius:12px; padding:40px 20px; text-align:center; cursor:pointer; transition:all .2s; margin-bottom:20px; }
.upload-area:hover,.upload-area.dragover { border-color:#ff6b35; background:#1f1a17; }
.upload-icon { font-size:48px; margin-bottom:10px; }
.upload-area p { color:#888; }
.upload-area img { max-width:100%; max-height:200px; border-radius:8px; margin-top:10px; }
.form-group { margin-bottom:20px; }
.form-group label { display:block; margin-bottom:6px; font-size:14px; color:#aaa; }
.form-group input { width:100%; padding:12px 16px; background:#111; border:1px solid #333; border-radius:8px; color:#fff; font-size:16px; outline:none; }
.form-group input:focus { border-color:#ff6b35; }
button { width:100%; padding:14px; background:#ff6b35; color:#fff; border:none; border-radius:8px; font-size:16px; font-weight:600; cursor:pointer; transition:background .2s; }
button:hover:not(:disabled) { background:#ff8555; }
button:disabled { opacity:.4; cursor:not-allowed; }
#result { margin-top:24px; }
.success { color:#4caf50; font-size:14px; margin-bottom:10px; }
.link-box { display:flex; gap:8px; }
.link-box input { flex:1; padding:10px; background:#111; border:1px solid #333; border-radius:6px; color:#fff; font-size:13px; }
.link-box button { width:auto; padding:10px 16px; font-size:14px; }
.hint { color:#ff6b35; font-size:12px; margin-top:10px; }
#loading { text-align:center; margin-top:20px; }
.spinner { width:32px; height:32px; border:3px solid #333; border-top-color:#ff6b35; border-radius:50%; animation:spin 1s linear infinite; margin:0 auto 10px; }
@keyframes spin { to { transform:rotate(360deg); } }
</style>
</head>
<body>
<div class="container">
  <h1>🔥 阅后即焚</h1>
  <p class="subtitle">上传照片，对方看一眼就永久销毁</p>

  <div class="upload-area" id="dropZone">
    <input type="file" id="fileInput" accept="image/*" hidden>
    <div class="upload-icon">📷</div>
    <p>点击或拖拽照片到这里</p>
    <img id="preview" hidden>
  </div>

  <div class="form-group">
    <label>设置查看密码</label>
    <input type="text" id="password" placeholder="输入密码，告诉对方才能看">
  </div>

  <button id="uploadBtn" disabled>加密并生成链接</button>

  <div id="result" hidden>
    <p class="success">链接已生成！发给对方，看一次就销毁：</p>
    <div class="link-box">
      <input type="text" id="shareLink" readonly>
      <button onclick="copyLink()">复制</button>
    </div>
    <p class="hint">密码请单独告诉对方，不要和链接放一起发</p>
  </div>

  <div id="loading" hidden>
    <div class="spinner"></div>
    <p>正在加密上传...</p>
  </div>
</div>

<script>
const dropZone = document.getElementById('dropZone');
const fileInput = document.getElementById('fileInput');
const preview = document.getElementById('preview');
const uploadBtn = document.getElementById('uploadBtn');
const passwordInput = document.getElementById('password');
let selectedFile = null;

dropZone.onclick = () => fileInput.click();
dropZone.ondragover = e => { e.preventDefault(); dropZone.classList.add('dragover'); };
dropZone.ondragleave = () => dropZone.classList.remove('dragover');
dropZone.ondrop = e => { e.preventDefault(); dropZone.classList.remove('dragover'); handleFile(e.dataTransfer.files[0]); };
fileInput.onchange = e => handleFile(e.target.files[0]);

function handleFile(file) {
  if (!file || !file.type.startsWith('image/')) return alert('请选择图片文件');
  selectedFile = file;
  preview.src = URL.createObjectURL(file);
  preview.hidden = false;
  dropZone.querySelector('p').textContent = file.name;
  dropZone.querySelector('.upload-icon').hidden = true;
  checkReady();
}

passwordInput.oninput = checkReady;
function checkReady() { uploadBtn.disabled = !(selectedFile && passwordInput.value.trim()); }

uploadBtn.onclick = async () => {
  const password = passwordInput.value.trim();
  if (!selectedFile || !password) return;

  document.getElementById('loading').hidden = false;
  uploadBtn.disabled = true;

  try {
    const arrayBuffer = await selectedFile.arrayBuffer();
    const { encrypted, iv, salt } = await encryptData(arrayBuffer, password);

    const resp = await fetch('/api/upload', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        encrypted: arrayBufferToBase64(encrypted),
        iv: arrayBufferToBase64(iv),
        salt: arrayBufferToBase64(salt),
        filename: selectedFile.name,
        type: selectedFile.type
      })
    });

    const { id, error } = await resp.json();
    if (error) throw new Error(error);

    const link = location.origin + '/view/' + id;
    document.getElementById('shareLink').value = link;
    document.getElementById('result').hidden = false;
  } catch (e) {
    alert('上传失败: ' + e.message);
  } finally {
    document.getElementById('loading').hidden = true;
    uploadBtn.disabled = false;
  }
};

async function encryptData(data, password) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const keyMaterial = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveKey']);
  const key = await crypto.subtle.deriveKey({ name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' }, keyMaterial, { name: 'AES-GCM', length: 256 }, false, ['encrypt']);
  const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, data);
  return { encrypted, iv, salt };
}

function arrayBufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

function copyLink() {
  const input = document.getElementById('shareLink');
  input.select();
  navigator.clipboard.writeText(input.value);
  alert('已复制！');
}
</script>
</body>
</html>`;

// ===== 查看页面 =====
const VIEW_HTML = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>查看照片</title>
<style>
* { margin:0; padding:0; box-sizing:border-box; }
body { font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif; background:#0a0a0a; color:#e0e0e0; min-height:100vh; display:flex; align-items:center; justify-content:center; }
.container { max-width:520px; width:90%; padding:40px 30px; background:#1a1a1a; border-radius:16px; border:1px solid #333; text-align:center; }
h1 { font-size:22px; margin-bottom:20px; color:#ccc; }
.form-group { margin-bottom:20px; text-align:left; }
.form-group label { display:block; margin-bottom:6px; font-size:14px; color:#aaa; }
.form-group input { width:100%; padding:12px 16px; background:#111; border:1px solid #333; border-radius:8px; color:#fff; font-size:16px; outline:none; }
.form-group input:focus { border-color:#555; }
button { width:100%; padding:14px; background:#333; color:#fff; border:none; border-radius:8px; font-size:16px; cursor:pointer; }
button:hover { background:#444; }
.error { color:#f44336; margin-top:16px; font-size:14px; }
.photo-container { position:relative; margin-top:20px; user-select:none; -webkit-user-select:none; cursor:pointer; }
.photo-container img { max-width:100%; max-height:70vh; border-radius:8px; user-select:none; -webkit-user-select:none; pointer-events:none; display:block; }
.cover { position:absolute; top:0; left:0; width:100%; height:100%; background:#1a1a1a; border-radius:8px; display:flex; align-items:center; justify-content:center; color:#666; font-size:14px; }
.gone { color:#888; font-size:16px; margin-top:20px; }
</style>
</head>
<body>
<div class="container">
  <div id="passwordStep">
    <h1>加密照片</h1>
    <div class="form-group">
      <label>输入密码查看</label>
      <input type="password" id="pwd" placeholder="请输入密码" autofocus>
    </div>
    <button onclick="decrypt()">查看</button>
    <p class="error" id="error" hidden></p>
  </div>

  <div id="photoStep" hidden>
    <div class="photo-container" id="photoContainer">
      <img id="photo" draggable="false">
      <div class="cover" id="cover">按住查看</div>
    </div>
  </div>

  <div id="goneStep" hidden>
    <p class="gone">链接已失效</p>
  </div>
</div>

<script>
const id = location.pathname.split('/view/')[1];
let destroyed = false;

document.addEventListener('contextmenu', e => e.preventDefault());
document.addEventListener('dragstart', e => e.preventDefault());
document.addEventListener('selectstart', e => e.preventDefault());

let cachedData = null;

async function decrypt() {
  const password = document.getElementById('pwd').value.trim();
  if (!password) return;

  try {
    if (!cachedData) {
      const resp = await fetch('/api/get/' + id, { method: 'POST' });
      if (!resp.ok) {
        const err = await resp.json();
        throw new Error(err.error || '获取失败');
      }
      cachedData = await resp.json();
    }

    const { encrypted, iv, salt, type } = cachedData;
    const data = await decryptData(base64ToArrayBuffer(encrypted), base64ToArrayBuffer(iv), base64ToArrayBuffer(salt), password);
    const blob = new Blob([data], { type: type || 'image/jpeg' });
    const url = URL.createObjectURL(blob);

    cachedData = null;
    document.getElementById('photo').src = url;
    document.getElementById('passwordStep').hidden = true;
    document.getElementById('photoStep').hidden = false;

    const container = document.getElementById('photoContainer');
    const cover = document.getElementById('cover');

    // 按住显示，松开销毁
    container.addEventListener('mousedown', e => { e.preventDefault(); cover.style.display = 'none'; });
    container.addEventListener('touchstart', e => { e.preventDefault(); cover.style.display = 'none'; });
    document.addEventListener('mouseup', destroyContent);
    document.addEventListener('touchend', destroyContent);
    document.addEventListener('touchcancel', destroyContent);

    // 切屏销毁
    document.addEventListener('visibilitychange', () => { if (document.hidden) destroyContent(); });
    window.addEventListener('blur', destroyContent);

  } catch (e) {
    const errEl = document.getElementById('error');
    if (e.message.includes('decrypt') || e.name === 'OperationError') {
      errEl.textContent = '密码错误';
    } else {
      errEl.textContent = e.message;
    }
    errEl.hidden = false;
  }
}

function destroyContent() {
  if (destroyed) return;
  destroyed = true;
  document.getElementById('photoStep').hidden = true;
  document.getElementById('goneStep').hidden = false;
  const img = document.getElementById('photo');
  if (img.src) { URL.revokeObjectURL(img.src); img.src = ''; }
}

async function decryptData(encrypted, iv, salt, password) {
  const keyMaterial = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveKey']);
  const key = await crypto.subtle.deriveKey({ name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' }, keyMaterial, { name: 'AES-GCM', length: 256 }, false, ['decrypt']);
  return await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, encrypted);
}

function base64ToArrayBuffer(base64) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}
</script>
</body>
</html>`;

