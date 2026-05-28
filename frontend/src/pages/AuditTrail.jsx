import { useEffect, useState } from "react";

const ACTION_COLOR = {
  APPROVED: "var(--color-primary)",
  REJECTED: "var(--color-danger)",
  LOCKED:   "var(--color-locked)",
  UPDATED:  "var(--color-scope2)"
};

const ACTION_ICON = {
  APPROVED: "✓",
  REJECTED: "✕",
  LOCKED:   "🔒",
  UPDATED:  "📝"
};

export default function AuditTrail() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  const BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

  useEffect(() => {
    fetch(`${BASE}/audit/`)
      .then(r => r.json())
      .then(data => {
        setLogs(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  // Parses the old_value and new_value diff text into structured lines
  const renderDiff = (oldVal, newVal) => {
    if (!oldVal && !newVal) return null;
    
    // Check if it's status or multiple fields
    const olds = oldVal.split("; ");
    const news = newVal.split("; ");
    
    if (olds.length > 0 && news.length > 0 && olds[0].includes(":")) {
      return (
        <div style={{
          marginTop: 8,
          background: "var(--bg-app)",
          border: "1px solid var(--border-color)",
          padding: 10,
          borderRadius: 8,
          fontSize: 12
        }}>
          <div style={{ fontWeight: 700, fontSize: 10, color: "var(--text-light)", textTransform: "uppercase", marginBottom: 4 }}>
            Modified Attributes
          </div>
          {olds.map((o, idx) => {
            const n = news[idx] || "";
            const [oField, oVal] = o.split(": ");
            const [, nVal] = n.split(": ");
            return (
              <div key={idx} style={{ display: "flex", justifyContent: "space-between", borderBottom: idx < olds.length - 1 ? "1px solid var(--border-color)" : "none", padding: "4px 0" }}>
                <span style={{ fontWeight: 700, color: "var(--text-muted)" }}>{oField}</span>
                <span style={{ color: "var(--text-main)", display: "flex", alignItems: "center", gap: 6 }}>
                  <code style={{ background: "rgba(239, 68, 68, 0.08)", color: "var(--color-danger)", padding: "1px 4px", borderRadius: 4 }}>{oVal}</code>
                  <span>➔</span>
                  <code style={{ background: "rgba(16, 185, 129, 0.08)", color: "var(--color-primary)", padding: "1px 4px", borderRadius: 4 }}>{nVal}</code>
                </span>
              </div>
            );
          })}
        </div>
      );
    }

    // Default status diff fallback
    return (
      <div style={{ fontSize: 11, color: "var(--text-light)", marginTop: 6, display: "flex", alignItems: "center", gap: 6 }}>
        Status transition: 
        <span style={{ background: "var(--bg-app)", padding: "2px 6px", borderRadius: 4, fontWeight: 700 }}>{oldVal || "NULL"}</span>
        <span>➔</span>
        <span style={{ background: "var(--bg-app)", padding: "2px 6px", borderRadius: 4, fontWeight: 700, color: "var(--color-primary)" }}>{newVal}</span>
      </div>
    );
  };

  return (
    <div className="animate-fade-in" style={{ maxWidth: 800, margin: "0 auto" }}>
      <div style={{ marginBottom: 32 }}>
        <h2 style={{ fontSize: 24, fontWeight: 800 }}>Append-Only Ledger Trail</h2>
        <p style={{ color: "var(--text-muted)", fontSize: 13, marginTop: 4 }}>
          Immutable cryptographic log of adjustments, status changes, and auditor reviews.
        </p>
      </div>

      {loading && (
        <div style={{ textAlign: "center", padding: "40px 0" }}>
          <p style={{ color: "var(--text-muted)", fontWeight: 600 }}>Loading ledger journal records…</p>
        </div>
      )}

      {!loading && logs.length === 0 && (
        <div className="card-glass" style={{ textAlign: "center", padding: "40px 0", borderStyle: "dashed" }}>
          <span style={{ fontSize: 32 }}>📜</span>
          <h3 style={{ fontSize: 15, fontWeight: 700, marginTop: 8 }}>Ledger Empty</h3>
          <p style={{ color: "var(--text-muted)", fontSize: 12, marginTop: 4 }}>
            No administrative status modifications or data updates have been recorded yet.
          </p>
        </div>
      )}

      {/* Timeline Layout */}
      {!loading && logs.length > 0 && (
        <div style={{ position: "relative", paddingLeft: 24, borderLeft: "2px dashed var(--border-color)", display: "flex", flexDirection: "column", gap: 20 }}>
          {logs.map((log, idx) => {
            const aColor = ACTION_COLOR[log.action] || "var(--text-muted)";
            return (
              <div
                key={log.id}
                className="card-glass animate-fade-in"
                style={{
                  position: "relative",
                  padding: "16px 20px",
                  boxShadow: "var(--shadow-sm)",
                  borderLeft: `4px solid ${aColor}`
                }}
              >
                {/* Timeline node marker dot */}
                <div style={{
                  position: "absolute",
                  left: -33,
                  top: 24,
                  width: 16,
                  height: 16,
                  borderRadius: "50%",
                  background: aColor,
                  border: "3px solid var(--bg-app)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  boxShadow: "0 0 0 2px " + aColor + "44"
                }} />

                {/* Audit Content */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
                  <div>
                    <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", marginBottom: 6 }}>
                      <span
                        className="badge"
                        style={{
                          background: aColor + "15",
                          color: aColor,
                          border: `1px solid ${aColor}33`,
                          display: "flex",
                          alignItems: "center",
                          gap: 4
                        }}
                      >
                        <span style={{ fontSize: 10 }}>{ACTION_ICON[log.action] || "•"}</span>
                        {log.action}
                      </span>
                      
                      <span style={{ fontWeight: 800, fontSize: 14, color: "var(--text-main)" }}>
                        {log.record_category}
                      </span>
                      <span style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 500 }}>
                        • Scope {log.record_scope}
                      </span>
                    </div>

                    <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
                      Recorded by: <strong style={{ color: "var(--text-main)" }}>{log.changed_by}</strong>
                    </div>
                  </div>

                  <div style={{ textAlign: "right" }}>
                    <strong style={{ fontSize: 15, color: "var(--text-main)" }}>
                      {log.record_kgco2e?.toFixed(2)} kgCO₂e
                    </strong>
                    <div style={{ fontSize: 10, color: "var(--text-light)", marginTop: 2 }}>
                      {new Date(log.changed_at).toLocaleString()}
                    </div>
                  </div>
                </div>

                {/* Optional Reviewer Note text */}
                {log.note && (
                  <div style={{
                    marginTop: 8,
                    fontSize: 12,
                    color: "var(--text-muted)",
                    fontStyle: "italic",
                    background: "rgba(0,0,0,0.01)",
                    borderLeft: "2px solid var(--border-color)",
                    paddingLeft: 8
                  }}>
                    💬 "{log.note}"
                  </div>
                )}

                {/* Rendered Visual Attribute Diffs */}
                {renderDiff(log.old_value, log.new_value)}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}