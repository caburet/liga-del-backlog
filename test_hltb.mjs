import { HowLongToBeatService } from 'howlongtobeat';

const hltbService = new HowLongToBeatService();

async function run() {
  console.log("Searching for Satisfactory...");
  const results = await hltbService.search('Satisfactory');
  console.log("Results:");
  console.log(JSON.stringify(results, null, 2));
}

run();
