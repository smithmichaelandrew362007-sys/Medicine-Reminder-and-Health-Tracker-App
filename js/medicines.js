/* ==========================================================================
   MEDICINE REMINDER & HEALTH TRACKER - MEDICINE MANAGEMENT & SCHEDULE
   ========================================================================== */

import { store } from './store.js';
import { playChimeSound, showToast, triggerReminderModal } from './reminders.js';
import confetti from 'canvas-confetti';

let activeFilter = 'all';

export function initMedicinesView() {
  renderSchedule();
  renderMedicinesList();
  setupAddMedicineForm();
  setupFilterChips();
}

export function setupFilterChips() {
  const chips = document.querySelectorAll('.filter-chip');
  chips.forEach(chip => {
    chip.addEventListener('click', () => {
      chips.forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      activeFilter = chip.getAttribute('data-filter') || 'all';
      renderSchedule();
    });
  });
}

export function renderSchedule() {
  const state = store.getState();
  const scheduleContainer = document.getElementById('schedule-cards-container');
  if (!scheduleContainer) return;

  const logs = state.doseLogs || [];
  const medicines = state.medicines || [];

  // Calculate adherence stats
  const totalDoses = logs.length;
  const takenDoses = logs.filter(l => l.status === 'taken').length;
  const missedDoses = logs.filter(l => l.status === 'missed').length;
  const pendingDoses = logs.filter(l => l.status === 'pending').length;
  const adherencePercent = totalDoses > 0 ? Math.round((takenDoses / totalDoses) * 100) : 0;

  // Update adherence header widgets
  const percentEl = document.getElementById('adherence-percentage-val');
  if (percentEl) percentEl.textContent = `${adherencePercent}%`;

  const barEl = document.getElementById('adherence-progress-circle-bar');
  if (barEl) {
    const circumference = 2 * Math.PI * 34; // r=34
    const offset = circumference - (adherencePercent / 100) * circumference;
    barEl.style.strokeDashoffset = offset;
  }

  const ratioEl = document.getElementById('adherence-ratio-text');
  if (ratioEl) ratioEl.textContent = `${takenDoses} of ${totalDoses} doses completed today`;

  const streakEl = document.getElementById('adherence-streak-count');
  if (streakEl) streakEl.textContent = `${state.adherenceStreakDays} Days Streak!`;

  // Filter logs
  let filteredLogs = logs;
  if (activeFilter !== 'all') {
    filteredLogs = logs.filter(l => l.period === activeFilter);
  }

  if (filteredLogs.length === 0) {
    scheduleContainer.innerHTML = `
      <div style="text-align:center; padding: 40px 20px; color: var(--text-muted);">
        <div style="font-size: 2.5rem; margin-bottom: 8px;">💊</div>
        <h4>No doses scheduled for this time period</h4>
        <p style="font-size: 0.9rem;">Enjoy your break or check other time periods.</p>
      </div>
    `;
    return;
  }

  // Render cards
  scheduleContainer.innerHTML = filteredLogs.map(log => {
    const med = medicines.find(m => m.id === log.medId) || {
      name: log.medName,
      dosage: '',
      type: 'tablet',
      color: '#0d9488',
      instructions: 'Take as directed',
      stockRemaining: 0
    };

    let statusBadge = '';
    let cardClass = 'medicine-card';

    if (log.status === 'taken') {
      cardClass += ' taken';
      statusBadge = `<span class="badge" style="background:var(--success-50);color:var(--success-700);font-weight:700;font-size:0.8rem;padding:3px 8px;border-radius:var(--radius-pill);">✓ Taken at ${log.takenAt || 'On time'}</span>`;
    } else if (log.status === 'missed') {
      cardClass += ' missed';
      statusBadge = `<span class="badge" style="background:var(--danger-50);color:var(--danger-700);font-weight:700;font-size:0.8rem;padding:3px 8px;border-radius:var(--radius-pill);">✕ Missed</span>`;
    } else {
      cardClass += ' due';
      statusBadge = `<span class="badge" style="background:var(--warning-50);color:var(--warning-700);font-weight:700;font-size:0.8rem;padding:3px 8px;border-radius:var(--radius-pill);">⏰ Scheduled at ${log.timeSlot}</span>`;
    }

    let stockStatus = 'normal';
    if (med.stockRemaining <= 5) stockStatus = 'critical';
    else if (med.stockRemaining <= 10) stockStatus = 'low';

    const pillIcons = {
      tablet: '💊',
      capsule: '💊',
      liquid: '🧪',
      drops: '💧',
      inhaler: '💨',
      injection: '💉'
    };

    return `
      <div class="${cardClass}" id="dose-card-${log.id}">
        <div class="med-left-group">
          <div class="med-visual-pill" style="border-color:${med.color}; background:${med.color}18;">
            ${pillIcons[med.type] || '💊'}
          </div>
          <div class="med-details">
            <div class="med-name">
              ${med.name}
              <span class="med-dosage-tag">${med.dosage}</span>
            </div>
            <div class="med-instruction">
              <span>🥄</span> ${med.instructions}
            </div>
            <div style="display:flex; align-items:center; gap:8px; margin-top:4px; flex-wrap:wrap;">
              <span class="med-timing-badge">🕒 ${log.timeSlot} (${log.period.toUpperCase()})</span>
              <span class="stock-indicator ${stockStatus}">
                📦 ${med.stockRemaining} doses left
              </span>
              ${statusBadge}
            </div>
          </div>
        </div>

        <div class="med-actions">
          ${log.status === 'pending' ? `
            <button class="btn btn-sm btn-success" onclick="window.markDoseTaken('${log.id}', '${med.id}')">
              ✓ Taken
            </button>
            <button class="btn btn-sm btn-secondary" onclick="window.snoozeDose('${log.id}')" title="Snooze 10 mins">
              ⏰ Snooze
            </button>
            <button class="btn btn-sm btn-ghost text-danger" onclick="window.markDoseMissed('${log.id}', '${med.id}')" title="Skip dose">
              ✕ Skip
            </button>
            <button class="btn btn-sm btn-ghost" onclick="window.testReminderAlarm('${med.id}')" title="Simulate Alarm">
              🔔 Test
            </button>
          ` : `
            <button class="btn btn-sm btn-secondary" onclick="window.resetDose('${log.id}')">
              ↺ Undo
            </button>
          `}
        </div>
      </div>
    `;
  }).join('');
}

// Global actions exposed to window for inline onclick handlers
window.markDoseTaken = function(logId, medId) {
  const state = store.getState();
  const log = state.doseLogs.find(l => l.id === logId);
  if (!log) return;

  log.status = 'taken';
  log.takenAt = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  // Decrement stock
  const med = state.medicines.find(m => m.id === medId);
  if (med && med.stockRemaining > 0) {
    med.stockRemaining -= 1;

    // Check low stock
    if (med.stockRemaining <= med.refillThreshold) {
      state.alerts.unshift({
        id: 'alt-' + Date.now(),
        type: 'warning',
        title: `Low Medicine Stock: ${med.name}`,
        message: `${med.name} has only ${med.stockRemaining} doses left. Reorder recommended.`,
        time: 'Just now',
        resolved: false
      });
    }
  }

  playChimeSound('gentle');
  showToast(`✓ Marked ${med ? med.name : 'Dose'} as Taken!`, 'success');

  // Check if all taken today
  const allTaken = state.doseLogs.every(l => l.status === 'taken');
  if (allTaken) {
    state.adherenceStreakDays += 1;
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 }
    });
    showToast(`🎉 Outstanding! All doses taken for today. Streak increased to ${state.adherenceStreakDays} days!`, 'success', 5000);
  }

  store.saveState();
  renderSchedule();
  renderMedicinesList();
};

window.markDoseMissed = function(logId, medId) {
  const state = store.getState();
  const log = state.doseLogs.find(l => l.id === logId);
  const med = state.medicines.find(m => m.id === medId);
  if (!log) return;

  log.status = 'missed';

  // Add Caregiver Alert immediately!
  state.alerts.unshift({
    id: 'alt-' + Date.now(),
    type: 'critical',
    title: `Missed Dose: ${med ? med.name : 'Medicine'} at ${log.timeSlot}`,
    message: `Patient Eleanor Vance marked dose as missed at ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}. Caregiver action advised.`,
    time: 'Just now',
    resolved: false
  });

  store.saveState();
  showToast(`Dose recorded as Missed. Caregiver has been notified!`, 'warning');
  renderSchedule();
};

window.snoozeDose = function(logId) {
  showToast(`⏰ Dose snoozed for 10 minutes. Reminder will chime again.`, 'info');
};

window.resetDose = function(logId) {
  const state = store.getState();
  const log = state.doseLogs.find(l => l.id === logId);
  if (log) {
    log.status = 'pending';
    log.takenAt = null;
    store.saveState();
    renderSchedule();
    showToast(`Dose status reset to pending.`, 'info');
  }
};

window.testReminderAlarm = function(medId) {
  const state = store.getState();
  const med = state.medicines.find(m => m.id === medId);
  if (med) {
    triggerReminderModal(med, 'Now (Test)');
  }
};

/**
 * Render Full Medicines Manager List
 */
export function renderMedicinesList() {
  const container = document.getElementById('all-medicines-grid');
  if (!container) return;

  const state = store.getState();
  const medicines = state.medicines || [];

  if (medicines.length === 0) {
    container.innerHTML = `
      <div style="grid-column: 1/-1; text-align: center; padding: 36px 20px; background: var(--bg-card); border-radius: var(--radius-lg); border: 1px dashed var(--border-light); color: var(--text-muted);">
        <div style="font-size: 2.2rem; margin-bottom: 6px;">💊</div>
        <h4>No Medications Added Yet</h4>
        <p style="font-size: 0.85rem; margin-top: 4px;">Click "+ Add New Prescription" above or complete your onboarding to schedule your medicines.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = medicines.map(med => {
    return `
      <div class="card" style="border-top: 4px solid ${med.color};">
        <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:12px;">
          <div>
            <h4 style="font-size:1.15rem; margin-bottom:2px;">${med.name}</h4>
            <div style="font-size:0.85rem; color:var(--text-muted); font-weight:600;">
              ${med.dosage} • ${med.type.toUpperCase()}
            </div>
          </div>
          <span class="stock-indicator ${med.stockRemaining <= 5 ? 'critical' : (med.stockRemaining <= 10 ? 'low' : 'normal')}">
            ${med.stockRemaining} / ${med.stockTotal} left
          </span>
        </div>

        <div style="font-size:0.85rem; color:var(--text-muted); margin-bottom:12px; display:flex; flex-direction:column; gap:4px;">
          <div><strong>Frequency:</strong> ${med.scheduleTimes.join(', ')}</div>
          <div><strong>Instructions:</strong> ${med.instructions}</div>
          <div><strong>Purpose:</strong> ${med.purpose || 'Maintenance'}</div>
          <div><strong>Prescribed by:</strong> ${med.prescribedBy || 'General Physician'}</div>
        </div>

        <div style="display:flex; justify-content:space-between; align-items:center; border-top:1px solid var(--border-light); padding-top:12px; margin-top:8px;">
          <button class="btn btn-sm btn-secondary" onclick="window.testReminderAlarm('${med.id}')">
            🔔 Alarm Test
          </button>
          <div style="display:flex; gap:6px;">
            <button class="btn btn-sm btn-ghost text-danger" onclick="window.deleteMedicine('${med.id}')">
              Delete
            </button>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

window.deleteMedicine = function(medId) {
  if (!confirm('Are you sure you want to remove this medication from your schedule?')) return;
  const state = store.getState();
  state.medicines = state.medicines.filter(m => m.id !== medId);
  state.doseLogs = state.doseLogs.filter(l => l.medId !== medId);
  store.saveState();
  renderMedicinesList();
  renderSchedule();
  showToast('Medication removed.', 'info');
};

/**
 * Add Medicine Form Handler
 */
function setupAddMedicineForm() {
  const form = document.getElementById('add-med-form');
  if (!form) return;

  form.addEventListener('submit', (e) => {
    e.preventDefault();

    const name = document.getElementById('med-input-name').value.trim();
    const dosage = document.getElementById('med-input-dosage').value.trim();
    const type = document.getElementById('med-input-type').value;
    const time = document.getElementById('med-input-time').value;
    const instructions = document.getElementById('med-input-instructions').value.trim();
    const stock = parseInt(document.getElementById('med-input-stock').value, 10) || 30;
    const prescriber = document.getElementById('med-input-prescriber').value.trim();
    const purpose = document.getElementById('med-input-purpose').value.trim();
    const color = document.getElementById('med-input-color').value || '#0d9488';

    if (!name || !dosage || !time) {
      showToast('Please fill in Medicine name, dosage, and scheduled time.', 'warning');
      return;
    }

    const state = store.getState();
    const newMedId = 'med-' + Date.now();

    const newMed = {
      id: newMedId,
      name,
      dosage,
      type,
      color,
      frequency: 'daily',
      scheduleTimes: [time],
      instructions: instructions || 'Take with water as directed',
      purpose: purpose || 'General health maintenance',
      prescribedBy: prescriber || 'Attending Physician',
      stockRemaining: stock,
      stockTotal: stock,
      refillThreshold: 5,
      active: true
    };

    state.medicines.push(newMed);

    // Determine period
    const hour = parseInt(time.split(':')[0], 10);
    let period = 'morning';
    if (hour >= 12 && hour < 17) period = 'afternoon';
    else if (hour >= 17 && hour < 21) period = 'evening';
    else if (hour >= 21 || hour < 5) period = 'bedtime';

    // Add today's dose log
    state.doseLogs.push({
      id: 'log-' + Date.now(),
      medId: newMedId,
      medName: `${name} ${dosage}`,
      timeSlot: time,
      period,
      status: 'pending',
      takenAt: null,
      date: new Date().toISOString().split('T')[0]
    });

    store.saveState();
    renderSchedule();
    renderMedicinesList();

    // Close modal
    const modal = document.getElementById('add-medicine-modal');
    if (modal) modal.classList.remove('active');
    form.reset();

    showToast(`✓ Added ${name} to your schedule!`, 'success');
  });
}
