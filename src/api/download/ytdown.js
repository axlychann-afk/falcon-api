/**
 *   NAMA SCRAPE  :: YOUTUBE DOWNLOADER
 *   
 *   [•] PEMBUAT      :: DEFAN
 *   [•] WEB          :: soonex.biz.id
 *   [•] DESKRIPSI    :: Download video/audio YouTube berbagai format
 *   [•] BASIS        :: ytdl.y2mp3.co
 *   [•] CHANNEL      :: https://whatsapp.com/channel/0029VbCWturICVfd01iF0y47
 *   
 *   [!] PERHATIAN:
 *   Dilarang mengubah atau menyebarkan tanpa izin pembuat.
 *   HORMATI PEMBUAT, JANGAN HAPUS WATERMARK INI!
 */

const https = require("https");

const VIDEO_OPTIONS = [
  { label: "MP4 1080P", format: "mp4", quality: "1080p" },
  { label: "MP4 720P",  format: "mp4", quality: "720p"  },
  { label: "MP4 480P",  format: "mp4", quality: "480p"  },
  { label: "MP4 360P",  format: "mp4", quality: "360p"  },
  { label: "MP4 144P",  format: "mp4", quality: "144p"  },
];

const AUDIO_OPTIONS = [
  { label: "MP3 320kbps", format: "mp3", quality: "320kbps" },
  { label: "MP3 192kbps", format: "mp3", quality: "192kbps" },
  { label: "MP3 128kbps", format: "mp3", quality: "128kbps" },
  { label: "MP3 64kbps",  format: "mp3", quality: "64kbps"  },
  { label: "M4A",         format: "m4a", quality: "128kbps" },
];

function normalizeUrl(url) {
  try {
    const u = new URL(url);
    if (u.hostname === "youtu.be") {
      return "https://www.youtube.com/watch?v=" + u.pathname.slice(1);
    }
    return "https://www.youtube.com/watch?v=" + u.searchParams.get("v");
  } catch (e) {
    return url;
  }
}

function request(options, body) {
  return new Promise(function(resolve, reject) {
    const req = https.request(options, function(res) {
      let data = "";
      res.on("data", function(chunk) { data += chunk; });
      res.on("end", function() {
        try { resolve(JSON.parse(data)); }
        catch (e) { resolve(data); }
      });
    });
    req.on("error", reject);
    if (body) req.write(body);
    req.end();
  });
}

function sleep(ms) {
  return new Promise(function(r) { setTimeout(r, ms); });
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
  let attempts = 0;
  while (attempts < 30) {
    const result = await request({
      hostname: "ytdl.y2mp3.co",
      path: "/api/status/" + id,
      method: "GET",
      headers: { "Accept": "application/json" },
    });
    if (result.status === "completed") return result;
    if (result.status === "failed") throw new Error("Gagal proses di server.");
    await sleep(3000);
    attempts++;
  }
  throw new Error("Timeout menunggu hasil.");
}

async function processAll(url, options, type) {
  const results = [];
  for (let i = 0; i < options.length; i++) {
    const opt = options[i];
    try {
      const dl = await startDownload(url, opt.format, opt.quality, type);
      if (!dl.statusUrl) {
        results.push({ format: opt.label, status: false, download_url: null });
        continue;
      }
      const hasil = await pollStatus(dl.statusUrl);
      results.push({ format: opt.label, status: true, download_url: hasil.downloadUrl || null });
    } catch (e) {
      results.push({ format: opt.label, status: false, download_url: null });
    }
  }
  return results;
}

module.exports = (app) => {

  // GET /download/ytmp4?url=xxx
  app.get('/download/ytmp4', async (req, res) => {
    try {
      const { url } = req.query;

      if (!url) {
        return res.status(400).json({
          status: false,
          creator: 'AxlyDev',
          error: 'Parameter url (link YouTube) wajib diisi'
        });
      }

      if (!url.includes('youtu.be') && !url.includes('youtube.com')) {
        return res.status(400).json({
          status: false,
          creator: 'AxlyDev',
          error: 'URL harus dari YouTube'
        });
      }

      const dmca = await checkDMCA(url);
      if (dmca.blocked) {
        return res.status(403).json({
          status: false,
          creator: 'AxlyDev',
          error: 'Video kena DMCA, tidak bisa didownload.'
        });
      }

      const info = await getInfo(url);
      const hasil = await processAll(url, VIDEO_OPTIONS, 'video');

      res.json({
        status: true,
        creator: 'AxlyDev',
        result: {
          judul: info.title || '-',
          channel: info.author_name || '-',
          thumbnail: info.thumbnail_url || '-',
          format: hasil
        }
      });

    } catch (error) {
      res.status(500).json({
        status: false,
        creator: 'AxlyDev',
        error: error.message
      });
    }
  });

  // GET /download/ytmp3?url=xxx
  app.get('/download/ytmp3', async (req, res) => {
    try {
      const { url } = req.query;

      if (!url) {
        return res.status(400).json({
          status: false,
          creator: 'AxlyDev',
          error: 'Parameter url (link YouTube) wajib diisi'
        });
      }

      if (!url.includes('youtu.be') && !url.includes('youtube.com')) {
        return res.status(400).json({
          status: false,
          creator: 'AxlyDev',
          error: 'URL harus dari YouTube'
        });
      }

      const dmca = await checkDMCA(url);
      if (dmca.blocked) {
        return res.status(403).json({
          status: false,
          creator: 'AxlyDev',
          error: 'Video kena DMCA, tidak bisa didownload.'
        });
      }

      const info = await getInfo(url);
      const hasil = await processAll(url, AUDIO_OPTIONS, 'audio');

      res.json({
        status: true,
        creator: 'AxlyDev',
        result: {
          judul: info.title || '-',
          channel: info.author_name || '-',
          thumbnail: info.thumbnail_url || '-',
          format: hasil
        }
      });

    } catch (error) {
      res.status(500).json({
        status: false,
        creator: 'AxlyDev',
        error: error.message
      });
    }
  });

  // GET /download/ytdown?url=xxx  (gabungan video + audio)
  app.get('/download/ytdown', async (req, res) => {
    try {
      const { url } = req.query;

      if (!url) {
        return res.status(400).json({
          status: false,
          creator: 'AxlyDev',
          error: 'Parameter url (link YouTube) wajib diisi'
        });
      }

      if (!url.includes('youtu.be') && !url.includes('youtube.com')) {
        return res.status(400).json({
          status: false,
          creator: 'AxlyDev',
          error: 'URL harus dari YouTube'
        });
      }

      const dmca = await checkDMCA(url);
      if (dmca.blocked) {
        return res.status(403).json({
          status: false,
          creator: 'AxlyDev',
          error: 'Video kena DMCA, tidak bisa didownload.'
        });
      }

      const info = await getInfo(url);
      const [videos, audios] = await Promise.all([
        processAll(url, VIDEO_OPTIONS, 'video'),
        processAll(url, AUDIO_OPTIONS, 'audio')
      ]);

      res.json({
        status: true,
        creator: 'AxlyDev',
        result: {
          judul: info.title || '-',
          channel: info.author_name || '-',
          thumbnail: info.thumbnail_url || '-',
          videos,
          audios
        }
      });

    } catch (error) {
      res.status(500).json({
        status: false,
        creator: 'AxlyDev',
        error: error.message
      });
    }
  });

};
