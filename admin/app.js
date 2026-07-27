/**
 * CAEB Natitingou — Application d'Administration Autonome (admin/app.js)
 * Se connecte à l'API Django pour effectuer la gestion complète (CRUD).
 */

const API_BASE_URL = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
  ? "http://localhost:8080/api"
  : "https://caeb-backend.onrender.com/api";

// ── ÉTATS GLOBAUX ─────────────────────────────────────────────────────────────
let booksData = [];
let usersData = [];
let borrowsData = [];
let newsData = [];
let eventsData = [];

// ── INITIALISATION ET GESTION DES ONGLETS ────────────────────────────────────
document.addEventListener("DOMContentLoaded", () => {
  initTabs();
  checkApiHealth();
  fetchAllData();

  document.getElementById("btn-refresh").addEventListener("click", fetchAllData);
  document.getElementById("btn-new-item").addEventListener("click", () => openBookModal());
  document.getElementById("modal-close").addEventListener("click", closeModal);
  
  // Événements de recherche et filtre
  setupSearchAndFilters();
});

function initTabs() {
  const navItems = document.querySelectorAll(".nav-item");
  const tabContents = document.querySelectorAll(".tab-content");

  navItems.forEach((item) => {
    item.addEventListener("click", () => {
      const tabName = item.getAttribute("data-tab");

      navItems.forEach((n) => n.classList.remove("active"));
      tabContents.forEach((c) => c.classList.remove("active"));

      item.classList.add("active");
      document.getElementById(`tab-${tabName}`).classList.add("active");

      // Mettre à jour les titres de l'en-tête
      updateHeaderTitle(tabName);
    });
  });
}

function updateHeaderTitle(tabName) {
  const titles = {
    dashboard: { title: "Tableau de bord", subtitle: "Vue d'ensemble et statistiques globales" },
    books: { title: "Gestion du Catalogue de Livres", subtitle: "Ajout, modification, suppression et suivi du stock" },
    users: { title: "Gestion des Utilisateurs & Membres", subtitle: "Validation des adhésions et gestion des rôles" },
    borrows: { title: "Gestion des Emprunts Physiques", subtitle: "Suivi des prêts, retours et alertes de retard" },
    news: { title: "Publications & Actualités", subtitle: "Gestion des articles et annonces de la bibliothèque" },
    events: { title: "Événements & Clubs de lecture", subtitle: "Organisation des activités et ateliers" },
  };

  const info = titles[tabName] || { title: "Administration", subtitle: "Gestion CAEB Natitingou" };
  document.getElementById("page-title").textContent = info.title;
  document.getElementById("page-subtitle").textContent = info.subtitle;
}

// ── TEST DE SANTÉ DE L'API ───────────────────────────────────────────────────
async function checkApiHealth() {
  const statusText = document.getElementById("api-status-text");
  const statusDot = document.querySelector(".status-dot");

  try {
    const res = await fetch(`${API_BASE_URL}/stats/`);
    if (res.ok) {
      statusText.textContent = "API Connectée";
      statusDot.className = "status-dot online";
    } else {
      throw new Error();
    }
  } catch {
    statusText.textContent = "API Hors-ligne (Vérifiez le serveur)";
    statusDot.className = "status-dot offline";
  }
}

// ── CHARGEMENT DE TOUTES LES DONNÉES ──────────────────────────────────────────
async function fetchAllData() {
  await Promise.all([
    fetchBooks(),
    fetchUsers(),
    fetchBorrows(),
    fetchNews(),
    fetchEvents(),
  ]);
  updateDashboardStats();
}

async function fetchBooks() {
  try {
    const res = await fetch(`${API_BASE_URL}/livres/?page_size=1000`);
    if (res.ok) {
      const data = await res.json();
      booksData = data.results || data;
      renderBooksTable(booksData);
      populateGenreFilter();
    }
  } catch (err) {
    console.error("Erreur de chargement des livres:", err);
  }
}

async function fetchUsers() {
  try {
    const res = await fetch(`${API_BASE_URL}/utilisateurs/?page_size=1000`);
    if (res.ok) {
      const data = await res.json();
      usersData = data.results || data;
      renderUsersTable(usersData);
    }
  } catch (err) {
    console.error("Erreur de chargement des utilisateurs:", err);
  }
}

async function fetchBorrows() {
  try {
    const res = await fetch(`${API_BASE_URL}/emprunts/?page_size=1000`);
    if (res.ok) {
      const data = await res.json();
      borrowsData = data.results || data;
      renderBorrowsTable(borrowsData);
    }
  } catch (err) {
    console.error("Erreur de chargement des emprunts:", err);
  }
}

async function fetchNews() {
  try {
    const res = await fetch(`${API_BASE_URL}/actualites/?page_size=1000`);
    if (res.ok) {
      const data = await res.json();
      newsData = data.results || data;
      renderNewsTable(newsData);
    }
  } catch (err) {
    console.error("Erreur de chargement des actualités:", err);
  }
}

async function fetchEvents() {
  try {
    const res = await fetch(`${API_BASE_URL}/evenements/?page_size=1000`);
    if (res.ok) {
      const data = await res.json();
      eventsData = data.results || data;
      renderEventsTable(eventsData);
    }
  } catch (err) {
    console.error("Erreur de chargement des événements:", err);
  }
}

// ── TABLEAU DE BORD (STATS) ──────────────────────────────────────────────────
function updateDashboardStats() {
  document.getElementById("stat-books-count").textContent = booksData.length;
  document.getElementById("stat-users-count").textContent = usersData.length;
  
  const activeBorrows = borrowsData.filter(b => b.statut === "en_cours").length;
  document.getElementById("stat-borrows-count").textContent = activeBorrows;

  const pendingAdhesions = usersData.filter(u => u.demande_adhesion || u.type_compte === "en_attente").length;
  document.getElementById("stat-late-count").textContent = pendingAdhesions;

  // Remplir les mini-tableaux du dashboard
  renderDashboardRecentBooks();
  renderDashboardRecentUsers();
}

function renderDashboardRecentBooks() {
  const tbody = document.querySelector("#recent-books-table tbody");
  tbody.innerHTML = booksData.slice(0, 5).map(b => `
    <tr>
      <td><img src="${b.couverture_url || ''}" style="height:35px; border-radius:4px;" alt=""></td>
      <td><strong>${escapeHtml(b.titre)}</strong></td>
      <td>${escapeHtml(b.auteur || 'Inconnu')}</td>
      <td><span class="badge badge-info">${escapeHtml(b.genre || 'Général')}</span></td>
      <td>${b.exemplaires || 1}</td>
    </tr>
  `).join("") || "<tr><td colspan='5'>Aucun livre</td></tr>";
}

function renderDashboardRecentUsers() {
  const tbody = document.querySelector("#recent-users-table tbody");
  tbody.innerHTML = usersData.slice(0, 5).map(u => `
    <tr>
      <td><strong>${escapeHtml(u.username)}</strong></td>
      <td>${escapeHtml(u.first_name || '')} ${escapeHtml(u.last_name || '')}</td>
      <td><span class="badge badge-info">${escapeHtml(u.type_compte)}</span></td>
      <td>${u.demande_adhesion ? '<span class="badge badge-warning">Adhésion demandée</span>' : '<span class="badge badge-success">Actif</span>'}</td>
    </tr>
  `).join("") || "<tr><td colspan='4'>Aucun utilisateur</td></tr>";
}

// ── TABLEAU DES LIVRES ───────────────────────────────────────────────────────
function renderBooksTable(books) {
  const tbody = document.querySelector("#books-table tbody");
  tbody.innerHTML = books.map(b => `
    <tr>
      <td><img src="${b.couverture_url || ''}" style="height:45px; border-radius:4px;" alt=""></td>
      <td><strong>${escapeHtml(b.titre)}</strong></td>
      <td>${escapeHtml(b.auteur || 'Inconnu')}</td>
      <td><span class="badge badge-info">${escapeHtml(b.genre || 'Roman')}</span></td>
      <td>${b.exemplaires || 1} ex.</td>
      <td><code>${escapeHtml(b.cote || 'R-01')}</code></td>
      <td>
        <button class="btn btn-sm btn-secondary" onclick="openBookModal('${b.id}')">✏️ Éditer</button>
        <button class="btn btn-sm btn-danger" onclick="deleteBook('${b.id}')">🗑️ Surpr.</button>
      </td>
    </tr>
  `).join("") || "<tr><td colspan='7'>Aucun livre trouvé</td></tr>";
}

function populateGenreFilter() {
  const genres = [...new Set(booksData.map(b => b.genre).filter(Boolean))];
  const select = document.getElementById("filter-genre");
  select.innerHTML = '<option value="">Tous les genres</option>' + 
    genres.map(g => `<option value="${escapeHtml(g)}">${escapeHtml(g)}</option>`).join("");
}

// ── TABLEAU DES UTILISATEURS ──────────────────────────────────────────────────
function renderUsersTable(users) {
  const tbody = document.querySelector("#users-table tbody");
  tbody.innerHTML = users.map(u => `
    <tr>
      <td><strong>${escapeHtml(u.username)}</strong></td>
      <td>${escapeHtml(u.first_name || '')} ${escapeHtml(u.last_name || '')}</td>
      <td>${escapeHtml(u.email || '-')}</td>
      <td>${escapeHtml(u.telephone || '-')}</td>
      <td><span class="badge badge-info">${escapeHtml(u.type_compte)}</span></td>
      <td>
        ${u.demande_adhesion 
          ? `<button class="btn btn-sm btn-primary" onclick="validerAdhesion('${u.id}')">✔ Valider Membre</button>` 
          : '<span class="badge badge-success">Validé</span>'}
      </td>
      <td>
        <button class="btn btn-sm btn-danger" onclick="deleteUser('${u.id}')">🗑️ Suppr.</button>
      </td>
    </tr>
  `).join("") || "<tr><td colspan='7'>Aucun utilisateur trouvé</td></tr>";
}

// ── TABLEAU DES EMPRUNTS ─────────────────────────────────────────────────────
function renderBorrowsTable(borrows) {
  const tbody = document.querySelector("#borrows-table tbody");
  tbody.innerHTML = borrows.map(b => `
    <tr>
      <td><code>${escapeHtml(b.id)}</code></td>
      <td><strong>${escapeHtml(b.user_detail?.username || b.user || 'Membre')}</strong></td>
      <td>${escapeHtml(b.livre_detail?.titre || b.livre || 'Livre')}</td>
      <td>${b.date_sortie || '-'}</td>
      <td>${b.date_retour_prevue || '-'}</td>
      <td>
        ${b.statut === 'rendu' ? '<span class="badge badge-success">Rendu</span>' : 
          b.statut === 'perdu' ? '<span class="badge badge-danger">Perdu</span>' : 
          '<span class="badge badge-warning">En cours</span>'}
      </td>
      <td>
        ${b.statut === 'en_cours' ? `<button class="btn btn-sm btn-primary" onclick="marquerRendu('${b.id}')">✔ Marquer Rendu</button>` : ''}
      </td>
    </tr>
  `).join("") || "<tr><td colspan='7'>Aucun emprunt</td></tr>";
}

// ── TABLEAU DES NEWS ─────────────────────────────────────────────────────────
function renderNewsTable(news) {
  const tbody = document.querySelector("#news-table tbody");
  tbody.innerHTML = news.map(n => `
    <tr>
      <td><strong>${escapeHtml(n.titre || n.title || 'Actualité')}</strong></td>
      <td><span class="badge badge-info">${escapeHtml(n.categorie || 'Général')}</span></td>
      <td>${escapeHtml(n.auteur || 'Admin')}</td>
      <td>${n.pub_date || n.date || '-'}</td>
      <td><span class="badge badge-success">Publié</span></td>
      <td>
        <button class="btn btn-sm btn-danger" onclick="deleteNews('${n.id}')">🗑️ Suppr.</button>
      </td>
    </tr>
  `).join("") || "<tr><td colspan='6'>Aucune publication</td></tr>";
}

// ── TABLEAU DES ÉVÉNEMENTS ───────────────────────────────────────────────────
function renderEventsTable(events) {
  const tbody = document.querySelector("#events-table tbody");
  tbody.innerHTML = events.map(e => `
    <tr>
      <td><strong>${escapeHtml(e.titre || e.title || 'Événement')}</strong></td>
      <td>${e.date_event || e.date || '-'}</td>
      <td>${escapeHtml(e.lieu || 'Bibliothèque')}</td>
      <td>${e.nb_places || 30} places</td>
      <td>
        <button class="btn btn-sm btn-danger" onclick="deleteEvent('${e.id}')">🗑️ Suppr.</button>
      </td>
    </tr>
  `).join("") || "<tr><td colspan='5'>Aucun événement</td></tr>";
}

// ── ACTIONS CRUD & API ────────────────────────────────────────────────────────
async function validerAdhesion(userId) {
  try {
    const res = await fetch(`${API_BASE_URL}/utilisateurs/${userId}/`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type_compte: "membre", demande_adhesion: false }),
    });
    if (res.ok) {
      alert("Demande d'adhésion validée avec succès !");
      fetchUsers();
    }
  } catch (err) {
    alert("Erreur lors de la validation de l'adhésion.");
  }
}

async function marquerRendu(borrowId) {
  try {
    const today = new Date().toISOString().split("T")[0];
    const res = await fetch(`${API_BASE_URL}/emprunts/${borrowId}/`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ statut: "rendu", date_retour_effective: today }),
    });
    if (res.ok) {
      alert("Emprunt marqué comme rendu !");
      fetchBorrows();
    }
  } catch (err) {
    alert("Erreur lors du retour de l'emprunt.");
  }
}

async function deleteBook(id) {
  if (!confirm("Voulez-vous vraiment supprimer ce livre du catalogue ?")) return;
  try {
    const res = await fetch(`${API_BASE_URL}/livres/${id}/`, { method: "DELETE" });
    if (res.ok) {
      alert("Livre supprimé.");
      fetchBooks();
    }
  } catch (err) {
    alert("Erreur de suppression.");
  }
}

async function deleteUser(id) {
  if (!confirm("Voulez-vous vraiment supprimer cet utilisateur ?")) return;
  try {
    const res = await fetch(`${API_BASE_URL}/utilisateurs/${id}/`, { method: "DELETE" });
    if (res.ok) {
      alert("Utilisateur supprimé.");
      fetchUsers();
    }
  } catch (err) {
    alert("Erreur de suppression.");
  }
}

async function deleteNews(id) {
  if (!confirm("Supprimer cette actualité ?")) return;
  try {
    const res = await fetch(`${API_BASE_URL}/actualites/${id}/`, { method: "DELETE" });
    if (res.ok) fetchNews();
  } catch (err) {}
}

async function deleteEvent(id) {
  if (!confirm("Supprimer cet événement ?")) return;
  try {
    const res = await fetch(`${API_BASE_URL}/evenements/${id}/`, { method: "DELETE" });
    if (res.ok) fetchEvents();
  } catch (err) {}
}

// ── RECHERCHE ET FILTRES DYNAMIQUES ──────────────────────────────────────────
function setupSearchAndFilters() {
  document.getElementById("search-books").addEventListener("input", (e) => {
    const q = e.target.value.toLowerCase();
    const filtered = booksData.filter(b => 
      b.titre?.toLowerCase().includes(q) || b.auteur?.toLowerCase().includes(q)
    );
    renderBooksTable(filtered);
  });

  document.getElementById("filter-genre").addEventListener("change", (e) => {
    const genre = e.target.value;
    const filtered = genre ? booksData.filter(b => b.genre === genre) : booksData;
    renderBooksTable(filtered);
  });

  document.getElementById("search-users").addEventListener("input", (e) => {
    const q = e.target.value.toLowerCase();
    const filtered = usersData.filter(u => 
      u.username?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q)
    );
    renderUsersTable(filtered);
  });
}

// ── GESTION DE LA MODAL ───────────────────────────────────────────────────────
function openBookModal(bookId = null) {
  const book = bookId ? booksData.find(b => b.id === bookId) : null;
  const title = document.getElementById("modal-title");
  const body = document.getElementById("modal-body");

  title.textContent = book ? "✏️ Éditer le livre" : "📖 Ajouter un nouveau livre";
  
  body.innerHTML = `
    <form id="form-book">
      <div class="form-group">
        <label>ID du livre (Code)</label>
        <input type="text" id="book-id" class="form-control" value="${book ? book.id : 'LIV-' + Date.now()}" ${book ? 'readonly' : ''} required>
      </div>
      <div class="form-group">
        <label>Titre</label>
        <input type="text" id="book-titre" class="form-control" value="${book ? escapeHtml(book.titre) : ''}" required>
      </div>
      <div class="form-group">
        <label>Auteur</label>
        <input type="text" id="book-auteur" class="form-control" value="${book ? escapeHtml(book.auteur || '') : ''}">
      </div>
      <div class="form-group">
        <label>Genre</label>
        <input type="text" id="book-genre" class="form-control" value="${book ? escapeHtml(book.genre || '') : 'Roman'}">
      </div>
      <div class="form-group">
        <label>Nombre d'exemplaires</label>
        <input type="number" id="book-exemplaires" class="form-control" value="${book ? book.exemplaires : 1}">
      </div>
      <div class="form-group">
        <label>Cote physique (Rangement)</label>
        <input type="text" id="book-cote" class="form-control" value="${book ? escapeHtml(book.cote || '') : 'R-01'}">
      </div>
      <div class="form-group">
        <label>URL Image de Couverture</label>
        <input type="text" id="book-couverture" class="form-control" value="${book ? escapeHtml(book.couverture_url || '') : ''}">
      </div>
      <div class="form-group">
        <label>Résumé</label>
        <textarea id="book-resume" class="form-control" rows="3">${book ? escapeHtml(book.resume || '') : ''}</textarea>
      </div>
      <button type="submit" class="btn btn-primary" style="width:100%; margin-top:1rem;">💾 Enregistrer</button>
    </form>
  `;

  document.getElementById("modal-container").classList.add("active");

  document.getElementById("form-book").addEventListener("submit", async (e) => {
    e.preventDefault();
    const payload = {
      id: document.getElementById("book-id").value,
      titre: document.getElementById("book-titre").value,
      auteur: document.getElementById("book-auteur").value,
      genre: document.getElementById("book-genre").value,
      exemplaires: parseInt(document.getElementById("book-exemplaires").value) || 1,
      cote: document.getElementById("book-cote").value,
      couverture_url: document.getElementById("book-couverture").value,
      resume: document.getElementById("book-resume").value,
    };

    try {
      const url = book ? `${API_BASE_URL}/livres/${book.id}/` : `${API_BASE_URL}/livres/`;
      const method = book ? "PUT" : "POST";
      const res = await fetch(url, {
        method: method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        alert("Livre enregistré avec succès !");
        closeModal();
        fetchBooks();
      } else {
        alert("Erreur lors de l'enregistrement.");
      }
    } catch (err) {
      alert("Erreur réseau.");
    }
  });
}

function closeModal() {
  document.getElementById("modal-container").classList.remove("active");
}

function escapeHtml(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
