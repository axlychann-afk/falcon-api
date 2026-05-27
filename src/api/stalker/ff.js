// ffhub.js - Free Fire Stalker via freefirehub.com (otomatis deteksi region)
const axios = require('axios');

// Daftar region yang didukung
const REGIONS = ['ID', 'SG', 'TH', 'BR', 'IN', 'MY', 'VN', 'PK', 'BD', 'EG'];

async function detectRegion(uid) {
  // Coba semua region sampai dapet yang berhasil
  for (const region of REGIONS) {
    try {
      const url = `https://freefirehub.com/api/player/${uid}?region=${region}&type=all`;
      const response = await axios.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Linux; Android 16) AppleWebKit/537.36',
          'Accept': 'application/json'
        },
        timeout: 5000
      });
      
      if (response.data && response.data.nickname && !response.data.error) {
        return { region, data: response.data };
      }
    } catch (e) {
      // Lanjut ke region berikutnya
      continue;
    }
  }
  throw new Error('UID tidak ditemukan di semua region');
}

function formatRegion(regionCode) {
  const regions = {
    'ID': 'Indonesia',
    'SG': 'Singapore',
    'TH': 'Thailand',
    'BR': 'Brazil',
    'IN': 'India',
    'MY': 'Malaysia',
    'VN': 'Vietnam',
    'PK': 'Pakistan',
    'BD': 'Bangladesh',
    'EG': 'Egypt'
  };
  return regions[regionCode] || regionCode;
}

function formatRank(rank) {
  const ranks = {
    0: 'Unranked',
    1: 'Bronze I',
    2: 'Bronze II',
    3: 'Bronze III',
    4: 'Silver I',
    5: 'Silver II',
    6: 'Silver III',
    7: 'Gold I',
    8: 'Gold II',
    9: 'Gold III',
    10: 'Platinum I',
    11: 'Platinum II',
    12: 'Platinum III',
    13: 'Diamond I',
    14: 'Diamond II',
    15: 'Diamond III',
    16: 'Heroic',
    17: 'Grand Master',
    18: 'Elite Grand Master'
  };
  return ranks[rank] || rank;
}

module.exports = (app) => {
  
  // GET /stalk/ffhub?uid=1234567890
  app.get('/stalk/ff', async (req, res) => {
    try {
      const { uid } = req.query;
      
      if (!uid) {
        return res.status(400).json({
          status: false,
          creator: 'AxlyDev',
          error: 'Parameter uid (UID Free Fire) wajib diisi'
        });
      }
      
      // Validasi UID (8-9 digit angka)
      if (!/^\d{8,9}$/.test(uid)) {
        return res.status(400).json({
          status: false,
          creator: 'AxlyDev',
          error: 'UID harus berupa angka 8-9 digit'
        });
      }
      
      // Deteksi region otomatis
      const { region, data } = await detectRegion(uid);
      
      // Format response
      const result = {
        uid: uid,
        nickname: data.nickname || '-',
        region: formatRegion(region),
        region_code: region,
        level: data.level || 0,
        avatar: data.avatar || null,
        exp: data.exp || 0,
        created_at: data.created_at || '-',
        last_login: data.last_login || '-',
        clan: data.clan?.name || '-',
        signature: data.signature || '-'
      };
      
      // Statistik BR
      if (data.br_stats) {
        result.br_stats = {
          rank: formatRank(data.br_stats.rank),
          rank_points: data.br_stats.rank_points || 0,
          total_matches: data.br_stats.total_matches || 0,
          wins: data.br_stats.wins || 0,
          kills: data.br_stats.kills || 0,
          deaths: data.br_stats.deaths || 0,
          kd_ratio: data.br_stats.kd_ratio || 0,
          headshots: data.br_stats.headshots || 0,
          top_10: data.br_stats.top_10 || 0
        };
      }
      
      // Statistik CS
      if (data.cs_stats) {
        result.cs_stats = {
          rank: formatRank(data.cs_stats.rank),
          rank_points: data.cs_stats.rank_points || 0,
          total_matches: data.cs_stats.total_matches || 0,
          wins: data.cs_stats.wins || 0,
          kills: data.cs_stats.kills || 0,
          deaths: data.cs_stats.deaths || 0,
          kd_ratio: data.cs_stats.kd_ratio || 0,
          headshots: data.cs_stats.headshots || 0
        };
      }
      
      // Match terakhir (ambil 5)
      if (data.last_matches && data.last_matches.length > 0) {
        result.last_matches = data.last_matches.slice(0, 5).map(match => ({
          mode: match.mode,
          result: match.result,
          kills: match.kills,
          deaths: match.deaths,
          assists: match.assists,
          damage: match.damage,
          date: match.date
        }));
      }
      
      res.json({
        status: true,
        creator: 'AxlyDev',
        result: result
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
