import { redirect } from "next/navigation";
import { getCurrentAdmin } from "@/lib/admin/auth";

export default async function AdminIndexPage() {
  redirect((await getCurrentAdmin()) ? "/v1/admin/home" : "/v1/admin/login");
}
