const axios = require('axios');

async function scrapeGenshinProfile(uid) {
    try {
        const response = await axios.get(`https://dak.gg/genshin/profile/${uid}?hl=en`, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.5'
            },
            timeout: 15000
        });

        // Ambil JSON dari <script id="__NEXT_DATA__">
        const match = response.data.match(/<script id="__NEXT_DATA__" type="application\/json">([^<]+)<\/script>/);
        if (!match) throw new Error('Tidak dapat menemukan data profile');

        const json = JSON.parse(match[1]);
        const userInfo = json.props?.pageProps?.data?.userInfo;
        
        if (!userInfo) throw new Error('Data user tidak ditemukan');

        // Format response
        return {
            status: true,
            nickname: userInfo.nickname || '-',
            level: userInfo.level || 0,
            signature: userInfo.signature || '-',
            world_level: userInfo.worldLevel || 0,
            achievements: userInfo.achievement || 0,
            spiral_abyss: userInfo.abyss?.floor ? `${userInfo.abyss.floor} (${userInfo.abyss.star || 0}★)` : '-',
            theater: userInfo.theater?.floor ? `${userInfo.theater.floor} (${userInfo.theater.star || 0}★)` : '-',
            avatar: userInfo.avatar?.url || null,
            uid: uid
        };

    } catch (error) {
        return {
            status: false,
            error: error.message
        };
    }
}

module.exports = (app) => {
    app.get('/stalker/genshin', async (req, res) => {
        const { id } = req.query;

        if (!id) {
            return res.status(400).json({
                status: false,
                error: 'Parameter "id" diperlukan (UID Genshin Impact)'
            });
        }

        // Validasi UID (harus angka 9 digit)
        if (!/^\d{9}$/.test(id)) {
            return res.status(400).json({
                status: false,
                error: 'UID harus 9 digit angka'
            });
        }

        try {
            const result = await scrapeGenshinProfile(id);
            
            if (!result.status) {
                throw new Error(result.error);
            }

            res.json({
                status: true,
                creator: 'AxlyChann',
                result: {
                    uid: result.uid,
                    nickname: result.nickname,
                    level: result.level,
                    signature: result.signature,
                    world_level: result.world_level,
                    achievements: result.achievements,
                    spiral_abyss: result.spiral_abyss,
                    theater: result.theater,
                    avatar: result.avatar
                }
            });
        } catch (error) {
            console.error(error);
            res.status(500).json({
                status: false,
                error: error.message || 'Gagal mengambil data Genshin Impact'
            });
        }
    });
};
