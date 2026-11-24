// Browser-only: builds the FEMA reimbursement packet PDF with photos embedded. Loaded with dynamic import from a click handler.
import { jsPDF } from "jspdf";
import { supabase } from "@/integrations/supabase/client";
import { equipmentCost } from "./costs";
import { femaLabel, fmtUTC } from "./fema";
import { summarize, type IncidentData } from "./incident-data";

const usd = (n: number) => n.toLocaleString("en-US", { style: "currency", currency: "USD" });

async function toDataUrl(url: string): Promise<{ data: string; w: number; h: number } | null> {
  try {
    const blob = await (await fetch(url)).blob();
    const bmp = await createImageBitmap(blob);
    const c = document.createElement("canvas");
    const scale = Math.min(1, 1200 / Math.max(bmp.width, bmp.height));
    c.width = Math.round(bmp.width * scale); c.height = Math.round(bmp.height * scale);
    c.getContext("2d")!.drawImage(bmp, 0, 0, c.width, c.height);
    return { data: c.toDataURL("image/jpeg", 0.8), w: c.width, h: c.height };
  } catch { return null; }
}

export async function buildClaimPdf(d: IncidentData, opts: { orgName: string; draft: boolean }): Promise<Blob> {
  const pdf = new jsPDF({ unit: "pt", format: "letter" });
  const W = pdf.internal.pageSize.getWidth(), H = pdf.internal.pageSize.getHeight(), M = 48;
  let y = M;
  const stamp = () => {
    if (!opts.draft) return;
    pdf.setFontSize(9); pdf.setTextColor(217, 119, 6);
    pdf.text("DRAFT — NOT FOR FILING (unverified or unapproved entries)", W / 2, 24, { align: "center" });
    pdf.setTextColor(15, 23, 42);
  };
  const newPage = () => { pdf.addPage(); y = M; stamp(); };
  const need = (h: number) => { if (y + h > H - M) newPage(); };
  const line = (t: string, size = 10, bold = false, gap = 4) => {
    pdf.setFont("helvetica", bold ? "bold" : "normal"); pdf.setFontSize(size);
    for (const l of pdf.splitTextToSize(t, W - 2 * M) as string[]) { need(size + gap); pdf.text(l, M, y); y += size + gap; }
  };
  const h2 = (t: string) => { y += 10; need(30); line(t, 13, true, 8); pdf.setDrawColor(226, 232, 240); pdf.line(M, y - 4, W - M, y - 4); y += 4; };

  stamp();
  const inc = d.incident, s = summarize(d);
  line(`${opts.orgName} — FEMA Public Assistance Reimbursement Packet`, 16, true, 8);
  line(inc.name, 13, true);
  line(`Declaration: ${inc.fema_declaration ?? "—"} · Status: ${inc.status} · Started ${fmtUTC(inc.started_at)}${inc.ended_at ? ` · Ended ${fmtUTC(inc.ended_at)}` : ""}`);
  line(`Generated ${fmtUTC(new Date().toISOString())} by Beacon`, 9);

  h2("Reimbursement summary by FEMA category");
  for (const [cat, v] of Object.entries(s.byCat).sort()) line(`${femaLabel(cat)}: labor ${usd(v.labor)} · equipment ${usd(v.equipment)} · materials ${usd(v.materials)} · total ${usd(v.labor + v.equipment + v.materials)}`);
  line(`Total estimated reimbursable: ${usd(s.total)}`, 11, true);

  h2(`Force account labor (${d.labor.length})`);
  for (const r of d.labor) line(`${fmtUTC(r.entry_time)} · ${r.staff_name}${r.role_title ? `, ${r.role_title}` : ""} · ${r.department ?? "—"} · Cat ${r.fema_category ?? "—"} · ${r.regular_hours} reg + ${r.overtime_hours} OT @ $${r.hourly_rate}/hr, fringe ${r.fringe_pct}% = ${usd(Number(r.total_cost))}${r.rate_verified ? " · verified" : ""}${r.review_status === "approved" ? " · approved" : ""}`, 9);
  h2(`Force account equipment (${d.equipment.length})`);
  for (const r of d.equipment) line(`${fmtUTC(r.entry_time)} · ${r.equipment_name} · code ${r.fema_cost_code ?? r.fema_code ?? "—"} ed. ${r.schedule_edition ?? "—"} · ${r.active_hours} active hrs @ $${r.hourly_rate}/hr = ${usd(Number(r.reimbursable_total ?? equipmentCost(Number(r.active_hours), Number(r.hourly_rate))))} · standby ${r.standby_hours} hrs (non-reimbursable)${r.rate_verified ? " · verified" : ""}${r.review_status === "approved" ? " · approved" : ""}`, 9);
  h2(`Materials & purchases (${d.materials.length})`);
  for (const r of d.materials) line(`${fmtUTC(r.entry_time)} · ${r.item_description} · ${r.vendor ?? "—"} · ${r.quantity} × $${r.unit_cost} = ${usd(Number(r.total_cost))}${r.receipt_path ? " · receipt on file" : ""}${r.review_status === "approved" ? " · approved" : ""}`, 9);
  h2(`ICS-214 activity log (${d.logs.length})`);
  for (const r of d.logs) line(`${fmtUTC(r.entry_time)} · ${r.category} · ${r.author_name ?? ""}: ${r.notes}${r.gps_lat != null ? ` (${r.gps_lat.toFixed(5)}, ${r.gps_lng?.toFixed(5)})` : ""}`, 9);

  const receipts = d.materials.filter((m) => m.receipt_path).map((m) => ({ path: m.receipt_path!, caption: `Receipt — ${m.item_description} (${m.vendor ?? "vendor n/a"})`, time: m.entry_time, lat: null as number | null, lng: null as number | null, phase: "receipt" }));
  const photos = [...d.photos.map((p) => ({ path: p.storage_path, caption: p.caption || "Untitled", time: p.taken_at, lat: p.gps_lat, lng: p.gps_lng, phase: p.phase })), ...receipts];
  if (photos.length) {
    const { data: signed } = await supabase.storage.from("incident-evidence").createSignedUrls(photos.map((p) => p.path), 600);
    const urls = Object.fromEntries((signed ?? []).map((x) => [x.path ?? "", x.signedUrl ?? ""]));
    newPage(); line("Photo evidence appendix", 13, true, 10);
    const boxW = (W - 2 * M - 16) / 2, boxH = 200;
    let col = 0;
    for (const p of photos) {
      const img = urls[p.path] ? await toDataUrl(urls[p.path]!) : null;
      if (col === 0) need(boxH + 44);
      const x = M + col * (boxW + 16);
      if (img) {
        const sc = Math.min(boxW / img.w, boxH / img.h);
        pdf.addImage(img.data, "JPEG", x, y, img.w * sc, img.h * sc);
      } else { pdf.setFontSize(9); pdf.text("(image unavailable)", x, y + 12); }
      pdf.setFontSize(8); pdf.setFont("helvetica", "bold");
      pdf.text(pdf.splitTextToSize(`${p.phase.toUpperCase()} · ${p.caption}`, boxW) as string[], x, y + boxH + 12);
      pdf.setFont("courier", "normal");
      pdf.text(`${fmtUTC(p.time)}${p.lat != null && p.lng != null ? ` · ${p.lat.toFixed(5)}, ${p.lng.toFixed(5)}` : " · no GPS"}`, x, y + boxH + 32);
      col = (col + 1) % 2;
      if (col === 0) y += boxH + 44;
    }
  }
  const pages = pdf.getNumberOfPages();
  for (let i = 1; i <= pages; i++) { pdf.setPage(i); pdf.setFont("helvetica", "normal"); pdf.setFontSize(8); pdf.text(`${inc.name} · page ${i} of ${pages}`, W / 2, H - 20, { align: "center" }); }
  return pdf.output("blob");
}
