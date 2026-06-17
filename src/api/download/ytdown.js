const https = require("https");
const { URL } = require("url");

const VIDEO_OPTIONS = [
  { label: "MP4 1080P", format: "mp4", quality: "1080p" },
  { label: "MP4 720P",  format: "mp4", quality: "720p"  },
  { label: "MP4 480P",  format: "mp4", quality: "480p"  },
  { label: "MP4 360P",  format: "mp4", quality: "360p"  },
  { label: "MP4 144P",  format: "mp4", quality: "144p"  },
];

function normalizeUrl(url) {
  try {
    const u = new URL(url);
    if (u.hostname === "youtu.be") {
      return "https://www.youtube.com/watch?v=" + u.pathname.slice(1);
    }
    const v = u.searchParams.get("v");
    if (v) return "https://www.youtube.com/watch?v=" + v;
    return url;
  } catch {
    return url;
  }
}

function request(options, body) {
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let data = "";
      res.on("data", (chunk) => { data += chunk; });
      res.on("end", () => {
        try { resolve(JSON.parse(data)); }
        catch { resolve(data); }
      });
    });
    req.on("error", reject);
    if (body) req.write(body);
    req.end();
  });
}

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function checkDMCA(url) {
  return request({
    hostname: "dmca.ytmp3.gg",
    path: "/api/check?url=" + encodeURIComponent(url),
    method: "GET",
    headers: { "Accept": "application/json" },
  });
}

async function getInfo(url) {
  return request({
    hostname: "www.youtube.com",
    path: "/oembed?url=" + encodeURIComponent(normalizeUrl(url)) + "&format=json",
    method: "GET",
    headers: { "Accept": "application/json" },
  });
}

async function startDownload(url, format, quality, type) {
  const body = JSON.stringify({
    url: normalizeUrl(url),
    output: { type: type, format: format, quality: quality }
  });
  return request({
    hostname: "ytdl.y2mp3.co",
    path: "/api/v2/download",
    method: "POST",
    headers: {
      "Accept": "application/json",
      "Content-Type": "application/json",
      "Content-Length": Buffer.byteLength(body),
    },
  }, body);
}

async function pollStatus(statusUrl) {
  const id = statusUrl.split("/").pop();
  for (let i = 0; i < 30; i++) {
    const result = await request({
      hostname: "ytdl.y2mp3.co",
      path: "/api/status/" + id,
      method: "GET",
      headers: { "Accept": "application/json" },
    });
    if (result.status === "completed") return result;
    if (result.status === "failed") throw new Error("Gagal proses di server.");
    await sleep(3000);
  }
  throw new Error("Timeout menunggu hasil.");
}

async function processAll(url, options, type) {
  const results = [];
  for (const opt of options) {
    try {
      const dl = await startDownload(url, opt.format, opt.quality, type);
      if (!dl.statusUrl) {
        results.push({ format: opt.label, status: false, download_url: null });
        continue;
      }
      const hasil = await pollStatus(dl.statusUrl);
      results.push({
        format: opt.label,
        status: true,
        download_url: hasil.downloadUrl || null
      });
    } catch {
      results.push({ format: opt.label, status: false, download_url: null });
    }
  }
  return results;
}

module.exports = (app) => {
  app.get('/download/ytmp4', async (req, res) => {
    try {
      const { url } = req.query;
      if (!url) {
        return res.status(400).json({
          status: false,
          error: 'Parameter "url" wajib diisi'
        });
      }

      // Cek DMCA
      const dmca = await checkDMCA(url);
      if (dmca.blocked) {
        return res.status(403).json({
          status: false,
          error: 'Video kena DMCA, tidak bisa didownload.'
        });
      }

      // Ambil info video
      const info = await getInfo(url);

      // Proses download semua kualitas
      const hasil = await processAll(url, VIDEO_OPTIONS, "video");

      res.json({
        status: true,
        creator: "AxlyDev",
        data: {
          judul: info.title || "-",
          channel: info.author_name || "-",
          thumbnail: info.thumbnail_url || "-",
          duration: info.duration || null,
          formats: hasil
        }
      });

    } catch (err) {
      res.status(500).json({
        status: false,
        error: err.message || "Terjadi kesalahan server"
      });
    }
  });
};
