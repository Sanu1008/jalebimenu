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

// Submit form
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
