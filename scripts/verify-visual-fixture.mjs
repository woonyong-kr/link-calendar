import { readFile } from "node:fs/promises";

const fixture = await readFile("tests/fixtures/link-calendar-dark.html", "utf8");
const required = [
  "link-calendar__grid",
  "link-calendar__card",
  "link-calendar__side",
  "link-calendar__agenda",
  "link-calendar__agenda-link",
  "aria-label=\"August 2026\"",
];
const missing = required.filter((token) => !fixture.includes(token));
if (missing.length) throw new Error(`Visual fixture is incomplete: ${missing.join(", ")}`);
for (const forbidden of ["link-calendar__preview", "link-calendar__property", "link-calendar__relation"]) {
  if (fixture.includes(forbidden)) throw new Error(`Visual fixture contains removed UI: ${forbidden}`);
}
console.log(JSON.stringify({ fixture: "link-calendar-dark", status: "ok" }));
