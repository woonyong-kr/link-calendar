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

export function calendarSurfaceState(input: CalendarSurfaceInput): CalendarSurfaceState {
  if (input.revision === 0) return "loading";
  if (input.eventCount > 0) return "ready";
  if (input.filtered) return "filtered-empty";
  if (input.diagnosticCount > 0) return "error";
  return "empty";
}
