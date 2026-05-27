// ff.js - Free Fire Stalker (sesuai format respon asli freefirehub.com)
const fetch = require('node-fetch');

async function getFFPlayer(uid, region = 'ALL', matchType = 'all') {
  try {
    const options = {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Linux; Android 16; Infinix X6837) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.7778.120 Mobile Safari/537.36',
        'x-requested-with': 'com.xbrowser.play',
        'referer': 'https://freefirehub.com/player-tracker',
        'accept-language': 'en-ID,en;q=0.9'
      }
    };

    const url = `https://freefirehub.com/api/player/${uid}?region=${region}&matchType=${matchType}`;

    const response = await fetch(url, options);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    return { error: error.message };
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

function formatDate(timestamp) {
  if (!timestamp) return '-';
  const date = new Date(parseInt(timestamp) * 1000);
  return date.toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });
}

module.exports = (app) => {
  
  // GET /stalk/ff?uid=12345678&region=ALL&matchType=all
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
      
      const data = await getFFPlayer(uid, region, matchType);
      
      if (data.error) {
        return res.status(500).json({
          status: false,
          creator: 'AxlyDev',
          error: data.error
        });
      }
      
      // Cek apakah data ada
      if (!data.profile || !data.profile.basicinfo) {
        return res.status(404).json({
          status: false,
          creator: 'AxlyDev',
          error: 'UID tidak ditemukan atau akun tidak aktif'
        });
      }
      
      const basicInfo = data.profile.basicinfo;
      const clanInfo = data.profile.clanbasicinfo;
      const socialInfo = data.profile.socialinfo;
      const creditscoreInfo = data.profile.creditscoreinfo;
      const petInfo = data.profile.petinfo;
      
      // Format response
      const result = {
        uid: basicInfo.accountid,
        nickname: basicInfo.nickname || '-',
        region: formatRegion(basicInfo.region),
        region_code: basicInfo.region,
        level: basicInfo.level || 0,
        exp: basicInfo.exp || 0,
        liked: basicInfo.liked || 0,
        headpic: basicInfo.headpic || null,
        avatarframe: basicInfo.avatarframe || null,
        bannerid: basicInfo.bannerid || null,
        title: basicInfo.title || null,
        created_at: formatDate(basicInfo.createat),
        last_login: formatDate(basicInfo.lastloginat),
        has_elite_pass: basicInfo.haselitepass || false,
        signature: socialInfo?.signature || '-',
        language: socialInfo?.language || '-'
      };
      
      // Clan info
      if (clanInfo) {
        result.clan = {
          id: clanInfo.clanid,
          name: clanInfo.clanname,
          level: clanInfo.clanlevel,
          member_count: clanInfo.membernum,
          captain_id: clanInfo.captainid
        };
      }
      
      // Credit score
      if (creditscoreInfo) {
        result.credit_score = creditscoreInfo.creditscore || 0;
      }
      
      // Pet info
      if (petInfo) {
        result.pet = {
          id: petInfo.id,
          name: petInfo.name,
          level: petInfo.level,
          exp: petInfo.exp,
          skin_id: petInfo.skinid
        };
      }
      
      // Rank info (BR)
      if (basicInfo.rank) {
        result.br_rank = {
          rank: basicInfo.rank,
          rank_points: basicInfo.rankingpoints || 0,
          max_rank: basicInfo.maxrank || 0,
          season_id: basicInfo.seasonid || 0
        };
      }
      
      // Rank info (CS)
      if (basicInfo.csrank) {
        result.cs_rank = {
          rank: basicInfo.csrank,
          rank_points: basicInfo.csrankingpoints || 0,
          max_rank: basicInfo.csmaxrank || 0
        };
      }
      
      // Equipment
      if (data.profile.profileinfo) {
        result.equipment = {
          avatar_id: data.profile.profileinfo.avatarid,
          clothes: data.profile.profileinfo.clothes,
          equipped_skills: data.profile.profileinfo.equipedskills,
          pve_weapon: data.profile.profileinfo.pveprimaryweapon
        };
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
