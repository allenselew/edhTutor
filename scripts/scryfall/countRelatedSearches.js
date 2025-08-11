import fs from "fs/promises";
import path from "path";

async function countRelatedSearches(filePath) {
    try {
        const raw = await fs.readFile(path.resolve(filePath), "utf8");
        const data = JSON.parse(raw);

        let total = 0;
        let count = 0;
        for (const cardName in data) {
            total++;
            if (Array.isArray(data[cardName].relatedSearches) && data[cardName].relatedSearches.length > 0) {
                count++;
            }
        }

        console.log(`Cards with non-empty relatedSearches: ${count} of ${total}`);
    } catch (err) {
        console.error("Error reading or parsing file:", err.message);
    }
}

// Change this path to your actual JSON file
const filename = "./data/tutorsWithSearches.json";

countRelatedSearches(filename);
