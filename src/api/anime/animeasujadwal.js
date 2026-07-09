const axios = require('axios');
const cheerio = require('cheerio');

const BASE_URL = "https://v1.animasu.work";

const getCreator = () => {
  return (global.apikey && global.apikey[0]) ? global.apikey[0] : 'AxlyDev';
};

module.exports = (app) => {
  
  app.get('/anime/animasu/schedule', async (req, res) => {
    try {
      const { data } = await axios.get(`${BASE_URL}/jadwal/`, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9',
          'Accept-Language': 'en-US,en;q=0.9',
          'Cache-Control': 'no-cache',
          'Referer': BASE_URL,
          'Cookie': 'cf_clearance=1; _ga=1; _ym_uid=1; _ym_d=1; _ym_isad=1'
        },
        timeout: 30000
      });

      const $ = cheerio.load(data);
      
      // ─── URUTAN HARI ──────────────────────────────────────
      const daysInOrder = ['Kamis', 'Jumat', 'Sabtu', 'Minggu', 'Senin', 'Selasa', 'Rabu'];
      const schedule = {
        Kamis: [],
        Jumat: [],
        Sabtu: [],
        Minggu: [],
        Senin: [],
        Selasa: [],
        Rabu: [],
        'Update Acak': []
      };

      // ─── Ambil SEMUA .bixbox di .postbody ──────────────
      $('.postbody .bixbox').each((_, box) => {
        const $box = $(box);
        
        // Cari judul hari dari .releases h3 span
        const dayTitle = $box.find('.releases h3 span').text().trim();
        
        // Cari semua anime di .listupd .bs
        const animeList = [];
        $box.find('.listupd .bs').each((_, el) => {
          const $el = $(el);
          const title = $el.find('.tt').text().trim();
          const link = $el.find('.bsx a').attr('href');
          const image = $el.find('img').attr('src');
          const episode = $el.find('.bt .epx').text().trim();
          const subStatus = $el.find('.bt .sb').text().trim();
          
          if (title) {
            animeList.push({
              title: title,
              link: link,
              image: image,
              episode: episode,
              sub_status: subStatus
            });
          }
        });

        // ─── Masukkan ke schedule ──────────────────────────
        if (dayTitle === 'Update Acak') {
          schedule['Update Acak'] = animeList;
        } else if (daysInOrder.includes(dayTitle)) {
          schedule[dayTitle] = animeList;
        }
      });

      // ─── Response ──────────────────────────────────────────
      res.json({
        status: true,
        creator: getCreator(),
        result: {
          source: BASE_URL,
          last_updated: new Date().toISOString(),
          schedule: schedule
        }
      });

    } catch (error) {
      console.error('[Animasu Schedule Error]', error.message);
      res.status(500).json({
        status: false,
        creator: getCreator(),
        error: error.message
      });
    }
  });
};
