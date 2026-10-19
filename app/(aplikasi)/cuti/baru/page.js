"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { usePengguna } from "@/lib/pengguna";
import { ajukanCuti } from "@/lib/data";
import KepalaHalaman from "@/components/KepalaHalaman";
import Ikon from "@/components/Ikon";

const kosong = { tanggalMulai: "", tanggalSelesai: "", alasan: "" };

// Ajukan Cuti (PRD 4.4.1) / Submit leave (PRD 4.4.1)
export default function HalamanAjukanCuti() {
  const router = useRouter();
  const { pengguna } = usePengguna();
  const [isian, setIsian] = useState(kosong);
  const [galat, setGalat] = useState({});
  const [tersimpan, setTersimpan] = useState(false);

  const ubah = (e) => setIsian({ ...isian, [e.target.name]: e.target.value });

  async function kirim(e) {
    e.preventDefault();
    const g = {};
    if (!isian.tanggalMulai) g.tanggalMulai = "Tanggal mulai wajib diisi.";
    if (!isian.tanggalSelesai) g.tanggalSelesai = "Tanggal selesai wajib diisi.";
    // Format "2026-10-07" bisa dibandingkan langsung sebagai teks / "2026-10-07" strings compare correctly as text
    else if (isian.tanggalMulai && isian.tanggalSelesai < isian.tanggalMulai)
      g.tanggalSelesai = "Tanggal selesai harus sama atau setelah tanggal mulai";
    if (!isian.alasan.trim()) g.alasan = "Alasan wajib diisi.";
    setGalat(g);
    if (Object.keys(g).length > 0 || !pengguna?.uid) return;

    setTersimpan(true);
    try {
      await ajukanCuti({
        karyawanId: pengguna.uid,
        tanggalMulai: isian.tanggalMulai,
        tanggalSelesai: isian.tanggalSelesai,
        alasan: isian.alasan.trim(),
      });
      setTimeout(() => {
        setIsian(kosong);
        setTersimpan(false);
        router.push("/cuti");
      }, 1000);
    } catch (err) {
      console.error("Gagal mengajukan cuti:", err);
      setTersimpan(false);
    }
  }

  return (
    <div className="max-w-2xl space-y-8">
      <KepalaHalaman judul="Ajukan Cuti" keterangan="Isi tanggal dan alasan. HRD memutuskan pengajuanmu di halaman Persetujuan Cuti." warna="kunyit" ikon="tambah">
        <Link href="/cuti" className="tombol-kedua">
          <Ikon nama="kembali" />
          Daftar Cuti
        </Link>
      </KepalaHalaman>

      <form onSubmit={kirim} noValidate className="kartu space-y-5 p-6">
        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label htmlFor="tanggalMulai" className="label">Tanggal mulai</label>
            <input id="tanggalMulai" name="tanggalMulai" type="date" value={isian.tanggalMulai} onChange={ubah} className="isian tabular-nums" />
            {galat.tanggalMulai && <p className="galat">{galat.tanggalMulai}</p>}
          </div>
          <div>
            <label htmlFor="tanggalSelesai" className="label">Tanggal selesai</label>
            <input id="tanggalSelesai" name="tanggalSelesai" type="date" value={isian.tanggalSelesai} onChange={ubah} className="isian tabular-nums" />
            {galat.tanggalSelesai && <p className="galat">{galat.tanggalSelesai}</p>}
          </div>
        </div>
        <div>
          <label htmlFor="alasan" className="label">Alasan</label>
          <textarea id="alasan" name="alasan" rows={4} value={isian.alasan} onChange={ubah} className="isian" />
          {galat.alasan && <p className="galat">{galat.alasan}</p>}
        </div>

        <button type="submit" disabled={tersimpan} className="tombol-utama px-8 py-3 text-lg">
          Kirim
        </button>
        {tersimpan && (
          <p role="status" className="rounded-xl border border-disetujui bg-disetujui/15 p-3 font-bold text-tinta">
            Pengajuan cuti berhasil disimpan ke Firestore. Kembali ke Daftar Cuti...
          </p>
        )}
      </form>
    </div>
  );
}
