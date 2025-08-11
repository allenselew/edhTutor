let tutoredByMap = null;

async function loadTutorMap() {
    try {
        const response = await fetch("tutoredByMap.json");
        if (!response.ok) throw new Error("Failed to load tutoredByMap.json");
        tutoredByMap = await response.json();
    } catch (err) {
        document.getElementById("tutor-results").textContent = `Error loading data: ${err.message}`;
        console.error(err);
    }
}

function parseDecklist(decklistText, tutoredByMap) {
    // (Same parseDecklist code as before)
    const cardNamesInDeck = [];
    const lines = decklistText.split("\n");

    for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;

        const parts = trimmed.split(" ");
        if (parts.length < 2) continue;

        parts.shift(); // Remove the count (e.g. "1x")

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
        if (!info || !Array.isArray(info.tutoredBy)) {
            console.log("tutoredByMap is missing " + cardName);
            continue;
        }
        for (const tutor of info.tutoredBy) {
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

document.addEventListener("DOMContentLoaded", async () => {
    await loadTutorMap();

    const inputTextarea = document.getElementById("decklist-input");
    const outputDiv = document.getElementById("tutor-results");
    const parseButton = document.getElementById("parse-decklist");

    parseButton.addEventListener("click", () => {
        if (!tutoredByMap) {
            outputDiv.textContent = "Error: tutoredByMap data not loaded.";
            return;
        }

        const deckText = inputTextarea.value;
        if (!deckText.trim()) {
            outputDiv.textContent = "Please paste a decklist.";
            return;
        }

        const tutorMap = parseDecklist(deckText, tutoredByMap);
        const tutors = Object.entries(tutorMap).sort((a, b) => b[1].count - a[1].count);

        if (tutors.length === 0) {
            outputDiv.textContent = "No tutors found for this decklist.";
            return;
        }

        outputDiv.innerHTML = "";

        const ul = document.createElement("ul");
        for (const [tutorName, info] of tutors) {
            const li = document.createElement("li");
            li.textContent = `${tutorName} — finds ${info.count} card${info.count !== 1 ? "s" : ""}`;
            ul.appendChild(li);
        }
        outputDiv.appendChild(ul);
    });
});
