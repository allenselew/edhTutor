import fs from "fs/promises";
import path from "path";

import tutorsWithMergedSearches from "./data/tutorsWithMergedSearches.json";

async function buildTutoredByMap() {
    const tutorNames = Object.keys(tutorsWithMergedSearches);

    // Initialize empty map for tutored cards
    const tutoredByMap = {};

    for (const tutor of tutorNames) {
        // TODO: CHANGE THIS, IT SHOULDNT BE ?.relatedSearches
        const related = tutorsWithMergedSearches[tutor]?.relatedSearches || [];

        for (const tutoredCardName of related) {
            if (!tutoredByMap[tutoredCardName]) {
                tutoredByMap[tutoredCardName] = { tutoredBy: [] };
            }
            tutoredByMap[tutoredCardName].tutoredBy.push(tutor);
        }
    }

    // Deduplicate and sort the tutors array for each card
    for (const cardName in tutoredByMap) {
        tutoredByMap[cardName].tutoredBy = [...new Set(tutoredByMap[cardName].tutoredBy)].sort();
    }

    const outPath = path.resolve("data/tutoredByMap.json");
    await fs.writeFile(outPath, JSON.stringify(tutoredByMap, null, 2), "utf8");
    console.log(`Saved tutoredByMap for ${Object.keys(tutoredByMap).length} cards to ${outPath}`);
}

buildTutoredByMap().catch((err) => {
    console.error("Error building tutoredByMap:", err);
    process.exit(1);
});
