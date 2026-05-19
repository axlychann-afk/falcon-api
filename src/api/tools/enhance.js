const axios = require('axios');
const FormData = require('form-data');
const multer = require('multer');

const upload = multer({ storage: multer.memoryStorage() });

async function enhanceImage(imageBuffer) {
    const formData = new FormData();
    formData.append('file', imageBuffer, {
        filename: 'upload.jpg',
        contentType: 'image/jpeg'
    });

    const response = await axios.post('https://ihancer.com/api/enhance', formData, {
        headers: {
            ...formData.getHeaders(),
            'User-Agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36',
            'Origin': 'https://ihancer.com',
            'Referer': 'https://ihancer.com/app/'
        },
        responseType: 'arraybuffer',
        timeout: 60000
    });

    return Buffer.from(response.data);
}

module.exports = (app) => {
    // Endpoint POST upload file langsung
    app.post('/tools/enhance', upload.single('file'), async (req, res) => {
        try {
            if (!req.file) {
                return res.status(400).json({
                    status: false,
                    error: 'Tidak ada file. Kirim file gambar dengan key "file"'
                });
            }

            const enhancedBuffer = await enhanceImage(req.file.buffer);
            
            res.setHeader('Content-Type', 'image/jpeg');
            res.setHeader('Content-Disposition', 'attachment; filename="enhanced.jpg"');
            res.send(enhancedBuffer);

        } catch (error) {
            console.error(error);
            res.status(500).json({
                status: false,
                error: error.message || 'Gagal enhance gambar'
            });
        }
    });
};
