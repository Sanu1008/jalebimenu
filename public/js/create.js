// ---------------- DOM ELEMENTS ----------------
const extraPricesList = document.getElementById('extraPricesList');
const addExtraPriceBtn = document.getElementById('addExtraPriceBtn');
const createItemForm = document.getElementById('createItemForm');
const preview = document.getElementById('preview');
const toastEl = document.getElementById('toast');
const toast = toastEl ? new bootstrap.Toast(toastEl) : null;
const mainPriceInput = createItemForm.querySelector('input[name="price"]');
const vatCheckbox = createItemForm.querySelector('input[name="vatEnabled"]');
const itemImage = document.getElementById('itemImage');

// ---------------- IMAGE PREVIEW ----------------
if (itemImage) {
  itemImage.addEventListener('change', e => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => preview.innerHTML = `<img src="${reader.result}" width="150">`;
    reader.readAsDataURL(file);
  });
}

// ---------------- EXTRA PRICES ----------------
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

// ---------------- POPULATE FORM FOR EDIT (Optional) ----------------
async function loadItemForEdit(itemId) {
  try {
    const res = await fetch(`/api/items`);
    const items = await res.json();
    const item = items.find(i => i.id == itemId);
    if (!item) return;

    mainPriceInput.value = item.price || '';
    vatCheckbox.checked = item.vat_enabled; // ✅ set checkbox
    createItemForm.querySelector('input[name="name"]').value = item.name;
    createItemForm.querySelector('input[name="category"]').value = item.category;
    createItemForm.querySelector('textarea[name="description"]').value = item.description || '';

    preview.innerHTML = item.image_base64 ? `<img src="${item.image_base64}" width="150">` : '';
    extraPricesList.innerHTML = '';

    if (item.extra_prices && item.extra_prices.length > 0) {
      item.extra_prices.forEach(ep => addExtraPriceRow(ep.label, ep.price));
    }
  } catch (err) {
    console.error('Error loading item for edit:', err);
  }
}

// ---------------- SUBMIT FORM ----------------
if (createItemForm) {
  createItemForm.addEventListener('submit', async e => {
    e.preventDefault();

    // ---------------- VALIDATION ----------------
    const labels = document.querySelectorAll('#extraPricesList .price-label');
    const values = document.querySelectorAll('#extraPricesList .price-value');
    let hasExtraPrice = false;

    labels.forEach((input, idx) => {
      const label = input.value.trim();
      const price = values[idx].value.trim();
      if (label && price) hasExtraPrice = true;
    });

    if (!hasExtraPrice && (!mainPriceInput.value || mainPriceInput.value.trim() === '')) {
      alert('Please enter at least a main price or one extra price.');
      return;
    }

    // ---------------- FORM DATA ----------------
    const formData = new FormData(createItemForm);

    // Extra prices
    labels.forEach((input, idx) => {
      const label = input.value.trim();
      const price = values[idx].value.trim();
      if(label && price){
        formData.append('labels', label);
        formData.append('prices', price);
      }
    });

    // VAT
    formData.append('vatEnabled', vatCheckbox.checked ? '1' : '0');

    // ---------------- SEND REQUEST ----------------
    try {
      // Detect if editing (has data-item-id attribute)
      const itemId = createItemForm.dataset.itemId;
      const url = itemId ? `/api/items/${itemId}` : '/api/items';
      const method = itemId ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        body: formData,
        credentials: 'include'
      });

      if(res.status === 401){
        alert('Unauthorized! Please login first');
        window.location.href = '/';
        return;
      }

      if(res.ok){
        if(toastEl && toast){
          toastEl.classList.remove('text-bg-danger');
          toastEl.classList.add('text-bg-success');
          document.getElementById('toastBody').textContent = itemId ? 'Item updated successfully!' : 'Item created successfully!';
          toast.show();
        }

        createItemForm.reset();
        preview.innerHTML = '';
        extraPricesList.innerHTML = '';
        setTimeout(() => window.location.href='/dashboard', 1500);
      } else {
        const err = await res.json();
        if(toastEl && toast){
          toastEl.classList.remove('text-bg-success');
          toastEl.classList.add('text-bg-danger');
          document.getElementById('toastBody').textContent = err.error || 'Failed to create/update item';
          toast.show();
        }
      }

    } catch (err) {
      console.error(err);
      alert('Something went wrong while saving the item.');
    }
  });
}
