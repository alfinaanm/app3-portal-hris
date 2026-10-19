"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { usePengguna } from "@/lib/pengguna";
import { useAmbilData } from "@/lib/useAmbilData";
import { ambilPresensi, ambilPresensiTanggal, catatPresensiMasuk, catatPresensiPulang } from "@/lib/data";
import { bulanIni, formatBulan, formatJam, formatTanggal, terlambat, tanggalHariIni } from "@/lib/waktu";
import KepalaHalaman from "@/components/KepalaHalaman";
import Ikon from "@/components/Ikon";
import Memuat from "@/components/Memuat";
import Kosong from "@/components/Kosong";
import Gagal from "@/components/Gagal";

// Presensi Saya (PRD 4.3) / My Attendance (PRD 4.3)
export default function HalamanPresensi() {
  const { pengguna } = usePengguna();
  const router = useRouter();
  const searchParams = useSearchParams();

  // Bulan disimpan di alamat (?bulan=2026-09) supaya tetap terpilih saat dimuat ulang / Month lives in the URL (?bulan=2026-09) so it survives a reload
  const dariAlamat = searchParams.get("bulan");
  const bulan = /^\d{4}-\d{2}$/.test(dariAlamat ?? "") ? dariAlamat : bulanIni();

  const { status, data, cobaLagi } = useAmbilData(() => ambilPresensi(pengguna?.uid, bulan), [pengguna?.uid, bulan]);

  const [jamMasuk, setJamMasuk] = useState(null);
  const [jamPulang, setJamPulang] = useState(null);
  const [memproses, setMemproses] = useState(false);

  // Ambil presensi hari ini dari Firestore saat halaman dimuat
  useEffect(() => {
    if (!pengguna?.uid) return;
    let aktif = true;
    ambilPresensiTanggal(pengguna.uid, tanggalHariIni()).then((p) => {
      if (aktif && p) {
        if (p.jamMasuk) setJamMasuk(p.jamMasuk);
        if (p.jamPulang) setJamPulang(p.jamPulang);
      }
    });
    return () => {
      aktif = false;
    };
  }, [pengguna?.uid]);

  async function handleCatatMasuk() {
    if (!pengguna?.uid) return;
    setMemproses(true);
    try {
      const p = await catatPresensiMasuk(pengguna.uid);
      setJamMasuk(p.jamMasuk);
      cobaLagi();
    } catch (err) {
      console.error("Gagal catat masuk:", err);
    } finally {
      setMemproses(false);
    }
  }

  async function handleCatatPulang() {
    if (!pengguna?.uid) return;
    setMemproses(true);
    try {
      const p = await catatPresensiPulang(pengguna.uid);
      setJamPulang(p.jamPulang);
      cobaLagi();
    } catch (err) {
      console.error("Gagal catat pulang:", err);
    } finally {
      setMemproses(false);
    }
  }

  const jumlahTerlambat = data ? data.filter((p) => terlambat(p.jamMasuk)).length : 0;

  return (
    <div className="space-y-8">
      <KepalaHalaman judul="Presensi Saya" keterangan="Catat jam masuk saat tiba dan jam pulang sebelum meninggalkan dapur." ikon="jam" />

      <section className="kartu grid gap-6 p-6 md:grid-cols-[1fr_auto] md:items-center">
        <div>
          <p className="text-sm font-semibold tracking-wide text-sedap uppercase">Hari ini</p>
          <p className="mt-1 text-2xl font-bold text-tinta tabular-nums">
            {jamMasuk === null && "Belum presensi"}
            {jamMasuk !== null && jamPulang === null && `Masuk pukul ${formatJam(jamMasuk)}`}
            {jamPulang !== null && `Pulang pukul ${formatJam(jamPulang)}`}
          </p>
          {jamMasuk !== null && (
            <p className="mt-1 text-sm font-semibold text-redup">
              {terlambat(jamMasuk) ? "Terlambat. " : "Tepat waktu. "}Tersimpan di Firestore.
            </p>
          )}
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={handleCatatMasuk}
            disabled={jamMasuk !== null || memproses}
            className="tombol-utama px-6 py-3 text-lg"
          >
            <Ikon nama="masuk" />
            Catat Masuk
          </button>
          <button
            type="button"
            onClick={handleCatatPulang}
            disabled={jamMasuk === null || jamPulang !== null || memproses}
            className="tombol-kunyit px-6 py-3 text-lg"
          >
            <Ikon nama="keluar" />
            Catat Pulang
          </button>
        </div>
      </section>

      <section className="kartu overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-tinta/10 p-5">
          <label className="flex items-center gap-3 font-bold text-tinta">
            Riwayat bulan
            <input
              type="month"
              value={bulan}
              onChange={(e) => e.target.value && router.replace(`/presensi?bulan=${e.target.value}`)}
              className="isian w-auto py-1.5"
            />
          </label>
          {status === "berhasil" && (
            <div className="flex gap-3 tabular-nums">
              <span className="rounded-xl border border-tinta/10 bg-sedap px-4 py-1.5 font-bold text-white">
                <span className="text-xl font-bold">{data.length}</span> hadir
              </span>
              <span className="rounded-xl border border-tinta/10 bg-ditolak/15 px-4 py-1.5 font-bold text-tinta">
                <span className="text-xl font-bold">{jumlahTerlambat}</span> terlambat
              </span>
            </div>
          )}
        </div>

        <div className="p-5">
          {status === "memuat" && <Memuat />}
          {status === "gagal" && <Gagal onCobaLagi={cobaLagi} />}
          {status === "berhasil" && data.length === 0 && (
            <Kosong teks={`Belum ada catatan presensi di ${formatBulan(bulan)}. Pilih bulan lain untuk melihat riwayat.`} />
          )}
          {status === "berhasil" && data.length > 0 && (
            <div className="overflow-x-auto rounded-xl border border-tinta/10">
              <table className="tabel">
                <thead>
                  <tr>
                    <th>Tanggal</th>
                    <th>Jam Masuk</th>
                    <th>Jam Pulang</th>
                    <th>Keterangan</th>
                  </tr>
                </thead>
                <tbody>
                  {data.map((p) => (
                    <tr key={p.id} className={terlambat(p.jamMasuk) ? "bg-ditolak/5" : ""}>
                      <td className="font-semibold">{formatTanggal(p.tanggal)}</td>
                      <td>{formatJam(p.jamMasuk)}</td>
                      <td>{formatJam(p.jamPulang)}</td>
                      <td>
                        {terlambat(p.jamMasuk) ? (
                          <span className="font-semibold text-red-700">Terlambat</span>
                        ) : (
                          <span className="font-semibold text-sedap">Tepat waktu</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
