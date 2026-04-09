async function run() {
  try {
    const headers = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.5',
      'Referer': 'https://howlongtobeat.com/',
    };

    console.log("1. Fetching HLTB Home to find _app script...");
    const homeRes = await fetch('https://howlongtobeat.com/', { headers });
    const html = await homeRes.text();
    
    const scriptMatch = html.match(/\/(_next\/static\/chunks\/pages\/_app-[^"]+\.js)/);
    if (!scriptMatch) {
      throw new Error("Could not find _app JS file in HTML.");
    }
    const scriptUrl = `https://howlongtobeat.com/${scriptMatch[1]}`;
    console.log("Found JS:", scriptUrl);

    console.log("2. Fetching JS to find API Hash...");
    const jsRes = await fetch(scriptUrl, { headers });
    const jsText = await jsRes.text();
    
    // We look for fetch("/api/search/XYZ".concat(a)) or similar patterns.
    // Usually it's `users:{sortCategory:"postcount"}` nearby, then `.concat("api/search/").concat("xyz")`
    // Let's use a broad regex for the concat string
    let apiHash = '';
    const concatMatch = jsText.match(/"\/api\/search\/".concat\("([^"]+)"\)/);
    if (concatMatch) {
        apiHash = concatMatch[1];
    } else {
        const fetchMatch = jsText.match(/"\/api\/search\/([^"]+)"/);
        if (fetchMatch) apiHash = fetchMatch[1];
    }

    let searchUrl = 'https://howlongtobeat.com/api/search';
    if (apiHash) {
        searchUrl = `https://howlongtobeat.com/api/search/${apiHash}`;
        console.log("Found dynamic endpoint:", searchUrl);
    } else {
        console.log("Could not find dynamic hash. Trying default URL.");
    }

    console.log("3. Making POST request to Search...");
    const payload = {
        "searchType": "games",
        "searchTerms": ["satisfactory"],
        "searchPage": 1,
        "size": 20,
        "searchOptions": {
            "games": {
                "userId": 0,
                "platform": "",
                "sortCategory": "popular",
                "rangeCategory": "main",
                "rangeTime": { "min": 0, "max": 0 },
                "gameplay": { "perspective": "", "flow": "", "genre": "" },
                "modifier": ""
            },
            "users": { "sortCategory": "postcount" },
            "filter": "",
            "sort": 0,
            "randomizer": 0
        }
    };

    const searchRes = await fetch(searchUrl, {
        method: 'POST',
        headers: {
            ...headers,
            'Content-Type': 'application/json',
            'Origin': 'https://howlongtobeat.com'
        },
        body: JSON.stringify(payload)
    });

    console.log("Status:", searchRes.status);
    const data = await searchRes.text();
    console.log(data.substring(0, 500)); // Print first 500 chars

  } catch (e) {
    console.error(e);
  }
}

run();
