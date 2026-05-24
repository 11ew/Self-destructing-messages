# 🔥 阅后即焚

上传照片，设置密码，对方看一眼就永久销毁。

## 隐私保护

- **端到端加密** — AES-256-GCM，照片在浏览器加密后才上传，服务器只存密文
- **密码保护** — 必须输入正确密码才能解密查看
- **阅后即焚** — 查看一次后服务器立即删除数据
- **按住查看** — 手指/鼠标按住才显示，松开立即销毁
- **切屏销毁** — 切换窗口/标签页，照片立即从页面消失
- **防操作** — 禁止右键、拖拽、选择
- **零日志** — 不记录任何访问者信息
- **内存存储** — 数据24小时后自动过期

## 部署步骤（5分钟）

### 1. 注册 Cloudflare 账号

前往 https://dash.cloudflare.com/sign-up 注册免费账号。

### 2. 安装 Wrangler CLI

```bash
npm install -g wrangler
```

### 3. 登录

```bash
wrangler login
```

浏览器会弹出授权页面，点击允许。

### 4. 创建 KV 存储

```bash
wrangler kv namespace create STORE
```

命令会输出类似：
```
{ binding = "STORE", id = "xxxxxxxxxxxxxxxxxxxx" }
```

复制这个 `id`，替换 `wrangler.toml` 中的 `你的KV_NAMESPACE_ID`。

再创建预览用的：
```bash
wrangler kv namespace create STORE --preview
```

同样替换 `你的PREVIEW_KV_ID`。

### 5. 部署

```bash
npm run deploy
```

部署成功后会输出你的网址，类似：
```
https://burn-after-reading.你的用户名.workers.dev
```

## 使用方法

1. 打开网址，选择照片，设置密码
2. 点击"加密并生成链接"
3. 把链接发给对方（通过任何渠道）
4. **密码单独告诉对方**（不要和链接放一起）
5. 对方打开链接，输入密码，看一眼
6. 照片自动销毁，链接永久失效

## 免费额度

Cloudflare Workers 免费版：
- 每天 10 万次请求
- KV 每天 1000 次写入 / 10 万次读取
- 单个文件最大 25MB

对于个人使用完全够用。

## 本地开发

```bash
npm install
npm run dev
```

访问 http://localhost:8787
