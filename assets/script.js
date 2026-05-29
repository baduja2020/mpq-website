const API_URL = "https://script.google.com/macros/s/AKfycbzh51ITXyvrDz7VkzZhWV5GB4IHrV-usd38wRa49VQuEXhABwgsoNW0m9WA2ztsotS0/exec";

let searchResults = [];

async function cekSantri() {
  const input = document.getElementById("searchInput");
  const result = document.getElementById("result");

  const query = input.value.trim();

  if (!query) {
    result.style.display = "block";
    result.innerHTML = "Masukkan nama santri terlebih dahulu.";
    return;
  }

  result.style.display = "block";
  result.innerHTML = "🔄 Mencari data santri...";

  try {
    const response = await fetch(`${API_URL}?q=${encodeURIComponent(query)}`);
    const json = await response.json();

    if (!json.success || !json.data.length) {
      result.innerHTML = "❌ Data santri tidak ditemukan.";
      return;
    }

    searchResults = json.data;

    result.innerHTML = `
      <div class="result-title">Ditemukan ${json.total} data</div>
      ${searchResults.map((s, index) => `
        <button class="search-item" onclick="showDetail(${index})">
          <strong>${s.nama}</strong>
          <span>${s.kelas || "-"} • ${s.adna || "-"} • ${s.kamar || "-"}</span>
        </button>
      `).join("")}
    `;

  } catch (error) {
    result.innerHTML = "❌ Gagal mengambil data. Coba beberapa saat lagi.";
  }
}

function showDetail(index) {
  const result = document.getElementById("result");
  const s = searchResults[index];

  if (!s) return;

  result.innerHTML = `
    <button class="back-btn" onclick="showList()">← Kembali ke hasil</button>

    <div class="santri-card">
      <h3>${s.nama}</h3>

      <p>🆔 Kode: ${s.kode || "-"}</p>
      <p>🏠 Kamar: ${s.kamar || "-"}</p>
      <p>🏫 Kelas: ${s.kelas || "-"}</p>
      <p>📖 ADNA: ${s.adna || "-"}</p>
      <p>👳 Muallim: ${s.muallim || "-"}</p>
      <p>🏢 Ruang: ${s.ruang || "-"}</p>

      <hr>

      <p>📌 Status Santri: ${s.statusSantri || "-"}</p>
      <p>📍 Status Rekom: ${s.statusRekom || "-"}</p>
      <p>✅ Status Selesai: ${s.statusSelesai || "-"}</p>
    </div>
  `;
}

function showList() {
  const result = document.getElementById("result");

  result.innerHTML = `
    <div class="result-title">Hasil pencarian</div>
    ${searchResults.map((s, index) => `
      <button class="search-item" onclick="showDetail(${index})">
        <strong>${s.nama}</strong>
        <span>${s.kelas || "-"} • ${s.adna || "-"} • ${s.kamar || "-"}</span>
      </button>
    `).join("")}
  `;
}
