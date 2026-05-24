const express = require('express');
const chalk = require('chalk');
const fs = require('fs');
const cors = require('cors');
const path = require('path');
const axios = require('axios');

require("./function.js");

const app = express();
const PORT = process.env.PORT || 8080;

const WEBHOOK_URL = 'https://discord.com/api/webhooks/1396122030163628112/-vEj4HjREjbaOVXDu5932YjeHpTkjNSKyUKugBFF9yVCBeQSrdgK8qM3HNxVYTOD5BYP';

// Buffer untuk batch log
let logBuffer = [];

// Kirim batch log (hanya di non-serverless)
let logInterval = null;
if (process.env.NODE_ENV !== 'production') {
  logInterval = setInterval(() => {
    if (logBuffer.length === 0) return;
    const combinedLogs = logBuffer.join('\n');
    logBuffer = [];
    const payload = ` \`\`\`ansi\n${combinedLogs}\n\`\`\`\n`;
    axios.post(WEBHOOK_URL, { content: payload }).catch(console.error);
  }, 2000);
}

// Flush log langsung (untuk production/serverless)
function flushLog() {
  if (logBuffer.length === 0) return;
  const combinedLogs = logBuffer.join('\n');
  logBuffer = [];
  const payload = ` \`\`\`ansi\n${combinedLogs}\n\`\`\`\n`;
  axios.post(WEBHOOK_URL, { content: payload }).catch(console.error);
}

function queueLog({ method, status, url, duration, error = null }) {
  let colorCode;
  if (status >= 500) colorCode = '\x1b[2;31m';
  else if (status >= 400) colorCode = '\x1b[2;31m';
  else if (status === 304) colorCode = '\x1b[2;34m';
  else colorCode = '\x1b[2;32m';

  let line = `${colorCode}[${method}] ${status} ${url} - ${duration}ms\x1b[0m`;
  if (error) {
    line += `\n\x1b[2;31m[ERROR] ${error.message || error}\x1b[0m`;
  }
  logBuffer.push(line);

  // Di production langsung flush karena tidak ada interval
  if (process.env.NODE_ENV === 'production') {
    flushLog();
  }
}

// Cooldown vars
let requestCount = 0;
let isCooldown = false;

if (process.env.NODE_ENV !== 'production') {
  setInterval(() => {
    requestCount = 0;
  }, 1000);
}

app.use((req, res, next) => {
  if (process.env.NODE_ENV === 'production') {
    requestCount = 0; // reset tiap request di serverless
  }

  if (isCooldown) {
    queueLog({ method: req.method, status: 503, url: req.originalUrl, duration: 0, error: 'Server is in cooldown' });
    return res.status(503).json({ error: 'Server is in cooldown, try again later.' });
  }

  requestCount++;

  if (requestCount > 10) {
    isCooldown = true;
    const cooldownTime = (Math.random() * (120000 - 60000) + 60000).toFixed(3);
    console.log(`⚠️ SPAM DETECT: Cooldown ${cooldownTime / 1000} detik`);

    const userTag = '<@1162931657276395600>';
    const spamMsg = `${userTag}\n\`\`\`ansi\n⚠️ [ SPAM DETECT ] ⚠️\n\n[ ! ] Too many requests, server cooldown for ${cooldownTime / 1000} sec!\n\n\x1b[2;31m[${req.method}] 503 ${req.originalUrl} - 0ms\x1b[0m\n\`\`\`\n`;
    axios.post(WEBHOOK_URL, { content: spamMsg }).catch(console.error);

    if (process.env.NODE_ENV !== 'production') {
      setTimeout(() => {
        isCooldown = false;
        console.log('✅ Cooldown selesai, server aktif lagi');
      }, cooldownTime);
    } else {
      // Di serverless, reset langsung setelah 1 menit
      setTimeout(() => { isCooldown = false; }, 60000);
    }

    return res.status(503).json({ error: 'Too many requests, server cooldown!' });
  }

  next();
});

app.enable("trust proxy");
app.set("json spaces", 2);
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cors());

// Load Settings
const settingsPath = path.join(__dirname, './assets/settings.json');
const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf-8'));
global.apikey = settings.apiSettings.apikey;

// Custom Log + Wrap res.json
app.use((req, res, next) => {
  console.log(chalk.bgHex('#FFFF99').hex('#333').bold(` Request Route: ${req.path} `));
  global.totalreq += 1;

  const start = Date.now();
  const originalJson = res.json;

  res.json = function (data) {
    if (data && typeof data === 'object') {
      const responseData = {
        status: data.status,
        creator: settings.apiSettings.creator || "Axly API",
        ...data
      };
      return originalJson.call(this, responseData);
    }
    return originalJson.call(this, data);
  };

  res.on('finish', () => {
    const duration = Date.now() - start;
    queueLog({ method: req.method, status: res.statusCode, url: req.originalUrl, duration });
  });

  next();
});

// Static & Src Protect
app.use('/', express.static(path.join(__dirname, 'api-page')));
app.use('/assets', express.static(path.join(__dirname, 'assets')));
app.use('/src', (req, res) => {
  res.status(403).json({ error: 'Forbidden access' });
});

// Load API routes dinamis
let totalRoutes = 0;
const apiFolder = path.join(__dirname, './src/api');
fs.readdirSync(apiFolder).forEach((subfolder) => {
  const subfolderPath = path.join(apiFolder, subfolder);
  if (fs.statSync(subfolderPath).isDirectory()) {
    fs.readdirSync(subfolderPath).forEach((file) => {
      const filePath = path.join(subfolderPath, file);
      if (path.extname(file) === '.js') {
        require(filePath)(app);
        totalRoutes++;
        console.log(chalk.bgHex('#FFFF99').hex('#333').bold(` Loaded Route: ${path.basename(file)} `));
      }
    });
  }
});

console.log(chalk.bgHex('#90EE90').hex('#333').bold(' Load Complete! ✓ '));
console.log(chalk.bgHex('#90EE90').hex('#333').bold(` Total Routes Loaded: ${totalRoutes} `));

// Index route
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'api-page', 'index.html'));
});

// 404 handler
app.use((req, res, next) => {
  queueLog({ method: req.method, status: 404, url: req.originalUrl, duration: 0, error: 'Not Found' });
  res.status(404).sendFile(process.cwd() + "/api-page/404.html");
});

// 500 handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  queueLog({ method: req.method, status: 500, url: req.originalUrl, duration: 0, error: err });
  res.status(500).sendFile(process.cwd() + "/api-page/500.html");
});

// Listen hanya di local, bukan di Vercel
if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => {
    console.log(chalk.bgHex('#90EE90').hex('#333').bold(` Server is running on port ${PORT} `));
  });
}

module.exports = app;
