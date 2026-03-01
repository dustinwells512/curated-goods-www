import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Curated Goods — Admin",
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
