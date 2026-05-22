const axios = require('axios');
const crypto = require('crypto');

class Parser {
    _getImg(o) {
        return (o?.sources || []).map(s => ({ url: s.url, width: s.width || s.maxWidth || null, height: s.height || s.maxHeight || null }));
    }
    _getCol(o) { return o?.extractedColors?.colorRaw?.hex || o?.extractedColors?.colorDark?.hex || null; }
    _getLink(uri) {
        if (!uri) return { id: null, url: null };
        const p = uri.split(':');
        return { uri, id: p[2] || null, url: p[2] ? `https://open.spotify.com/${p[1]}/${p[2]}` : null };
    }
    parseSearch(res) {
        if (!res) return null;
        const parse = (arr, mapFn, isTrack = false) => (arr || []).reduce((acc, node) => {
            const d = isTrack ? node.item?.data : node.data;
            if (d) acc.push({ ...mapFn(d), ...(node.matchedFields && { matched_fields: node.matchedFields }) });
            return acc;
        }, []);
        const trackItems = res.tracksV2?.items?.length ? res.tracksV2.items : res.topResultsV2?.itemsV2?.filter(i => i.item?.__typename === "TrackResponseWrapper");
        return {
            top_results: (res.topResultsV2?.itemsV2 || []).reduce((acc, node) => {
                const wrap = node.item;
                const d = wrap?.data;
                if (!d) return acc;
                const type = wrap.__typename?.replace('ResponseWrapper', '') || 'Unknown';
                acc.push({ type, ...this._getLink(d.uri), name: d.name || d.profile?.name || d.displayName || null, images: this._getImg(d.coverArt || d.visuals?.avatarImage || d.images?.items?.[0] || d.avatar), matched_fields: node.matchedFields || [] });
                return acc;
            }, []),
            tracks: parse(trackItems, t => ({
                ...this._getLink(t.uri), name: t.name || null, duration_ms: t.duration?.totalMilliseconds || 0,
                explicit: t.contentRating?.label === "EXPLICIT",
                artists: (t.artists?.items || []).map(a => ({ ...this._getLink(a.uri), uri: a.uri, name: a.profile?.name })),
                album: { ...this._getLink(t.albumOfTrack?.uri), name: t.albumOfTrack?.name || null, images: this._getImg(t.albumOfTrack?.coverArt) }
            }), true)
        };
    }
}

class Spotify {
    constructor() {
        this.cfg = {
            secret: '376136387538459893883312310911992847112448894410210511297108',
            version: 61,
            client_version: '1.2.88.61.ge172202b',
            query: {
                search: { opt: "searchDesktop", sha: "21b3fe49546912ba782db5c47e9ef5a7dbd20329520ba0c7d0fcfadee671d24e" }
            }
        };
        this.is = axios.create({
            headers: {
                'referer': 'https://open.spotify.com/',
                'origin': 'https://open.spotify.com',
                'content-type': 'application/json',
                'accept': 'application/json',
                'user-agent': 'Mozilla/5.0 (Linux; Android 16; NX729J) AppleWebKit/537.36 Chrome/143.0.7499.34 Mobile Safari/537.36',
            }
        });
        this.parser = new Parser();
    }

    generateTOTP(tsms) {
        const counter = Math.floor((tsms / 1000) / 30);
        const buffer = Buffer.alloc(8);
        buffer.writeBigInt64BE(BigInt(counter));
        const hmac = crypto.createHmac('sha1', Buffer.from(this.cfg.secret, "utf8")).update(buffer);
        const digest = hmac.digest();
        const offset = digest[digest.length - 1] & 0xf;
        const code = (digest.readUInt32BE(offset) & 0x7fffffff) % 1000000;
        return code.toString().padStart(6, '0');
    }

    async getToken() {
        if (this.is.defaults.headers.authorization) return true;
        const sts = Math.floor(Date.now() / 1000);
        const { data: token } = await this.is.get("https://open.spotify.com/api/token", {
            params: { reason: "init", productType: "web-player", totp: this.generateTOTP(Date.now()), totpServer: this.generateTOTP(sts * 1000), totpVer: String(this.cfg.version) }
        });
        const { data: client } = await this.is.post('https://clienttoken.spotify.com/v1/clienttoken', {
            client_data: { client_version: this.cfg.client_version, client_id: token.clientId, js_sdk_data: { device_brand: "unknown", device_model: "unknown", os: "linux", os_version: "24.04", device_id: crypto.randomUUID(), device_type: "computer" } }
        });
        Object.assign(this.is.defaults.headers, {
            'accept-language': 'en', 'app-platform': 'WebPlayer', 'authorization': `Bearer ${token.accessToken}`, 'client-token': client.granted_token.token, 'spotify-app-version': this.cfg.client_version
        });
        return true;
    }

    async query(name, vars) {
        if (!(await this.getToken())) throw new Error('Gagal dapat token');
        const sel = this.cfg.query[name];
        const { data: res } = await this.is.post('https://api-partner.spotify.com/pathfinder/v2/query', {
            variables: vars, operationName: sel.opt, extensions: { persistedQuery: { version: 1, sha256Hash: sel.sha } }
        });
        return res;
    }

    async search(query) {
        const res = await this.query("search", { searchTerm: query, offset: 0, limit: 15, numberOfTopResults: 5, includeAudiobooks: true, includePreReleases: true, includeAuthors: false, includeEpisodeContentRatingsV2: false });
        return this.parser.parseSearch(res.data.searchV2);
    }
}

const spotify = new Spotify();

module.exports = (app) => {
    app.get('/search/spotify', async (req, res) => {
        const { q, limit = 10 } = req.query;
        if (!q) return res.status(400).json({ status: false, error: 'Parameter "q" diperlukan' });

        try {
            const result = await spotify.search(q);
            const tracks = (result?.tracks || []).slice(0, Math.min(limit, 30)).map(t => ({
                title: t.name,
                artist: t.artists?.map(a => a.name).join(', ') || '',
                album: t.album?.name,
                image: t.album?.images?.[0]?.url,
                url: t.url,
                duration: `${Math.floor(t.duration_ms / 60000)}:${Math.floor((t.duration_ms % 60000) / 1000).toString().padStart(2, '0')}`
            }));
            res.json({ status: true, creator: 'AxlyChann', result: { query: q, total: tracks.length, data: tracks } });
        } catch (error) {
            console.error(error);
            res.status(500).json({ status: false, error: error.message });
        }
    });
};
