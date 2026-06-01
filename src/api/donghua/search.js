const axios = require('axios');
const cheerio = require('cheerio');

const BASE_URL = "https://anichin.moe";

const getCreator = () => {
  return (global.apikey && global.apikey[0]) ? global.apikey[0] : 'AxlyDev';
};

module.exports = (app) => {
  
  app.get('/donghua/search', async (req, res) => {
    const { q, page = 1 } = req.query;
    
    if (!q) {
      return res.status(400).json({
        status: false,
        creator: getCreator(),
        error: 'Parameter "q" diperlukan (contoh: ?q=renegade+immortal)'
      });
    }
    
    try {
      const searchUrl = `${BASE_URL}/page/${page}/?s=${encodeURIComponent(q)}`;
      console.log('[Search] URL:', searchUrl);
      
      const { data } = await axios.get(searchUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        },
        timeout: 15000
      });
      
      const $ = cheerio.load(data);
      const results = [];
      
      // Parse dari class .listupd .bs (berdasarkan HTML yang kamu kasih)
      $('.listupd .bs').each((_, el) => {
        const link = $(el).find('.bsx a').attr('href') || "";
        const title = $(el).find('.tt').text().trim() || "";
        const status = $(el).find('.status').text().trim() || null;
        const type = $(el).find('.typez').text().trim() || null;
        const episodeInfo = $(el).find('.epx').text().trim() || null;
        const thumbnail = $(el).find('img').attr('src') || null;
        
        if (title && link) {
          // Buat URL lengkap
          const fullUrl = link.startsWith('http') ? link : `${BASE_URL}${link}`;
          
          results.push({
            title: title,
            slug: extractSlug(link),
            url: fullUrl,
            status: status,
            type: type,
            episode: episodeInfo,
            thumbnail: thumbnail
          });
        }
      });
      
      res.json({
        status: true,
        creator: getCreator(),
        query: q,
        page: parseInt(page),
        total: results.length,
        results: results
      });
      
    } catch (error) {
      console.error('[Search Error]', error.message);
      res.status(500).json({
        status: false,
        creator: getCreator(),
        error: error.message
      });
    }
  });
};

// Helper function ekstrak slug
function extractSlug(url) {
  if (!url) return "";
  // Hapus leading slash
  let slug = url.startsWith('/') ? url.substring(1) : url;
  // Hapus trailing slash
  if (slug.endsWith('/')) slug = slug.slice(0, -1);
  return slug;
}
