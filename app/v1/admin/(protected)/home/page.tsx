import type { Metadata } from "next";
import { AdminHome } from "@/components/admin/admin-pages";

export const metadata: Metadata = { title: "Admin Home | CueDesk CRM" };
export default function Page() { return <AdminHome />; }
