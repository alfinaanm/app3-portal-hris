"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { doc, onSnapshot } from "firebase/firestore";
import { auth, db } from "./firebase.js";
import { keluar as authKeluar, pastikanDokumenPengguna } from "./auth.js";

const PenggunaContext = createContext({
  pengguna: null,
  memuat: true,
  keluar: async () => {},
});

/**
 * Provider untuk mendistribusikan status autentikasi dan profil pengguna ke seluruh halaman.
 */
export function PenggunaProvider({ children }) {
  const [pengguna, setPengguna] = useState(null);
  const [memuat, setMemuat] = useState(true);

  useEffect(() => {
    let unsubDoc = null;

    const unsubAuth = onAuthStateChanged(auth, async (user) => {
      // Hentikan listener dokumen sebelumnya jika ada
      if (unsubDoc) {
        unsubDoc();
        unsubDoc = null;
      }

      if (!user) {
        setPengguna(null);
        setMemuat(false);
        return;
      }

      // Setelah berhasil masuk, cek dokumen users/{uid}. Bila belum ada buat role "karyawan".
      try {
        await pastikanDokumenPengguna(user);
      } catch (err) {
        console.warn("Gagal memastikan dokumen pengguna di Firestore:", err);
      }

      // Pengguna masuk: baca profil dari koleksi 'users' di Firestore secara real-time
      const docRef = doc(db, "users", user.uid);
      unsubDoc = onSnapshot(
        docRef,
        (snap) => {
          if (snap.exists()) {
            const d = snap.data();
            const role = (d.role || "karyawan").toLowerCase().trim();
            setPengguna({
              uid: user.uid,
              nama: d.nama || user.displayName || user.email?.split("@")[0] || "Karyawan",
              email: d.email || user.email || "",
              role,
            });
          } else {
            // Profil fallback jika dokumen belum ada
            setPengguna({
              uid: user.uid,
              nama: user.displayName || user.email?.split("@")[0] || "Karyawan",
              email: user.email || "",
              role: "karyawan",
            });
          }
          setMemuat(false);
        },
        (error) => {
          console.warn("Gagal membaca profil pengguna dari Firestore:", error);
          setPengguna({
            uid: user.uid,
            nama: user.displayName || "Karyawan",
            email: user.email || "",
            role: "karyawan",
          });
          setMemuat(false);
        }
      );
    });

    return () => {
      if (unsubDoc) unsubDoc();
      unsubAuth();
    };
  }, []);

  async function keluar() {
    await authKeluar();
    setPengguna(null);
  }

  return (
    <PenggunaContext.Provider value={{ pengguna, memuat, keluar }}>
      {children}
    </PenggunaContext.Provider>
  );
}

/**
 * Hook usePengguna untuk membaca pengguna yang sedang aktif dan status memuat.
 * Mengembalikan objek: { pengguna, memuat, keluar }
 */
export function usePengguna() {
  const context = useContext(PenggunaContext);
  return context;
}
