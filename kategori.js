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
const categoryTitle = document.getElementById("categoryTitle");
const categoryIntro = document.getElementById("categoryIntro");
const categoryNewsList = document.getElementById("categoryNewsList");
const category = new URLSearchParams(window.location.search).get("category");

const categoryCopy = {
  Publik: "Isu kota, pelayanan umum, kebijakan, dan aspirasi warga.",
  Budaya: "Catatan tokoh, tradisi, sejarah, dan kebudayaan Tana Luwu.",
  Komunitas: "Aktivitas warga, agenda sosial, pendidikan, dan gotong royong.",
  Opini: "Kolom pandangan warga dan catatan redaksi.",
};

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

function articleUrl(id) {
  return `berita.html?id=${encodeURIComponent(id)}`;
}

function renderMessage(title, text) {
  categoryNewsList.innerHTML = `
    <article class="public-empty category-empty">
      <span class="badge">Info</span>
      <h3>${escapeHtml(title)}</h3>
      <p>${escapeHtml(text)}</p>
    </article>
  `;
}

function setupCategoryHeader() {
  const active = category || "all";
  categoryTitle.textContent = category ? `Berita ${category}` : "Berita Terkini";
  categoryIntro.textContent = category
    ? categoryCopy[category] || "Kumpulan berita berdasarkan kategori pilihan."
    : "Semua berita terbaru yang sudah diterbitkan redaksi Kanal Akhmad Baso.";

  document.querySelectorAll("[data-category-link]").forEach((link) => {
    link.classList.toggle("is-active", link.dataset.categoryLink === active);
  });
}

async function loadCategoryNews() {
  setupCategoryHeader();

  if (!kabDb) {
    renderMessage("Supabase belum dikonfigurasi.", "Periksa file supabase-config.js.");
    return;
  }

  categoryNewsList.innerHTML = `<div class="empty-state">Memuat berita...</div>`;

  let query = kabDb
    .from("news")
    .select("id,title,category,author,excerpt,image,updated_at")
    .eq("published", true)
    .order("updated_at", { ascending: false });

  if (category) {
    query = query.eq("category", category);
  }

  const { data, error } = await query;

  if (error) {
    renderMessage("Gagal memuat berita.", error.message);
    return;
  }

  if (!data.length) {
    renderMessage("Belum ada berita di kategori ini.", "Berita yang diterbitkan admin akan muncul otomatis di halaman ini.");
    return;
  }

  const lead = data[0];
  const rest = data.slice(1);

  categoryNewsList.innerHTML = `
    <article class="category-lead">
      ${
        lead.image
          ? `<img src="${escapeHtml(lead.image)}" alt="${escapeHtml(lead.title)}" />`
          : `<div class="published-placeholder">${escapeHtml(lead.category.slice(0, 1))}</div>`
      }
      <div>
        <span class="badge">${escapeHtml(lead.category)}</span>
        <h2>${escapeHtml(lead.title)}</h2>
        <p>${escapeHtml(lead.excerpt)}</p>
        <div class="meta">${escapeHtml(lead.author)} | ${formatDate(lead.updated_at)}</div>
        <a class="read-more" href="${articleUrl(lead.id)}">Baca isi berita</a>
      </div>
    </article>
    <div class="category-list">
      ${rest
        .map(
          (item) => `
            <article class="category-row">
              ${
                item.image
                  ? `<img src="${escapeHtml(item.image)}" alt="${escapeHtml(item.title)}" />`
                  : `<div class="category-thumb">${escapeHtml(item.category.slice(0, 1))}</div>`
              }
              <div>
                <span class="badge">${escapeHtml(item.category)}</span>
                <h3>${escapeHtml(item.title)}</h3>
                <p>${escapeHtml(item.excerpt)}</p>
                <div class="meta">${escapeHtml(item.author)} | ${formatDate(item.updated_at)}</div>
                <a class="read-more inline" href="${articleUrl(item.id)}">Baca</a>
              </div>
            </article>
          `
        )
        .join("")}
    </div>
  `;
}

loadCategoryNews();
