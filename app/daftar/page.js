"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { usePengguna } from "@/lib/pengguna";
import { daftarDenganEmail, masukDenganGoogle, formatPesanGalatAuth } from "@/lib/auth";
import KerangkaPublik from "@/components/KerangkaPublik";
import Memuat from "@/components/Memuat";

/**
 * Menentukan rute tujuan setelah mendaftar:
 * - Mengembalikan ke alamat asal (?kembali=...) jika ada dan aman.
 * - Jika kembali ke /admin tapi peran bukan hrd, dialihkan ke /beranda.
 * - Jika tanpa parameter kembali: HRD ke /admin, Karyawan ke /beranda.
 */
function tentukanTujuan(role, targetKembali) {
  if (targetKembali && targetKembali.startsWith("/") && !targetKembali.startsWith("//")) {
    if (targetKembali.startsWith("/admin") && role !== "hrd") {
      return "/beranda";
    }
    return targetKembali;
  }
  return role === "hrd" ? "/admin" : "/beranda";
}

function FormDaftar() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const kembali = searchParams.get("kembali");

  const { pengguna, memuat } = usePengguna();

  const [nama, setNama] = useState("");
  const [email, setEmail] = useState("");
  const [kataSandi, setKataSandi] = useState("");
  const [galat, setGalat] = useState({});
  const [pesan, setPesan] = useState("");
  const [memproses, setMemproses] = useState(false);

  // Jika sudah masuk, langsung arahkan ke tujuan (PRD 4.1 & PRD 6.3)
  useEffect(() => {
    if (!memuat && pengguna) {
      const tujuan = tentukanTujuan(pengguna.role, kembali);
      router.replace(tujuan);
    }
  }, [pengguna, memuat, kembali, router]);

  async function kirim(e) {
    e.preventDefault();
    const g = {};
    if (!nama.trim()) g.nama = "Nama wajib diisi.";
    if (!email.trim()) g.email = "Email wajib diisi.";
    if (kataSandi.length < 6) g.kataSandi = "Kata sandi minimal 6 karakter.";
    setGalat(g);
    if (Object.keys(g).length > 0) {
      setPesan("");
      return;
    }

    setMemproses(true);
    setPesan("");
    try {
      const { role } = await daftarDenganEmail(nama, email, kataSandi);
      const tujuan = tentukanTujuan(role, kembali);
      router.push(tujuan);
    } catch (err) {
      console.error("Gagal mendaftar dengan email:", err);
      setPesan(formatPesanGalatAuth(err));
    } finally {
      setMemproses(false);
    }
  }

  async function handleMasukGoogle() {
    setMemproses(true);
    setPesan("");
    try {
      const { role } = await masukDenganGoogle();
      const tujuan = tentukanTujuan(role, kembali);
      router.push(tujuan);
    } catch (err) {
      console.error("Gagal masuk dengan Google:", err);
      setPesan(formatPesanGalatAuth(err));
    } finally {
      setMemproses(false);
    }
  }

  if (memuat || pengguna) {
    return (
      <KerangkaPublik judul="Daftar">
        <div className="py-8">
          <Memuat />
        </div>
      </KerangkaPublik>
    );
  }

  return (
    <KerangkaPublik judul="Daftar">
      <form onSubmit={kirim} noValidate className="space-y-4">
        <div>
          <label htmlFor="nama" className="label">Nama</label>
          <input
            id="nama"
            autoComplete="name"
            value={nama}
            onChange={(e) => setNama(e.target.value)}
            disabled={memproses}
            className="isian"
          />
          {galat.nama && <p className="galat">{galat.nama}</p>}
        </div>
        <div>
          <label htmlFor="email" className="label">Email</label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={memproses}
            className="isian"
          />
          {galat.email && <p className="galat">{galat.email}</p>}
        </div>
        <div>
          <label htmlFor="kataSandi" className="label">Kata sandi</label>
          <input
            id="kataSandi"
            type="password"
            autoComplete="new-password"
            value={kataSandi}
            onChange={(e) => setKataSandi(e.target.value)}
            disabled={memproses}
            className="isian"
          />
          {galat.kataSandi && <p className="galat">{galat.kataSandi}</p>}
        </div>
        <button
          type="submit"
          disabled={memproses}
          className="tombol-utama w-full py-3 text-lg"
        >
          {memproses ? "Membuat akun..." : "Daftar"}
        </button>
      </form>

      <div className="my-5 flex items-center gap-3 text-sm font-bold text-redup">
        <span className="h-0.5 flex-1 bg-tinta/15" />
        atau
        <span className="h-0.5 flex-1 bg-tinta/15" />
      </div>

      <button
        type="button"
        onClick={handleMasukGoogle}
        disabled={memproses}
        className="tombol-kedua w-full py-3"
      >
        <span className="grid h-6 w-6 place-items-center rounded-full bg-kunyit text-sm font-bold text-tinta">G</span>
        {memproses ? "Menghubungkan..." : "Masuk dengan Google"}
      </button>

      {pesan && (
        <p role="status" className="mt-5 rounded-xl border border-ditolak/30 bg-ditolak/10 p-3 text-sm font-bold text-red-800">
          {pesan}
        </p>
      )}

      <p className="mt-6 text-center text-sm font-medium text-redup">
        Sudah punya akun?{" "}
        <Link
          href={kembali ? `/masuk?kembali=${encodeURIComponent(kembali)}` : "/masuk"}
          className="font-semibold text-sedap hover:underline"
        >
          Masuk
        </Link>
      </p>
    </KerangkaPublik>
  );
}

export default function HalamanDaftar() {
  return (
    <Suspense
      fallback={
        <KerangkaPublik judul="Daftar">
          <div className="py-8">
            <Memuat />
          </div>
        </KerangkaPublik>
      }
    >
      <FormDaftar />
    </Suspense>
  );
}
