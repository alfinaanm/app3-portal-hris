/**
 * Script verifikasi logika dokumen users/{uid}:
 * 1. Bila dokumen belum ada: dibuat dengan nama, email, role "karyawan", tanpa kata sandi.
 * 2. Bila dokumen sudah ada: tidak diubah (data lama dipertahankan).
 */

import { existsSync, readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { doc, getDoc, setDoc, deleteDoc } from "firebase/firestore";

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

const { db } = await import("../lib/firebase.js");
const { pastikanDokumenPengguna } = await import("../lib/auth.js");

async function runTest() {
  console.log("🧪 Memulai Verifikasi Pengecekan Dokumen users/{uid}...");

  const testUid = "test-auth-user-" + Date.now();
  const testRef = doc(db, "users", testUid);

  try {
    // Pastikan dokumen belum ada
    const awal = await getDoc(testRef);
    if (awal.exists()) {
      await deleteDoc(testRef);
    }

    // 1. UJI: Dokumen BELUM ADA
    console.log("\n1. Menguji pengguna baru (dokumen belum ada)...");
    const mockUserBaru = {
      uid: testUid,
      displayName: "Budi Santoso",
      email: "budi@sedap.id",
    };

    const hasilBaru = await pastikanDokumenPengguna(mockUserBaru);
    console.log("   Hasil dikembalikan:", hasilBaru);

    const docDiFirestore = await getDoc(testRef);
    if (!docDiFirestore.exists()) {
      throw new Error("Dokumen users/{uid} tidak terbuat di Firestore!");
    }
    const dataDiFirestore = docDiFirestore.data();
    console.log("   Data tersimpan di Firestore:", dataDiFirestore);

    if (dataDiFirestore.nama !== "Budi Santoso") throw new Error("Nama tidak sesuai");
    if (dataDiFirestore.email !== "budi@sedap.id") throw new Error("Email tidak sesuai");
    if (dataDiFirestore.role !== "karyawan") throw new Error("Role bukan 'karyawan'");
    if ("kataSandi" in dataDiFirestore || "password" in dataDiFirestore) {
      throw new Error("BAHAYA: Kata sandi tersimpan di dokumen users!");
    }
    console.log("   ✓ Berhasil: Dokumen baru dibuat dengan nama, email, role 'karyawan', tanpa kata sandi.");

    // 2. UJI: Dokumen SUDAH ADA (misal perannya sudah diubah jadi HRD oleh admin)
    console.log("\n2. Menguji pengguna lama (dokumen sudah ada)...");
    // Ubah perannya menjadi "hrd" dan nama kustom
    await setDoc(testRef, {
      nama: "Budi Santoso (HRD)",
      email: "budi@sedap.id",
      role: "hrd",
      keteranganTambahan: "jangan sampai hilang",
    });

    // Panggil lagi pastikanDokumenPengguna (simulasi masuk kembali)
    const mockUserLama = {
      uid: testUid,
      displayName: "Nama Dari Google Yang Berbeda",
      email: "budi@sedap.id",
    };

    const hasilLama = await pastikanDokumenPengguna(mockUserLama);
    console.log("   Hasil dikembalikan:", hasilLama);

    const docSetelahMasukLagi = await getDoc(testRef);
    const dataSetelah = docSetelahMasukLagi.data();
    console.log("   Data di Firestore setelah masuk lagi:", dataSetelah);

    if (dataSetelah.role !== "hrd") {
      throw new Error("GAGAL: Role hrd tertimpa menjadi " + dataSetelah.role);
    }
    if (dataSetelah.nama !== "Budi Santoso (HRD)") {
      throw new Error("GAGAL: Nama lama tertimpa!");
    }
    if (dataSetelah.keteranganTambahan !== "jangan sampai hilang") {
      throw new Error("GAGAL: Data lama berubah!");
    }
    console.log("   ✓ Berhasil: Dokumen yang sudah ada TIDAK DIUBAH (profil & peran HRD tetap aman).");

    console.log("\n✅ SEMUA PENGUJIAN LOGIKA DOKUMEN users/{uid} BERHASIL!");
  } finally {
    // Bersihkan dokumen uji
    await deleteDoc(testRef);
    console.log("🧹 Dokumen uji berhasil dibersihkan.");
    process.exit(0);
  }
}

runTest().catch((err) => {
  console.error("❌ Gagal pengujian:", err);
  process.exit(1);
});
