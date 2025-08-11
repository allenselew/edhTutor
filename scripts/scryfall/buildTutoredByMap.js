import fs from "fs/promises";
import path from "path";

async function buildTutoredByMap() {
    try {
        const tutorsPath = path.resolve(process.cwd(), "data", "tutorsWithFetchedRelatedCards.json");
        const bulkPath = path.resolve(process.cwd(), "data", "bulk.json");
        const outPath = path.resolve(process.cwd(), "data", "tutoredByMap.json"); // change if you want a different output

        // Load files
        const [tutorsRaw, bulkRaw] = await Promise.all([
            fs.readFile(tutorsPath, "utf8"),
            fs.readFile(bulkPath, "utf8"),
        ]);

        const tutorsWithFetchedSearches = JSON.parse(tutorsRaw);
        const bulkCards = JSON.parse(bulkRaw);

        const tutoredByMap = {};
        for (let i = 0; i < bulkCards.length; i++) {
            let name = bulkCards[i].name;
            tutoredByMap[name] = { tutoredBy: [] };
        }

        const tutorNames = Object.keys(tutorsWithFetchedSearches);

        for (const tutor of tutorNames) {
            const relatedSearches = tutorsWithFetchedSearches[tutor]?.relatedSearches || {};
            const allTutoredCards = [...new Set(Object.values(relatedSearches).flat())];

            // Add each resolved card to the reverse map
            for (const cardName of allTutoredCards) {
                if (!tutoredByMap[cardName]) {
                    tutoredByMap[cardName] = { tutoredBy: [] };
                }
                tutoredByMap[cardName].tutoredBy.push(tutor);
            }
        }

        // // Deduplicate and sort the tutor lists
        // for (const cardName of Object.keys(tutoredByMap)) {
        //     tutoredByMap[cardName].tutoredBy = [...new Set(tutoredByMap[cardName].tutoredBy)].sort();
        // }

        // Write output
        await fs.writeFile(outPath, JSON.stringify(tutoredByMap, null, 2), "utf8");
        console.log(`Saved tutoredByMap for ${Object.keys(tutoredByMap).length} cards to ${outPath}`);
    } catch (err) {
        console.error("Error building tutoredByMap:", err);
        process.exit(1);
    }
}

buildTutoredByMap();
