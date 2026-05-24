// ytdown.js - YouTube Downloader via SaveTube (Fix untuk Node.js)
/***
 *** Scraper By Fgsi (SaveTube)
 *** Adapted for Axly-API
 ***/

const axios = require("axios");
const crypto = require("crypto");

const ENCRYPTION_KEY = Buffer.from("C5D58EF67A7584E4A29F6C35BBC4EB12", "hex");

function decryptAesCbc(encryptedBase64) {
  try {
    const encryptedBuffer = Buffer.from(encryptedBase64, "base64");
    
    const iv = encryptedBuffer.subarray(0, 16);
    const ciphertext = encryptedBuffer.subarray(16);
    
    const decipher = crypto.createDecipheriv("aes-256-cbc", ENCRYPTION_KEY, iv);
    
    let decrypted = decipher.update(ciphertext);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    
    return JSON.parse(decrypted.toString("utf8"));
  } catch (err) {
    throw new Error(`Decrypt failed: ${err.message}`);
  }
}

async function getRandomCdn() {
  const response = await axios.get("https://media.savetube.me/api/random-cdn");
  return response.data.cdn;
}

async function getVideoInfo(url) {
  const cdnHost = await getRandomCdn();
  
  const response = await axios.post(`https://${cdnHost}/v2/info`, { url }, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    },
    timeout: 30000
  });
  
  if (!response.data || !response.data.data) {
    throw new Error("Gagal mendapatkan data dari SaveTube");
  }
  
  return decryptAesCbc(response.data.data);
}

async function getDownload(key, downloadType = "video", quality = 360) {
  const cdnHost = await getRandomCdn();
  
  const response = await axios.post(`https://${cdnHost}/download`, {
    downloadType,
    quality,
    key
  }, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    },
    timeout: 30000
  });
  
  if (!response.data || !response.data.data) {
    throw new Error("Gagal mendapatkan link download");
  }
  
  return response.data.data;
}

async function ytdownDl(url, quality = 360) {
  // Step 1: Dapetin info video
  const info = await getVideoInfo(url);
  
  if (!info || !info.key) {
    throw new Error("Gagal mendapatkan key video");
  }
  
  // Step 2: Siapkan array untuk videos & audios
  const videos = [];
  const audios = [];
  
  // Step 3: Ambil video dengan berbagai kualitas
  const qualities = [144, 240, 360, 480, 720, 1080];
  for (const q of qualities) {
    try {
      const videoData = await getDownload(info.key, "video", q);
      if (videoData && videoData.downloadUrl) {
        videos.push({
          quality: `${q}p`,
          resolution: q >= 720 ? "HD" : "SD",
          size: videoData.size || "-",
          url: videoData.downloadUrl
        });
      }
    } catch (err) {
      // Kualitas tidak tersedia, skip
    }
  }
  
  // Step 4: Ambil audio (128kbps)
  try {
    const audioData = await getDownload(info.key, "audio", 128);
    if (audioData && audioData.downloadUrl) {
      audios.push({
        quality: "128kbps",
        size: audioData.size || "-",
        url: audioData.downloadUrl
      });
    }
  } catch (err) {
    // Audio tidak tersedia
  }
  
  // Step 5: Kalo gagal ambil multiple quality, pake quality default
  if (videos.length === 0) {
    try {
      const videoData = await getDownload(info.key, "video", quality);
      if (videoData && videoData.downloadUrl) {
        videos.push({
          quality: `${quality}p`,
          resolution: quality >= 720 ? "HD" : "SD",
          size: videoData.size || "-",
          url: videoData.downloadUrl
        });
      }
    } catch (err) {
      throw new Error("Gagal mendapatkan link video");
    }
  }
  
  return {
    title: info.title || "-",
    thumbnail: info.thumbnail || info.imagePreviewUrl || "-",
    duration: info.duration || "-",
    channel: info.author || "-",
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
      const result = await ytdownDl(url, videoQuality);
      
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
      
      const result = await ytdownDl(url, 360);
      
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
      
      const result = await ytdownDl(url, 360);
      
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
