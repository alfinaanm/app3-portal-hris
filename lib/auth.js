import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  updateProfile,
} from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { auth, db } from "./firebase.js";

/**
 * Menerjemahkan kode galat Firebase Auth ke pesan bahasa Indonesia yang ramah pengguna.
 */
export function formatPesanGalatAuth(error) {
  if (!error) return "";
  const kode = error.code || "";

  switch (kode) {
    case "auth/email-already-in-use":
      return "Email ini sudah terdaftar. Silakan masuk atau gunakan email lain.";
    case "auth/invalid-email":
      return "Format email tidak valid.";
    case "auth/user-not-found":
    case "auth/wrong-password":
    case "auth/invalid-credential":
      return "Email atau kata sandi salah. Silakan periksa kembali.";
    case "auth/weak-password":
      return "Kata sandi terlalu lemah. Gunakan minimal 6 karakter.";
    case "auth/popup-closed-by-user":
      return "Jendela masuk Google ditutup sebelum proses selesai.";
    case "auth/popup-blocked":
      return "Peramban memblokir pop-up. Izinkan pop-up untuk masuk dengan Google.";
    case "auth/operation-not-allowed":
      return "Metode masuk ini belum diaktifkan di Firebase Console. Buka Authentication > Sign-in method untuk mengaktifkannya.";
    case "auth/unauthorized-domain":
      return "Domain ini belum diizinkan di Firebase Console. Tambahkan domain ini ke Authentication > Settings > Authorized domains.";
    case "auth/network-request-failed":
      return "Gagal terhubung ke jaringan. Periksa koneksi internet Anda.";
    case "auth/too-many-requests":
      return "Terlalu banyak percobaan gagal. Silakan tunggu beberapa saat.";
    default:
      return error.message || "Terjadi kesalahan saat proses autentikasi.";
  }
}

/**
 * Memeriksa dokumen users/{uid} di Firestore setelah pengguna berhasil masuk dengan cara apa pun.
 * - Bila belum ada: buat dokumen berisi nama, email, dan role "karyawan".
 * - Bila sudah ada: jangan diubah (pertahankan data lama, termasuk bila perannya hrd).
 * - Jangan simpan kata sandi di dokumen ini.
 */
export async function pastikanDokumenPengguna(user, fallbackNama = "") {
  if (!user || !user.uid) return null;

  const userRef = doc(db, "users", user.uid);
  const snap = await getDoc(userRef);

  if (!snap.exists()) {
    const nama =
      (fallbackNama && fallbackNama.trim()) ||
      user.displayName ||
      (user.email ? user.email.split("@")[0] : "") ||
      "Karyawan";
    const email = user.email || "";
    const role = "karyawan";

    // Hanya nama, email, dan role. Kata sandi tidak pernah disimpan di Firestore.
    const dataBaru = {
      nama,
      email,
      role,
    };

    await setDoc(userRef, dataBaru);
    return dataBaru;
  }

  // Bila sudah ada, jangan diubah sama sekali
  const dataLama = snap.data();
  return {
    ...dataLama,
    role: (dataLama.role || "karyawan").toLowerCase().trim(),
  };
}

/**
 * Masuk menggunakan email dan kata sandi (PRD 4.1).
 * Setelah berhasil, memeriksa dokumen users/{uid} di Firestore via pastikanDokumenPengguna.
 */
export async function masukDenganEmail(email, kataSandi) {
  const kredensial = await signInWithEmailAndPassword(auth, email.trim(), kataSandi);
  const user = kredensial.user;

  // Cek dokumen users/{uid}. Bila belum ada buat role karyawan, bila sudah ada jangan diubah.
  const profil = await pastikanDokumenPengguna(user);
  const role = profil?.role || "karyawan";

  return { user, role };
}

/**
 * Pendaftaran akun baru dengan nama, email, dan kata sandi (PRD 4.1).
 * Setelah berhasil, membuat dokumen di koleksi users/{uid} dengan role "karyawan" (tanpa kata sandi).
 */
export async function daftarDenganEmail(nama, email, kataSandi) {
  const emailBersih = email.trim().toLowerCase();
  const namaBersih = nama.trim();

  const kredensial = await createUserWithEmailAndPassword(auth, emailBersih, kataSandi);
  const user = kredensial.user;

  // Simpan nama tampilan di profil Firebase Auth
  try {
    await updateProfile(user, { displayName: namaBersih });
  } catch (err) {
    console.warn("Gagal memperbarui displayName di Auth:", err);
  }

  // Cek dokumen users/{uid}. Bila belum ada buat dokumen berisi nama, email, role karyawan.
  const profil = await pastikanDokumenPengguna(user, namaBersih);
  const role = profil?.role || "karyawan";

  return { user, role };
}

/**
 * Masuk atau daftar akun lewat Google Popup (PRD 4.1).
 * Setelah berhasil masuk, cek dokumen users/{uid} di Firestore:
 * Bila belum ada, buat dokumen berisi nama, email, dan role "karyawan".
 * Bila sudah ada, jangan diubah (profil lama tidak tertimpa).
 */
export async function masukDenganGoogle() {
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: "select_account" });

  const kredensial = await signInWithPopup(auth, provider);
  const user = kredensial.user;

  // Cek dokumen users/{uid}. Bila belum ada buat role karyawan, bila sudah ada jangan diubah.
  const profil = await pastikanDokumenPengguna(user);
  const role = profil?.role || "karyawan";

  return { user, role };
}

/**
 * Keluar dari akun (Sign Out).
 */
export async function keluar() {
  await signOut(auth);
}
