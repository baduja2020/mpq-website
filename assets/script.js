const API_URL = "https://script.google.com/macros/s/AKfycbzh51ITXyvrDz7VkzZhWV5GB4IHrV-usd38wRa49VQuEXhABwgsoNW0m9WA2ztsotS0/exec";

let hasilPencarian = [];

document.addEventListener("DOMContentLoaded", function () {
  setupSearch();
  setupModal();
  setupMenu();
  loadStats();
  loadPengumuman();
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

/* SEARCH */
function setupSearch() {
  const button = document.getElementById("searchButton");
  const input = document.getElementById("searchInput");

  if (button) button.addEventListener("click", cekSantri);

  if (input) {
    input.addEventListener("keydown", function (event) {
      if (event.key === "Enter") cekSantri();
    });
  }
}

async function cekSantri() {
  const input = document.getElementById("searchInput");
  const result = document.getElementById("result");

  if (!input || !result) return;

  const keyword = input.value.trim();
  result.style.display = "block";

  if (!keyword) {
    result.innerHTML = `<div class="empty-state">Masukkan kata pencarian terlebih dahulu.</div>`;
    return;
  }

  result.innerHTML = `<div class="loading"><i class="ri-search-line"></i> Mencari data...</div>`;

  try {
    const response = await fetch(`${API_URL}?q=${encodeURIComponent(keyword)}`);
    const json = await response.json();

    if (!json.success || !json.data || json.data.length === 0) {
      result.innerHTML = `<div class="empty-state">Data santri tidak ditemukan.</div>`;
      return;
    }

    hasilPencarian = json.data;
    tampilkanDaftar();
  } catch (error) {
    result.innerHTML = `<div class="empty-state">Gagal mengambil data. Silakan coba kembali.</div>`;
  }
}

function tampilkanDaftar() {
  const result = document.getElementById("result");

  result.innerHTML = `
    <div class="search-header">Ditemukan ${hasilPencarian.length} santri</div>

    ${hasilPencarian.map((s, index) => `
      <div class="search-card" onclick="showDetail(${index})">
        <div class="search-name">${s.nama || "-"}</div>

        <div class="search-meta">
          <span><i class="ri-id-card-line"></i> ${s.kode || "-"}</span>
          <span><i class="ri-school-line"></i> ${s.kelas || "-"}</span>
        </div>

        <div class="search-meta">
          <span><i class="ri-bookmark-line"></i> ${s.adna || "-"}</span>
          <span><i class="ri-home-4-line"></i> ${s.kamar || "-"}</span>
        </div>
      </div>
    `).join("")}
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

  <div class="status-detail-row">
    <span><i class="ri-user-line"></i> Status Santri</span>
    ${badgeStatus(s.statusSantri)}
  </div>

  <div class="status-detail-row">
    <span><i class="ri-flag-line"></i> Tanggungan Rekom</span>
    ${badgeStatus(s.statusRekom)}
  </div>

  <div class="status-detail-row">
    <span><i class="ri-checkbox-circle-line"></i> Status Selesai</span>
    ${badgeStatus(s.statusSelesai)}
  </div>

  <div class="floating-scroll-hint" id="modalScrollHint">
    <i class="ri-arrow-down-line"></i>
    <span>Scroll</span>
  </div>
</div>
${detailAlpaHtml}
  `;

  modalOverlay.style.display = "flex";
  document.body.style.overflow = "hidden";

  setupFloatingScrollHint();
}

function setupFloatingScrollHint() {
  const modalCard = document.querySelector(".modal-card");
  const hint = document.getElementById("modalScrollHint");

  if (!modalCard || !hint) return;

  const updateHint = () => {
    const canScroll = modalCard.scrollHeight > modalCard.clientHeight + 5;
    const alreadyScrolled = modalCard.scrollTop > 80;

    if (!canScroll || alreadyScrolled) {
      hint.classList.add("hidden");
    } else {
      hint.classList.remove("hidden");
    }
  };

  modalCard.removeEventListener("scroll", updateHint);
  modalCard.addEventListener("scroll", updateHint);

  setTimeout(updateHint, 100);
}

function renderDetailAlpa(s) {
  const rincian = Array.isArray(s.rincianTanggungan)
    ? s.rincianTanggungan
    : [];

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
            const selesai = String(item.status || "").toUpperCase() === "SELESAI";

            return `
              <div class="rekom-detail-item ${selesai ? "is-done" : "is-pending"}">
                <div>
                  <strong>${item.label}</strong>
                  <span>Alpa: ${item.alpa}</span>
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

function badgeStatus(value) {
  const text = String(value || "-").trim().toUpperCase();
  let color = "badge-gray";

  if (text === "AKTIF" || text === "SELESAI") color = "badge-green";

  if (
    text.includes("R1") ||
    text.includes("R2") ||
    text.includes("R3") ||
    text.includes("R4") ||
    text.includes("PENERTIBAN")
  ) color = "badge-yellow";

  if (text === "BELUM" || text.includes("PERLU") || text.includes("RALAT")) {
    color = "badge-red";
  }

  if (
    text === "PINDAH" ||
    text === "BOYONG" ||
    text === "NONAKTIF" ||
    text === "TIDAK REKOM" ||
    text === "-"
  ) color = "badge-gray";

  return `<strong class="status-badge ${color}">${text}</strong>`;
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

  if (!statSantri) return;

  try {
    const response = await fetch(`${API_URL}?mode=stats`);
    const data = await response.json();

    if (!data.success) return;

    statSantri.textContent = data.santriAktif;
    statMuallim.textContent = data.totalMuallim;
    statRuang.textContent = data.totalRuang;
    statRekom.textContent = data.rekomAktif;
if (heroSantri) heroSantri.textContent = data.santriAktif;
if (heroMuallim) heroMuallim.textContent = data.totalMuallim;
if (heroRekom) heroRekom.textContent = data.rekomAktif;
if (statPindah) statPindah.textContent = data.santriPindah;
if (statBoyong) statBoyong.textContent = data.santriBoyong;
if (statNonaktif) statNonaktif.textContent = data.santriNonaktif;
    if (statPindah) statPindah.textContent = data.santriPindah;
if (statBoyong) statBoyong.textContent = data.santriBoyong;
if (statNonaktif) statNonaktif.textContent = data.santriNonaktif;
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
      container.innerHTML = `<div class="empty-state">Belum ada pengumuman aktif.</div>`;
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
