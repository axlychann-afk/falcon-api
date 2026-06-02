const axios = require('axios');
const FormData = require('form-data');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const { CookieJar } = require('tough-cookie');
const { wrapper } = require('axios-cookiejar-support');

const upload = multer({ storage: multer.memoryStorage() });

const BASE = "https://www.upload.ee";
const UA = "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Mobile Safari/537.36";

const MIME = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".bmp": "image/bmp",
  ".mp4": "video/mp4",
  ".mp3": "audio/mpeg"
};

const IMAGE_EXT = new Set([".jpg", ".jpeg", ".png", ".webp", ".gif", ".bmp"]);

const getCreator = () => {
  return (global.apikey && global.apikey[0]) ? global.apikey[0] : 'AxlyDev';
};

// Setup cookie jar
const jar = new CookieJar();
const client = wrapper(axios.create({
  jar,
  withCredentials: true,
  maxBodyLength: Infinity,
  maxContentLength: Infinity,
  validateStatus: () => true
}));

function decodeHtml(text = "") {
  return text
    .replaceAll("&amp;", "&")
    .replaceAll("&quot;", "\"")
    .replaceAll("&#039;", "'")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">");
}

function toDirectImageUrl(url) {
  if (!url) return null;
  let result = decodeHtml(url);
  result = result.replace("/files/", "/image/");
  if (result.endsWith(".html")) {
    result = result.slice(0, -5);
  }
  return result;
}

async function getUploadId() {
  const rnd = Date.now();
  const res = await client.get(`${BASE}/ubr_link_upload.php?rnd_id=${rnd}`, {
    headers: {
      "User-Agent": UA,
      "Accept": "*/*",
      "Referer": `${BASE}/?`
    }
  });
  const body = String(res.data || "");
  const match = body.match(/startUpload\("([^"]+)"/);
  if (!match) throw new Error("Upload ID tidak ditemukan");
  return match[1];
}

async function uploadToUploadEe(fileBuffer, filename, isImage) {
  try {
    // 1. Visit home page
    await client.get(`${BASE}/?`, {
      headers: {
        "User-Agent": UA,
        "Accept": "text/html,application/xhtml+xml",
        "Referer": BASE
      }
    });

    // 2. Get upload ID
    const uploadId = await getUploadId();

    // 3. Upload file
    const form = new FormData();
    form.append("upfile_0", fileBuffer, { filename: filename });
    form.append("link", "");
    form.append("email", "");
    form.append("category", isImage ? "cat_picture" : "cat_file");
    form.append("big_resize", "none");
    form.append("small_resize", "120x90");

    const uploadUrl = `${BASE}/cgi-bin/ubr_upload.pl?X-Progress-ID=${uploadId}&upload_id=${uploadId}`;
    const uploadRes = await client.post(uploadUrl, form, {
      headers: {
        ...form.getHeaders(),
        "User-Agent": UA,
        "Accept": "text/html,application/xhtml+xml",
        "Origin": BASE,
        "Referer": `${BASE}/?`
      }
    });

    // 4. Get finished page
    const finishedUrl = `${BASE}/?page=finished&upload_id=${uploadId}`;
    const finishedRes = await client.get(finishedUrl, {
      headers: {
        "User-Agent": UA,
        "Accept": "text/html,application/xhtml+xml",
        "Referer": uploadUrl
      }
    });

    const finishedHtml = String(finishedRes.data || "");
    const fileSrcMatch = finishedHtml.match(/id=["']file_src["'][^>]*value=["']([^"']+)["']/i);
    const viewMatch = finishedHtml.match(/View file:\s*<br\s*\/?>\s*<a href=["']?([^"'>\s]+)["']?/i);

    const rawUrl = fileSrcMatch?.[1] || viewMatch?.[1] || null;
    const viewUrl = rawUrl ? decodeHtml(rawUrl) : null;

    if (!viewUrl) throw new Error("View file URL tidak ditemukan");

    let resultUrl = null;

    if (isImage) {
      resultUrl = toDirectImageUrl(viewUrl);
    } else {
      const filePageRes = await client.get(viewUrl, {
        headers: {
          "User-Agent": UA,
          "Accept": "text/html,application/xhtml+xml",
          "Referer": finishedUrl
        }
      });
      const fileHtml = String(filePageRes.data || "");
      const downloadMatch = fileHtml.match(/<a[^>]+id=["']d_l["'][^>]+href=["']([^"']+)["']/i);
      resultUrl = downloadMatch ? decodeHtml(downloadMatch[1]) : null;
    }

    return { success: !!resultUrl, url: resultUrl };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

module.exports = (app) => {
  
  // POST - upload file langsung
  app.post('/tools/upload', upload.single('file'), async (req, res) => {
    if (!req.file) {
      return res.status(400).json({
        status: false,
        creator: getCreator(),
        error: 'Tidak ada file. Kirim file dengan key "file"'
      });
    }

    const ext = path.extname(req.file.originalname).toLowerCase();
    const isImage = IMAGE_EXT.has(ext);

    try {
      const result = await uploadToUploadEe(req.file.buffer, req.file.originalname, isImage);
      
      if (!result.success) {
        throw new Error(result.error || 'Upload gagal');
      }
      
      res.json({
        status: true,
        creator: getCreator(),
        result: {
          url: result.url,
          original_name: req.file.originalname,
          size: req.file.size,
          type: isImage ? 'image' : 'file'
        }
      });
      
    } catch (error) {
      console.error('[Upload Error]', error.message);
      res.status(500).json({
        status: false,
        creator: getCreator(),
        error: error.message
      });
    }
  });
};
