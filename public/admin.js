const $ = (sel, el=document) => el.querySelector(sel);
const $$ = (sel, el=document) => Array.from(el.querySelectorAll(sel));

async function fetchSite(){
  const res = await fetch('/api/site');
  if(!res.ok) throw new Error('Failed to load site');
  return res.json();
}

async function saveSite(site, token){
  const res = await fetch('/api/site', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify(site)
  });
  if(!res.ok) throw new Error('Failed to save');
  return res.json();
}

function renderTables(state){
  const pagesBody = $('#pages-table tbody');
  pagesBody.innerHTML = '';
  state.site.pages.forEach((p, idx) =>{
    const tr = document.createElement('tr');
    tr.innerHTML = `<td>${p.slug}</td><td>${p.title}</td><td><button data-idx="${idx}" class="edit-page btn btn-secondary">Edit</button> <button data-idx="${idx}" class="del-page btn btn-secondary">Delete</button></td>`;
    pagesBody.appendChild(tr);
  });

  const prodBody = $('#products-table tbody');
  prodBody.innerHTML = '';
  state.site.products.forEach((p, idx) =>{
    const tr = document.createElement('tr');
    tr.innerHTML = `<td>${p.name}</td><td>${p.price ?? ''}</td><td><button data-idx="${idx}" class="edit-prod btn btn-secondary">Edit</button> <button data-idx="${idx}" class="del-prod btn btn-secondary">Delete</button></td>`;
    prodBody.appendChild(tr);
  });
}

(async function(){
  const state = {
    site: { pages: [], products: [] },
    selectedPageIndex: null,
    selectedProdIndex: null
  };

  $('#load').addEventListener('click', async ()=>{
    try{
      const site = await fetchSite();
      state.site = {
        ...site,
        pages: site.pages || [],
        products: site.products || []
      };
      renderTables(state);
    }catch(e){ alert(e.message); }
  });

  $('#save').addEventListener('click', async ()=>{
    const token = $('#token').value.trim();
    if(!token) return alert('Provide admin token');
    try{
      await saveSite(state.site, token);
      alert('Saved');
    }catch(e){ alert(e.message); }
  });

  $('#addPage').addEventListener('click', ()=>{
    const slug = $('#newPageSlug').value.trim();
    const title = $('#newPageTitle').value.trim();
    if(!slug || !title) return;
    if(state.site.pages.find(p => p.slug === slug)) return alert('Slug exists');
    state.site.pages.push({ slug, title, body: '' });
    $('#newPageSlug').value = '';
    $('#newPageTitle').value = '';
    renderTables(state);
  });

  $('#pages-table').addEventListener('click', (e)=>{
    const btn = e.target.closest('button');
    if(!btn) return;
    const idx = Number(btn.dataset.idx);
    if(btn.classList.contains('edit-page')){
      state.selectedPageIndex = idx;
      $('#pageBody').value = state.site.pages[idx]?.body || '';
      $('#pageStatus').textContent = `Editing: ${state.site.pages[idx].title}`;
    }else if(btn.classList.contains('del-page')){
      state.site.pages.splice(idx,1);
      if(state.selectedPageIndex === idx) state.selectedPageIndex = null;
      renderTables(state);
    }
  });

  $('#updatePage').addEventListener('click', ()=>{
    const i = state.selectedPageIndex;
    if(i == null) return alert('Select a page to edit');
    state.site.pages[i].body = $('#pageBody').value;
    $('#pageStatus').textContent = 'Updated';
  });

  $('#addProd').addEventListener('click', ()=>{
    const name = $('#newProdName').value.trim();
    const price = Number($('#newProdPrice').value);
    if(!name) return;
    state.site.products.push({ name, price, description: ''});
    $('#newProdName').value = '';
    $('#newProdPrice').value = '';
    renderTables(state);
  });

  $('#products-table').addEventListener('click', (e)=>{
    const btn = e.target.closest('button');
    if(!btn) return;
    const idx = Number(btn.dataset.idx);
    if(btn.classList.contains('edit-prod')){
      state.selectedProdIndex = idx;
      $('#prodDesc').value = state.site.products[idx]?.description || '';
      $('#prodStatus').textContent = `Editing: ${state.site.products[idx].name}`;
    }else if(btn.classList.contains('del-prod')){
      state.site.products.splice(idx,1);
      if(state.selectedProdIndex === idx) state.selectedProdIndex = null;
      renderTables(state);
    }
  });

  $('#updateProd').addEventListener('click', ()=>{
    const i = state.selectedProdIndex;
    if(i == null) return alert('Select a product to edit');
    state.site.products[i].description = $('#prodDesc').value;
    $('#prodStatus').textContent = 'Updated';
  });
})();
