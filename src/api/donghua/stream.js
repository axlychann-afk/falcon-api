const axios = require('axios');
const cheerio = require('cheerio');

const BASE_URL = "https://anichin.moe";

const getCreator = () => {
  return (global.apikey && global.apikey[0]) ? global.apikey[0] : 'AxlyDev';
};

module.exports = (app) => {
  
  app.get('/donghua/stream', async (req, res) => {
    const { slug } = req.query;
    
    if (!slug) {
      return res.status(400).json({
        status: false,
        creator: getCreator(),
        error: 'Parameter "slug" diperlukan (contoh: ?slug=tales-of-herding-gods-episode-85-subtitle-indonesia)'
      });
    }
    
    try {
      // Ambil halaman episode dari anichin.moe
      const { data } = await axios.get(`${BASE_URL}/${slug}/`, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        },
        timeout: 15000
      });
      
      const $ = cheerio.load(data);
      
      // Cari iframe Dailymotion
      let streamUrl = null;
      let videoId = null;
      
      $('iframe[src*="dailymotion.com"]').each((_, el) => {
        const src = $(el).attr('src');
        if (src) {
          // Extract ID video dari URL
          const match = src.match(/video=([a-zA-Z0-9]+)/);
          if (match) {
            videoId = match[1];
            streamUrl = `https://www.dailymotion.com/embed/video/${videoId}?ui=0&autoplay=1`;
          }
          return false; // stop setelah nemu
        }
      });
      
      // Fallback: cari dari link
      if (!streamUrl) {
        $('a[href*="dailymotion.com"]').each((_, el) => {
          const href = $(el).attr('href');
          if (href) {
            const match = href.match(/dailymotion\.com\/video\/([a-zA-Z0-9]+)/);
            if (match) {
              videoId = match[1];
              streamUrl = `https://www.dailymotion.com/embed/video/${videoId}?ui=0&autoplay=1`;
            }
          }
          return false;
        });
      }
      
      if (!streamUrl) {
        return res.status(404).json({
          status: false,
          creator: getCreator(),
          error: 'Link streaming tidak ditemukan',
          note: 'Pastikan slug episode benar. Contoh: tales-of-herding-gods-episode-85-subtitle-indonesia'
        });
      }
      
      // Ambil judul episode
      const title = $('.entry-title').text().trim() || 'Donghua Episode';
      
      // Ambil info prev/next episode
      let prevEpisode = null;
      let nextEpisode = null;
      
      $('.naveps .nvs a').each((_, el) => {
        const href = $(el).attr('href');
        const text = $(el).text().trim();
        if (href && text) {
          const epSlug = href.split('/').filter(p => p).pop();
          if (text.toLowerCase().includes('prev')) {
            prevEpisode = { slug: epSlug, url: href };
          } else if (text.toLowerCase().includes('next')) {
            nextEpisode = { slug: epSlug, url: href };
          }
        }
      });
      
      res.json({
        status: true,
        creator: getCreator(),
        result: {
          title: title,
          video_id: videoId,
          stream_url: streamUrl,
          embed_html: `<iframe src="${streamUrl}" frameborder="0" allowfullscreen style="width:100%;height:100%;min-height:400px;"></iframe>`,
          prev_episode: prevEpisode,
          next_episode: nextEpisode
        }
      });
      
    } catch (error) {
      console.error('[Donghua Stream Error]', error.message);
      
      if (error.response?.status === 404) {
        return res.status(404).json({
          status: false,
          creator: getCreator(),
          error: 'Episode tidak ditemukan',
          note: 'Periksa kembali slug episode'
        });
      }
      
      res.status(500).json({
        status: false,
        creator: getCreator(),
        error: error.message
      });
    }
  });
};
