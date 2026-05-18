const axios = require('axios');

module.exports = (app) => {
    app.get('/stalk/ff', async (req, res) => {
        const { uid } = req.query;

        if (!uid) {
            return res.status(400).json({
                status: false,
                error: 'Parameter "uid" diperlukan'
            });
        }

        // Deteksi region dari 2 digit pertama UID
        const detectRegion = (uid) => {
            const prefix = uid.toString().slice(0, 2);
            const regions = {
                '10': 'ID',
                '11': 'SG',
                '12': 'TH',
                '13': 'MY',
                '14': 'BR',
                '15': 'VN',
                '18': 'MY',
                '20': 'IN',
                '25': 'PK',
                '27': 'BD',
                '31': 'EG',
                '32': 'RU',
                '33': 'TR',
                '35': 'MX',
                '36': 'CL',
                '37': 'AR',
                '38': 'CO',
                '40': 'SA',
                '41': 'AE',
                '42': 'IQ',
                '43': 'KW',
                '44': 'QA',
                '45': 'BH',
                '46': 'JO',
                '47': 'LB',
                '48': 'PS',
                '49': 'YE',
                '50': 'OM'
            };
            return regions[prefix] || 'ID';
        };

        const region = detectRegion(uid);
        const formatTanggal = (timestamp) => {
            if (!timestamp || timestamp === "0") return "N/A";
            const date = new Date(parseInt(timestamp) * 1000);
            return date.toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' });
        };

        try {
            const response = await axios.get('https://ff-817ok-topidev-172.vercel.app/player-info', {
                params: { region, uid },
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                    'Accept': 'application/json'
                }
            });

            const d = response.data;

            if (!d.basicInfo) {
                return res.status(404).json({
                    status: false,
                    error: 'UID tidak ditemukan'
                });
            }

            res.json({
                status: true,
                creator: 'FlowFalcon',
                result: {
                    nickname: d.basicInfo.nickname,
                    uid: d.basicInfo.accountId,
                    region: d.basicInfo.region || region,
                    level: d.basicInfo.level || 0,
                    exp: d.basicInfo.exp || 0,
                    liked: d.basicInfo.liked || 0,
                    br_rank: d.basicInfo.rank || 0,
                    cs_rank: d.basicInfo.csRank || 0,
                    created_at: formatTanggal(d.basicInfo.createAt),
                    last_login: formatTanggal(d.basicInfo.lastLoginAt),
                    clan: d.clanBasicInfo?.clanName || "No Clan",
                    signature: d.socialInfo?.signature || ""
                }
            });
        } catch (error) {
            res.status(500).json({
                status: false,
                error: error.message
            });
        }
    });
};
