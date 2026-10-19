/**
 * Modul data Portal HRIS Sedap.
 * Semua fungsi membaca dan menulis langsung ke Cloud Firestore.
 * Sesuai PRD Bab 7.1 dan AGENTS.md.
 */

import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  query,
  where,
  Timestamp,
} from "firebase/firestore";
import { db } from "./firebase.js";
import { keTanggal, terlambat, tanggalHariIni } from "./waktu.js";

/**
 * Konversi timestamp Firestore ke objek Date JavaScript standar
 * agar kompatibel dengan pembantu waktu (waktu.js).
 */
function toDate(val) {
  if (!val) return null;
  if (typeof val.toDate === "function") return val.toDate();
  if (val instanceof Date) return val;
  return new Date(val);
}

function konversiPresensi(p) {
  return {
    ...p,
    jamMasuk: toDate(p.jamMasuk),
    jamPulang: toDate(p.jamPulang),
  };
}

function konversiCuti(c) {
  return {
    ...c,
    tanggalMulai: toDate(c.tanggalMulai),
    tanggalSelesai: toDate(c.tanggalSelesai),
    diajukanPada: toDate(c.diajukanPada),
  };
}

async function ambilPetaNamaKaryawan() {
  const snap = await getDocs(collection(db, "users"));
  const peta = {};
  snap.forEach((d) => {
    peta[d.id] = d.data().nama ?? d.id;
  });
  return peta;
}

/**
 * Mengambil catatan presensi satu karyawan untuk bulan tertentu (misal: "2026-10").
 */
export async function ambilPresensi(karyawanId, bulan) {
  if (!karyawanId || !bulan) return [];
  const q = query(
    collection(db, "presensi"),
    where("karyawanId", "==", karyawanId)
  );
  const snap = await getDocs(q);
  return snap.docs
    .map((d) => ({ id: d.id, ...d.data() }))
    .filter((p) => p.tanggal && p.tanggal.startsWith(bulan))
    .sort((a, b) => b.tanggal.localeCompare(a.tanggal))
    .map(konversiPresensi);
}

/**
 * Mengambil catatan presensi karyawan pada tanggal tertentu.
 */
export async function ambilPresensiTanggal(karyawanId, tanggal) {
  if (!karyawanId || !tanggal) return null;
  const docId = `${karyawanId}-${tanggal}`;
  const ref = doc(db, "presensi", docId);
  const s = await getDoc(ref);
  if (s.exists()) {
    return konversiPresensi({ id: s.id, ...s.data() });
  }

  // Cari berdasarkan field jika ID dokumen berbeda
  const q = query(
    collection(db, "presensi"),
    where("karyawanId", "==", karyawanId),
    where("tanggal", "==", tanggal)
  );
  const snap = await getDocs(q);
  if (!snap.empty) {
    return konversiPresensi({ id: snap.docs[0].id, ...snap.docs[0].data() });
  }
  return null;
}

/**
 * Mencatat jam masuk karyawan hari ini ke Firestore (PRD 4.3).
 */
export async function catatPresensiMasuk(karyawanId) {
  const tanggal = tanggalHariIni();
  const docId = `${karyawanId}-${tanggal}`;
  const docRef = doc(db, "presensi", docId);
  const existing = await getDoc(docRef);

  if (existing.exists() && existing.data().jamMasuk) {
    return konversiPresensi({ id: existing.id, ...existing.data() });
  }

  const data = {
    karyawanId,
    tanggal,
    jamMasuk: Timestamp.now(),
    jamPulang: null,
  };
  await setDoc(docRef, data, { merge: true });
  return konversiPresensi({ id: docId, ...data });
}

/**
 * Mencatat jam pulang karyawan hari ini ke Firestore (PRD 4.3).
 */
export async function catatPresensiPulang(karyawanId) {
  const tanggal = tanggalHariIni();
  const docId = `${karyawanId}-${tanggal}`;
  const docRef = doc(db, "presensi", docId);
  const now = Timestamp.now();

  await updateDoc(docRef, { jamPulang: now });
  const updated = await getDoc(docRef);
  return konversiPresensi({ id: docId, ...updated.data() });
}

/**
 * Mengambil semua pengajuan cuti milik satu karyawan (PRD 4.4.2).
 */
export async function ambilPengajuanCuti(karyawanId) {
  if (!karyawanId) return [];
  const q = query(
    collection(db, "pengajuan_cuti"),
    where("karyawanId", "==", karyawanId)
  );
  const snap = await getDocs(q);
  return snap.docs
    .map((d) => konversiCuti({ id: d.id, ...d.data() }))
    .sort((a, b) => (b.diajukanPada ?? 0) - (a.diajukanPada ?? 0));
}

/**
 * Mengambil satu pengajuan cuti berdasarkan ID beserta nama karyawan pemohon.
 */
export async function ambilSatuPengajuan(id) {
  if (!id) return null;
  const ref = doc(db, "pengajuan_cuti", id);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;

  const c = konversiCuti({ id: snap.id, ...snap.data() });
  const namaPeta = await ambilPetaNamaKaryawan();
  return { ...c, nama: namaPeta[c.karyawanId] ?? "(tidak dikenal)" };
}

/**
 * Mengambil semua pengajuan cuti untuk HRD dengan saringan status (PRD 4.8).
 */
export async function ambilSemuaPengajuan(status) {
  const snap = await getDocs(collection(db, "pengajuan_cuti"));
  const namaPeta = await ambilPetaNamaKaryawan();

  return snap.docs
    .map((d) => {
      const c = konversiCuti({ id: d.id, ...d.data() });
      return { ...c, nama: namaPeta[c.karyawanId] ?? "(tidak dikenal)" };
    })
    .filter((c) => !status || status === "semua" || c.status === status)
    .sort((a, b) => (b.diajukanPada ?? 0) - (a.diajukanPada ?? 0));
}

/**
 * Menambahkan pengajuan cuti baru ke koleksi pengajuan_cuti di Firestore (PRD 4.4.1).
 */
export async function ajukanCuti({ karyawanId, tanggalMulai, tanggalSelesai, alasan }) {
  const snap = await getDocs(collection(db, "pengajuan_cuti"));
  let maxId = 0;
  snap.forEach((d) => {
    const match = d.id.match(/^C(\d+)$/);
    if (match) {
      const n = parseInt(match[1], 10);
      if (n > maxId) maxId = n;
    }
  });

  const idBaru = `C${String(maxId + 1).padStart(3, "0")}`;
  const tMulai = new Date(`${tanggalMulai}T00:00:00`);
  const tSelesai = new Date(`${tanggalSelesai}T00:00:00`);

  const data = {
    karyawanId,
    tanggalMulai: Timestamp.fromDate(tMulai),
    tanggalSelesai: Timestamp.fromDate(tSelesai),
    alasan,
    status: "menunggu",
    catatanHrd: "",
    diajukanPada: Timestamp.now(),
  };

  await setDoc(doc(db, "pengajuan_cuti", idBaru), data);
  return { id: idBaru, ...konversiCuti(data) };
}

/**
 * HRD menyetujui atau menolak pengajuan cuti di Firestore (PRD 4.8).
 */
export async function putuskanCuti(id, status, catatanHrd = "") {
  const ref = doc(db, "pengajuan_cuti", id);
  await updateDoc(ref, {
    status,
    catatanHrd,
  });
}

/**
 * Mengambil daftar seluruh karyawan terdaftar dari koleksi users (PRD 4.7).
 */
export async function ambilSemuaKaryawan() {
  const snap = await getDocs(collection(db, "users"));
  return snap.docs
    .map((d) => ({ id: d.id, ...d.data() }))
    .sort((a, b) => (a.nama ?? "").localeCompare(b.nama ?? ""));
}

/**
 * Mengambil satu dokumen karyawan dari koleksi users.
 */
export async function ambilKaryawan(id) {
  if (!id) return null;
  const ref = doc(db, "users", id);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() };
}

/**
 * Memperbarui nama karyawan di profil (koleksi users) (PRD 4.5).
 */
export async function perbaruiProfil(uid, { nama }) {
  const ref = doc(db, "users", uid);
  await updateDoc(ref, { nama });
}

/**
 * Memperbarui peran karyawan (koleksi users) oleh HRD (PRD 4.7).
 */
export async function perbaruiPeranKaryawan(id, role) {
  const ref = doc(db, "users", id);
  await updateDoc(ref, { role });
}

/**
 * Menghitung ringkasan Dasbor HRD dari Firestore (PRD 4.6).
 */
export async function ambilRingkasanDasbor(tanggal) {
  const [presensiSnap, cutiSnap, usersSnap] = await Promise.all([
    getDocs(query(collection(db, "presensi"), where("tanggal", "==", tanggal))),
    getDocs(query(collection(db, "pengajuan_cuti"), where("status", "==", "menunggu"))),
    getDocs(collection(db, "users")),
  ]);

  const hariIni = presensiSnap.docs.map((d) => konversiPresensi({ id: d.id, ...d.data() }));

  return {
    hadir: hariIni.length,
    terlambat: hariIni.filter((p) => terlambat(p.jamMasuk)).length,
    cutiMenunggu: cutiSnap.size,
    jumlahKaryawan: usersSnap.size,
  };
}

/**
 * Rekap per karyawan untuk Laporan kehadiran bulanan dari Firestore (PRD 4.9).
 */
export async function ambilRekapBulanan(bulan) {
  const [usersSnap, presensiSnap, cutiSnap] = await Promise.all([
    getDocs(collection(db, "users")),
    getDocs(collection(db, "presensi")),
    getDocs(query(collection(db, "pengajuan_cuti"), where("status", "==", "disetujui"))),
  ]);

  const listUsers = usersSnap.docs
    .map((d) => ({ id: d.id, ...d.data() }))
    .sort((a, b) => (a.nama ?? "").localeCompare(b.nama ?? ""));

  const listPresensi = presensiSnap.docs
    .map((d) => konversiPresensi({ id: d.id, ...d.data() }))
    .filter((p) => p.tanggal && p.tanggal.startsWith(bulan));

  const listCuti = cutiSnap.docs.map((d) => konversiCuti({ id: d.id, ...d.data() }));

  return listUsers.map((u) => {
    const hadir = listPresensi.filter((p) => p.karyawanId === u.id);
    let cutiDisetujui = 0;
    for (const c of listCuti) {
      if (c.karyawanId !== u.id) continue;
      if (!c.tanggalMulai || !c.tanggalSelesai) continue;
      const d = new Date(c.tanggalMulai);
      while (d <= c.tanggalSelesai) {
        if (keTanggal(d).startsWith(bulan)) cutiDisetujui++;
        d.setDate(d.getDate() + 1);
      }
    }

    return {
      karyawanId: u.id,
      nama: u.nama,
      hariHadir: hadir.length,
      terlambat: hadir.filter((p) => terlambat(p.jamMasuk)).length,
      cutiDisetujui,
    };
  });
}
