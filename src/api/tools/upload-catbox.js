const axios = require('axios');
const FormData = require('form-data');
const multer = require('multer');

const upload = multer({ storage: multer.memoryStorage() });

async function uploadToCatbox(fileBuffer, filename) {
    const form = new FormData();
    form.append('reqtype', 'fileupload');
    form.append('fileToUpload', fileBuffer, { filename: filename });

    const response = await axios.post('https://catbox.moe/user/api.php', form, {
        headers: {
            ...form.getHeaders(),
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        },
        maxContentLength: Infinity,
        maxBodyLength: Infinity
    });

    const resultUrl = response.data.trim();
    if (!resultUrl.startsWith('http')) {
        throw new Error('Upload gagal: ' + resultUrl);
    }

    return resultUrl;
}

module.exports = (app) => {
    // GET - upload dari URL (buat testing via URL)
    app.get('/tools/upload-catbox', async (req, res) => {
        const { url } = req.query;

        if (!url) {
            return res.status(400).json({ status: false, error: 'Parameter "url" diperlukan' });
        }

        try {
            const imageRes = await axios.get(url, { responseType: 'arraybuffer' });
            const ext = imageRes.headers['content-type']?.split('/')[1] || 'bin';
            const filename = `upload_${Date.now()}.${ext}`;
            const resultUrl = await uploadToCatbox(Buffer.from(imageRes.data), filename);

            res.json({ status: true, creator: 'AxlyChann', result: { original_url: url, uploaded_url: resultUrl } });
        } catch (error) {
            res.status(500).json({ status: false, error: error.message });
        }
    });

    // POST - upload file langsung (buat Try It Out di web)
    app.post('/tools/upload-catbox', upload.single('file'), async (req, res) => {
        if (!req.file) {
            return res.status(400).json({ status: false, error: 'Tidak ada file' });
        }

        try {
            const resultUrl = await uploadToCatbox(req.file.buffer, req.file.originalname);
            res.json({ status: true, creator: 'AxlyChann', result: { url: resultUrl, original_name: req.file.originalname, size: req.file.size } });
        } catch (error) {
            res.status(500).json({ status: false, error: error.message });
        }
    });
};
