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

// Image preview
if (itemImage) {
  itemImage.addEventListener('change', e => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => preview.innerHTML = `<img src="${reader.result}" width="150">`;
    reader.readAsDataURL(file);
  });
}

// Extra prices
function addExtraPriceRow(label = '', price = '') {
  const row = document.createElement('div');
  row.className = 'd-flex gap-2 mb-1 extra-price-row';
  row.innerHTML = `
    <input type="text" class="form-control price-label" placeholder="Label" value="${label}">
    <input type="number" class="form-control price-value" placeholder="Price" value="${price}" step="0.01">
    <button type="button" class="btn btn-danger btn-sm remove-price-btn">&times;</button>
  `;
  extraPricesList.appendChild(row);
  row.querySelector('.remove-price-btn').addEventListener('click', () => row.remove());
}
addExtraPriceBtn.addEventListener('click', () => addExtraPriceRow());

// ===============================
// LOAD CATEGORIES INTO DROPDOWN
// ===============================
async function loadCategories() {
  try {
    const res = await fetch('/api/categories', {
      credentials: 'include'  // ✅ make sure cookies/session sent
    });
    if (!res.ok) throw new Error('Failed to fetch categories');

    const data = await res.json();
    console.log('Categories loadedaaaa:', data); // 🔍 debug

    categorySelect.innerHTML = '<option disabled selected>Select Category</option>';

    if (!data || data.length === 0) {
      categorySelect.innerHTML += '<option disabled>No categories found</option>';
    } else {
      data.forEach(c => {
        // Use category ID as value, name as display
        categorySelect.innerHTML += `<option value="${c.id}">${c.name}</option>`;
      });
    }

    categorySelect.innerHTML += `
      <option disabled>──────────</option>
      <option value="__add_new__">➕ Add New Category</option>
    `;
  } catch (err) {
    console.error('Error loading categories:', err);
    categorySelect.innerHTML = '<option disabled selected>Error loading categories</option>';
  }
}



// Show modal when add new clicked
categorySelect.addEventListener('change', function () {
  if (this.value === '__add_new__') {
    this.value = '';
    const modal = new bootstrap.Modal(document.getElementById('categoryModal'));
    modal.show();
  }
});

// Save new category from modal
document.getElementById('saveCategoryBtn').addEventListener('click', async () => {
  const name = document.getElementById('newCategoryName').value.trim();
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
      alert(err.error || 'Failed to add category');
      return;
    }
    document.getElementById('newCategoryName').value = '';
    bootstrap.Modal.getInstance(document.getElementById('categoryModal')).hide();
    loadCategories();
  } catch(err){ console.error(err); alert('Error saving category'); }
});

loadCategories();

// ===============================
// Submit form
// ===============================
createItemForm.addEventListener('submit', async e => {
  e.preventDefault();
  const labels = document.querySelectorAll('#extraPricesList .price-label');
  const values = document.querySelectorAll('#extraPricesList .price-value');
  let hasExtraPrice = false;
  labels.forEach((input, idx) => { if (input.value && values[idx].value) hasExtraPrice = true; });
  if (!hasExtraPrice && !mainPriceInput.value.trim()) { alert('Enter main price or extra price'); return; }

  const formData = new FormData(createItemForm);
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
