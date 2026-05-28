import { useEffect, useState } from "react";
import { getRecords, reviewRecord, lockAll, bulkApprove, exportCSV, updateRecord } from "../api";

const SCOPE_COLOR = {
  1: "var(--color-scope1)",
  2: "var(--color-scope2)",
  3: "var(--color-scope3)"
};

const STATUS_COLOR = {
  PENDING: "var(--color-warning)",
  APPROVED: "var(--color-primary)",
  REJECTED: "var(--color-danger)",
  LOCKED: "var(--color-locked)"
};

export default function Review() {
  const [records, setRecords] = useState([]);
  const [filter, setFilter]   = useState("PENDING");
  const [search, setSearch]   = useState("");
  const [loading, setLoading] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState(null);

  // Inspector Drawer form state
  const [editForm, setEditForm] = useState({
    category: "",
    subcategory: "",
    activity_value: "",
    activity_unit: "",
    emission_factor: "",
    emission_factor_source: "",
    period_start: "",
    period_end: "",
    reviewer_note: "",
    resolve_flag: false
  });

  const load = (f) => {
    setLoading(true);
    getRecords(f ? { status: f } : {})
      .then(setRecords)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load(filter);
  }, [filter]);

  // Open record inspector
  const openInspector = (r) => {
    setSelectedRecord(r);
    setEditForm({
      category: r.category || "",
      subcategory: r.subcategory || "",
      activity_value: r.activity_value || "",
      activity_unit: r.activity_unit || "",
      emission_factor: r.emission_factor || "",
      emission_factor_source: r.emission_factor_source || "",
      period_start: r.period_start || "",
      period_end: r.period_end || "",
      reviewer_note: r.reviewer_note || "",
      resolve_flag: false
    });
  };

  const closeInspector = () => {
    setSelectedRecord(null);
  };

  const handleReviewAction = async (id, action) => {
    const note = editForm.reviewer_note || "";
    await reviewRecord(id, action, note);
    closeInspector();
    load(filter);
  };

  const handleUpdateAndSave = async (id) => {
    try {
      const res = await updateRecord(id, {
        category: editForm.category,
        subcategory: editForm.subcategory,
        activity_value: parseFloat(editForm.activity_value),
        activity_unit: editForm.activity_unit,
        emission_factor: parseFloat(editForm.emission_factor),
        emission_factor_source: editForm.emission_factor_source,
        period_start: editForm.period_start,
        period_end: editForm.period_end,
        reviewer_note: editForm.reviewer_note,
        resolve_flag: editForm.resolve_flag
      });
      if (res.error) {
        alert("Error updating: " + res.error);
      } else {
        closeInspector();
        load(filter);
      }
    } catch (e) {
      alert("Recalculation error: " + String(e));
    }
  };

  const handleLock = async () => {
    if (!confirm("Lock all approved records for audit? This cannot be undone.")) return;
    const res = await lockAll();
    alert(`${res.locked} record(s) locked.`);
    load(filter);
  };

  const handleBulkApprove = async () => {
    const res = await bulkApprove();
    alert(`${res.approved} clean rows approved`);
    load(filter);
  };

  // Live footprint recalculation in the inspector drawer
  const liveFootprint = selectedRecord 
    ? (parseFloat(editForm.activity_value || 0) * parseFloat(editForm.emission_factor || 0)).toFixed(2)
    : 0;

  const FILTERS = ["", "PENDING", "APPROVED", "REJECTED", "LOCKED"];

  // Search filter matching
  const filteredRecords = records.filter(r => {
    const term = search.toLowerCase();
    return (
      r.category?.toLowerCase().includes(term) ||
      r.subcategory?.toLowerCase().includes(term) ||
      r.source_row_ref?.toLowerCase().includes(term) ||
      r.activity_unit?.toLowerCase().includes(term)
    );
  });

  return (
    <div className="animate-fade-in" style={{ position: "relative" }}>
      {/* Top Header Queue Title */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24, flexWrap: "wrap", gap: 16 }}>
        <div>
          <h2 style={{ fontSize: 24, fontWeight: 800 }}>Analyst Review Queue</h2>
          <p style={{ color: "var(--text-muted)", fontSize: 13 }}>Approve incoming carbon entries, investigate flags, and sign off data for final locking.</p>
        </div>

        {/* Global Action operations */}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button onClick={handleBulkApprove} className="btn-primary" style={{ padding: "8px 16px", fontSize: 13 }}>
            ⚡ Auto-Approve Clean
          </button>
          <button onClick={exportCSV} className="btn-secondary" style={{ padding: "8px 16px", fontSize: 13 }}>
            📤 Export Locked CSV
          </button>
          <button onClick={handleLock} className="btn-secondary" style={{ padding: "8px 16px", fontSize: 13, color: "var(--color-locked)", borderColor: "var(--color-locked)44" }}>
            🔒 Finalize &amp; Lock
          </button>
        </div>
      </div>

      {/* Search Bar & Tab Filters */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16, marginBottom: 24, flexWrap: "wrap" }}>
        {/* Status Tab buttons */}
        <div className="tab-container">
          {FILTERS.map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`tab-btn ${filter === f ? "active" : ""}`}
            >
              {f || "All Entries"}
            </button>
          ))}
        </div>

        {/* Search Bar */}
        <div style={{ position: "relative", width: "100%", maxWidth: 300 }}>
          <input
            type="text"
            placeholder="🔎 Search categories, plants, refs..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="input-field"
            style={{ paddingLeft: 36, paddingRight: 16 }}
          />
        </div>
      </div>

      {/* Process list status */}
      {loading && (
        <div style={{ textAlign: "center", padding: "40px 0" }}>
          <p style={{ color: "var(--text-muted)", fontWeight: 600 }}>Analyzing review queue items…</p>
        </div>
      )}

      {!loading && filteredRecords.length === 0 && (
        <div className="card-glass" style={{ textAlign: "center", padding: "60px 0", borderStyle: "dashed" }}>
          <span style={{ fontSize: 40 }}>📦</span>
          <h3 style={{ fontSize: 16, marginTop: 12, fontWeight: 700, color: "var(--text-main)" }}>No Entries Found</h3>
          <p style={{ color: "var(--text-muted)", fontSize: 12, marginTop: 4 }}>
            There are no emissions entries matching your current filters.
          </p>
        </div>
      )}

      {/* Record Rows */}
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {filteredRecords.map(r => {
          const sColor = SCOPE_COLOR[r.scope];
          const stColor = STATUS_COLOR[r.status];
          return (
            <div
              key={r.id}
              onClick={() => openInspector(r)}
              className="card-glass"
              style={{
                cursor: "pointer",
                padding: "16px 22px",
                borderLeft: `5px solid ${r.is_flagged ? "var(--color-danger)" : sColor}`,
                background: r.is_flagged ? "linear-gradient(135deg, var(--bg-card), var(--color-danger-light))" : "var(--bg-card)",
                transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)"
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, flexWrap: "wrap" }}>
                <div>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", marginBottom: 6 }}>
                    <span style={{ fontWeight: 800, fontSize: 16, color: "var(--text-main)" }}>{r.category}</span>
                    {r.subcategory && (
                      <span style={{ fontSize: 12, color: "var(--text-muted)", fontWeight: 500 }}>
                        • {r.subcategory}
                      </span>
                    )}
                    
                    <span className="badge" style={{ background: sColor + "1a", color: sColor, border: `1px solid ${sColor}22` }}>
                      Scope {r.scope}
                    </span>
                    <span className="badge" style={{ background: stColor + "1a", color: stColor, border: `1px solid ${stColor}22` }}>
                      {r.status}
                    </span>
                    {r.is_flagged && (
                      <span className="badge" style={{ background: "var(--color-danger-light)", color: "var(--color-danger)", border: "1px solid var(--color-danger)33" }}>
                        ⚠️ flagged
                      </span>
                    )}
                  </div>
                  
                  <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
                    {r.period_start} to {r.period_end} • Ref: <strong style={{ color: "var(--text-main)" }}>{r.source_row_ref}</strong>
                  </div>
                </div>

                <div style={{ textAlign: "right" }}>
                  <div style={{ fontWeight: 800, fontSize: 18, color: "var(--text-main)", letterSpacing: "-0.01em" }}>
                    {r.normalised_kgco2e.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} kgCO₂e
                  </div>
                  <div style={{ fontSize: 11, color: "var(--text-light)", fontWeight: 500 }}>
                    {r.activity_value.toLocaleString()} {r.activity_unit} ({r.emission_factor} factor)
                  </div>
                </div>
              </div>

              {/* Warnings details */}
              {r.is_flagged && (
                <div style={{
                  fontSize: 12,
                  color: "var(--color-danger)",
                  marginTop: 10,
                  background: "rgba(239, 68, 68, 0.04)",
                  border: "1px dashed var(--color-danger)33",
                  padding: "6px 12px",
                  borderRadius: 8
                }}>
                  🚨 <strong>Anomaly Flag:</strong> {r.flag_reason}
                </div>
              )}

              {r.reviewer_note && (
                <div style={{ fontSize: 11, color: "var(--text-light)", fontStyle: "italic", marginTop: 8 }}>
                  💬 Note: "{r.reviewer_note}"
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Interactive Sliding Inspector Drawer */}
      {selectedRecord && (
        <div className="drawer-backdrop" onClick={closeInspector}>
          <div className="drawer-panel" onClick={e => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <h3 style={{ fontSize: 20, fontWeight: 800 }}>Inspect Record #{selectedRecord.id}</h3>
              <button
                onClick={closeInspector}
                style={{
                  border: "none",
                  background: "transparent",
                  fontSize: 20,
                  cursor: "pointer",
                  color: "var(--text-muted)"
                }}
              >
                ✕
              </button>
            </div>

            {/* Quick Summary details */}
            <div style={{
              background: "var(--bg-app)",
              border: "1px solid var(--border-color)",
              padding: 16,
              borderRadius: 12,
              marginBottom: 20,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center"
            }}>
              <div>
                <span style={{ fontSize: 10, color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 700 }}>
                  Live CO₂ Recalculation
                </span>
                <div style={{ fontSize: 22, fontWeight: 800, color: "var(--color-primary)" }}>
                  {liveFootprint} kgCO₂e
                </div>
              </div>
              <span className="badge" style={{
                background: SCOPE_COLOR[selectedRecord.scope] + "1a",
                color: SCOPE_COLOR[selectedRecord.scope],
                border: `1px solid ${SCOPE_COLOR[selectedRecord.scope]}22`
              }}>
                Scope {selectedRecord.scope}
              </span>
            </div>

            {/* Editing Form */}
            <div style={{ display: "flex", flexDirection: "column", gap: 14, flex: 1, overflowY: "auto", paddingRight: 4 }}>
              {/* Category */}
              <label>
                <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text-muted)", marginBottom: 4 }}>Category</div>
                <input
                  type="text"
                  value={editForm.category}
                  onChange={e => setEditForm(prev => ({ ...prev, category: e.target.value }))}
                  className="input-field"
                  disabled={selectedRecord.status === "LOCKED"}
                />
              </label>

              {/* Subcategory */}
              <label>
                <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text-muted)", marginBottom: 4 }}>Subcategory / Plant Code</div>
                <input
                  type="text"
                  value={editForm.subcategory}
                  onChange={e => setEditForm(prev => ({ ...prev, subcategory: e.target.value }))}
                  className="input-field"
                  disabled={selectedRecord.status === "LOCKED"}
                />
              </label>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                {/* Activity Value */}
                <label>
                  <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text-muted)", marginBottom: 4 }}>Activity Quantity</div>
                  <input
                    type="number"
                    value={editForm.activity_value}
                    onChange={e => setEditForm(prev => ({ ...prev, activity_value: e.target.value }))}
                    className="input-field"
                    disabled={selectedRecord.status === "LOCKED"}
                  />
                </label>

                {/* Activity Unit */}
                <label>
                  <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text-muted)", marginBottom: 4 }}>Activity Unit</div>
                  <input
                    type="text"
                    value={editForm.activity_unit}
                    onChange={e => setEditForm(prev => ({ ...prev, activity_unit: e.target.value }))}
                    className="input-field"
                    disabled={selectedRecord.status === "LOCKED"}
                  />
                </label>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                {/* Emission Factor */}
                <label>
                  <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text-muted)", marginBottom: 4 }}>Emission Factor</div>
                  <input
                    type="number"
                    step="0.0001"
                    value={editForm.emission_factor}
                    onChange={e => setEditForm(prev => ({ ...prev, emission_factor: e.target.value }))}
                    className="input-field"
                    disabled={selectedRecord.status === "LOCKED"}
                  />
                </label>

                {/* Emission Factor Source */}
                <label>
                  <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text-muted)", marginBottom: 4 }}>Factor Database Source</div>
                  <input
                    type="text"
                    value={editForm.emission_factor_source}
                    onChange={e => setEditForm(prev => ({ ...prev, emission_factor_source: e.target.value }))}
                    className="input-field"
                    disabled={selectedRecord.status === "LOCKED"}
                  />
                </label>
              </div>

              {/* Billing Period Dates */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <label>
                  <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text-muted)", marginBottom: 4 }}>Period Start</div>
                  <input
                    type="date"
                    value={editForm.period_start}
                    onChange={e => setEditForm(prev => ({ ...prev, period_start: e.target.value }))}
                    className="input-field"
                    disabled={selectedRecord.status === "LOCKED"}
                  />
                </label>

                <label>
                  <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text-muted)", marginBottom: 4 }}>Period End</div>
                  <input
                    type="date"
                    value={editForm.period_end}
                    onChange={e => setEditForm(prev => ({ ...prev, period_end: e.target.value }))}
                    className="input-field"
                    disabled={selectedRecord.status === "LOCKED"}
                  />
                </label>
              </div>

              {/* Reviewer Note */}
              <label>
                <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text-muted)", marginBottom: 4 }}>Reviewer Diagnostics Note</div>
                <textarea
                  rows="3"
                  value={editForm.reviewer_note}
                  onChange={e => setEditForm(prev => ({ ...prev, reviewer_note: e.target.value }))}
                  className="input-field"
                  style={{ resize: "none", fontFamily: "inherit" }}
                  placeholder="Record verification checklist comments..."
                  disabled={selectedRecord.status === "LOCKED"}
                />
              </label>

              {/* Resolve anomaly flag toggle checkbox */}
              {selectedRecord.is_flagged && (
                <label style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: 12,
                  background: "var(--color-danger-light)",
                  border: "1px dashed var(--color-danger)33",
                  borderRadius: 10,
                  cursor: "pointer"
                }}>
                  <input
                    type="checkbox"
                    checked={editForm.resolve_flag}
                    onChange={e => setEditForm(prev => ({ ...prev, resolve_flag: e.target.checked }))}
                    style={{ width: 18, height: 18, cursor: "pointer" }}
                    disabled={selectedRecord.status === "LOCKED"}
                  />
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: "var(--color-danger)" }}>
                      Resolve Anomaly Warning
                    </div>
                    <div style={{ fontSize: 10, color: "var(--text-muted)" }}>
                      Checking this clears the warning flag upon saving changes.
                    </div>
                  </div>
                </label>
              )}
            </div>

            {/* Actions button footer inside drawer */}
            {selectedRecord.status !== "LOCKED" && (
              <div style={{ borderTop: "1px solid var(--border-color)", paddingTop: 20, marginTop: 20, display: "flex", flexDirection: "column", gap: 10 }}>
                {/* Save & Recalculate */}
                <button
                  onClick={() => handleUpdateAndSave(selectedRecord.id)}
                  className="btn-primary"
                  style={{ width: "100%" }}
                >
                  ⚡ Recalculate &amp; Save Details
                </button>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  <button
                    onClick={() => handleReviewAction(selectedRecord.id, "APPROVED")}
                    className="btn-secondary"
                    style={{ borderColor: "var(--color-primary)", color: "var(--color-primary)", background: "rgba(16, 185, 129, 0.05)" }}
                  >
                    ✓ Approve Entry
                  </button>
                  <button
                    onClick={() => handleReviewAction(selectedRecord.id, "REJECTED")}
                    className="btn-secondary"
                    style={{ borderColor: "var(--color-danger)", color: "var(--color-danger)", background: "rgba(239, 68, 68, 0.05)" }}
                  >
                    ✕ Reject Entry
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}