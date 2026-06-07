const supabaseConfigured =
  window.KAB_SUPABASE_URL &&
  window.KAB_SUPABASE_ANON_KEY &&
  !window.KAB_SUPABASE_ANON_KEY.includes("PASTE_");

const kabDb = supabaseConfigured
  ? window.supabase.createClient(window.KAB_SUPABASE_URL, window.KAB_SUPABASE_ANON_KEY)
  : null;

const menuToggle = document.querySelector(".menu-toggle");
const nav = document.querySelector(".nav");

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

const filterButtons = document.querySelectorAll(".filter");
const topicCards = document.querySelectorAll(".topic-card");
const publishedNews = document.getElementById("publishedNews");

filterButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const filter = button.dataset.filter;

    filterButtons.forEach((item) => item.classList.remove("is-active"));
    button.classList.add("is-active");

    topicCards.forEach((card) => {
      const shouldShow = filter === "all" || card.dataset.category === filter;
      card.classList.toggle("is-hidden", !shouldShow);
    });
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

function renderEmptyNews(title, description) {
  publishedNews.innerHTML = `
    <article class="public-empty">
      <span class="badge">Info</span>
      <h3>${escapeHtml(title)}</h3>
      <p>${escapeHtml(description)}</p>
    </article>
  `;
}

async function renderPublishedNews() {
  if (!publishedNews) return;

  if (!kabDb) {
    renderEmptyNews(
      "Supabase belum dikonfigurasi.",
      "Isi KAB_SUPABASE_ANON_KEY di supabase-config.js, lalu jalankan supabase-schema.sql di SQL Editor Supabase."
    );
    return;
  }

  publishedNews.innerHTML = `<div class="empty-state">Memuat berita dari Supabase...</div>`;

  const { data, error } = await kabDb
    .from("news")
    .select("id,title,category,author,excerpt,content,image,published,created_at,updated_at")
    .eq("published", true)
    .order("updated_at", { ascending: false });

  if (error) {
    renderEmptyNews("Gagal memuat berita.", error.message);
    return;
  }

  if (!data.length) {
    renderEmptyNews(
      "Belum ada berita admin yang diterbitkan.",
      "Masuk ke halaman admin, tulis berita, lalu aktifkan pilihan terbitkan di website."
    );
    return;
  }

  publishedNews.innerHTML = data
    .map(
      (item) => `
        <article class="published-card">
          ${
            item.image
              ? `<img src="${escapeHtml(item.image)}" alt="${escapeHtml(item.title)}" />`
              : `<div class="published-placeholder">${escapeHtml(item.category.slice(0, 1))}</div>`
          }
          <div>
            <span class="badge">${escapeHtml(item.category)}</span>
            <h3>${escapeHtml(item.title)}</h3>
            <p>${escapeHtml(item.excerpt)}</p>
            <details>
              <summary>Baca isi berita</summary>
              <p>${escapeHtml(item.content).replace(/\n/g, "<br />")}</p>
            </details>
            <div class="meta">${escapeHtml(item.author)} | ${formatDate(item.updated_at)}</div>
          </div>
        </article>
      `
    )
    .join("");
}

renderPublishedNews();
