'use strict';

(function () {
  function applyContent(c) {
    // <head> title and meta description
    if (c.metaTitle) {
      const titleEl = document.querySelector('head > title');
      if (titleEl) titleEl.textContent = c.metaTitle;
    }
    if (c.metaDescription) {
      let meta = document.querySelector('head > meta[name="description"]');
      if (!meta) {
        meta = document.createElement('meta');
        meta.setAttribute('name', 'description');
        document.head.appendChild(meta);
      }
      meta.setAttribute('content', c.metaDescription);
    }

    // Header site name
    const logoText = document.querySelector('.logo-text');
    if (logoText && c.siteName) logoText.textContent = c.siteName;

    // Hero section
    const heroTitle = document.querySelector('#hero-title');
    if (heroTitle && c.heroTitle) heroTitle.textContent = c.heroTitle;

    const heroSubtitle = document.querySelector('.hero-subtitle');
    if (heroSubtitle && c.heroSubtitle) heroSubtitle.textContent = c.heroSubtitle;

    // Emergency CTA
    const needHelp = document.querySelector('#need-help-now');
    if (needHelp && c.emergencyCtaHeading) needHelp.textContent = c.emergencyCtaHeading;

    const emergencyText = document.querySelector('.emergency-cta p');
    if (emergencyText && c.emergencyCtaText) emergencyText.textContent = c.emergencyCtaText;

    // Services overview title
    const servicesTitle = document.querySelector('#services-title');
    if (servicesTitle && c.servicesOverviewTitle) servicesTitle.textContent = c.servicesOverviewTitle;

    // About and Contact
    const about = document.querySelector('#about');
    if (about && c.aboutText) {
      const p = about.querySelector('p');
      if (p) p.textContent = c.aboutText;
    }

    const contactTitleBottom = document.querySelector('#contact-title-bottom');
    if (contactTitleBottom && c.contactTitle) contactTitleBottom.textContent = c.contactTitle;

    // Phone and email replacements
    const telLinks = Array.from(document.querySelectorAll('a[href^="tel:"]'));
    if (c.phoneDigits && c.phoneDisplay) {
      telLinks.forEach((a) => {
        a.setAttribute('href', `tel:${c.phoneDigits}`);
        a.textContent = c.phoneDisplay;
      });
    }

    const mailLinks = Array.from(document.querySelectorAll('a[href^="mailto:"]'));
    if (c.email) {
      mailLinks.forEach((a) => {
        a.setAttribute('href', `mailto:${c.email}`);
        a.textContent = c.email;
      });
    }
  }

  async function loadContent() {
    try {
      const res = await fetch('/api/content');
      if (!res.ok) return;
      const content = await res.json();
      applyContent(content);
    } catch {}
  }

  document.addEventListener('DOMContentLoaded', loadContent);
})();
