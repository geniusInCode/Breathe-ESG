import { useState } from "react";
import { uploadFile, loadDemoData } from "../api";

const SOURCE_DETAILS = {
  SAP: {
    title: "SAP Fuel & Procurement",
    scope: "Scope 1 Direct",
    badgeColor: "var(--color-scope1)",
    desc: "Tab-delimited ALV/ME2M exports representing enterprise fossil fuel procurement.",
    cols: "MENGE (qty), MEINS (unit), BUDAT (date DD.MM.YYYY), TXZ01 (material desc), WERKS (plant)",
    sample: "MENGE\tMEINS\tWERKS\tBUDAT\tMANTR\tTXZ01\n450.0\tL\t1000\t01.03.2024\tMAT-001\tDiesel fuel road transport",
  },
  UTILITY: {
    title: "Utility Electricity Portal",
    scope: "Scope 2 Indirect",
    badgeColor: "var(--color-scope2)",
    desc: "Standard CSV exports from billing portals (e.g. EDF, British Gas, GreenButton).",
    cols: "meter_id, billing_start, billing_end, consumption_kwh",
    sample: "meter_id,billing_start,billing_end,consumption_kwh\nMTR-001,2024-02-01,2024-03-04,12450.5",
  },
  TRAVEL: {
    title: "Corporate Business Travel",
    scope: "Scope 3 Value Chain",
    badgeColor: "var(--color-scope3)",
    desc: "Corporate booking CSV extracts covering flights, accommodation nights, and taxis.",
    cols: "trip_id, category (AIR/HOTEL/CAR/RAIL), origin, destination, travel_date, distance_km, nights",
    sample: "trip_id,category,origin,destination,travel_date,distance_km,nights\nT001,AIR,BLR,LHR,2024-03-10,,",
  },
};

export default function Upload() {
  const [sourceType, setSourceType] = useState("SAP");
  const [file, setFile] = useState(null);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [demoLoading, setDemoLoading] = useState({});
  const details = SOURCE_DETAILS[sourceType];

  const handleUploadSubmit = async () => {
    if (!file) return alert("Please select a local CSV/TSV file first.");
    setLoading(true);
    setResult(null);
    try {
      const res = await uploadFile(sourceType, file);
      setResult({ ...res, mode: "upload" });
    } catch (e) {
      setResult({ error: String(e) });
    }
    setLoading(false);
  };

  const handleDemoSubmit = async (type) => {
    setDemoLoading(prev => ({ ...prev, [type]: true }));
    setResult(null);
    try {
      const res = await loadDemoData(type);
      setResult({ ...res, mode: "demo", demoType: type });
    } catch (e) {
      setResult({ error: String(e) });
    }
    setDemoLoading(prev => ({ ...prev, [type]: false }));
  };

  const downloadSampleTemplate = () => {
    const blob = new Blob([details.sample], { type: "text/plain" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `sample_${sourceType.toLowerCase()}.${sourceType === "SAP" ? "tsv" : "csv"}`;
    a.click();
  };

  return (
    <div className="animate-fade-in" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 32 }}>
      {/* File Upload Form */}
      <div>
        <h2 style={{ fontSize: 24, fontWeight: 800, marginBottom: 6 }}>Upload Emissions Raw File</h2>
        <p style={{ color: "var(--text-muted)", fontSize: 13, marginBottom: 24 }}>
          Ingest flat-files. Data is automatically normalized, checked for anomalies, and stored.
        </p>

        <div className="card-glass" style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {/* Source Type Select */}
          <label style={{ display: "block" }}>
            <div style={{ fontSize: 13, color: "var(--text-main)", marginBottom: 6, fontWeight: 700 }}>
              Environmental Scope Source Type
            </div>
            <select
              value={sourceType}
              onChange={e => { setSourceType(e.target.value); setResult(null); }}
              className="input-field"
              style={{ paddingRight: 32, cursor: "pointer", fontWeight: 600 }}
            >
              <option value="SAP">SAP — Procurement &amp; Fuels (Scope 1)</option>
              <option value="UTILITY">Utility Portal — Electricity (Scope 2)</option>
              <option value="TRAVEL">Corporate Travel — Flights &amp; Hotels (Scope 3)</option>
            </select>
          </label>

          {/* Interactive Drag & Drop Area */}
          <label className="file-upload-zone" style={{ display: "block" }}>
            <span style={{ fontSize: 32 }}>📁</span>
            <div style={{ fontWeight: 700, fontSize: 14, color: "var(--text-main)", marginTop: 10 }}>
              {file ? file.name : "Choose CSV or TSV File"}
            </div>
            <div style={{ fontSize: 11, color: "var(--text-light)", marginTop: 4 }}>
              {file ? `${(file.size / 1024).toFixed(1)} KB` : "Drag and drop or click to browse files"}
            </div>
            <input
              type="file"
              accept=".csv,.txt,.tsv"
              onChange={e => { setFile(e.target.files[0]); setResult(null); }}
              style={{ display: "none" }}
            />
          </label>

          {/* Submit Actions */}
          <div style={{ display: "flex", gap: 12 }}>
            <button
              onClick={handleUploadSubmit}
              disabled={loading}
              className="btn-primary"
              style={{ flex: 2 }}
            >
              {loading ? "Parsing Data…" : "Upload & Standardize"}
            </button>
            <button
              onClick={downloadSampleTemplate}
              className="btn-secondary"
              style={{ flex: 1, padding: "10px 14px" }}
              title="Download structure blueprint"
            >
              Blueprint
            </button>
          </div>
        </div>

        {/* Action result notification banner */}
        {result && (
          <div
            className="animate-fade-in"
            style={{
              marginTop: 24,
              padding: 20,
              borderRadius: 16,
              background: result.error ? "var(--color-danger-light)" : "var(--color-primary-light)",
              border: `1px solid ${result.error ? "var(--color-danger)" : "var(--color-primary)"}33`,
              color: result.error ? "var(--color-danger)" : "var(--text-main)",
            }}
          >
            {result.error ? (
              <div style={{ display: "flex", gap: 10 }}>
                <span>❌</span>
                <div>
                  <strong style={{ display: "block", fontSize: 14 }}>Ingestion Failure</strong>
                  <span style={{ fontSize: 12 }}>{result.error}</span>
                </div>
              </div>
            ) : (
              <div>
                <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 8 }}>
                  <span style={{ fontSize: 18 }}>✓</span>
                  <div>
                    <strong style={{ fontSize: 14 }}>Data Ingested Successfully!</strong>
                    <div style={{ fontSize: 11, color: "var(--text-muted)" }}>
                      Registered under Ingestion Run #{result.run_id}
                    </div>
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 12, borderTop: "1px solid var(--border-color)", paddingTop: 10 }}>
                  <div>
                    <div style={{ fontSize: 10, color: "var(--text-muted)", textTransform: "uppercase" }}>Rows Logged</div>
                    <div style={{ fontSize: 18, fontWeight: 800, color: "var(--color-primary)" }}>{result.rows_ingested}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 10, color: "var(--text-muted)", textTransform: "uppercase" }}>Flagged Issues</div>
                    <div style={{ fontSize: 18, fontWeight: 800, color: result.errors?.length > 0 ? "var(--color-danger)" : "var(--color-primary)" }}>
                      {result.errors?.length || 0}
                    </div>
                  </div>
                </div>

                {result.errors?.length > 0 && (
                  <details style={{ marginTop: 12 }}>
                    <summary style={{ fontSize: 12, cursor: "pointer", fontWeight: 700, color: "var(--color-danger)" }}>
                      Show error diagnostic trace ({result.errors.length})
                    </summary>
                    <pre style={{
                      fontSize: 11,
                      marginTop: 8,
                      overflowX: "auto",
                      background: "var(--bg-app)",
                      color: "var(--text-main)",
                      padding: 10,
                      borderRadius: 8,
                      border: "1px solid var(--border-color)"
                    }}>
                      {JSON.stringify(result.errors, null, 2)}
                    </pre>
                  </details>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Blueprint Info and One-Click Demo Center */}
      <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
        {/* Dynamic Blueprint Card */}
        <div className="card-glass" style={{ borderTop: `4px solid ${details.badgeColor}` }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
            <h3 style={{ fontSize: 18, fontWeight: 700 }}>{details.title}</h3>
            <span
              className="badge"
              style={{
                background: details.badgeColor + "1a",
                color: details.badgeColor,
                border: `1px solid ${details.badgeColor}33`
              }}
            >
              {details.scope}
            </span>
          </div>
          <p style={{ color: "var(--text-muted)", fontSize: 13, marginBottom: 14 }}>{details.desc}</p>
          
          <div style={{ padding: 12, background: "var(--bg-app)", borderRadius: 12, border: "1px solid var(--border-color)" }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", marginBottom: 4, textTransform: "uppercase" }}>
              Expected File Schema
            </div>
            <code style={{ fontSize: 11, color: "var(--color-primary)", wordBreak: "break-all" }}>{details.cols}</code>
          </div>
        </div>

        {/* Premium One-Click Demo Center */}
        <div className="card-glass" style={{ background: "linear-gradient(135deg, var(--bg-card), var(--color-primary-light))" }}>
          <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 6 }}>One-Click Demo Center</h3>
          <p style={{ color: "var(--text-muted)", fontSize: 13, marginBottom: 16 }}>
            No sample file at hand? Instantly trigger deep ingestion of the pre-loaded files stored on the server environment.
          </p>

          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {[
              { type: "SAP", label: "Procurements (Scope 1)", icon: "🔥", color: "var(--color-scope1)" },
              { type: "UTILITY", label: "Electricity (Scope 2)", icon: "⚡", color: "var(--color-scope2)" },
              { type: "TRAVEL", label: "Corporate Travel (Scope 3)", icon: "✈️", color: "var(--color-scope3)" },
            ].map(d => (
              <button
                key={d.type}
                onClick={() => handleDemoSubmit(d.type)}
                disabled={demoLoading[d.type]}
                className="btn-secondary"
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "12px 18px",
                  borderColor: demoLoading[d.type] ? "transparent" : "var(--border-color)",
                  cursor: demoLoading[d.type] ? "default" : "pointer"
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ fontSize: 16 }}>{d.icon}</span>
                  <span style={{ fontSize: 13, fontWeight: 700 }}>Inject {d.type} Demo Data</span>
                </div>
                <span style={{ fontSize: 11, color: d.color, fontWeight: 800 }}>
                  {demoLoading[d.type] ? "Processing…" : "Inject →"}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
