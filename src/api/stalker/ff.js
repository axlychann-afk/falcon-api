// ff.js - Free Fire Stalker (LENGKAP - semua mapping dalam 1 file)
const fetch = require('node-fetch');

// ==================== MAPPING REGION ====================
const regionMap = {
  'ID': { name: 'Indonesia', flag: '🇮🇩' },
  'SG': { name: 'Singapore', flag: '🇸🇬' },
  'TH': { name: 'Thailand', flag: '🇹🇭' },
  'BR': { name: 'Brazil', flag: '🇧🇷' },
  'IN': { name: 'India', flag: '🇮🇳' },
  'MY': { name: 'Malaysia', flag: '🇲🇾' },
  'VN': { name: 'Vietnam', flag: '🇻🇳' },
  'PK': { name: 'Pakistan', flag: '🇵🇰' },
  'BD': { name: 'Bangladesh', flag: '🇧🇩' },
  'EG': { name: 'Egypt', flag: '🇪🇬' },
  'RU': { name: 'Russia', flag: '🇷🇺' },
  'MX': { name: 'Mexico', flag: '🇲🇽' },
  'CO': { name: 'Colombia', flag: '🇨🇴' },
  'AR': { name: 'Argentina', flag: '🇦🇷' },
  'PE': { name: 'Peru', flag: '🇵🇪' },
  'CL': { name: 'Chile', flag: '🇨🇱' },
  'EC': { name: 'Ecuador', flag: '🇪🇨' },
  'GT': { name: 'Guatemala', flag: '🇬🇹' },
  'BO': { name: 'Bolivia', flag: '🇧🇴' },
  'PY': { name: 'Paraguay', flag: '🇵🇾' },
  'UY': { name: 'Uruguay', flag: '🇺🇾' },
  'VE': { name: 'Venezuela', flag: '🇻🇪' },
  'CR': { name: 'Costa Rica', flag: '🇨🇷' },
  'PA': { name: 'Panama', flag: '🇵🇦' },
  'HN': { name: 'Honduras', flag: '🇭🇳' },
  'SV': { name: 'El Salvador', flag: '🇸🇻' },
  'NI': { name: 'Nicaragua', flag: '🇳🇮' },
  'NG': { name: 'Nigeria', flag: '🇳🇬' },
  'ZA': { name: 'South Africa', flag: '🇿🇦' },
  'KE': { name: 'Kenya', flag: '🇰🇪' },
  'MA': { name: 'Morocco', flag: '🇲🇦' },
  'SA': { name: 'Saudi Arabia', flag: '🇸🇦' },
  'AE': { name: 'UAE', flag: '🇦🇪' },
  'QA': { name: 'Qatar', flag: '🇶🇦' },
  'KW': { name: 'Kuwait', flag: '🇰🇼' },
  'BH': { name: 'Bahrain', flag: '🇧🇭' },
  'OM': { name: 'Oman', flag: '🇴🇲' },
  'JO': { name: 'Jordan', flag: '🇯🇴' },
  'LB': { name: 'Lebanon', flag: '🇱🇧' },
  'IQ': { name: 'Iraq', flag: '🇮🇶' },
  'IR': { name: 'Iran', flag: '🇮🇷' },
  'TR': { name: 'Turkey', flag: '🇹🇷' },
  'AZ': { name: 'Azerbaijan', flag: '🇦🇿' },
  'KZ': { name: 'Kazakhstan', flag: '🇰🇿' },
  'UZ': { name: 'Uzbekistan', flag: '🇺🇿' },
  'MN': { name: 'Mongolia', flag: '🇲🇳' },
  'NP': { name: 'Nepal', flag: '🇳🇵' },
  'LK': { name: 'Sri Lanka', flag: '🇱🇰' },
  'MM': { name: 'Myanmar', flag: '🇲🇲' },
  'KH': { name: 'Cambodia', flag: '🇰🇭' },
  'LA': { name: 'Laos', flag: '🇱🇦' },
  'BN': { name: 'Brunei', flag: '🇧🇳' },
  'TL': { name: 'Timor Leste', flag: '🇹🇱' },
  'FJ': { name: 'Fiji', flag: '🇫🇯' }
};

// ==================== MAPPING RANK ====================
function getRankName(points) {
  if (points >= 2800) return 'Elite Grand Master';
  if (points >= 2500) return 'Grand Master';
  if (points >= 2200) return 'Heroic';
  if (points >= 2100) return 'Diamond';
  if (points >= 2000) return 'Platinum';
  if (points >= 1900) return 'Gold';
  if (points >= 1800) return 'Silver';
  if (points >= 1700) return 'Bronze';
  return 'Unranked';
}

// ==================== MAPPING SKILL ====================
const skillMap = {
  205000067: { name: 'Drop the Beat', character: 'DJ Alok', type: 'Active', desc: 'Membuat aura 5m yang memulihkan 5 HP/detik dan meningkatkan kecepatan gerak 15% selama 10 detik' },
  211053026: { name: 'Thrill of Battle', character: 'A124', type: 'Passive', desc: 'Mengubah EP menjadi HP secara instan. Setiap 2 EP dikonversi menjadi 1 HP' },
  214000082: { name: 'Bushido', character: 'Hayato', type: 'Passive', desc: 'Meningkatkan penetrasi armor seiring berkurangnya HP. Setiap 10% HP hilang, penetrasi armor +10%' },
  203000155: { name: 'Raging Reload', character: 'Jai', type: 'Passive', desc: 'Setelah menjatuhkan musuh, secara otomatis mengisi ulang magasin senjata yang digunakan' },
  204000584: { name: "Hacker's Eye", character: 'Moco', type: 'Passive', desc: 'Menandai musuh yang terkena tembakan. Informasi musuh dibagikan ke seluruh tim' },
  206000067: { name: 'Time Turner', character: 'Chrono', type: 'Active', desc: 'Membuat perisai yang memblokir 600 damage dan meningkatkan kecepatan gerak 15% di dalam perisai' },
  207000067: { name: 'Camouflage', character: 'Wukong', type: 'Active', desc: 'Berubah menjadi semak belukar selama 10 detik, gerakan jadi tidak terdeteksi' },
  208000067: { name: 'Sustained Raids', character: 'Jota', type: 'Passive', desc: 'Setiap hit dengan SMG atau Shotgun memulihkan HP' },
  209000067: { name: 'Sharp Shooter', character: 'Laura', type: 'Passive', desc: 'Meningkatkan akurasi saat membidik (scope). Akurasi meningkat 30% saat menggunakan scope' },
  210000067: { name: 'Dash', character: 'Kelly', type: 'Passive', desc: 'Meningkatkan kecepatan lari 6%. Level maks: +15% kecepatan' },
  212000067: { name: 'Gourmet', character: 'Maxim', type: 'Passive', desc: 'Penggunaan medkit 20% lebih cepat. Menambah EP saat menggunakan medkit' },
  213000067: { name: 'Shattering Blow', character: 'Kla', type: 'Passive', desc: 'Meningkatkan damage serangan jarak dekat 150% saat tidak bersenjata' },
  215000067: { name: 'Armor Specialist', character: 'Andrew', type: 'Passive', desc: 'Mengurangi damage ke armor. Armor awet lebih lama' },
  216000067: { name: 'Riding Shotgun', character: 'Caroline', type: 'Passive', desc: 'Damage meningkat 20% saat di dalam kendaraan' },
  217000067: { name: 'Healing Touch', character: 'Olivia', type: 'Passive', desc: 'Memulihkan HP rekan tim yang di-revive 20% lebih banyak' },
  218000067: { name: "Gangster's Spirit", character: 'Antonio', type: 'Passive', desc: 'Memulai pertandingan dengan HP +35 tambahan' },
  219000067: { name: 'Afterburner', character: 'Misha', type: 'Passive', desc: 'Kecepatan kendaraan +20%, damage ke kendaraan +50%' },
  220000067: { name: 'Falcon Fist', character: 'Maro', type: 'Passive', desc: 'Damage ke musuh meningkat berdasarkan jarak. Setiap 100m +5% damage' },
  221000067: { name: 'Xtreme Encounter', character: 'Xayne', type: 'Active', desc: 'Mendapatkan 100 HP temporary dan meningkat damage ke gloo wall 50% selama 10 detik' },
  222000067: { name: 'Healing Heartbeat', character: 'Dimitri', type: 'Active', desc: 'Membuat zona healing 3.5m yang memulihkan 3 HP/detik dan auto-revive' },
  223000067: { name: 'Painted Refuge', character: 'Steffie', type: 'Active', desc: 'Membuat zona aman yang mengurangi damage dari luar zona' },
  224000067: { name: 'Step Quiet', character: 'Clu', type: 'Passive', desc: 'Mendeteksi langkah kaki musuh dalam radius 50m' },
  225000067: { name: 'Gear Recycle', character: 'Shani', type: 'Passive', desc: 'Setelah kill, memulihkan 50 armor durability' },
  226000067: { name: 'Riptide Rhythm', character: 'Skyler', type: 'Passive', desc: 'Damage ke gloo wall +50%. Setiap skill aktif digunakan, memulihkan HP' },
  227000067: { name: 'Damage Delivered', character: 'Shirou', type: 'Passive', desc: 'Menandai musuh yang mengenai player dari jarak >80m, memberikan damage ekstra' },
  228000067: { name: 'Celebration', character: 'DJ Dasher', type: 'Passive', desc: 'Mendapatkan item spesial saat Natal' },
  229000067: { name: 'Partying On', character: 'Dasha', type: 'Passive', desc: 'Mengurangi recoil 20% dan damage jatuh 50%' },
  230000067: { name: 'Hat Trick', character: 'Luqueta', type: 'Passive', desc: 'Setiap kill meningkatkan max HP +10 (maks +50)' },
  231000067: { name: 'Healing Song', character: 'Kapella', type: 'Passive', desc: 'Meningkatkan efek healing 20% dan mengurangi damage saat menyembuhkan' },
  232000067: { name: "Racer's Blessing", character: 'Notora', type: 'Passive', desc: 'Memulihkan armor saat di dalam kendaraan' },
  233000067: { name: 'Limelight', character: 'Wolfrahh', type: 'Passive', desc: 'Damage ke musuh meningkat 30% setelah dilihat di killfeed' },
  234000067: { name: 'Vital Vibes', character: 'Thiva', type: 'Passive', desc: 'Mempercepat proses revive 15% dan memulihkan HP setelah revive' },
  235000067: { name: 'Nutty Movement', character: 'Joseph', type: 'Passive', desc: 'Meningkatkan kecepatan gerak 20% saat terkena tembakan' },
  236000067: { name: 'Survival Instinct', character: 'Leon', type: 'Passive', desc: 'Memulihkan HP saat berada di zona aman' },
  237000067: { name: 'Talk of the Town', character: 'Santino', type: 'Active', desc: 'Membuat ilusi yang mengelabui musuh' },
  238000067: { name: 'Cyborg Sprint', character: 'Elite Kelly', type: 'Passive', desc: 'Kecepatan lari +20%, cooldown skill lebih cepat' },
  239000067: { name: 'Slipstream', character: 'Sonia', type: 'Passive', desc: 'Mengurangi damage yang diterima saat bergerak' },
  240000067: { name: 'Healing Flow', character: 'Nova', type: 'Passive', desc: 'Memulihkan HP saat menggunakan medkit dalam radius tim' }
};

// ==================== MAPPING PET ====================
const petMap = {
  1300000071: { name: 'SiNo', skill: 'Restore Energy', rarity: 'Legendary', desc: 'Memulihkan HP setelah terkena headshot' },
  1300000062: { name: 'Falcon', skill: 'Steady Aim', rarity: 'Epic', desc: 'Mengurangi recoil saat membidik' },
  1300000080: { name: 'Penguin', skill: 'Collector', rarity: 'Epic', desc: 'Mengambil item dari peti mati musuh' },
  1300000053: { name: 'Rockie', skill: 'Stay Chill', rarity: 'Epic', desc: 'Mengurangi damage area' },
  1300000044: { name: 'Mr.Waggor', skill: 'Smooth Gloo', rarity: 'Epic', desc: 'Menghasilkan gloo wall lebih cepat' },
  1300000091: { name: 'Beaston', skill: 'Rapid Fire', rarity: 'Legendary', desc: 'Meningkatkan fire rate setelah kill' },
  1300000012: { name: 'Ottero', skill: 'Potion Expert', rarity: 'Epic', desc: 'Memulihkan EP saat menggunakan medkit' },
  1300000023: { name: 'Dreki', skill: 'Rapid Heal', rarity: 'Epic', desc: 'Memulihkan HP lebih cepat di zona' },
  1300000034: { name: 'Kactus', skill: 'Planting', rarity: 'Epic', desc: 'Menanam item yang bisa diambil' },
  1300000102: { name: 'Moo', skill: 'Health Boost', rarity: 'Epic', desc: 'Meningkatkan efek medkit' }
};

// ==================== MAPPING WEAPON SKIN ====================
const weaponSkinMap = {
  907103421: { name: 'MP40 - Evo', weapon: 'MP40', rarity: 'Epic' },
  912053004: { name: 'M1887 - Evo', weapon: 'M1887', rarity: 'Epic' },
  914047001: { name: 'M1014 - Crimson', weapon: 'M1014', rarity: 'Rare' },
  901000001: { name: 'SCAR - Dragon', weapon: 'SCAR', rarity: 'Epic' },
  902000002: { name: 'M4A1 - Phantom', weapon: 'M4A1', rarity: 'Legendary' },
  903000003: { name: 'AK47 - Gladiator', weapon: 'AK47', rarity: 'Epic' }
};

// ==================== MAPPING TITLE/BADGE ====================
const titleMap = {
  904990070: { name: 'Champion 2025', rarity: 'Legendary', desc: 'Juara turnamen 2025' },
  904990000: { name: 'OG Player', rarity: 'Epic', desc: 'Pemain sejak awal' },
  904990001: { name: 'Elite Pass Master', rarity: 'Rare', desc: 'Pemilik Elite Pass' },
  1001000096: { name: 'Top Global', rarity: 'Legendary', desc: 'Top Global ranking' },
  1001000001: { name: 'Battle Master', rarity: 'Epic', desc: 'Master of battle' }
};

// ==================== HELPER FUNCTIONS ====================
function getRegion(regionCode) {
  return regionMap[regionCode] || { name: regionCode, flag: '🌍' };
}

function getSkill(skillId) {
  return skillMap[skillId] || { name: `Unknown Skill (${skillId})`, character: 'Unknown', type: 'Unknown', desc: 'Skill tidak ditemukan' };
}

function getPet(petId) {
  return petMap[petId] || { name: `Unknown Pet (${petId})`, skill: 'Unknown', rarity: 'Common', desc: 'Pet tidak ditemukan' };
}

function getWeaponSkin(skinId) {
  return weaponSkinMap[skinId] || { name: `Unknown Skin (${skinId})`, weapon: 'Unknown', rarity: 'Common' };
}

function getTitle(titleId) {
  return titleMap[titleId] || { name: `Unknown Title (${titleId})`, rarity: 'Common', desc: 'Title tidak ditemukan' };
}

function formatDate(timestamp) {
  if (!timestamp) return '-';
  const date = new Date(parseInt(timestamp) * 1000);
  return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
}

// ==================== SCRAPE FUNCTION ====================
async function getFFPlayer(uid, region = 'ALL', matchType = 'all') {
  try {
    const url = `https://freefirehub.com/api/player/${uid}?region=${region}&matchType=${matchType}`;
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Linux; Android 16) AppleWebKit/537.36',
        'Referer': 'https://freefirehub.com/player-tracker'
      }
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.json();
  } catch (error) {
    return { error: error.message };
  }
}

// ==================== EXPRESS ENDPOINT ====================
module.exports = (app) => {
  
  // GET /stalk/ff?uid=12345678
  app.get('/stalk/ff', async (req, res) => {
    try {
      const { uid, region = 'ALL', matchType = 'all' } = req.query;
      
      if (!uid) {
        return res.status(400).json({ status: false, creator: 'AxlyDev', error: 'Parameter uid (UID Free Fire) wajib diisi' });
      }
      
      const data = await getFFPlayer(uid, region, matchType);
      
      if (data.error || !data.profile?.basicinfo) {
        return res.status(404).json({ status: false, creator: 'AxlyDev', error: 'UID tidak ditemukan atau akun tidak aktif' });
      }
      
      const info = data.profile.basicinfo;
      const clan = data.profile.clanbasicinfo;
      const social = data.profile.socialinfo;
      const credit = data.profile.creditscoreinfo;
      const pet = data.profile.petinfo;
      const profileInfo = data.profile.profileinfo;
      const regionData = getRegion(info.region || region);
      
      // Format equipped skills dengan mapping lengkap
      const equippedSkills = [];
      if (profileInfo?.equipedskills && Array.isArray(profileInfo.equipedskills)) {
        for (const skillId of profileInfo.equipedskills) {
          const skill = getSkill(skillId);
          equippedSkills.push({
            id: skillId,
            name: skill.name,
            character: skill.character,
            type: skill.type,
            description: skill.desc
          });
        }
      }
      
      // Format weapon skins
      const weaponSkins = [];
      if (info.weaponskinshows && Array.isArray(info.weaponskinshows)) {
        for (const skinId of info.weaponskinshows) {
          const skin = getWeaponSkin(skinId);
          weaponSkins.push({
            id: skinId,
            name: skin.name,
            weapon: skin.weapon,
            rarity: skin.rarity
          });
        }
      }
      
      const result = {
        // BASIC INFO
        uid: info.accountid,
        nickname: info.nickname || '-',
        region: regionData.name,
        region_code: info.region || region,
        region_flag: regionData.flag,
        level: info.level || 0,
        exp: info.exp || 0,
        liked: info.liked || 0,
        created_at: formatDate(info.createat),
        last_login: formatDate(info.lastloginat),
        has_elite_pass: info.haselitepass || false,
        signature: social?.signature || '-',
        
        // TITLE / BADGE
        title: getTitle(info.title),
        
        // RANK
        rank: {
          battle_royale: {
            value: info.rank,
            name: getRankName(info.rankingpoints),
            points: info.rankingpoints,
            max_value: info.maxrank,
            max_name: getRankName(info.maxrank_points),
            max_points: info.maxrank_points
          },
          clash_squad: {
            value: info.csrank,
            name: getRankName(info.csrankingpoints),
            points: info.csrankingpoints,
            max_value: info.csmaxrank,
            max_name: getRankName(info.csmaxrank_points),
            max_points: info.csmaxrank_points
          },
          season_id: info.seasonid || 0
        },
        
        // CLAN
        clan: clan?.clanname ? {
          id: clan.clanid,
          name: clan.clanname,
          level: clan.clanlevel,
          member_count: clan.membernum,
          captain_id: clan.captainid
        } : null,
        
        // CREDIT SCORE
        credit_score: credit?.creditscore || 100,
        
        // PET (dengan mapping lengkap)
        pet: pet?.id ? {
          id: pet.id,
          name: getPet(pet.id).name,
          skill: getPet(pet.id).skill,
          description: getPet(pet.id).desc,
          rarity: getPet(pet.id).rarity,
          level: pet.level,
          exp: pet.exp,
          skin_id: pet.skinid
        } : null,
        
        // EQUIPMENT & SKILLS
        equipment: profileInfo ? {
          avatar_id: profileInfo.avatarid,
          clothes: profileInfo.clothes || [],
          equipped_skills: equippedSkills,
          pve_weapon: profileInfo.pveprimaryweapon
        } : null,
        
        // WEAPON SKINS
        weapon_skins: weaponSkins
      };
      
      res.json({ status: true, creator: 'AxlyDev', result: result });
      
    } catch (error) {
      res.status(500).json({ status: false, creator: 'AxlyDev', error: error.message });
    }
  });
  
};
