"use client";

import { usePengguna } from "@/lib/pengguna";
import Memuat from "@/components/Memuat";
import AksesDitolak from "@/components/AksesDitolak";

/**
 * Route Guard khusus semua alamat /admin dan turunannya (PRD 6.2 & AGENTS.md).
 * - Hanya role "hrd" yang boleh membuka.
 * - Selain HRD, tampilkan halaman Akses Ditolak.
 * - Pengguna yang belum masuk diarahkan ke /masuk oleh layout induk (aplikasi).
 * - Selama role belum selesai dibaca dari users/{uid}, tampilkan layar Memuat... dan jangan memutuskan apa pun.
 */
export default function LayoutAdmin({ children }) {
  const { pengguna, memuat } = usePengguna();

  // Selama role belum selesai dibaca dari users/{uid}, tampilkan layar Memuat...
  if (memuat) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center p-8">
        <Memuat />
      </div>
    );
  }

  // Hanya role "hrd" yang boleh membuka. Selain HRD, tampilkan halaman Akses Ditolak.
  if (!pengguna || pengguna.role !== "hrd") {
    return <AksesDitolak />;
  }

  return children;
}
