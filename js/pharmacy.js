/* ==========================================================================
   MEDICINE REMINDER & HEALTH TRACKER - PHARMACY & REFILLS
   ========================================================================== */

import { store } from './store.js';
import { showToast } from './reminders.js';

export function initPharmacyView() {
  renderInventoryStatus();
  renderRefillOrders();
  renderNearbyPharmacies();
  setupRefillModalForm();
}

export function renderInventoryStatus() {
  const container = document.getElementById('pharmacy-inventory-container');
  if (!container) return;

  const state = store.getState();
  const medicines = state.medicines || [];

  container.innerHTML = medicines.map(med => {
    const percent = Math.min(100, Math.round((med.stockRemaining / med.stockTotal) * 100));
    let statusClass = '';
    let badgeText = 'Adequate Supply';
    let badgeClass = 'normal';

    if (med.stockRemaining <= 5) {
      statusClass = 'critical';
      badgeText = 'Critical Refill Needed';
      badgeClass = 'alert';
    } else if (med.stockRemaining <= med.refillThreshold) {
      statusClass = 'low';
      badgeText = 'Low Supply (< 7 days)';
      badgeClass = 'warning';
    }

    return `
      <div class="card" style="display:flex; flex-direction:column; justify-content:space-between;">
        <div>
          <div style="display:flex; justify-content:space-between; align-items:flex-start;">
            <div>
              <h4 style="font-size:1.15rem;">${med.name}</h4>
              <div style="font-size:0.85rem; color:var(--text-muted);">${med.dosage} (${med.type})</div>
            </div>
            <span class="vital-status-chip ${badgeClass}">● ${badgeText}</span>
          </div>

          <div class="stock-meter-container">
            <div style="display:flex; justify-content:space-between; font-size:0.8rem; font-weight:700;">
              <span>Stock Remaining</span>
              <span>${med.stockRemaining} of ${med.stockTotal} doses</span>
            </div>
            <div class="stock-meter-bar">
              <div class="stock-meter-fill ${statusClass}" style="width: ${percent}%;"></div>
            </div>
          </div>
        </div>

        <div style="display:flex; justify-content:space-between; align-items:center; margin-top:14px; border-top:1px solid var(--border-light); padding-top:12px;">
          <span style="font-size:0.8rem; color:var(--text-muted);">
            Prescribed by: ${med.prescribedBy}
          </span>
          <button class="btn btn-sm btn-primary" onclick="window.openRefillModalForMed('${med.id}')">
            📦 Request Refill
          </button>
        </div>
      </div>
    `;
  }).join('');
}

export function renderRefillOrders() {
  const container = document.getElementById('refill-orders-container');
  if (!container) return;

  const state = store.getState();
  const orders = state.refillOrders || [];

  if (orders.length === 0) {
    container.innerHTML = `
      <div style="text-align:center; padding:20px; color:var(--text-muted); font-size:0.9rem;">
        No active pharmacy orders at this time.
      </div>
    `;
    return;
  }

  container.innerHTML = orders.map(order => `
    <div style="background:var(--bg-card); border:1px solid var(--border-light); border-radius:var(--radius-md); padding:16px; margin-bottom:12px; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:12px;">
      <div>
        <div style="display:flex; align-items:center; gap:8px;">
          <h4 style="font-size:1rem;">${order.medicineName}</h4>
          <span style="font-size:0.75rem; background:var(--bg-subtle); padding:2px 6px; border-radius:4px; font-weight:600;">#${order.orderNumber}</span>
        </div>
        <div style="font-size:0.85rem; color:var(--text-muted); margin-top:2px;">
          ${order.dosage} • ${order.pharmacyName}
        </div>
        <div style="font-size:0.75rem; color:var(--text-muted); margin-top:2px;">
          Requested: ${order.requestedAt}
        </div>
      </div>

      <div style="display:flex; align-items:center; gap:10px;">
        <span style="background:var(--success-50); color:var(--success-700); font-weight:700; font-size:0.82rem; padding:4px 10px; border-radius:var(--radius-pill); border:1px solid rgba(16,185,129,0.3);">
          🚚 ${order.status}
        </span>
        <button class="btn btn-sm btn-secondary" onclick="showToast('Order is packed and waiting at pharmacy pickup window!', 'info')">
          Track
        </button>
      </div>
    </div>
  `).join('');
}

export function renderNearbyPharmacies() {
  const container = document.getElementById('nearby-pharmacies-grid');
  if (!container) return;

  const state = store.getState();
  const pharmacies = state.pharmacies || [];

  container.innerHTML = pharmacies.map(ph => `
    <div class="pharmacy-card">
      <div style="display:flex; justify-content:space-between; align-items:flex-start;">
        <div>
          <h4 style="font-size:1.1rem; line-height:1.2;">${ph.name}</h4>
          <span style="font-size:0.8rem; color:var(--primary-600); font-weight:700;">📍 ${ph.distance}</span>
        </div>
        <span style="font-size:0.75rem; background:var(--bg-subtle); padding:3px 8px; border-radius:var(--radius-pill); font-weight:600;">
          🕒 ${ph.hours}
        </span>
      </div>

      <div style="font-size:0.85rem; color:var(--text-muted); display:flex; flex-direction:column; gap:4px;">
        <div>🏢 ${ph.address}</div>
        <div>📞 ${ph.phone}</div>
        <div style="display:flex; gap:6px; flex-wrap:wrap; margin-top:4px;">
          ${ph.features.map(f => `<span style="font-size:0.75rem; background:var(--bg-subtle); padding:2px 6px; border-radius:4px;">✓ ${f}</span>`).join('')}
        </div>
      </div>

      <div style="display:flex; justify-content:space-between; align-items:center; border-top:1px solid var(--border-light); padding-top:12px; margin-top:auto;">
        <button class="btn btn-sm btn-secondary" onclick="alert('Calling pharmacy at ${ph.phone}...')">
          📞 Call Pharmacy
        </button>
        <button class="btn btn-sm btn-primary" onclick="alert('Opening navigation directions to ${ph.address}')">
          🗺️ Directions
        </button>
      </div>
    </div>
  `).join('');
}

window.openRefillModalForMed = function(medId) {
  const state = store.getState();
  const med = state.medicines.find(m => m.id === medId);
  const select = document.getElementById('refill-select-med');
  if (select && med) {
    select.value = med.id;
  }
  const modal = document.getElementById('request-refill-modal');
  if (modal) modal.classList.add('active');
};

function setupRefillModalForm() {
  const form = document.getElementById('request-refill-form');
  if (!form) return;

  form.addEventListener('submit', (e) => {
    e.preventDefault();

    const state = store.getState();
    const medId = document.getElementById('refill-select-med').value;
    const pharmacyId = document.getElementById('refill-select-pharmacy').value;
    const deliveryMethod = document.getElementById('refill-select-delivery').value;
    const supplyDays = document.getElementById('refill-select-days').value;

    const med = state.medicines.find(m => m.id === medId);
    const pharmacy = state.pharmacies.find(p => p.id === pharmacyId) || state.pharmacies[0];

    if (!med) {
      showToast('Please select a medication to refill.', 'warning');
      return;
    }

    const newOrderNumber = 'RX-' + Math.floor(10000 + Math.random() * 90000);

    state.refillOrders.unshift({
      id: 'ref-' + Date.now(),
      medicineName: med.name,
      dosage: `${supplyDays}-day supply (${med.dosage})`,
      pharmacyName: pharmacy.name,
      status: deliveryMethod === 'delivery' ? 'Out for Delivery' : 'Ready for Pickup',
      requestedAt: 'Just now',
      orderNumber: newOrderNumber
    });

    // Also top up the medication stock so the demonstration is gratifying!
    const addedDoses = supplyDays === '30' ? 30 : 90;
    med.stockRemaining += addedDoses;
    med.stockTotal = Math.max(med.stockTotal, med.stockRemaining);

    // Resolve any low stock alert for this med
    state.alerts.forEach(a => {
      if (a.title.includes(med.name) && a.title.includes('Stock')) {
        a.resolved = true;
      }
    });

    store.saveState();
    renderInventoryStatus();
    renderRefillOrders();

    const modal = document.getElementById('request-refill-modal');
    if (modal) modal.classList.remove('active');
    form.reset();

    showToast(`🎉 Refill ordered! ${newOrderNumber} placed with ${pharmacy.name}. ${addedDoses} doses added to inventory.`, 'success', 5000);
  });
}
