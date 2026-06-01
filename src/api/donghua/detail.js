const axios = require('axios');
const cheerio = require('cheerio');

const BASE_URL = "https://anichin.moe";

const getCreator = () => {
  return (global.apikey && global.apikey[0]) ? global.apikey[0] : 'AxlyDev';
};

// Fungsi cari slug dari title
async function searchSlug(title) {
  const searchUrl = `${BASE_URL}/?s=${encodeURIComponent(title)}`;
  const { data } = await axios.get(searchUrl, {
    headers: { 'User-Agent': 'Mozilla/5.0' }
  });
  const $ = cheerio.load(data);
  
  let slug = null;
  $('.listupd .bs .bsx a').each((_, el) => {
    const href = $(el).attr('href');
    const linkTitle = $(el).find('.tt').text().trim().toLowerCase();
    if (linkTitle.includes(title.toLowerCase()) || title.toLowerCase().includes(linkTitle)) {
      slug = href.split('/').filter(p => p).pop();
      return false;
    }
  });
  
  return slug;
}

module.exports = (app) => {
  
  app.get('/donghua/detail', async (req, res) => {
    const { title } = req.query;
    
    if (!title) {
      return res.status(400).json({
        status: false,
        creator: getCreator(),
        error: 'Parameter "title" diperlukan (contoh: ?title=renegade+immortal)'
      });
    }
    
    try {
      // Cari slug dari title
      const slug = await searchSlug(title);
      if (!slug) {
        return res.status(404).json({
          status: false,
          creator: getCreator(),
          error: `Donghua dengan judul "${title}" tidak ditemukan`
        });
      }
      
      const url = `${BASE_URL}/${slug}/`;
      const { data } = await axios.get(url, {
        headers: { 'User-Agent': 'Mozilla/5.0' },
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
      res.status(500).json({
        status: false,
        creator: getCreator(),
        error: error.message
      });
    }
  });
};
