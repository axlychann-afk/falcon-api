const axios = require('axios');
const FormData = require('form-data');
const multer = require('multer');
const { fromBuffer } = require('file-type');

const upload = multer({ storage: multer.memoryStorage() });

const getCreator = () => {
  return (global.apikey && global.apikey[0]) ? global.apikey[0] : 'AxlyDev';
};

async function uploadToUguu(fileBuffer) {
    const type = await fromBuffer(fileBuffer);
    const ext = type ? type.ext : 'bin';
    
    const form = new FormData();
    form.append('files[]', fileBuffer, { filename: `data.${ext}` });

    const response = await axios.post('https://uguu.se/upload.php', form, {
        headers: {
            ...form.getHeaders(),
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        },
        timeout: 60000
    });

    if (response.data?.files?.[0]?.url) {
        return response.data.files[0].url;
    }
    throw new Error('Upload gagal');
}

module.exports = (app) => {
    
    // GET - upload dari URL
    app.get('/tools/upload', async (req, res) => {
        const { url } = req.query;

        if (!url) {
            return res.status(400).json({
                status: false,
                creator: getCreator(),
                error: 'Parameter "url" diperlukan. Contoh: /tools/upload?url=https://example.com/gambar.jpg'
            });
        }

        try {
            const imageRes = await axios.get(url, {
                responseType: 'arraybuffer',
                headers: { 'User-Agent': 'Mozilla/5.0' }
            });

            const resultUrl = await uploadToUguu(Buffer.from(imageRes.data));
            res.json({
                status: true,
                creator: getCreator(),
                result: {
                    original_url: url,
                    uploaded_url: resultUrl,
                    size: imageRes.data.length
                }
            });
        } catch (error) {
            console.error(error);
            res.status(500).json({ status: false, creator: getCreator(), error: error.message });
        }
    });

    // POST - upload file langsung
    app.post('/tools/upload', upload.single('file'), async (req, res) => {
        if (!req.file) {
            return res.status(400).json({
                status: false,
                creator: getCreator(),
                error: 'Tidak ada file. Kirim file dengan key "file"'
            });
        }

        try {
            const url = await uploadToUguu(req.file.buffer);
            res.json({
                status: true,
                creator: getCreator(),
                result: {
                    url: url,
                    original_name: req.file.originalname,
                    size: req.file.size
                }
            });
        } catch (error) {
            console.error(error);
            res.status(500).json({
                status: false,
                creator: getCreator(),
                error: error.message
            });
        }
    });
};
