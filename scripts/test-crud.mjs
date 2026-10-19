/**
 * Script verifikasi semua fitur CRUD Cloud Firestore di App 3:
 * 1. Catat Presensi (Masuk & Pulang)
 * 2. Ajukan Cuti
 * 3. Setujui atau Tolak Cuti
 * 4. Ubah Profil
 * 5. Ubah Data Karyawan (Peran)
 */

import { existsSync, readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Muat .env.local
const envPath = resolve(__dirname, "../.env.local");
if (existsSync(envPath)) {
  const content = readFileSync(envPath, "utf-8");
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const match = trimmed.match(/^([^=]+)=(.*)$/);
    if (match) {
      const key = match[1].trim();
      let val = match[2].trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      process.env[key] = val;
    }
  }
}

const {
  ambilPresensi,
  ambilPresensiTanggal,
  catatPresensiMasuk,
  catatPresensiPulang,
  ambilPengajuanCuti,
  ambilSatuPengajuan,
  ambilSemuaPengajuan,
  ajukanCuti,
  putuskanCuti,
  ambilSemuaKaryawan,
  ambilKaryawan,
  perbaruiProfil,
  perbaruiPeranKaryawan,
  ambilRingkasanDasbor,
  ambilRekapBulanan,
} = await import("../lib/data.js");

const { tanggalHariIni, bulanIni } = await import("../lib/waktu.js");

async function runTests() {
  console.log("🧪 Memulai Pengujian Semua Fitur CRUD terhadap Cloud Firestore...\n");
  const hasil = {};

  // 1. UJI BACA & TULIS PRESENSI
  console.log("--- 1. Uji Fitur Catat Presensi ---");
  try {
    const tgl = tanggalHariIni();
    const masuk = await catatPresensiMasuk("dina");
    console.log(`   ✓ Catat Masuk: ${masuk.tanggal} jamMasuk=${masuk.jamMasuk}`);

    const pulang = await catatPresensiPulang("dina");
    console.log(`   ✓ Catat Pulang: ${pulang.tanggal} jamPulang=${pulang.jamPulang}`);

    const bacaHariIni = await ambilPresensiTanggal("dina", tgl);
    console.log(`   ✓ Baca Presensi Tanggal (${tgl}): ditemukan id=${bacaHariIni?.id}`);

    const riwayat = await ambilPresensi("dina", bulanIni());
    console.log(`   ✓ Baca Riwayat Bulan (${bulanIni()}): ${riwayat.length} catatan presensi`);

    hasil["Catat Presensi (Masuk & Pulang)"] = "BERHASIL (Firestore)";
  } catch (err) {
    console.error("   ❌ Gagal Uji Presensi:", err);
    hasil["Catat Presensi (Masuk & Pulang)"] = `GAGAL: ${err.message}`;
  }

  // 2. UJI AJUKAN CUTI
  console.log("\n--- 2. Uji Fitur Ajukan Cuti ---");
  let idCutiUji = null;
  try {
    const baru = await ajukanCuti({
      karyawanId: "dina",
      tanggalMulai: "2026-11-10",
      tanggalSelesai: "2026-11-12",
      alasan: "Keperluan keluarga di luar kota (Data Uji CRUD)",
    });
    idCutiUji = baru.id;
    console.log(`   ✓ Ajukan Cuti: id=${baru.id}, status=${baru.status}`);

    const daftar = await ambilPengajuanCuti("dina");
    const ditemukan = daftar.find((c) => c.id === idCutiUji);
    console.log(`   ✓ Baca Daftar Cuti Dina: ditemukan id=${idCutiUji}? ${Boolean(ditemukan)}`);

    hasil["Ajukan Cuti"] = "BERHASIL (Firestore)";
  } catch (err) {
    console.error("   ❌ Gagal Uji Ajukan Cuti:", err);
    hasil["Ajukan Cuti"] = `GAGAL: ${err.message}`;
  }

  // 3. UJI SETUJUI & TOLAK CUTI
  console.log("\n--- 3. Uji Fitur Setujui atau Tolak Cuti ---");
  try {
    if (!idCutiUji) throw new Error("ID cuti uji tidak tersedia");

    // Setujui
    await putuskanCuti(idCutiUji, "disetujui", "Disetujui HRD untuk pengujian");
    const cekSetuju = await ambilSatuPengajuan(idCutiUji);
    console.log(`   ✓ Putuskan Disetujui: status=${cekSetuju?.status}, catatan="${cekSetuju?.catatanHrd}"`);

    // Tolak
    await putuskanCuti(idCutiUji, "ditolak", "Ditolak HRD untuk pengujian");
    const cekTolak = await ambilSatuPengajuan(idCutiUji);
    console.log(`   ✓ Putuskan Ditolak: status=${cekTolak?.status}, catatan="${cekTolak?.catatanHrd}"`);

    hasil["Setujui atau Tolak Cuti"] = "BERHASIL (Firestore)";
  } catch (err) {
    console.error("   ❌ Gagal Uji Putuskan Cuti:", err);
    hasil["Setujui atau Tolak Cuti"] = `GAGAL: ${err.message}`;
  }

  // 4. UJI UBAH PROFIL
  console.log("\n--- 4. Uji Fitur Ubah Profil ---");
  try {
    const sebelum = await ambilKaryawan("dina");
    console.log(`   ✓ Data Dina Awal: nama="${sebelum?.nama}"`);

    await perbaruiProfil("dina", { nama: "Dina Permata" });
    const setelah = await ambilKaryawan("dina");
    console.log(`   ✓ Setelah Diperbarui: nama="${setelah?.nama}"`);

    // Kembalikan nama semula
    await perbaruiProfil("dina", { nama: "Dina" });
    console.log(`   ✓ Nama Dina Dikembalikan ke: "Dina"`);

    hasil["Ubah Profil (Nama)"] = "BERHASIL (Firestore)";
  } catch (err) {
    console.error("   ❌ Gagal Uji Profil:", err);
    hasil["Ubah Profil (Nama)"] = `GAGAL: ${err.message}`;
  }

  // 5. UJI UBAH DATA KARYAWAN (PERAN)
  console.log("\n--- 5. Uji Fitur Ubah Data Karyawan (Peran) ---");
  try {
    const sebelum = await ambilKaryawan("rama");
    console.log(`   ✓ Peran Rama Awal: role="${sebelum?.role}"`);

    await perbaruiPeranKaryawan("rama", "hrd");
    const setelah = await ambilKaryawan("rama");
    console.log(`   ✓ Setelah Diperbarui: role="${setelah?.role}"`);

    // Kembalikan peran semula
    await perbaruiPeranKaryawan("rama", "karyawan");
    console.log(`   ✓ Peran Rama Dikembalikan ke: "karyawan"`);

    hasil["Ubah Data Karyawan (Peran)"] = "BERHASIL (Firestore)";
  } catch (err) {
    console.error("   ❌ Gagal Uji Ubah Peran:", err);
    hasil["Ubah Data Karyawan (Peran)"] = `GAGAL: ${err.message}`;
  }

  // 6. UJI BACA DASBOR & LAPORAN
  console.log("\n--- 6. Uji Baca Dasbor HRD & Laporan Bulanan ---");
  try {
    const dasbor = await ambilRingkasanDasbor(tanggalHariIni());
    console.log(`   ✓ Dasbor HRD: hadir=${dasbor.hadir}, terlambat=${dasbor.terlambat}, cutiMenunggu=${dasbor.cutiMenunggu}, karyawan=${dasbor.jumlahKaryawan}`);

    const laporan = await ambilRekapBulanan(bulanIni());
    console.log(`   ✓ Laporan Bulanan (${bulanIni()}): ${laporan.length} baris rekap`);

    hasil["Dasbor HRD & Laporan Presensi"] = "BERHASIL (Firestore)";
  } catch (err) {
    console.error("   ❌ Gagal Uji Dasbor/Laporan:", err);
    hasil["Dasbor HRD & Laporan Presensi"] = `GAGAL: ${err.message}`;
  }

  console.log("\n========================================");
  console.log("📋 RINGKASAN STATUS FITUR CRUD:");
  console.log("========================================");
  for (const [fitur, stat] of Object.entries(hasil)) {
    console.log(`• ${fitur}: ${stat}`);
  }

  process.exit(0);
}

runTests().catch((err) => {
  console.error("Fatal test error:", err);
  process.exit(1);
});
