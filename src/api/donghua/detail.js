const axios = require('axios');
const cheerio = require('cheerio');

const BASE_URL = "https://anichin.moe";

const getCreator = () => {
  return (global.apikey && global.apikey[0]) ? global.apikey[0] : 'AxlyDev';
};

module.exports = (app) => {
  
  app.get('/donghua/detail', async (req, res) => {
    const { slug } = req.query;
    
    if (!slug) {
      return res.status(400).json({
        status: false,
        creator: getCreator(),
        error: 'Parameter "slug" diperlukan (contoh: ?slug=renegade-immortal)'
      });
    }
    
    try {
      const url = `${BASE_URL}/${slug}/`;
      const { data } = await axios.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': 'text/html,application/xhtml+xml',
          'Accept-Language': 'id-ID,id;q=0.9'
        },
        timeout: 15000
      });
      
      const $ = cheerio.load(data);
      
      const detail = {
        title: "",
        alternative: "",
        rating: "",
        status: "",
        type: "",
        studio: "",
        network: "",
        releaseDate: "",
        duration: "",
        season: "",
        country: "",
        totalEpisodes: "",
        subber: "",
        genres: [],
        sinopsis: "",
        cover: null,
        episodes: []
      };
      
      detail.title = $(".single-info .infox .infolimit h2").text().trim();
      detail.alternative = $(".single-info .infox .infolimit .alter").text().trim();
      
      const ratingText = $(".single-info .infox .rating strong").text().trim();
      detail.rating = ratingText.replace("Rating ", "");
      
      detail.cover = $(".single-info .thumb img").attr("src") || null;
      
      $(".single-info .infox .spe span").each((_, el) => {
        const text = $(el).text().trim();
        if (text.includes("Status:")) detail.status = text.replace("Status:", "").trim();
        if (text.includes("Tipe:")) detail.type = text.replace("Tipe:", "").trim();
        if (text.includes("Studio:")) detail.studio = text.replace("Studio:", "").trim();
        if (text.includes("Network:")) detail.network = text.replace("Network:", "").trim();
        if (text.includes("Tanggal rilis:")) detail.releaseDate = text.replace("Tanggal rilis:", "").trim();
        if (text.includes("Durasi:")) detail.duration = text.replace("Durasi:", "").trim();
        if (text.includes("Season:")) detail.season = text.replace("Season:", "").trim();
        if (text.includes("Negara:")) detail.country = text.replace("Negara:", "").trim();
        if (text.includes("Episode:")) detail.totalEpisodes = text.replace("Episode:", "").trim();
        if (text.includes("Subber:")) detail.subber = text.replace("Subber:", "").trim();
      });
      
      $(".single-info .infox .genxed a").each((_, el) => {
        detail.genres.push($(el).text().trim());
      });
      
      detail.sinopsis = $(".single-info .infox .desc h4").last().text().trim();
      
      $(".eplister ul li").each((_, el) => {
        const episodeTitle = $(el).find(".epl-title").text().trim();
        const episodeLink = $(el).find("a").attr("href");
        const episodeDate = $(el).find(".epl-date").text().trim();
        
        if (episodeTitle && episodeLink) {
          detail.episodes.push({
            number: detail.episodes.length + 1,
            title: episodeTitle,
            url: episodeLink,
            date: episodeDate || null
          });
        }
      });
      
      res.json({
        status: true,
        creator: getCreator(),
        result: detail
      });
      
    } catch (error) {
      console.error('[Detail Error]', error.message);
      
      if (error.response?.status === 403) {
        return res.status(403).json({
          status: false,
          creator: getCreator(),
          error: 'Akses ditolak oleh Cloudflare',
          note: 'Website Anichin memblokir request dari server'
        });
      }
      
      if (error.response?.status === 404) {
        return res.status(404).json({
          status: false,
          creator: getCreator(),
          error: 'Donghua tidak ditemukan',
          note: 'Periksa kembali slug'
        });
      }
      
      res.status(500).json({
        status: false,
        creator: getCreator(),
        error: error.message
      });
    }
  });
};
