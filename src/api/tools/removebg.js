// removebg.js - Remove background gambar (gratis via removal.ai)
const crypto = require("crypto");

// ========== HELPER FUNCTIONS ==========
const removal = {
  // fetch boilerplate
  _hit: async (url, fetchName = "lu lupa isi fetch name", returnType = "text", opts = {}) => {
    const response = await fetch(url, opts);
    if (!response.ok) {
      const errorText = await response.text().catch(() => "");
      throw new Error(`fetch fail\n${response.status} ${response.statusText}\nat: ${fetchName}\n${errorText.slice(0, 500)}`);
    }
    try {
      if (returnType === "json") return await response.json();
      return await response.text();
    } catch (err) {
      const text = await response.text().catch(() => "");
      throw new Error(`fetch berhasil tapi gagal convert ke ${returnType}\n${err.message}\nat: ${fetchName}\n${text.slice(0, 500)}`);
    }
  },

  // bikin formdata
  _formData: (imageBuffer) => {
    const randomBoundary = "----WebKitFormBoundary" + Math.random().toString(32).slice(2);
    const randomName = crypto.randomBytes(16).toString("hex");
    const buffers = [];
    buffers.push(Buffer.from("--" + randomBoundary + "\r\nContent-Disposition: form-data; name=\"image_file\"; filename=\"" + randomName + ".png\"\r\nContent-Type: image/png\r\n\r\n"));
    buffers.push(imageBuffer);
    buffers.push(Buffer.from("\r\n--" + randomBoundary + "--\r\n"));
    const body = Buffer.concat(buffers);
    const formDataHeaders = { "content-type": "multipart/form-data; boundary=" + randomBoundary };
    return { formDataHeaders, body };
  },

  // dapetin web token
  getWebToken: async () => {
    const html = await removal._hit("https://removal.ai/", "hit homepage");
    const match = html.match(/var ajax_upload_object = (.*?);/)?.[1];
    if (!match) throw new Error(`tidak menemukan match pada homepage`);
    const { webtoken_url, security } = JSON.parse(match);
    const webTokenUrl = `${webtoken_url}?action=ajax_get_webtoken&security=${security}`;
    const json = await removal._hit(webTokenUrl, "mendapatkan web token", "json");
    const webToken = json?.data?.webtoken;
    if (!webToken) throw new Error(`berhasil hit url web token tapi gak ada token nya`);
    return webToken;
  },

  // main function remove background
  removeBackground: async (imageBuffer) => {
    const { formDataHeaders, body } = removal._formData(imageBuffer);
    const headers = {
      "web-token": await removal.getWebToken(),
      ...formDataHeaders
    };
    const opts = {
      headers,
      body,
      method: "POST"
    };
    const result = await removal._hit("https://api.removal.ai/3.0/remove", "remove background", "json", opts);
    return result;
  }
};

// ========== MULTER CONFIG ==========
const multer = require("multer");
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'image/jpeg' || file.mimetype === 'image/jpg' || file.mimetype === 'image/png') {
      cb(null, true);
    } else {
      cb(new Error('Format harus JPG/JPEG/PNG'));
    }
  }
});

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
      
      const result = await removal.removeBackground(req.file.buffer);
      
      res.json({
        status: true,
        creator: 'AxlyDev',
        data: {
          original_width: result.original_width,
          original_height: result.original_height,
          preview_width: result.preview_width,
          preview_height: result.preview_height,
          preview_url: result.preview_demo || result.low_resolution,
          original_url: result.original
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
      
      // Download gambar dari URL
      const imageResponse = await fetch(url);
      if (!imageResponse.ok) {
        throw new Error('Gagal download gambar dari URL');
      }
      const imageBuffer = Buffer.from(await imageResponse.arrayBuffer());
      
      const result = await removal.removeBackground(imageBuffer);
      
      res.json({
        status: true,
        creator: 'AxlyDev',
        data: {
          original_width: result.original_width,
          original_height: result.original_height,
          preview_width: result.preview_width,
          preview_height: result.preview_height,
          preview_url: result.preview_demo || result.low_resolution,
          original_url: result.original
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
  
};            fs.unlinkSync(tempPath);
            
            res.json({
                status: true,
                creator: 'FlowFalcon',
                result: {
                    original_url: url,
                    result_url: resultUrl
                }
            });
        } catch (error) {
            console.error(error);
            res.status(500).json({
                status: false,
                error: error.message || 'Gagal menghapus background'
            });
        }
    });

    // Endpoint untuk upload file langsung (buat bot WA)
    const multer = require('multer');
    const upload = multer({ dest: '/tmp/' });
    
    app.post('/tools/removebg', upload.single('file'), async (req, res) => {
        try {
            if (!req.file) {
                return res.status(400).json({
                    status: false,
                    error: 'Kirim file gambar dengan key "file"'
                });
            }
            
            const resultUrl = await client.removeBackground(req.file.path);
            
            // Hapus file temporary
            fs.unlinkSync(req.file.path);
            
            res.json({
                status: true,
                creator: 'FlowFalcon',
                result: {
                    result_url: resultUrl
                }
            });
        } catch (error) {
            res.status(500).json({
                status: false,
                error: error.message
            });
        }
    });
};
