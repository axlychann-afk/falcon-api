// removebg.js - Remove background gambar (gratis via removal.ai)
const multer = require("multer");
const crypto = require("crypto");

// Upload config
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'image/jpeg' || file.mimetype === 'image/jpg' || file.mimetype === 'image/png') {
      cb(null, true);
    } else {
      cb(new Error('Format harus JPG/JPEG/PNG'));
    }
  }
});

// Fungsi fetch dengan retry
async function fetchWithRetry(url, options = {}, retries = 2) {
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(url, options);
      return res;
    } catch (err) {
      if (i === retries - 1) throw err;
      await new Promise(r => setTimeout(r, 2000));
    }
  }
}

// Dapetin web token
async function getWebToken() {
  // Fetch homepage
  const htmlRes = await fetchWithRetry("https://removal.ai/", {
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
  });
  const html = await htmlRes.text();
  
  // Extract token URL
  const match = html.match(/var ajax_upload_object = ({.*?});/);
  if (!match) throw new Error("Gagal extract token URL");
  
  const data = JSON.parse(match[1]);
  const tokenUrl = `${data.webtoken_url}?action=ajax_get_webtoken&security=${data.security}`;
  
  // Get web token
  const tokenRes = await fetchWithRetry(tokenUrl);
  const tokenJson = await tokenRes.json();
  
  if (!tokenJson.data?.webtoken) throw new Error("Gagal dapat web token");
  return tokenJson.data.webtoken;
}

// Buat form data
function createFormData(imageBuffer) {
  const boundary = "----" + crypto.randomBytes(16).toString("hex");
  const parts = [];
  
  parts.push(Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="image_file"; filename="image.png"\r\nContent-Type: image/png\r\n\r\n`));
  parts.push(imageBuffer);
  parts.push(Buffer.from(`\r\n--${boundary}--\r\n`));
  
  return {
    body: Buffer.concat(parts),
    headers: { 'Content-Type': `multipart/form-data; boundary=${boundary}` }
  };
}

// Remove background
async function removeBackground(imageBuffer) {
  const webToken = await getWebToken();
  const { body, headers } = createFormData(imageBuffer);
  
  const response = await fetchWithRetry("https://api.removal.ai/3.0/remove", {
    method: "POST",
    headers: {
      ...headers,
      'web-token': webToken,
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    },
    body: body
  });
  
  const result = await response.json();
  if (result.status !== 200) {
    throw new Error(result.message || "Gagal remove background");
  }
  
  return result;
}

// ========== EXPRESS ENDPOINTS ==========
module.exports = (app) => {
  
  // POST /tools/removebg (upload file)
  app.post('/tools/removebg', upload.single('image'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          status: false,
          creator: 'AxlyDev',
          error: 'File gambar (image) wajib diupload'
        });
      }
      
      const result = await removeBackground(req.file.buffer);
      
      res.json({
        status: true,
        creator: 'AxlyDev',
        data: {
          preview_url: result.preview_demo || result.low_resolution,
          original_url: result.original,
          width: result.original_width,
          height: result.original_height
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
  
  // GET /tools/removebg?url=...
  app.get('/tools/removebg', async (req, res) => {
    try {
      const { url } = req.query;
      
      if (!url) {
        return res.status(400).json({
          status: false,
          creator: 'AxlyDev',
          error: 'Parameter url (gambar) wajib diisi'
        });
      }
      
      // Download gambar
      const imgRes = await fetch(url);
      if (!imgRes.ok) throw new Error('Gagal download gambar');
      const imageBuffer = Buffer.from(await imgRes.arrayBuffer());
      
      const result = await removeBackground(imageBuffer);
      
      res.json({
        status: true,
        creator: 'AxlyDev',
        data: {
          preview_url: result.preview_demo || result.low_resolution,
          original_url: result.original,
          width: result.original_width,
          height: result.original_height
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
