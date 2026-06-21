import type { Metadata } from "next";
import { AdminCustomers } from "@/components/admin/admin-pages";

export const metadata: Metadata = { title: "Admin Customers | CueDesk CRM" };
export default function Page() { return <AdminCustomers />; }
