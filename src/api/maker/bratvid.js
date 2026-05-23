// bratvid.js - Generate BRAT style video (dengan FFmpeg path fix)
const { writeFile } = require('fs/promises');
const { unlink } = require('fs');
const path = require('path');
const os = require('os');

// SET FFMPEG PATH - WAJIB!
const ffmpeg = require('fluent-ffmpeg');
const ffmpegInstaller = require('@ffmpeg-installer/ffmpeg');
ffmpeg.setFfmpegPath(ffmpegInstaller.path);

module.exports = (app) => {
  
  // GET /maker/bratvid?text=kata
  app.get('/maker/bratvid', async (req, res) => {
    try {
      const { text } = req.query;
      
      if (!text) {
        return res.status(400).json({ 
          status: false, 
          creator: 'AxlyDev',
          error: 'Parameter text (teks) wajib diisi' 
        });
      }
      
      // Cek package brat-canvas
      let bratVid;
      try {
        const module = await import('brat-canvas/video');
        bratVid = module.bratVid;
      } catch (e) {
        return res.status(500).json({ 
          status: false, 
          creator: 'AxlyDev',
          error: 'Package brat-canvas tidak terinstall. Jalankan: npm install brat-canvas' 
        });
      }
      
      // Buat temporary file di folder temp OS
      const tempDir = os.tmpdir();
      const outputPath = path.join(tempDir, `brat_${Date.now()}.mp4`);
      
      // Generate video
      const buf = await bratVid(text, {
        outputFormat: "mp4",
        fast_progress: true,
        lyric: {
          maxWordPerLayer: 5,
          frameDuration: 0.7,
          lastFrameDuration: 1.5
        },
        brat: {
          BLUR: 0
        },
        onProgress: ({ current, total, text: progressText }) => {
          console.log(`Progress: ${current}/${total} - ${progressText}`);
        }
      });
      
      // Simpan ke file temporary
      await writeFile(outputPath, buf);
      
      // Kirim file sebagai response
      res.sendFile(outputPath, (err) => {
        if (err) {
          console.error('Error sending file:', err);
          res.status(500).json({ 
            status: false, 
            error: 'Gagal mengirim file video' 
          });
        }
        // Hapus file temporary setelah dikirim
        unlink(outputPath, (unlinkErr) => {
          if (unlinkErr) console.error('Gagal hapus file temp:', unlinkErr);
        });
      });
      
    } catch (error) {
      console.error('Brat Video Error:', error);
      res.status(500).json({ 
        status: false, 
        creator: 'AxlyDev',
        error: error.message 
      });
    }
  });
  
  // POST /maker/bratvid (support JSON body)
  app.post('/maker/bratvid', async (req, res) => {
    try {
      const { text } = req.body;
      
      if (!text) {
        return res.status(400).json({ 
          status: false, 
          creator: 'AxlyDev',
          error: 'Parameter text (teks) wajib diisi' 
        });
      }
      
      let bratVid;
      try {
        const module = await import('brat-canvas/video');
        bratVid = module.bratVid;
      } catch (e) {
        return res.status(500).json({ 
          status: false, 
          creator: 'AxlyDev',
          error: 'Package brat-canvas tidak terinstall' 
        });
      }
      
      const tempDir = os.tmpdir();
      const outputPath = path.join(tempDir, `brat_${Date.now()}.mp4`);
      
      const buf = await bratVid(text, {
        outputFormat: "mp4",
        fast_progress: true,
        lyric: {
          maxWordPerLayer: 5,
          frameDuration: 0.7,
          lastFrameDuration: 1.5
        },
        brat: { BLUR: 0 }
      });
      
      await writeFile(outputPath, buf);
      
      res.sendFile(outputPath, (err) => {
        if (err) console.error(err);
        unlink(outputPath, () => {});
      });
      
    } catch (error) {
      res.status(500).json({ 
        status: false, 
        creator: 'AxlyDev',
        error: error.message 
      });
    }
  });
  
};
