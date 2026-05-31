/**
 * Facebook Video/Photo Scraper - Direct Implementation
 * Based on hitube.io API
 * 
 * Endpoint: POST /api/download/facebook-hitube
 * Body: { url: "https://www.facebook.com/share/v/xxxxx/" }
 */

import axios from "axios";
import forge from "node-forge";
import crypto from "node:crypto";

const API = "https://api.hitube.io";
const WEB = "https://www.hitube.io";

const PUBLIC_KEY = "MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQDCAdf/EyIbLBxjGqmh7qLU6/CPCzru+75+82OSPZ+nf4BFvg88drpZ6KigNW0J8TNgxe6Yms1irCZNVDyu+RXsl4y/7c2KOHc4OGTzHB5fUMiMasFUvcEs2P70e6yA/sKHZfBLG1XPhlb84Ibs3nhD3W5e2SuC+4EuVkaqzN08LQIDAQAB";

const UA = "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Mobile Safari/537.36";

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
    url: item.url ? mediaUrl(item.url, sessionid) : null,
    quality: item.tag || "default",
    size: item.size || null
  };

  if (item.cover) data.cover = mediaUrl(item.cover, sessionid);
  if (item.thumb) data.thumbnail = mediaUrl(item.thumb, sessionid);

  return data;
}

async function scrapeFacebook(url) {
  if (!url.includes("facebook.com")) {
    throw new Error("Invalid Facebook URL");
  }

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
        accept: "application/json, text/plain, */*",
        origin: WEB,
        referer: `${WEB}/`,
        "user-agent": UA
      }
    });

    const data = res.data;

    if (res.status !== 200 || data?.code !== 200) {
      throw new Error(`API Error: ${data?.code || res.status}`);
    }

    const list = Array.isArray(data?.result?.fbBos) ? data.result.fbBos : [];
    
    if (list.length === 0) {
      throw new Error("No media found");
    }

    const result = list
      .map(item => mapMedia(item, sessionid))
      .filter(item => item.url);

    return {
      status: true,
      url,
      count: result.length,
      media: result,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    throw error;
  }
}

// Export as FALCON-API endpoint
export default (app) => {
  app.post("/api/download/facebook", async (req, res) => {
    try {
      const { url } = req.body;

      if (!url) {
        return res.status(400).json({
          status: 400,
          error: "URL required in body"
        });
      }

      const result = await scrapeFacebook(url);

      res.json({
        status: 200,
        creator: "Axly API",
        data: result
      });
    } catch (error) {
      console.error("[facebook-hitube]", error);
      res.status(500).json({
        status: 500,
        error: error.message
      });
    }
  });

  // Also support GET
  app.get("/api/download/facebook", async (req, res) => {
    try {
      const { url } = req.query;

      if (!url) {
        return res.status(400).json({
          status: 400,
          error: "URL required in query"
        });
      }

      const result = await scrapeFacebook(url);

      res.json({
        status: 200,
        creator: "Axly API",
        data: result
      });
    } catch (error) {
      console.error("[facebook-hitube]", error);
      res.status(500).json({
        status: 500,
        error: error.message
      });
    }
  });
};

// Export for standalone usage
export { scrapeFacebook };
