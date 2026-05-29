const API_URL = "https://script.google.com/macros/s/AKfycbzh51ITXyvrDz7VkzZhWV5GB4IHrV-usd38wRa49VQuEXhABwgsoNW0m9WA2ztsotS0/exec";

let hasilPencarian = [];

document.addEventListener("DOMContentLoaded", function () {
  const button = document.getElementById("searchButton");
  const input = document.getElementById("searchInput");

  if (button) {
    button.addEventListener("click", cekSantri);
  }

  if (input) {
    input.addEventListener("keydown", function (event) {
      if (event.key === "Enter") {
        cekSantri();
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
    result.innerHTML = `<div class="empty-state">Ketik nama santri terlebih dahulu.</div>`;
    return;
  }

  result.innerHTML = `<div class="loading">🔍 Mencari data...</div>`;

  try {
    const response = await fetch(`${API_URL}?q=${encodeURIComponent(keyword)}`);
    const json = await response.json();

    if (!json.success || !json.data || json.data.length === 0) {
      result.innerHTML = `<div class="empty-state">❌ Data santri tidak ditemukan.</div>`;
      return;
    }

    hasilPencarian = json.data;
    tampilkanDaftar();

  } catch (error) {
    result.innerHTML = `<div class="empty-state">❌ Gagal mengambil data.</div>`;
  }
}

function tampilkanDaftar() {
  const result = document.getElementById("result");

  result.innerHTML = `
    <div class="search-header">
      Ditemukan ${hasilPencarian.length} santri
    </div>

    ${hasilPencarian.map((s, index) => `
      <div class="search-card" onclick="showDetail(${index})">
        <div class="search-name">${s.nama || "-"}</div>
        <div class="search-info">
          ${s.kelas || "-"} • ${s.adna || "-"} • ${s.kamar || "-"}
        </div>
      </div>
    `).join("")}
  `;
}

function showDetail(index) {
  const result = document.getElementById("result");
  const s = hasilPencarian[index];

  if (!s) return;

  result.innerHTML = `
    <button class="back-button" onclick="tampilkanDaftar()">← Kembali</button>

    <div class="detail-card">
      <h3>${s.nama || "-"}</h3>

      <div class="detail-item"><span>🆔 Kode</span><strong>${s.kode || "-"}</strong></div>
      <div class="detail-item"><span>🏠 Kamar</span><strong>${s.kamar || "-"}</strong></div>
      <div class="detail-item"><span>🏫 Kelas</span><strong>${s.kelas || "-"}</strong></div>
      <div class="detail-item"><span>📖 ADNA</span><strong>${s.adna || "-"}</strong></div>
      <div class="detail-item"><span>👳 Muallim</span><strong>${s.muallim || "-"}</strong></div>
      <div class="detail-item"><span>🏢 Ruang</span><strong>${s.ruang || "-"}</strong></div>

      <hr>

      <div class="detail-item"><span>📌 Status Santri</span><strong>${s.statusSantri || "-"}</strong></div>
      <div class="detail-item"><span>📍 Status Rekom</span><strong>${s.statusRekom || "-"}</strong></div>
      <div class="detail-item"><span>✅ Status Selesai</span><strong>${s.statusSelesai || "-"}</strong></div>
    </div>
  `;
}
