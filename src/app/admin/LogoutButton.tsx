"use client";

import { useRouter } from "next/navigation";

export default function LogoutButton() {
  const router = useRouter();

  async function handleLogout() {
    await fetch("/api/admin/logout", { method: "POST" });
    router.refresh();
  }

  return (
    <button
      onClick={handleLogout}
      className="bg-white/15 text-white border-none px-4 py-2 rounded-md cursor-pointer text-sm hover:bg-white/25 transition-colors"
    >
      Logout
    </button>
  );
}
