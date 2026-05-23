// samehadaku.js - Scraper Samehadaku (support Google Drive & Mp4Upload)
const axios = require('axios');
const cheerio = require('cheerio');

class SamehadakuScraper {
  constructor() {
    this.baseUrl = 'https://samehadaku.mba';
    this.headers = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9',
      'Accept-Language': 'id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7'
    };
  }

  // Search anime
  async searchAnime(keyword) {
    const url = `${this.baseUrl}/?s=${encodeURIComponent(keyword)}`;
    const response = await axios.get(url, { headers: this.headers, timeout: 30000 });
    const $ = cheerio.load(response.data);
    const results = [];

    $('.post-item').each((i, el) => {
      const link = $(el).find('h2 a').attr('href');
      const title = $(el).find('h2 a').text().trim();
      const image = $(el).find('.post-thumb img').attr('src');
      const status = $(el).find('.status').text().trim();
      const eps = $(el).find('.eps').text().trim();
      
      if (title && link) {
        results.push({ title, link, image, status, eps });
      }
    });

    return { keyword, totalResults: results.length, results };
  }

  // Extract link video dari halaman episode
  async getEpisodeStream(episodeUrl) {
    const response = await axios.get(episodeUrl, { headers: this.headers, timeout: 30000 });
    const $ = cheerio.load(response.data);
    
    const streamUrls = [];
    
    // Cari link Google Drive
    $('a[href*="drive.google.com"]').each((i, el) => {
      streamUrls.push({ provider: 'Google Drive', url: $(el).attr('href') });
    });
    
    // Cari link Mp4Upload
    $('a[href*="mp4upload.com"]').each((i, el) => {
      streamUrls.push({ provider: 'Mp4Upload', url: $(el).attr('href') });
    });
    
    // Cari link Streamtape
    $('a[href*="streamtape.com"]').each((i, el) => {
      streamUrls.push({ provider: 'Streamtape', url: $(el).attr('href') });
    });
    
    // Cari link dari iframe (fallback)
    $('iframe').each((i, el) => {
      const src = $(el).attr('src');
      if (src && (src.includes('drive') || src.includes('mp4') || src.includes('streamtape'))) {
        streamUrls.push({ provider: 'Iframe', url: src });
      }
    });
    
    return {
      title: $('h1.entry-title').text().trim(),
      streamUrls: streamUrls,
      totalStreams: streamUrls.length
    };
  }

  // Get anime detail + episode list
  async getAnimeDetail(url) {
    const response = await axios.get(url, { headers: this.headers, timeout: 30000 });
    const $ = cheerio.load(response.data);
    
    const title = $('h1.entry-title').text().trim();
    const image = $('.thumb img').attr('src');
    
    const info = {};
    $('.info-content p').each((i, el) => {
      const text = $(el).text().trim();
      const parts = text.split(':');
      if (parts.length >= 2) {
        const key = parts[0].trim();
        const value = parts.slice(1).join(':').trim();
        info[key] = value;
      }
    });
    
    const sinopsis = $('.entry-content p').eq(0).text().trim();
    
    const episodes = [];
    $('.eplist li').each((i, el) => {
      const episodeLink = $(el).find('a').attr('href');
      const episodeNum = $(el).find('.episode-num').text().trim();
      const episodeTitle = $(el).find('.episode-title').text().trim();
      const date = $(el).find('.date').text().trim();
      
      if (episodeLink) {
        episodes.push({ episode: episodeNum, title: episodeTitle, link: episodeLink, date });
      }
    });
    
    return {
      title, image, info, sinopsis,
      totalEpisodes: episodes.length,
      episodes: episodes.reverse(),
      url
    };
  }

  async randomAnime() {
    const keywords = ['action', 'fantasy', 'romance', 'comedy', 'adventure', 'drama', 'isekai'];
    const randomKeyword = keywords[Math.floor(Math.random() * keywords.length)];
    const searchResult = await this.searchAnime(randomKeyword);
    
    if (searchResult.totalResults === 0) return { error: 'Gak dapet anime random' };
    
    const randomIndex = Math.floor(Math.random() * searchResult.results.length);
    const randomAnime = searchResult.results[randomIndex];
    const detail = await this.getAnimeDetail(randomAnime.link);
    
    return { random: true, keywordUsed: randomKeyword, result: { basic: randomAnime, detail } };
  }
}

module.exports = (app) => {
  const scraper = new SamehadakuScraper();

  // GET /anime/samehadaku/search?q=keyword
  app.get('/anime/samehadaku/search', async (req, res) => {
    try {
      const { q } = req.query;
      if (!q) return res.status(400).json({ status: false, error: 'Parameter q (keyword) wajib diisi' });
      const result = await scraper.searchAnime(q);
      res.json({ status: true, creator: 'AxlyDev', data: result });
    } catch (error) {
      res.status(500).json({ status: false, error: error.message });
    }
  });

  // GET /anime/samehadaku/detail?url=xxx
  app.get('/anime/samehadaku/detail', async (req, res) => {
    try {
      const { url } = req.query;
      if (!url) return res.status(400).json({ status: false, error: 'Parameter url wajib diisi' });
      const result = await scraper.getAnimeDetail(url);
      res.json({ status: true, creator: 'AxlyDev', data: result });
    } catch (error) {
      res.status(500).json({ status: false, error: error.message });
    }
  });

  // GET /anime/samehadaku/stream?url=xxx
  app.get('/anime/samehadaku/stream', async (req, res) => {
    try {
      const { url } = req.query;
      if (!url) return res.status(400).json({ status: false, error: 'Parameter url episode wajib diisi' });
      const result = await scraper.getEpisodeStream(url);
      res.json({ status: true, creator: 'AxlyDev', data: result });
    } catch (error) {
      res.status(500).json({ status: false, error: error.message });
    }
  });

  // GET /anime/samehadaku/random
  app.get('/anime/samehadaku/random', async (req, res) => {
    try {
      const result = await scraper.randomAnime();
      if (result.error) return res.status(404).json({ status: false, error: result.error });
      res.json({ status: true, creator: 'AxlyDev', data: result });
    } catch (error) {
      res.status(500).json({ status: false, error: error.message });
    }
  });
};
