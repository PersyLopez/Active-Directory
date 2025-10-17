'use strict';

(function () {
  const STORAGE_KEYS = {
    selectedService: 'fg_selected_service',
    contact: 'fg_contact',
  };

  const serviceLabels = {
    'emergency': 'Emergency Service',
    'tire-repair': 'Tire Repair',
    'battery-replacement': 'Battery Service',
    'tire-replacement': 'Tire Replacement',
    'oil-change': 'Oil Change',
    'brake-service': 'Brake Service',
    'diagnostic': 'Diagnostic',
    'other': 'Other Service',
  };

  function getStored() {
    const service = sessionStorage.getItem(STORAGE_KEYS.selectedService) || '';
    let contact = {};
    try {
      contact = JSON.parse(sessionStorage.getItem(STORAGE_KEYS.contact) || '{}');
    } catch {}
    return { service, contact };
  }

  function fillSummary(service, contact) {
    const byId = (id) => document.getElementById(id);
    byId('summary-service').textContent = serviceLabels[service] || service || '-';
    byId('summary-name').textContent = contact.name || '-';
    byId('summary-phone').textContent = contact.phone || '-';
    byId('summary-email').textContent = contact.email || '-';
    byId('summary-year').textContent = contact.vehicleYear || '-';
    byId('summary-make').textContent = contact.vehicleMake || '-';
    byId('summary-model').textContent = contact.vehicleModel || '-';
    byId('summary-problem').textContent = contact.problemDescription || '-';
  }

  async function submit() {
    const errorEl = document.getElementById('submit-error');
    const successEl = document.getElementById('submit-success');
    errorEl.textContent = '';
    successEl.textContent = '';

    const { service, contact } = getStored();
    if (!service) {
      errorEl.textContent = 'Missing selected service. Returning to start.';
      setTimeout(() => (window.location.href = '/'), 800);
      return;
    }
    if (!contact || !contact.name || !contact.phone) {
      errorEl.textContent = 'Missing contact info. Returning to start.';
      setTimeout(() => (window.location.href = '/'), 800);
      return;
    }

    const scheduledAtInput = document.getElementById('scheduledAt');
    const scheduledAt = scheduledAtInput && scheduledAtInput.value ? new Date(scheduledAtInput.value).toISOString() : undefined;

    const payload = {
      service,
      name: contact.name,
      phone: contact.phone,
      email: contact.email || undefined,
      vehicleYear: contact.vehicleYear || undefined,
      vehicleMake: contact.vehicleMake || undefined,
      vehicleModel: contact.vehicleModel || undefined,
      problemDescription: contact.problemDescription || undefined,
      scheduledAt,
    };

    try {
      const res = await fetch('/api/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `Request failed (${res.status})`);
      }
      const data = await res.json();
      successEl.textContent = `Request submitted. Confirmation ID: ${data.requestId}`;
      sessionStorage.removeItem(STORAGE_KEYS.selectedService);
      sessionStorage.removeItem(STORAGE_KEYS.contact);
    } catch (err) {
      errorEl.textContent = err.message || 'Something went wrong. Please try again.';
    }
  }

  document.addEventListener('DOMContentLoaded', () => {
    const { service, contact } = getStored();
    if (!service || !contact) {
      window.location.href = '/';
      return;
    }
    fillSummary(service, contact);

    const btn = document.getElementById('submitRequest');
    if (btn) btn.addEventListener('click', submit);
  });
})();
