export function buildCalendarComposeLink(title: string, start?: string, durationMinutes = 30): string | undefined {
  if (!start) return undefined;
  const startDate = new Date(start);
  if (Number.isNaN(startDate.getTime())) return undefined;
  const endDate = new Date(startDate.getTime() + Math.max(15, Math.min(durationMinutes, 24 * 60)) * 60_000);
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: title.slice(0, 500),
    dates: `${formatCalendarDate(startDate)}/${formatCalendarDate(endDate)}`,
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

function formatCalendarDate(date: Date) {
  return date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
}
