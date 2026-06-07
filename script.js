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
  return String(value).replace(/[&<>"']/g, (char) => {
    const map = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" };
    return map[char];
  });
}

function renderPublishedNews() {
  if (!publishedNews) return;

  const items = JSON.parse(localStorage.getItem("kab-news") || "[]")
    .filter((item) => item.published)
    .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));

  if (!items.length) {
    publishedNews.innerHTML = `
      <article class="public-empty">
        <span class="badge">Info</span>
        <h3>Belum ada berita admin yang diterbitkan.</h3>
        <p>Masuk ke halaman admin, tulis berita, lalu aktifkan pilihan terbitkan di website.</p>
      </article>
    `;
    return;
  }

  publishedNews.innerHTML = items
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
            <div class="meta">${escapeHtml(item.author)} | ${new Date(item.updatedAt).toLocaleDateString("id-ID")}</div>
          </div>
        </article>
      `
    )
    .join("");
}

renderPublishedNews();
