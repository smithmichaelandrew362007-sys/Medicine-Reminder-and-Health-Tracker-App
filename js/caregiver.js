/* ==========================================================================
   MEDICINE REMINDER & HEALTH TRACKER - CAREGIVER MONITORING PORTAL
   ========================================================================== */

import { store } from './store.js';
import { playChimeSound, showToast } from './reminders.js';

export function initCaregiverView() {
  renderCaregiverHeader();
  renderAlertsFeed();
  renderPatientActivityFeed();
  setupCaregiverActions();
}

export function renderCaregiverHeader() {
  const state = store.getState();
  const patient = state.patient;
  const caregiver = state.caregiver;

  const headerEl = document.getElementById('caregiver-patient-summary');
  if (!headerEl) return;

  const logs = state.doseLogs || [];
  const taken = logs.filter(l => l.status === 'taken').length;
  const total = logs.length;
  const adherence = total > 0 ? Math.round((taken / total) * 100) : 0;

  headerEl.innerHTML = `
    <div class="patient-profile-snippet">
      <div class="patient-avatar">
        ${patient.avatarInitials}
      </div>
      <div>
        <div style="display:flex; align-items:center; gap:8px;">
          <h3 style="font-size:1.35rem;">${patient.name}</h3>
          <span style="font-size:0.8rem; background:var(--primary-50); color:var(--primary-700); padding:2px 8px; border-radius:var(--radius-pill); font-weight:700;">
            Age ${patient.age} • ${patient.gender}
          </span>
        </div>
        <div style="font-size:0.85rem; color:var(--text-muted); margin-top:2px;">
          Conditions: <strong>${patient.conditions.join(', ')}</strong> | Allergies: <strong class="text-danger">${patient.allergies.join(', ')}</strong>
        </div>
        <div style="font-size:0.82rem; color:var(--text-muted); margin-top:4px;">
          Caregiver: <strong>${caregiver.name}</strong> (${caregiver.role}) • Linked Phone: <strong>${caregiver.phone}</strong>
        </div>
      </div>
    </div>

    <div style="text-align:right;">
      <div style="font-size:0.8rem; color:var(--text-muted); font-weight:600; text-transform:uppercase;">Today's Adherence</div>
      <div style="font-size:2rem; font-weight:800; color:${adherence >= 80 ? 'var(--success-500)' : (adherence >= 50 ? 'var(--warning-500)' : 'var(--danger-500)')};">
        ${adherence}%
      </div>
      <div style="font-size:0.75rem; color:var(--text-muted);">${taken} of ${total} doses verified</div>
    </div>
  `;
}

export function renderAlertsFeed() {
  const state = store.getState();
  const container = document.getElementById('caregiver-alerts-list');
  if (!container) return;

  const alerts = state.alerts || [];

  if (alerts.length === 0) {
    container.innerHTML = `
      <div style="text-align:center; padding: 28px; color: var(--text-muted);">
        <div style="font-size: 2.2rem; margin-bottom: 6px;">🛡️</div>
        <h4>All Clear! No Active Alerts</h4>
        <p style="font-size: 0.85rem;">Eleanor is right on track with all medication and health vitals.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = alerts.map(alert => {
    let icon = '🔔';
    let typeClass = '';
    if (alert.type === 'critical') {
      icon = '🚨';
      typeClass = 'critical';
    } else if (alert.type === 'warning') {
      icon = '⚠️';
      typeClass = 'warning';
    } else {
      icon = 'ℹ️';
    }

    return `
      <div class="alert-item ${typeClass}" id="alert-${alert.id}">
        <div class="alert-icon">${icon}</div>
        <div class="alert-content">
          <div class="alert-title">
            <span>${alert.title}</span>
            <span class="alert-time">${alert.time}</span>
          </div>
          <div class="alert-desc">${alert.message}</div>
          <div style="display:flex; gap:8px; margin-top:8px;">
            ${!alert.resolved ? `
              <button class="btn btn-sm btn-secondary" onclick="window.resolveAlert('${alert.id}')">
                ✓ Mark Acknowledged
              </button>
            ` : `
              <span style="font-size:0.75rem; color:var(--success-600); font-weight:700;">✓ Acknowledged</span>
            `}
            <button class="btn btn-sm btn-ghost" onclick="window.openCallPatientModal()">
              📞 Call Eleanor
            </button>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

export function renderPatientActivityFeed() {
  const state = store.getState();
  const container = document.getElementById('caregiver-activity-stream');
  if (!container) return;

  const logs = state.doseLogs || [];
  const latestBP = state.vitals.bloodPressure[state.vitals.bloodPressure.length - 1];

  let items = logs.map(l => ({
    time: l.takenAt || l.timeSlot,
    title: `${l.medName} (${l.period.toUpperCase()})`,
    desc: l.status === 'taken' ? `Taken at ${l.takenAt}` : (l.status === 'missed' ? 'Missed dose!' : 'Scheduled for today'),
    status: l.status
  }));

  if (latestBP) {
    items.push({
      time: latestBP.time || 'Today',
      title: 'Blood Pressure Recorded',
      desc: `${latestBP.systolic}/${latestBP.diastolic} mmHg (Pulse: ${latestBP.pulse} bpm)`,
      status: latestBP.systolic >= 140 ? 'missed' : 'taken'
    });
  }

  container.innerHTML = items.map(item => `
    <div style="display:flex; align-items:flex-start; gap:12px; padding:10px 0; border-bottom:1px solid var(--border-light);">
      <div style="width:8px; height:8px; border-radius:50%; margin-top:7px; background:${item.status === 'taken' ? 'var(--success-500)' : (item.status === 'missed' ? 'var(--danger-500)' : 'var(--warning-500)')};"></div>
      <div style="flex:1;">
        <div style="font-weight:700; font-size:0.9rem;">${item.title}</div>
        <div style="font-size:0.8rem; color:var(--text-muted);">${item.desc}</div>
      </div>
      <div style="font-size:0.75rem; color:var(--text-muted);">${item.time}</div>
    </div>
  `).join('');
}

window.resolveAlert = function(alertId) {
  const state = store.getState();
  const alert = state.alerts.find(a => a.id === alertId);
  if (alert) {
    alert.resolved = true;
    store.saveState();
    renderAlertsFeed();
    showToast('Alert marked as resolved.', 'info');
  }
};

window.openCallPatientModal = function() {
  const state = store.getState();
  const p = state.patient;
  alert(`📞 Simulated Call Connected:\n\nCalling Eleanor Vance at +1 (555) 382-9910\n"Hello Sarah! I'm doing well, just getting ready for afternoon tea."`);
};

function setupCaregiverActions() {
  const emergencyBtn = document.getElementById('btn-emergency-sos');
  if (emergencyBtn) {
    emergencyBtn.onclick = () => {
      playChimeSound('urgent');
      const state = store.getState();
      state.alerts.unshift({
        id: 'alt-' + Date.now(),
        type: 'critical',
        title: '🚨 EMERGENCY SOS INITIATED',
        message: 'Caregiver triggered emergency escalation protocol. Notifying Dr. Robert Hastings and Emergency dispatch.',
        time: 'Just now',
        resolved: false
      });
      store.saveState();
      renderAlertsFeed();
      showToast('🚨 EMERGENCY PROTOCOL TRIGGERED: Notifying local EMS & emergency contacts!', 'danger', 8000);
    };
  }

  const sendSmsBtn = document.getElementById('btn-send-reminder-sms');
  if (sendSmsBtn) {
    sendSmsBtn.onclick = () => {
      const msg = prompt('Enter reminder message to send to Eleanor:', 'Hi Mom, remember to drink a glass of water and take your afternoon Vitamin D3!');
      if (msg) {
        showToast(`📲 SMS sent to Eleanor Vance: "${msg}"`, 'success');
      }
    };
  }
}
