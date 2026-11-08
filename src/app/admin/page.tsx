import type { Metadata } from "next";
import AdminClient from "./admin-client";

export const metadata: Metadata = {
  title: "Панель городских служб",
  description:
    "Административная панель TASQYN AI: очередь инцидентов, статистика, управление статусами.",
};

export default function AdminPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <AdminClient />
    </div>
  );
}
