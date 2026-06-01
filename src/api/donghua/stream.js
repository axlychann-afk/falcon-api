const axios = require('axios');

// Creator name dari global atau default
const getCreator = () => {
  return (global.apikey && global.apikey[0]) ? global.apikey[0] : 'AxlyDev';
};

// Fungsi ekstrak ID dari URL Dailymotion
function extractDailymotionId(url) {
  let match = url.match(/dailymotion\.com\/video\/([a-zA-Z0-9]+)/);
  if (match) return match[1];
  
  match = url.match(/dai\.ly\/([a-zA-Z0-9]+)/);
  if (match) return match[1];
  
  match = url.match(/video=([a-zA-Z0-9]+)/);
  if (match) return match[1];
  
  return null;
}

// Ambil MP4 langsung dari Dailymotion API
async function getDirectMp4(videoId) {
  try {
    const { data } = await axios.get(`https://www.dailymotion.com/player/metadata/video/${videoId}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/json',
        'Referer': 'https://www.dailymotion.com/'
      },
      timeout: 15000
    });
    
    // Cari URL MP4 dengan kualitas tertinggi
    let mp4Url = null;
    let bestQuality = 0;
    
    if (data.qualities) {
      Object.keys(data.qualities).forEach(quality => {
        const q = parseInt(quality) || 0;
        const url = data.qualities[quality]?.[0]?.url;
        if (url && q > bestQuality) {
          bestQuality = q;
          mp4Url = url;
        }
      });
    }
    
    // Fallback: ambil dari streams
    if (!mp4Url && data.streams) {
      Object.keys(data.streams).forEach(quality => {
        const url = data.streams[quality]?.[0]?.url;
        if (url) mp4Url = url;
      });
    }
    
    return {
      success: true,
      title: data.title || 'Donghua',
      mp4_url: mp4Url,
      duration: data.duration || null,
      thumbnail: data.thumbnail_url || null
    };
    
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

module.exports = (app) => {
  
  // Endpoint: Convert Dailymotion ke MP4 langsung
  app.get('/donghua/stream', async (req, res) => {
    const { url, id } = req.query;
    
    let videoId = id;
    if (!videoId && url) {
      videoId = extractDailymotionId(url);
    }
    
    if (!videoId) {
      return res.status(400).json({
        status: false,
        creator: getCreator(),
        error: 'Parameter "url" atau "id" diperlukan (URL Dailymotion)'
      });
    }
    
    try {
      const result = await getDirectMp4(videoId);
      
      if (!result.success || !result.mp4_url) {
        return res.status(404).json({
          status: false,
          creator: getCreator(),
          error: result.error || 'MP4 URL tidak ditemukan'
        });
      }
      
      // Redirect langsung ke file MP4
      res.redirect(result.mp4_url);
      
    } catch (error) {
      res.status(500).json({
        status: false,
        creator: getCreator(),
        error: error.message
      });
    }
  });
};
