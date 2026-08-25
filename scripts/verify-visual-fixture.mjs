import { readFile } from "node:fs/promises";

const fixture = await readFile("tests/fixtures/link-calendar-dark.html", "utf8");
const required = [
  "context-calendar__grid",
  "context-calendar__card",
  "context-calendar__side",
  "context-calendar__agenda",
  "context-calendar__agenda-link",
  "aria-label=\"August 2026\"",
];
const missing = required.filter((token) => !fixture.includes(token));
if (missing.length) throw new Error(`Visual fixture is incomplete: ${missing.join(", ")}`);
for (const forbidden of ["context-calendar__preview", "context-calendar__property", "context-calendar__relation"]) {
  if (fixture.includes(forbidden)) throw new Error(`Visual fixture contains removed UI: ${forbidden}`);
}
console.log(JSON.stringify({ fixture: "link-calendar-dark", status: "ok" }));
