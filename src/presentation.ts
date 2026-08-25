export type CalendarSurfaceState =
  | "empty"
  | "error"
  | "filtered-empty"
  | "loading"
  | "ready";

export interface CalendarSurfaceInput {
  diagnosticCount: number;
  eventCount: number;
  filtered: boolean;
  revision: number;
}

export interface DensityMetrics {
  availableHeight: number;
  cardHeight: number;
  eventCount: number;
  gap: number;
  overflowHeight: number;
}

export function calendarSurfaceState(input: CalendarSurfaceInput): CalendarSurfaceState {
  if (input.revision === 0) return "loading";
  if (input.eventCount > 0) return "ready";
  if (input.filtered) return "filtered-empty";
  if (input.diagnosticCount > 0) return "error";
  return "empty";
}

export function responsiveEventLimit(metrics: DensityMetrics): number {
  if (metrics.eventCount <= 0) return 0;
  if (metrics.availableHeight <= 0 || metrics.cardHeight <= 0) return 1;
  const gap = Math.max(0, metrics.gap);
  const slot = metrics.cardHeight + gap;
  const withoutOverflow = Math.max(1, Math.floor((metrics.availableHeight + gap) / slot));
  if (metrics.eventCount <= withoutOverflow) return metrics.eventCount;
  const availableForCards = metrics.availableHeight - Math.max(0, metrics.overflowHeight) - gap;
  return Math.max(1, Math.floor((availableForCards + gap) / slot));
}
