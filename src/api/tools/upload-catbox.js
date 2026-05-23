const axios = require('axios');
const FormData = require('form-data');
const multer = require('multer');

const upload = multer({ storage: multer.memoryStorage() });

async function uploadToCatbox(fileBuffer, filename) {
    if (!fileBuffer || fileBuffer.length === 0) {
        throw new Error('File kosong');
    }

    const form = new FormData();
    form.append('reqtype', 'fileupload');
    form.append('fileToUpload', fileBuffer, { filename: filename });

    const response = await axios.post('https://catbox.moe/user/api.php', form, {
        headers: {
            ...form.getHeaders(),
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
            'Accept-Language': 'id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7',
            'Accept-Encoding': 'gzip, deflate, br',
            'Origin': 'https://catbox.moe',
            'Referer': 'https://catbox.moe/',
            'DNT': '1',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1'
        },
        maxContentLength: Infinity,
        maxBodyLength: Infinity,
        timeout: 30000
    });

    const resultUrl = response.data.trim();
    if (!resultUrl.startsWith('http')) {
        throw new Error('Upload gagal: ' + resultUrl);
    }

    return resultUrl;
}

module.exports = (app) => {
    // GET dari URL
    app.get('/tools/upload-catbox', async (req, res) => {
        const { url } = req.query;

        if (!url) {
            return res.status(400).json({ status: false, error: 'Parameter "url" diperlukan' });
        }

        try {
            const imageRes = await axios.get(url, {
                responseType: 'arraybuffer',
                headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
            });

            const resultUrl = await uploadToCatbox(Buffer.from(imageRes.data), `upload_${Date.now()}.jpg`);
            res.json({ status: true, creator: 'AxlyChann', result: { original_url: url, uploaded_url: resultUrl } });
        } catch (error) {
            console.error(error);
            res.status(500).json({ status: false, error: error.message });
        }
    });

    // POST upload file
    app.post('/tools/upload-catbox', upload.single('file'), async (req, res) => {
        if (!req.file) {
            return res.status(400).json({ status: false, error: 'Tidak ada file' });
        }

        try {
            const resultUrl = await uploadToCatbox(req.file.buffer, req.file.originalname);
            res.json({ status: true, creator: 'AxlyChann', result: { url: resultUrl, original_name: req.file.originalname, size: req.file.size } });
        } catch (error) {
            console.error(error);
            res.status(500).json({ status: false, error: error.message });
        }
    });
};
