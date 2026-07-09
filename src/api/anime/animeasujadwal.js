const axios = require('axios');
const cheerio = require('cheerio');

const BASE_URL = "https://v1.animasu.work";

const getCreator = () => {
  return (global.apikey && global.apikey[0]) ? global.apikey[0] : 'AxlyDev';
};

module.exports = (app) => {
  
  app.get('/anime/animasu/schedule', async (req, res) => {
    try {
      // Ambil halaman jadwal
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

      const days = ['Kamis', 'Jumat', 'Sabtu', 'Minggu', 'Senin', 'Selasa', 'Rabu'];
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
        if (days.includes(line)) {
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

        // ─── Cek "Sudah Rilis!" ─────────────────────────────
        if (line === 'Sudah Rilis!') {
          const status = 'Sudah Rilis';
          i++;
          
          // Ambil semua anime setelah status sampai ketemu hari berikutnya
          while (i < lines.length) {
            const nextLine = lines[i];
            
            // Berhenti jika ketemu hari baru
            if (days.includes(nextLine) || nextLine === 'Update Acak') {
              break;
            }
            
            // Skip "??", waktu, atau angka
            if (nextLine === '??' || 
                nextLine.match(/\d+h\s+\d+j\s+\d+m\s+lagi/) ||
                nextLine.match(/^\d+$/)) {
              i++;
              continue;
            }
            
            // Ambil judul anime
            if (nextLine.length > 2) {
              let episodeCount = null;
              let nextIdx = i + 1;
              if (nextIdx < lines.length && lines[nextIdx].match(/^\d+$/)) {
                episodeCount = parseInt(lines[nextIdx]);
                i = nextIdx;
              }
              
              const entry = {
                title: nextLine,
                status: status,
                time: null,
                episode_count: episodeCount
              };
              
              if (currentDay && schedule[currentDay]) {
                schedule[currentDay].push(entry);
              }
              i++;
            } else {
              i++;
            }
          }
          continue;
        }

        // ─── Cek "??" (status unknown) ──────────────────────
        if (line === '??') {
          const status = 'Unknown';
          i++;
          
          // Ambil waktu jika ada
          let time = null;
          if (i < lines.length && lines[i].match(/\d+h\s+\d+j\s+\d+m\s+lagi/)) {
            time = lines[i];
            i++;
          }
          
          // Skip angka (episode count) jika ada
          if (i < lines.length && lines[i].match(/^\d+$/)) {
            i++;
          }
          
          // Ambil judul anime
          if (i < lines.length) {
            const nextLine = lines[i];
            if (nextLine && 
                !days.includes(nextLine) && 
                nextLine !== 'Update Acak' &&
                nextLine !== 'Sudah Rilis!' &&
                !nextLine.match(/^\d+$/) &&
                !nextLine.match(/\d+h\s+\d+j\s+\d+m\s+lagi/) &&
                nextLine !== '??' &&
                nextLine.length > 2) {
              
              let episodeCount = null;
              let nextIdx = i + 1;
              if (nextIdx < lines.length && lines[nextIdx].match(/^\d+$/)) {
                episodeCount = parseInt(lines[nextIdx]);
                i = nextIdx;
              }
              
              const entry = {
                title: nextLine,
                status: status,
                time: time,
                episode_count: episodeCount
              };
              
              if (currentDay && schedule[currentDay]) {
                schedule[currentDay].push(entry);
              }
              i++;
            }
          }
          continue;
        }

        // ─── Cek Waktu ──────────────────────────────────────
        if (line.match(/\d+h\s+\d+j\s+\d+m\s+lagi/)) {
          const time = line;
          i++;
          
          // Skip angka jika ada
          if (i < lines.length && lines[i].match(/^\d+$/)) {
            i++;
          }
          
          // Ambil judul anime
          if (i < lines.length) {
            let nextLine = lines[i];
            if (nextLine === '??') {
              i++;
              if (i < lines.length) nextLine = lines[i];
            }
            
            if (nextLine && 
                !days.includes(nextLine) && 
                nextLine !== 'Update Acak' &&
                nextLine !== 'Sudah Rilis!' &&
                !nextLine.match(/^\d+$/) &&
                !nextLine.match(/\d+h\s+\d+j\s+\d+m\s+lagi/) &&
                nextLine !== '??' &&
                nextLine.length > 2) {
              
              let episodeCount = null;
              let nextIdx = i + 1;
              if (nextIdx < lines.length && lines[nextIdx].match(/^\d+$/)) {
                episodeCount = parseInt(lines[nextIdx]);
                i = nextIdx;
              }
              
              const entry = {
                title: nextLine,
                status: 'Unknown',
                time: time,
                episode_count: episodeCount
              };
              
              if (currentDay && schedule[currentDay]) {
                schedule[currentDay].push(entry);
              }
              i++;
            }
          }
          continue;
        }

        i++;
      }

      // ─── Hapus hari kosong ──────────────────────────────
      for (const day of Object.keys(schedule)) {
        if (schedule[day].length === 0) {
          delete schedule[day];
        }
      }

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
