const BASE = import.meta.env.VITE_API_URL || 
  (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://localhost:8000/api'
    : `${window.location.origin}/api`);


export const uploadFile = (sourceType, file) => {
  const fd = new FormData();
  fd.append('source_type', sourceType);
  fd.append('client_id', 1);
  fd.append('file', file);
  return fetch(`${BASE}/upload/`, { method: 'POST', body: fd }).then(r => r.json());
};

export const getRecords = (filters = {}) => {
  const p = new URLSearchParams({ client_id: 1, ...filters });
  return fetch(`${BASE}/records/?${p}`).then(r => r.json());
};

export const reviewRecord = (id, action, note = '') =>
  fetch(`${BASE}/records/${id}/review/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, note }),
  }).then(r => r.json());

export const getStats = () =>
  fetch(`${BASE}/stats/?client_id=1`).then(r => r.json());

export const lockAll = () =>
  fetch(`${BASE}/lock/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ client_id: 1 }),
  }).then(r => r.json());

export const bulkApprove = () =>
  fetch(`${BASE}/bulk-approve/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ client_id: 1 }),
  }).then(r => r.json());

export const exportCSV = () => {
  window.open(
    `${BASE}/export/?client_id=1`,
    '_blank'
  );
};

export const updateRecord = (id, data) =>
  fetch(`${BASE}/records/${id}/update/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ client_id: 1, ...data }),
  }).then(r => r.json());

export const loadDemoData = (sourceType) =>
  fetch(`${BASE}/demo/load/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ client_id: 1, source_type: sourceType }),
  }).then(r => r.json());

