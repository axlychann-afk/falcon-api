async function apiv2animewaifu() {
  const res = await fetch("https://api.harzrestapi.web.id/api/v2/anime/waifu?q=neko&apikey=FREE");
  return await res.json();
}

apiv2animewaifu().then(data => {
  console.log(JSON.stringify(data, null, 2));
});
