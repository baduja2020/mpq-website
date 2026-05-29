const API_URL = "https://script.google.com/macros/s/AKfycbzh51ITXyvrDz7VkzZhWV5GB4IHrV-usd38wRa49VQuEXhABwgsoNW0m9WA2ztsotS0/exec";

let hasilPencarian = [];

document.addEventListener("DOMContentLoaded", function () {
  const button = document.getElementById("searchButton");
  const input = document.getElementById("searchInput");

  if (button) button.addEventListener("click", cekSantri);

  if (input) {
    input.addEventListener("keydown", function (event) {
      if (event.key === "Enter") cekSantri();
    });
  }

  const closeModal = document.getElementById("closeModal");
  const modalOverlay = document.getElementById("modalOverlay");

  if (closeModal) {
    closeModal.addEventListener("click", closeDetailModal);
  }

  if (modalOverlay) {
    modalOverlay.addEventListener("click", function (e) {
      if (e.target.id === "modalOverlay") {
        closeDetailModal();
      }
    });
  }
});

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
        <div class="search-info">${s.kelas || "-"} • ${s.adna || "-"} • ${s.kamar || "-"}</div>
      </div>
    `).join("")}
  `;
}

function showDetail(index) {
  const result = document.getElementById("result");
  const s = hasilPencarian[index];

  const modalOverlay = document.getElementById("modalOverlay");
  const modalContent = document.getElementById("modalContent");

  if (!s || !modalOverlay || !modalContent) return;

  modalContent.innerHTML = `
    <h3 class="modal-title">${s.nama || "-"}</h3>

    <div class="detail-grid">
      <div class="detail-item">
        <span><i class="ri-id-card-line"></i> Kode</span>
        <strong>${s.kode || "-"}</strong>
      </div>

      <div class="detail-item">
        <span><i class="ri-home-4-line"></i> Kamar</span>
        <strong>${s.kamar || "-"}</strong>
      </div>

      <div class="detail-item">
        <span><i class="ri-school-line"></i> Kelas</span>
        <strong>${s.kelas || "-"}</strong>
      </div>

      <div class="detail-item">
        <span><i class="ri-bookmark-line"></i> ADNA</span>
        <strong>${s.adna || "-"}</strong>
      </div>

      <div class="detail-item">
        <span><i class="ri-user-star-line"></i> Muallim</span>
        <strong>${s.muallim || "-"}</strong>
      </div>

      <div class="detail-item">
        <span><i class="ri-building-2-line"></i> Ruang</span>
        <strong>${s.ruang || "-"}</strong>
      </div>
    </div>

    <div class="status-area">
      <div class="detail-grid">
        <div class="detail-item">
          <span><i class="ri-user-line"></i> Status Santri</span>
          ${badgeStatus(s.statusSantri)}
        </div>

        <div class="detail-item">
          <span><i class="ri-flag-line"></i> Status Rekom</span>
          ${badgeStatus(s.statusRekom)}
        </div>

        <div class="detail-item">
          <span><i class="ri-checkbox-circle-line"></i> Status Selesai</span>
          ${badgeStatus(s.statusSelesai)}
        </div>
      </div>
    </div>
  `;

  modalOverlay.style.display = "flex";
}
function badgeStatus(value) {
  const text = String(value || "-").trim().toUpperCase();

  let color = "badge-gray";

  if (
    text === "AKTIF" ||
    text === "SELESAI"
  ) {
    color = "badge-green";
  }

  if (
    text.includes("R1") ||
    text.includes("R2") ||
    text.includes("R3") ||
    text.includes("R4") ||
    text.includes("PENERTIBAN")
  ) {
    color = "badge-yellow";
  }

  if (
    text === "BELUM" ||
    text.includes("PERLU") ||
    text.includes("RALAT")
  ) {
    color = "badge-red";
  }

  if (
    text === "PINDAH" ||
    text === "BOYONG" ||
    text === "NONAKTIF" ||
    text === "TIDAK REKOM" ||
    text === "-"
  ) {
    color = "badge-gray";
  }

  return `<strong class="status-badge ${color}">${text}</strong>`;
}


function closeDetailModal() {
  const modalOverlay = document.getElementById("modalOverlay");
  if (modalOverlay) {
    modalOverlay.style.display = "none";
  }
}
async function loadStats() {
  const statSantri = document.getElementById("statSantri");
  const statMuallim = document.getElementById("statMuallim");
  const statRuang = document.getElementById("statRuang");
  const statRekom = document.getElementById("statRekom");

  if (!statSantri) return;

  try {
    const response = await fetch(`${API_URL}?mode=stats`);
    const data = await response.json();

    if (!data.success) return;

    statSantri.textContent = data.santriAktif;
    statMuallim.textContent = data.totalMuallim;
    statRuang.textContent = data.totalRuang;
    statRekom.textContent = data.rekomAktif;
  } catch (error) {
    console.log("Gagal load statistik");
  }
}

document.addEventListener("DOMContentLoaded", loadStats);
async function loadPengumuman() {
  const container = document.getElementById("pengumumanList");

  if (!container) return;

  try {
    const response = await fetch(`${API_URL}?mode=pengumuman`);
    const json = await response.json();

    if (!json.success || !json.data || json.data.length === 0) {
      container.innerHTML = `
        <div class="empty-state">Belum ada pengumuman aktif.</div>
      `;
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
    container.innerHTML = `
      <div class="empty-state">Gagal memuat pengumuman.</div>
    `;
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

document.addEventListener("DOMContentLoaded", loadPengumuman);
