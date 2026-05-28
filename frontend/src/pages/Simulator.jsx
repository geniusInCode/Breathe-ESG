import { useEffect, useState } from "react";
import { getStats } from "../api";

const OFFSET_PROJECTS = [
  {
    id: "amazon",
    name: "Amazon Rainforest Conservation",
    type: "Forestry / REDD+",
    standard: "Verra VCS",
    costPerTon: 18,
    icon: "🌳",
    description: "Protects critical Amazon basin habitats from deforestation."
  },
  {
    id: "sahara",
    name: "Sahara Desert Wind Power",
    type: "Renewable Energy",
    standard: "Gold Standard",
    costPerTon: 12,
    icon: "💨",
    description: "Displaces regional fossil grid utilities with turbine farms."
  },
  {
    id: "iceland",
    name: "Iceland Direct Air Capture",
    type: "Carbon Removal / DAC",
    standard: "Puro.earth",
    costPerTon: 95,
    icon: "🌬️",
    description: "Permanently traps atmospheric CO2 in basalt rock formations."
  },
  {
    id: "cookstoves",
    name: "Clean Cookstoves Initiative",
    type: "Community Offset",
    standard: "UN CDM",
    costPerTon: 8,
    icon: "🔥",
    description: "Replaces traditional open fire wood stoves in rural areas."
  }
];

export default function Simulator() {
  const [stats, setStats] = useState(null);
  const [targetYear, setTargetYear] = useState(2030);
  const [targetReduction, setTargetReduction] = useState(50);
  
  // Operational reductions (percentages)
  const [scope1Red, setScope1Red] = useState(0);
  const [scope2Red, setScope2Red] = useState(0);
  const [scope3Red, setScope3Red] = useState(0);

  // Offset purchase quantities (tons)
  const [offsets, setOffsets] = useState({
    amazon: 0,
    sahara: 0,
    iceland: 0,
    cookstoves: 0
  });

  useEffect(() => {
    getStats().then(setStats);
  }, []);

  if (!stats) {
    return (
      <div style={{ display: "flex", justifyContent: "center", padding: 80 }}>
        <p style={{ color: "var(--text-muted)", fontWeight: 600 }}>Loading simulation parameters…</p>
      </div>
    );
  }

  // Calculate current baseline
  const baselineKg = stats.total_kgco2e || 120000;
  const s1 = stats.by_scope[1] || 40000;
  const s2 = stats.by_scope[2] || 50000;
  const s3 = stats.by_scope[3] || 30000;

  // Decarbonization Hotspot Analysis
  const scopesList = [
    { num: 1, name: "Scope 1 (Direct Fuel)", val: s1, icon: "🔥", color: "var(--color-scope1)" },
    { num: 2, name: "Scope 2 (Electricity)", val: s2, icon: "⚡", color: "var(--color-scope2)" },
    { num: 3, name: "Scope 3 (Value Chain)", val: s3, icon: "✈️", color: "var(--color-scope3)" }
  ];
  const hotspot = scopesList.reduce((max, s) => s.val > max.val ? s : max, scopesList[0]);
  const hotspotPercent = Math.round((hotspot.val / baselineKg) * 100);

  // Offset statistics
  const totalOffsetTons = Object.entries(offsets).reduce((total, [id, tons]) => total + tons, 0);
  const totalOffsetCost = Object.entries(offsets).reduce((total, [id, tons]) => {
    const project = OFFSET_PROJECTS.find(p => p.id === id);
    return total + (tons * project.costPerTon);
  }, 0);

  // Projections calculations
  const startYear = 2026;
  const yearsSpan = targetYear - startYear + 1;
  const years = Array.from({ length: yearsSpan }, (_, i) => startYear + i);

  // Annual standard growth rate (BAU)
  const growthRate = 0.035; // 3.5%

  // Build points for paths
  const points = years.map((year, index) => {
    // Business As Usual (growing baseline)
    const bauVal = baselineKg * Math.pow(1 + growthRate, index);
    
    // Target pathway (linear reduction from baseline to target goal)
    const targetFraction = 1 - (targetReduction / 100) * (index / (yearsSpan - 1));
    const targetVal = baselineKg * targetFraction;

    // Adjusted dynamic emissions
    // 1. Subtract operational savings
    const s1Adj = s1 * Math.pow(1 + growthRate, index) * (1 - scope1Red / 100);
    const s2Adj = s2 * Math.pow(1 + growthRate, index) * (1 - scope2Red / 100);
    const s3Adj = s3 * Math.pow(1 + growthRate, index) * (1 - scope3Red / 100);
    const grossEmissions = s1Adj + s2Adj + s3Adj;

    // 2. Subtract offset credits (linearly scale active offset purchases over the years)
    const activeOffsets = totalOffsetTons * 1000 * (index / (yearsSpan - 1 || 1));
    const netEmissions = Math.max(0, grossEmissions - activeOffsets);

    return {
      year,
      bau: bauVal / 1000, // tons
      target: targetVal / 1000,
      net: netEmissions / 1000
    };
  });

  // Calculate simulated Net-Zero milestone year
  let netZeroYear = "Not Reached";
  for (let pt of points) {
    if (pt.net <= 0.001) {
      netZeroYear = pt.year;
      break;
    }
  }

  // Graph plotting configurations
  const paddingX = 50;
  const paddingY = 30;
  const graphWidth = 650;
  const graphHeight = 250;

  const maxVal = Math.max(...points.map(p => Math.max(p.bau, p.target, p.net, baselineKg / 1000))) * 1.1;

  const getSvgX = (index) => paddingX + (index / (yearsSpan - 1 || 1)) * (graphWidth - 2 * paddingX);
  const getSvgY = (val) => graphHeight - paddingY - (val / maxVal) * (graphHeight - 2 * paddingY);

  // SVG path coordinates string builder
  const makePath = (key) => {
    return points.map((p, i) => `${i === 0 ? "M" : "L"} ${getSvgX(i)} ${getSvgY(p[key])}`).join(" ");
  };

  const handleOffsetSlider = (id, val) => {
    setOffsets(prev => ({ ...prev, [id]: parseInt(val) || 0 }));
  };

  return (
    <div className="animate-fade-in" style={{ display: "flex", flexDirection: "column", gap: 32 }}>
      {/* Page Title */}
      <div>
        <h2 style={{ fontSize: 28, color: "var(--text-main)", fontWeight: 800 }}>Footprint Projections &amp; Offset Simulator</h2>
        <p style={{ color: "var(--text-muted)", fontSize: 14 }}>Model your path to Net-Zero using operational efficiency controls and custom offset credit investments.</p>
      </div>

      {/* Decarbonization Hotspot Diagnostic Banner */}
      <div className="card-glass" style={{ borderLeft: `5px solid ${hotspot.color}`, background: "rgba(var(--color-primary-rgb), 0.02)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <span style={{ fontSize: 32 }}>🚨</span>
          <div>
            <h4 style={{ fontSize: 16, fontWeight: 700 }}>Decarbonization Hotspot Identified</h4>
            <p style={{ color: "var(--text-muted)", fontSize: 13, marginTop: 4 }}>
              Your largest emission source is <strong>{hotspot.name}</strong> contributing <strong>{hotspotPercent}%</strong> of your total footprint ({Math.round(hotspot.val / 1000)} tCO2e). Focus operational reductions on this sector for maximum decarbonization impact.
            </p>
          </div>
        </div>
      </div>

      <div className="simulator-layout">
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          {/* Section 1: Projection Graph */}
          <div className="card-glass">
            <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 16 }}>Carbon Neutrality Pathway Forecast</h3>
            <div style={{ display: "flex", justifyContent: "center", position: "relative" }}>
              <svg width="100%" height={graphHeight} viewBox={`0 0 ${graphWidth} ${graphHeight}`} style={{ overflow: "visible" }}>
                {/* Horizontal gridlines */}
                {[0, 0.25, 0.5, 0.75, 1].map((ratio, i) => {
                  const val = ratio * maxVal;
                  const y = getSvgY(val);
                  return (
                    <g key={i}>
                      <line x1={paddingX} y1={y} x2={graphWidth - paddingX} y2={y} stroke="var(--border-color)" strokeWidth="0.5" strokeDasharray="4 4" />
                      <text x={paddingX - 10} y={y + 4} textAnchor="end" fontSize="10" fill="var(--text-light)" fontWeight="600">
                        {Math.round(val)} t
                      </text>
                    </g>
                  );
                })}

                {/* Vertical Year labels */}
                {points.map((p, i) => {
                  if (yearsSpan > 10 && i % 3 !== 0 && i !== yearsSpan - 1) return null;
                  const x = getSvgX(i);
                  return (
                    <g key={i}>
                      <line x1={x} y1={paddingY} x2={x} y2={graphHeight - paddingY} stroke="var(--border-color)" strokeWidth="0.5" strokeDasharray="4 4" />
                      <text x={x} y={graphHeight - paddingY + 16} textAnchor="middle" fontSize="10" fill="var(--text-muted)" fontWeight="700">
                        {p.year}
                      </text>
                    </g>
                  );
                })}

                {/* Chart Paths */}
                {/* 1. BAU Path */}
                <path d={makePath("bau")} fill="none" stroke="var(--color-danger)" strokeWidth="2.5" strokeDasharray="6 4" opacity="0.65" />
                {/* 2. Target Path */}
                <path d={makePath("target")} fill="none" stroke="var(--color-locked)" strokeWidth="2" strokeDasharray="4 2" opacity="0.8" />
                {/* 3. Net Dynamic Adjusted Path */}
                <path d={makePath("net")} fill="none" stroke="var(--color-primary)" strokeWidth="3.5" style={{ transition: "all 0.3s ease" }} />

                {/* Current Baseline Indicator */}
                <circle cx={getSvgX(0)} cy={getSvgY(baselineKg / 1000)} r="5" fill="var(--color-primary)" />
              </svg>
            </div>

            {/* Chart Legend */}
            <div style={{ display: "flex", gap: 20, justifyContent: "center", marginTop: 24, fontSize: 11, fontWeight: 700 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ width: 14, height: 3, background: "var(--color-danger)", display: "inline-block", borderRadius: 2 }} />
                <span style={{ color: "var(--text-muted)" }}>Business As Usual (BAU) Projections</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ width: 14, height: 3, borderTop: "2px dashed var(--color-locked)", display: "inline-block" }} />
                <span style={{ color: "var(--text-muted)" }}>GRI / BRSR Pathway Target</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ width: 14, height: 4, background: "var(--color-primary)", display: "inline-block", borderRadius: 2 }} />
                <span style={{ color: "var(--text-main)" }}>Adjusted Footprint (Operational + Offsets)</span>
              </div>
            </div>
          </div>

          {/* Section 2: Offset registry */}
          <div className="card-glass">
            <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 16 }}>Accredited Carbon Offset Ledger</h3>
            <p style={{ color: "var(--text-muted)", fontSize: 12, marginBottom: 20 }}>
              Simulate investments in verified carbon credit registries to neutralize residual value chain footprints.
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {OFFSET_PROJECTS.map(proj => {
                const amount = offsets[proj.id];
                return (
                  <div key={proj.id} className="card-glass" style={{ padding: "16px 20px", display: "grid", gridTemplateColumns: "1fr 200px", gap: 20, alignItems: "center" }}>
                    <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                      <span style={{ fontSize: 24, padding: 8, background: "var(--color-primary-light)", borderRadius: 10 }}>{proj.icon}</span>
                      <div>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <strong style={{ fontSize: 14, color: "var(--text-main)" }}>{proj.name}</strong>
                          <span style={{ fontSize: 10, background: "rgba(0,0,0,0.05)", padding: "1px 6px", borderRadius: 4, fontWeight: 600, color: "var(--text-muted)" }}>
                            {proj.standard}
                          </span>
                        </div>
                        <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>{proj.description}</div>
                        <div style={{ fontSize: 11, color: "var(--color-primary)", fontWeight: 700, marginTop: 4 }}>
                          Price: ${proj.costPerTon}/ton CO2e
                        </div>
                      </div>
                    </div>

                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, fontWeight: 700 }}>
                        <span style={{ color: "var(--text-muted)" }}>Simulate Volume:</span>
                        <span style={{ color: "var(--color-primary)" }}>{amount.toLocaleString()} t</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="200"
                        step="5"
                        value={amount}
                        onChange={e => handleOffsetSlider(proj.id, e.target.value)}
                        style={{ width: "100%", accentColor: "var(--color-primary)", cursor: "pointer" }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Sidebar parameters */}
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          {/* Target Settings */}
          <div className="card-glass">
            <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>Neutrality Goalposts</h3>
            
            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              {/* Target Year */}
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, fontWeight: 700 }}>
                  <span style={{ color: "var(--text-muted)" }}>Target Boundary Year</span>
                  <span style={{ color: "var(--color-primary)" }}>{targetYear}</span>
                </div>
                <input
                  type="range"
                  min="2030"
                  max="2050"
                  value={targetYear}
                  onChange={e => setTargetYear(parseInt(e.target.value))}
                  style={{ width: "100%", accentColor: "var(--color-primary)", cursor: "pointer" }}
                />
              </div>

              {/* Reduction target */}
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, fontWeight: 700 }}>
                  <span style={{ color: "var(--text-muted)" }}>Goal reduction percent</span>
                  <span style={{ color: "var(--color-primary)" }}>{targetReduction}%</span>
                </div>
                <input
                  type="range"
                  min="10"
                  max="100"
                  step="5"
                  value={targetReduction}
                  onChange={e => setTargetReduction(parseInt(e.target.value))}
                  style={{ width: "100%", accentColor: "var(--color-primary)", cursor: "pointer" }}
                />
              </div>
            </div>
          </div>

          {/* Operational Savings */}
          <div className="card-glass">
            <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>Operational Reductions</h3>
            <p style={{ color: "var(--text-muted)", fontSize: 11, marginBottom: 16 }}>
              Simulate process efficiency improvements (e.g. green grid transition, EV fleet rollout).
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              {/* Scope 1 */}
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, fontWeight: 700 }}>
                  <span style={{ color: "var(--text-muted)" }}>⚡ Scope 1 (Direct Fuel)</span>
                  <span style={{ color: "var(--color-scope1)" }}>-{scope1Red}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="5"
                  value={scope1Red}
                  onChange={e => setScope1Red(parseInt(e.target.value))}
                  style={{ width: "100%", accentColor: "var(--color-scope1)", cursor: "pointer" }}
                />
              </div>

              {/* Scope 2 */}
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, fontWeight: 700 }}>
                  <span style={{ color: "var(--text-muted)" }}>🔌 Scope 2 (Utilities)</span>
                  <span style={{ color: "var(--color-scope2)" }}>-{scope2Red}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="5"
                  value={scope2Red}
                  onChange={e => setScope2Red(parseInt(e.target.value))}
                  style={{ width: "100%", accentColor: "var(--color-scope2)", cursor: "pointer" }}
                />
              </div>

              {/* Scope 3 */}
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, fontWeight: 700 }}>
                  <span style={{ color: "var(--text-muted)" }}>✈️ Scope 3 (Travel)</span>
                  <span style={{ color: "var(--color-scope3)" }}>-{scope3Red}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="5"
                  value={scope3Red}
                  onChange={e => setScope3Red(parseInt(e.target.value))}
                  style={{ width: "100%", accentColor: "var(--color-scope3)", cursor: "pointer" }}
                />
              </div>
            </div>
          </div>

          {/* Cart checkout widget */}
          <div className="card-glass" style={{ background: "linear-gradient(135deg, var(--bg-card), var(--color-primary-light))" }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 12 }}>Neutrality Diagnosis</h3>
            
            <div style={{ display: "flex", flexDirection: "column", gap: 10, fontSize: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 600 }}>
                <span style={{ color: "var(--text-muted)" }}>Tons Offset:</span>
                <span style={{ color: "var(--text-main)" }}>{totalOffsetTons.toLocaleString()} t</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 600 }}>
                <span style={{ color: "var(--text-muted)" }}>Offset Cost Estimate:</span>
                <span style={{ color: "var(--color-primary)", fontWeight: 800 }}>${totalOffsetCost.toLocaleString()}</span>
              </div>
              
              <div style={{ borderTop: "1px solid var(--border-color)", margin: "8px 0" }} />

              <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 700 }}>
                <span style={{ color: "var(--text-muted)" }}>Net-Zero Target:</span>
                <span style={{ 
                  color: netZeroYear === "Not Reached" ? "var(--color-danger)" : "var(--color-primary)",
                  background: netZeroYear === "Not Reached" ? "var(--color-danger-light)" : "var(--color-primary-light)",
                  padding: "2px 8px",
                  borderRadius: 4
                }}>
                  {netZeroYear}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
