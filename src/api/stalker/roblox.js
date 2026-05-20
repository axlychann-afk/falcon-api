const axios = require('axios');

module.exports = (app) => {
    app.get('/stalker/roblox', async (req, res) => {
        const { username } = req.query;

        if (!username) {
            return res.status(400).json({
                status: false,
                error: 'Parameter "username" diperlukan (username Roblox)'
            });
        }

        try {
            const response = await axios.get(`https://api.nexray.eu.cc/stalker/roblox?username=${username}`, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                },
                timeout: 15000
            });

            const data = response.data;

            if (!data.status || !data.result) {
                throw new Error('Gagal mengambil data Roblox');
            }

            const result = data.result;

            // Format response ringkas (ambil data penting aja)
            const formatted = {
                user_id: result.userId,
                username: result.basic?.name || username,
                display_name: result.basic?.displayName || '-',
                description: result.basic?.description || '-',
                created: result.basic?.created || '-',
                is_banned: result.basic?.isBanned || false,
                has_verified_badge: result.basic?.hasVerifiedBadge || false,
                presence: result.presence?.userPresences?.[0]?.userPresenceType === 0 ? 'Offline' : 'Online',
                last_location: result.presence?.userPresences?.[0]?.lastLocation || '-',
                social: {
                    friends: result.social?.friends?.count || 0,
                    followers: result.social?.followers?.count || 0,
                    following: result.social?.following?.count || 0
                },
                groups_count: result.groups?.list?.data?.length || 0,
                avatar: {
                    headshot: result.avatar?.headshot?.data?.[0]?.imageUrl || null,
                    full_body: result.avatar?.fullBody?.data?.[0]?.imageUrl || null
                },
                badges: result.achievements?.robloxBadges?.map(b => ({
                    name: b.name,
                    description: b.description,
                    image: b.imageUrl
                })) || []
            };

            res.json({
                status: true,
                creator: 'AxlyChann',
                result: formatted
            });

        } catch (error) {
            console.error(error);
            res.status(500).json({
                status: false,
                error: error.message || 'Gagal mengambil data Roblox'
            });
        }
    });
};
