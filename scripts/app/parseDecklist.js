#!/usr/bin/env node

import fs from "fs/promises";
import path from "path";

async function parseDecklist(decklistText) {
    const mapPath = path.resolve("../../scripts/scryfall/data/tutoredByMap.json");
    const mapRaw = await fs.readFile(mapPath, "utf8");
    const tutoredByMap = JSON.parse(mapRaw);

    const cardNamesInDeck = [];
    const lines = decklistText.split("\n");

    for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;

        const parts = trimmed.split(" ");
        if (parts.length < 2) continue;

        parts.shift();

        const nameTokens = [];
        for (const token of parts) {
            if (token.startsWith("(") || /^[0-9]+$/.test(token) || token === "*F*" || token.startsWith("[")) break;
            nameTokens.push(token);
        }

        const cardName = nameTokens.join(" ");
        if (cardName) cardNamesInDeck.push(cardName);
    }

    const tutorToCards = {};

    for (const cardName of cardNamesInDeck) {
        const info = tutoredByMap[cardName];
        if (!info) continue;

        for (const tutor of info.tutoredBy) {
            // if (!cardNamesInDeck.includes(tutor)) continue;

            if (!tutorToCards[tutor]) {
                tutorToCards[tutor] = { tutors: [] };
            }
            tutorToCards[tutor].tutors.push(cardName);
        }
    }

    for (const tutor in tutorToCards) {
        const uniqueTutored = [...new Set(tutorToCards[tutor].tutors)].sort();
        tutorToCards[tutor].tutors = uniqueTutored;
        tutorToCards[tutor].count = uniqueTutored.length;
    }

    return tutorToCards;
}

async function main() {
    const args = process.argv.slice(2);
    if (args.length < 1) {
        console.error("Usage: node parseDecklist.js <decklist-file>");
        process.exit(1);
    }

    const decklistPath = path.resolve(args[0]);
    try {
        const decklistText = await fs.readFile(decklistPath, "utf8");
        const result = await parseDecklist(decklistText);
        console.log(JSON.stringify(result, null, 2));
    } catch (err) {
        console.error(`Error reading or parsing decklist: ${err.message}`);
        process.exit(1);
    }
}

if (import.meta.url === `file://${process.argv[1]}`) {
    main();
}

export default parseDecklist;
