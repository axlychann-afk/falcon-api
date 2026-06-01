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
    
    // 🔥 KUNCI: Redirect ke URL embed yang bersih (tanpa UI) 🔥
    const cleanEmbedUrl = `https://www.dailymotion.com/embed/video/${videoId}?ui=0`;
    
    const { raw } = req.query;
    
    if (raw === 'true') {
      // Kalo minta JSON, kasih tahu URL-nya
      return res.json({
        status: true,
        creator: getCreator(),
        result: {
          video_id: videoId,
          embed_url: cleanEmbedUrl,
          note: 'Buka URL ini di browser untuk menonton video tanpa UI'
        }
      });
    }
    
    // Redirect otomatis ke URL embed yang bersih
    res.redirect(cleanEmbedUrl);
  });
};
