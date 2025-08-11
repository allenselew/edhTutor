import fetchCards from "./fetchCards.js";
import scrapeRelatedSearches from "./scrapeRelatedSearches.js";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const RESPONSIBLE_CITIZEN_DELAY_MS = 6000;

function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchTutorsWithSearches() {
    const query = "otag:tutor f:commander";
    console.log(`Fetching cards for query: ${query}`);

    const cards = await fetchCards(query);

    console.log(`Scraping related searches for ${cards.length} cards...`);
    const results = {};

    for (const card of cards) {
        console.log(`\nScraping related searches for card: ${card.name}`);

        const { relatedSearches, fromCache } = await scrapeRelatedSearches(card.scryfall_uri);

        results[card.name] = {
            scryfall_uri: card.scryfall_uri,
            relatedSearches,
        };

        if (!fromCache) {
            await sleep(RESPONSIBLE_CITIZEN_DELAY_MS);
        }
    }

    const outputDir = path.resolve(__dirname, "./data/scryfall");
    await fs.mkdir(outputDir, { recursive: true });

    const outputPath = path.join(outputDir, "tutorsWithSearches.json");
    await fs.writeFile(outputPath, JSON.stringify(results, null, 2), "utf8");

    console.log(`\nAll data saved to ${outputPath}`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
    fetchTutorsWithSearches();
}

export default fetchTutorsWithSearches;
