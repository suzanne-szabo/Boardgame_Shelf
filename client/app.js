
const API_URL = "http://localhost:8080/boardgames";

const pageStatus = document.getElementById("page-status");
const heroSection = document.querySelector(".hero");
const shelfSection = document.querySelector(".shelf");
const gameGrid = document.getElementById("game-grid");
const emptyMessage = document.getElementById("empty-message");

const searchInput = document.getElementById("search-input");
const sortSelect = document.getElementById("sort-select");
const addGameBtn = document.getElementById("add-game-btn");

const formDialog = document.getElementById("form-dialog");
const gameForm = document.getElementById("game-form");
const formTitle = document.getElementById("form-title");
const cancelBtn = document.getElementById("cancel-btn");

const detailDialog = document.getElementById("detail-dialog");
const detailContent = document.getElementById("detail-content");
const editBtn = document.getElementById("edit-btn");
const deleteBtn = document.getElementById("delete-btn");
const closeDetailBtn = document.getElementById("close-detail-btn");

const SEARCH_FIELDS = ["name", "game_type", "status", "notes"];
const FORM_FIELDS = ["name", "game_type", "min_players", "max_players", "play_time",
                     "min_age", "complexity", "rating", "price", "status", "notes"];
const NUMBER_FIELDS = ["min_players", "max_players", "play_time", "min_age",
                       "complexity", "rating", "price"];

let allGames = [];
let currentGame = null;
let editingId = null;

function escapeHTML(value) {
    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

function compareText(a, b, field) {
    return (a[field] || "").localeCompare(b[field] || "");
}

function compareNumber(a, b, field, highFirst = false) {
    const x = a[field] ?? null;
    const y = b[field] ?? null;
    if (x === null && y === null) return 0;
    if (x === null) return 1;
    if (y === null) return -1;
    return highFirst ? y - x : x - y;
}

function compareGames(a, b, sortBy) {
    let result = 0;
    switch (sortBy) {
        case "name-desc":  return compareText(b, a, "name");
        case "type":       result = compareText(a, b, "game_type"); break;
        case "rating":     result = compareNumber(a, b, "rating", true); break;
        case "complexity": result = compareNumber(a, b, "complexity"); break;
        case "play_time":  result = compareNumber(a, b, "play_time"); break;
        case "price":      result = compareNumber(a, b, "price"); break;
        case "status":     result = compareText(a, b, "status"); break;
    }
    return result || compareText(a, b, "name");
}

function applyFilters() {
    const term = searchInput.value.trim().toLowerCase();

    const filtered = allGames.filter(game =>
        SEARCH_FIELDS.some(field =>
            (game[field] || "").toLowerCase().includes(term)
        )
    );

    filtered.sort((a, b) => compareGames(a, b, sortSelect.value));

    renderGames(filtered);
}


function handleUnauthorized(response) {
    if (response.status === 401) {
        sessionStorage.setItem(
            "loginMessage",
            "Your session is no longer valid. Please log in again."
        );

        window.location.replace("index.html");
        return true;
    }

    return false;
}


function revealShelf() {
    pageStatus.classList.add("hidden");
    heroSection.classList.remove("hidden");
    shelfSection.classList.remove("hidden");
}

async function loadGames() {
    try {
        const response = await fetch(API_URL, {
            credentials: "include"
        });

        if (handleUnauthorized(response)) return;

        if (!response.ok) {
            throw new Error(`Server returned ${response.status}`);
        }

        allGames = await response.json();
        revealShelf();
        applyFilters();

    } catch (error) {
        console.error("Error loading games:", error);

        if (shelfSection.classList.contains("hidden")) {
            pageStatus.textContent = "Unable to reach the server. Please try again later.";
            return;
        }

        allGames = [];
        gameGrid.innerHTML = "";
        emptyMessage.textContent = "Unable to load games. Please try again";
        emptyMessage.classList.remove("hidden");
    }
}

function renderGames(games) {
    gameGrid.innerHTML = "";

    if (games.length === 0) {
        emptyMessage.textContent = allGames.length === 0
            ? "Your shelf is empty. Click + Add Game to get started."
            : "No games match your search.";
        emptyMessage.classList.remove("hidden");
    } else {
        emptyMessage.classList.add("hidden");
    }

    for (let i = 0; i < games.length; i++) {
        const game = games[i];
        const card = document.createElement("button");
        card.type = "button";
        card.className = "mini-card";
        card.dataset.id = game.id;
        card.dataset.type = (game.game_type || "other").toLowerCase();

        card.innerHTML = `
            <h3 class="mini-card-name">${escapeHTML(game.name)}</h3>
            <span class="mini-card-type">${escapeHTML(game.game_type || "Untyped")}</span>
            ${game.status ? `<span class="badge badge-${escapeHTML(game.status.toLowerCase())}">${escapeHTML(game.status)}</span>` : ""}
        `;

        gameGrid.appendChild(card);
    }
}

function stars(rating) {
    if (!rating) return "Not rated";
    return "★".repeat(rating) + "☆".repeat(5 - rating);
}

function players(game) {
    const min = game.min_players;
    const max = game.max_players;
    if (min && max) return min === max ? `${min}` : `${min}–${max}`;
    return min || max || "—";
}

function showValue(value, suffix = "") {
    return value === null || value === undefined || value === ""
        ? "—"
        : `${value}${suffix}`;
}

async function showDetail(id) {
    let response;
    try {
        response = await fetch(`${API_URL}/${id}`, {
            credentials: "include"
        });
    } catch (error) {
        console.error("Error loading game:", error);
        alert("Unable to reach the server. Please try again.");
        return;
    }

    if (handleUnauthorized(response)) return;

    if (response.status === 404) {
        alert("That game is no longer on your shelf.");
        await loadGames();
        return;
    }

    if (!response.ok) {
        console.error(`Failed to load game: ${response.status}`);
        alert("Unable to load game details.");
        return;
    }

    currentGame = await response.json();
    const g = currentGame;

    detailContent.innerHTML = `
        <h2 class="detail-name">${escapeHTML(g.name)}</h2>
        <div class="detail-tags">
            ${g.game_type ? `<span class="tag">${escapeHTML(g.game_type)}</span>` : ""}
            ${g.status ? `<span class="badge badge-${escapeHTML(g.status.toLowerCase())}">${escapeHTML(g.status)}</span>` : ""}
        </div>
        <dl class="detail-list">
            <dt>Players</dt><dd>${escapeHTML(players(g))}</dd>
            <dt>Play time</dt><dd>${escapeHTML(showValue(g.play_time, " min"))}</dd>
            <dt>Minimum age</dt><dd>${escapeHTML(showValue(g.min_age, "+"))}</dd>
            <dt>Complexity</dt><dd>${escapeHTML(showValue(g.complexity, " / 5"))}</dd>
            <dt>Rating</dt><dd class="detail-stars">${stars(g.rating)}</dd>
            <dt>Price</dt><dd>${g.price === null || g.price === undefined ? "—" : "$" + Number(g.price).toFixed(2)}</dd>
        </dl>
        ${g.notes ? `<p class="detail-notes">${escapeHTML(g.notes)}</p>` : ""}
    `;

    detailDialog.showModal();
}

function openForm(game = null) {
    editingId = game ? game.id : null;
    formTitle.textContent = game ? `Edit ${game.name}` : "Add a Game";
    gameForm.reset();

    if (game) {
        for (const field of FORM_FIELDS) {
            gameForm.elements[field].value = game[field] ?? "";
        }
    }

    formDialog.showModal();
    gameForm.elements.name.focus();
}

function getFormData() {
    const data = {};

    for (const field of FORM_FIELDS) {
        const raw = gameForm.elements[field].value.trim();

        if (raw === "") {
            data[field] = null;
        } else if (NUMBER_FIELDS.includes(field)) {
            data[field] = Number(raw);
        } else {
            data[field] = raw;
        }
    }

    return data;
}

async function saveGame(data, force = false) {
    let url = editingId ? `${API_URL}/${editingId}` : API_URL;
    if (force) url += "?force=true";

    let response;
    try {
        response = await fetch(url, {
            method: editingId ? "PUT" : "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data),
            credentials: "include"
        });
    } catch (error) {
        console.error("Error saving game:", error);
        alert("Unable to reach the server. Your changes were not saved.");
        return false;
    }

    if (handleUnauthorized(response)) return false;

    if (response.status === 409) {
        const body = await response.json();

        if (confirm(`${body.error}. Save anyway?`)) {
            return saveGame(data, true);
        }

        return false;
    }

    if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        alert(body.error || "Something went wrong while saving.");
        return false;
    }

    return true;
}

gameForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const data = getFormData();

    if (
        data.min_players &&
        data.max_players &&
        data.min_players > data.max_players
    ) {
        alert("Min players can't be more than max players.");
        return;
    }

    const saved = await saveGame(data);

    if (saved) {
        formDialog.close();
        await loadGames();
    }
});

deleteBtn.addEventListener("click", async () => {
    if (!currentGame) return;
    if (!confirm(`Remove ${currentGame.name} from your shelf?`)) return;

    let response;
    try {
        response = await fetch(`${API_URL}/${currentGame.id}`, {
            method: "DELETE",
            credentials: "include"
        });
    } catch (error) {
        console.error("Error deleting game:", error);
        alert("Unable to reach the server. The game was not removed.");
        return;
    }

    if (handleUnauthorized(response)) return;

    if (response.ok || response.status === 404) {
        detailDialog.close();
        currentGame = null;
        await loadGames();
    } else {
        alert("Something went wrong while deleting.");
    }
});

gameGrid.addEventListener("click", (event) => {
    const card = event.target.closest(".mini-card");
    if (card) showDetail(card.dataset.id);
});

editBtn.addEventListener("click", () => {
    detailDialog.close();
    openForm(currentGame);
});

addGameBtn.addEventListener("click", () => openForm());
cancelBtn.addEventListener("click", () => formDialog.close());
closeDetailBtn.addEventListener("click", () => detailDialog.close());

document.getElementById("logout-btn").addEventListener("click", async () => {
    try {
        const response = await fetch("http://localhost:8080/sessions", {
            method: "DELETE",
            credentials: "include"
        });

        if (!response.ok) {
            throw new Error(`Logout failed: ${response.status}`);
        }

        window.location.href = "index.html";

    } catch (error) {
        console.error("Logout error:", error);
        alert("Unable to log out. Please try again.");
    }
});

for (const dialog of [formDialog, detailDialog]) {
    dialog.addEventListener("click", (event) => {
        if (event.target === dialog) dialog.close();
    });
}

searchInput.addEventListener("input", applyFilters);
sortSelect.addEventListener("change", applyFilters);

loadGames();
