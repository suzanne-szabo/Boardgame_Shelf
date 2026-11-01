const API_URL = "http://localhost:8080/boardgames";

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

async function loadGames() {
    try {
        const response = await fetch(API_URL);
        allGames = await response.json();
        emptyMessage.textContent = "No games found.";
        applyFilters();
    } catch (error) {
        allGames = [];
        gameGrid.innerHTML = "";
        emptyMessage.textContent = "Couldn't reach the server. Is Flask running on port 8080?";
        emptyMessage.classList.remove("hidden");
    }
}

function renderGames(games) {
    gameGrid.innerHTML = "";
    if (games.length === 0) {
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
    return value === null || value === undefined || value === "" ? "—" : `${value}${suffix}`;
}

async function showDetail(id) {
    const response = await fetch(`${API_URL}/${id}`);
    if (!response.ok) {
        alert("That game is no longer on your shelf.");
        loadGames();
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

    const response = await fetch(url, {
        method: editingId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data)
    });

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

    if (data.min_players && data.max_players && data.min_players > data.max_players) {
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

    const response = await fetch(`${API_URL}/${currentGame.id}`, { method: "DELETE" });
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

for (const dialog of [formDialog, detailDialog]) {
    dialog.addEventListener("click", (event) => {
        if (event.target === dialog) dialog.close();
    });
}

searchInput.addEventListener("input", applyFilters);
sortSelect.addEventListener("change", applyFilters);

loadGames();
