document.addEventListener("DOMContentLoaded", () => {
    // Tambahkan event listener untuk klik accordion
    document.getElementById("absenList").addEventListener("click", (e) => {
        const head = e.target.closest(".absen-row-head");
        if (!head) return;
        const row = head.closest(".absen-row");
        const isOpen = row.classList.contains("open");
        
        // Tutup semua, buka yang diklik saja
        document.querySelectorAll(".absen-row").forEach(el => el.classList.remove("open"));
        if (!isOpen) row.classList.add("open");
    });
    // ... sisa fungsi aslimu tetap sama ...
});

// Pastikan fungsi renderAbsenRow menggunakan struktur yang pas dengan CSS di atas:
function renderAbsenRow(item, index) {
  const tone = getTone(item.persentase);
  const statusLabel = getStatusLabel(item.persentase);
  return `
    <article class="absen-row ${tone}">
      <div class="absen-row-head">
        <div class="absen-indicator-dot"></div>
        <div class="absen-row-main">
          <strong class="absen-row-name">${escapeHtml(item.muallim)}</strong>
          <span class="absen-row-meta">${escapeHtml(item.adna)} • ${escapeHtml(item.bulan)}</span>
        </div>
        <div class="absen-row-side">
          <span class="absen-percent-pill ${tone}">${formatPercent(item.persentase)}</span>
          <span class="absen-status-pill">${escapeHtml(statusLabel)}</span>
          <button class="absen-row-toggle">+</button>
        </div>
      </div>
      <div class="absen-row-detail">
        <!-- Detail isi tetap sama seperti aslimu -->
      </div>
    </article>`;
}
