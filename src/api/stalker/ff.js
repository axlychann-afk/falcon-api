// ff.js - Free Fire Stalker (support region ALL)
const axios = require('axios');

async function getFFPlayer(uid, region = 'ALL', matchType = 'all') {
  try {
    const url = `https://freefirehub.com/api/player/${uid}?region=${region}&matchType=${matchType}`;
    
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Linux; Android 16; Infinix X6837) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.7778.120 Mobile Safari/537.36',
        'x-requested-with': 'com.xbrowser.play',
        'referer': 'https://freefirehub.com/player-tracker',
        'accept-language': 'en-ID,en;q=0.9'
      },
      timeout: 30000
    });

    if (!response.data) {
      throw new Error('Gagal mengambil data');
    }

    return {
      success: true,
      data: response.data
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
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
  
  // GET /stalk/ff?uid=1234567890&region=ALL&matchType=all
  app.get('/stalk/ff', async (req, res) => {
    try {
      const { uid, region = 'ALL', matchType = 'all' } = req.query;
      
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
      
      const result = await getFFPlayer(uid, region, matchType);
      
      if (!result.success) {
        return res.status(500).json({
          status: false,
          creator: 'AxlyDev',
          error: result.error
        });
      }
      
      const data = result.data;
      
      // Format response
      const response = {
        status: true,
        creator: 'AxlyDev',
        result: {
          uid: uid,
          nickname: data.nickname || '-',
          region: formatRegion(data.region || region),
          region_code: data.region || region,
          level: data.level || 0,
          avatar: data.avatar || null,
          exp: data.exp || 0,
          created_at: data.created_at || '-',
          last_login: data.last_login || '-',
          clan: data.clan?.name || '-',
          signature: data.signature || '-'
        }
      };
      
      // Statistik BR (Battle Royale)
      if (data.br_stats) {
        response.result.br_stats = {
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
      
      // Statistik CS (Clash Squad)
      if (data.cs_stats) {
        response.result.cs_stats = {
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
      
      // Match terakhir (max 5)
      if (data.last_matches && data.last_matches.length > 0) {
        response.result.last_matches = data.last_matches.slice(0, 5).map(match => ({
          mode: match.mode,
          result: match.result,
          kills: match.kills,
          deaths: match.deaths,
          assists: match.assists,
          damage: match.damage,
          date: match.date
        }));
      }
      
      res.json(response);
      
    } catch (error) {
      res.status(500).json({
        status: false,
        creator: 'AxlyDev',
        error: error.message
      });
    }
  });
  
};
