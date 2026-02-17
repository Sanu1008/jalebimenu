// DOM elements
const extraPricesList = document.getElementById('extraPricesList');
const addExtraPriceBtn = document.getElementById('addExtraPriceBtn');
const createItemForm = document.getElementById('createItemForm');
const preview = document.getElementById('preview');
const toastEl = document.getElementById('toast');
const toast = toastEl ? new bootstrap.Toast(toastEl) : null;
const mainPriceInput = createItemForm ? createItemForm.querySelector('input[name="price"]') : null;

// Preview selected image
const itemImage = document.getElementById('itemImage');
if (itemImage) {
  itemImage.addEventListener('change', e => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => preview.innerHTML = `<img src="${reader.result}" width="150">`;
    reader.readAsDataURL(file);
  });
}

// Function to add extra price row
function addExtraPriceRow(label = '', price = '') {
  const row = document.createElement('div');
  row.className = 'd-flex gap-2 mb-1 extra-price-row';
  row.innerHTML = `
    <input type="text" class="form-control price-label" placeholder="Label" value="${label}">
    <input type="number" class="form-control price-value" placeholder="Price" value="${price}" step="0.01">
    <button type="button" class="btn btn-danger btn-sm remove-price-btn">&times;</button>
  `;
  extraPricesList.appendChild(row);

  // Remove button
  row.querySelector('.remove-price-btn').addEventListener('click', () => row.remove());
}

// Add new row on button click
addExtraPriceBtn.addEventListener('click', () => addExtraPriceRow());

// ------------------ Submit Form ------------------
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

    // If no extra price and no main price -> show alert
    if (!hasExtraPrice && (!mainPriceInput.value || mainPriceInput.value.trim() === '')) {
      alert('Please enter at least a main price or one extra price.');
      return;
    }

    const formData = new FormData(createItemForm);

    // Append extra prices
    labels.forEach((input, idx) => {
      const label = input.value.trim();
      const price = values[idx].value.trim();
      if(label && price){
        formData.append('labels', label);
        formData.append('prices', price);
      }
    });

    // Send request
    const res = await fetch('/api/items', {
      method: 'POST',
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
        document.getElementById('toastBody').textContent = 'Item created successfully!';
        toast.show();
      }

      createItemForm.reset();
      preview.innerHTML = '';
      extraPricesList.innerHTML = '';

      setTimeout(() => window.location.href='/dashboard', 1500);
    } else {
      if(toastEl && toast){
        toastEl.classList.remove('text-bg-success');
        toastEl.classList.add('text-bg-danger');
        const err = await res.json();
        document.getElementById('toastBody').textContent = err.error || 'Failed to create item';
        toast.show();
      }
    }
  });
}
