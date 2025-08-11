import fs from "fs/promises";
import path from "path";

async function mergeTutorSearches() {
    const basePath = path.resolve("data/");

    const tutorsWithSearchesPath = path.join(basePath, "tutorsWithSearches.json");
    const customSearchesPath = path.join(basePath, "customTutorSearches.json");
    const outputPath = path.join(basePath, "tutorsWithMergedSearches.json");

    const tutorsDataRaw = await fs.readFile(tutorsWithSearchesPath, "utf8");
    const tutorsData = JSON.parse(tutorsDataRaw);

    let customSearches = {};
    try {
        const customRaw = await fs.readFile(customSearchesPath, "utf8");
        customSearches = JSON.parse(customRaw);
    } catch {
        console.warn("No customTutorSearches.json found, proceeding without overrides.");
    }

    // Copy tutorsData to merged object
    const merged = { ...tutorsData };

    for (const tutorName of Object.keys(customSearches)) {
        if (merged[tutorName]) {
            merged[tutorName].relatedSearches = customSearches[tutorName].relatedSearches;
        } else {
            merged[tutorName] = {
                scryfall_uri: null,
                relatedSearches: customSearches[tutorName].relatedSearches,
            };
        }
    }

    await fs.writeFile(outputPath, JSON.stringify(merged, null, 2), "utf8");
    console.log(`Merged data saved to ${outputPath}`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
    mergeTutorSearches();
}

export default mergeTutorSearches;
