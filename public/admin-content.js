'use strict';

(function () {
  const fields = [
    'metaTitle', 'metaDescription', 'siteName', 'heroTitle', 'heroSubtitle',
    'emergencyCtaHeading', 'emergencyCtaText', 'servicesOverviewTitle', 'aboutText',
    'contactTitle', 'phoneDigits', 'phoneDisplay', 'email'
  ];

  function byId(id) { return document.getElementById(id); }
  function readForm() {
    const obj = {};
    for (const k of fields) obj[k] = byId(k).value.trim();
    return obj;
  }
  function fillForm(c) {
    for (const k of fields) if (k in c && byId(k)) byId(k).value = c[k] || '';
  }

  async function load() {
    const token = byId('token').value.trim();
    const res = await fetch('/api/admin/content', { headers: { 'x-admin-token': token }});
    if (!res.ok) { byId('notice').textContent = 'Load failed (unauthorized?)'; return; }
    const data = await res.json();
    fillForm(data);
    byId('notice').textContent = 'Loaded current content';
  }

  async function save() {
    const token = byId('token').value.trim();
    const body = readForm();
    const res = await fetch('/api/admin/content', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-admin-token': token },
      body: JSON.stringify(body),
    });
    if (!res.ok) { byId('notice').textContent = 'Save failed (unauthorized or error)'; return; }
    byId('notice').textContent = 'Saved. Refresh the site to see updates.';
  }

  document.addEventListener('DOMContentLoaded', () => {
    byId('loadBtn').addEventListener('click', load);
    byId('saveBtn').addEventListener('click', save);
  });
})();
