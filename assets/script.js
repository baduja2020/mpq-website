const API_URL = "https://script.google.com/macros/s/AKfycbzh51ITXyvrDz7VkzZhWV5GB4IHrV-usd38wRa49VQuEXhABwgsoNW0m9WA2ztsotS0/exec";

let hasilPencarian = [];
let searchTimer = null;
let lastKeyword = "";
let searchRequestId = 0;

const SEARCH_DELAY = 600;
const MIN_SEARCH_LENGTH = 2;

const searchCache = new Map();
const MAX_CACHE_SIZE = 30;
const ADMIN_WA_NUMBER = "6285745061987";
document.addEventListener("DOMContentLoaded", function () {
  setupSearch();
  setupModal();
  setupMenu();
  setupAutoSliders();
  setupSliderButtons();
  loadStats();
  loadPengumuman();
  setupRekomPage();
});

/* MENU */
function setupMenu() {
  const menuToggle = document.getElementById("menuToggle");
  const mainNav = document.getElementById("mainNav");

  if (!menuToggle || !mainNav) return;

  menuToggle.addEventListener("click", function () {
    mainNav.classList.toggle("show");
  });

  mainNav.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", function () {
      mainNav.classList.remove("show");
    });
  });
}
function getSearchCacheKey(keyword) {
  return String(keyword || "").trim().toLowerCase();
}

function saveSearchCache(keyword, data) {
  const key = getSearchCacheKey(keyword);

  if (!key) return;

  if (searchCache.size >= MAX_CACHE_SIZE) {
    const firstKey = searchCache.keys().next().value;
    searchCache.delete(firstKey);
  }

  searchCache.set(key, data);
}

function getSearchCache(keyword) {
  const key = getSearchCacheKey(keyword);

  if (!key) return null;

  return searchCache.has(key) ? searchCache.get(key) : null;
}
/* SEARCH */
function setupSearch() {
  const button = document.getElementById("searchButton");
  const input = document.getElementById("searchInput");
  const result = document.getElementById("result");

  if (!input) return;

  const searchBox = input.closest(".search-box");

  if (searchBox && !document.getElementById("clearSearchButton")) {
    const wrapper = document.createElement("div");
    wrapper.className = "search-input-wrap";

    input.parentNode.insertBefore(wrapper, input);
    wrapper.appendChild(input);

    const clearButton = document.createElement("button");
    clearButton.type = "button";
    clearButton.id = "clearSearchButton";
    clearButton.className = "search-clear-btn";
    clearButton.innerHTML = `<i class="ri-close-line"></i>`;
    clearButton.setAttribute("aria-label", "Hapus pencarian");

    wrapper.appendChild(clearButton);

    clearButton.addEventListener("click", function () {
      input.value = "";
      hasilPencarian = [];
      lastKeyword = "";
      clearTimeout(searchTimer);

      if (result) {
        result.innerHTML = "";
        result.style.display = "none";
      }

      clearButton.classList.remove("show");
      input.focus();
    });
  }

  const clearButton = document.getElementById("clearSearchButton");

  if (button) {
    button.addEventListener("click", function () {
      clearTimeout(searchTimer);
      cekSantri(true);
    });
  }

  input.addEventListener("input", function () {
    const keyword = input.value.trim();

    clearTimeout(searchTimer);

    if (clearButton) {
      clearButton.classList.toggle("show", keyword.length > 0);
    }

    if (!result) return;

    if (!keyword) {
      hasilPencarian = [];
      lastKeyword = "";
      result.innerHTML = "";
      result.style.display = "none";
      return;
    }

    if (keyword.length < MIN_SEARCH_LENGTH) {
      hasilPencarian = [];
      result.style.display = "block";
      result.innerHTML = `
        <div class="empty-state">
          Ketik minimal ${MIN_SEARCH_LENGTH} huruf untuk mencari santri.
        </div>
      `;
      return;
    }

    searchTimer = setTimeout(() => {
      cekSantri(false);
    }, SEARCH_DELAY);
  });

  input.addEventListener("keydown", function (event) {
    if (event.key === "Enter") {
      event.preventDefault();
      clearTimeout(searchTimer);
      cekSantri(true);
    }
  });
}
async function cekSantri(force = false) {
  const input = document.getElementById("searchInput");
  const result = document.getElementById("result");

  if (!input || !result) return;

  const keyword = input.value.trim();

  result.style.display = "block";

  if (!keyword) {
    hasilPencarian = [];
    lastKeyword = "";
    result.innerHTML = `<div class="empty-state">Masukkan kata pencarian terlebih dahulu.</div>`;
    return;
  }

  if (!force && keyword.length < MIN_SEARCH_LENGTH) {
    result.innerHTML = `
      <div class="empty-state">
        Ketik minimal ${MIN_SEARCH_LENGTH} huruf untuk mencari santri.
      </div>
    `;
    return;
  }

  if (!force && keyword === lastKeyword) return;

 lastKeyword = keyword;

const cachedResult = getSearchCache(keyword);

if (cachedResult) {
  hasilPencarian = cachedResult;
  tampilkanDaftar();
  scrollToSearchResultMobile();
  return;
}

const currentRequestId = ++searchRequestId;

result.innerHTML = renderSearchSkeleton();

  try {
    const response = await fetch(`${API_URL}?q=${encodeURIComponent(keyword)}`);
    const json = await response.json();

    if (currentRequestId !== searchRequestId) return;

    const latestKeyword = input.value.trim();

    if (latestKeyword !== keyword) return;

  if (!json.success || !json.data || json.data.length === 0) {
  hasilPencarian = [];
result.innerHTML = renderEmptySearchState(keyword);
scrollToSearchResultMobile();
return;
}

    hasilPencarian = json.data;
saveSearchCache(keyword, json.data);
tampilkanDaftar();
scrollToSearchResultMobile();
  } catch (error) {
    if (currentRequestId !== searchRequestId) return;

    result.innerHTML = `
      <div class="empty-state">
        Gagal mengambil data. Silakan coba kembali.
      </div>
    `;
  }
}
function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function normalizeSearchText(value) {
  return String(value || "")
    .toUpperCase()
    .replace(/\s+/g, " ")
    .trim();
}

function highlightText(value, keyword, mode = "word") {
  const rawText = String(value || "");
  const safeText = escapeHtml(rawText);
  const cleanKeyword = normalizeSearchText(keyword);
  const cleanText = normalizeSearchText(rawText);

  if (!cleanKeyword || !cleanText) return safeText;

  // Khusus field pendek seperti KELAS dan ADNA:
  // kalau field cocok dengan query, highlight satu field penuh
  if (mode === "field") {
    const keywordParts = cleanKeyword.split(" ").filter(Boolean);
    const allPartsMatch = keywordParts.every(part => cleanText.includes(part));

    if (cleanText.includes(cleanKeyword) || allPartsMatch) {
      return `<mark class="search-highlight">${safeText}</mark>`;
    }

    return safeText;
  }

  // Untuk nama: highlight kata yang panjangnya minimal 2 huruf
  const terms = cleanKeyword
    .split(/\s+/)
    .filter(term => term.length >= 2)
    .map(escapeRegExp);

  if (terms.length === 0) return safeText;

  const regex = new RegExp(`(${terms.join("|")})`, "gi");

  return safeText.replace(regex, `<mark class="search-highlight">$1</mark>`);
}
function tampilkanDaftar() {
  const result = document.getElementById("result");
  const input = document.getElementById("searchInput");

  if (!result) return;

  const keyword = input ? input.value.trim() : "";
  const isLimited = hasilPencarian.length >= 30;

  result.innerHTML = `
    <div class="search-header search-header-pro">
      <strong>Ditemukan ${hasilPencarian.length} santri</strong>
      ${
        isLimited
          ? `<small>Menampilkan maksimal 30 hasil. Perjelas pencarian agar lebih akurat.</small>`
          : `<small>Ketuk salah satu data untuk melihat detail.</small>`
      }
    </div>

    ${hasilPencarian.map((s, index) => {
      const indicatorTone = getRekomIndicatorTone(s);

      return `
      <div class="search-card ${indicatorTone ? "has-rekom-indicator" : ""}" onclick="showDetail(${index})">
        ${renderRekomIndicator(s)}

        <div class="search-card-top">
          <div class="search-name">
            ${highlightText(s.nama || "-", keyword, "word")}
          </div>

          <button 
            class="search-detail-btn" 
            type="button"
            onclick="event.stopPropagation(); showDetail(${index})"
          >
            Lihat Detail
            <i class="ri-arrow-right-s-line"></i>
          </button>
        </div>

        <div class="search-meta">
          <span>
            <i class="ri-school-line"></i>
            ${highlightText(s.kelas || "-", keyword, "field")}
          </span>

          <span>
            <i class="ri-bookmark-line"></i>
            ${highlightText(s.adna || "-", keyword, "field")}
          </span>

          <span>
            <i class="ri-home-4-line"></i>
            ${escapeHtml(s.kamar || "-")}
          </span>
        </div>
      </div>
    `;
    }).join("")}
  `;
}

function renderSearchSkeleton() {
  return `
    <div class="search-skeleton-wrap">
      ${Array.from({ length: 3 }).map(() => `
        <div class="search-skeleton-card">
          <div class="skeleton-line skeleton-name"></div>

          <div class="skeleton-meta-row">
            <div class="skeleton-line skeleton-small"></div>
            <div class="skeleton-line skeleton-small"></div>
          </div>

          <div class="skeleton-meta-row">
            <div class="skeleton-line skeleton-small"></div>
            <div class="skeleton-line skeleton-small"></div>
          </div>
        </div>
      `).join("")}
    </div>
  `;
}
function scrollToSearchResultMobile() {
  if (window.innerWidth > 600) return;

  const result = document.getElementById("result");
  if (!result) return;

  setTimeout(() => {
    result.scrollIntoView({
      behavior: "smooth",
      block: "start"
    });
  }, 180);
}

function renderEmptySearchState(keyword = "") {
  return `
    <div class="search-empty-card">
      <div class="search-empty-icon">
        <i class="ri-search-eye-line"></i>
      </div>

      <h3>Data tidak ditemukan</h3>

      <p>
        Tidak ada santri yang cocok dengan pencarian
        <strong>${escapeHtml(keyword)}</strong>.
      </p>

      <div class="search-empty-tips">
        <span>Coba cari dengan:</span>

        <div>
          <small>Nama santri</small>
          <small>Kelas: 3 IBT G</small>
          <small>ADNA: A 01</small>
        </div>
      </div>
    </div>
  `;
}

/* MODAL */
function setupModal() {
  const closeModal = document.getElementById("closeModal");
  const modalOverlay = document.getElementById("modalOverlay");

  if (closeModal) closeModal.addEventListener("click", closeDetailModal);

  if (modalOverlay) {
    modalOverlay.addEventListener("click", function (e) {
      if (e.target.id === "modalOverlay") closeDetailModal();
    });
  }
}

function showDetail(index) {
  const s = hasilPencarian[index];

  const modalOverlay = document.getElementById("modalOverlay");
  const modalContent = document.getElementById("modalContent");

  if (!s || !modalOverlay || !modalContent) return;

  const detailAlpaHtml = renderDetailAlpa(s);
  const hasDetailAlpa = detailAlpaHtml.trim() !== "";
  const displayStatusRekom = getDisplayStatusRekom(s);
  const displayStatusSelesai = getDisplayStatusSelesai(s);

  modalContent.innerHTML = `
    <div class="modal-profile">
      <h3 class="modal-title">${s.nama || "-"}</h3>
    </div>

    <div class="compact-detail-grid">
      <div class="compact-item">
        <span><i class="ri-id-card-line"></i> Kode</span>
        <strong>${s.kode || "-"}</strong>
      </div>

      <div class="compact-item">
        <span><i class="ri-home-4-line"></i> Kamar</span>
        <strong>${s.kamar || "-"}</strong>
      </div>

      <div class="compact-item">
        <span><i class="ri-school-line"></i> Kelas</span>
        <strong>${s.kelas || "-"}</strong>
      </div>

      <div class="compact-item">
        <span><i class="ri-bookmark-line"></i> ADNA</span>
        <strong>${s.adna || "-"}</strong>
      </div>
    </div>

    <div class="compact-section">
      <h4>Pembimbing</h4>

      <div class="compact-row">
        <span><i class="ri-user-star-line"></i> Muallim</span>
        <strong>${s.muallim || "-"}</strong>
      </div>

      <div class="compact-row">
        <span><i class="ri-building-2-line"></i> Ruang</span>
        <strong>${s.ruang || "-"}</strong>
      </div>
    </div>

 <div class="compact-section status-detail-section">
  <h4>Status & Rekom</h4>

  <div class="status-detail-row ${getStatusRowClass(s.statusSantri, "santri")}">
    <span><i class="ri-user-line"></i> Status Santri</span>
    ${badgeStatus(s.statusSantri, "santri")}
  </div>

  <div class="status-detail-row ${getStatusRowClass(displayStatusRekom, "rekom")}">
    <span><i class="ri-flag-line"></i> Tanggungan Rekom</span>
    ${badgeStatus(displayStatusRekom, "rekom")}
  </div>

  <div class="status-detail-row ${getStatusRowClass(displayStatusSelesai, "selesai")}">
    <span><i class="ri-checkbox-circle-line"></i> Status Selesai</span>
    ${badgeStatus(displayStatusSelesai, "selesai")}
  </div>

  ${
    hasDetailAlpa
      ? `
      <div class="floating-scroll-hint hidden" id="modalScrollHint">
        <i class="ri-arrow-down-line"></i>
        <span>Scroll</span>
      </div>
    `
      : ""
  }
</div>

${detailAlpaHtml}

<div class="modal-report-box">
  <button class="report-data-btn" type="button" onclick="laporkanDataSalah(${index})">
    <i class="ri-error-warning-line"></i>
    Laporkan Data Salah
  </button>
</div>
  `;

  modalOverlay.style.display = "flex";
  document.body.style.overflow = "hidden";

  setupFloatingScrollHint();

}

function laporkanDataSalah(index) {
  const s = hasilPencarian[index];

  if (!s) return;

  const pesan = `
Assalamu'alaikum admin MPQ.

Saya ingin melaporkan data santri berikut:

Nama: ${s.nama || "-"}
Kode: ${s.kode || "-"}
Kelas: ${s.kelas || "-"}
ADNA: ${s.adna || "-"}
Kamar: ${s.kamar || "-"}
Muallim: ${s.muallim || "-"}
Ruang: ${s.ruang || "-"}

Bagian data yang salah:
(Tulis di sini)

Data yang benar:
(Tulis di sini)

Terima kasih.
`.trim();

  const url = `https://wa.me/${ADMIN_WA_NUMBER}?text=${encodeURIComponent(pesan)}`;

  window.open(url, "_blank");
}

function setupFloatingScrollHint() {
  const modalCard = document.querySelector(".modal-card");
  const hint = document.getElementById("modalScrollHint");
  const detailBox = document.querySelector(".alpa-detail-box");

  if (!modalCard || !hint) return;

  const updateHint = () => {
    const canScroll = modalCard.scrollHeight > modalCard.clientHeight + 10;

    const nearBottom =
      modalCard.scrollTop + modalCard.clientHeight >=
      modalCard.scrollHeight - 30;

    const hasDetailBox = !!detailBox;

    if (!hasDetailBox || !canScroll || nearBottom) {
      hint.classList.add("hidden");
    } else {
      hint.classList.remove("hidden");
    }
  };

  modalCard.onscroll = updateHint;

  setTimeout(updateHint, 150);
}
function renderDetailAlpa(s) {
  const rincian = getEffectiveRincianTanggungan(s);

  if (rincian.length === 0) {
    return "";
  }

  return `
    <div class="alpa-detail-box">
      <button class="alpa-detail-summary" type="button" onclick="toggleAlpaDetail(this)">
        <div class="alpa-summary-left">
          <div class="alpa-summary-icon">
            <i class="ri-file-list-3-line"></i>
          </div>

          <div class="alpa-summary-text">
            <h4>Detail Alpa & Tanggungan</h4>
            <p>Ringkasan alpa dan status rekom</p>
          </div>
        </div>

        <span class="alpa-summary-badge">Rincian</span>
      </button>

      <div class="alpa-detail-content">
        <div class="total-alpa-box">
          <span>Total Alpa</span>
          <strong>${s.totalAlpa || 0}</strong>
        </div>

        <div class="rekom-detail-list">
          ${rincian.map(item => {
            const selesai = isPeriodMarkedDone(item.status) || isOverallSelesai(s);

            return `
              <div class="rekom-detail-item ${selesai ? "is-done" : "is-pending"}">
                <div>
                  <strong>${escapeHtml(item.label)}</strong>
                  <span>Alpa: ${escapeHtml(item.alpa)}</span>
                </div>

                <em>${selesai ? "Selesai" : "Belum"}</em>
              </div>
            `;
          }).join("")}
        </div>
      </div>
    </div>
  `;
}

function toggleAlpaDetail(button) {
  const box = button.closest(".alpa-detail-box");
  if (!box) return;

  const content = box.querySelector(".alpa-detail-content");
  const badge = box.querySelector(".alpa-summary-badge");
  const modalCard = button.closest(".modal-card");

  if (!content) return;

  const isOpen = box.classList.contains("open");
  const duration = 450;

  if (isOpen) {
    content.style.maxHeight = content.scrollHeight + "px";

    requestAnimationFrame(() => {
      content.style.maxHeight = "0px";
    });

    if (badge) badge.textContent = "Rincian";

    setTimeout(() => {
      box.classList.remove("open");
    }, duration);

    return;
  }

  content.style.maxHeight = "0px";
  box.classList.add("open");

  requestAnimationFrame(() => {
    content.style.maxHeight = content.scrollHeight + "px";
  });

  if (badge) badge.textContent = "Tutup";

  if (modalCard && window.innerWidth <= 600) {
    setTimeout(() => {
      modalCard.scrollTo({
        top: box.offsetTop + 240,
        behavior: "smooth"
      });
    }, 220);
  }
}

function closeDetailModal() {
  const modalOverlay = document.getElementById("modalOverlay");

  if (modalOverlay) modalOverlay.style.display = "none";

  document.body.style.overflow = "";
}

function statusTone(value, context = "default") {
  const raw = String(value || "-").trim().toUpperCase();
  const norm = normalizeSearchText(raw).toLowerCase();

  const isEmpty = !norm || norm === "-";
  const isNoRekom = norm === "tidak rekom" || norm === "tidak ada rekom";
  const isInactive = ["pindah", "boyong", "nonaktif"].includes(norm);
  const hasBelum = norm.includes("belum") || raw === "B";
  const hasSelesai = (raw === "S" || norm === "s" || norm.includes("selesai")) && !hasBelum && !norm.includes("tidak");
  const isAttention = norm.includes("perlu") || norm.includes("ralat") || norm.includes("cek");
  const isRekomAktif = norm.includes("r1") || norm.includes("r2") || norm.includes("r3") || norm.includes("r4") || norm.includes("rekom") || norm.includes("penertiban");

  if (isEmpty || isNoRekom || isInactive) return "neutral";
  if (context === "selesai") {
    if (hasSelesai) return "success";
    if (hasBelum) return "warning";
    return "neutral";
  }

  if (raw === "AKTIF" || hasSelesai) return "success";
  if (isAttention) return "danger";
  if (hasBelum || isRekomAktif) return "warning";

  return "neutral";
}

function statusToneToBadgeClass(tone) {
  if (tone === "success") return "badge-green";
  if (tone === "warning") return "badge-yellow";
  if (tone === "danger") return "badge-red";
  return "badge-gray";
}

function getStatusRowClass(value, context = "default") {
  return `status-row-${statusTone(value, context)}`;
}

function badgeStatus(value, context = "default") {
  const text = String(value || "-").trim().toUpperCase();
  const color = statusToneToBadgeClass(statusTone(text, context));
  return `<strong class="status-badge ${color}">${text}</strong>`;
}

function toIndicatorNumber(value) {
  const parsed = Number(String(value ?? "0").replace(",", "."));
  return Number.isFinite(parsed) ? parsed : 0;
}

function hasAnyRekomDetail(item = {}) {
  return getEffectiveRincianTanggungan(item).length > 0 || getEffectiveRekomPeriods(item).length > 0;
}

function getRekomIndicatorTone(item = {}) {
  if (!hasAnyRekomDetail(item)) return "";
  if (getDisplayStatusSelesai(item) === "SELESAI") return "done";
  if (getDisplayStatusSelesai(item) === "BELUM") return "active";

  return "active";
}

function renderRekomIndicator(item = {}) {
  const tone = getRekomIndicatorTone(item);
  if (!tone) return "";

  const label = tone === "done" ? "Rekom selesai" : "Masih rekom";
  return `<span class="rekom-indicator-dot ${tone}" title="${label}" aria-label="${label}"></span>`;
}
function animateCounter(element, endValue, duration = 1600) {
  if (!element) return;

  const finalValue = Number(endValue) || 0;
  const startValue = 0;
  const startTime = performance.now();

  function updateCounter(currentTime) {
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);

    // animasi halus
    const easeOut = 1 - Math.pow(1 - progress, 3);
    const currentValue = Math.floor(
      startValue + (finalValue - startValue) * easeOut
    );

    element.textContent = currentValue;

    if (progress < 1) {
      requestAnimationFrame(updateCounter);
    } else {
      element.textContent = finalValue;
    }
  }

  requestAnimationFrame(updateCounter);
}
/* STATS */
async function loadStats() {
  const statSantri = document.getElementById("statSantri");
  const statMuallim = document.getElementById("statMuallim");
  const statRuang = document.getElementById("statRuang");
  const statRekom = document.getElementById("statRekom");

  const statPindah = document.getElementById("statPindah");
  const statBoyong = document.getElementById("statBoyong");
  const statNonaktif = document.getElementById("statNonaktif");

  const heroSantri = document.getElementById("heroSantri");
  const heroMuallim = document.getElementById("heroMuallim");
  const heroRekom = document.getElementById("heroRekom");

  if (!statSantri && !heroSantri) return;

  try {
    const response = await fetch(`${API_URL}?mode=stats`);
    const data = await response.json();

    if (!data.success) return;

    animateCounter(statSantri, data.santriAktif);
    animateCounter(statMuallim, data.totalMuallim);
    animateCounter(statRuang, data.totalRuang);
    animateCounter(statRekom, data.rekomAktif);

    animateCounter(heroSantri, data.santriAktif);
    animateCounter(heroMuallim, data.totalMuallim);
    animateCounter(heroRekom, data.rekomAktif);

    animateCounter(statPindah, data.santriPindah);
    animateCounter(statBoyong, data.santriBoyong);
    animateCounter(statNonaktif, data.santriNonaktif);

  } catch (error) {
    console.log("Gagal load statistik");
  }
}
/* PENGUMUMAN */
async function loadPengumuman() {
  const container = document.getElementById("pengumumanList");

  if (!container) return;

  try {
    const response = await fetch(`${API_URL}?mode=pengumuman`);
    const json = await response.json();

   if (!json.success || !json.data || json.data.length === 0) {
  container.innerHTML = renderPengumumanKosong();
  return;
}

    container.innerHTML = json.data.map(item => `
      <article class="announcement-card">
        <i class="ri-megaphone-line"></i>
        <small>${formatTanggal(item.tanggal)}</small>
        <h3>${item.judul}</h3>
        <p>${item.isi}</p>
      </article>
    `).join("");
  } catch (error) {
    container.innerHTML = `<div class="empty-state">Gagal memuat pengumuman.</div>`;
  }
}
function renderPengumumanKosong() {
  return `
    <div class="announcement-empty-card">
      <div class="announcement-empty-icon">
        <i class="ri-megaphone-line"></i>
      </div>

      <h3>Belum Ada Pengumuman</h3>
      <p>
        Saat ini belum ada pengumuman dari <br>
        MPQ Al Falah.
      </p>
    </div>
  `;
}

function formatTanggal(value) {
  if (!value) return "-";

  const date = new Date(value);

  if (isNaN(date)) return value;

  return date.toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "long",
    year: "numeric"
  });
}
function setupAutoSliders() {
  const sliders = document.querySelectorAll("[data-auto-slider]");

  sliders.forEach((slider) => {
    const cards = slider.querySelectorAll(".info-card");

    if (cards.length <= 1) return;

    let timer = null;
    const delay = 4600;

    const isScrollable = () => {
      return slider.scrollWidth > slider.clientWidth + 20;
    };

    const getStep = () => {
      const firstCard = cards[0];
      const gap = parseFloat(getComputedStyle(slider).gap || 0);

      return firstCard.offsetWidth + gap;
    };

    const autoMove = () => {
      if (!isScrollable()) return;

      const maxScroll = slider.scrollWidth - slider.clientWidth;
      const currentLeft = slider.scrollLeft;
      const step = getStep();

      // Kalau posisi sekarang sudah kanan, balik ke awal
      if (currentLeft >= maxScroll - 15) {
        slider.scrollTo({
          left: 0,
          behavior: "smooth"
        });
        return;
      }

      slider.scrollTo({
        left: Math.min(currentLeft + step, maxScroll),
        behavior: "smooth"
      });
    };

    const start = () => {
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

      stop();

      if (!isScrollable()) return;

      timer = setInterval(autoMove, delay);
    };

    const stop = () => {
      if (timer) {
        clearInterval(timer);
        timer = null;
      }
    };

    slider.addEventListener("mouseenter", stop);
    slider.addEventListener("mouseleave", start);

    slider.addEventListener("touchstart", stop, { passive: true });
    slider.addEventListener("touchend", start, { passive: true });

    window.addEventListener("resize", start);

    start();
  });
}
function setupSliderButtons() {
  const sliders = document.querySelectorAll("[data-auto-slider]");

  sliders.forEach((slider) => {
    const shell = slider.closest(".slider-shell");
    const name = slider.dataset.autoSlider;

    const prevBtn = document.querySelector(`[data-slider-prev="${name}"]`);
    const nextBtn = document.querySelector(`[data-slider-next="${name}"]`);

    const isScrollable = () => {
      return slider.scrollWidth > slider.clientWidth + 20;
    };

    const updateButtonState = () => {
      if (!shell) return;

      if (!isScrollable()) {
        shell.classList.add("slider-static");
      } else {
        shell.classList.remove("slider-static");
      }
    };

    const getStep = () => {
      const card = slider.querySelector(".info-card");
      if (!card) return 320;

      const gap = parseFloat(getComputedStyle(slider).gap || 0);
      return card.offsetWidth + gap;
    };

    function next() {
      const maxScroll = slider.scrollWidth - slider.clientWidth;

      if (maxScroll <= 20) return;

      const currentLeft = slider.scrollLeft;
      const step = getStep();

      // Kalau posisi SEKARANG sudah di kanan, baru balik ke awal
      if (currentLeft >= maxScroll - 15) {
        slider.scrollTo({
          left: 0,
          behavior: "smooth"
        });
        return;
      }

      // Kalau belum mentok, geser ke kanan.
      // Kalau step terlalu besar, langsung ke posisi paling kanan.
      slider.scrollTo({
        left: Math.min(currentLeft + step, maxScroll),
        behavior: "smooth"
      });
    }

    function prev() {
      const maxScroll = slider.scrollWidth - slider.clientWidth;

      if (maxScroll <= 20) return;

      const currentLeft = slider.scrollLeft;
      const step = getStep();

      // Kalau posisi SEKARANG masih di kiri, klik kiri muter ke akhir
      if (currentLeft <= 15) {
        slider.scrollTo({
          left: maxScroll,
          behavior: "smooth"
        });
        return;
      }

      slider.scrollTo({
        left: Math.max(currentLeft - step, 0),
        behavior: "smooth"
      });
    }

    if (nextBtn) nextBtn.addEventListener("click", next);
    if (prevBtn) prevBtn.addEventListener("click", prev);

    updateButtonState();
    window.addEventListener("resize", updateButtonState);
  });
}

/* ================= REKOM PAGE ================= */
const rekomState = {
  data: [],
  filtered: [],
  loaded: false,
  openedKey: null,
  visiblePeriods: [],
  filterOpenGroup: null,
};

function setupRekomPage() {
  const app = document.getElementById("rekomApp");
  if (!app) return;

  const searchInput = document.getElementById("rekomSearchInput");
  const kelasFilter = document.getElementById("rekomKelasFilter");
  const adnaFilter = document.getElementById("rekomAdnaFilter");
  const kamarFilter = document.getElementById("rekomKamarFilter");
  const statusFilter = document.getElementById("rekomStatusFilter");
  const selesaiFilter = document.getElementById("rekomSelesaiFilter");
  const resetButton = document.getElementById("rekomResetButton");

  [searchInput, kelasFilter, adnaFilter, kamarFilter, statusFilter, selesaiFilter].forEach((el) => {
    if (!el) return;
    el.addEventListener("input", applyRekomFilters);
    el.addEventListener("change", applyRekomFilters);
  });

  if (resetButton) {
    resetButton.addEventListener("click", function () {
      if (searchInput) searchInput.value = "";
      [kelasFilter, adnaFilter, kamarFilter, statusFilter, selesaiFilter].forEach((el) => {
        if (el) el.value = "";
      });
      rekomState.openedKey = null;
      rekomState.filterOpenGroup = null;
      applyRekomFilters();
      updateRekomUrl(false);
      buildRekomFilterPanelOptions();
      syncRekomFilterPanel();
    });
  }

  loadRekomData();
}

async function loadRekomData() {
  const list = document.getElementById("rekomList");
  const summary = document.getElementById("rekomSummary");

  if (list) list.innerHTML = renderRekomSkeleton();
  if (summary) summary.textContent = "Memuat data rekom...";

  try {
    const response = await fetch(`${API_URL}?mode=rekom`);
    const json = await response.json();

    if (!json.success || !Array.isArray(json.data)) {
      throw new Error(json.message || "Data rekom tidak tersedia.");
    }

    rekomState.data = json.data
      .map(normalizeRekomRow)
      .filter((item) => normalizeSearchText(item.statusSantri) === "AKTIF");

    rekomState.loaded = true;
    populateRekomFilters(rekomState.data);
    applyRekomParamsFromUrl();
    setupRekomFilterPanel();
    applyRekomFilters();
    syncRekomFilterPanel();
  } catch (error) {
    if (summary) summary.textContent = "Gagal memuat data rekom.";
    if (list) {
      list.innerHTML = `
        <div class="rekom-empty-card">
          <i class="ri-error-warning-line"></i>
          <h3>Data rekom belum bisa dimuat</h3>
          <p>
            Pastikan Apps Script website sudah mendukung <strong>mode=rekom</strong>
            dan sheet <strong>DATA_REKOM_AKTIF</strong> tersedia.
          </p>
        </div>
      `;
    }
  }
}

function normalizeRekomRow(row = {}) {
  const get = (...keys) => {
    for (const key of keys) {
      if (row[key] !== undefined && row[key] !== null && String(row[key]).trim() !== "") {
        return String(row[key]).trim();
      }
    }
    return "";
  };

  const num = (...keys) => {
    const value = get(...keys);
    const parsed = Number(String(value || "0").replace(",", "."));
    return Number.isFinite(parsed) ? parsed : 0;
  };

  return {
    kode: get("kode", "KODE"),
    nama: get("nama", "NAMA"),
    kamar: get("kamar", "KAMAR"),
    kelas: get("kelas", "KELAS"),
    adna: get("adna", "ADNA"),
    alpaPenertiban: num("alpaPenertiban", "ALPA !!!", "ALPA_!!!", "PENERTIBAN"),
    sPenertiban: get("sPenertiban", "S !!!", "S_!!!", "S PENERTIBAN"),
    alpa1: num("alpa1", "ALPA 1", "ALPA_1"),
    s1: get("s1", "S 1", "S_1"),
    alpa2: num("alpa2", "ALPA 2", "ALPA_2"),
    s2: get("s2", "S 2", "S_2"),
    alpa3: num("alpa3", "ALPA 3", "ALPA_3"),
    s3: get("s3", "S 3", "S_3"),
    alpa4: num("alpa4", "ALPA 4", "ALPA_4"),
    s4: get("s4", "S 4", "S_4"),
    totalAlpa: num("totalAlpa", "TOTAL ALPA", "TOTAL_ALPA"),
    statusRekom: get("statusRekom", "STATUS REKOM", "STATUS_REKOM") || "TIDAK REKOM",
    statusSelesai: get("statusSelesai", "STATUS SELESAI", "STATUS_SELESAI"),
    statusSantri: get("statusSantri", "STATUS SANTRI", "STATUS_SANTRI") || "AKTIF",
    keterangan: get("keterangan", "KETERANGAN", "KET"),
  };
}

function populateRekomFilters(data) {
  fillSelect("rekomKelasFilter", uniqueSorted(data.map((item) => item.kelas)), "Semua Kelas");
  fillSelect("rekomAdnaFilter", uniqueSorted(data.map((item) => item.adna)), "Semua ADNA");
  fillSelect("rekomKamarFilter", uniqueSorted(data.map((item) => item.kamar)), "Semua Kamar");
  fillSelect("rekomStatusFilter", uniqueSorted(data.map((item) => getDisplayStatusRekom(item))), "Semua");
  fillSelect("rekomSelesaiFilter", uniqueSorted(data.map((item) => getDisplayStatusSelesai(item))), "Semua");
}

function fillSelect(id, items, defaultText) {
  const select = document.getElementById(id);
  if (!select) return;

  const current = select.value;
  select.innerHTML = `<option value="">${defaultText}</option>` +
    items.map((item) => `<option value="${escapeHtml(item)}">${escapeHtml(item)}</option>`).join("");

  if (items.includes(current)) select.value = current;
}

function uniqueSorted(items) {
  return [...new Set(items.map((item) => String(item || "").trim()).filter(Boolean))]
    .sort((a, b) => a.localeCompare(b, "id-ID", { numeric: true }));
}

const REKOM_FILTER_FIELDS = [
  { id: "rekomKelasFilter", label: "Kelas", short: "Kelas", icon: "ri-school-line", placeholder: "Cari kelas...", searchable: true },
  { id: "rekomKamarFilter", label: "Kamar", short: "Kamar", icon: "ri-home-4-line", placeholder: "Cari kamar...", searchable: true },
  { id: "rekomAdnaFilter", label: "ADNA", short: "ADNA", icon: "ri-book-open-line", placeholder: "Cari ADNA...", searchable: true },
  { id: "rekomStatusFilter", label: "Status Rekom", short: "Status", icon: "ri-flag-line", searchable: false },
  { id: "rekomSelesaiFilter", label: "Status Selesai", short: "Selesai", icon: "ri-checkbox-circle-line", searchable: false },
];

function setupRekomFilterPanel() {
  const toolbar = document.querySelector(".rekom-toolbar");
  if (!toolbar) return;

  let trigger = document.getElementById("rekomMobileFilterButton");
  if (!trigger) {
    trigger = document.createElement("button");
    trigger.id = "rekomMobileFilterButton";
    trigger.className = "rekom-mobile-filter-btn";
    trigger.type = "button";
    trigger.setAttribute("aria-haspopup", "dialog");
    trigger.setAttribute("aria-controls", "rekomFilterSheet");
    trigger.innerHTML = `
      <i class="ri-equalizer-2-line"></i>
      <span>Filter</span>
      <em id="rekomMobileFilterCount">0</em>
    `;

    const searchInput = document.getElementById("rekomSearchInput");
    if (searchInput && searchInput.nextSibling) {
      toolbar.insertBefore(trigger, searchInput.nextSibling);
    } else {
      toolbar.appendChild(trigger);
    }
  }

  let sheet = document.getElementById("rekomFilterSheet");
  if (!sheet) {
    sheet = document.createElement("section");
    sheet.id = "rekomFilterSheet";
    sheet.className = "rekom-filter-sheet";
    sheet.setAttribute("aria-hidden", "true");
    sheet.innerHTML = `
      <div class="rekom-filter-backdrop" data-rekom-filter-close></div>
      <div class="rekom-filter-panel" role="dialog" aria-modal="true" aria-label="Filter data rekom">
        <div class="rekom-filter-handle"></div>
        <div class="rekom-filter-head">
          <div>
            <strong>Filter Data</strong>
            <span>Buka kategori, cari pilihan, lalu terapkan</span>
          </div>
          <button type="button" class="rekom-filter-close" data-rekom-filter-close aria-label="Tutup filter">
            <i class="ri-close-line"></i>
          </button>
        </div>
        <div class="rekom-filter-body" id="rekomFilterBody"></div>
        <div class="rekom-filter-actions">
          <button type="button" class="rekom-filter-reset" id="rekomFilterSheetReset">Reset</button>
          <button type="button" class="rekom-filter-apply" data-rekom-filter-close>Terapkan</button>
        </div>
      </div>
    `;
    document.body.appendChild(sheet);

    sheet.addEventListener("click", function (event) {
      if (event.target.closest("[data-rekom-filter-close]")) {
        closeRekomFilterPanel();
      }
    });
  }

  trigger.onclick = openRekomFilterPanel;

  const sheetReset = document.getElementById("rekomFilterSheetReset");
  if (sheetReset) {
    sheetReset.onclick = function () {
      const searchInput = document.getElementById("rekomSearchInput");
      if (searchInput) searchInput.value = "";
      REKOM_FILTER_FIELDS.forEach((field) => {
        const select = document.getElementById(field.id);
        if (select) select.value = "";
      });
      rekomState.openedKey = null;
      rekomState.filterOpenGroup = null;
      applyRekomFilters();
      updateRekomUrl(false);
      buildRekomFilterPanelOptions();
      syncRekomFilterPanel();
    };
  }

  buildRekomFilterPanelOptions();
  syncRekomFilterPanel();
}

function openRekomFilterPanel() {
  buildRekomFilterPanelOptions();
  syncRekomFilterPanel();

  const sheet = document.getElementById("rekomFilterSheet");
  if (!sheet) return;

  sheet.classList.add("show");
  sheet.setAttribute("aria-hidden", "false");
  document.body.classList.add("rekom-filter-is-open");
}

function closeRekomFilterPanel() {
  const sheet = document.getElementById("rekomFilterSheet");
  if (!sheet) return;

  sheet.classList.remove("show");
  sheet.setAttribute("aria-hidden", "true");
  document.body.classList.remove("rekom-filter-is-open");
}

function buildRekomFilterPanelOptions() {
  const body = document.getElementById("rekomFilterBody");
  if (!body) return;

  body.innerHTML = REKOM_FILTER_FIELDS.map((field) => {
    const select = document.getElementById(field.id);
    if (!select) return "";

    const selectedOption = select.options[select.selectedIndex];
    const selectedLabel = selectedOption ? selectedOption.textContent : "Semua";
    const hasValue = !!select.value;
    const isOpen = rekomState.filterOpenGroup === field.id;

    const buttons = Array.from(select.options).map((option) => {
      const value = option.value || "";
      const label = option.textContent || "Semua";
      const labelKey = normalizeSearchText(label);
      return `
        <button type="button" class="rekom-filter-option" data-filter-target="${field.id}" data-filter-value="${escapeHtml(value)}" data-filter-label="${escapeHtml(labelKey)}">
          <span>${escapeHtml(label)}</span>
          <i class="ri-check-line"></i>
        </button>
      `;
    }).join("");

    return `
      <div class="rekom-filter-group ${isOpen ? "open" : ""} ${hasValue ? "has-value" : ""} ${field.searchable ? "is-searchable" : "no-search"}" data-filter-group="${field.id}">
        <button type="button" class="rekom-filter-group-toggle" data-filter-toggle="${field.id}" aria-expanded="${isOpen ? "true" : "false"}">
          <span class="rekom-filter-category-icon"><i class="${field.icon}"></i></span>
          <span class="rekom-filter-category-text">
            <strong>${field.label}</strong>
            <em>${escapeHtml(selectedLabel || "Semua")}</em>
          </span>
          <span class="rekom-filter-category-arrow"><i class="ri-arrow-down-s-line"></i></span>
        </button>
        <div class="rekom-filter-group-panel">
          ${field.searchable ? `
          <label class="rekom-filter-search">
            <i class="ri-search-line"></i>
            <input type="search" inputmode="search" placeholder="${escapeHtml(field.placeholder || `Cari ${field.label}...`)}" data-filter-search="${field.id}">
          </label>` : ""}
          <div class="rekom-filter-options">
            ${buttons}
          </div>
          <p class="rekom-filter-empty">Tidak ada pilihan yang cocok.</p>
        </div>
      </div>
    `;
  }).join("");

  body.querySelectorAll(".rekom-filter-group-toggle").forEach((button) => {
    button.addEventListener("click", function () {
      const targetId = this.dataset.filterToggle;
      rekomState.filterOpenGroup = rekomState.filterOpenGroup === targetId ? null : targetId;
      buildRekomFilterPanelOptions();
      syncRekomFilterPanel();
      const field = REKOM_FILTER_FIELDS.find((item) => item.id === targetId);
      const activeInput = document.querySelector(`.rekom-filter-search input[data-filter-search="${targetId}"]`);
      if (field?.searchable && activeInput && rekomState.filterOpenGroup === targetId) {
        setTimeout(() => activeInput.focus({ preventScroll: true }), 60);
      }
    });
  });

  body.querySelectorAll(".rekom-filter-search input").forEach((input) => {
    input.addEventListener("input", function () {
      const group = this.closest(".rekom-filter-group");
      if (!group) return;

      const keyword = normalizeSearchText(this.value || "");
      let visibleCount = 0;

      group.querySelectorAll(".rekom-filter-option").forEach((button) => {
        const label = button.dataset.filterLabel || normalizeSearchText(button.textContent || "");
        const isVisible = !keyword || label.includes(keyword);
        button.classList.toggle("is-hidden", !isVisible);
        if (isVisible) visibleCount += 1;
      });

      const empty = group.querySelector(".rekom-filter-empty");
      if (empty) empty.classList.toggle("show", visibleCount === 0);
    });
  });

  body.querySelectorAll(".rekom-filter-option").forEach((button) => {
    button.addEventListener("click", function () {
      const targetId = this.dataset.filterTarget;
      const value = this.dataset.filterValue || "";
      const select = document.getElementById(targetId);
      if (!select) return;

      select.value = value;
      rekomState.openedKey = null;
      applyRekomFilters();
      buildRekomFilterPanelOptions();
      syncRekomFilterPanel();
    });
  });
}

function syncRekomFilterPanel() {
  const countEl = document.getElementById("rekomMobileFilterCount");
  const activeFilters = REKOM_FILTER_FIELDS.filter((field) => {
    const select = document.getElementById(field.id);
    return select && select.value;
  });

  if (countEl) {
    countEl.textContent = String(activeFilters.length);
    countEl.classList.toggle("active", activeFilters.length > 0);
  }

  const trigger = document.getElementById("rekomMobileFilterButton");
  if (trigger) {
    trigger.classList.toggle("has-active", activeFilters.length > 0);
    trigger.setAttribute("aria-label", activeFilters.length ? `${activeFilters.length} filter aktif` : "Buka filter data rekom");
  }

  document.querySelectorAll(".rekom-filter-option").forEach((button) => {
    const targetId = button.dataset.filterTarget;
    const value = button.dataset.filterValue || "";
    const select = document.getElementById(targetId);
    button.classList.toggle("active", !!select && select.value === value);
  });
}

function applyRekomParamsFromUrl() {
  const params = new URLSearchParams(window.location.search);
  const setValue = (id, key) => {
    const el = document.getElementById(id);
    const value = params.get(key);
    if (el && value) el.value = value;
  };

  setValue("rekomSearchInput", "q");
  setValue("rekomKelasFilter", "kelas");
  setValue("rekomAdnaFilter", "adna");
  setValue("rekomKamarFilter", "kamar");
  setValue("rekomStatusFilter", "status");
  setValue("rekomSelesaiFilter", "selesai");
}

function updateRekomUrl(push = true) {
  const params = new URLSearchParams();
  const add = (key, id) => {
    const el = document.getElementById(id);
    if (el && el.value) params.set(key, el.value);
  };

  add("q", "rekomSearchInput");
  add("kelas", "rekomKelasFilter");
  add("adna", "rekomAdnaFilter");
  add("kamar", "rekomKamarFilter");
  add("status", "rekomStatusFilter");
  add("selesai", "rekomSelesaiFilter");

  const nextUrl = `${window.location.pathname}${params.toString() ? `?${params.toString()}` : ""}`;
  if (push) window.history.replaceState({}, "", nextUrl);
}

function applyRekomFilters() {
  if (!rekomState.loaded) return;

  const keyword = normalizeSearchText(document.getElementById("rekomSearchInput")?.value || "");
  const kelas = normalizeSearchText(document.getElementById("rekomKelasFilter")?.value || "");
  const adna = normalizeSearchText(document.getElementById("rekomAdnaFilter")?.value || "");
  const kamar = normalizeSearchText(document.getElementById("rekomKamarFilter")?.value || "");
  const status = normalizeSearchText(document.getElementById("rekomStatusFilter")?.value || "");
  const selesai = normalizeSearchText(document.getElementById("rekomSelesaiFilter")?.value || "");

  rekomState.filtered = rekomState.data.filter((item) => {
    const searchable = normalizeSearchText([
      item.kode,
      item.nama,
      item.kelas,
      item.kamar,
      item.adna,
    ].join(" "));

    if (keyword && !searchable.includes(keyword)) return false;
    if (kelas && normalizeSearchText(item.kelas) !== kelas) return false;
    if (adna && normalizeSearchText(item.adna) !== adna) return false;
    if (kamar && normalizeSearchText(item.kamar) !== kamar) return false;
    if (status && normalizeSearchText(getDisplayStatusRekom(item)) !== status) return false;
    if (selesai && normalizeSearchText(getDisplayStatusSelesai(item)) !== selesai) return false;
    return true;
  });

  rekomState.visiblePeriods = getVisibleRekomPeriods(rekomState.filtered);

  renderRekomList();
  updateRekomSummary();
  syncRekomFilterPanel();
  updateRekomUrl();
}

function updateRekomSummary() {
  const summary = document.getElementById("rekomSummary");
  if (!summary) return;

  const total = rekomState.filtered.length;

  /*
    Ringkasan harus mengikuti status akhir dari sheet, bukan sekadar ada angka alpa.
    Sebab ada santri yang punya catatan/alpa lama tetapi status akhirnya TIDAK REKOM.
    Kalau dihitung dari angka alpa, jumlah "Belum" bisa membengkak.
  */
  const selesai = rekomState.filtered.filter((item) => getDisplayStatusSelesai(item) === "SELESAI").length;
  const belum = rekomState.filtered.filter((item) => getDisplayStatusSelesai(item) === "BELUM").length;

  summary.innerHTML = `
    <div class="rekom-summary-card total">
      <span>Menampilkan</span>
      <strong>${total}</strong>
      <em>santri aktif</em>
    </div>
    <div class="rekom-summary-card done">
      <span>Selesai</span>
      <strong>${selesai}</strong>
      <em>rekom tuntas</em>
    </div>
    <div class="rekom-summary-card pending">
      <span>Belum</span>
      <strong>${belum}</strong>
      <em>rekom belum</em>
    </div>
  `;
}


const REKOM_PERIODS = [
  { label: "Penertiban", code: "PENERTIBAN", alpaKey: "alpaPenertiban", statusKey: "sPenertiban", batas: 3, aliases: ["PENERTIBAN"] },
  { label: "Rekom 1", code: "R1", alpaKey: "alpa1", statusKey: "s1", batas: 5, aliases: ["R1", "REKOM 1"] },
  { label: "Rekom 2", code: "R2", alpaKey: "alpa2", statusKey: "s2", batas: 5, aliases: ["R2", "REKOM 2"] },
  { label: "Rekom 3", code: "R3", alpaKey: "alpa3", statusKey: "s3", batas: 4, aliases: ["R3", "REKOM 3"] },
  { label: "Rekom 4", code: "R4", alpaKey: "alpa4", statusKey: "s4", batas: 5, aliases: ["R4", "REKOM 4"] },
];

function toRekomNumber(value) {
  const raw = String(value ?? "").replace(",", ".").trim();
  const num = Number(raw);
  return Number.isFinite(num) ? num : 0;
}

function getItemStatusRekomText(item = {}) {
  return String(item.statusRekom || item["STATUS REKOM"] || item["STATUS_REKOM"] || "").trim();
}

function isNoRekomItem(item = {}) {
  return isNoRekomStatus(getItemStatusRekomText(item)) || isNoRekomStatus(getOverallSelesaiText(item));
}

function getRekomPeriodByLabel(label = "") {
  const norm = normalizeSearchText(label);
  return REKOM_PERIODS.find((period) => {
    if (norm === normalizeSearchText(period.label) || norm === normalizeSearchText(period.code)) return true;
    return period.aliases.some((alias) => norm.includes(normalizeSearchText(alias)));
  });
}

function statusMentionsPeriod(item = {}, period) {
  const statusNorm = normalizeSearchText(getItemStatusRekomText(item));
  if (!statusNorm || isNoRekomStatus(statusNorm)) return false;
  return period.aliases.some((alias) => statusNorm.includes(normalizeSearchText(alias)));
}

function isEffectiveRekomPeriod(item, period) {
  if (!period || isNoRekomItem(item)) return false;

  const alpa = toRekomNumber(item?.[period.alpaKey]);
  const status = item?.[period.statusKey] || "";

  return alpa >= period.batas || statusMentionsPeriod(item, period);
}

function hasRekomPeriodData(item, period) {
  return isEffectiveRekomPeriod(item, period);
}

function getEffectiveRekomPeriods(item = {}) {
  return REKOM_PERIODS.filter((period) => isEffectiveRekomPeriod(item, period));
}

function getEffectiveRincianTanggungan(item = {}) {
  const rincian = Array.isArray(item.rincianTanggungan) ? item.rincianTanggungan : [];
  if (isNoRekomItem(item)) return [];

  return rincian.filter((row) => {
    const label = String(row?.label || "").trim();
    const alpa = toRekomNumber(row?.alpa);
    if (!label) return false;

    const period = getRekomPeriodByLabel(label);
    if (!period) return alpa > 0;

    return alpa >= period.batas || statusMentionsPeriod(item, period);
  });
}

function isItemPeriodDone(item = {}, period) {
  if (!period) return false;
  return isPeriodMarkedDone(item?.[period.statusKey]) || (isOverallSelesai(item) && isEffectiveRekomPeriod(item, period));
}

function getActiveRekomPeriods(item = {}) {
  if (isOverallSelesai(item)) return [];
  return getEffectiveRekomPeriods(item).filter((period) => !isItemPeriodDone(item, period));
}

function getDisplayStatusRekom(item = {}) {
  const effective = getEffectiveRekomPeriods(item);
  if (effective.length === 0) return "TIDAK REKOM";
  if (isOverallSelesai(item)) return "SELESAI";

  const active = getActiveRekomPeriods(item);
  if (active.length === 0) return "SELESAI";

  return active.map((period) => period.code).join(", ");
}

function getDisplayStatusSelesai(item = {}) {
  const effective = getEffectiveRekomPeriods(item);
  if (effective.length === 0) return "TIDAK REKOM";
  if (isOverallSelesai(item)) return "SELESAI";
  if (isOverallBelum(item)) return "BELUM";
  return getActiveRekomPeriods(item).length > 0 ? "BELUM" : "SELESAI";
}

function getVisibleRekomPeriods(data = []) {
  let maxIndex = -1;

  data.forEach((item) => {
    REKOM_PERIODS.forEach((period, index) => {
      if (hasRekomPeriodData(item, period)) {
        maxIndex = Math.max(maxIndex, index);
      }
    });
  });

  /*
    Tampilan detail bersifat timeline.
    Jika Rekom 2 sudah pernah terisi pada data manapun, maka tampil:
    Penertiban, Rekom 1, Rekom 2.
    Rekom 3/4 disembunyikan sampai benar-benar ada datanya.
  */
  const minimumIndex = 1; // Penertiban + Rekom 1 sebagai tampilan minimum.
  const visibleUntil = Math.max(maxIndex, minimumIndex);

  return REKOM_PERIODS.slice(0, visibleUntil + 1);
}


function renderRekomList() {
  const list = document.getElementById("rekomList");
  if (!list) return;

  if (rekomState.filtered.length === 0) {
    list.innerHTML = `
      <div class="rekom-empty-card">
        <i class="ri-search-eye-line"></i>
        <h3>Data tidak ditemukan</h3>
        <p>Coba ubah filter kelas, ADNA, kamar, status, atau kata pencarian.</p>
      </div>
    `;
    return;
  }

  list.innerHTML = rekomState.filtered.map((item) => renderRekomCard(item)).join("");
}

function getRekomKey(item) {
  return encodeURIComponent(item.kode || item.nama || Math.random().toString(36));
}


function getItemRekomPeriods(item) {
  const effective = getEffectiveRekomPeriods(item);
  const visible = (rekomState.visiblePeriods && rekomState.visiblePeriods.length)
    ? rekomState.visiblePeriods
    : REKOM_PERIODS;
  const visibleLabels = new Set(visible.map((period) => period.label));

  return effective.filter((period) => visibleLabels.has(period.label));
}

function getStatusClass(value = "") {
  return statusTone(value, "rekom");
}

function getSelesaiClass(value = "") {
  return statusTone(value, "selesai");
}


function getOverallSelesaiText(item = {}) {
  return String(
    item.statusSelesai || item["STATUS SELESAI"] || item["STATUS_SELESAI"] || ""
  ).trim();
}

function isOverallSelesai(item = {}) {
  return statusTone(getOverallSelesaiText(item), "selesai") === "success";
}

function isOverallBelum(item = {}) {
  const raw = getOverallSelesaiText(item).toUpperCase();
  const norm = normalizeSearchText(raw).toLowerCase();

  if (!raw) return false;
  if (raw === "B" || raw === "BLM" || raw === "BELUM") return true;
  return norm.includes("belum") && !norm.includes("tidak");
}

function isNoRekomStatus(value = "") {
  const norm = normalizeSearchText(value);
  return norm === "-" || norm === "TIDAK REKOM" || norm === "TIDAK ADA REKOM";
}

function isPeriodMarkedDone(status = "") {
  const raw = String(status || "").trim().toUpperCase();
  const norm = normalizeSearchText(raw).toLowerCase();
  return raw === "S" || norm === "s" || (norm.includes("selesai") && !norm.includes("belum") && !norm.includes("tidak"));
}



function renderRekomCard(item) {
  const key = getRekomKey(item);
  const isOpen = rekomState.openedKey === key;
  const periodItems = getItemRekomPeriods(item);
  const displayStatusRekom = getDisplayStatusRekom(item);
  const displayStatusSelesai = getDisplayStatusSelesai(item);
  const statusClass = getStatusClass(displayStatusRekom);
  const selesaiClass = getSelesaiClass(displayStatusSelesai);
  const indicatorTone = getRekomIndicatorTone(item);

  const periodHtml = periodItems.length
    ? periodItems.map((period) => renderRekomPeriod(period, item)).join("")
    : `
      <div class="rekom-no-detail">
        <i class="ri-check-double-line"></i>
        <div>
          <strong>Tidak ada tanggungan rekom aktif</strong>
          <span>Santri ini belum memiliki alpa rekom pada periode yang ditampilkan.</span>
        </div>
      </div>
    `;

  return `
    <article class="rekom-row ${isOpen ? "open" : ""} ${indicatorTone ? "has-rekom-indicator" : ""}" data-rekom-key="${key}">
      <button class="rekom-row-head" type="button" onclick="toggleRekomRow('${key}')">
        ${renderRekomIndicator(item)}
        <span class="rekom-student-name">${escapeHtml(item.nama || "-")}</span>
        <span class="rekom-student-meta">
          ${escapeHtml(item.kelas || "-")} • Kamar ${escapeHtml(item.kamar || "-")} • ${escapeHtml(item.adna || "-")}
        </span>
        <i class="ri-arrow-down-s-line"></i>
      </button>

      <div class="rekom-row-detail">
        <div class="rekom-detail-title">
          <span>Detail Rekom</span>
          <small>Data yang tampil hanya sesi yang memiliki catatan rekom.</small>
        </div>

        <div class="rekom-detail-grid-mini" style="--rekom-period-count:${Math.min(Math.max(periodItems.length, 1), 3)}">
          ${periodHtml}
        </div>

        <div class="rekom-total-strip">
          <span class="info-total">Total Alpa: <strong>${escapeHtml(item.totalAlpa || "0")}</strong></span>
          <span class="info-status ${statusClass}">Status: <strong>${escapeHtml(displayStatusRekom || "-")}</strong></span>
          <span class="info-selesai ${selesaiClass}">Selesai: <strong>${escapeHtml(displayStatusSelesai || "-")}</strong></span>
        </div>

        ${item.keterangan ? `<p class="rekom-note"><strong>Keterangan:</strong> ${escapeHtml(item.keterangan)}</p>` : ""}
      </div>
    </article>
  `;
}

function renderRekomPeriod(period, item) {
  const isDone = isItemPeriodDone(item, period);
  const alpaNumber = toRekomNumber(item?.[period.alpaKey]);
  const hasAlpa = alpaNumber > 0;
  const statusText = isDone ? "Selesai" : "Belum";
  const icon = isDone ? "ri-checkbox-circle-line" : "ri-error-warning-line";

  return `
    <div class="rekom-period ${isDone ? "done" : "pending"}">
      <div class="rekom-period-top">
        <span>${escapeHtml(period.label)}</span>
        <i class="${icon}"></i>
      </div>
      <strong>${escapeHtml(String(alpaNumber))}</strong>
      <em>${hasAlpa ? statusText : "-"}</em>
    </div>
  `;
}

function toggleRekomRow(key) {
  rekomState.openedKey = rekomState.openedKey === key ? null : key;
  renderRekomList();

  if (rekomState.openedKey && window.innerWidth <= 700) {
    setTimeout(() => {
      const row = document.querySelector(`[data-rekom-key="${key}"]`);
      if (row) row.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 80);
  }
}

function renderRekomSkeleton() {
  return `
    <div class="rekom-skeleton-list">
      ${Array.from({ length: 6 }).map(() => `
        <div class="rekom-skeleton-row">
          <div class="skeleton-line skeleton-name"></div>
          <div class="skeleton-line skeleton-small"></div>
        </div>
      `).join("")}
    </div>
  `;
}
