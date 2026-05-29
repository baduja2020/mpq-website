const API_URL = "https://script.google.com/macros/s/AKfycbzh51ITXyvrDz7VkzZhWV5GB4IHrV-usd38wRa49VQuEXhABwgsoNW0m9WA2ztsotS0/exec";

let hasilPencarian = [];

async function cekSantri() {
  const keyword = document.getElementById("searchInput").value.trim();
  const result = document.getElementById("result");

  if (!keyword) {
    result.innerHTML = `
      <div class="empty-state">
        Ketik nama santri terlebih dahulu
      </div>
    `;
    return;
  }

  result.innerHTML = `
    <div class="loading">
      🔍 Mencari data...
    </div>
  `;

  try {
    const response = await fetch(
      `${API_URL}?q=${encodeURIComponent(keyword)}`
    );

    const data = await response.json();

    if (!data.success || data.data.length === 0) {
      result.innerHTML = `
        <div class="empty-state">
          ❌ Data tidak ditemukan
        </div>
      `;
      return;
    }

    hasilPencarian = data.data;

    tampilkanDaftar();

  } catch (error) {
    result.innerHTML = `
      <div class="empty-state">
        ❌ Gagal mengambil data
      </div>
    `;
  }
}

function tampilkanDaftar() {
  const result = document.getElementById("result");

  let html = `
    <div class="search-header">
      Ditemukan ${hasilPencarian.length} santri
    </div>
  `;

  hasilPencarian.forEach((s, index) => {
    html += `
      <div class="search-card" onclick="showDetail(${index})">
        <div class="search-name">
          ${s.nama}
        </div>

        <div class="search-info">
          ${s.kelas || "-"} • ${s.adna || "-"} • ${s.kamar || "-"}
        </div>
      </div>
    `;
  });

  result.innerHTML = html;
}

function showDetail(index) {

  const s = hasilPencarian[index];
  const result = document.getElementById("result");

  result.innerHTML = `
    <button class="back-button" onclick="tampilkanDaftar()">
      ← Kembali
    </button>

    <div class="detail-card">

      <h3>${s.nama}</h3>

      <div class="detail-item">
        <span>🆔 Kode</span>
        <strong>${s.kode || "-"}</strong>
      </div>

      <div class="detail-item">
        <span>🏠 Kamar</span>
        <strong>${s.kamar || "-"}</strong>
      </div>

      <div class="detail-item">
        <span>🏫 Kelas</span>
        <strong>${s.kelas || "-"}</strong>
      </div>

      <div class="detail-item">
        <span>📖 ADNA</span>
        <strong>${s.adna || "-"}</strong>
      </div>

      <div class="detail-item">
        <span>👳 Muallim</span>
        <strong>${s.muallim || "-"}</strong>
      </div>

      <div class="detail-item">
        <span>🏢 Ruang</span>
        <strong>${s.ruang || "-"}</strong>
      </div>

      <hr>

      <div class="detail-item">
        <span>📌 Status Santri</span>
        <strong>${s.statusSantri || "-"}</strong>
      </div>

      <div class="detail-item">
        <span>📍 Status Rekom</span>
        <strong>${s.statusRekom || "-"}</strong>
      </div>

      <div class="detail-item">
        <span>✅ Status Selesai</span>
        <strong>${s.statusSelesai || "-"}</strong>
      </div>

    </div>
  `;
}
