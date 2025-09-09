import React, { useMemo, useState } from "react";

/**
 * 2025/26 WA HT Axle Calculator (React + TS)
 * - Fixed for Vercel/Vite minimal build.
 * - Tailwind via CDN in index.html (no build step).
 */

export const DEFAULTS = {
  gstRate: 0.10,
  dutyRate: 0.03,
  dutyCap: 12000,
  licencePerAxle: 572,
  recordingFee: 10.45,
  plateFee: 32.0,
  insuranceBase: 14.59,
  insuranceGstRate: 0.10,
  insuranceDutyRate: 0.11,
  inspectionInitial: 284.0,
  inspectionReinspection: 172.0,
};

export type CalcInput = {
  priceExGst: number;
  axles: number;
  includeGstInDuty: boolean;
  applyDutyCap: boolean;
  firstTimeLicensing: boolean;
  includeInsuranceLines: boolean;
  inspectionType: "none" | "initial" | "reinspection";
};

export type CalcOutput = {
  gst: number;
  dutiable: number;
  duty: number;
  licenceFee: number;
  insuranceBase: number;
  insuranceGst: number;
  insuranceDuty: number;
  recordingFee: number;
  plateFee: number;
  inspectionFee: number;
  roadRegoSubtotal: number;
  totalOnRoad: number;
};

const toCents = (aud: number) => Math.round(aud * 100);
const fromCents = (cents: number) => cents / 100;
const money = (x: number) =>
  new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD" }).format(x);

export function calculate(input: CalcInput, cfg = DEFAULTS): CalcOutput {
  const P = toCents(input.priceExGst);
  const gst = input.includeGstInDuty ? Math.round(P * cfg.gstRate) : 0;
  const dutiable = P + gst;
  const dutyRaw = Math.round(dutiable * cfg.dutyRate);
  const dutyCapCents = toCents(cfg.dutyCap);
  const duty = input.applyDutyCap ? Math.min(dutyRaw, dutyCapCents) : dutyRaw;

  const licenceFee = toCents(cfg.licencePerAxle * input.axles);

  const insuranceBase = input.includeInsuranceLines ? toCents(cfg.insuranceBase) : 0;
  const insuranceGst = input.includeInsuranceLines ? Math.round(insuranceBase * cfg.insuranceGstRate) : 0;
  const insuranceDuty = input.includeInsuranceLines ? Math.round(insuranceBase * cfg.insuranceDutyRate) : 0;

  const recordingFee = input.firstTimeLicensing ? toCents(cfg.recordingFee) : 0;
  const plateFee = input.firstTimeLicensing ? toCents(cfg.plateFee) : 0;

  const inspectionFee =
    input.inspectionType === "initial"
      ? toCents(cfg.inspectionInitial)
      : input.inspectionType === "reinspection"
      ? toCents(cfg.inspectionReinspection)
      : 0;

  const roadRegoSubtotal =
    licenceFee + insuranceBase + insuranceGst + insuranceDuty + recordingFee + plateFee + inspectionFee;
  const totalOnRoad = roadRegoSubtotal + duty;

  return {
    gst: fromCents(gst),
    dutiable: fromCents(dutiable),
    duty: fromCents(duty),
    licenceFee: fromCents(licenceFee),
    insuranceBase: fromCents(insuranceBase),
    insuranceGst: fromCents(insuranceGst),
    insuranceDuty: fromCents(insuranceDuty),
    recordingFee: fromCents(recordingFee),
    plateFee: fromCents(plateFee),
    inspectionFee: fromCents(inspectionFee),
    roadRegoSubtotal: fromCents(roadRegoSubtotal),
    totalOnRoad: fromCents(totalOnRoad),
  };
}

const PresetButton: React.FC<{ label: string; onClick: () => void }> = ({ label, onClick }) => (
  <button onClick={onClick} className="px-3 py-1 rounded-full border text-sm hover:shadow">
    {label}
  </button>
);

function HTAxleCalc() {
  const [priceExGst, setPriceExGst] = useState<string>("75000");
  const [axles, setAxles] = useState<number>(3);
  const [includeGstInDuty, setIncludeGstInDuty] = useState<boolean>(true);
  const [applyDutyCap, setApplyDutyCap] = useState<boolean>(true);
  const [firstTimeLicensing, setFirstTimeLicensing] = useState<boolean>(true);
  const [includeInsuranceLines, setIncludeInsuranceLines] = useState<boolean>(true);
  const [inspectionType, setInspectionType] = useState<"none" | "initial" | "reinspection">("initial");

  const parsedPrice = Number(priceExGst.replace(/[^0-9.]/g, "")) || 0;

  const out = useMemo(
    () =>
      calculate({
        priceExGst: parsedPrice,
        axles,
        includeGstInDuty,
        applyDutyCap,
        firstTimeLicensing,
        includeInsuranceLines,
        inspectionType,
      }),
    [parsedPrice, axles, includeGstInDuty, applyDutyCap, firstTimeLicensing, includeInsuranceLines, inspectionType]
  );

  const copyBreakdown = async () => {
    const lines = [
      `Asset price (ex-GST): ${money(parsedPrice)}`,
      `Axles: ${axles}`,
      includeGstInDuty ? `GST added to duty base: ${money(out.gst)}` : `GST added to duty base: $0.00`,
      `Dutiable value: ${money(out.dutiable)}`,
      `Stamp duty (3%${applyDutyCap ? ", capped $12,000" : ""}): ${money(out.duty)}`,
      `Licence fee (${DEFAULTS.licencePerAxle.toFixed(0)} per axle): ${money(out.licenceFee)}`,
      includeInsuranceLines
        ? `Insurance lines: base ${money(out.insuranceBase)}, GST ${money(out.insuranceGst)}, duty ${money(out.insuranceDuty)}`
        : undefined,
      firstTimeLicensing ? `Recording fee: ${money(out.recordingFee)}` : undefined,
      firstTimeLicensing ? `Plate fee: ${money(out.plateFee)}` : undefined,
      inspectionType !== "none" ? `Inspection fee (${inspectionType === "initial" ? "Initial" : "Reinspection"}): ${money(out.inspectionFee)}` : undefined,
      `Road rego subtotal: ${money(out.roadRegoSubtotal)}`,
      `TOTAL on-road: ${money(out.totalOnRoad)}`,
    ]
      .filter((l): l is string => typeof l === "string")
      .join("\n");

    try {
      await navigator.clipboard.writeText(lines);
    } catch {}
  };

  return (
    <div className="min-h-screen bg-white text-slate-900">
      <div className="max-w-3xl mx-auto p-6 space-y-6">
        <header className="space-y-2">
          <h1 className="text-2xl font-bold">2025 Licence & Stamp Duty Calculator — HT Class (Axle Calc)</h1>
          <p className="text-sm text-slate-600">WA, first-time licensing by default. Values are configurable and rounded to cents.</p>
        </header>

        <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Asset price (ex-GST)</label>
            <input
              inputMode="decimal"
              value={priceExGst}
              onChange={(e) => setPriceExGst(e.target.value)}
              className="w-full rounded-xl border px-3 py-2 focus:outline-none focus:ring"
              placeholder="e.g. 75000"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Axles</label>
            <input
              type="number"
              min={1}
              max={9}
              value={axles}
              onChange={(e) => setAxles(Math.max(1, Math.min(9, Number(e.target.value) || 1)))}
              className="w-full rounded-xl border px-3 py-2 focus:outline-none focus:ring"
            />
            <div className="flex gap-2 flex-wrap pt-1">
              {[1, 2, 3, 4, 5].map((n) => (
                <PresetButton key={n} label={`${n}`} onClick={() => setAxles(n)} />
              ))}
            </div>
          </div>
        </section>

        <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="inline-flex items-center gap-2 text-sm">
              <input type="checkbox" checked={includeGstInDuty} onChange={(e) => setIncludeGstInDuty(e.target.checked)} />
              Include GST (10%) in duty base
            </label>
            <label className="inline-flex items-center gap-2 text-sm">
              <input type="checkbox" checked={applyDutyCap} onChange={(e) => setApplyDutyCap(e.target.checked)} />
              Apply duty cap ($12,000)
            </label>
            <label className="inline-flex items-center gap-2 text-sm">
              <input type="checkbox" checked={firstTimeLicensing} onChange={(e) => setFirstTimeLicensing(e.target.checked)} />
              First-time licensing (include plate + recording)
            </label>
            <label className="inline-flex items-center gap-2 text-sm">
              <input type="checkbox" checked={includeInsuranceLines} onChange={(e) => setIncludeInsuranceLines(e.target.checked)} />
              Include insurance micro-lines (from workbook) — ON by default
            </label>
            <div className="pt-2">
              <div className="text-sm font-medium mb-1">Inspection fee (Major Motors)</div>
              <div className="flex flex-col gap-1 text-sm">
                <label className="inline-flex items-center gap-2">
                  <input type="radio" name="insp" checked={inspectionType === "none"} onChange={() => setInspectionType("none")} />
                  None
                </label>
                <label className="inline-flex items-center gap-2">
                  <input type="radio" name="insp" checked={inspectionType === "initial"} onChange={() => setInspectionType("initial")} />
                  Initial inspection ({money(DEFAULTS.inspectionInitial)})
                </label>
                <label className="inline-flex items-center gap-2">
                  <input type="radio" name="insp" checked={inspectionType === "reinspection"} onChange={() => setInspectionType("reinspection")} />
                  Reinspection ({money(DEFAULTS.inspectionReinspection)})
                </label>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <details className="rounded-xl border p-3">
              <summary className="cursor-pointer font-medium">Config (rates)</summary>
              <div className="grid grid-cols-2 gap-2 pt-2 text-sm">
                <div>GST rate</div><div>{(DEFAULTS.gstRate * 100).toFixed(0)}%</div>
                <div>Duty rate</div><div>{(DEFAULTS.dutyRate * 100).toFixed(0)}%</div>
                <div>Duty cap</div><div>{money(DEFAULTS.dutyCap)}</div>
                <div>Licence / axle</div><div>{money(DEFAULTS.licencePerAxle)}</div>
                <div>Recording fee</div><div>{money(DEFAULTS.recordingFee)}</div>
                <div>Plate fee</div><div>{money(DEFAULTS.plateFee)}</div>
                <div>Ins. base</div><div>{money(DEFAULTS.insuranceBase)}</div>
                <div>Ins. GST</div><div>{(DEFAULTS.insuranceGstRate * 100).toFixed(0)}%</div>
                <div>Ins. duty</div><div>{(DEFAULTS.insuranceDutyRate * 100).toFixed(0)}%</div>
                <div>Inspection (initial)</div><div>{money(DEFAULTS.inspectionInitial)}</div>
                <div>Inspection (reinspection)</div><div>{money(DEFAULTS.inspectionReinspection)}</div>
              </div>
            </details>
          </div>
        </section>

        <section className="rounded-2xl border shadow-sm">
          <div className="p-4 border-b font-semibold">Breakdown</div>
          <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2 text-sm">
            <div className="flex justify-between"><span>Dutiable value</span><span>{money(out.dutiable)}</span></div>
            <div className="flex justify-between"><span>Stamp duty (3%{applyDutyCap ? ", capped" : ""})</span><span>{money(out.duty)}</span></div>
            <div className="flex justify-between"><span>Licence fee</span><span>{money(out.licenceFee)}</span></div>
            {includeInsuranceLines && <>
              <div className="flex justify-between"><span>Insurance base</span><span>{money(out.insuranceBase)}</span></div>
              <div className="flex justify-between"><span>Insurance GST</span><span>{money(out.insuranceGst)}</span></div>
              <div className="flex justify-between"><span>Insurance duty</span><span>{money(out.insuranceDuty)}</span></div>
            </>}
            {firstTimeLicensing && <>
              <div className="flex justify-between"><span>Recording fee</span><span>{money(out.recordingFee)}</span></div>
              <div className="flex justify-between"><span>Number plate issue</span><span>{money(out.plateFee)}</span></div>
            </>}
            {inspectionType !== "none" && (
              <div className="flex justify-between"><span>Inspection fee ({inspectionType === "initial" ? "Initial" : "Reinspection"})</span><span>{money(out.inspectionFee)}</span></div>
            )}
            <div className="col-span-full border-t my-2"></div>
            <div className="flex justify-between font-medium"><span>Road rego subtotal</span><span>{money(out.roadRegoSubtotal)}</span></div>
            <div className="flex justify-between text-lg font-bold"><span>Total on-road</span><span>{money(out.totalOnRoad)}</span></div>
          </div>
          <div className="p-4 border-t flex gap-2">
            <button onClick={copyBreakdown} className="px-3 py-2 rounded-xl border hover:shadow">Copy breakdown</button>
            <button
              onClick={() => {
                setPriceExGst("0");
                setAxles(3);
                setIncludeGstInDuty(true);
                setApplyDutyCap(true);
                setFirstTimeLicensing(true);
                setIncludeInsuranceLines(true);
                setInspectionType("initial");
              }}
              className="px-3 py-2 rounded-xl border hover:shadow"
            >Reset</button>
          </div>
        </section>

        <footer className="text-xs text-slate-500">
          <p>
            Notes: Duty rate and cap follow WA RevenueWA heavy vehicle duty (3% up to $12,000). Licence fee is configured per axle for HT class. Trailers generally do not pay Motor Injury Insurance (MII) in WA; the optional insurance micro-lines mirror your workbook and are enabled by default. Inspection fees (Major Motors) are selectable as Initial or Reinspection and are included in the total when chosen.
          </p>
        </footer>
      </div>
    </div>
  );
}

export default function App() {
  return <HTAxleCalc />;
}
