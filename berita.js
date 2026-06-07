const supabaseConfigured =
  window.supabase &&
  window.KAB_SUPABASE_URL &&
  window.KAB_SUPABASE_ANON_KEY &&
  !window.KAB_SUPABASE_ANON_KEY.includes("PASTE_");

const kabDb = supabaseConfigured
  ? window.supabase.createClient(window.KAB_SUPABASE_URL, window.KAB_SUPABASE_ANON_KEY)
  : null;

const menuToggle = document.querySelector(".menu-toggle");
const nav = document.querySelector(".nav");
const articleShell = document.getElementById("articleShell");
const relatedNews = document.getElementById("relatedNews");
const articleId = new URLSearchParams(window.location.search).get("id");

menuToggle?.addEventListener("click", () => {
  const isOpen = nav.classList.toggle("is-open");
  menuToggle.setAttribute("aria-expanded", String(isOpen));
});

document.querySelectorAll(".nav a").forEach((link) => {
  link.addEventListener("click", () => {
    nav.classList.remove("is-open");
    menuToggle?.setAttribute("aria-expanded", "false");
  });
});

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => {
    const map = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" };
    return map[char];
  });
}

function formatDate(value) {
  return new Date(value).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function paragraphs(content) {
  return escapeHtml(content)
    .split(/\n{2,}|\n/)
    .filter(Boolean)
    .map((line) => `<p>${line}</p>`)
    .join("");
}

function articleUrl(id) {
  return `berita.html?id=${encodeURIComponent(id)}`;
}

function renderArticleMessage(title, text) {
  articleShell.innerHTML = `
    <div class="article-message">
      <span class="badge">Info</span>
      <h1>${escapeHtml(title)}</h1>
      <p>${escapeHtml(text)}</p>
      <a class="read-more" href="kategori.html">Lihat berita lain</a>
    </div>
  `;
}

async function loadArticle() {
  if (!articleId) {
    renderArticleMessage("Berita tidak ditemukan.", "ID berita tidak ada di alamat halaman.");
    return;
  }

  if (!kabDb) {
    renderArticleMessage("Supabase belum dikonfigurasi.", "Periksa file supabase-config.js.");
    return;
  }

  articleShell.innerHTML = `<div class="empty-state">Memuat artikel...</div>`;

  const { data, error } = await kabDb
    .from("news")
    .select("id,title,category,author,excerpt,content,image,updated_at")
    .eq("id", articleId)
    .eq("published", true)
    .single();

  if (error) {
    renderArticleMessage("Berita tidak bisa dibuka.", error.message);
    return;
  }

  document.title = `${data.title} | Kanal Akhmad Baso`;

  articleShell.innerHTML = `
    <a class="back-link" href="kategori.html?category=${encodeURIComponent(data.category)}">Kembali ke ${escapeHtml(data.category)}</a>
    <header class="article-header">
      <span class="badge">${escapeHtml(data.category)}</span>
      <h1>${escapeHtml(data.title)}</h1>
      <p>${escapeHtml(data.excerpt)}</p>
      <div class="meta">${escapeHtml(data.author)} | ${formatDate(data.updated_at)}</div>
    </header>
    ${
      data.image
        ? `<img class="article-cover" src="${escapeHtml(data.image)}" alt="${escapeHtml(data.title)}" />`
        : ""
    }
    <div class="article-content">
      ${paragraphs(data.content)}
    </div>
  `;

  await loadRelated(data.id, data.category);
}

async function loadRelated(currentId, category) {
  relatedNews.innerHTML = `<div class="empty-state">Memuat...</div>`;

  const { data, error } = await kabDb
    .from("news")
    .select("id,title,category,updated_at")
    .eq("published", true)
    .neq("id", currentId)
    .eq("category", category)
    .order("updated_at", { ascending: false })
    .limit(5);

  if (error || !data.length) {
    relatedNews.innerHTML = `<div class="empty-state">Belum ada berita terkait.</div>`;
    return;
  }

  relatedNews.innerHTML = data
    .map(
      (item) => `
        <a class="related-item" href="${articleUrl(item.id)}">
          <span>${escapeHtml(item.category)}</span>
          <strong>${escapeHtml(item.title)}</strong>
          <small>${formatDate(item.updated_at)}</small>
        </a>
      `
    )
    .join("");
}

loadArticle();
