import https from 'https';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const PORT = 5174;
const DIST_DIR = path.join(__dirname, 'dist');

const options = {
  key: fs.readFileSync(path.join(__dirname, 'server.key')),
  cert: fs.readFileSync(path.join(__dirname, 'server.crt')),
};

const mimeTypes = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.webp': 'image/webp',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
};

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (chunk) => chunks.push(chunk));
    req.on('end', () => {
      try {
        const body = Buffer.concat(chunks).toString('utf-8');
        resolve(body ? JSON.parse(body) : {});
      } catch (e) {
        reject(e);
      }
    });
    req.on('error', reject);
  });
}

function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

async function callVolcASR(appKey, accessKey, audioBase64) {
  const url = 'https://openspeech.bytedance.com/api/v3/auc/bigmodel/recognize/flash';
  const requestId = generateUUID();

  const headers = {
    'Content-Type': 'application/json',
    'X-Api-App-Key': appKey,
    'X-Api-Access-Key': accessKey,
    'X-Api-Resource-Id': 'volc.bigasr.auc_turbo',
    'X-Api-Request-Id': requestId,
    'X-Api-Sequence': '-1',
  };

  const body = JSON.stringify({
    user: { uid: appKey },
    audio: { data: audioBase64 },
    request: { model_name: 'bigmodel' },
  });

  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(url);
    const options = {
      hostname: parsedUrl.hostname,
      port: 443,
      path: parsedUrl.pathname,
      method: 'POST',
      headers: {
        ...headers,
        'Content-Length': Buffer.byteLength(body),
      },
    };

    const req = https.request(options, (res) => {
      const chunks = [];
      res.on('data', (chunk) => chunks.push(chunk));
      res.on('end', () => {
        const result = Buffer.concat(chunks).toString('utf-8');
        const statusCode = res.headers['x-api-status-code'];
        try {
          const json = JSON.parse(result);
          if (statusCode === '20000000' && json.result?.text) {
            resolve({ text: json.result.text, raw: json });
          } else {
            reject(new Error(json.header?.message || `识别失败: ${statusCode}`));
          }
        } catch (e) {
          reject(new Error(`解析响应失败: ${result}`));
        }
      });
    });

    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

const server = https.createServer(options, async (req, res) => {
  if (req.url === '/api/asr' && req.method === 'POST') {
    try {
      const body = await readBody(req);
      const { audioBase64, appKey, accessKey } = body;

      if (!audioBase64) {
        res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ error: '缺少音频数据' }));
        return;
      }

      if (!appKey || !accessKey) {
        res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ error: '请先在设置中配置火山语音识别 AppID 和 Access Key' }));
        return;
      }

      const result = await callVolcASR(appKey, accessKey, audioBase64);
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify(result));
    } catch (error) {
      res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ error: error.message || '识别失败' }));
    }
    return;
  }

  let filePath = path.join(DIST_DIR, req.url === '/' ? 'index.html' : req.url);

  const extname = String(path.extname(filePath)).toLowerCase();
  const contentType = mimeTypes[extname] || 'application/octet-stream';

  fs.readFile(filePath, (error, content) => {
    if (error) {
      if (error.code === 'ENOENT') {
        fs.readFile(path.join(DIST_DIR, 'index.html'), (err, indexContent) => {
          if (err) {
            res.writeHead(500);
            res.end('Server Error');
          } else {
            res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
            res.end(indexContent, 'utf-8');
          }
        });
      } else {
        res.writeHead(500);
        res.end('Server Error: ' + error.code);
      }
    } else {
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content, 'utf-8');
    }
  });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log('');
  console.log('  🎉 HTTPS 服务器已启动');
  console.log('');
  console.log('  本机访问:  https://localhost:' + PORT);
  console.log('  手机访问:  https://30.239.8.161:' + PORT);
  console.log('');
  console.log('  ⚠️  首次访问会提示"不安全"，请选择"继续前往"');
  console.log('  🎤 语音功能需要 HTTPS 环境才能使用麦克风');
  console.log('');
});
