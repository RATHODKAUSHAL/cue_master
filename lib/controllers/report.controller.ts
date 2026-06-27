import { getReportData } from "@/lib/models/report.model";

export async function getReportsForUser(ownerId: string, input: { date?: string | null }) {
  const date = String(input.date ?? "").trim();
  let dateFrom: Date | null = null;
  let dateTo: Date | null = null;

  if (date) {
    const parsed = new Date(`${date}T00:00:00+05:30`);

    if (Number.isNaN(parsed.getTime())) {
      return { ok: false as const, status: 400, message: "Select a valid report date." };
    }

    dateFrom = parsed;
    dateTo = new Date(parsed.getTime() + 24 * 60 * 60 * 1000);
  }

  const report = await getReportData(ownerId, dateFrom, dateTo);

  return { ok: true as const, report };
}
