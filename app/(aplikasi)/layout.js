"use client";

import { Suspense, useEffect } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { usePengguna } from "@/lib/pengguna";
import BilahAtas from "@/components/BilahAtas";
import MenuSamping from "@/components/MenuSamping";
import Memuat from "@/components/Memuat";
import AksesDitolak from "@/components/AksesDitolak";

/**
 * Route Guard dan Tata Letak halaman aplikasi (PRD 6.2 & PRD 6.3).
 * - Menjaga /beranda, /presensi, /cuti, /profil, dan seluruh turunannya.
 * - Pengguna yang belum masuk diarahkan ke /masuk?kembali=<alamat asal>.
 * - Peran "karyawan" dan "hrd" diizinkan membuka modul karyawan.
 * - Modul /admin hanya boleh dibuka oleh peran "hrd" (selain hrd melihat AksesDitolak).
 */
function IsiLayout({ children }) {
  const { pengguna, memuat } = usePengguna();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    if (!memuat && !pengguna) {
      const qs = searchParams?.toString();
      const alamatAsal = qs ? `${pathname}?${qs}` : pathname;
      router.replace(`/masuk?kembali=${encodeURIComponent(alamatAsal)}`);
    }
  }, [pengguna, memuat, pathname, searchParams, router]);

  // 1. Selama status autentikasi atau profil masih dibaca, tampilkan Memuat
  if (memuat) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-latar p-8">
        <Memuat />
      </div>
    );
  }

  // 2. Jika belum masuk, tampilkan Memuat selama proses pengalihan ke /masuk?kembali=...
  if (!pengguna) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-latar p-8">
        <Memuat />
      </div>
    );
  }

  // 3. Penjagaan rute khusus /admin: hanya peran 'hrd' yang diizinkan (PRD 2.3 & 6.2)
  // Rute /beranda, /presensi, /cuti, /profil dan turunannya boleh diakses oleh karyawan maupun hrd
  const mencobaAksesAdmin = pathname === "/admin" || pathname.startsWith("/admin/");
  const ditolak = mencobaAksesAdmin && pengguna.role !== "hrd";

  return (
    <div className="flex min-h-screen flex-col">
      <BilahAtas />
      <div className="flex flex-1 flex-col md:flex-row">
        <aside className="bg-tinta md:w-64 md:shrink-0">
          <Suspense>
            <MenuSamping />
          </Suspense>
        </aside>
        <main className="min-w-0 flex-1 p-4 md:p-8">
          <div className="mx-auto max-w-5xl">
            {ditolak ? (
              <AksesDitolak />
            ) : (
              <Suspense fallback={<Memuat />}>{children}</Suspense>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

export default function LayoutAplikasi({ children }) {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-latar p-8">
          <Memuat />
        </div>
      }
    >
      <IsiLayout>{children}</IsiLayout>
    </Suspense>
  );
}
