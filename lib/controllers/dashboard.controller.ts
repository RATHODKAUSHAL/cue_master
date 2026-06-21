import {
  getDashboardAnalytics,
  type DashboardPeriod,
} from "@/lib/models/dashboard.model";

function indiaDateString(date = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function getPeriodBounds(period: DashboardPeriod, selectedDate: string) {
  const selected = new Date(`${selectedDate}T00:00:00+05:30`);

  if (Number.isNaN(selected.getTime())) {
    return null;
  }

  let from = selected;

  if (period === "week") {
    const weekday = new Intl.DateTimeFormat("en-US", {
      timeZone: "Asia/Kolkata",
      weekday: "short",
    }).format(selected);
    const indiaDay = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(
      weekday,
    );
    const daysFromMonday = (indiaDay + 6) % 7;
    from = new Date(selected.getTime() - daysFromMonday * 86_400_000);
  }

  if (period === "month") {
    const [year, month] = selectedDate.split("-").map(Number);
    from = new Date(`${year}-${String(month).padStart(2, "0")}-01T00:00:00+05:30`);
  }

  const [selectedYear, selectedMonth] = selectedDate.split("-").map(Number);
  const to =
    period === "day"
      ? new Date(from.getTime() + 86_400_000)
      : period === "week"
        ? new Date(from.getTime() + 7 * 86_400_000)
        : new Date(
            `${selectedMonth === 12 ? selectedYear + 1 : selectedYear}-${String(
              selectedMonth === 12 ? 1 : selectedMonth + 1,
            ).padStart(2, "0")}-01T00:00:00+05:30`,
          );

  return { from, to };
}

function createChart(
  period: DashboardPeriod,
  from: Date,
  to: Date,
  events: Array<{ occurredAt: string; amount: number }>,
) {
  const buckets: Array<{ key: string; label: string; value: number }> = [];

  if (period === "day") {
    for (let hour = 0; hour < 24; hour += 3) {
      buckets.push({
        key: String(hour),
        label: `${String(hour).padStart(2, "0")}:00`,
        value: 0,
      });
    }
  } else {
    for (let cursor = from.getTime(); cursor < to.getTime(); cursor += 86_400_000) {
      const date = new Date(cursor);
      buckets.push({
        key: indiaDateString(date),
        label:
          period === "week"
            ? new Intl.DateTimeFormat("en-IN", {
                timeZone: "Asia/Kolkata",
                weekday: "short",
              }).format(date)
            : new Intl.DateTimeFormat("en-IN", {
                timeZone: "Asia/Kolkata",
                day: "2-digit",
                month: "short",
              }).format(date),
        value: 0,
      });
    }
  }

  for (const event of events) {
    const occurredAt = new Date(event.occurredAt);
    const key =
      period === "day"
        ? String(
            Math.floor(
              Number(
                new Intl.DateTimeFormat("en-US", {
                  timeZone: "Asia/Kolkata",
                  hour: "2-digit",
                  hourCycle: "h23",
                }).format(occurredAt),
              ) / 3,
            ) * 3,
          )
        : indiaDateString(occurredAt);
    const bucket = buckets.find((item) => item.key === key);
    if (bucket) bucket.value += Number(event.amount);
  }

  return buckets.map(({ label, value }) => ({ label, value }));
}

export async function getDashboardAnalyticsForUser(
  ownerId: string,
  periodInput?: string | null,
  dateInput?: string | null,
) {
  const period: DashboardPeriod =
    periodInput === "week" || periodInput === "month" ? periodInput : "day";
  const selectedDate = dateInput || indiaDateString();
  const bounds = getPeriodBounds(period, selectedDate);

  if (!bounds) {
    return { ok: false as const, status: 400, message: "Select a valid date." };
  }

  const analytics = await getDashboardAnalytics(ownerId, bounds.from, bounds.to);

  return {
    ok: true as const,
    analytics: {
      period,
      selectedDate,
      range: { from: bounds.from, to: bounds.to },
      totalCustomers: analytics.totalCustomers,
      totalRevenue: analytics.totalRevenue,
      totalPendingAmount: analytics.totalPendingAmount,
      totalExpense: analytics.totalExpense,
      completedSessions: analytics.completedSessions,
      chart: createChart(period, bounds.from, bounds.to, analytics.revenueEvents || []),
    },
  };
}
