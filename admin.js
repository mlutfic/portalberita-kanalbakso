const STORAGE_KEY = "kab-news";
const SESSION_KEY = "kab-admin-session";
const ADMIN_USER = "admin";
const ADMIN_PASS = "kab2026";

const loginPanel = document.getElementById("loginPanel");
const dashboardPanel = document.getElementById("dashboardPanel");
const loginForm = document.getElementById("loginForm");
const loginMessage = document.getElementById("loginMessage");
const logoutButton = document.getElementById("logoutButton");
const newsForm = document.getElementById("newsForm");
const newsList = document.getElementById("adminNewsList");
const newsCount = document.getElementById("newsCount");
const saveMessage = document.getElementById("saveMessage");
const resetFormButton = document.getElementById("resetForm");
const formTitle = document.getElementById("formTitle");

const fields = {
  id: document.getElementById("newsId"),
  title: document.getElementById("newsTitle"),
  category: document.getElementById("newsCategory"),
  author: document.getElementById("newsAuthor"),
  excerpt: document.getElementById("newsExcerpt"),
  content: document.getElementById("newsContent"),
  imageUrl: document.getElementById("newsImageUrl"),
  imageFile: document.getElementById("newsImageFile"),
  published: document.getElementById("newsPublished"),
};

const getNews = () => JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
const setNews = (items) => localStorage.setItem(STORAGE_KEY, JSON.stringify(items));

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => {
    const map = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" };
    return map[char];
  });
}

function showDashboard() {
  loginPanel.classList.add("is-hidden");
  dashboardPanel.classList.remove("is-hidden");
  renderAdminList();
}

function showLogin() {
  loginPanel.classList.remove("is-hidden");
  dashboardPanel.classList.add("is-hidden");
}

function resetForm() {
  newsForm.reset();
  fields.id.value = "";
  fields.author.value = "Redaksi Kanal";
  fields.published.checked = true;
  formTitle.textContent = "Tulis Berita";
  saveMessage.textContent = "";
}

function getImageFromFile(file) {
  return new Promise((resolve, reject) => {
    if (!file) {
      resolve("");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error("Gagal membaca gambar"));
    reader.readAsDataURL(file);
  });
}

function renderAdminList() {
  const items = getNews().sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
  newsCount.textContent = `${items.length} berita`;

  if (!items.length) {
    newsList.innerHTML = `<div class="empty-state">Belum ada berita. Tulis berita pertama dari form di sebelah kiri.</div>`;
    return;
  }

  newsList.innerHTML = items
    .map(
      (item) => `
        <article class="admin-news-item">
          <div>
            <span class="status ${item.published ? "is-published" : "is-draft"}">
              ${item.published ? "Terbit" : "Draft"}
            </span>
            <h3>${escapeHtml(item.title)}</h3>
            <p>${escapeHtml(item.excerpt)}</p>
            <small>${escapeHtml(item.category)} | ${escapeHtml(item.author)} | ${new Date(item.updatedAt).toLocaleString("id-ID")}</small>
          </div>
          <div class="item-actions">
            <button type="button" data-action="edit" data-id="${item.id}">Edit</button>
            <button type="button" data-action="toggle" data-id="${item.id}">
              ${item.published ? "Jadikan Draft" : "Terbitkan"}
            </button>
            <button type="button" data-action="delete" data-id="${item.id}">Hapus</button>
          </div>
        </article>
      `
    )
    .join("");
}

loginForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const formData = new FormData(loginForm);
  const username = formData.get("username");
  const password = formData.get("password");

  if (username === ADMIN_USER && password === ADMIN_PASS) {
    sessionStorage.setItem(SESSION_KEY, "true");
    loginForm.reset();
    loginMessage.textContent = "";
    showDashboard();
    return;
  }

  loginMessage.textContent = "Username atau password salah.";
});

logoutButton.addEventListener("click", () => {
  sessionStorage.removeItem(SESSION_KEY);
  showLogin();
});

resetFormButton.addEventListener("click", resetForm);

newsForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const items = getNews();
  const existingId = fields.id.value;
  const existing = items.find((item) => item.id === existingId);
  const uploadedImage = await getImageFromFile(fields.imageFile.files[0]);
  const now = new Date().toISOString();

  const nextItem = {
    id: existingId || crypto.randomUUID(),
    title: fields.title.value.trim(),
    category: fields.category.value,
    author: fields.author.value.trim(),
    excerpt: fields.excerpt.value.trim(),
    content: fields.content.value.trim(),
    image: uploadedImage || fields.imageUrl.value.trim() || existing?.image || "",
    published: fields.published.checked,
    createdAt: existing?.createdAt || now,
    updatedAt: now,
  };

  const nextItems = existingId
    ? items.map((item) => (item.id === existingId ? nextItem : item))
    : [nextItem, ...items];

  setNews(nextItems);
  saveMessage.textContent = "Berita berhasil disimpan.";
  renderAdminList();
  resetForm();
});

newsList.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-action]");
  if (!button) return;

  const action = button.dataset.action;
  const id = button.dataset.id;
  const items = getNews();
  const item = items.find((news) => news.id === id);

  if (!item) return;

  if (action === "edit") {
    fields.id.value = item.id;
    fields.title.value = item.title;
    fields.category.value = item.category;
    fields.author.value = item.author;
    fields.excerpt.value = item.excerpt;
    fields.content.value = item.content;
    fields.imageUrl.value = item.image?.startsWith("http") ? item.image : "";
    fields.published.checked = item.published;
    formTitle.textContent = "Edit Berita";
    saveMessage.textContent = "";
    window.scrollTo({ top: 0, behavior: "smooth" });
    return;
  }

  if (action === "toggle") {
    setNews(items.map((news) => (news.id === id ? { ...news, published: !news.published, updatedAt: new Date().toISOString() } : news)));
    renderAdminList();
    return;
  }

  if (action === "delete" && confirm("Hapus berita ini?")) {
    setNews(items.filter((news) => news.id !== id));
    renderAdminList();
  }
});

if (sessionStorage.getItem(SESSION_KEY) === "true") {
  showDashboard();
} else {
  showLogin();
}
