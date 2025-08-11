import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import * as cheerio from "cheerio";

const CACHE_DIR = "data/scryfall/cache";
const CACHE_EXPIRY_MS = 12 * 60 * 60 * 1000; // 12 hours

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Utility to make strings safe for filenames
function slugify(str) {
    return str
        .toLowerCase()
        .replace(/https?:\/\//, "") // remove protocol for URLs
        .replace(/[\/?#=&]+/g, "_")
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

// Cleanup old caches for the same slug, except current file
async function cleanOldCachesForSlug(slug, currentCachePath) {
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

async function scrapeRelatedSearches(scryfallPageUrl) {
    const slug = slugify(scryfallPageUrl);
    const cachePath = path.resolve(__dirname, CACHE_DIR, `${slug}.json`);

    if (await isCacheValid(cachePath)) {
        console.log(`Using cached scrape results for ${scryfallPageUrl}`);
        const relatedSearches = await readCache(cachePath);
        return { relatedSearches, fromCache: true };
    }

    try {
        console.log(`Fetching HTML from: ${scryfallPageUrl}`);
        const res = await fetch(scryfallPageUrl);

        if (!res.ok) {
            throw new Error(`HTTP error: ${res.status} ${res.statusText}`);
        }

        const html = await res.text();
        const $ = cheerio.load(html);

        const relatedSearches = [];
        $("div.related-search-string").each((_, el) => {
            const text = $(el).text().trim();
            if (text) relatedSearches.push(text);
        });

        await writeCache(cachePath, relatedSearches);
        await cleanOldCachesForSlug(slug, cachePath);

        console.log(`Found ${relatedSearches.length} related searches.`);
        return { relatedSearches, fromCache: false };
    } catch (err) {
        console.error("Error fetching related searches:", err.message);
        return { relatedSearches: [], fromCache: false };
    }
}

export default scrapeRelatedSearches;

// CLI usage if run directly (optional)
if (import.meta.url === `file://${process.argv[1]}`) {
    const url = process.argv[2];
    if (!url) {
        console.error("Usage: node scrapeRelatedSearches.js <scryfall_page_url>");
        process.exit(1);
    }
    scrapeRelatedSearches(url);
}
