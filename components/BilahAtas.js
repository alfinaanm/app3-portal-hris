"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { usePengguna } from "@/lib/pengguna";
import Ikon from "./Ikon";

/**
 * Bilah Atas setiap halaman aplikasi.
 * Menampilkan nama dan peran pengguna yang dibaca dari dokumen users/{uid}.
 * Menyediakan tombol Keluar untuk keluar akun dan kembali ke /masuk.
 */
export default function BilahAtas() {
  const { pengguna, memuat, keluar } = usePengguna();
  const router = useRouter();

  async function handleKeluar() {
    try {
      await keluar();
      router.replace("/masuk");
    } catch (err) {
      console.error("Gagal keluar:", err);
      router.replace("/masuk");
    }
  }

  const nama = pengguna?.nama || "Pengguna";
  const role = pengguna?.role === "hrd" ? "HRD" : "Karyawan";
  const inisial = nama.trim().charAt(0).toUpperCase() || "P";

  return (
    <header className="flex items-center justify-between gap-4 bg-sedap px-4 py-3 text-white md:px-6">
      <Link href="/beranda" className="flex items-center gap-2.5">
        <span className="grid h-9 w-9 place-items-center rounded-lg border border-tinta/10 bg-kunyit text-lg font-bold text-tinta shadow-tipis">
          S
        </span>
        <span className="text-xl font-bold tracking-tight">Portal HRIS</span>
      </Link>

      {memuat ? (
        <div className="h-9 w-32 animate-pulse rounded-lg bg-white/20" />
      ) : pengguna ? (
        <div className="flex items-center gap-3">
          <div className="text-right leading-tight">
            <div className="text-sm font-bold text-white">{nama}</div>
            <div className="mt-0.5">
              <span
                className={`inline-block rounded-md px-2 py-0.5 text-xs font-bold ${
                  pengguna.role === "hrd"
                    ? "bg-kunyit text-tinta shadow-tipis"
                    : "bg-white/20 text-white"
                }`}
              >
                {role}
              </span>
            </div>
          </div>

          {/* Inisial nama sebagai avatar */}
          <span
            aria-hidden="true"
            className="grid h-10 w-10 place-items-center rounded-full border border-tinta/10 bg-krem font-bold text-tinta shadow-tipis"
          >
            {inisial}
          </span>

          <button
            type="button"
            onClick={handleKeluar}
            title="Keluar dari akun dan kembali ke halaman Masuk"
            className="ml-2 flex items-center gap-1.5 rounded-lg border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-white/20 cursor-pointer"
          >
            <Ikon nama="keluar" className="h-4 w-4" />
            <span>Keluar</span>
          </button>
        </div>
      ) : null}
    </header>
  );
}
