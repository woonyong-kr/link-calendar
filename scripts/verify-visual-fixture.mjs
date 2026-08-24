import { readFile } from "node:fs/promises";

const fixture = await readFile("tests/fixtures/context-calendar-dark.html", "utf8");
const required = [
  "context-calendar__grid",
  "context-calendar__card",
  "context-calendar__side",
  "context-calendar__preview",
  "context-calendar__property",
  "aria-label=\"August 2026\"",
];
const missing = required.filter((token) => !fixture.includes(token));
if (missing.length) throw new Error(`Visual fixture is incomplete: ${missing.join(", ")}`);
console.log(JSON.stringify({ fixture: "context-calendar-dark", status: "ok" }));
