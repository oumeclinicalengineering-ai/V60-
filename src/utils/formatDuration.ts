/** Keep sub-minute values visible instead of rounding them to zero. */
export function formatDuration(minutes: number | null): string {
  if (minutes === null) return "対象外";
  if (minutes === 0) return "約0分";
  if (minutes < 1) return "1分未満";
  return `約${Math.round(minutes)}分`;
}
export function formatMargin(minutes: number | null): string {
  if (minutes === null) return "対象外";
  if (minutes === 0) return "0分";
  if (Math.abs(minutes) < 1)
    return minutes < 0 ? "1分未満の不足" : "1分未満の余裕";
  return formatDuration(Math.abs(minutes));
}
