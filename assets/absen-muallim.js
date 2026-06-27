/*
  MPQ - Rekap Absen Muallim V2
  PENTING: ganti ABSEN_MUALLIM_API_URL dengan URL Web App Apps Script panjenengan.
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

const ABSEN_STATUS_OPTIONS = [
  { value: "", label: "Semua Status", note: "Semua persentase" },
  { value: "good", label: "Baik", note: "90% ke atas" },
  { value: "warn", label: "Perhatian", note: "75% - 89%" },
  { value: "bad", label: "Tindak lanjut", note: "di bawah 75%" },
];

const absenMuallimState = {
  data: [],
  filtered: [],
  months: [],
  adnas: [],
  loaded: false,
  generatedAt: "",
  activeMonth: "",
  filters: {
    bulan: "",
    adna: "",
    status: "",
    q: "",
  },
};

document.addEventListener("DOMContentLoaded", setupAbsenMuallimPage);

function setupAbsenMuallimPage() {
  const app = document.getElementById("absenMuallimApp");
  if (!app) return;

  const searchInput = document.getElementById("absenSearchInput");
  const resetButton = document.getElementById("absenResetButton");
  const filterButton = document.getElementById("absenFilterButton");
  const filterApply = document.getElementById("absenFilterApply");
  const filterResetModal = document.getElementById("absenFilterResetModal");
  const bulanSearch = document.getElementById("absenBulanSearch");
  const adnaSearch = document.getElementById("absenAdnaSearch");

  if (searchInput) {
    searchInput.addEventListener("input", function () {
      absenMuallimState.filters.q = searchInput.value || "";
      applyAbsenMuallimFilters(true);
    });
  }

  if (resetButton) resetButton.addEventListener("click", resetAbsenMuallimFilters);
  if (filterButton) filterButton.addEventListener("click", openAbsenFilterModal);
  if (filterApply) filterApply.addEventListener("click", function () {
    applyAbsenMuallimFilters(true);
    closeAbsenFilterModal();
  });
  if (filterResetModal) filterResetModal.addEventListener("click", resetAbsenMuallimFilters);

  document.querySelectorAll("[data-absen-close-filter]").forEach((el) => {
    el.addEventListener("click", closeAbsenFilterModal);
  });

  document.querySelectorAll("[data-filter-toggle]").forEach((button) => {
    button.addEventListener("click", function () {
      const section = button.closest("[data-filter-section]");
      if (!section) return;
      section.classList.toggle("is-open");
    });
  });

  if (bulanSearch) bulanSearch.addEventListener("input", renderAbsenFilterOptions);
  if (adnaSearch) adnaSearch.addEventListener("input", renderAbsenFilterOptions);

  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape") closeAbsenFilterModal();
  });

  const absenList = document.getElementById("absenList");
  if (absenList) {
    absenList.addEventListener("click", function (event) {
      const head = event.target.closest(".absen-row-head");
      if (!head) return;
      const row = head.closest(".absen-row");
      if (!row) return;
      toggleAbsenRow(row);
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

    setDefaultAbsenFilters();
    applyAbsenMuallimParamsFromUrl();
    renderAbsenFilterOptions();
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

function setDefaultAbsenFilters() {
  absenMuallimState.filters.bulan = getDefaultBulan();
  absenMuallimState.filters.adna = "";
  absenMuallimState.filters.status = "";
  absenMuallimState.filters.q = "";
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
  const status = normalizeSearchText(params.get("status") || "");
  const q = params.get("q") || "";

  if (bulan && absenMuallimState.months.includes(bulan)) absenMuallimState.filters.bulan = bulan;
  if (adna && absenMuallimState.adnas.includes(adna)) absenMuallimState.filters.adna = adna;
  if (["good", "warn", "bad"].includes(status)) absenMuallimState.filters.status = status;
  if (q) absenMuallimState.filters.q = q;

  const searchInput = document.getElementById("absenSearchInput");
  if (searchInput) searchInput.value = absenMuallimState.filters.q;
}

function applyAbsenMuallimFilters(updateUrl = true) {
  if (!absenMuallimState.loaded) return;

  const bulan = normalizeUpper(absenMuallimState.filters.bulan || "");
  const adna = normalizeSearchText(absenMuallimState.filters.adna || "");
  const status = normalizeSearchText(absenMuallimState.filters.status || "");
  const q = normalizeSearchText(absenMuallimState.filters.q || "");

  absenMuallimState.filtered = absenMuallimState.data.filter((item) => {
    const searchable = normalizeSearchText([item.muallim, item.adna, item.bulan].join(" "));

    if (bulan && normalizeUpper(item.bulan) !== bulan) return false;
    if (adna && normalizeSearchText(item.adna) !== adna) return false;
    if (status && getTone(item.persentase) !== status) return false;
    if (q && !searchable.includes(q)) return false;
    return true;
  }).sort(compareAbsenRows);

  renderAbsenMuallimSummary();
  renderAbsenMuallimRows();
  updateAbsenMuallimMeta();
  updateAbsenFilterLabels();
  updateActiveFilterCount();
  renderAbsenFilterOptions();
  if (updateUrl) updateAbsenMuallimUrl();
}

function updateAbsenMuallimUrl() {
  const params = new URLSearchParams();
  const { bulan, adna, status, q } = absenMuallimState.filters;

  if (bulan) params.set("bulan", bulan);
  if (adna) params.set("adna", adna);
  if (status) params.set("status", status);
  if (q) params.set("q", q);

  const nextUrl = `${window.location.pathname}${params.toString() ? `?${params.toString()}` : ""}`;
  window.history.replaceState({}, "", nextUrl);
}

function updateAbsenMuallimMeta() {
  const meta = document.getElementById("absenMeta");
  if (!meta) return;

  const { bulan, adna, status } = absenMuallimState.filters;
  const count = absenMuallimState.filtered.length;
  const statusLabel = getStatusFilterLabel(status) || "Semua Status";
  const generatedMarkup = absenMuallimState.generatedAt ? ` &bull; Update: ${escapeHtml(formatAbsenDate(absenMuallimState.generatedAt))}` : "";

  meta.innerHTML = `Menampilkan <strong>${count}</strong> muallim &bull; Bulan ${escapeHtml(bulan || "Semua Bulan")} &bull; ${escapeHtml(adna || "Semua ADNA")} &bull; ${escapeHtml(statusLabel)}${generatedMarkup}`;
}

function renderAbsenMuallimSummary() {
  const container = document.getElementById("absenSummaryGrid");
  if (!container) return;

  const data = absenMuallimState.filtered;
  const total = data.length;
  const avgPercent = total ? data.reduce((sum, item) => sum + item.persentase, 0) / total : 0;
  const totalAlpa = data.reduce((sum, item) => sum + item.alpa, 0);
  const totalIzin = data.reduce((sum, item) => sum + item.izin, 0);

  container.innerHTML = [
    summaryCard({ label: "Muallim", value: total, note: "Total aktif", tone: "", icon: "ri-user-star-line" }),
    summaryCard({ label: "Kehadiran", value: formatPercent(avgPercent), note: "Rata-rata", tone: getTone(avgPercent), icon: "ri-heart-pulse-line" }),
    summaryCard({ label: "Izin", value: totalIzin, note: "Rekap izin", tone: totalIzin > 0 ? "warn" : "good", icon: "ri-calendar-event-line" }),
    summaryCard({ label: "Alpa", value: totalAlpa, note: "Perlu pantau", tone: totalAlpa > 0 ? "bad" : "good", icon: "ri-error-warning-line" }),
  ].join("");
}

function summaryCard({ label, value, note, tone, icon }) {
  return `
    <article class="absen-summary-card ${tone || ""}">
      <span class="absen-summary-icon" aria-hidden="true"><i class="${escapeHtml(icon || "ri-bar-chart-line")}"></i></span>
      <strong class="absen-summary-value">${escapeHtml(String(value))}</strong>
      <span class="absen-summary-label">${escapeHtml(label)}</span>
      <em class="absen-summary-note">${escapeHtml(note)}</em>
    </article>
  `;
}

function renderAbsenMuallimRows() {
  const list = document.getElementById("absenList");
  const data = absenMuallimState.filtered;
  if (!list) return;

  if (!data.length) {
    list.innerHTML = `
      <div class="absen-empty-card">
        <i class="ri-search-line"></i>
        <strong>Data tidak ditemukan</strong>
        <p>Coba ubah filter bulan, ADNA, status, atau kata pencarian.</p>
      </div>
    `;
    return;
  }

  list.innerHTML = data.map((item, index) => renderAbsenRow(item, index)).join("");
}

function renderAbsenRow(item, index) {
  const tone = getTone(item.persentase);
  const statusLabel = getStatusLabel(item.persentase);
  const detailId = `absen-row-detail-${escapeHtml(item.id || String(index))}`;

  return `
    <article class="absen-row ${tone}">
      <button class="absen-row-head" type="button" aria-expanded="false" aria-controls="${detailId}" aria-label="Buka detail absen ${escapeHtml(item.muallim || "muallim")}">
        <div class="absen-row-left">
          <strong class="absen-row-name">${escapeHtml(item.muallim || "-")}</strong>
          <span class="absen-row-sub">${escapeHtml(item.adna || "-")} &bull; ${escapeHtml(item.bulan || "-")}</span>
          <span class="absen-row-hadir">Hadir ${formatNumber(item.jumlahHadir)}/${formatNumber(item.jumlahHari)}</span>
        </div>

        <div class="absen-row-right">
          <span class="absen-percent-value">${formatPercent(item.persentase)}</span>
          <span class="absen-status-pill ${tone}"><span class="absen-status-dot" aria-hidden="true"></span><span class="absen-status-text">${escapeHtml(statusLabel)}</span></span>
          <span class="absen-row-toggle" aria-hidden="true">${chevronDownIcon()}</span>
        </div>
      </button>

      <div class="absen-row-detail" id="${detailId}" aria-hidden="true">
        <div class="absen-row-detail-inner">
          <div class="absen-detail-card" aria-label="Detail kehadiran ${escapeHtml(item.muallim || "muallim")}">
            ${detailBox("Jumlah Hari", item.jumlahHari, "")}
            ${detailBox("Hadir", item.jumlahHadir, tone)}
            ${detailBox("Izin", item.izin, item.izin > 0 ? "warn" : "good")}
            ${detailBox("Alpa", item.alpa, item.alpa > 0 ? "bad" : "good")}
          </div>
        </div>
      </div>
    </article>
  `;
}

function detailBox(label, value, tone) {
  return `
    <div class="absen-detail-metric ${tone || ""}">
      <strong>${escapeHtml(String(formatNumber(value)))}</strong>
      <span>${escapeHtml(label)}</span>
    </div>
  `;
}

function closeAllAbsenRows() {
  document.querySelectorAll(".absen-row.open").forEach((row) => {
    row.classList.remove("open");
    const head = row.querySelector(".absen-row-head");
    if (head) head.setAttribute("aria-expanded", "false");
    const detail = row.querySelector(".absen-row-detail");
    if (detail) detail.setAttribute("aria-hidden", "true");
  });
}

function toggleAbsenRow(row) {
  const isOpen = row.classList.contains("open");
  if (isOpen) {
    row.classList.remove("open");
    row.querySelector(".absen-row-head")?.setAttribute("aria-expanded", "false");
    row.querySelector(".absen-row-detail")?.setAttribute("aria-hidden", "true");
    return;
  }

  closeAllAbsenRows();
  row.classList.add("open");
  row.querySelector(".absen-row-head")?.setAttribute("aria-expanded", "true");
  row.querySelector(".absen-row-detail")?.setAttribute("aria-hidden", "false");
  window.requestAnimationFrame(() => {
    row.scrollIntoView({ behavior: "smooth", block: "start" });
  });
}

function chevronDownIcon() {
  return `
    <svg viewBox="0 0 20 20" focusable="false" aria-hidden="true">
      <path d="M5.25 7.75 10 12.5l4.75-4.75" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>
  `;
}

function renderAbsenMuallimLoading() {
  const meta = document.getElementById("absenMeta");
  const summary = document.getElementById("absenSummaryGrid");
  const list = document.getElementById("absenList");

  if (meta) meta.textContent = "Memuat data rekap absen muallim...";
  if (summary) summary.innerHTML = "";
  if (list) {
    list.innerHTML = `
      <div class="absen-skeleton-list">
        <div class="absen-skeleton-row"></div>
        <div class="absen-skeleton-row"></div>
        <div class="absen-skeleton-row"></div>
      </div>
    `;
  }
}

function renderAbsenMuallimError(title, message) {
  const meta = document.getElementById("absenMeta");
  const summary = document.getElementById("absenSummaryGrid");
  const list = document.getElementById("absenList");

  if (meta) meta.textContent = "Data belum bisa dimuat.";
  if (summary) summary.innerHTML = "";
  if (list) {
    list.innerHTML = `
      <div class="absen-error-card">
        <i class="ri-error-warning-line"></i>
        <strong>${escapeHtml(title)}</strong>
        <p>${escapeHtml(message)}</p>
        <code>assets/absen-muallim.js</code>
      </div>
    `;
  }
}

function openAbsenFilterModal() {
  const overlay = document.getElementById("absenFilterOverlay");
  if (!overlay) return;
  overlay.classList.add("is-open");
  overlay.setAttribute("aria-hidden", "false");
  document.body.classList.add("absen-filter-locked");
}

function closeAbsenFilterModal() {
  const overlay = document.getElementById("absenFilterOverlay");
  if (!overlay) return;
  overlay.classList.remove("is-open");
  overlay.setAttribute("aria-hidden", "true");
  document.body.classList.remove("absen-filter-locked");
}

function resetAbsenMuallimFilters() {
  setDefaultAbsenFilters();
  const searchInput = document.getElementById("absenSearchInput");
  const bulanSearch = document.getElementById("absenBulanSearch");
  const adnaSearch = document.getElementById("absenAdnaSearch");
  if (searchInput) searchInput.value = "";
  if (bulanSearch) bulanSearch.value = "";
  if (adnaSearch) adnaSearch.value = "";
  applyAbsenMuallimFilters(true);
}

function renderAbsenFilterOptions() {
  renderChipOptions({
    containerId: "absenBulanOptions",
    values: ["", ...absenMuallimState.months],
    activeValue: absenMuallimState.filters.bulan,
    searchValue: document.getElementById("absenBulanSearch")?.value || "",
    emptyLabel: "Semua Bulan",
    onSelect: (value) => {
      absenMuallimState.filters.bulan = value;
      applyAbsenMuallimFilters(false);
    },
  });

  renderChipOptions({
    containerId: "absenAdnaOptions",
    values: ["", ...absenMuallimState.adnas],
    activeValue: absenMuallimState.filters.adna,
    searchValue: document.getElementById("absenAdnaSearch")?.value || "",
    emptyLabel: "Semua ADNA",
    onSelect: (value) => {
      absenMuallimState.filters.adna = value;
      applyAbsenMuallimFilters(false);
    },
  });

  const statusContainer = document.getElementById("absenStatusOptions");
  if (statusContainer) {
    statusContainer.innerHTML = ABSEN_STATUS_OPTIONS.map((option) => `
      <button class="absen-option-btn ${absenMuallimState.filters.status === option.value ? "is-active" : ""}" type="button" data-status-value="${escapeHtml(option.value)}">
        <span>
          ${escapeHtml(option.label)}
          <small>${escapeHtml(option.note)}</small>
        </span>
      </button>
    `).join("");

    statusContainer.querySelectorAll("[data-status-value]").forEach((button) => {
      button.addEventListener("click", function () {
        absenMuallimState.filters.status = button.getAttribute("data-status-value") || "";
        applyAbsenMuallimFilters(false);
      });
    });
  }

  updateAbsenFilterLabels();
  updateActiveFilterCount();
}

function renderChipOptions({ containerId, values, activeValue, searchValue, emptyLabel, onSelect }) {
  const container = document.getElementById(containerId);
  if (!container) return;

  const normalizedSearch = normalizeSearchText(searchValue || "");
  const filteredValues = values.filter((value) => {
    if (!value) return true;
    return !normalizedSearch || normalizeSearchText(value).includes(normalizedSearch);
  });

  if (!filteredValues.length) {
    container.innerHTML = `<div class="absen-empty-card"><strong>Tidak ada pilihan</strong><p>Coba kata pencarian lain.</p></div>`;
    return;
  }

  container.innerHTML = filteredValues.map((value) => {
    const label = value || emptyLabel;
    return `
      <button class="absen-option-btn ${String(activeValue || "") === String(value || "") ? "is-active" : ""}" type="button" data-filter-value="${escapeHtml(value)}">
        ${escapeHtml(label)}
      </button>
    `;
  }).join("");

  container.querySelectorAll("[data-filter-value]").forEach((button) => {
    button.addEventListener("click", function () {
      onSelect(button.getAttribute("data-filter-value") || "");
    });
  });
}

function updateAbsenFilterLabels() {
  const bulanLabel = document.getElementById("absenBulanLabel");
  const adnaLabel = document.getElementById("absenAdnaLabel");
  const statusLabel = document.getElementById("absenStatusLabel");

  if (bulanLabel) bulanLabel.textContent = absenMuallimState.filters.bulan || "Semua Bulan";
  if (adnaLabel) adnaLabel.textContent = absenMuallimState.filters.adna || "Semua ADNA";
  if (statusLabel) statusLabel.textContent = getStatusFilterLabel(absenMuallimState.filters.status) || "Semua Status";
}

function updateActiveFilterCount() {
  const badge = document.getElementById("absenActiveFilterCount");
  if (!badge) return;

  let count = 0;
  if (absenMuallimState.filters.bulan) count += 1;
  if (absenMuallimState.filters.adna) count += 1;
  if (absenMuallimState.filters.status) count += 1;

  badge.textContent = String(count);
}

function getStatusFilterLabel(value) {
  const found = ABSEN_STATUS_OPTIONS.find((option) => option.value === value);
  return found ? found.label : "";
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
