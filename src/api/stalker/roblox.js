const axios = require('axios');

const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'application/json'
};

async function getUserId(username) {
    const response = await axios.get(`https://users.roblox.com/v1/users/search?keyword=${encodeURIComponent(username)}&limit=10`, { headers });
    const user = response.data.data?.find(u => u.name.toLowerCase() === username.toLowerCase());
    return user?.id || null;
}

async function getUserInfo(userId) {
    const response = await axios.get(`https://users.roblox.com/v1/users/${userId}`, { headers });
    return response.data;
}

async function getAvatarAndBody(userId) {
    const response = await axios.get(`https://thumbnails.roblox.com/v1/users/avatar-headshot?userIds=${userId}&size=420x420&format=Png`, { headers });
    const bodyResponse = await axios.get(`https://thumbnails.roblox.com/v1/users/avatar?userIds=${userId}&size=720x720&format=Png`, { headers });
    return {
        avatar: response.data.data?.[0]?.imageUrl || null,
        full_body: bodyResponse.data.data?.[0]?.imageUrl || null
    };
}

async function getGroups(userId) {
    const response = await axios.get(`https://groups.roblox.com/v1/users/${userId}/groups/roles`, { headers });
    return response.data.data || [];
}

async function getSocialCounts(userId) {
    const [friends, followers, followings] = await Promise.all([
        axios.get(`https://friends.roblox.com/v1/users/${userId}/friends/count`, { headers }).catch(() => ({ data: { count: 0 } })),
        axios.get(`https://friends.roblox.com/v1/users/${userId}/followers/count`, { headers }).catch(() => ({ data: { count: 0 } })),
        axios.get(`https://friends.roblox.com/v1/users/${userId}/followings/count`, { headers }).catch(() => ({ data: { count: 0 } }))
    ]);
    return {
        friends: friends.data.count || 0,
        followers: followers.data.count || 0,
        followings: followings.data.count || 0
    };
}

function formatDate(dateString) {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' });
}

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

            // Ambil data paralel (tapi dikit)
            const [info, avatarBody, groups, social] = await Promise.all([
                getUserInfo(userId),
                getAvatarAndBody(userId),
                getGroups(userId),
                getSocialCounts(userId)
            ]);

            const result = {
                username: info.name,
                display_name: info.displayName,
                user_id: userId,
                created: formatDate(info.created),
                banned: info.isBanned || false,
                has_verified_badge: info.hasVerifiedBadge || false,
                description: info.description?.slice(0, 200) || '-',
                avatar: avatarBody.avatar,
                full_body: avatarBody.full_body,
                friends: social.friends,
                followers: social.followers,
                followings: social.followings,
                groups_count: groups.length,
                groups: groups.slice(0, 10).map(g => ({
                    name: g.group?.name,
                    role: g.role?.name,
                    member_count: g.group?.memberCount
                }))
            };

            res.json({ status: true, creator: 'AxlyChann', result });

        } catch (error) {
            console.error(error);
            res.status(500).json({ status: false, error: error.message || 'Gagal mengambil data Roblox' });
        }
    });
};
