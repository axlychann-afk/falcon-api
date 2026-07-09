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
      
      // Ambil semua teks dari .postbody
      const rawText = $('.postbody').text();
      const lines = rawText.split('\n').map(s => s.trim()).filter(s => s.length > 0);

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

      let currentDay = null;
      let i = 0;

      while (i < lines.length) {
        const line = lines[i];

        // ─── Cek Hari ────────────────────────────────────────
        if (daysInOrder.includes(line)) {
          currentDay = line;
          i++;
          continue;
        }

        // ─── Cek "Update Acak" ──────────────────────────────
        if (line === 'Update Acak') {
          currentDay = 'Update Acak';
          i++;
          continue;
        }

        // ─── Skip "Jum'at" ──────────────────────────────────
        if (line === "Jum'at") {
          i++;
          continue;
        }

        // ─── Skip "Sudah Rilis!", "??", waktu, angka ────────
        if (line === 'Sudah Rilis!' || 
            line === '??' || 
            line.match(/\d+h\s+\d+j\s+\d+m\s+lagi/) ||
            line.match(/^\d+$/)) {
          i++;
          continue;
        }

        // ─── Ambil Judul Anime ──────────────────────────────
        if (currentDay && 
            line.length > 2 && 
            !daysInOrder.includes(line) && 
            line !== 'Update Acak' &&
            line !== "Jum'at" &&
            !line.match(/^\d+$/) &&
            !line.match(/\d+h\s+\d+j\s+\d+m\s+lagi/) &&
            line !== 'Sudah Rilis!' &&
            line !== '??') {
          
          schedule[currentDay].push(line);
          i++;
          continue;
        }

        i++;
      }

      // ─── Buat response dengan urutan yang benar ──────────
      const orderedSchedule = {};
      for (const day of daysInOrder) {
        orderedSchedule[day] = schedule[day] || [];
      }
      orderedSchedule['Update Acak'] = schedule['Update Acak'] || [];

      // ─── Response ──────────────────────────────────────────
      res.json({
        status: true,
        creator: getCreator(),
        result: {
          source: BASE_URL,
          last_updated: new Date().toISOString(),
          schedule: orderedSchedule
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
