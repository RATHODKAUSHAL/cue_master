import type { Metadata } from "next";
import { AdminUsers } from "@/components/admin/admin-pages";

export const metadata: Metadata = { title: "Admin Users | CueDesk CRM" };
export default function Page() { return <AdminUsers />; }
