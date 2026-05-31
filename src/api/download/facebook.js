const axios = require("axios");
const forge = require("node-forge");
const crypto = require("crypto");

// Konfigurasi
const API = "https://api.hitube.io";
const WEB = "https://www.hitube.io";
const PUBLIC_KEY =
  "MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQDCAdf/EyIbLBxjGqmh7qLU6/CPCzru+75+82OSPZ+nf4BFvg88drpZ6KigNW0J8TNgxe6Yms1irCZNVDyu+RXsl4y/7c2KOHc4OGTzHB5fUMiMasFUvcEs2P70e6yA/sKHZfBLG1XPhlb84Ibs3nhD3W5e2SuC+4EuVkaqzN08LQIDAQAB";

const UA =
  "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Mobile Safari/537.36";

function createSessionId() {
  const random = crypto.randomBytes(6).toString("base64url").slice(0, 10);
  return `hitube.io_${random}_${Date.now()}`;
}

function createSecureMessage() {
  const pem = `-----BEGIN PUBLIC KEY-----\n${PUBLIC_KEY.match(/.{1,64}/g).join("\n")}\n-----END PUBLIC KEY-----`;
  const publicKey = forge.pki.publicKeyFromPem(pem);
  const encrypted = publicKey.encrypt(Date.now().toString(), "RSAES-PKCS1-V1_5");
  return forge.util.encode64(encrypted);
}

function mediaUrl(token, sessionid) {
  return `${API}/st-tik-video/token/${encodeURIComponent(token)}?sessionid=${encodeURIComponent(sessionid)}&wh=www.hitube.io`;
}

function mapMedia(item, sessionid) {
  const data = {
    type: item.type || "file",
    url: item.url ? mediaUrl(item.url, sessionid) : null
  };

  if (item.tag) data.quality = item.tag;
  if (item.size) data.size = item.size;
  if (item.cover) data.cover = mediaUrl(item.cover, sessionid);
  if (item.thumb) data.thumbnail = mediaUrl(item.thumb, sessionid);

  return data;
}

async function hitube(url) {
  const sessionid = createSessionId();

  try {
    const res = await axios.get(`${API}/st-tik-video/fb/dl`, {
      timeout: 60000,
      validateStatus: () => true,
      params: {
        url,
        sessionid
      },
      headers: {
        "x-secure-message": createSecureMessage(),
        "accept": "application/json, text/plain, */*",
        "origin": WEB,
        "referer": `${WEB}/`,
        "user-agent": UA
      }
    });

    const data = res.data;

    if (res.status !== 200 || data?.code !== 200) {
      return {
        success: false,
        code: data?.code || res.status,
        error: "Gagal mendapatkan data dari hitube"
      };
    }

    const list = Array.isArray(data?.result?.fbBos) ? data.result.fbBos : [];
    const result = list.map(item => mapMedia(item, sessionid)).filter(item => item.url);

    return {
      success: result.length > 0,
      code: data.code,
      data: result
    };
  } catch (e) {
    return {
      success: false,
      code: e.response?.status || 500,
      error: e.message
    };
  }
}

module.exports = (app) => {
  app.get("/download/facebook", async (req, res) => {
    try {
      const { url } = req.query;

      // Validasi URL
      if (!url) {
        return res.status(400).json({
          status: false,
          creator: global.apikey?.[0] || "AxlyDev",
          error: "Parameter 'url' diperlukan"
        });
      }

      // Validasi URL Facebook
      if (!url.includes("facebook.com") && !url.includes("fb.watch")) {
        return res.status(400).json({
          status: false,
          creator: global.apikey?.[0] || "AxlyDev",
          error: "URL harus dari Facebook (facebook.com atau fb.watch)"
        });
      }

      const result = await hitube(url);

      if (!result.success) {
        return res.status(400).json({
          status: false,
          creator: global.apikey?.[0] || "AxlyDev",
          error: result.error || "Gagal mendownload video",
          code: result.code
        });
      }

      res.json({
        status: true,
        creator: global.apikey?.[0] || "AxlyDev",
        data: {
          url: url,
          media: result.data
        }
      });

    } catch (error) {
      console.error("Facebook Download Error:", error);
      res.status(500).json({
        status: false,
        creator: global.apikey?.[0] || "AxlyDev",
        error: error.message
      });
    }
  });

  // Support POST juga (buat upload file nanti kalo perlu)
  app.post("/download/facebook", async (req, res) => {
    try {
      const { url } = req.body;

      if (!url) {
        return res.status(400).json({
          status: false,
          creator: global.apikey?.[0] || "AxlyDev",
          error: "Parameter 'url' diperlukan"
        });
      }

      const result = await hitube(url);

      if (!result.success) {
        return res.status(400).json({
          status: false,
          creator: global.apikey?.[0] || "AxlyDev",
          error: result.error || "Gagal mendownload video"
        });
      }

      res.json({
        status: true,
        creator: global.apikey?.[0] || "AxlyDev",
        data: {
          url: url,
          media: result.data
        }
      });

    } catch (error) {
      res.status(500).json({
        status: false,
        creator: global.apikey?.[0] || "AxlyDev",
        error: error.message
      });
    }
  });
};
