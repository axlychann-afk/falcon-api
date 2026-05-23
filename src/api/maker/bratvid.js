// bratvid.js - Generate BRAT style video
const { writeFile } = require("fs/promises");
const path = require("path");
const os = require("os");

module.exports = (app) => {
  
  app.get('/maker/bratvid', async (req, res) => {
    try {
      const { text } = req.query;
      if (!text) {
        return res.status(400).json({ 
          status: false, 
          error: 'Parameter text wajib diisi' 
        });
      }
      
      // Cek apakah package ada
      let bratVid;
      try {
        const module = await import('brat-canvas/video');
        bratVid = module.bratVid;
      } catch (e) {
        return res.status(500).json({ 
          status: false, 
          error: 'Package brat-canvas tidak terinstall. Jalankan: npm install brat-canvas' 
        });
      }
      
      // Pake temporary file
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
        brat: { BLUR: 0 },
        onProgress: ({ current, total, text: progressText }) => {
          console.log(`Progress: ${current}/${total} - ${progressText}`);
        }
      });
      
      await writeFile(outputPath, buf);
      
      // Kirim file sebagai response
      res.sendFile(outputPath, (err) => {
        if (err) console.error(err);
        // Hapus file setelah dikirim
        require('fs').unlink(outputPath, () => {});
      });
      
    } catch (error) {
      res.status(500).json({ 
        status: false, 
        error: error.message 
      });
    }
  });
  
};
