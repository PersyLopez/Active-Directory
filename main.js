'use strict';

(function () {
  const SELECTORS = {
    serviceOptions: '.service-option',
    serviceSelection: '#serviceSelection',
    contactSection: '#contactInfoSection',
    progressSteps: '.progress-step',
    progressLines: '.progress-line',
    backButton: '#backToServices',
    continueButton: '#proceedToSchedule',
    contactForm: '#contactForm'
  };

  const STORAGE_KEYS = {
    selectedService: 'fg_selected_service',
    contact: 'fg_contact'
  };

  /** State */
  let selectedService = null;

  function qs(selector, root = document) {
    return root.querySelector(selector);
  }
  function qsa(selector, root = document) {
    return Array.from(root.querySelectorAll(selector));
  }

  function show(el) { el.hidden = false; }
  function hide(el) { el.hidden = true; }

  function updateProgress(step) {
    const steps = qsa(SELECTORS.progressSteps);
    const lines = qsa(SELECTORS.progressLines);

    steps.forEach((el, idx) => {
      el.classList.remove('active', 'completed');
      el.removeAttribute('aria-current');
      const number = idx + 1;
      if (number < step) {
        el.classList.add('completed');
      } else if (number === step) {
        el.classList.add('active');
        el.setAttribute('aria-current', 'step');
      }
    });

    lines.forEach((line, idx) => {
      if (idx < step - 1) {
        line.classList.add('completed');
      } else {
        line.classList.remove('completed');
      }
    });
  }

  function selectService(optionEl) {
    qsa(SELECTORS.serviceOptions).forEach((el) => {
      el.classList.remove('selected');
      el.setAttribute('aria-pressed', 'false');
    });
    optionEl.classList.add('selected');
    optionEl.setAttribute('aria-pressed', 'true');
    selectedService = optionEl.getAttribute('data-service');
    sessionStorage.setItem(STORAGE_KEYS.selectedService, selectedService);

    // advance to contact step
    hide(qs(SELECTORS.serviceSelection));
    show(qs(SELECTORS.contactSection));
    updateProgress(2);
  }

  function backToServices() {
    show(qs(SELECTORS.serviceSelection));
    hide(qs(SELECTORS.contactSection));
    updateProgress(1);
  }

  function readFormData() {
    const form = qs(SELECTORS.contactForm);
    const data = new FormData(form);
    return {
      name: (data.get('name') || '').toString().trim(),
      phone: (data.get('phone') || '').toString().trim(),
      email: (data.get('email') || '').toString().trim(),
      vehicleYear: (data.get('vehicleYear') || '').toString().trim(),
      vehicleMake: (data.get('vehicleMake') || '').toString().trim(),
      vehicleModel: (data.get('vehicleModel') || '').toString().trim(),
      problemDescription: (data.get('problemDescription') || '').toString().trim(),
    };
  }

  function setError(id, message) {
    const el = document.getElementById(id);
    if (el) el.textContent = message || '';
  }

  function validateForm() {
    const { name, phone, email } = readFormData();
    let valid = true;

    setError('error-name', '');
    setError('error-phone', '');
    setError('error-email', '');

    if (!name) {
      setError('error-name', 'Please enter your full name.');
      valid = false;
    }

    if (!phone) {
      setError('error-phone', 'Please enter your phone number.');
      valid = false;
    }

    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('error-email', 'Please enter a valid email address.');
      valid = false;
    }

    return valid;
  }

  function proceedToSchedule() {
    if (!selectedService) {
      // pull from storage if available
      selectedService = sessionStorage.getItem(STORAGE_KEYS.selectedService) || '';
    }

    if (!selectedService) {
      // no service chosen
      backToServices();
      return;
    }

    if (!validateForm()) return;

    const contact = readFormData();
    sessionStorage.setItem(STORAGE_KEYS.contact, JSON.stringify(contact));

    updateProgress(3);
    // Do not leak PII in URL — navigate without params
    window.location.href = 'enhanced-schedule.html';
  }

  function restoreFromStorage() {
    try {
      const saved = sessionStorage.getItem(STORAGE_KEYS.contact);
      if (!saved) return;
      const contact = JSON.parse(saved);
      const form = qs(SELECTORS.contactForm);
      if (!form) return;
      ['name','phone','email','vehicleYear','vehicleMake','vehicleModel','problemDescription']
        .forEach((key) => {
          const input = form.elements.namedItem(key);
          if (input && typeof input === 'object') {
            input.value = contact[key] || '';
          }
        });
    } catch {}
  }

  document.addEventListener('DOMContentLoaded', () => {
    // Attach handlers for service options
    qsa(SELECTORS.serviceOptions).forEach((el) => {
      el.addEventListener('click', () => selectService(el));
      el.addEventListener('keydown', (ev) => {
        if (ev.key === 'Enter' || ev.key === ' ') {
          ev.preventDefault();
          selectService(el);
        }
      });
    });

    // Back and continue buttons
    const backBtn = qs(SELECTORS.backButton);
    const contBtn = qs(SELECTORS.continueButton);
    if (backBtn) backBtn.addEventListener('click', backToServices);
    if (contBtn) contBtn.addEventListener('click', proceedToSchedule);

    // Initial progress
    updateProgress(1);

    // Restore from session if present
    restoreFromStorage();

    // Highlight emergency option subtly (CSS handles reduced motion)
    // No JS needed beyond initial layout
  });
})();
