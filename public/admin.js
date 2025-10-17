'use strict';

(function () {
  const rowsEl = () => document.getElementById('rows');
  const countPill = () => document.getElementById('countPill');
  const tokenInput = () => document.getElementById('adminToken');

  function fmt(s) {
    if (!s) return '-';
    try {
      return new Date(s).toLocaleString();
    } catch {
      return s;
    }
  }

  function buildRow(item) {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${fmt(item.scheduledAt || item.receivedAt)}</td>
      <td><span class="badge">${item.service}</span></td>
      <td>${item.name}</td>
      <td>${item.phone}${item.email ? `<br/>${item.email}` : ''}</td>
      <td>${[item.vehicleYear, item.vehicleMake, item.vehicleModel].filter(Boolean).join(' ') || '-'}</td>
      <td>${item.problemDescription || '-'}</td>
      <td>
        <input type="datetime-local" value="" aria-label="Schedule time" />
        <button class="btn-schedule">Set</button>
      </td>
    `;

    const input = tr.querySelector('input[type="datetime-local"]');
    const btn = tr.querySelector('.btn-schedule');
    btn.addEventListener('click', async () => {
      const value = input.value;
      if (!value) return;
      const token = tokenInput().value.trim();
      const body = JSON.stringify({ scheduledAt: new Date(value).toISOString() });
      const res = await fetch(`/api/admin/requests/${item.id}/schedule`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-token': token,
        },
        body,
      });
      if (!res.ok) {
        alert('Failed to schedule');
        return;
      }
      await load();
    });

    return tr;
  }

  async function load() {
    rowsEl().innerHTML = '';
    const token = tokenInput().value.trim();
    const res = await fetch('/api/admin/requests', {
      headers: { 'x-admin-token': token },
    });
    if (!res.ok) {
      rowsEl().innerHTML = '<tr><td colspan="7">Unauthorized or error</td></tr>';
      return;
    }
    const data = await res.json();
    const items = data.items || [];
    countPill().textContent = `${items.length} items`;
    items.forEach((item) => rowsEl().appendChild(buildRow(item)));
  }

  document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('refreshBtn').addEventListener('click', load);
  });
})();
