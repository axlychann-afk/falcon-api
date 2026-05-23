const axios = require('axios');
const FormData = require('form-data');
const multer = require('multer');
const { fromBuffer } = require('file-type');

const upload = multer({ storage: multer.memoryStorage() });

async function uploadToUguu(fileBuffer, filename) {
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

    if (response.data && response.data.files && response.data.files[0]) {
        return response.data.files[0].url;
    }
    throw new Error('Upload gagal');
}

module.exports = (app) => {
    // POST - upload file (buat Try It Out di web)
    app.post('/tools/upload', upload.single('file'), async (req, res) => {
        if (!req.file) {
            return res.status(400).json({
                status: false,
                error: 'Tidak ada file. Kirim file dengan key "file"'
            });
        }

        try {
            const url = await uploadToUguu(req.file.buffer, req.file.originalname);
            res.json({
                status: true,
                creator: 'AxlyChann',
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
                error: error.message
            });
        }
    });
};
