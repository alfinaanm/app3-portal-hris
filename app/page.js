"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { usePengguna } from "@/lib/pengguna";
import Memuat from "@/components/Memuat";

export default function Home() {
  const router = useRouter();
  const { pengguna, memuat } = usePengguna();

  useEffect(() => {
    if (!memuat) {
      if (pengguna) {
        if (pengguna.role === "hrd") {
          router.replace("/admin");
        } else {
          router.replace("/beranda");
        }
      } else {
        router.replace("/masuk");
      }
    }
  }, [pengguna, memuat, router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-latar p-8">
      <Memuat />
    </div>
  );
}
