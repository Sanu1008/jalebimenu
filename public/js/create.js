// --- DOM Elements ---
const extraPricesList = document.getElementById('extraPricesList');
const addExtraPriceBtn = document.getElementById('addExtraPriceBtn');
const createItemForm = document.getElementById('createItemForm');
const preview = document.getElementById('preview');
const toastEl = document.getElementById('toast');
const toast = toastEl ? new bootstrap.Toast(toastEl) : null;
const mainPriceInput = createItemForm.querySelector('input[name="price"]');
const vatCheckbox = createItemForm.querySelector('input[name="vatEnabled"]');
const activeCheckbox = createItemForm.querySelector('input[name="isActive"]');
const itemImage = document.getElementById('itemImage');
const categorySelect = document.getElementById('categorySelect');

// --- Image Preview ---
if (itemImage) {
  itemImage.addEventListener('change', e => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => preview.innerHTML = `<img src="${reader.result}" width="150">`;
    reader.readAsDataURL(file);
  });
}

// --- Extra Prices Logic ---
function addExtraPriceRow(label = '', price = '') {
  const row = document.createElement('div');
  row.className = 'd-flex gap-2 mb-1 extra-price-row';
  row.innerHTML = `
    <input type="text" class="form-control price-label" placeholder="Label (e.g. Large)" value="${label}">
    <input type="number" class="form-control price-value" placeholder="Price" value="${price}" step="0.01">
    <button type="button" class="btn btn-danger btn-sm remove-price-btn">&times;</button>
  `;
  extraPricesList.appendChild(row);
  row.querySelector('.remove-price-btn').addEventListener('click', () => row.remove());
}
addExtraPriceBtn.addEventListener('click', () => addExtraPriceRow());

// --- LOAD CATEGORIES ---
async function loadCategories() {
  try {
    const res = await fetch('/api/categories', { credentials: 'include' });
    if (!res.ok) throw new Error('Failed to fetch categories');

    const data = await res.json();
    
    // Clear current options
    categorySelect.innerHTML = '';

    // Default option
    const defaultOpt = document.createElement('option');
    defaultOpt.disabled = true;
    defaultOpt.selected = true;
    defaultOpt.textContent = 'Select Category';
    categorySelect.appendChild(defaultOpt);

    if (!data || data.length === 0) {
      const noOpt = document.createElement('option');
      noOpt.disabled = true;
      noOpt.textContent = 'No categories found';
      categorySelect.appendChild(noOpt);
    } else {
      data.forEach(c => {
        const opt = document.createElement('option');
        // IMPORTANT: Your DB 'items' table stores category as a Name (VARCHAR), not an ID.
        // So we set the value to 'c.name' so the form submits the name correctly.
        opt.value = c.name; 
        opt.textContent = c.name;
        categorySelect.appendChild(opt);
      });
    }

    // Add "New Category" option
    const divider = document.createElement('option');
    divider.disabled = true;
    divider.textContent = '──────────';
    categorySelect.appendChild(divider);

    const addNewOpt = document.createElement('option');
    addNewOpt.value = "__add_new__";
    addNewOpt.textContent = "➕ Add New Category";
    categorySelect.appendChild(addNewOpt);

  } catch (err) {
    console.error('Error loading categories:', err);
    categorySelect.innerHTML = '<option disabled selected>Error loading</option>';
  }
}

// --- Category Modal Logic ---
categorySelect.addEventListener('change', function () {
  if (this.value === '__add_new__') {
    this.value = ''; // Reset selection
    const modal = new bootstrap.Modal(document.getElementById('categoryModal'));
    modal.show();
  }
});

document.getElementById('saveCategoryBtn').addEventListener('click', async () => {
  const nameInput = document.getElementById('newCategoryName');
  const name = nameInput.value.trim();
  if (!name) return alert('Enter category name');
  
  try {
    const res = await fetch('/api/categories', {
      method: 'POST',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify({ name }),
      credentials: 'include'
    });
    
    if (!res.ok) {
      const err = await res.json();
      return alert(err.error || 'Failed to add category');
    }
    
    nameInput.value = '';
    bootstrap.Modal.getInstance(document.getElementById('categoryModal')).hide();
    
    // Reload categories and select the new one
    await loadCategories();
    categorySelect.value = name; 
    
  } catch(err) { 
    console.error(err); 
    alert('Error saving category'); 
  }
});

// Initialize on page load
loadCategories();

// --- FORM SUBMISSION ---
createItemForm.addEventListener('submit', async e => {
  e.preventDefault();
  
  const labels = document.querySelectorAll('#extraPricesList .price-label');
  const values = document.querySelectorAll('#extraPricesList .price-value');
  let hasExtraPrice = false;
  labels.forEach((input, idx) => { if (input.value && values[idx].value) hasExtraPrice = true; });
  
  if (!hasExtraPrice && !mainPriceInput.value.trim()) { 
    alert('Enter main price or extra price'); 
    return; 
  }

  const formData = new FormData(createItemForm);
  
  // Append extra prices
  labels.forEach((input, idx) => {
    if (input.value && values[idx].value) {
      formData.append('labels', input.value);
      formData.append('prices', values[idx].value);
    }
  });
  
  formData.append('vatEnabled', vatCheckbox.checked ? '1' : '0');
  formData.append('isActive', activeCheckbox.checked ? '1' : '0');

  const itemId = createItemForm.dataset.itemId;
  const url = itemId ? `/api/items/${itemId}` : '/api/items';
  const method = itemId ? 'PUT' : 'POST';

  try {
    const res = await fetch(url, { method, body: formData, credentials: 'include' });
    if (res.ok) {
      if (toastEl && toast) {
        toastEl.classList.remove('text-bg-danger'); toastEl.classList.add('text-bg-success');
        document.getElementById('toastBody').textContent = itemId ? 'Item updated!' : 'Item created!';
        toast.show();
      }
      createItemForm.reset();
      preview.innerHTML = '';
      extraPricesList.innerHTML = '';
      setTimeout(() => window.location.href='/dashboard', 1500);
    } else {
      const err = await res.json();
      if (toastEl && toast) {
        toastEl.classList.remove('text-bg-success'); toastEl.classList.add('text-bg-danger');
        document.getElementById('toastBody').textContent = err.error || 'Failed';
        toast.show();
      }
    }
  } catch(err){ console.error(err); alert('Error saving item'); }
});