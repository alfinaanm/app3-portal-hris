/**
 * Script seed data Cloud Firestore untuk Portal HRIS Sedap.
 *
 * Mengikuti skema PRD 7.1 dan AGENTS.md:
 * 1. Koleksi 'users': 5 karyawan (Dina, Nisa, Wulan, Rama, Sari)
 *    Field: nama, email, role (karyawan atau hrd)
 * 2. Koleksi 'presensi': Catatan presensi bulan ini (Oktober 2026)
 *    Field: karyawanId, tanggal (YYYY-MM-DD), jamMasuk (Timestamp), jamPulang (Timestamp/null)
 * 3. Koleksi 'pengajuan_cuti': 6 pengajuan cuti (status: menunggu, disetujui, ditolak)
 *    Field: karyawanId, tanggalMulai (Timestamp), tanggalSelesai (Timestamp),
 *           alasan, status, catatanHrd, diajukanPada (Timestamp)
 */

import { existsSync, readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore, doc, setDoc, Timestamp } from "firebase/firestore";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Muat .env.local jika ada
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

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

if (!firebaseConfig.projectId) {
  console.error("❌ ERROR: NEXT_PUBLIC_FIREBASE_PROJECT_ID belum diisi di .env.local");
  console.error("Pastikan .env.local sudah berisi konfigurasi Firebase proyek Anda.");
  process.exit(1);
}

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
const db = getFirestore(app);

// 1. Data 5 Karyawan (koleksi users)
const dataKaryawan = [
  { id: "dina", nama: "Dina", email: "dina@sedap.id", role: "karyawan" },
  { id: "nisa", nama: "Nisa", email: "nisa@sedap.id", role: "karyawan" },
  { id: "wulan", nama: "Wulan", email: "wulan@sedap.id", role: "hrd" },
  { id: "rama", nama: "Rama", email: "rama@sedap.id", role: "karyawan" },
  { id: "sari", nama: "Sari", email: "sari@sedap.id", role: "karyawan" },
];

// 2. Data Presensi Bulan Ini (Oktober 2026)
const hariKerjaOktober = [
  "2026-10-01",
  "2026-10-02",
  "2026-10-05",
  "2026-10-06",
  "2026-10-07",
  "2026-10-08",
  "2026-10-09",
];

const terlambatDina = {
  "2026-10-06": "08:09",
};

function buatPresensiBulanIni() {
  const hasil = [];

  // Presensi Dina (lengkap sesuai lib/dataContoh.js)
  for (const tgl of hariKerjaOktober) {
    const jam = terlambatDina[tgl] ?? `07:${40 + (parseInt(tgl.slice(-2), 10) % 15)}`;
    const masuk = new Date(`${tgl}T${jam}:00+07:00`);
    const pulang = tgl === "2026-10-09" ? null : new Date(`${tgl}T17:05:00+07:00`);

    hasil.push({
      id: `dina-${tgl}`,
      karyawanId: "dina",
      tanggal: tgl,
      jamMasuk: Timestamp.fromDate(masuk),
      jamPulang: pulang ? Timestamp.fromDate(pulang) : null,
    });
  }

  // Presensi Nisa, Rama, Sari, Wulan untuk hari kerja aktif
  const stafLain = ["nisa", "wulan", "rama", "sari"];
  for (const kid of stafLain) {
    for (const tgl of hariKerjaOktober.slice(-3)) {
      const masuk = new Date(`${tgl}T07:45:00+07:00`);
      const pulang = tgl === "2026-10-09" ? null : new Date(`${tgl}T17:00:00+07:00`);
      hasil.push({
        id: `${kid}-${tgl}`,
        karyawanId: kid,
        tanggal: tgl,
        jamMasuk: Timestamp.fromDate(masuk),
        jamPulang: pulang ? Timestamp.fromDate(pulang) : null,
      });
    }
  }

  return hasil;
}

// 3. Data 6 Pengajuan Cuti (status: menunggu, disetujui, ditolak)
const dataPengajuanCuti = [
  {
    id: "C001",
    karyawanId: "dina",
    tanggalMulai: Timestamp.fromDate(new Date("2026-09-24T00:00:00+07:00")),
    tanggalSelesai: Timestamp.fromDate(new Date("2026-09-25T00:00:00+07:00")),
    alasan: "Menghadiri pernikahan saudara di Bandung",
    status: "disetujui",
    catatanHrd: "Disetujui. Selamat untuk keluarga.",
    diajukanPada: Timestamp.fromDate(new Date("2026-09-10T09:15:00+07:00")),
  },
  {
    id: "C002",
    karyawanId: "dina",
    tanggalMulai: Timestamp.fromDate(new Date("2026-10-01T00:00:00+07:00")),
    tanggalSelesai: Timestamp.fromDate(new Date("2026-10-02T00:00:00+07:00")),
    alasan: "Urusan keluarga",
    status: "ditolak",
    catatanHrd: "Bertepatan dengan pesanan katering besar. Mohon ajukan tanggal lain.",
    diajukanPada: Timestamp.fromDate(new Date("2026-09-21T13:40:00+07:00")),
  },
  {
    id: "C003",
    karyawanId: "dina",
    tanggalMulai: Timestamp.fromDate(new Date("2026-10-19T00:00:00+07:00")),
    tanggalSelesai: Timestamp.fromDate(new Date("2026-10-21T00:00:00+07:00")),
    alasan: "Liburan bersama keluarga",
    status: "menunggu",
    catatanHrd: "",
    diajukanPada: Timestamp.fromDate(new Date("2026-10-05T08:30:00+07:00")),
  },
  {
    id: "C004",
    karyawanId: "nisa",
    tanggalMulai: Timestamp.fromDate(new Date("2026-09-14T00:00:00+07:00")),
    tanggalSelesai: Timestamp.fromDate(new Date("2026-09-14T00:00:00+07:00")),
    alasan: "Kontrol kesehatan ke dokter",
    status: "disetujui",
    catatanHrd: "Semoga lekas sehat.",
    diajukanPada: Timestamp.fromDate(new Date("2026-09-08T10:05:00+07:00")),
  },
  {
    id: "C005",
    karyawanId: "nisa",
    tanggalMulai: Timestamp.fromDate(new Date("2026-10-12T00:00:00+07:00")),
    tanggalSelesai: Timestamp.fromDate(new Date("2026-10-13T00:00:00+07:00")),
    alasan: "Mengurus pindah rumah",
    status: "menunggu",
    catatanHrd: "",
    diajukanPada: Timestamp.fromDate(new Date("2026-10-02T16:20:00+07:00")),
  },
  {
    id: "C006",
    karyawanId: "nisa",
    tanggalMulai: Timestamp.fromDate(new Date("2026-10-26T00:00:00+07:00")),
    tanggalSelesai: Timestamp.fromDate(new Date("2026-10-26T00:00:00+07:00")),
    alasan: "Menghadiri wisuda adik",
    status: "menunggu",
    catatanHrd: "",
    diajukanPada: Timestamp.fromDate(new Date("2026-10-07T11:00:00+07:00")),
  },
];

async function jalankanSeed() {
  console.log("🌱 Memulai pengisian seed data ke Cloud Firestore...\n");

  // 1. Isi koleksi users (5 karyawan)
  console.log("1. Mengisi koleksi 'users' (5 karyawan)...");
  for (const k of dataKaryawan) {
    const { id, ...data } = k;
    await setDoc(doc(db, "users", id), data);
    console.log(`   ✓ users/${id}: ${data.nama} (${data.role})`);
  }

  // 2. Isi koleksi presensi (bulan ini)
  console.log("\n2. Mengisi koleksi 'presensi' (bulan ini: Oktober 2026)...");
  const presensiList = buatPresensiBulanIni();
  for (const p of presensiList) {
    const { id, ...data } = p;
    await setDoc(doc(db, "presensi", id), data);
  }
  console.log(`   ✓ Berhasil mengisi ${presensiList.length} catatan presensi`);

  // 3. Isi koleksi pengajuan_cuti (6 pengajuan: menunggu, disetujui, ditolak)
  console.log("\n3. Mengisi koleksi 'pengajuan_cuti' (6 pengajuan cuti)...");
  for (const c of dataPengajuanCuti) {
    const { id, ...data } = c;
    await setDoc(doc(db, "pengajuan_cuti", id), data);
    console.log(`   ✓ pengajuan_cuti/${id}: [${data.status}] ${data.alasan}`);
  }

  console.log("\n✅ Selesai! Semua seed data berhasil diisi ke Cloud Firestore.");
  process.exit(0);
}

jalankanSeed().catch((err) => {
  console.error("\n❌ Terjadi kesalahan saat mengisi seed data:", err);
  process.exit(1);
});
