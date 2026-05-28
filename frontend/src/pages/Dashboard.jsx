import { useEffect, useState } from "react";
import { getStats } from "../api";

const StatCard = ({ label, value, subText, color, icon, borderBg }) => (
  <div
    className="card-glass"
    style={{
      flex: 1,
      minWidth: 220,
      borderLeft: `4px solid ${color}`,
      display: "flex",
      flexDirection: "column",
      justifyContent: "space-between",
      gap: 8,
      position: "relative"
    }}
  >
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
      <span style={{ fontSize: 12, color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 700, letterSpacing: "0.05em" }}>
        {label}
      </span>
      <span style={{ fontSize: 18, color: color }}>{icon}</span>
    </div>
    <div>
      <div style={{ fontSize: 32, fontWeight: 800, color: "var(--text-main)", fontFamily: "var(--font-heading)", letterSpacing: "-0.02em" }}>
        {value}
      </div>
      {subText && (
        <span style={{ fontSize: 11, color: "var(--text-light)", fontWeight: 500 }}>
          {subText}
        </span>
      )}
    </div>
  </div>
);

export default function Dashboard() {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    getStats().then(setStats);
  }, []);

  if (!stats) {
    return (
      <div style={{ display: "flex", justifyContent: "center", padding: 80 }}>
        <p style={{ color: "var(--text-muted)", fontWeight: 600 }}>Loading carbon diagnostics…</p>
      </div>
    );
  }

  const tCO2e = (stats.total_kgco2e / 1000).toFixed(2);
  const s = stats.by_scope;
  const total = stats.total_kgco2e || 1;

  // Compute clean data score: decreases with more flags/pending records
  const totalRecords = stats.approved + stats.pending + stats.locked;
  const cleanScore = totalRecords > 0 
    ? Math.max(0, Math.min(100, Math.round(((totalRecords - stats.flagged) / totalRecords) * 100)))
    : 100;

  return (
    <div className="animate-fade-in">
      {/* Welcome Title */}
      <div style={{ marginBottom: 32, display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: 16 }}>
        <div>
          <h2 style={{ fontSize: 28, color: "var(--text-main)", fontWeight: 800 }}>Environmental Overview</h2>
          <p style={{ color: "var(--text-muted)", fontSize: 14 }}>Real-time greenhouse gas scope auditing and ingestion metrics.</p>
        </div>
        
        {/* Data Integrity Score widget */}
        <div className="card-glass" style={{ padding: "10px 20px", display: "flex", alignItems: "center", gap: 12, minWidth: 200, borderRadius: 14 }}>
          <div style={{ position: "relative", width: 42, height: 42, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <svg width="42" height="42" viewBox="0 0 36 36" style={{ transform: "rotate(-90deg)" }}>
              <circle cx="18" cy="18" r="16" fill="none" stroke="var(--border-color)" strokeWidth="3" />
              <circle cx="18" cy="18" r="16" fill="none" stroke="var(--color-primary)" strokeWidth="3.5"
                      strokeDasharray={`${cleanScore}, 100`} style={{ transition: "stroke-dasharray 0.8s ease" }} />
            </svg>
            <span style={{ position: "absolute", fontSize: 11, fontWeight: 800, color: "var(--color-primary)" }}>{cleanScore}%</span>
          </div>
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text-main)" }}>Integrity Score</div>
            <div style={{ fontSize: 10, color: "var(--text-light)" }}>Clean vs Flagged Records</div>
          </div>
        </div>
      </div>

      {/* Grid Cards Container */}
      <div className="stats-grid">
        <StatCard
          label="Total Carbon Footprint"
          value={`${tCO2e} t`}
          subText={`Across all parsed scopes & units`}
          color="var(--color-primary)"
          icon="🌱"
        />
        <StatCard
          label="Scope 1 Direct"
          value={`${(s[1] || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })} kg`}
          subText="Fuel combustion / SAP"
          color="var(--color-scope1)"
          icon="🔥"
        />
        <StatCard
          label="Scope 2 Indirect"
          value={`${(s[2] || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })} kg`}
          subText="Purchased electricity"
          color="var(--color-scope2)"
          icon="⚡"
        />
        <StatCard
          label="Scope 3 Chain"
          value={`${(s[3] || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })} kg`}
          subText="Corporate travel / Hotels"
          color="var(--color-scope3)"
          icon="✈️"
        />
      </div>

      {/* Minor Stats Matrix Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16, marginBottom: 40 }}>
        {[
          { label: "Pending Verification", value: stats.pending, color: "var(--color-warning)", icon: "⏳" },
          { label: "Flagged Anomalies", value: stats.flagged, color: "var(--color-danger)", icon: "⚠️" },
          { label: "Verified & Approved", value: stats.approved, color: "var(--color-primary)", icon: "✓" },
          { label: "Audit-Locked", value: stats.locked, color: "var(--color-locked)", icon: "🔒" },
        ].map(({ label, value, color, icon }) => (
          <div key={label} className="card-glass" style={{ padding: "16px 20px", display: "flex", alignItems: "center", gap: 14 }}>
            <span style={{ fontSize: 24, padding: 8, borderRadius: 10, background: color + "1a" }}>{icon}</span>
            <div>
              <div style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em" }}>{label}</div>
              <div style={{ fontSize: 22, fontWeight: 800, color: "var(--text-main)" }}>{value}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Visual Chart and Carbon breakdown Section */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 24, marginBottom: 40 }}>
        {/* Scope breakdown bar chart */}
        <div className="card-glass">
          <h3 style={{ fontSize: 18, marginBottom: 24, fontWeight: 700 }}>Scope Carbon Contribution</h3>
          
          <div className="chart-bar-container">
            {[
              { scope: 1, label: "Scope 1 — Direct fuel combustion", color: "var(--color-scope1)", desc: "Diesel, petrol, gas" },
              { scope: 2, label: "Scope 2 — Purchased electricity", color: "var(--color-scope2)", desc: "Location-based regional grid" },
              { scope: 3, label: "Scope 3 — Corporate value chain", color: "var(--color-scope3)", desc: "Flights, business travel, hotels" },
            ].map(({ scope, label, color, desc }) => {
              const val = s[scope] || 0;
              const pct = ((val / total) * 100).toFixed(1);
              return (
                <div key={scope} style={{ marginBottom: 16 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", fontSize: 13, marginBottom: 6 }}>
                    <div>
                      <div style={{ fontWeight: 700, color: "var(--text-main)" }}>{label}</div>
                      <div style={{ fontSize: 11, color: "var(--text-light)" }}>{desc}</div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <span style={{ fontWeight: 800, color: color }}>{val.toLocaleString(undefined, { maximumFractionDigits: 0 })} kg</span>
                      <span style={{ fontSize: 11, color: "var(--text-muted)", marginLeft: 6 }}>({pct}%)</span>
                    </div>
                  </div>
                  <div className="chart-bar-bg">
                    <div
                      className="chart-bar-fill"
                      style={{
                        width: `${pct}%`,
                        background: `linear-gradient(90deg, ${color}, ${color}dd)`
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Dynamic Category Analysis Widget */}
        <div className="card-glass" style={{ display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
          <div>
            <h3 style={{ fontSize: 18, marginBottom: 6, fontWeight: 700 }}>Diagnostic Indicators</h3>
            <p style={{ color: "var(--text-muted)", fontSize: 13, marginBottom: 20 }}>Factors derived from DEFRA 2023 / GHG Protocol guidelines.</p>
            
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid var(--border-color)", paddingBottom: 10 }}>
                <span style={{ fontSize: 13, color: "var(--text-muted)", fontWeight: 500 }}>Global Warming Potential</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: "var(--text-main)" }}>CO₂ Equivalent (100-yr)</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid var(--border-color)", paddingBottom: 10 }}>
                <span style={{ fontSize: 13, color: "var(--text-muted)", fontWeight: 500 }}>Grid Factors Supported</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: "var(--text-main)" }}>UK, IN (CEA), US (EPA)</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid var(--border-color)", paddingBottom: 10 }}>
                <span style={{ fontSize: 13, color: "var(--text-muted)", fontWeight: 500 }}>Travel Logic Fallback</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: "var(--text-main)" }}>Great-Circle IATA Estimator</span>
              </div>
            </div>
          </div>

          <div style={{
            background: "var(--color-primary-light)",
            border: "1px solid var(--border-color)",
            padding: 16,
            borderRadius: 12,
            marginTop: 20,
            display: "flex",
            gap: 12,
            alignItems: "center"
          }}>
            <span style={{ fontSize: 24 }}>💡</span>
            <p style={{ fontSize: 12, color: "var(--text-muted)", lineHeight: 1.5 }}>
              <strong>ESG Analyst Tip:</strong> To export a legally compliant carbon audit report, verify all pending and flagged items in the <strong>Review Queue</strong> and hit <strong>Lock for Audit</strong>.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
