const axios = require('axios');
const cheerio = require('cheerio');

const BASE_URL = "https://anichin.moe";

const getCreator = () => {
  return (global.apikey && global.apikey[0]) ? global.apikey[0] : 'AxlyDev';
};

module.exports = (app) => {
  
  app.get('/donghua/schedule', async (req, res) => {
    try {
      const { data } = await axios.get(`${BASE_URL}/schedule/`, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        },
        timeout: 15000
      });
      
      const $ = cheerio.load(data);
      const schedule = {};
      
      // Parse setiap hari
      $('.listSchh').each((_, el) => {
        const day = $(el).find('h2').text().trim();
        const animes = [];
        
        $(el).find('.subSchh a').each((_, a) => {
          const title = $(a).text().trim();
          const slug = $(a).attr('href').replace(/^\//, '').replace(/\/$/, '');
          const url = $(a).attr('href');
          
          // Bersihkan title dari [SVIP] jika ada
          const cleanTitle = title.replace('[SVIP] ', '');
          
          animes.push({
            title: cleanTitle,
            slug: slug,
            url: url.startsWith('http') ? url : `${BASE_URL}${url}`,
            is_vip: title.includes('[SVIP]')
          });
        });
        
        if (animes.length > 0) {
          schedule[day] = animes;
        }
      });
      
      res.json({
        status: true,
        creator: getCreator(),
        result: schedule
      });
      
    } catch (error) {
      console.error('[Schedule Error]', error.message);
      res.status(500).json({
        status: false,
        creator: getCreator(),
        error: error.message
      });
    }
  });
};
