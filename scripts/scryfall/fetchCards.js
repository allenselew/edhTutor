import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const RESPONSIBLE_CITIZEN_DELAY_MS = 6000;
const CACHE_DIR = "data/scryfall/cache";
const CACHE_EXPIRY_MS = 12 * 60 * 60 * 1000; // 12 hours

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function slugify(str) {
    return str
        .toLowerCase()
        .replace(/\s+/g, "_")
        .replace(/[^a-z0-9_-]/g, "");
}

async function isCacheValid(cachePath) {
    try {
        const stats = await fs.stat(cachePath);
        const age = Date.now() - stats.mtimeMs;
        return age < CACHE_EXPIRY_MS;
    } catch {
        return false;
    }
}

async function readCache(cachePath) {
    const json = await fs.readFile(cachePath, "utf8");
    return JSON.parse(json);
}

async function writeCache(cachePath, data) {
    await fs.mkdir(path.dirname(cachePath), { recursive: true });
    await fs.writeFile(cachePath, JSON.stringify(data, null, 2), "utf8");
}

async function cleanOldCachesForQuery(slug, currentCachePath) {
    try {
        const cacheDirPath = path.resolve(__dirname, CACHE_DIR);
        const files = await fs.readdir(cacheDirPath);

        for (const file of files) {
            if (file.startsWith(slug) && file !== path.basename(currentCachePath)) {
                const filePath = path.join(cacheDirPath, file);
                try {
                    await fs.unlink(filePath);
                    console.log(`Deleted old cache file: ${filePath}`);
                } catch (err) {
                    console.warn(`Failed to delete cache file ${filePath}: ${err.message}`);
                }
            }
        }
    } catch {
        // ignore if cache dir doesn't exist or error reading it
    }
}

function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchCards(query, outputFileName = null) {
    const encodedQuery = encodeURIComponent(query);
    const slug = slugify(query);
    const cachePath = path.resolve(__dirname, CACHE_DIR, `${slug}.json`);
    let usedCache = false;

    if (await isCacheValid(cachePath)) {
        console.log(`Using cached fetchCards results for query "${query}"`);
        usedCache = true;
        return { cards: await readCache(cachePath), fromCache: usedCache };
    }

    let url = `https://api.scryfall.com/cards/search?q=${encodedQuery}`;
    let allCards = [];

    try {
        while (url) {
            console.log(`Fetching: ${url}`);
            const response = await fetch(url);

            if (!response.ok) {
                throw new Error(`Scryfall API error: ${response.status} ${response.statusText}`);
            }

            const data = await response.json();

            if (!data.data || data.data.length === 0) {
                console.log("No more cards found.");
                break;
            }

            allCards.push(...data.data);

            if (data.has_more && data.next_page) {
                console.log(`Waiting ${RESPONSIBLE_CITIZEN_DELAY_MS / 1000} seconds before fetching next page...`);
                await sleep(RESPONSIBLE_CITIZEN_DELAY_MS);
                url = data.next_page;
            } else {
                url = null;
            }
        }

        await writeCache(cachePath, allCards);

        await cleanOldCachesForQuery(slug, cachePath);

        if (outputFileName) {
            const outputDir = path.resolve(__dirname, "../../data/scryfall");
            await fs.mkdir(outputDir, { recursive: true });
            const outputPath = path.join(outputDir, outputFileName);
            await fs.writeFile(outputPath, JSON.stringify(allCards, null, 2), "utf8");
            console.log(`Saved results to: ${outputPath}`);
        }

        console.log(`\nFound ${allCards.length} cards in total.`);
        return { cards: allCards, fromCache: usedCache };
    } catch (err) {
        console.error("Error fetching cards:", err.message);
        return [];
    }
}

// CLI entry point
if (import.meta.url === `file://${process.argv[1]}`) {
    const args = process.argv.slice(2);
    const query = args[0];
    const outputFileName = args[1] || null;

    if (!query) {
        console.error('Usage: node fetchCards.js "<query>" [outputFileName]');
        process.exit(1);
    }

    fetchCards(query, outputFileName);
}

export default fetchCards;
