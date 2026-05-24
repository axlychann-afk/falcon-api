// y2mate.js - YouTube to MP3 Downloader via Y2Mate (by Kayllano Aveline)
const axios = require("axios");

async function y2mateDownloader(youtubeUrl) {
  try {
    const timestamp = Date.now();
    
    const authResponse = await axios.get("https://eta.etacloud.org/api/v1/auth", {
      params: { _: timestamp },
      headers: {
        "Origin": "https://v3.y2mate.nu",
        "Referer": "https://v3.y2mate.nu/",
        "User-Agent": "Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Mobile Safari/537.36"
      },
      timeout: 30000
    });
    
    if (authResponse.data.err !== 0) {
      return { success: false, error: "Auth failed" };
    }
    
    const key = authResponse.data.key;
    
    const initResponse = await axios.get("https://eta.etacloud.org/api/v1/init", {
      params: { _: timestamp + 1 },
      headers: {
        "Authorization": `Bearer ${key}`,
        "Origin": "https://v3.y2mate.nu",
        "Referer": "https://v3.y2mate.nu/",
        "User-Agent": "Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Mobile Safari/537.36"
      },
      timeout: 30000
    });
    
    if (initResponse.data.error !== "0") {
      return { success: false, error: "Init failed" };
    }
    
    const convertURL = initResponse.data.convertURL;
    
    // Extract video ID dari URL YouTube
    let videoId;
    if (youtubeUrl.includes("v=")) {
      videoId = new URLSearchParams(youtubeUrl.split("?")[1]).get("v");
    } else if (youtubeUrl.includes("youtu.be/")) {
      videoId = youtubeUrl.split("youtu.be/")[1].split("?")[0];
    } else {
      videoId = youtubeUrl.split("/").pop();
    }
    
    const convertResponse = await axios.get(convertURL, {
      params: {
        v: videoId,
        f: "mp3",
        _: timestamp + 2
      },
      headers: {
        "Origin": "https://v3.y2mate.nu",
        "Referer": "https://v3.y2mate.nu/",
        "User-Agent": "Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Mobile Safari/537.36"
      },
      timeout: 30000
    });
    
    if (convertResponse.data.error !== 0) {
      return { success: false, error: "Convert failed" };
    }
    
    if (convertResponse.data.redirect === 1) {
      const redirectResponse = await axios.get(convertResponse.data.redirectURL, {
        headers: {
          "Origin": "https://v3.y2mate.nu",
          "Referer": "https://v3.y2mate.nu/",
          "User-Agent": "Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Mobile Safari/537.36"
        },
        timeout: 30000
      });
      
      return {
        success: true,
        title: redirectResponse.data.title,
        downloadURL: redirectResponse.data.downloadURL,
        progressURL: redirectResponse.data.progressURL
      };
    }
    
    return {
      success: true,
      title: convertResponse.data.title,
      downloadURL: convertResponse.data.downloadURL,
      progressURL: convertResponse.data.progressURL
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

async function getDownloadLink(downloadURL) {
  try {
    const response = await axios.get(downloadURL, {
      headers: {
        "Origin": "https://v3.y2mate.nu",
        "Referer": "https://v3.y2mate.nu/",
        "User-Agent": "Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Mobile Safari/537.36"
      },
      timeout: 30000
    });
    
    if (response.data && response.data.downloadURL) {
      return response.data.downloadURL;
    }
    
    return null;
  } catch (error) {
    return null;
  }
}

// ========== EXPRESS ENDPOINT ==========
module.exports = (app) => {
  
  // GET /download/y2mate?url=xxx
  app.get('/download/ytmp3', async (req, res) => {
    try {
      const { url } = req.query;
      
      if (!url) {
        return res.status(400).json({
          status: false,
          creator: 'AxlyDev',
          error: 'Parameter url (link YouTube) wajib diisi'
        });
      }
      
      if (!url.includes('youtu.be') && !url.includes('youtube.com')) {
        return res.status(400).json({
          status: false,
          creator: 'AxlyDev',
          error: 'URL harus dari YouTube'
        });
      }
      
      const result = await y2mateDownloader(url);
      
      if (!result.success) {
        return res.status(500).json({
          status: false,
          creator: 'AxlyDev',
          error: result.error
        });
      }
      
      // Ambil final download link
      let finalLink = null;
      if (result.downloadURL) {
        finalLink = await getDownloadLink(result.downloadURL);
      }
      
      res.json({
        status: true,
        creator: 'AxlyDev',
        result: {
          title: result.title,
          downloadUrl: finalLink || result.downloadURL,
          progressUrl: result.progressURL
        }
      });
      
    } catch (error) {
      res.status(500).json({
        status: false,
        creator: 'AxlyDev',
        error: error.message
      });
    }
  });
  
  // GET /download/y2mate/mp4?url=xxx (untuk video)
  app.get('/download/ytmp4', async (req, res) => {
    try {
      const { url } = req.query;
      
      if (!url) {
        return res.status(400).json({
          status: false,
          creator: 'AxlyDev',
          error: 'Parameter url (link YouTube) wajib diisi'
        });
      }
      
      if (!url.includes('youtu.be') && !url.includes('youtube.com')) {
        return res.status(400).json({
          status: false,
          creator: 'AxlyDev',
          error: 'URL harus dari YouTube'
        });
      }
      
      // Untuk video, format mp4
      const timestamp = Date.now();
      
      const authResponse = await axios.get("https://eta.etacloud.org/api/v1/auth", {
        params: { _: timestamp },
        headers: {
          "Origin": "https://v3.y2mate.nu",
          "Referer": "https://v3.y2mate.nu/",
          "User-Agent": "Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Mobile Safari/537.36"
        },
        timeout: 30000
      });
      
      if (authResponse.data.err !== 0) {
        return res.status(500).json({ status: false, error: "Auth failed" });
      }
      
      const key = authResponse.data.key;
      
      const initResponse = await axios.get("https://eta.etacloud.org/api/v1/init", {
        params: { _: timestamp + 1 },
        headers: {
          "Authorization": `Bearer ${key}`,
          "Origin": "https://v3.y2mate.nu",
          "Referer": "https://v3.y2mate.nu/",
          "User-Agent": "Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Mobile Safari/537.36"
        },
        timeout: 30000
      });
      
      if (initResponse.data.error !== "0") {
        return res.status(500).json({ status: false, error: "Init failed" });
      }
      
      const convertURL = initResponse.data.convertURL;
      
      let videoId;
      if (url.includes("v=")) {
        videoId = new URLSearchParams(url.split("?")[1]).get("v");
      } else if (url.includes("youtu.be/")) {
        videoId = url.split("youtu.be/")[1].split("?")[0];
      } else {
        videoId = url.split("/").pop();
      }
      
      const convertResponse = await axios.get(convertURL, {
        params: {
          v: videoId,
          f: "mp4",
          _: timestamp + 2
        },
        headers: {
          "Origin": "https://v3.y2mate.nu",
          "Referer": "https://v3.y2mate.nu/",
          "User-Agent": "Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Mobile Safari/537.36"
        },
        timeout: 30000
      });
      
      if (convertResponse.data.error !== 0) {
        return res.status(500).json({ status: false, error: "Convert failed" });
      }
      
      let finalLink = null;
      if (convertResponse.data.downloadURL) {
        const linkRes = await axios.get(convertResponse.data.downloadURL, {
          headers: {
            "Origin": "https://v3.y2mate.nu",
            "Referer": "https://v3.y2mate.nu/",
            "User-Agent": "Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Mobile Safari/537.36"
          },
          timeout: 30000
        });
        if (linkRes.data && linkRes.data.downloadURL) {
          finalLink = linkRes.data.downloadURL;
        }
      }
      
      res.json({
        status: true,
        creator: 'AxlyDev',
        result: {
          title: convertResponse.data.title,
          downloadUrl: finalLink || convertResponse.data.downloadURL
        }
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
