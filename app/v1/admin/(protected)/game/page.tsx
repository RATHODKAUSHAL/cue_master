import type { Metadata } from "next";
import { AdminGames } from "@/components/admin/admin-pages";

export const metadata: Metadata = { title: "Admin Games | CueDesk CRM" };
export default function Page() { return <AdminGames />; }
