"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useAmbilData } from "@/lib/useAmbilData";
import { ambilKaryawan, perbaruiPeranKaryawan } from "@/lib/data";
import KepalaHalaman from "@/components/KepalaHalaman";
import Ikon from "@/components/Ikon";
import Memuat from "@/components/Memuat";
import Kosong from "@/components/Kosong";
import Gagal from "@/components/Gagal";

// Rincian Karyawan (PRD 4.7) / Employee detail (PRD 4.7)
export default function HalamanRincianKaryawan() {
  const { id } = useParams();
  const { status, data: k, cobaLagi } = useAmbilData(() => ambilKaryawan(id), [id]);

  return (
    <div className="max-w-2xl space-y-8">
      <KepalaHalaman judul={k ? k.nama : "Rincian Karyawan"} keterangan={k?.email} warna="tinta" ikon="orang">
        <Link href="/admin/karyawan" className="tombol-kedua">
          <Ikon nama="kembali" />
          Data Karyawan
        </Link>
      </KepalaHalaman>

      {status === "memuat" && <Memuat />}
      {status === "gagal" && <Gagal onCobaLagi={cobaLagi} />}
      {status === "berhasil" && k === null && (
        <Kosong teks="Karyawan tidak ditemukan">
          <Link href="/admin/karyawan" className="tombol-utama">Lihat Data Karyawan</Link>
        </Kosong>
      )}
      {/* key={k.id} mengosongkan isian saat pindah ke karyawan lain / key={k.id} resets the form when switching employees */}
      {status === "berhasil" && k && <FormPeran key={k.id} karyawan={k} />}
    </div>
  );
}

const pilihanPeran = [
  { nilai: "karyawan", label: "Karyawan", keterangan: "Mencatat presensi dan mengajukan cuti miliknya." },
  { nilai: "hrd", label: "HRD", keterangan: "Ditambah mengelola karyawan, memutuskan cuti, dan membaca laporan." },
];

function FormPeran({ karyawan }) {
  const [peran, setPeran] = useState(karyawan.role);
  const [pesan, setPesan] = useState("");

  async function simpan(e) {
    e.preventDefault();
    try {
      await perbaruiPeranKaryawan(karyawan.id, peran);
      setPesan(`Peran berhasil diubah menjadi ${peran === "hrd" ? "HRD" : "Karyawan"}. Tersimpan di Firestore.`);
    } catch (err) {
      console.error("Gagal mengubah peran:", err);
      setPesan(`Gagal mengubah peran: ${err.message}`);
    }
  }

  return (
    <form onSubmit={simpan} className="kartu space-y-5 p-6">
      {/* Pilihan peran berupa kartu radio supaya akibat tiap peran terbaca / Role options as radio cards so each role's effect is readable */}
      <fieldset>
        <legend className="label">Peran</legend>
        <div className="grid gap-3 sm:grid-cols-2">
          {pilihanPeran.map((p) => (
            <label
              key={p.nilai}
              className={`cursor-pointer rounded-xl border p-4 transition has-[:focus-visible]:ring-4 has-[:focus-visible]:ring-sedap/40 ${
                peran === p.nilai ? "border-sedap bg-sedap/5 ring-1 ring-sedap" : "border-tinta/15 hover:border-tinta/40"
              }`}
            >
              <input
                type="radio"
                name="peran"
                value={p.nilai}
                checked={peran === p.nilai}
                onChange={(e) => {
                  setPeran(e.target.value);
                  setPesan("");
                }}
                className="sr-only"
              />
              <span className="block text-lg font-bold text-tinta">{p.label}</span>
              <span className="mt-1 block text-sm font-medium text-tinta/80">{p.keterangan}</span>
            </label>
          ))}
        </div>
      </fieldset>
      <div className="flex flex-wrap items-center gap-4">
        <button type="submit" className="tombol-utama px-8">Simpan</button>
        {pesan && <p role="status" className="font-bold text-tinta">{pesan}</p>}
      </div>
    </form>
  );
}
