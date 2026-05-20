const axios = require('axios');

function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function getUserId(username) {
    const response = await axios.get(`https://users.roblox.com/v1/users/search?keyword=${encodeURIComponent(username)}&limit=10`);
    const user = response.data.data?.find(u => u.name.toLowerCase() === username.toLowerCase());
    return user?.id || null;
}

async function getUserInfo(userId) {
    await delay(100);
    const response = await axios.get(`https://users.roblox.com/v1/users/${userId}`);
    return response.data;
}

async function getAvatar(userId) {
    await delay(100);
    const response = await axios.get(`https://thumbnails.roblox.com/v1/users/avatar-headshot?userIds=${userId}&size=420x420&format=Png`);
    return response.data.data?.[0]?.imageUrl || null;
}

async function getFullBody(userId) {
    await delay(100);
    const response = await axios.get(`https://thumbnails.roblox.com/v1/users/avatar?userIds=${userId}&size=720x720&format=Png`);
    return response.data.data?.[0]?.imageUrl || null;
}

async function getGroups(userId) {
    await delay(100);
    const response = await axios.get(`https://groups.roblox.com/v1/users/${userId}/groups/roles`);
    return response.data.data || [];
}

async function getBadges(userId, limit = 50) {
    await delay(100);
    const response = await axios.get(`https://badges.roblox.com/v1/users/${userId}/badges?limit=${limit}&sortOrder=Desc`);
    return response.data.data || [];
}

async function getFriendsCount(userId) {
    await delay(100);
    const response = await axios.get(`https://friends.roblox.com/v1/users/${userId}/friends/count`);
    return response.data.count || 0;
}

async function getFollowersCount(userId) {
    await delay(100);
    const response = await axios.get(`https://friends.roblox.com/v1/users/${userId}/followers/count`);
    return response.data.count || 0;
}

async function getFollowingsCount(userId) {
    await delay(100);
    const response = await axios.get(`https://friends.roblox.com/v1/users/${userId}/followings/count`);
    return response.data.count || 0;
}

async function getPresence(userId) {
    await delay(100);
    try {
        const response = await axios.post('https://presence.roblox.com/v1/presence/users', {
            userIds: [userId]
        }, {
            headers: { 'Content-Type': 'application/json' }
        });
        return response.data.userPresences?.[0] || null;
    } catch {
        return null;
    }
}

function formatDate(dateString) {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

const presenceMap = {
    0: 'Offline',
    1: 'Online',
    2: 'In Game',
    3: 'In Studio',
    4: 'Invisible'
};

module.exports = (app) => {
    app.get('/stalker/roblox', async (req, res) => {
        const { username } = req.query;

        if (!username) {
            return res.status(400).json({
                status: false,
                error: 'Parameter "username" diperlukan'
            });
        }

        try {
            // Cari user ID dulu
            const userId = await getUserId(username);
            if (!userId) {
                return res.status(404).json({
                    status: false,
                    error: 'Username Roblox tidak ditemukan'
                });
            }

            // Ambil data satu per satu dengan delay
            const info = await getUserInfo(userId);
            const avatar = await getAvatar(userId);
            const fullBody = await getFullBody(userId);
            const groups = await getGroups(userId);
            const badges = await getBadges(userId, 50);
            const friends = await getFriendsCount(userId);
            const followers = await getFollowersCount(userId);
            const followings = await getFollowingsCount(userId);
            const presence = await getPresence(userId);

            const presenceType = presence?.userPresenceType || 0;
            const lastOnline = presence?.lastOnline ? formatDate(presence.lastOnline) : '-';

            const result = {
                username: info.name,
                display_name: info.displayName,
                user_id: userId,
                created: formatDate(info.created),
                banned: info.isBanned || false,
                has_verified_badge: info.hasVerifiedBadge || false,
                description: info.description || '-',
                status: presenceMap[presenceType] || 'Offline',
                last_online: lastOnline,
                avatar: avatar,
                full_body: fullBody,
                friends: friends,
                followers: followers,
                followings: followings,
                badges_count: badges.length,
                badges: badges.slice(0, 10).map(b => ({
                    name: b.name,
                    created: formatDate(b.created)
                })),
                groups_count: groups.length,
                groups: groups.slice(0, 10).map(g => ({
                    name: g.group?.name,
                    role: g.role?.name,
                    member_count: g.group?.memberCount
                }))
            };

            res.json({
                status: true,
                creator: 'AxlyChann',
                result: result
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
