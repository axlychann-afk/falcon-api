// ff.js - Free Fire Stalker (All-in-One, cukup UID)
const { FreeFireAPI } = require('ffapis');

const api = new FreeFireAPI();

// Mapping rank points ke nama rank
function getRankName(rankPoints) {
  if (rankPoints >= 2800) return 'Elite Grand Master';
  if (rankPoints >= 2500) return 'Grand Master';
  if (rankPoints >= 2200) return 'Heroic';
  if (rankPoints >= 2100) return 'Diamond';
  if (rankPoints >= 2000) return 'Platinum';
  if (rankPoints >= 1900) return 'Gold';
  if (rankPoints >= 1800) return 'Silver';
  if (rankPoints >= 1700) return 'Bronze';
  return 'Unranked';
}

// Mapping region
function getRegionInfo(regionCode) {
  const regions = {
    'ID': { name: 'Indonesia', flag: '🇮🇩' },
    'SG': { name: 'Singapore', flag: '🇸🇬' },
    'TH': { name: 'Thailand', flag: '🇹🇭' },
    'BR': { name: 'Brazil', flag: '🇧🇷' },
    'IN': { name: 'India', flag: '🇮🇳' },
    'MY': { name: 'Malaysia', flag: '🇲🇾' },
    'VN': { name: 'Vietnam', flag: '🇻🇳' },
    'PK': { name: 'Pakistan', flag: '🇵🇰' },
    'BD': { name: 'Bangladesh', flag: '🇧🇩' },
    'EG': { name: 'Egypt', flag: '🇪🇬' }
  };
  return regions[regionCode] || { name: regionCode, flag: '🌍' };
}

// Format timestamp ke tanggal
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
  
  // GET /stalk/ff?uid=12345678 (CUKUP UID, SEMUA DATA KELUAR)
  app.get('/stalk/ff', async (req, res) => {
    try {
      const { uid, region = 'ID' } = req.query;
      
      if (!uid) {
        return res.status(400).json({
          status: false,
          creator: 'AxlyDev',
          error: 'Parameter uid (UID Free Fire) wajib diisi'
        });
      }
      
      // Validasi UID (8-9 digit)
      if (!/^\d{8,9}$/.test(uid)) {
        return res.status(400).json({
          status: false,
          creator: 'AxlyDev',
          error: 'UID harus berupa angka 8-9 digit'
        });
      }
      
      // Fetch profile dan stats paralel pake Promise.all
      const [profile, stats] = await Promise.all([
        api.fetchProfile(uid, region).catch(() => null),
        api.fetchStats(uid, region).catch(() => null)
      ]);
      
      // Cek apakah profile ditemukan
      if (!profile || !profile.basicInfo) {
        return res.status(404).json({
          status: false,
          creator: 'AxlyDev',
          error: 'UID tidak ditemukan atau akun tidak aktif'
        });
      }
      
      const basicInfo = profile.basicInfo;
      const clanInfo = profile.clanBasicInfo;
      const socialInfo = profile.socialInfo;
      const profileInfo = profile.profileInfo;
      const petInfo = profile.petInfo;
      const creditScoreInfo = profile.creditScoreInfo;
      const regionInfo = getRegionInfo(basicInfo.region || region);
      
      // Format response lengkap
      const result = {
        // ========== BASIC INFO ==========
        uid: basicInfo.accountId,
        nickname: basicInfo.nickname || '-',
        region: regionInfo.name,
        region_code: basicInfo.region || region,
        region_flag: regionInfo.flag,
        level: basicInfo.level || 0,
        exp: basicInfo.exp || 0,
        liked: basicInfo.liked || 0,
        created_at: formatDate(basicInfo.createAt),
        last_login: formatDate(basicInfo.lastLoginAt),
        has_elite_pass: basicInfo.hasElitePass || false,
        signature: socialInfo?.signature || '-',
        
        // ========== RANK ==========
        rank: {
          battle_royale: {
            rank_value: basicInfo.rank || 0,
            rank_name: getRankName(basicInfo.rankingPoints || 0),
            rank_points: basicInfo.rankingPoints || 0,
            max_rank_value: basicInfo.maxRank || 0,
            max_rank_name: getRankName(basicInfo.maxRankPoints || 0)
          },
          clash_squad: {
            rank_value: basicInfo.csRank || 0,
            rank_name: getRankName(basicInfo.csRankingPoints || 0),
            rank_points: basicInfo.csRankingPoints || 0,
            max_rank_value: basicInfo.csMaxRank || 0,
            max_rank_name: getRankName(basicInfo.csMaxRankPoints || 0)
          },
          season_id: basicInfo.seasonId || 0
        },
        
        // ========== CLAN ==========
        clan: clanInfo && clanInfo.clanId ? {
          id: clanInfo.clanId,
          name: clanInfo.clanName || '-',
          level: clanInfo.clanLevel || 0,
          member_count: clanInfo.memberNum || 0,
          captain_id: clanInfo.captainId || '-'
        } : null,
        
        // ========== PET ==========
        pet: petInfo && petInfo.id ? {
          id: petInfo.id,
          level: petInfo.level || 0,
          exp: petInfo.exp || 0,
          skin_id: petInfo.skinId || null
        } : null,
        
        // ========== CREDIT SCORE ==========
        credit_score: creditScoreInfo?.creditScore || 100,
        
        // ========== EQUIPMENT ==========
        equipment: profileInfo ? {
          avatar_id: profileInfo.avatarId,
          clothes: profileInfo.clothes || [],
          equipped_skills: profileInfo.equippedSkills || [],
          pve_weapon: profileInfo.pvePrimaryWeapon
        } : null,
        
        // ========== STATISTICS ==========
        statistics: stats ? {
          solo: {
            matches: stats.solo?.matches || 0,
            wins: stats.solo?.wins || 0,
            kills: stats.solo?.kills || 0,
            headshots: stats.solo?.headshots || 0,
            top10: stats.solo?.top10 || 0
          },
          duo: {
            matches: stats.duo?.matches || 0,
            wins: stats.duo?.wins || 0,
            kills: stats.duo?.kills || 0,
            headshots: stats.duo?.headshots || 0,
            top10: stats.duo?.top10 || 0
          },
          squad: {
            matches: stats.squad?.matches || 0,
            wins: stats.squad?.wins || 0,
            kills: stats.squad?.kills || 0,
            headshots: stats.squad?.headshots || 0,
            top10: stats.squad?.top10 || 0
          },
          total: {
            matches: (stats.solo?.matches || 0) + (stats.duo?.matches || 0) + (stats.squad?.matches || 0),
            wins: (stats.solo?.wins || 0) + (stats.duo?.wins || 0) + (stats.squad?.wins || 0),
            kills: (stats.solo?.kills || 0) + (stats.duo?.kills || 0) + (stats.squad?.kills || 0),
            headshots: (stats.solo?.headshots || 0) + (stats.duo?.headshots || 0) + (stats.squad?.headshots || 0),
            top10: (stats.solo?.top10 || 0) + (stats.duo?.top10 || 0) + (stats.squad?.top10 || 0)
          },
          win_rate: 0
        } : null
      };
      
      // Hitung win rate
      if (result.statistics && result.statistics.total.matches > 0) {
        result.statistics.win_rate = ((result.statistics.total.wins / result.statistics.total.matches) * 100).toFixed(2);
      }
      
      res.json({
        status: true,
        creator: 'AxlyDev',
        result: result
      });
      
    } catch (error) {
      console.error('FF Stalker Error:', error);
      res.status(500).json({
        status: false,
        creator: 'AxlyDev',
        error: error.message
      });
    }
  });
  
};
