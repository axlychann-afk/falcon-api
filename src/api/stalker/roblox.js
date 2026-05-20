const axios = require('axios');

// Delay helper
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Fetch dengan retry & exponential backoff
async function fetchWithRetry(url, retries = 3, baseDelay = 1000) {
    for (let i = 0; i < retries; i++) {
        try {
            const response = await axios.get(url, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                    'Accept': 'application/json'
                },
                timeout: 10000
            });
            return response.data;
        } catch (error) {
            if (error.response?.status === 429) {
                const wait = baseDelay * Math.pow(2, i);
                console.log(`Rate limit, tunggu ${wait}ms...`);
                await delay(wait);
                continue;
            }
            if (i === retries - 1) throw error;
            await delay(baseDelay);
        }
    }
}

async function getUserId(username) {
    const data = await fetchWithRetry(`https://users.roblox.com/v1/users/search?keyword=${encodeURIComponent(username)}&limit=10`);
    const user = data.data?.find(u => u.name.toLowerCase() === username.toLowerCase());
    return user?.id || null;
}

async function getUserInfo(userId) {
    await delay(800);
    return await fetchWithRetry(`https://users.roblox.com/v1/users/${userId}`);
}

async function getAvatar(userId) {
    await delay(800);
    const data = await fetchWithRetry(`https://thumbnails.roblox.com/v1/users/avatar?userIds=${userId}&size=420x420&format=Png`);
    return data.data?.[0]?.imageUrl || null;
}

async function getGroups(userId) {
    await delay(800);
    const data = await fetchWithRetry(`https://groups.roblox.com/v2/users/${userId}/groups/roles`);
    return data.data || [];
}

async function getGames(userId) {
    await delay(800);
    const data = await fetchWithRetry(`https://games.roblox.com/v2/users/${userId}/games?limit=50`);
    return data.data || [];
}

async function getBadges(userId) {
    await delay(800);
    const data = await fetchWithRetry(`https://badges.roblox.com/v1/users/${userId}/badges?limit=50`);
    return data.data || [];
}

async function getFriendsCount(userId) {
    await delay(800);
    const data = await fetchWithRetry(`https://friends.roblox.com/v1/users/${userId}/friends/count`);
    return data.count || 0;
}

async function getFollowersCount(userId) {
    await delay(800);
    const data = await fetchWithRetry(`https://friends.roblox.com/v1/users/${userId}/followers/count`);
    return data.count || 0;
}

async function getFollowingsCount(userId) {
    await delay(800);
    const data = await fetchWithRetry(`https://friends.roblox.com/v1/users/${userId}/followings/count`);
    return data.count || 0;
}

async function getPresence(userId) {
    await delay(800);
    try {
        const response = await axios.post('https://presence.roblox.com/v1/presence/users', 
            { userIds: [userId] },
            {
                headers: {
                    'Content-Type': 'application/json',
                    'User-Agent': 'Mozilla/5.0'
                }
            }
        );
        return response.data.userPresences?.[0] || null;
    } catch {
        return null;
    }
}

function formatDate(dateString) {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
    });
}

const presenceMap = { 0: 'Offline', 1: 'Online', 2: 'In Game', 3: 'In Studio' };

module.exports = (app) => {
    app.get('/stalker/roblox', async (req, res) => {
        const { username } = req.query;

        if (!username) {
            return res.status(400).json({ status: false, error: 'Parameter "username" diperlukan' });
        }

        try {
            const userId = await getUserId(username);
            if (!userId) {
                return res.status(404).json({ status: false, error: 'Username tidak ditemukan' });
            }

            // Ambil semua data sequential (biar gak kena rate limit)
            const info = await getUserInfo(userId);
            const avatar = await getAvatar(userId);
            const groups = await getGroups(userId);
            const games = await getGames(userId);
            const badges = await getBadges(userId);
            const friends = await getFriendsCount(userId);
            const followers = await getFollowersCount(userId);
            const followings = await getFollowingsCount(userId);
            const presence = await getPresence(userId);

            const result = {
                username: info.name,
                display_name: info.displayName,
                user_id: userId,
                created: formatDate(info.created),
                banned: info.isBanned || false,
                verified: info.hasVerifiedBadge || false,
                description: info.description?.slice(0, 300) || '-',
                avatar: avatar,
                friends,
                followers,
                followings,
                presence: {
                    status: presenceMap[presence?.userPresenceType] || 'Offline',
                    last_location: presence?.lastLocation || '-',
                    place_id: presence?.placeId || '-'
                },
                groups_count: groups.length,
                groups: groups.slice(0, 10).map(g => ({
                    name: g.group?.name,
                    role: g.role?.name,
                    members: g.group?.memberCount
                })),
                games_count: games.length,
                games: games.slice(0, 10).map(g => ({
                    name: g.name,
                    visits: g.placeVisits || 0
                })),
                badges_count: badges.length,
                badges: badges.slice(0, 10).map(b => ({
                    name: b.name,
                    awarded: b.statistics?.awardedCount || 0
                }))
            };

            res.json({ status: true, creator: 'AxlyChann', result });

        } catch (error) {
            console.error(error);
            res.status(500).json({ status: false, error: error.message || 'Gagal mengambil data Roblox' });
        }
    });
};
