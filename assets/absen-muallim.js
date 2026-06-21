/*
  MPQ - Rekap Absen Muallim
  Ganti ABSEN_MUALLIM_API_URL setelah Apps Script di-deploy.
*/
const ABSEN_MUALLIM_API_URL = "https://script.google.com/macros/s/AKfycbzAgrbS8PxxqGF1qPC2ibcQ-hOF939cvJbczv75j73xQx13TRvhXUdT5yPA2eW5ebw/exec";
const ABSEN_MUALLIM_API_MODE = "absenMuallim";

const HIJRI_MONTH_ORDER = [
  "MUHARRAM",
  "SHAFAR",
  "RABIUL AWWAL",
  "RABIUL AKHIR",
  "JUMADIL ULA",
  "JUMADIL AKHIRAH",
  "RAJAB",
  "SYA'BAN",
  "RAMADHAN",
  "SYAWWAL",
  "DZUL QO'DAH",
  "DZULHIJJAH",
];

const absenMuallimState = {
  data: [],
  filtered: [],
  months: [],
  adnas: [],
  loaded: false,
  generatedAt: "",
};

document.addEventListener("DOMContentLoaded", setupAbsenMuallimPage);

function setupAbsenMuallimPage() {
  const app = document.getElementById("absenMuallimApp");
  if (!app) return;

  const bulanFilter = document.getElementById("absenBulanFilter");
  const adnaFilter = document.getElementById("absenAdnaFilter");
  const searchInput = document.getElementById("absenSearchInput");
  const resetButton = document.getElementById("absenResetButton");

  [bulanFilter, adnaFilter, searchInput].forEach((el) => {
    if (!el) return;
    el.addEventListener("input", applyAbsenMuallimFilters);
    el.addEventListener("change", applyAbsenMuallimFilters);
  });

  if (resetButton) {
    resetButton.addEventListener("click", function () {
      const activeMonth = getDefaultBulan();
      if (bulanFilter) bulanFilter.value = activeMonth;
      if (adnaFilter) adnaFilter.value = "";
      if (searchInput) searchInput.value = "";
      applyAbsenMuallimFilters();
    });
  }

  loadAbsenMuallimData();
}

async function loadAbsenMuallimData() {
  renderAbsenMuallimLoading();

  if (!ABSEN_MUALLIM_API_URL || ABSEN_MUALLIM_API_URL.includes("PASTE_APPS_SCRIPT")) {
    renderAbsenMuallimError(
      "API belum dikonfigurasi.",
      "Ganti ABSEN_MUALLIM_API_URL di assets/absen-muallim.js dengan URL Web App Apps Script."
    );
    return;
  }

  try {
    const url = `${ABSEN_MUALLIM_API_URL}?mode=${encodeURIComponent(ABSEN_MUALLIM_API_MODE)}&t=${Date.now()}`;
    const response = await fetch(url);
    const json = await response.json();

    if (!json.success || !Array.isArray(json.data)) {
      throw new Error(json.message || "Data rekap absen muallim tidak tersedia.");
    }

    absenMuallimState.data = json.data.map(normalizeAbsenMuallimRow).filter((item) => item.muallim);
    absenMuallimState.months = Array.isArray(json.months) && json.months.length
      ? sortHijriMonths(json.months)
      : sortHijriMonths(uniqueAbsenValues(absenMuallimState.data.map((item) => item.bulan)));
    absenMuallimState.adnas = uniqueAbsenValues(absenMuallimState.data.map((item) => item.adna));
    absenMuallimState.generatedAt = json.generatedAt || "";
    absenMuallimState.activeMonth = normalizeUpper(json.activeMonth || "");
    absenMuallimState.loaded = true;

    populateAbsenMuallimFilters();
    applyAbsenMuallimParamsFromUrl();
    applyAbsenMuallimFilters(false);
  } catch (error) {
    renderAbsenMuallimError(
      "Gagal memuat data rekap.",
      error.message || "Periksa deployment Apps Script dan akses spreadsheet."
    );
  }
}

function normalizeAbsenMuallimRow(row = {}) {
  const get = (...keys) => {
    for (const key of keys) {
      if (row[key] !== undefined && row[key] !== null && String(row[key]).trim() !== "") {
        return String(row[key]).trim();
      }
    }
    return "";
  };

  const number = (...keys) => toAbsenNumber(get(...keys));
  const percent = toAbsenPercent(get("persentase", "PERSENTASE", "%"));

  return {
    id: get("id", "ID_ABSEN"),
    bulan: normalizeUpper(get("bulan", "BULAN")),
    adna: normalizeAdnaLabel(get("adna", "ADNA", "MUALLIM TINGKAT", "MUALLIM_TINGKAT")),
    muallim: get("muallim", "MUALLIM", "NAMA MUALLIM", "NAMA MU'ALLIM"),
    jumlahHari: number("jumlahHari", "JUMLAH_HARI", "JUMLAH HARI"),
    sakit: number("sakit", "S", "SAKIT"),
    izin: number("izin", "I", "IZIN"),
    alpa: number("alpa", "A", "ALPA"),
    jumlahHadir: number("jumlahHadir", "JUMLAH_HADIR", "JUMLAH HADIR", "HADIR"),
    persentase: percent,
    catatan: get("catatan", "CATATAN"),
    staffInput: get("staffInput", "STAFF_INPUT", "STAFF INPUT"),
  };
}

function populateAbsenMuallimFilters() {
  const bulanFilter = document.getElementById("absenBulanFilter");
  const adnaFilter = document.getElementById("absenAdnaFilter");

  if (bulanFilter) {
    bulanFilter.innerHTML = absenMuallimState.months.length
      ? absenMuallimState.months.map((bulan) => `<option value="${escapeHtml(bulan)}">${escapeHtml(bulan)}</option>`).join("")
      : `<option value="">Semua Bulan</option>`;

    const defaultBulan = getDefaultBulan();
    if (defaultBulan) bulanFilter.value = defaultBulan;
  }

  if (adnaFilter) {
    adnaFilter.innerHTML = `<option value="">Semua ADNA</option>` +
      absenMuallimState.adnas.map((adna) => `<option value="${escapeHtml(adna)}">${escapeHtml(adna)}</option>`).join("");
  }
}

function getDefaultBulan() {
  const active = absenMuallimState.activeMonth;
  if (active && absenMuallimState.months.includes(active)) return active;
  return absenMuallimState.months[absenMuallimState.months.length - 1] || "";
}

function applyAbsenMuallimParamsFromUrl() {
  const params = new URLSearchParams(window.location.search);
  const bulan = normalizeUpper(params.get("bulan") || "");
  const adna = normalizeAdnaLabel(params.get("adna") || "");
  const q = params.get("q") || "";

  const bulanFilter = document.getElementById("absenBulanFilter");
  const adnaFilter = document.getElementById("absenAdnaFilter");
  const searchInput = document.getElementById("absenSearchInput");

  if (bulanFilter && bulan && absenMuallimState.months.includes(bulan)) bulanFilter.value = bulan;
  if (adnaFilter && adna && absenMuallimState.adnas.includes(adna)) adnaFilter.value = adna;
  if (searchInput && q) searchInput.value = q;
}

function applyAbsenMuallimFilters(updateUrl = true) {
  if (!absenMuallimState.loaded) return;

  const bulan = normalizeUpper(document.getElementById("absenBulanFilter")?.value || "");
  const adna = normalizeSearchText(document.getElementById("absenAdnaFilter")?.value || "");
  const q = normalizeSearchText(document.getElementById("absenSearchInput")?.value || "");

  absenMuallimState.filtered = absenMuallimState.data.filter((item) => {
    const searchable = normalizeSearchText([item.muallim, item.adna, item.bulan].join(" "));

    if (bulan && normalizeUpper(item.bulan) !== bulan) return false;
    if (adna && normalizeSearchText(item.adna) !== adna) return false;
    if (q && !searchable.includes(q)) return false;
    return true;
  }).sort(compareAbsenRows);

  renderAbsenMuallimSummary();
  renderAbsenMuallimRows();
  updateAbsenMuallimMeta();
  if (updateUrl) updateAbsenMuallimUrl();
}

function updateAbsenMuallimUrl() {
  const params = new URLSearchParams();
  const bulan = document.getElementById("absenBulanFilter")?.value || "";
  const adna = document.getElementById("absenAdnaFilter")?.value || "";
  const q = document.getElementById("absenSearchInput")?.value || "";

  if (bulan) params.set("bulan", bulan);
  if (adna) params.set("adna", adna);
  if (q) params.set("q", q);

  const nextUrl = `${window.location.pathname}${params.toString() ? `?${params.toString()}` : ""}`;
  window.history.replaceState({}, "", nextUrl);
}

function updateAbsenMuallimMeta() {
  const meta = document.getElementById("absenMeta");
  if (!meta) return;

  const bulan = document.getElementById("absenBulanFilter")?.value || "Semua bulan";
  const adna = document.getElementById("absenAdnaFilter")?.value || "Semua ADNA";
  const count = absenMuallimState.filtered.length;
  const generated = absenMuallimState.generatedAt ? ` • Update: ${formatAbsenDate(absenMuallimState.generatedAt)}` : "";

  meta.textContent = `Menampilkan ${count} muallim • Bulan ${bulan} • ${adna}${generated}`;
}

function renderAbsenMuallimSummary() {
  const container = document.getElementById("absenSummaryGrid");
  if (!container) return;

  const data = absenMuallimState.filtered;
  const total = data.length;
  const avgPercent = total ? data.reduce((sum, item) => sum + item.persentase, 0) / total : 0;
  const totalSakit = data.reduce((sum, item) => sum + item.sakit, 0);
  const totalIzin = data.reduce((sum, item) => sum + item.izin, 0);
  const totalAlpa = data.reduce((sum, item) => sum + item.alpa, 0);
  const perhatian = data.filter((item) => item.persentase < 0.75).length;

  container.innerHTML = [
    summaryCard("Total Muallim", total, "baris data", ""),
    summaryCard("Rata-rata Hadir", formatPercent(avgPercent), "kehadiran", getTone(avgPercent)),
    summaryCard("Sakit", totalSakit, "total S", ""),
    summaryCard("Izin", totalIzin, "total I", ""),
    summaryCard("Alpa", totalAlpa, "total A", totalAlpa > 0 ? "warn" : "good"),
    summaryCard("Perhatian", perhatian, "di bawah 75%", perhatian > 0 ? "bad" : "good"),
  ].join("");
}

function summaryCard(label, value, note, tone) {
  return `
    <article class="absen-summary-card ${tone || ""}">
      <span>${escapeHtml(label)}</span>
      <strong>${escapeHtml(String(value))}</strong>
      <em>${escapeHtml(note)}</em>
    </article>
  `;
}

function renderAbsenMuallimRows() {
  const tableBody = document.getElementById("absenTableBody");
  const mobileList = document.getElementById("absenMobileList");
  const data = absenMuallimState.filtered;

  if (!data.length) {
    const empty = `
      <div class="absen-empty-card">
        <strong>Data tidak ditemukan</strong>
        <p>Coba ubah filter bulan, ADNA, atau kata pencarian.</p>
      </div>
    `;

    if (tableBody) tableBody.innerHTML = `<tr><td colspan="10">Data tidak ditemukan.</td></tr>`;
    if (mobileList) mobileList.innerHTML = empty;
    return;
  }

  if (tableBody) {
    tableBody.innerHTML = data.map((item, index) => renderAbsenTableRow(item, index)).join("");
  }

  if (mobileList) {
    mobileList.innerHTML = data.map((item, index) => renderAbsenCard(item, index)).join("");
  }
}

function renderAbsenTableRow(item, index) {
  const tone = getTone(item.persentase);
  return `
    <tr>
      <td>${index + 1}</td>
      <td>
        <div class="absen-muallim-name">
          <strong>${escapeHtml(item.muallim || "-")}</strong>
          ${item.catatan ? `<small>${escapeHtml(item.catatan)}</small>` : ""}
        </div>
      </td>
      <td>${escapeHtml(item.adna || "-")}</td>
      <td>${formatNumber(item.jumlahHari)}</td>
      <td>${formatNumber(item.sakit)}</td>
      <td>${formatNumber(item.izin)}</td>
      <td>${formatNumber(item.alpa)}</td>
      <td>${formatNumber(item.jumlahHadir)}</td>
      <td><span class="absen-percent-pill ${tone}">${formatPercent(item.persentase)}</span></td>
      <td><span class="absen-status-pill ${tone}">${getStatusLabel(item.persentase)}</span></td>
    </tr>
  `;
}

function renderAbsenCard(item) {
  const tone = getTone(item.persentase);
  const percentWidth = Math.max(0, Math.min(item.persentase * 100, 100));

  return `
    <article class="absen-card ${tone}" style="--percent-width:${percentWidth}%">
      <div class="absen-card-top">
        <div>
          <h3>${escapeHtml(item.muallim || "-")}</h3>
          <span class="absen-status-pill ${tone}">${getStatusLabel(item.persentase)}</span>
        </div>
        <span class="adna-chip"><i class="ri-book-open-line"></i>${escapeHtml(item.adna || "-")}</span>
      </div>

      <div class="absen-progress"><span></span></div>

      <div class="absen-card-grid">
        <div class="absen-mini-stat"><span>Hadir</span><strong>${formatNumber(item.jumlahHadir)}</strong></div>
        <div class="absen-mini-stat"><span>Hari</span><strong>${formatNumber(item.jumlahHari)}</strong></div>
        <div class="absen-mini-stat"><span>S/I/A</span><strong>${formatNumber(item.sakit)}/${formatNumber(item.izin)}/${formatNumber(item.alpa)}</strong></div>
        <div class="absen-mini-stat"><span>Persen</span><strong>${formatPercent(item.persentase)}</strong></div>
      </div>

      ${item.catatan ? `<div class="absen-note">${escapeHtml(item.catatan)}</div>` : ""}
    </article>
  `;
}

function renderAbsenMuallimLoading() {
  const meta = document.getElementById("absenMeta");
  const summary = document.getElementById("absenSummaryGrid");
  const tableBody = document.getElementById("absenTableBody");
  const mobileList = document.getElementById("absenMobileList");

  if (meta) meta.textContent = "Memuat data rekap absen muallim...";
  if (summary) summary.innerHTML = "";
  if (tableBody) tableBody.innerHTML = `<tr><td colspan="10">Memuat data...</td></tr>`;
  if (mobileList) {
    mobileList.innerHTML = `
      <div class="absen-loading-card">
        <strong>Memuat data</strong>
        <p>Mengambil rekap absen muallim dari Google Sheets.</p>
      </div>
    `;
  }
}

function renderAbsenMuallimError(title, message) {
  const meta = document.getElementById("absenMeta");
  const summary = document.getElementById("absenSummaryGrid");
  const tableBody = document.getElementById("absenTableBody");
  const mobileList = document.getElementById("absenMobileList");

  if (meta) meta.textContent = "Data belum bisa dimuat.";
  if (summary) summary.innerHTML = "";
  if (tableBody) tableBody.innerHTML = `<tr><td colspan="10">${escapeHtml(title)}</td></tr>`;

  const html = `
    <div class="absen-error-card">
      <strong>${escapeHtml(title)}</strong>
      <p>${escapeHtml(message)}</p>
      <code>assets/absen-muallim.js</code>
    </div>
  `;

  if (mobileList) mobileList.innerHTML = html;
}

function sortHijriMonths(months) {
  return uniqueAbsenValues(months).sort((a, b) => {
    const ia = HIJRI_MONTH_ORDER.indexOf(normalizeUpper(a));
    const ib = HIJRI_MONTH_ORDER.indexOf(normalizeUpper(b));

    if (ia === -1 && ib === -1) return String(a).localeCompare(String(b), "id-ID", { numeric: true });
    if (ia === -1) return 1;
    if (ib === -1) return -1;
    return ia - ib;
  });
}

function compareAbsenRows(a, b) {
  const adnaCompare = String(a.adna || "").localeCompare(String(b.adna || ""), "id-ID", { numeric: true });
  if (adnaCompare !== 0) return adnaCompare;
  return String(a.muallim || "").localeCompare(String(b.muallim || ""), "id-ID", { numeric: true });
}

function uniqueAbsenValues(items) {
  return [...new Set(items.map((item) => String(item || "").trim()).filter(Boolean))]
    .sort((a, b) => a.localeCompare(b, "id-ID", { numeric: true }));
}

function getTone(percent) {
  if (percent >= 0.9) return "good";
  if (percent >= 0.75) return "warn";
  return "bad";
}

function getStatusLabel(percent) {
  if (percent >= 0.9) return "Baik";
  if (percent >= 0.75) return "Perhatian";
  return "Tindak lanjut";
}

function toAbsenNumber(value) {
  if (value === null || value === undefined || value === "") return 0;
  const cleaned = String(value).replace("%", "").replace(",", ".").trim();
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : 0;
}

function toAbsenPercent(value) {
  const num = toAbsenNumber(value);
  if (!num) return 0;
  return num > 1 ? num / 100 : num;
}

function formatPercent(value) {
  const num = Number(value) || 0;
  return `${Math.round(num * 100)}%`;
}

function formatNumber(value) {
  const num = Number(value) || 0;
  return String(num);
}

function formatAbsenDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function normalizeUpper(value) {
  return String(value || "").trim().replace(/\s+/g, " ").toUpperCase();
}

function normalizeAdnaLabel(value) {
  const raw = normalizeUpper(value).replace(/[-_]+/g, " ");
  const compact = raw.replace(/\s+/g, "");

  const match = compact.match(/^([A-Z]+|C\.DESA)(\d{1,2})([A-Z])?$/i);
  if (match && match[1] !== "C.DESA") {
    const prefix = match[1].toUpperCase();
    const number = String(match[2]).padStart(2, "0");
    const suffix = match[3] ? ` ${match[3].toUpperCase()}` : "";
    return `${prefix} ${number}${suffix}`;
  }

  return raw;
}

function normalizeSearchText(value) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/['’`]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
