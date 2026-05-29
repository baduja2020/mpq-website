function cekSantri() {
  const input = document.getElementById("searchInput");
  const result = document.getElementById("result");

  if (!input || !result) return;

  const query = input.value.trim();

  if (!query) {
    result.style.display = "block";
    result.innerHTML = "Masukkan nama santri terlebih dahulu.";
    return;
  }

  result.style.display = "block";
  result.innerHTML = `
    <strong>Fitur pencarian web sedang disiapkan.</strong><br><br>
    Untuk saat ini, silakan cek data santri melalui WA Bot MPQ dengan mengetik nama:
    <br><br>
    <b>${query}</b>
  `;
}
