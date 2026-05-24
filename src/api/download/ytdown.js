// ytdown.js - YouTube Downloader (menggunakan SaveTube engine)
/***
 *** Scraper By Fgsi (SaveTube)
 *** Adapted for Axly-API
 ***/

const axios = require("axios");
const crypto = require("crypto");

class SaveTubeClient {
  constructor() {
    this.ENCRYPTION_KEY_STRING = "C5D58EF67A7584E4A29F6C35BBC4EB12";
  }

  async getRandomCdn() {
    const response = await axios.get("https://media.savetube.me/api/random-cdn");
    return response.data.cdn;
  }

  hexToUint8Array(hexString) {
    try {
      const matched = hexString.match(/[\dA-F]{2}/gi);
      if (!matched) throw new Error("Invalid format");
      return new Uint8Array(matched.map((h) => parseInt(h, 16)));
    } catch (err) {
      throw err;
    }
  }

  async getDecryptionKey() {
    try {
      const keyData = this.hexToUint8Array(this.ENCRYPTION_KEY_STRING);
      return await crypto.webcrypto.subtle.importKey(
        "raw",
        keyData,
        { name: "AES-CBC" },
        false,
        ["decrypt"],
      );
    } catch (err) {
      throw err;
    }
  }

  base64ToArrayBuffer(base64) {
    try {
      const buf = Buffer.from(base64.replace(/\s/g, ""), "base64");
      return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
    } catch (err) {
      throw new Error(`format error: ${err.message}`);
    }
  }

  async decryptApiResponse(encryptedData) {
    try {
      const dataBuffer = this.base64ToArrayBuffer(encryptedData);
      if (dataBuffer.byteLength < 16) {
        throw new Error("Invalid format: insufficient length");
      }

      const iv = dataBuffer.slice(0, 16);
      const ciphertext = dataBuffer.slice(16);
      const key = await this.getDecryptionKey();

      const decrypted = await crypto.webcrypto.subtle.decrypt(
        { name: "AES-CBC", iv: new Uint8Array(iv) },
        key,
        ciphertext,
      );

      const text = new TextDecoder().decode(new Uint8Array(decrypted));
      return JSON.parse(text);
    } catch (err) {
      throw err;
    }
  }

  async getVideoInfo(url) {
    const cdnHost = await this.getRandomCdn();
    try {
      const res = await axios.post(`https://${cdnHost}/v2/info`, { url });
      return this.decryptApiResponse(res.data.data);
    } catch (err) {
      return {
        error: err,
        statusCode: err?.response?.status,
      };
    }
  }

  async getDownload(key, downloadType = "video", quality = 360) {
    const cdnHost = await this.getRandomCdn();
    try {
      const res = await axios.post(`https://${cdnHost}/download`, {
        downloadType,
        quality,
        key,
      });
      return res.data.data;
    } catch (err) {
      return {
        error: err,
        statusCode: err?.response?.status,
      };
    }
  }
}

// ========== FUNGSI UTAMA ==========
async function ytdownDl(url, type = "video", quality = 360) {
  const api = new SaveTubeClient();
  
  const info = await api.getVideoInfo(url);
  
  if (info.error) {
    throw new Error(`Gagal mendapatkan info video: ${info.error.message}`);
  }
  
  if (!info.key) {
    throw new Error('Key video tidak ditemukan');
  }
  
  const download = await api.getDownload(info.key, type, quality);
  
  if (download.error) {
    throw new Error(`Gagal mendapatkan link download: ${download.error.message}`);
  }
  
  // Format videos & audios array
  const videos = [];
  const audios = [];
  
  // Coba ambil berbagai kualitas video
  const videoQualities = [144, 240, 360, 480, 720, 1080];
  for (const q of videoQualities) {
    try {
      const videoDownload = await api.getDownload(info.key, "video", q);
      if (videoDownload && !videoDownload.error) {
        videos.push({
          quality: `${q}p`,
          resolution: q >= 720 ? "HD" : "SD",
          url: videoDownload.downloadUrl
        });
      }
    } catch (e) {
      // skip kualitas yang tidak tersedia
    }
  }
  
  // Ambil audio
  try {
    const audioDownload = await api.getDownload(info.key, "audio", 128);
    if (audioDownload && !audioDownload.error) {
      audios.push({
        quality: "128kbps",
        url: audioDownload.downloadUrl
      });
    }
  } catch (e) {
    // skip
  }
  
  // Kalo gagal ambil multiple quality, pake yang dari download pertama
  if (videos.length === 0 && download.downloadUrl) {
    videos.push({
      quality: `${quality}p`,
      resolution: quality >= 720 ? "HD" : "SD",
      url: download.downloadUrl
    });
  }
  
  return {
    title: info.title || '-',
    thumbnail: info.thumbnail || info.imagePreviewUrl || '-',
    duration: info.duration || '-',
    channel: info.author || '-',
    videos: videos,
    audios: audios
  };
}

// ========== EXPRESS ENDPOINT ==========
module.exports = (app) => {
  
  // GET /download/ytmp4?url=xxx&quality=360
  app.get('/download/ytmp4', async (req, res) => {
    try {
      const { url, quality } = req.query;
      
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
      
      const videoQuality = parseInt(quality) || 360;
      const result = await ytdownDl(url, "video", videoQuality);
      
      res.json({
        status: true,
        creator: 'AxlyDev',
        result: {
          title: result.title,
          thumbnail: result.thumbnail,
          duration: result.duration,
          channel: result.channel,
          videos: result.videos
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
      
      const result = await ytdownDl(url, "audio", 128);
      
      const bestAudio = result.audios.length > 0 ? result.audios[0] : null;
      
      res.json({
        status: true,
        creator: 'AxlyDev',
        result: {
          title: result.title,
          thumbnail: result.thumbnail,
          duration: result.duration,
          channel: result.channel,
          audio: bestAudio,
          all_audios: result.audios
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
  
  // GET /download/ytdown?url=xxx (info lengkap)
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
      
      const result = await ytdownDl(url, "video", 360);
      
      res.json({
        status: true,
        creator: 'AxlyDev',
        result: {
          title: result.title,
          thumbnail: result.thumbnail,
          duration: result.duration,
          channel: result.channel,
          videos: result.videos,
          audios: result.audios
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
