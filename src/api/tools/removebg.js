const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

class UnwatermarkClient {
    constructor({
        productCode = "067003",
        baseURL = "https://api.unwatermark.ai",
        userAgent = "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36"
    } = {}) {
        this.baseURL = baseURL;
        this.productCode = productCode;
        this.userAgent = userAgent;
        this.productSerial = Buffer.from(String(Date.now())).toString("base64");
    }

    generateFakeIpHeaders() {
        return {
            "x-forwarded-for": `${this.rand()}.${this.rand()}.${this.rand()}.${this.rand()}`,
            "x-real-ip": `${this.rand()}.${this.rand()}.${this.rand()}.${this.rand()}`
        };
    }

    rand() {
        return Math.floor(Math.random() * 255);
    }

    commonHeaders(extra = {}) {
        return {
            accept: "*/*",
            "accept-language": "ms-MY",
            "cache-control": "no-cache",
            pragma: "no-cache",
            origin: "https://unwatermark.ai",
            referer: "https://unwatermark.ai/",
            "product-code": this.productCode,
            "product-serial": this.productSerial,
            "user-agent": this.userAgent,
            ...extra
        };
    }

    async createJob(imagePath, options = {}) {
        const form = new FormData();
        
        // Cek apakah imagePath berupa buffer atau file path
        if (Buffer.isBuffer(imagePath)) {
            form.append("original_image_file", imagePath, { filename: `image_${Date.now()}.png` });
        } else {
            form.append("original_image_file", fs.createReadStream(imagePath));
        }
        
        form.append("output_format", options.output_format ?? "jpg");
        form.append("is_remove_text", options.is_remove_text ?? "true");
        form.append("is_remove_logo", options.is_remove_logo ?? "false");
        form.append("is_enhancer", options.is_enhancer ?? "false");

        const { data } = await axios.post(
            `${this.baseURL}/api/web/v1/image-watermark-auto-remove-upgrade/create-job`,
            form,
            {
                headers: {
                    ...form.getHeaders(),
                    ...this.commonHeaders(),
                    ...this.generateFakeIpHeaders()
                }
            }
        );

        return data;
    }

    async getJob(jobId) {
        const { data } = await axios.get(
            `${this.baseURL}/api/web/v1/image-watermark-auto-remove-upgrade/get-job/${jobId}`,
            {
                headers: this.commonHeaders({
                    "content-type": "application/json; charset=UTF-8"
                })
            }
        );
        return data;
    }

    async waitUntilDone(jobId, interval = 7000, onProgress) {
        return new Promise((resolve, reject) => {
            const timer = setInterval(async () => {
                try {
                    const res = await this.getJob(jobId);
                    if (onProgress) onProgress(res);
                    if (res?.result?.status === 1) {
                        clearInterval(timer);
                        resolve(res);
                    }
                } catch (err) {
                    clearInterval(timer);
                    reject(err);
                }
            }, interval);
        });
    }

    async removeBackground(imagePath, options = {}) {
        const job = await this.createJob(imagePath, options);
        if (!job?.result?.job_id) {
            throw new Error('Gagal membuat job');
        }
        const result = await this.waitUntilDone(job.result.job_id, 7000);
        if (result?.result?.status === 1 && result?.result?.output_image_url) {
            return result.result.output_image_url;
        }
        throw new Error('Gagal menghapus background');
    }
}

module.exports = (app) => {
    const client = new UnwatermarkClient();

    // Endpoint untuk remove background dari URL gambar
    app.get('/tools/removebg', async (req, res) => {
        const { url } = req.query;
        
        if (!url) {
            return res.status(400).json({
                status: false,
                error: 'Parameter "url" diperlukan (URL gambar yang mau dihapus backgroundnya)'
            });
        }

        try {
            // Download gambar dari URL
            const imageResponse = await axios.get(url, {
                responseType: 'arraybuffer',
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36'
                }
            });
            
            const imageBuffer = Buffer.from(imageResponse.data);
            
            // Simpan sementara ke temp file
            const tempPath = path.join('/tmp', `removebg_${Date.now()}.png`);
            fs.writeFileSync(tempPath, imageBuffer);
            
            // Proses remove background
            const resultUrl = await client.removeBackground(tempPath);
            
            // Hapus file temporary
            fs.unlinkSync(tempPath);
            
            res.json({
                status: true,
                creator: 'FlowFalcon',
                result: {
                    original_url: url,
                    result_url: resultUrl
                }
            });
        } catch (error) {
            console.error(error);
            res.status(500).json({
                status: false,
                error: error.message || 'Gagal menghapus background'
            });
        }
    });

    // Endpoint untuk upload file langsung (buat bot WA)
    const multer = require('multer');
    const upload = multer({ dest: '/tmp/' });
    
    app.post('/tools/removebg', upload.single('file'), async (req, res) => {
        try {
            if (!req.file) {
                return res.status(400).json({
                    status: false,
                    error: 'Kirim file gambar dengan key "file"'
                });
            }
            
            const resultUrl = await client.removeBackground(req.file.path);
            
            // Hapus file temporary
            fs.unlinkSync(req.file.path);
            
            res.json({
                status: true,
                creator: 'FlowFalcon',
                result: {
                    result_url: resultUrl
                }
            });
        } catch (error) {
            res.status(500).json({
                status: false,
                error: error.message
            });
        }
    });
};
