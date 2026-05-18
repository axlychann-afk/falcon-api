const multer = require('multer');
const axios = require('axios');
const FormData = require('form-data');

// Setup multer dengan memory storage (file disimpan di RAM)
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// Fungsi upload ke litter.lusia.moe dari buffer
async function uploadToLitter(fileBuffer, originalname) {
    const form = new FormData();
    form.append('file', fileBuffer, { filename: originalname });
    form.append('expireAfter', '99999999999999');
    form.append('burn', 'false');

    // Generate UUID v4 sederhana
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
            'origin': 'https://litter.lusia.moe',
            'referer': 'https://litter.lusia.moe/',
            'user-agent': 'Mozilla/5.0 (Linux; Android 10) Chrome/132.0.0.0'
        }
    });

    return `https://litter.lusia.moe/${response.data.path}`;
}

module.exports = (app) => {
    // ========== ENDPOINT GET: TAMPILKAN FORM UPLOAD (untuk test di browser) ==========
    app.get('/tools/upload', (req, res) => {
        res.send(`
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1">
                <title>Upload File ke litter.lusia.moe</title>
                <style>
                    body {
                        font-family: Arial, sans-serif;
                        max-width: 600px;
                        margin: 50px auto;
                        padding: 20px;
                        background: #f5f5f5;
                    }
                    .container {
                        background: white;
                        border-radius: 12px;
                        padding: 30px;
                        box-shadow: 0 4px 12px rgba(0,0,0,0.1);
                    }
                    h2 { color: #333; margin-top: 0; }
                    input[type="file"] {
                        padding: 10px;
                        border: 1px solid #ccc;
                        border-radius: 8px;
                        width: 100%;
                        margin-bottom: 20px;
                    }
                    button {
                        background: #007bff;
                        color: white;
                        border: none;
                        padding: 12px 24px;
                        border-radius: 8px;
                        cursor: pointer;
                        font-size: 16px;
                    }
                    button:hover { background: #0056b3; }
                    .result {
                        margin-top: 20px;
                        padding: 15px;
                        background: #e9ecef;
                        border-radius: 8px;
                        word-break: break-all;
                    }
                    .result a { color: #007bff; text-decoration: none; }
                    .result a:hover { text-decoration: underline; }
                    .error { color: red; }
                </style>
            </head>
            <body>
                <div class="container">
                    <h2>📤 Upload Gambar / Video ke Litter</h2>
                    <form id="uploadForm" enctype="multipart/form-data">
                        <input type="file" name="file" accept="image/*,video/*" required>
                        <button type="submit">Upload</button>
                    </form>
                    <div id="result" class="result" style="display:none;"></div>
                </div>
                <script>
                    const form = document.getElementById('uploadForm');
                    const resultDiv = document.getElementById('result');

                    form.addEventListener('submit', async (e) => {
                        e.preventDefault();
                        resultDiv.style.display = 'block';
                        resultDiv.innerHTML = '⏳ Uploading...';
                        resultDiv.classList.remove('error');

                        const formData = new FormData(form);
                        try {
                            const response = await fetch('/tools/upload', {
                                method: 'POST',
                                body: formData
                            });
                            const json = await response.json();
                            if (json.status) {
                                resultDiv.innerHTML = \`✅ Upload berhasil!<br>
                                <strong>URL:</strong> <a href="\${json.result.url}" target="_blank">\${json.result.url}</a><br>
                                <strong>Nama asli:</strong> \${json.result.originalName}<br>
                                <strong>Ukuran:</strong> \${json.result.size} bytes\`;
                            } else {
                                resultDiv.innerHTML = \`❌ Gagal: \${json.error}\`;
                                resultDiv.classList.add('error');
                            }
                        } catch (err) {
                            resultDiv.innerHTML = \`❌ Error: \${err.message}\`;
                            resultDiv.classList.add('error');
                        }
                    });
                </script>
            </body>
            </html>
        `);
    });

    // ========== ENDPOINT POST: TERIMA FILE & UPLOAD KE LITTER ==========
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
            const fileSize = req.file.size;

            const uploadedUrl = await uploadToLitter(fileBuffer, originalName);

            res.json({
                status: true,
                creator: 'FlowFalcon',
                result: {
                    url: uploadedUrl,
                    originalName: originalName,
                    size: fileSize
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
