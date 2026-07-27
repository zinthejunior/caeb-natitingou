/**
 * CAEB Natitingou — Application d'Administration v2.1
 * Panneau de gestion complet : Livres, Membres, Emprunts, News, Événements
 */

const API_BASE_URL =
  window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
    ? "http://localhost:8080/api"
    : "https://caeb-backend.onrender.com/api";

// ── ÉTATS GLOBAUX ──────────────────────────────────────────────────────────────
let booksData    = [];
let usersData    = [];
let borrowsData  = [];
let newsData     = [];
let eventsData   = [];

// ── INITIALISATION ─────────────────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", () => {
  initTabs();
  initSubTabs();
  initSidebar();
  initSettings();
  checkApiHealth();
  fetchAllData();

  document.getElementById("btn-refresh").addEventListener("click", fetchAllData);
  document.getElementById("btn-new-item").addEventListener("click", () => openBookModal());

  setupSearchAndFilters();
  setupExportButtons();
});

// ── NAVIGATION PAR ONGLETS ─────────────────────────────────────────────────────
function initTabs() {
  document.querySelectorAll(".nav-item").forEach((item) => {
    item.addEventListener("click", () => {
      const tabName = item.getAttribute("data-tab");
      switchTab(tabName, item);
    });
  });
}

function switchTab(tabName, clickedItem = null) {
  document.querySelectorAll(".nav-item").forEach((n) => n.classList.remove("active"));
  document.querySelectorAll(".tab-content").forEach((c) => c.classList.remove("active"));

  if (clickedItem) {
    clickedItem.classList.add("active");
  } else {
    const btn = document.querySelector(`.nav-item[data-tab="${tabName}"]`);
    if (btn) btn.classList.add("active");
  }

  const tab = document.getElementById(`tab-${tabName}`);
  if (tab) tab.classList.add("active");

  updateHeaderForTab(tabName);

  // Charger les stats avancées à la demande
  if (tabName === "stats") renderAdvancedStats();
  if (tabName === "settings") {
    document.getElementById("setting-api-url").value = API_BASE_URL;
  }
}

function updateHeaderForTab(tabName) {
  const titles = {
    dashboard: { title: "Tableau de bord", subtitle: "Vue d'ensemble et statistiques globales", btn: "Nouveau Livre" },
    books: { title: "Gestion du Catalogue", subtitle: "Ajout, modification et suivi du stock", btn: "+ Ajouter un Livre" },
    users: { title: "Utilisateurs & Membres", subtitle: "Validation des adhésions et gestion des rôles", btn: "+ Ajouter Utilisateur" },
    borrows: { title: "Gestion des Emprunts", subtitle: "Suivi des prêts, retours et alertes de retard", btn: "+ Enregistrer Emprunt" },
    news: { title: "Publications & Actualités", subtitle: "Gestion des articles et annonces", btn: "+ Nouvelle Publication" },
    events: { title: "Événements & Clubs", subtitle: "Organisation des activités et ateliers", btn: "+ Nouvel Événement" },
    stats: { title: "Statistiques Avancées", subtitle: "Analyses et indicateurs de performance", btn: "" },
    settings: { title: "Paramètres", subtitle: "Configuration du panneau d'administration", btn: "" },
  };

  const info = titles[tabName] || { title: "Administration", subtitle: "CAEB Natitingou", btn: "" };
  document.getElementById("page-title").textContent = info.title;
  document.getElementById("page-subtitle").textContent = info.subtitle;

  const btnNew = document.getElementById("btn-new-item");
  if (info.btn) {
    btnNew.textContent = info.btn;
    btnNew.style.display = "inline-flex";
    btnNew.onclick = () => {
      const actions = { books: openBookModal, users: openUserModal, borrows: openBorrowModal, news: openNewsModal, events: openEventModal };
      if (actions[tabName]) actions[tabName]();
    };
  } else {
    btnNew.style.display = "none";
  }
}

// ── SOUS-ONGLETS (utilisateurs) ────────────────────────────────────────────────
function initSubTabs() {
  document.querySelectorAll(".sub-tab").forEach((tab) => {
    tab.addEventListener("click", () => {
      document.querySelectorAll(".sub-tab").forEach((t) => t.classList.remove("active"));
      tab.classList.add("active");
      const subtab = tab.getAttribute("data-subtab");
      if (subtab === "pending-users") {
        const pending = usersData.filter((u) => u.type_compte === "en_attente" || u.demande_adhesion);
        renderUsersTable(pending);
      } else {
        renderUsersTable(usersData);
      }
    });
  });
}

// ── TOGGLE SIDEBAR MOBILE ──────────────────────────────────────────────────────
function initSidebar() {
  const btn = document.getElementById("btn-toggle-sidebar");
  if (btn) {
    btn.addEventListener("click", () => {
      document.getElementById("sidebar").classList.toggle("collapsed");
    });
  }
}

// ── PARAMÈTRES LOCAUX ──────────────────────────────────────────────────────────
function initSettings() {
  const darkToggle = document.getElementById("toggle-dark-mode");
  if (localStorage.getItem("admin-dark") === "true") {
    document.body.classList.add("dark-mode");
    if (darkToggle) darkToggle.checked = true;
  }
  if (darkToggle) {
    darkToggle.addEventListener("change", () => {
      document.body.classList.toggle("dark-mode", darkToggle.checked);
      localStorage.setItem("admin-dark", darkToggle.checked);
    });
  }

  const compactToggle = document.getElementById("toggle-compact");
  if (localStorage.getItem("admin-compact") === "true") {
    document.getElementById("sidebar")?.classList.add("compact");
    if (compactToggle) compactToggle.checked = true;
  }
  if (compactToggle) {
    compactToggle.addEventListener("change", () => {
      document.getElementById("sidebar")?.classList.toggle("compact", compactToggle.checked);
      localStorage.setItem("admin-compact", compactToggle.checked);
    });
  }
}

// ── SANTÉ DE L'API ─────────────────────────────────────────────────────────────
async function checkApiHealth() {
  const statusText = document.getElementById("api-status-text");
  const statusDot = document.getElementById("status-dot");
  const settingsText = document.getElementById("settings-api-text");
  const settingsDot = document.getElementById("settings-status-dot");

  try {
    const res = await fetch(`${API_BASE_URL}/stats/`, { signal: AbortSignal.timeout(5000) });
    if (res.ok) {
      if (statusText) statusText.textContent = "API Connectée ✓";
      if (statusDot) statusDot.className = "status-dot online";
      if (settingsText) settingsText.textContent = "Connexion établie ✓";
      if (settingsDot) settingsDot.className = "status-dot online";
    } else throw new Error();
  } catch {
    if (statusText) statusText.textContent = "API Hors-ligne";
    if (statusDot) statusDot.className = "status-dot offline";
    if (settingsText) settingsText.textContent = "Connexion échouée ✗";
    if (settingsDot) settingsDot.className = "status-dot offline";
  }
}

// ── CHARGEMENT DES DONNÉES ─────────────────────────────────────────────────────
async function fetchAllData() {
  showToast("Chargement des données...", "info");
  await Promise.all([fetchBooks(), fetchUsers(), fetchBorrows(), fetchNews(), fetchEvents()]);
  updateDashboardStats();
  showToast("Données actualisées ✓", "success");
}

async function fetchBooks() {
  try {
    const res = await fetch(`${API_BASE_URL}/livres/?page_size=1000`);
    if (res.ok) {
      const data = await res.json();
      booksData = data.results || data;
      renderBooksTable(booksData);
      populateGenreFilter();
      document.getElementById("books-count-label").textContent = `${booksData.length} livres`;
    }
  } catch (err) { console.error("Erreur livres:", err); }
}

async function fetchUsers() {
  try {
    const res = await fetch(`${API_BASE_URL}/utilisateurs/?page_size=1000`);
    if (res.ok) {
      const data = await res.json();
      usersData = data.results || data;
      renderUsersTable(usersData);
      document.getElementById("users-count-label").textContent = `${usersData.length} membres`;
      // Badge adhésions
      const pending = usersData.filter((u) => u.type_compte === "en_attente" || u.demande_adhesion).length;
      const badge = document.getElementById("pending-badge");
      if (badge) badge.textContent = pending;
    }
  } catch (err) { console.error("Erreur utilisateurs:", err); }
}

async function fetchBorrows() {
  try {
    const res = await fetch(`${API_BASE_URL}/emprunts/?page_size=1000`);
    if (res.ok) {
      const data = await res.json();
      borrowsData = data.results || data;
      renderBorrowsTable(borrowsData);
      document.getElementById("borrows-count-label").textContent = `${borrowsData.length} emprunts`;
    }
  } catch (err) { console.error("Erreur emprunts:", err); }
}

async function fetchNews() {
  try {
    const res = await fetch(`${API_BASE_URL}/actualites/?page_size=500`);
    if (res.ok) {
      const data = await res.json();
      newsData = data.results || data;
      renderNewsTable(newsData);
      document.getElementById("news-count-label").textContent = `${newsData.length} publications`;
    }
  } catch (err) { console.error("Erreur news:", err); }
}

async function fetchEvents() {
  try {
    const res = await fetch(`${API_BASE_URL}/evenements/?page_size=500`);
    if (res.ok) {
      const data = await res.json();
      eventsData = data.results || data;
      renderEventsTable(eventsData);
      document.getElementById("events-count-label").textContent = `${eventsData.length} événements`;
    }
  } catch (err) { console.error("Erreur événements:", err); }
}

// ── TABLEAU DE BORD ────────────────────────────────────────────────────────────
function updateDashboardStats() {
  document.getElementById("stat-books-count").textContent = booksData.length;
  document.getElementById("stat-users-count").textContent = usersData.length;

  const activeBorrows = borrowsData.filter((b) => b.statut === "en_cours").length;
  document.getElementById("stat-borrows-count").textContent = activeBorrows;

  const pending = usersData.filter((u) => u.type_compte === "en_attente" || u.demande_adhesion).length;
  document.getElementById("stat-late-count").textContent = pending;

  const today = new Date().toISOString().split("T")[0];
  const overdue = borrowsData.filter(
    (b) => b.statut === "en_cours" && b.date_retour_prevue && b.date_retour_prevue < today
  ).length;
  document.getElementById("stat-overdue-count").textContent = overdue;
  document.getElementById("stat-news-count").textContent = newsData.length;

  renderDashboardRecentBooks();
  renderDashboardRecentUsers();
  renderDashboardRecentBorrows();
}

function renderDashboardRecentBooks() {
  const tbody = document.querySelector("#recent-books-table tbody");
  if (!tbody) return;
  tbody.innerHTML = booksData.slice(0, 6).map((b) => `
    <tr>
      <td><img src="${escapeHtml(b.couverture_url || '')}" style="height:36px;width:26px;object-fit:cover;border-radius:4px;" alt="" loading="lazy"></td>
      <td><strong>${escapeHtml(b.titre)}</strong></td>
      <td>${escapeHtml(b.auteur || 'Inconnu')}</td>
      <td><span class="badge badge-info">${escapeHtml(b.genre || 'Général')}</span></td>
      <td>${b.exemplaires ?? 1} ex.</td>
    </tr>
  `).join("") || "<tr><td colspan='5' class='empty-row'>Aucun livre</td></tr>";
}

function renderDashboardRecentUsers() {
  const tbody = document.querySelector("#recent-users-table tbody");
  if (!tbody) return;
  tbody.innerHTML = usersData.slice(0, 6).map((u) => `
    <tr>
      <td><strong>${escapeHtml(u.username)}</strong></td>
      <td>${escapeHtml((u.first_name || '') + ' ' + (u.last_name || ''))}</td>
      <td><span class="badge badge-info">${escapeHtml(u.type_compte)}</span></td>
      <td>${u.demande_adhesion ? '<span class="badge badge-warning">En attente</span>' : '<span class="badge badge-success">Validé</span>'}</td>
    </tr>
  `).join("") || "<tr><td colspan='4' class='empty-row'>Aucun utilisateur</td></tr>";
}

function renderDashboardRecentBorrows() {
  const tbody = document.querySelector("#recent-borrows-table tbody");
  if (!tbody) return;
  const recent = borrowsData.filter((b) => b.statut === "en_cours").slice(0, 6);
  tbody.innerHTML = recent.map((b) => `
    <tr>
      <td><strong>${escapeHtml(b.user_detail?.username || b.user || 'Membre')}</strong></td>
      <td>${escapeHtml(b.livre_detail?.titre || b.livre || 'Livre')}</td>
      <td>${b.date_retour_prevue || '-'}</td>
      <td>${getBorrowStatusBadge(b)}</td>
    </tr>
  `).join("") || "<tr><td colspan='4' class='empty-row'>Aucun emprunt actif</td></tr>";
}

// ── TABLEAU DES LIVRES ─────────────────────────────────────────────────────────
function renderBooksTable(books) {
  const tbody = document.querySelector("#books-table tbody");
  if (!tbody) return;
  tbody.innerHTML = books.map((b) => `
    <tr>
      <td><img src="${escapeHtml(b.couverture_url || '')}" style="height:48px;width:34px;object-fit:cover;border-radius:5px;" alt="" loading="lazy"></td>
      <td><strong>${escapeHtml(b.titre)}</strong><br><small class="text-muted">${escapeHtml(b.isbn || b.code_barres || '')}</small></td>
      <td>${escapeHtml(b.auteur || 'Inconnu')}</td>
      <td><span class="badge badge-info">${escapeHtml(b.genre || 'Roman')}</span></td>
      <td>
        <span class="${(b.exemplaires ?? 0) > 0 ? 'badge badge-success' : 'badge badge-danger'}">${b.exemplaires ?? 0} ex.</span>
      </td>
      <td><code>${escapeHtml(b.cote || '—')}</code></td>
      <td>${b.note_moyenne ? '⭐ ' + Number(b.note_moyenne).toFixed(1) : '—'}</td>
      <td class="actions-cell">
        <button class="btn btn-sm btn-secondary" onclick="openBookModal('${b.id}')">✏️ Éditer</button>
        <button class="btn btn-sm btn-danger" onclick="deleteBook('${b.id}')">🗑️</button>
      </td>
    </tr>
  `).join("") || "<tr><td colspan='8' class='empty-row'>Aucun livre trouvé</td></tr>";
}

function populateGenreFilter() {
  const genres = [...new Set(booksData.map((b) => b.genre).filter(Boolean))].sort();
  const select = document.getElementById("filter-genre");
  if (!select) return;
  select.innerHTML = '<option value="">Tous les genres</option>' +
    genres.map((g) => `<option value="${escapeHtml(g)}">${escapeHtml(g)}</option>`).join("");
}

// ── TABLEAU DES UTILISATEURS ───────────────────────────────────────────────────
function renderUsersTable(users) {
  const tbody = document.querySelector("#users-table tbody");
  if (!tbody) return;
  tbody.innerHTML = users.map((u) => `
    <tr class="${u.demande_adhesion ? 'row-highlight' : ''}">
      <td><strong>${escapeHtml(u.username)}</strong></td>
      <td>${escapeHtml((u.first_name || '') + ' ' + (u.last_name || ''))}</td>
      <td>${escapeHtml(u.email || '—')}</td>
      <td>${escapeHtml(u.telephone || '—')}</td>
      <td><span class="badge badge-info">${escapeHtml(u.type_compte)}</span></td>
      <td>
        ${u.demande_adhesion
          ? `<button class="btn btn-sm btn-primary" onclick="validerAdhesion('${u.id}')">✔ Valider</button>`
          : '<span class="badge badge-success">Validé</span>'}
      </td>
      <td class="actions-cell">
        <button class="btn btn-sm btn-secondary" onclick="openUserModal('${u.id}')">✏️ Voir</button>
        <button class="btn btn-sm btn-danger" onclick="deleteUser('${u.id}')">🗑️</button>
      </td>
    </tr>
  `).join("") || "<tr><td colspan='7' class='empty-row'>Aucun utilisateur trouvé</td></tr>";
}

// ── TABLEAU DES EMPRUNTS ───────────────────────────────────────────────────────
function renderBorrowsTable(borrows) {
  const tbody = document.querySelector("#borrows-table tbody");
  if (!tbody) return;
  const today = new Date().toISOString().split("T")[0];
  tbody.innerHTML = borrows.map((b) => {
    const isLate = b.statut === "en_cours" && b.date_retour_prevue && b.date_retour_prevue < today;
    return `
    <tr class="${isLate ? 'row-danger' : ''}">
      <td><strong>${escapeHtml(b.user_detail?.username || b.user || 'Membre')}</strong></td>
      <td>${escapeHtml(b.livre_detail?.titre || b.livre || 'Livre')}</td>
      <td>${b.date_sortie || '—'}</td>
      <td>${b.date_retour_prevue || '—'}</td>
      <td>${b.date_retour_effective || '—'}</td>
      <td>${getBorrowStatusBadge(b, isLate)}</td>
      <td class="actions-cell">
        ${b.statut === 'en_cours'
          ? `<button class="btn btn-sm btn-primary" onclick="marquerRendu('${b.id}')">✔ Rendu</button>
             <button class="btn btn-sm btn-warning" onclick="marquerPerdu('${b.id}')">Perdu</button>`
          : ''}
        <button class="btn btn-sm btn-danger" onclick="deleteBorrow('${b.id}')">🗑️</button>
      </td>
    </tr>
  `}).join("") || "<tr><td colspan='7' class='empty-row'>Aucun emprunt</td></tr>";
}

function getBorrowStatusBadge(b, isLate = false) {
  if (isLate) return '<span class="badge badge-danger">⚠️ En retard</span>';
  if (b.statut === "rendu") return '<span class="badge badge-success">✔ Rendu</span>';
  if (b.statut === "perdu") return '<span class="badge badge-danger">❌ Perdu</span>';
  return '<span class="badge badge-warning">🔄 En cours</span>';
}

// ── TABLEAU DES NEWS ───────────────────────────────────────────────────────────
function renderNewsTable(news) {
  const tbody = document.querySelector("#news-table tbody");
  if (!tbody) return;
  tbody.innerHTML = news.map((n) => `
    <tr>
      <td><strong>${escapeHtml(n.titre || n.title || 'Actualité')}</strong></td>
      <td><span class="badge badge-info">${escapeHtml(n.categorie || n.category || 'Général')}</span></td>
      <td>${escapeHtml(n.auteur || 'Admin')}</td>
      <td>${n.pub_date || n.date || '—'}</td>
      <td><span class="badge badge-success">Publié</span></td>
      <td class="actions-cell">
        <button class="btn btn-sm btn-danger" onclick="deleteNews('${n.id}')">🗑️ Suppr.</button>
      </td>
    </tr>
  `).join("") || "<tr><td colspan='6' class='empty-row'>Aucune publication</td></tr>";
}

// ── TABLEAU DES ÉVÉNEMENTS ─────────────────────────────────────────────────────
function renderEventsTable(events) {
  const tbody = document.querySelector("#events-table tbody");
  if (!tbody) return;
  const today = new Date().toISOString().split("T")[0];
  tbody.innerHTML = events.map((e) => {
    const eventDate = e.date_event || e.date || "";
    const isPast = eventDate && eventDate < today;
    return `
    <tr>
      <td><strong>${escapeHtml(e.titre || e.title || 'Événement')}</strong></td>
      <td>${eventDate || '—'}</td>
      <td>${escapeHtml(e.lieu || 'Bibliothèque CAEB')}</td>
      <td>${e.nb_places || 30}</td>
      <td>${isPast ? '<span class="badge badge-info">Passé</span>' : '<span class="badge badge-success">À venir</span>'}</td>
      <td class="actions-cell">
        <button class="btn btn-sm btn-danger" onclick="deleteEvent('${e.id}')">🗑️</button>
      </td>
    </tr>
  `}).join("") || "<tr><td colspan='6' class='empty-row'>Aucun événement</td></tr>";
}

// ── STATISTIQUES AVANCÉES ──────────────────────────────────────────────────────
function renderAdvancedStats() {
  renderGenresChart();
  renderBorrowsStatusChart();
  renderTopBooksChart();
  renderUsersTypeChart();
}

function renderGenresChart() {
  const el = document.getElementById("genres-chart");
  if (!el) return;
  const counts = {};
  booksData.forEach((b) => { if (b.genre) counts[b.genre] = (counts[b.genre] || 0) + 1; });
  const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 10);
  const max = sorted[0]?.[1] || 1;
  el.innerHTML = sorted.map(([genre, count]) => `
    <div class="chart-bar-row">
      <span class="chart-label">${escapeHtml(genre)}</span>
      <div class="chart-bar-bg">
        <div class="chart-bar" style="width:${(count/max*100).toFixed(0)}%">${count}</div>
      </div>
    </div>
  `).join("") || "<p class='empty-chart'>Aucune donnée</p>";
}

function renderBorrowsStatusChart() {
  const el = document.getElementById("borrows-chart");
  if (!el) return;
  const enCours = borrowsData.filter((b) => b.statut === "en_cours").length;
  const rendus  = borrowsData.filter((b) => b.statut === "rendu").length;
  const perdus  = borrowsData.filter((b) => b.statut === "perdu").length;
  const total = borrowsData.length || 1;
  el.innerHTML = `
    <div class="chart-donut-labels">
      <div class="donut-item"><span class="dot warning"></span> En cours : <strong>${enCours}</strong></div>
      <div class="donut-item"><span class="dot success"></span> Rendus : <strong>${rendus}</strong></div>
      <div class="donut-item"><span class="dot danger"></span> Perdus : <strong>${perdus}</strong></div>
      <div class="donut-item"><span class="dot info"></span> Total : <strong>${total}</strong></div>
    </div>
    <div class="chart-progress-stack">
      <div style="height:24px;border-radius:12px;overflow:hidden;display:flex;gap:2px;">
        <div style="flex:${enCours};background:#f59e0b;"></div>
        <div style="flex:${rendus};background:#10b981;"></div>
        <div style="flex:${perdus};background:#ef4444;"></div>
      </div>
    </div>
  `;
}

function renderTopBooksChart() {
  const el = document.getElementById("top-books-chart");
  if (!el) return;
  const counts = {};
  borrowsData.forEach((b) => {
    const titre = b.livre_detail?.titre || b.livre || "Inconnu";
    counts[titre] = (counts[titre] || 0) + 1;
  });
  const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 10);
  const max = sorted[0]?.[1] || 1;
  el.innerHTML = sorted.map(([titre, count], i) => `
    <div class="chart-bar-row">
      <span class="chart-label">${i + 1}. ${escapeHtml(titre.substring(0, 30))}${titre.length > 30 ? '…' : ''}</span>
      <div class="chart-bar-bg">
        <div class="chart-bar chart-bar-alt" style="width:${(count/max*100).toFixed(0)}%">${count}</div>
      </div>
    </div>
  `).join("") || "<p class='empty-chart'>Aucun emprunt enregistré</p>";
}

function renderUsersTypeChart() {
  const el = document.getElementById("users-chart");
  if (!el) return;
  const membres     = usersData.filter((u) => u.type_compte === "membre").length;
  const enAttente   = usersData.filter((u) => u.type_compte === "en_attente").length;
  const nonMembres  = usersData.filter((u) => u.type_compte === "non_membre").length;
  el.innerHTML = `
    <div class="chart-donut-labels">
      <div class="donut-item"><span class="dot success"></span> Membres validés : <strong>${membres}</strong></div>
      <div class="donut-item"><span class="dot warning"></span> En attente : <strong>${enAttente}</strong></div>
      <div class="donut-item"><span class="dot info"></span> Non-membres : <strong>${nonMembres}</strong></div>
    </div>
    <div class="chart-progress-stack">
      <div style="height:24px;border-radius:12px;overflow:hidden;display:flex;gap:2px;">
        <div style="flex:${membres || 0.01};background:#10b981;"></div>
        <div style="flex:${enAttente || 0.01};background:#f59e0b;"></div>
        <div style="flex:${nonMembres || 0.01};background:#3b82f6;"></div>
      </div>
    </div>
  `;
}

// ── RECHERCHE & FILTRES DYNAMIQUES ─────────────────────────────────────────────
function setupSearchAndFilters() {
  // Livres
  const searchBooks = document.getElementById("search-books");
  if (searchBooks) {
    searchBooks.addEventListener("input", filterBooks);
  }
  const filterGenre = document.getElementById("filter-genre");
  if (filterGenre) filterGenre.addEventListener("change", filterBooks);
  const filterDispo = document.getElementById("filter-disponibilite");
  if (filterDispo) filterDispo.addEventListener("change", filterBooks);

  // Utilisateurs
  const searchUsers = document.getElementById("search-users");
  if (searchUsers) searchUsers.addEventListener("input", filterUsers);
  const filterUserType = document.getElementById("filter-user-type");
  if (filterUserType) filterUserType.addEventListener("change", filterUsers);

  // Emprunts
  const searchBorrows = document.getElementById("search-borrows");
  if (searchBorrows) searchBorrows.addEventListener("input", filterBorrows);
  const filterBorrowStatus = document.getElementById("filter-borrow-status");
  if (filterBorrowStatus) filterBorrowStatus.addEventListener("change", filterBorrows);

  // News
  const searchNews = document.getElementById("search-news");
  if (searchNews) searchNews.addEventListener("input", () => {
    const q = searchNews.value.toLowerCase();
    renderNewsTable(newsData.filter((n) => (n.titre || n.title || "").toLowerCase().includes(q)));
  });

  // Événements
  const searchEvents = document.getElementById("search-events");
  if (searchEvents) searchEvents.addEventListener("input", () => {
    const q = searchEvents.value.toLowerCase();
    renderEventsTable(eventsData.filter((e) => (e.titre || e.title || "").toLowerCase().includes(q)));
  });
}

function filterBooks() {
  const q = (document.getElementById("search-books")?.value || "").toLowerCase();
  const genre = document.getElementById("filter-genre")?.value || "";
  const dispo = document.getElementById("filter-disponibilite")?.value || "";
  let filtered = booksData.filter((b) => {
    const matchText = !q || b.titre?.toLowerCase().includes(q) || b.auteur?.toLowerCase().includes(q) || b.isbn?.toLowerCase().includes(q);
    const matchGenre = !genre || b.genre === genre;
    const matchDispo = !dispo ||
      (dispo === "dispo" && (b.exemplaires ?? 0) > 0) ||
      (dispo === "indispo" && (b.exemplaires ?? 0) === 0);
    return matchText && matchGenre && matchDispo;
  });
  renderBooksTable(filtered);
  document.getElementById("books-count-label").textContent = `${filtered.length} livres`;
}

function filterUsers() {
  const q = (document.getElementById("search-users")?.value || "").toLowerCase();
  const type = document.getElementById("filter-user-type")?.value || "";
  let filtered = usersData.filter((u) => {
    const matchText = !q || u.username?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q) ||
      (u.first_name + " " + u.last_name).toLowerCase().includes(q);
    const matchType = !type || u.type_compte === type;
    return matchText && matchType;
  });
  renderUsersTable(filtered);
  document.getElementById("users-count-label").textContent = `${filtered.length} membres`;
}

function filterBorrows() {
  const q = (document.getElementById("search-borrows")?.value || "").toLowerCase();
  const status = document.getElementById("filter-borrow-status")?.value || "";
  const today = new Date().toISOString().split("T")[0];
  let filtered = borrowsData.filter((b) => {
    const matchText = !q ||
      (b.user_detail?.username || b.user || "").toLowerCase().includes(q) ||
      (b.livre_detail?.titre || b.livre || "").toLowerCase().includes(q);
    const isLate = b.statut === "en_cours" && b.date_retour_prevue && b.date_retour_prevue < today;
    const matchStatus = !status ||
      b.statut === status ||
      (status === "en_retard" && isLate);
    return matchText && matchStatus;
  });
  renderBorrowsTable(filtered);
  document.getElementById("borrows-count-label").textContent = `${filtered.length} emprunts`;
}

// ── EXPORT CSV ────────────────────────────────────────────────────────────────
function setupExportButtons() {
  document.getElementById("btn-export-books")?.addEventListener("click", () => exportCSV(booksData, "livres"));
  document.getElementById("btn-export-users")?.addEventListener("click", () => exportCSV(usersData, "membres"));
  document.getElementById("btn-export-borrows")?.addEventListener("click", () => exportCSV(borrowsData, "emprunts"));
}

function exportAllData(type) {
  const data = { books: booksData, users: usersData, borrows: borrowsData }[type] || [];
  exportCSV(data, type);
}

function exportCSV(data, name) {
  if (!data.length) { showToast("Aucune donnée à exporter", "warning"); return; }
  const keys = Object.keys(data[0]).filter((k) => typeof data[0][k] !== "object");
  const csv = [keys.join(","), ...data.map((row) =>
    keys.map((k) => `"${String(row[k] ?? "").replace(/"/g, '""')}"`).join(",")
  )].join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `caeb_${name}_${new Date().toISOString().split("T")[0]}.csv`;
  a.click();
  URL.revokeObjectURL(url);
  showToast(`Export ${name}.csv téléchargé ✓`, "success");
}

// ── ACTIONS CRUD & API ─────────────────────────────────────────────────────────
async function validerAdhesion(userId) {
  if (!confirm("Valider la demande d'adhésion de ce membre ?")) return;
  try {
    const res = await fetch(`${API_BASE_URL}/utilisateurs/${userId}/`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type_compte: "membre", demande_adhesion: false }),
    });
    if (res.ok) { showToast("Adhésion validée ✓", "success"); fetchUsers(); }
    else showToast("Erreur lors de la validation", "error");
  } catch { showToast("Erreur réseau", "error"); }
}

async function marquerRendu(borrowId) {
  if (!confirm("Confirmer le retour de ce livre ?")) return;
  try {
    const today = new Date().toISOString().split("T")[0];
    const res = await fetch(`${API_BASE_URL}/emprunts/${borrowId}/`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ statut: "rendu", date_retour_effective: today }),
    });
    if (res.ok) { showToast("Emprunt marqué comme rendu ✓", "success"); fetchBorrows(); }
    else showToast("Erreur lors du retour", "error");
  } catch { showToast("Erreur réseau", "error"); }
}

async function marquerPerdu(borrowId) {
  if (!confirm("Marquer ce livre comme perdu ?")) return;
  try {
    const res = await fetch(`${API_BASE_URL}/emprunts/${borrowId}/`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ statut: "perdu" }),
    });
    if (res.ok) { showToast("Livre marqué comme perdu", "warning"); fetchBorrows(); }
  } catch { showToast("Erreur réseau", "error"); }
}

async function deleteBook(id) {
  if (!confirm("Supprimer définitivement ce livre ?")) return;
  try {
    const res = await fetch(`${API_BASE_URL}/livres/${id}/`, { method: "DELETE" });
    if (res.ok || res.status === 204) { showToast("Livre supprimé", "success"); fetchBooks(); }
    else showToast("Erreur de suppression", "error");
  } catch { showToast("Erreur réseau", "error"); }
}

async function deleteUser(id) {
  if (!confirm("Supprimer définitivement cet utilisateur ?")) return;
  try {
    const res = await fetch(`${API_BASE_URL}/utilisateurs/${id}/`, { method: "DELETE" });
    if (res.ok || res.status === 204) { showToast("Utilisateur supprimé", "success"); fetchUsers(); }
    else showToast("Erreur de suppression", "error");
  } catch { showToast("Erreur réseau", "error"); }
}

async function deleteBorrow(id) {
  if (!confirm("Supprimer cet enregistrement d'emprunt ?")) return;
  try {
    const res = await fetch(`${API_BASE_URL}/emprunts/${id}/`, { method: "DELETE" });
    if (res.ok || res.status === 204) { showToast("Emprunt supprimé", "success"); fetchBorrows(); }
  } catch { showToast("Erreur réseau", "error"); }
}

async function deleteNews(id) {
  if (!confirm("Supprimer cette publication ?")) return;
  try {
    const res = await fetch(`${API_BASE_URL}/actualites/${id}/`, { method: "DELETE" });
    if (res.ok || res.status === 204) { showToast("Publication supprimée", "success"); fetchNews(); }
  } catch { showToast("Erreur réseau", "error"); }
}

async function deleteEvent(id) {
  if (!confirm("Supprimer cet événement ?")) return;
  try {
    const res = await fetch(`${API_BASE_URL}/evenements/${id}/`, { method: "DELETE" });
    if (res.ok || res.status === 204) { showToast("Événement supprimé", "success"); fetchEvents(); }
  } catch { showToast("Erreur réseau", "error"); }
}

// ── MODALS ─────────────────────────────────────────────────────────────────────
function openBookModal(bookId = null) {
  const book = bookId ? booksData.find((b) => b.id === bookId) : null;
  document.getElementById("modal-title").textContent = book ? "✏️ Éditer le livre" : "📖 Ajouter un livre";
  document.getElementById("modal-body").innerHTML = `
    <form id="form-book" class="modal-form">
      <div class="form-row">
        <div class="form-group">
          <label>Titre <span class="required">*</span></label>
          <input type="text" id="book-titre" class="form-control" value="${book ? escapeHtml(book.titre) : ''}" required>
        </div>
        <div class="form-group">
          <label>Auteur</label>
          <input type="text" id="book-auteur" class="form-control" value="${book ? escapeHtml(book.auteur || '') : ''}">
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label>Genre</label>
          <input type="text" id="book-genre" class="form-control" value="${book ? escapeHtml(book.genre || '') : 'Roman'}">
        </div>
        <div class="form-group">
          <label>Année</label>
          <input type="number" id="book-annee" class="form-control" value="${book ? book.annee || '' : ''}">
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label>Nombre d'exemplaires</label>
          <input type="number" id="book-exemplaires" class="form-control" value="${book ? book.exemplaires ?? 1 : 1}" min="0">
        </div>
        <div class="form-group">
          <label>Cote de rangement</label>
          <input type="text" id="book-cote" class="form-control" value="${book ? escapeHtml(book.cote || '') : 'R-01'}">
        </div>
      </div>
      <div class="form-group">
        <label>URL de la couverture</label>
        <input type="text" id="book-couverture" class="form-control" value="${book ? escapeHtml(book.couverture_url || '') : ''}">
      </div>
      <div class="form-group">
        <label>Résumé</label>
        <textarea id="book-resume" class="form-control" rows="3">${book ? escapeHtml(book.resume || '') : ''}</textarea>
      </div>
      <button type="submit" class="btn btn-primary btn-full">💾 Enregistrer le livre</button>
    </form>
  `;
  openModal();

  document.getElementById("form-book").addEventListener("submit", async (e) => {
    e.preventDefault();
    const payload = {
      titre: document.getElementById("book-titre").value,
      auteur: document.getElementById("book-auteur").value,
      genre: document.getElementById("book-genre").value,
      annee: parseInt(document.getElementById("book-annee").value) || null,
      exemplaires: parseInt(document.getElementById("book-exemplaires").value) || 1,
      cote: document.getElementById("book-cote").value,
      couverture_url: document.getElementById("book-couverture").value,
      resume: document.getElementById("book-resume").value,
    };
    try {
      const url = book ? `${API_BASE_URL}/livres/${book.id}/` : `${API_BASE_URL}/livres/`;
      const method = book ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        showToast(book ? "Livre modifié ✓" : "Livre ajouté ✓", "success");
        closeModal();
        fetchBooks();
      } else {
        const err = await res.json().catch(() => ({}));
        showToast("Erreur : " + JSON.stringify(err), "error");
      }
    } catch { showToast("Erreur réseau", "error"); }
  });
}

function openUserModal(userId = null) {
  const user = userId ? usersData.find((u) => u.id === userId) : null;
  document.getElementById("modal-title").textContent = user ? "👤 Détail Utilisateur" : "👤 Ajouter Utilisateur";
  document.getElementById("modal-body").innerHTML = `
    <form id="form-user" class="modal-form">
      <div class="form-row">
        <div class="form-group">
          <label>Prénom</label>
          <input type="text" id="user-firstname" class="form-control" value="${user ? escapeHtml(user.first_name || '') : ''}">
        </div>
        <div class="form-group">
          <label>Nom</label>
          <input type="text" id="user-lastname" class="form-control" value="${user ? escapeHtml(user.last_name || '') : ''}">
        </div>
      </div>
      <div class="form-group">
        <label>Email</label>
        <input type="email" id="user-email" class="form-control" value="${user ? escapeHtml(user.email || '') : ''}">
      </div>
      <div class="form-group">
        <label>Type de compte</label>
        <select id="user-type" class="form-control">
          <option value="non_membre" ${user?.type_compte === 'non_membre' ? 'selected' : ''}>Non-membre</option>
          <option value="en_attente" ${user?.type_compte === 'en_attente' ? 'selected' : ''}>En attente</option>
          <option value="membre" ${user?.type_compte === 'membre' ? 'selected' : ''}>Membre validé</option>
        </select>
      </div>
      ${user ? `<button type="submit" class="btn btn-primary btn-full">💾 Mettre à jour</button>` : ''}
    </form>
  `;
  openModal();

  if (user) {
    document.getElementById("form-user").addEventListener("submit", async (e) => {
      e.preventDefault();
      const payload = {
        first_name: document.getElementById("user-firstname").value,
        last_name: document.getElementById("user-lastname").value,
        email: document.getElementById("user-email").value,
        type_compte: document.getElementById("user-type").value,
      };
      try {
        const res = await fetch(`${API_BASE_URL}/utilisateurs/${user.id}/`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (res.ok) { showToast("Utilisateur mis à jour ✓", "success"); closeModal(); fetchUsers(); }
      } catch { showToast("Erreur réseau", "error"); }
    });
  }
}

function openBorrowModal() {
  document.getElementById("modal-title").textContent = "🔄 Enregistrer un Emprunt";
  const today = new Date().toISOString().split("T")[0];
  const returnDate = new Date(Date.now() + 14 * 86400000).toISOString().split("T")[0];
  document.getElementById("modal-body").innerHTML = `
    <form id="form-borrow" class="modal-form">
      <div class="form-group">
        <label>Membre emprunteur <span class="required">*</span></label>
        <select id="borrow-user" class="form-control" required>
          <option value="">— Sélectionner un membre —</option>
          ${usersData.filter((u) => u.type_compte === 'membre').map((u) =>
            `<option value="${u.id}">${escapeHtml(u.username)} — ${escapeHtml((u.first_name || '') + ' ' + (u.last_name || ''))}</option>`
          ).join("")}
        </select>
      </div>
      <div class="form-group">
        <label>Livre emprunté <span class="required">*</span></label>
        <select id="borrow-book" class="form-control" required>
          <option value="">— Sélectionner un livre —</option>
          ${booksData.filter((b) => (b.exemplaires ?? 0) > 0).map((b) =>
            `<option value="${b.id}">${escapeHtml(b.titre)} (${b.exemplaires} ex.)</option>`
          ).join("")}
        </select>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label>Date de sortie</label>
          <input type="date" id="borrow-date-sortie" class="form-control" value="${today}">
        </div>
        <div class="form-group">
          <label>Date de retour prévue</label>
          <input type="date" id="borrow-date-retour" class="form-control" value="${returnDate}">
        </div>
      </div>
      <button type="submit" class="btn btn-primary btn-full">💾 Enregistrer l'emprunt</button>
    </form>
  `;
  openModal();

  document.getElementById("form-borrow").addEventListener("submit", async (e) => {
    e.preventDefault();
    const payload = {
      user: document.getElementById("borrow-user").value,
      livre: document.getElementById("borrow-book").value,
      date_sortie: document.getElementById("borrow-date-sortie").value,
      date_retour_prevue: document.getElementById("borrow-date-retour").value,
      statut: "en_cours",
    };
    if (!payload.user || !payload.livre) { showToast("Veuillez sélectionner un membre et un livre", "warning"); return; }
    try {
      const res = await fetch(`${API_BASE_URL}/emprunts/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) { showToast("Emprunt enregistré ✓", "success"); closeModal(); fetchBorrows(); fetchBooks(); }
      else { const err = await res.json().catch(() => ({})); showToast("Erreur : " + JSON.stringify(err), "error"); }
    } catch { showToast("Erreur réseau", "error"); }
  });
}

function openNewsModal() {
  document.getElementById("modal-title").textContent = "📰 Nouvelle Publication";
  document.getElementById("modal-body").innerHTML = `
    <form id="form-news" class="modal-form">
      <div class="form-group">
        <label>Titre <span class="required">*</span></label>
        <input type="text" id="news-titre" class="form-control" required>
      </div>
      <div class="form-group">
        <label>Catégorie</label>
        <select id="news-category" class="form-control">
          <option value="announcement">Annonce</option>
          <option value="event">Événement</option>
          <option value="culture">Culture</option>
          <option value="general">Général</option>
        </select>
      </div>
      <div class="form-group">
        <label>Résumé court</label>
        <input type="text" id="news-excerpt" class="form-control">
      </div>
      <div class="form-group">
        <label>Contenu complet</label>
        <textarea id="news-content" class="form-control" rows="5" required></textarea>
      </div>
      <div class="form-group">
        <label>URL Image (optionnel)</label>
        <input type="text" id="news-image" class="form-control">
      </div>
      <button type="submit" class="btn btn-primary btn-full">📢 Publier l'article</button>
    </form>
  `;
  openModal();

  document.getElementById("form-news").addEventListener("submit", async (e) => {
    e.preventDefault();
    const payload = {
      titre: document.getElementById("news-titre").value,
      categorie: document.getElementById("news-category").value,
      excerpt: document.getElementById("news-excerpt").value,
      content: document.getElementById("news-content").value,
      image: document.getElementById("news-image").value,
    };
    try {
      const res = await fetch(`${API_BASE_URL}/actualites/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) { showToast("Publication créée ✓", "success"); closeModal(); fetchNews(); }
      else showToast("Erreur lors de la publication", "error");
    } catch { showToast("Erreur réseau", "error"); }
  });
}

function openEventModal() {
  document.getElementById("modal-title").textContent = "📅 Nouvel Événement";
  document.getElementById("modal-body").innerHTML = `
    <form id="form-event" class="modal-form">
      <div class="form-group">
        <label>Titre <span class="required">*</span></label>
        <input type="text" id="event-titre" class="form-control" required>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label>Date de l'événement</label>
          <input type="date" id="event-date" class="form-control">
        </div>
        <div class="form-group">
          <label>Heure</label>
          <input type="time" id="event-time" class="form-control" value="09:00">
        </div>
      </div>
      <div class="form-group">
        <label>Lieu</label>
        <input type="text" id="event-lieu" class="form-control" value="Bibliothèque CAEB Natitingou">
      </div>
      <div class="form-group">
        <label>Nombre de places</label>
        <input type="number" id="event-places" class="form-control" value="30">
      </div>
      <div class="form-group">
        <label>Description</label>
        <textarea id="event-description" class="form-control" rows="3"></textarea>
      </div>
      <button type="submit" class="btn btn-primary btn-full">📅 Créer l'événement</button>
    </form>
  `;
  openModal();

  document.getElementById("form-event").addEventListener("submit", async (e) => {
    e.preventDefault();
    const date = document.getElementById("event-date").value;
    const time = document.getElementById("event-time").value;
    const payload = {
      titre: document.getElementById("event-titre").value,
      date_event: date ? `${date}T${time}:00` : null,
      lieu: document.getElementById("event-lieu").value,
      nb_places: parseInt(document.getElementById("event-places").value) || 30,
      description: document.getElementById("event-description").value,
    };
    try {
      const res = await fetch(`${API_BASE_URL}/evenements/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) { showToast("Événement créé ✓", "success"); closeModal(); fetchEvents(); }
      else showToast("Erreur lors de la création", "error");
    } catch { showToast("Erreur réseau", "error"); }
  });
}

// ── MODAL UTILS ────────────────────────────────────────────────────────────────
function openModal() {
  document.getElementById("modal-container").classList.add("active");
  document.body.style.overflow = "hidden";
}

function closeModal() {
  document.getElementById("modal-container").classList.remove("active");
  document.body.style.overflow = "";
}

function handleModalOverlayClick(e) {
  if (e.target.id === "modal-container") closeModal();
}

// ── NOTIFICATIONS TOAST ────────────────────────────────────────────────────────
function showToast(message, type = "info") {
  const container = document.getElementById("toast-container");
  if (!container) return;
  const toast = document.createElement("div");
  toast.className = `toast toast-${type}`;
  const icons = { success: "✅", error: "❌", warning: "⚠️", info: "ℹ️" };
  toast.innerHTML = `<span>${icons[type] || "ℹ️"}</span><span>${escapeHtml(message)}</span>`;
  container.appendChild(toast);
  setTimeout(() => toast.classList.add("toast-show"), 10);
  setTimeout(() => {
    toast.classList.remove("toast-show");
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

// ── UTILITAIRES ────────────────────────────────────────────────────────────────
function escapeHtml(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
