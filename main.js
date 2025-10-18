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

  async function proceedToSchedule() {
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

    // Show loading state
    const continueBtn = qs(SELECTORS.continueButton);
    if (continueBtn) {
      continueBtn.textContent = 'Submitting...';
      continueBtn.disabled = true;
    }

    try {
      // Submit service request to backend
      const serviceRequest = {
        service: selectedService,
        ...contact,
        timestamp: new Date().toISOString()
      };

      const response = await fetch('http://192.168.1.29:8081/api/service-request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(serviceRequest)
      });

      const result = await response.json();

      if (result.success) {
        // Show success message
        showSuccessMessage(result.message, result.requestId);
        updateProgress(3);
        
        // Clear form data after successful submission
        sessionStorage.removeItem(STORAGE_KEYS.selectedService);
        sessionStorage.removeItem(STORAGE_KEYS.contact);
      } else {
        throw new Error(result.message || 'Failed to submit service request');
      }

    } catch (error) {
      console.error('Error submitting service request:', error);
      showErrorMessage('Failed to submit service request. Please try again or call us directly at (555) 123-4567');
    } finally {
      // Reset button state
      if (continueBtn) {
        continueBtn.textContent = 'Continue to Schedule →';
        continueBtn.disabled = false;
      }
    }
  }

  function showSuccessMessage(message, requestId) {
    // Create success message element
    const successDiv = document.createElement('div');
    successDiv.className = 'success-message';
    successDiv.innerHTML = `
      <div style="background: #d4edda; color: #155724; padding: 1rem; border-radius: 0.5rem; margin: 1rem 0; border: 1px solid #c3e6cb;">
        <h4>✅ Service Request Submitted Successfully!</h4>
        <p>${message}</p>
        <p><strong>Request ID:</strong> ${requestId}</p>
        <p>We'll contact you shortly to confirm your service appointment.</p>
        <p><strong>Emergency Line:</strong> <a href="tel:5551234567">(555) 123-4567</a></p>
      </div>
    `;
    
    // Insert after the contact form
    const contactSection = qs(SELECTORS.contactSection);
    if (contactSection) {
      contactSection.appendChild(successDiv);
    }
  }

  function showErrorMessage(message) {
    // Create error message element
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message';
    errorDiv.innerHTML = `
      <div style="background: #f8d7da; color: #721c24; padding: 1rem; border-radius: 0.5rem; margin: 1rem 0; border: 1px solid #f5c6cb;">
        <h4>❌ Error</h4>
        <p>${message}</p>
      </div>
    `;
    
    // Insert after the contact form
    const contactSection = qs(SELECTORS.contactSection);
    if (contactSection) {
      contactSection.appendChild(errorDiv);
    }
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
