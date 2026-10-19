"use client";

import { useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useAmbilData } from "@/lib/useAmbilData";
import { ambilSemuaPengajuan, putuskanCuti } from "@/lib/data";
import { formatTanggal, lamaHari } from "@/lib/waktu";
import KepalaHalaman from "@/components/KepalaHalaman";
import Ikon from "@/components/Ikon";
import Memuat from "@/components/Memuat";
import Kosong from "@/components/Kosong";
import Gagal from "@/components/Gagal";
import PilStatus from "@/components/PilStatus";

const saringan = [
  { nilai: "semua", label: "Semua" },
  { nilai: "menunggu", label: "Menunggu" },
  { nilai: "disetujui", label: "Disetujui" },
  { nilai: "ditolak", label: "Ditolak" },
];

// Persetujuan Cuti (PRD 4.8). Tanpa pemeriksaan peran, lihat Sesi 6 / Leave approval (PRD 4.8). No role check, see Session 6
export default function HalamanPersetujuanCuti() {
  // Saringan disimpan di alamat (?status=menunggu) supaya tautannya bisa dibagikan / Filter lives in the URL (?status=menunggu) so the link can be shared
  const dariAlamat = useSearchParams().get("status");
  const status = saringan.some((s) => s.nilai === dariAlamat) ? dariAlamat : "semua";

  const { status: keadaan, data, cobaLagi } = useAmbilData(() => ambilSemuaPengajuan(status), [status]);

  const [keputusan, setKeputusan] = useState({});
  const [catatan, setCatatan] = useState({});
  const [pesan, setPesan] = useState("");

  async function putuskan(c, statusBaru) {
    const teksCatatan = catatan[c.id] ?? c.catatanHrd ?? "";
    try {
      await putuskanCuti(c.id, statusBaru, teksCatatan);
      setKeputusan((prev) => ({ ...prev, [c.id]: statusBaru }));
      setPesan(`${c.id} milik ${c.nama} berhasil ${statusBaru}. Tersimpan di Firestore.`);
      cobaLagi();
    } catch (err) {
      console.error("Gagal memperbarui status cuti:", err);
      setPesan(`Gagal memperbarui status ${c.id}: ${err.message}`);
    }
  }

  // Pengajuan yang baru diputuskan keluar dari saringan Menunggu / Freshly decided requests drop out of the Menunggu filter
  const tampil = (data ?? [])
    .map((c) => ({ ...c, status: keputusan[c.id] ?? c.status, catatanHrd: catatan[c.id] ?? c.catatanHrd }))
    .filter((c) => status === "semua" || c.status === status);

  return (
    <div className="space-y-8">
      <KepalaHalaman judul="Persetujuan Cuti" keterangan="Baca alasannya, tulis catatan bila perlu, lalu pilih Setujui atau Tolak." warna="tinta" ikon="centang" />

      {/* Saringan berupa tautan supaya tersimpan di alamat / Filters are links so they live in the URL */}
      <nav aria-label="Saringan status" className="flex flex-wrap gap-3">
        {saringan.map((s) => (
          <Link
            key={s.nilai}
            href={s.nilai === "semua" ? "/admin/cuti" : `/admin/cuti?status=${s.nilai}`}
            aria-current={status === s.nilai ? "page" : undefined}
            className={`rounded-full border border-tinta/10 px-5 py-2 text-sm font-semibold transition ${
              status === s.nilai ? "bg-kunyit text-tinta shadow-tipis" : "bg-panel text-tinta hover:bg-krem"
            }`}
          >
            {s.label}
          </Link>
        ))}
      </nav>

      {pesan && (
        <p role="status" className="rounded-xl border border-tinta/10 bg-krem p-4 font-bold text-tinta">
          {pesan}
        </p>
      )}

      {keadaan === "memuat" && <Memuat />}
      {keadaan === "gagal" && <Gagal onCobaLagi={cobaLagi} />}
      {keadaan === "berhasil" && tampil.length === 0 && (
        <Kosong teks={status === "menunggu" ? "Semua pengajuan sudah diputuskan." : "Tidak ada pengajuan dengan status ini."} />
      )}
      {keadaan === "berhasil" && tampil.length > 0 && (
        // Satu kartu per pengajuan supaya semua yang dibutuhkan untuk memutuskan ada di satu tempat / One card per request so everything needed to decide sits together
        <ul className="space-y-5">
          {tampil.map((c) => (
            <li key={c.id} className="kartu overflow-hidden">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-tinta/10 bg-krem px-5 py-3">
                <div className="flex items-center gap-3">
                  <span className="grid h-10 w-10 place-items-center rounded-full border border-tinta/10 bg-panel font-bold text-tinta">
                    {c.nama.charAt(0)}
                  </span>
                  <div>
                    <p className="text-lg font-bold text-tinta">{c.nama}</p>
                    <p className="text-xs font-bold text-redup">{c.id}</p>
                  </div>
                </div>
                <PilStatus status={c.status} />
              </div>

              <div className="grid gap-5 p-5 md:grid-cols-[1fr_1fr]">
                <div className="space-y-3">
                  <p className="font-bold text-tinta tabular-nums">
                    {formatTanggal(c.tanggalMulai)} – {formatTanggal(c.tanggalSelesai)}
                    <span className="ml-2 rounded-lg bg-sedap px-2 py-0.5 text-sm text-white">{lamaHari(c.tanggalMulai, c.tanggalSelesai)} hari</span>
                  </p>
                  <p className="font-medium">{c.alasan}</p>
                </div>

                <div>
                  {c.status === "menunggu" ? (
                    <>
                      <label htmlFor={`catatan-${c.id}`} className="label">Catatan HRD</label>
                      <textarea
                        id={`catatan-${c.id}`}
                        rows={2}
                        value={c.catatanHrd}
                        onChange={(e) => setCatatan({ ...catatan, [c.id]: e.target.value })}
                        className="isian"
                      />
                      <div className="mt-3 flex flex-wrap gap-3">
                        <button type="button" onClick={() => putuskan(c, "disetujui")} className="tombol-utama">
                          <Ikon nama="centang" />
                          Setujui
                        </button>
                        <button type="button" onClick={() => putuskan(c, "ditolak")} className="tombol border border-ditolak/40 bg-panel text-red-700 shadow-tipis hover:bg-ditolak/5">
                          Tolak
                        </button>
                      </div>
                    </>
                  ) : (
                    <div className="rounded-xl border border-dashed border-tinta/20 p-4">
                      <p className="text-xs font-semibold tracking-wide text-terong uppercase">Catatan HRD</p>
                      <p className="mt-1 font-semibold">{c.catatanHrd || <span className="text-redup">Tanpa catatan.</span>}</p>
                    </div>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
