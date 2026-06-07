const ASSET_NOTICE = "Maaf, aset ini milik Kanal Bakso.";
let assetNoticeTimer;

function ensureAssetNotice() {
  let notice = document.getElementById("assetProtectionNotice");

  if (!notice) {
    notice = document.createElement("div");
    notice.id = "assetProtectionNotice";
    notice.className = "asset-protection-notice";
    notice.setAttribute("role", "status");
    notice.setAttribute("aria-live", "polite");
    document.body.appendChild(notice);
  }

  return notice;
}

function showAssetNotice() {
  const notice = ensureAssetNotice();
  notice.textContent = ASSET_NOTICE;
  notice.classList.add("is-visible");

  clearTimeout(assetNoticeTimer);
  assetNoticeTimer = setTimeout(() => {
    notice.classList.remove("is-visible");
  }, 2400);
}

document.addEventListener("contextmenu", (event) => {
  event.preventDefault();
  showAssetNotice();
});

document.addEventListener("dragstart", (event) => {
  if (event.target.closest("img, .hero, .story-image, .published-placeholder, .category-thumb")) {
    event.preventDefault();
    showAssetNotice();
  }
});

document.addEventListener("keydown", (event) => {
  const key = event.key.toLowerCase();
  const isProtectedShortcut =
    (event.ctrlKey || event.metaKey) && ["s", "u", "p", "c"].includes(key);

  if (isProtectedShortcut || event.key === "PrintScreen") {
    event.preventDefault();
    showAssetNotice();
  }
});
