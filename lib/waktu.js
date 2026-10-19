// Pembantu tanggal dan jam yang dipakai banyak halaman / Date and time helpers shared by many pages

// "2026-10-07" dari objek Date, memakai zona waktu peramban / "2026-10-07" from a Date, in the browser's time zone
export function keTanggal(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export const tanggalHariIni = () => keTanggal(new Date());
export const bulanIni = () => tanggalHariIni().slice(0, 7);

// Menerima Date atau "2026-10-07" / Accepts a Date or "2026-10-07"
export function formatTanggal(nilai) {
  if (!nilai) return "—";
  const date = typeof nilai === "string" ? new Date(nilai + "T00:00:00") : (nilai instanceof Date ? nilai : new Date(nilai));
  if (isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });
}

// 07.52 sesuai PRD 4.2 / 07.52 as in PRD 4.2
export function formatJam(date) {
  if (!date) return "—";
  const d = date instanceof Date ? date : new Date(date);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
}

// "2026-09" -> "September 2026"
export function formatBulan(bulan) {
  if (!bulan) return "—";
  return new Date(bulan + "-01T00:00:00").toLocaleDateString("id-ID", { month: "long", year: "numeric" });
}

// Masuk setelah pukul 08.00 dihitung terlambat (PRD 4.3) / Clocking in after 08:00 counts as late (PRD 4.3)
export function terlambat(jamMasuk) {
  if (!jamMasuk) return false;
  const d = jamMasuk instanceof Date ? jamMasuk : new Date(jamMasuk);
  if (isNaN(d.getTime())) return false;
  return d.getHours() * 60 + d.getMinutes() > 8 * 60;
}

// Lama cuti dalam hari, tanggal mulai dan selesai ikut dihitung / Leave length in days, both start and end dates included
export function lamaHari(mulai, selesai) {
  if (!mulai || !selesai) return 0;
  const m = mulai instanceof Date ? mulai : new Date(mulai);
  const s = selesai instanceof Date ? selesai : new Date(selesai);
  if (isNaN(m.getTime()) || isNaN(s.getTime())) return 0;
  return Math.round((s - m) / 86400000) + 1;
}
