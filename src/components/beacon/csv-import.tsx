import { useMemo, useState } from "react";
import Papa from "papaparse";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

export type ImportField = { key: string; label: string; required?: boolean; guess: RegExp };

function parseCsv(text: string): string[][] {
  const r = Papa.parse<string[]>(text, { dynamicTyping: false, skipEmptyLines: "greedy" });
  const err = r.errors.find((e) => e.code !== "UndetectableDelimiter");
  if (err) throw new Error(`Row ${(err.row ?? 0) + 1}: ${err.message}`);
  return r.data;
}

/** Upload → map columns by position → preview → confirm. Calls onImport with mapped valid rows. */
export function CsvImporter({ fields, onImport, validate, children }: {
  fields: ImportField[];
  validate: (row: Record<string, string>) => string | null;
  onImport: (rows: Record<string, string>[]) => Promise<void>;
  children?: React.ReactNode;
}) {
  const [grid, setGrid] = useState<string[][] | null>(null);
  const [map, setMap] = useState<Record<string, number>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const header = grid?.[0] ?? [];
  const load = async (file: File | undefined) => {
    setError(""); setGrid(null);
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) { setError("File is larger than 10 MB."); return; }
    try {
      const g = parseCsv(await file.text());
      if (g.length < 2) { setError("The file has no data rows."); return; }
      setGrid(g);
      const h = g[0] ?? [];
      setMap(Object.fromEntries(fields.map((f) => [f.key, h.findIndex((c) => f.guess.test(c))])));
    } catch (e) { setError(e instanceof Error ? e.message : "Could not read this file."); }
  };
  const { valid, invalid } = useMemo(() => {
    const valid: Record<string, string>[] = []; const invalid: { line: number; reason: string }[] = [];
    (grid ?? []).slice(1).forEach((cells, i) => {
      const row = Object.fromEntries(fields.map((f) => [f.key, (map[f.key] ?? -1) >= 0 ? (cells[map[f.key]!] ?? "").trim() : ""]));
      const missing = fields.find((f) => f.required && !row[f.key]);
      const reason = missing ? `missing ${missing.label}` : validate(row);
      if (reason) invalid.push({ line: i + 2, reason }); else valid.push(row);
    });
    return { valid, invalid };
  }, [grid, map, fields, validate]);

  return (
    <div className="grid gap-3">
      <input type="file" accept=".csv,text/csv,.tsv,text/tab-separated-values" onChange={(e) => void load(e.target.files?.[0])} className="text-sm" />
      {error && <p className="text-sm text-destructive">{error}</p>}
      {grid && (
        <>
          <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
            {fields.map((f) => (
              <div key={f.key} className="grid gap-1">
                <Label className="text-xs">{f.label}{f.required ? " *" : ""}</Label>
                <select className="h-9 rounded-md border bg-background px-2 text-sm" value={map[f.key] ?? -1} onChange={(e) => setMap({ ...map, [f.key]: Number(e.target.value) })}>
                  <option value={-1}>— not mapped —</option>
                  {header.map((h, i) => <option key={i} value={i}>{h || `Column ${i + 1}`}</option>)}
                </select>
              </div>
            ))}
          </div>
          {children}
          <p className="text-sm"><span className="font-semibold text-emerald">{valid.length} ready</span> · <span className={invalid.length ? "font-semibold text-amber" : ""}>{invalid.length} skipped</span> of {grid.length - 1} rows</p>
          <div className="max-h-48 overflow-auto rounded border">
            <table className="w-full text-xs"><thead><tr>{fields.map((f) => <th key={f.key} className="border-b px-2 py-1 text-left">{f.label}</th>)}</tr></thead>
              <tbody className="font-mono">{valid.slice(0, 8).map((r, i) => <tr key={i}>{fields.map((f) => <td key={f.key} className="border-b px-2 py-1">{r[f.key]}</td>)}</tr>)}</tbody></table>
          </div>
          {invalid.length > 0 && <p className="text-xs text-muted-foreground">Skipped: {invalid.slice(0, 5).map((x) => `row ${x.line} (${x.reason})`).join(", ")}{invalid.length > 5 ? "…" : ""}</p>}
          <Button disabled={busy || valid.length === 0} onClick={async () => { setBusy(true); try { await onImport(valid); setGrid(null); } finally { setBusy(false); } }}>Import {valid.length} rows</Button>
        </>
      )}
    </div>
  );
}
