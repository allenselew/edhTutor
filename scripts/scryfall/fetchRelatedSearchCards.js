import fs from "fs/promises";
import path from "path";
import fetchCards from "./fetchCards.js";

const RESPONSIBLE_CITIZEN_DELAY_MS = 6000;

function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

const INPUT_FILE = path.resolve("data/tutorsWithMergedSearches.json");
const OUTPUT_FILE = path.resolve("data/tutorsWithFetchedRelatedCards.json");

async function main() {
    try {
        const raw = await fs.readFile(INPUT_FILE, "utf8");
        const tutorsData = JSON.parse(raw);

        const results = {};

        for (const [tutor, info] of Object.entries(tutorsData)) {
            results[tutor] = {
                scryfall_uri: info.scryfall_uri,
                relatedSearches: {},
            };

            const relatedQueries = info.relatedSearches || [];
            for (const relatedQuery of relatedQueries) {
                const fullQuery = `f:commander ${relatedQuery}`;
                console.log(`\nTutor: ${tutor}`);
                console.log(`Query: ${fullQuery}`);

                try {
                    const result = await fetchCards(fullQuery);
                    if (!result.fromCache) {
                        await sleep(RESPONSIBLE_CITIZEN_DELAY_MS);
                    }
                    const cardNames = result.cards.map((card) => card.name);
                    results[tutor].relatedSearches[relatedQuery] = cardNames;
                    console.log(`Found ${cardNames.length} cards`);
                } catch (err) {
                    console.error(`Error fetching cards for query "${fullQuery}":`, err.message);
                    results[tutor].relatedSearches[relatedQuery] = [];
                }
            }
        }

        await fs.writeFile(OUTPUT_FILE, JSON.stringify(results, null, 2), "utf8");
        console.log(`\nSaved all results to ${OUTPUT_FILE}`);
    } catch (err) {
        console.error("Error in main:", err);
        process.exit(1);
    }
}

main();
