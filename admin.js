const SESSION_KEY = "kab-admin-token";
const ADMIN_NAME_KEY = "kab-admin-name";

const supabaseConfigured =
  window.supabase &&
  window.KAB_SUPABASE_URL &&
  window.KAB_SUPABASE_ANON_KEY &&
  !window.KAB_SUPABASE_ANON_KEY.includes("PASTE_");

const kabDb = supabaseConfigured
  ? window.supabase.createClient(window.KAB_SUPABASE_URL, window.KAB_SUPABASE_ANON_KEY)
  : null;

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

let adminNews = [];

function getToken() {
  return sessionStorage.getItem(SESSION_KEY);
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => {
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
  const items = [...adminNews].sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at));
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
            <small>${escapeHtml(item.category)} | ${escapeHtml(item.author)} | ${new Date(item.updated_at).toLocaleString("id-ID")}</small>
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

function requireSupabase() {
  if (kabDb) return true;

  loginMessage.textContent =
    "Supabase belum dikonfigurasi. Isi anon key di supabase-config.js dan jalankan supabase-schema.sql.";
  return false;
}

async function loadAdminNews() {
  newsList.innerHTML = `<div class="empty-state">Memuat berita dari Supabase...</div>`;

  const { data, error } = await kabDb.rpc("get_admin_news", {
    session_token: getToken(),
  });

  if (error) {
    sessionStorage.removeItem(SESSION_KEY);
    sessionStorage.removeItem(ADMIN_NAME_KEY);
    showLogin();
    loginMessage.textContent = error.message;
    return;
  }

  adminNews = data || [];
  showDashboard();
}

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  loginMessage.textContent = "";

  if (!requireSupabase()) return;

  const formData = new FormData(loginForm);
  const username = formData.get("username");
  const password = formData.get("password");

  const { data, error } = await kabDb.rpc("login_admin", {
    input_username: username,
    input_password: password,
  });

  if (error || !data?.length) {
    loginMessage.textContent = error?.message || "Username atau password salah.";
    return;
  }

  sessionStorage.setItem(SESSION_KEY, data[0].token);
  sessionStorage.setItem(ADMIN_NAME_KEY, data[0].display_name);
  loginForm.reset();
  await loadAdminNews();
});

logoutButton.addEventListener("click", async () => {
  if (kabDb && getToken()) {
    await kabDb.rpc("logout_admin", { session_token: getToken() });
  }

  sessionStorage.removeItem(SESSION_KEY);
  sessionStorage.removeItem(ADMIN_NAME_KEY);
  showLogin();
});

resetFormButton.addEventListener("click", resetForm);

newsForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  saveMessage.textContent = "";

  const existingId = fields.id.value || null;
  const existing = adminNews.find((item) => item.id === existingId);
  const uploadedImage = await getImageFromFile(fields.imageFile.files[0]);
  const imageValue = uploadedImage || fields.imageUrl.value.trim() || existing?.image || "";

  const { error } = await kabDb.rpc("save_admin_news", {
    session_token: getToken(),
    input_id: existingId,
    input_title: fields.title.value.trim(),
    input_category: fields.category.value,
    input_author: fields.author.value.trim(),
    input_excerpt: fields.excerpt.value.trim(),
    input_content: fields.content.value.trim(),
    input_image: imageValue,
    input_published: fields.published.checked,
  });

  if (error) {
    saveMessage.textContent = error.message;
    return;
  }

  saveMessage.textContent = "Berita berhasil disimpan ke Supabase.";
  resetForm();
  await loadAdminNews();
});

newsList.addEventListener("click", async (event) => {
  const button = event.target.closest("button[data-action]");
  if (!button) return;

  const action = button.dataset.action;
  const id = button.dataset.id;
  const item = adminNews.find((news) => news.id === id);

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
    const { error } = await kabDb.rpc("toggle_admin_news", {
      session_token: getToken(),
      input_id: id,
    });

    if (error) {
      saveMessage.textContent = error.message;
      return;
    }

    await loadAdminNews();
    return;
  }

  if (action === "delete" && confirm("Hapus berita ini?")) {
    const { error } = await kabDb.rpc("delete_admin_news", {
      session_token: getToken(),
      input_id: id,
    });

    if (error) {
      saveMessage.textContent = error.message;
      return;
    }

    await loadAdminNews();
  }
});

if (getToken() && kabDb) {
  loadAdminNews();
} else {
  showLogin();
  if (!supabaseConfigured) {
    loginMessage.textContent =
      "Isi KAB_SUPABASE_ANON_KEY di supabase-config.js, lalu jalankan supabase-schema.sql di Supabase SQL Editor.";
  }
}
