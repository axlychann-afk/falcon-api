const axios = require('axios');
const cheerio = require('cheerio');

const getCreator = () => {
  return (global.apikey && global.apikey[0]) ? global.apikey[0] : 'AxlyDev';
};

function extractDailymotionId(url) {
  let match = url.match(/dailymotion\.com\/video\/([a-zA-Z0-9]+)/);
  if (match) return match[1];
  match = url.match(/dai\.ly\/([a-zA-Z0-9]+)/);
  if (match) return match[1];
  match = url.match(/video=([a-zA-Z0-9]+)/);
  if (match) return match[1];
  return null;
}

async function getDirectMp4(videoId) {
  try {
    // Method 1: Coba API dulu
    const apiUrl = `https://www.dailymotion.com/player/metadata/video/${videoId}`;
    const { data } = await axios.get(apiUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/json',
        'Referer': 'https://www.dailymotion.com/',
        'Origin': 'https://www.dailymotion.com'
      },
      timeout: 15000
    });
    
    let mp4Url = null;
    
    // Cek berbagai kemungkinan struktur response
    if (data.qualities) {
      const qualities = ['auto', '1080', '720', '480', '380', '240'];
      for (const quality of qualities) {
        if (data.qualities[quality] && data.qualities[quality][0]?.url) {
          mp4Url = data.qualities[quality][0].url;
          break;
        }
      }
    }
    
    if (!mp4Url && data.streams) {
      const streams = data.streams;
      if (streams.hls_url) mp4Url = streams.hls_url;
      if (streams.dash_url) mp4Url = streams.dash_url;
    }
    
    if (!mp4Url && data.progressive) {
      mp4Url = data.progressive[0]?.url;
    }
    
    return {
      success: !!mp4Url,
      title: data.title || 'Donghua',
      mp4_url: mp4Url,
      thumbnail: data.thumbnail_url || null
    };
    
  } catch (error) {
    console.error('[Dailymotion Error]', error.message);
    return { success: false, error: error.message };
  }
}

module.exports = (app) => {
  
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
        error: 'Parameter "url" atau "id" diperlukan'
      });
    }
    
    try {
      const result = await getDirectMp4(videoId);
      
      if (!result.success || !result.mp4_url) {
        // Kalo gagal, return embed URL biar user buka manual
        return res.json({
          status: false,
          creator: getCreator(),
          error: 'MP4 URL tidak ditemukan, coba buka link ini di browser',
          fallback_url: `https://www.dailymotion.com/embed/video/${videoId}`
        });
      }
      
      // Redirect ke MP4
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
