const multer = require('multer');
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const FormData = require('form-data');

// Setup multer dengan memory storage (biar gak nyimpen file permanen)
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// Fungsi upload ke litter.lusia.moe dari buffer
async function uploadToLitter(buffer, originalname) {
    const form = new FormData();
    // Buat file stream dari buffer
    form.append('file', buffer, { filename: originalname });
    form.append('expireAfter', '99999999999999');
    form.append('burn', 'false');

    // Generate UUID v4 sederhana (sesuai contoh)
    const token = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0;
        return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
    });

    const response = await axios.post('https://litter.lusia.moe/post/upload', form, {
        params: { token },
        headers: {
            ...form.getHeaders(),
            'authority': 'litter.lusia.moe',
            'accept': 'application/json, text/plain, */*',
            'accept-language': 'ms-MY,ms;q=0.9,en-US;q=0.8,en;q=0.7,id;q=0.6',
            'origin': 'https://litter.lusia.moe',
            'referer': 'https://litter.lusia.moe/',
            'sec-ch-ua': '"Not A(Brand";v="8", "Chromium";v="132"',
            'sec-ch-ua-mobile': '?1',
            'sec-ch-ua-platform': '"Android"',
            'sec-fetch-dest': 'empty',
            'sec-fetch-mode': 'cors',
            'sec-fetch-site': 'same-origin',
            'user-agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Mobile Safari/537.36'
        }
    });

    return `https://litter.lusia.moe/${response.data.path}`;
}

module.exports = (app) => {
    // Endpoint upload file (POST)
    app.post('/tools/upload', upload.single('file'), async (req, res) => {
        try {
            if (!req.file) {
                return res.status(400).json({
                    status: false,
                    error: 'Tidak ada file yang diupload. Kirim file dengan key "file".'
                });
            }

            const fileBuffer = req.file.buffer;
            const originalName = req.file.originalname;

            const fileUrl = await uploadToLitter(fileBuffer, originalName);

            res.json({
                status: true,
                creator: 'FlowFalcon',
                result: {
                    url: fileUrl,
                    originalName: originalName,
                    size: req.file.size
                }
            });
        } catch (error) {
            console.error(error);
            res.status(500).json({
                status: false,
                error: error.message || 'Gagal mengupload file.'
            });
        }
    });
};
