"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { usePengguna } from "@/lib/pengguna";
import { useAmbilData } from "@/lib/useAmbilData";
import { ambilPengajuanCuti } from "@/lib/data";
import { formatTanggal, lamaHari } from "@/lib/waktu";
import KepalaHalaman from "@/components/KepalaHalaman";
import Ikon from "@/components/Ikon";
import Memuat from "@/components/Memuat";
import Kosong from "@/components/Kosong";
import Gagal from "@/components/Gagal";
import PilStatus from "@/components/PilStatus";

// Daftar Cuti (PRD 4.4.2). Urutan terbaru sudah diatur di lib/data.js / Leave list (PRD 4.4.2). Newest-first order comes from lib/data.js
export default function HalamanCuti() {
  const { pengguna } = usePengguna();
  const router = useRouter();
  const { status, data, cobaLagi } = useAmbilData(() => ambilPengajuanCuti(pengguna?.uid), [pengguna?.uid]);

  const tombolAjukan = (
    <Link href="/cuti/baru" className="tombol-utama">
      <Ikon nama="tambah" />
      Ajukan Cuti
    </Link>
  );

  return (
    <div className="space-y-8">
      <KepalaHalaman
        judul="Cuti Saya"
        keterangan="Klik salah satu pengajuan untuk melihat rincian dan catatan HRD."
        warna="kunyit"
        ikon="kalender"
      >
        {tombolAjukan}
      </KepalaHalaman>

      <section className="kartu overflow-hidden">
        {status === "memuat" && <Memuat />}
        {status === "gagal" && (
          <div className="p-5">
            <Gagal onCobaLagi={cobaLagi} />
          </div>
        )}
        {status === "berhasil" && data.length === 0 && (
          <div className="p-5">
            <Kosong teks="Kamu belum pernah mengajukan cuti.">{tombolAjukan}</Kosong>
          </div>
        )}
        {status === "berhasil" && data.length > 0 && (
          <div className="overflow-x-auto">
            <table className="tabel">
              <thead>
                <tr>
                  <th>Nomor</th>
                  <th>Tanggal</th>
                  <th>Lama</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {data.map((c) => (
                  // Seluruh baris bisa diklik; tautan di Nomor untuk pengguna papan ketik / Whole row is clickable; the Nomor link serves keyboard users
                  <tr key={c.id} onClick={() => router.push(`/cuti/${c.id}`)} className="cursor-pointer transition hover:bg-krem">
                    <td>
                      <Link href={`/cuti/${c.id}`} className="font-bold text-sedap hover:underline">
                        {c.id}
                      </Link>
                    </td>
                    <td className="font-semibold">
                      {formatTanggal(c.tanggalMulai)} – {formatTanggal(c.tanggalSelesai)}
                    </td>
                    <td>{lamaHari(c.tanggalMulai, c.tanggalSelesai)} hari</td>
                    <td><PilStatus status={c.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
