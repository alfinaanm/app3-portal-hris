"use client";

import Link from "next/link";
import { usePengguna } from "@/lib/pengguna";
import { useAmbilData } from "@/lib/useAmbilData";
import { ambilPresensiTanggal, ambilPengajuanCuti } from "@/lib/data";
import { tanggalHariIni, formatJam, formatTanggal } from "@/lib/waktu";
import KepalaHalaman from "@/components/KepalaHalaman";
import Ikon from "@/components/Ikon";
import Memuat from "@/components/Memuat";
import Gagal from "@/components/Gagal";

// Beranda karyawan (PRD 4.2) / Employee home (PRD 4.2)
export default function HalamanBeranda() {
  const { pengguna } = usePengguna();

  // Dua data diambil bersamaan / Both pieces of data are fetched together
  const { status, data, cobaLagi } = useAmbilData(async () => {
    if (!pengguna?.uid) return null;
    const hariIni = tanggalHariIni();
    const [presensi, cuti] = await Promise.all([
      ambilPresensiTanggal(pengguna.uid, hariIni),
      ambilPengajuanCuti(pengguna.uid),
    ]);
    return { hariIni, presensi, menunggu: cuti.filter((c) => c.status === "menunggu").length };
  }, [pengguna?.uid]);

  let teksPresensi = "Belum presensi hari ini";
  if (data?.presensi?.jamPulang) teksPresensi = "Sudah pulang";
  else if (data?.presensi) teksPresensi = `Sudah masuk pukul ${formatJam(data.presensi.jamMasuk)}`;

  return (
    <div className="space-y-8">
      <KepalaHalaman
        judul={`Halo, ${pengguna?.nama || "Karyawan"}!`}
        keterangan={data ? formatTanggal(data.hariIni) : "Ringkasan hari ini"}
        ikon="rumah"
      >
        <Link href="/presensi" className="tombol-kunyit">
          <Ikon nama="jam" />
          Catat Masuk
        </Link>
        <Link href="/cuti/baru" className="tombol-kedua">
          <Ikon nama="tambah" />
          Ajukan Cuti
        </Link>
      </KepalaHalaman>

      {status === "memuat" && <Memuat />}
      {status === "gagal" && <Gagal onCobaLagi={cobaLagi} />}
      {status === "berhasil" && (
        <div className="grid gap-6 sm:grid-cols-2">
          <Link href="/presensi" className="kartu group flex flex-col gap-4 p-6 transition hover:shadow-md">
            <span className="grid h-12 w-12 place-items-center rounded-xl border border-tinta/10 bg-sedap text-white">
              <Ikon nama="jam" className="h-6 w-6" />
            </span>
            <div>
              <p className="text-sm font-semibold tracking-wide text-sedap uppercase">Presensi hari ini</p>
              <p className="mt-1 text-2xl font-bold text-tinta tabular-nums">{teksPresensi}</p>
            </div>
            <span className="mt-auto text-sm font-bold text-redup group-hover:text-sedap">Buka Presensi Saya →</span>
          </Link>

          <Link href="/cuti" className="kartu group flex flex-col gap-4 bg-kunyit p-6 transition hover:shadow-md">
            <span className="grid h-12 w-12 place-items-center rounded-xl border border-tinta/10 bg-white text-tinta">
              <Ikon nama="kalender" className="h-6 w-6" />
            </span>
            <div>
              <p className="text-sm font-semibold tracking-wide text-tinta uppercase">Cuti menunggu</p>
              <p className="mt-1 text-tinta">
                <span className="text-5xl font-bold tabular-nums">{data.menunggu}</span>
                <span className="ml-2 text-lg font-bold">pengajuan</span>
              </p>
            </div>
            <span className="mt-auto text-sm font-bold text-tinta/80 group-hover:text-tinta">Buka Cuti Saya →</span>
          </Link>
        </div>
      )}
    </div>
  );
}
