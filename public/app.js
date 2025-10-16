/* Minimal client-side renderer for site.json */
(async function(){
  const state = { config:null };

  const qs = (sel, el=document) => el.querySelector(sel);
  const qsa = (sel, el=document) => Array.from(el.querySelectorAll(sel));

  async function loadConfig(){
    const res = await fetch('./data/site.json', { cache:'no-cache' });
    if(!res.ok){ throw new Error('Failed to load data/site.json'); }
    return res.json();
  }

  function setTheme(theme){
    if(!theme) return;
    const root = document.documentElement;
    for(const [k,v] of Object.entries(theme)){
      root.style.setProperty(`--${k}`, v);
    }
  }

  function renderHeader(cfg){
    const brandName = qs('#brand-name');
    const brandLogo = qs('#brand-logo');
    const navLinks = qs('#nav-links');

    if(cfg.brand?.name) brandName.textContent = cfg.brand.name;
    if(cfg.brand?.logo){ brandLogo.src = cfg.brand.logo; brandLogo.alt = cfg.brand.alt || cfg.brand.name || 'Logo'; }

    navLinks.innerHTML = '';
    (cfg.nav || []).forEach(item =>{
      const li = document.createElement('li');
      const a = document.createElement('a');
      a.href = item.href || '#';
      a.textContent = item.label || '';
      li.appendChild(a);
      navLinks.appendChild(li);
    });

    const navToggle = qs('#nav-toggle');
    const siteNav = qs('#site-nav');
    navToggle?.addEventListener('click', ()=>{
      const expanded = navToggle.getAttribute('aria-expanded') === 'true';
      navToggle.setAttribute('aria-expanded', String(!expanded));
      siteNav.classList.toggle('open');
    });
  }

  function el(tag, attrs={}, children=[]){
    const node = document.createElement(tag);
    for(const [k,v] of Object.entries(attrs)){
      if(k === 'class') node.className = v;
      else if(k.startsWith('on') && typeof v === 'function') node.addEventListener(k.slice(2), v);
      else if(v !== undefined && v !== null) node.setAttribute(k, v);
    }
    for(const child of children){
      if(child == null) continue;
      if(typeof child === 'string') node.appendChild(document.createTextNode(child));
      else node.appendChild(child);
    }
    return node;
  }

  function sectionWrapper(id, classes='section'){
    return el('section', { id, class: classes }, [ el('div', { class:'container' }, []) ]);
  }

  function renderHero(cfg){
    if(!cfg.hero) return;
    const sec = sectionWrapper('hero');
    const container = sec.firstChild;

    const left = el('div', { class:'hero-card' }, [
      el('div', { class:'eyebrow' }, [cfg.hero.eyebrow || '']),
      el('h1', { class:'hero-title' }, [cfg.hero.title || '']),
      el('p', { class:'hero-subtitle' }, [cfg.hero.subtitle || '']),
      el('div', { class:'cta-row' }, (cfg.hero.cta || []).map(btn => el('a', { class: btn.variant === 'secondary' ? 'btn btn-secondary' : 'btn btn-primary', href: btn.href || '#' }, [btn.label || '']))),
    ]);

    const rightImg = cfg.hero.image ? el('img', { src: cfg.hero.image, alt: cfg.hero.imageAlt || '' }) : null;
    const grid = el('div', { class:'hero' }, [left, rightImg]);
    container.appendChild(grid);
    document.getElementById('content').appendChild(sec);
  }

  function renderServices(cfg){
    if(!cfg.services) return;
    const sec = sectionWrapper('services');
    const container = sec.firstChild;

    container.appendChild(el('h2', { class:'section-title' }, [cfg.services.title || 'Services']));
    if(cfg.services.subtitle) container.appendChild(el('p', { class:'section-subtitle' }, [cfg.services.subtitle]));

    const grid = el('div', { class:'cards' }, (cfg.services.items || []).map(svc => el('div', { class:'card' }, [
      el('h3', {}, [svc.title || '']),
      el('p', {}, [svc.description || ''])
    ])));
    container.appendChild(grid);
    document.getElementById('content').appendChild(sec);
  }

  function renderAbout(cfg){
    if(!cfg.about) return;
    const sec = sectionWrapper('about');
    const container = sec.firstChild;

    container.appendChild(el('h2', { class:'section-title' }, [cfg.about.title || 'About']));
    if(cfg.about.body){
      const p = el('p', {}, [cfg.about.body]);
      container.appendChild(p);
    }
    document.getElementById('content').appendChild(sec);
  }

  function renderTestimonials(cfg){
    if(!cfg.testimonials) return;
    const sec = sectionWrapper('testimonials');
    const container = sec.firstChild;

    container.appendChild(el('h2', { class:'section-title' }, [cfg.testimonials.title || 'Testimonials']));
    const grid = el('div', { class:'grid-3' }, (cfg.testimonials.items || []).map(t => el('div', { class:'card' }, [
      el('p', {}, ['"' + (t.quote || '') + '"']),
      el('p', { class:'muted mt-2' }, ['— ' + (t.author || '')])
    ])));
    container.appendChild(grid);
    document.getElementById('content').appendChild(sec);
  }

  function renderPricing(cfg){
    if(!cfg.pricing) return;
    const sec = sectionWrapper('pricing');
    const container = sec.firstChild;

    container.appendChild(el('h2', { class:'section-title' }, [cfg.pricing.title || 'Pricing']));
    const grid = el('div', { class:'grid-3' }, (cfg.pricing.plans || []).map(p => el('div', { class:'card' }, [
      el('h3', {}, [p.name || 'Plan']),
      el('p', { class:'mt-2' }, [p.description || '']),
      el('p', { class:'mt-3' }, [p.price ? `$${p.price}` : '']),
      el('div', { class:'mt-3' }, [ el('a', { class:'btn btn-primary', href:p.cta?.href || '#' }, [p.cta?.label || 'Choose plan']) ])
    ])));
    container.appendChild(grid);
    document.getElementById('content').appendChild(sec);
  }

  function renderContact(cfg){
    if(!cfg.contact) return;
    const sec = sectionWrapper('contact');
    const container = sec.firstChild;

    container.appendChild(el('h2', { class:'section-title' }, [cfg.contact.title || 'Contact']));
    if(cfg.contact.subtitle) container.appendChild(el('p', { class:'section-subtitle' }, [cfg.contact.subtitle]));

    const email = cfg.contact.email ? el('a', { href:`mailto:${cfg.contact.email}`, class:'btn btn-secondary mt-3' }, ['Email us']) : null;
    const phone = cfg.contact.phone ? el('a', { href:`tel:${cfg.contact.phone}`, class:'btn btn-secondary mt-3' }, ['Call us']) : null;
    const ctas = el('div', { class:'cta-row' }, [email, phone].filter(Boolean));
    container.appendChild(ctas);

    document.getElementById('content').appendChild(sec);
  }

  function renderFooter(cfg){
    const footer = qs('#footer-content');
    footer.innerHTML = '';
    const year = new Date().getFullYear();
    footer.appendChild(el('p', { class:'muted' }, [cfg.footer?.text || `© ${year} ${cfg.brand?.name || ''}. All rights reserved.`]));
  }

  function renderAll(cfg){
    renderHeader(cfg);
    renderHero(cfg);
    renderServices(cfg);
    renderAbout(cfg);
    renderTestimonials(cfg);
    renderPricing(cfg);
    renderContact(cfg);
    renderFooter(cfg);
  }

  try{
    state.config = await loadConfig();
    setTheme(state.config.themeVars);
    renderAll(state.config);
  }catch(err){
    console.error(err);
    const main = document.getElementById('content');
    main.appendChild(el('div', { class:'container' }, [
      el('div', { class:'card' }, [
        el('h2', {}, ['Could not load site.json']),
        el('p', {}, ['Place a configuration file at ', el('code',{},['public/data/site.json']), ' or run a local server.'])
      ])
    ]));
  }
})();
