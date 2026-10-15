/* ==========================================================================
   MEDICINE REMINDER & HEALTH TRACKER - DOCTOR APPOINTMENTS
   ========================================================================== */

import { store } from './store.js';
import { showToast } from './reminders.js';

export function initAppointmentsView() {
  renderAppointments();
  setupAddAppointmentForm();
}

export function renderAppointments() {
  const container = document.getElementById('appointments-grid');
  if (!container) return;

  const state = store.getState();
  const appointments = state.appointments || [];

  if (appointments.length === 0) {
    container.innerHTML = `
      <div style="text-align:center; padding:40px; color:var(--text-muted); grid-column:1/-1;">
        <div style="font-size:2.5rem; margin-bottom:8px;">🩺</div>
        <h4>No upcoming doctor visits</h4>
        <p style="font-size:0.9rem;">Keep track of your clinical checkups by booking an appointment.</p>
      </div>
    `;
    return;
  }

  const now = new Date();

  container.innerHTML = appointments.map(apt => {
    const aptDate = new Date(`${apt.date}T${apt.time.includes('AM') || apt.time.includes('PM') ? convertTo24Hour(apt.time) : apt.time}`);
    const diffTime = aptDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    let countdownText = `${diffDays} days away`;
    if (diffDays === 0) countdownText = 'Today!';
    else if (diffDays === 1) countdownText = 'Tomorrow';
    else if (diffDays < 0) countdownText = 'Past consultation';

    return `
      <div class="appointment-card">
        <div style="display:flex; justify-content:space-between; align-items:flex-start;">
          <div>
            <h4 style="font-size:1.15rem; margin-bottom:2px;">${apt.doctorName}</h4>
            <span style="font-size:0.85rem; color:var(--primary-600); font-weight:700;">
              ${apt.specialty}
            </span>
          </div>
          <span class="app-badge-countdown">
            ⏳ ${countdownText}
          </span>
        </div>

        <div style="font-size:0.85rem; color:var(--text-muted); display:flex; flex-direction:column; gap:6px;">
          <div>🏥 <strong>Clinic:</strong> ${apt.clinic}</div>
          <div>📅 <strong>Date:</strong> ${apt.date} at ${apt.time}</div>
          <div>📋 <strong>Consultation Type:</strong> ${apt.type || 'Regular Checkup'}</div>
          ${apt.notes ? `<div>📝 <strong>Prep Notes:</strong> ${apt.notes}</div>` : ''}
          ${apt.phone ? `<div>📞 <strong>Contact:</strong> ${apt.phone}</div>` : ''}
        </div>

        <div style="display:flex; justify-content:space-between; align-items:center; border-top:1px solid var(--border-light); padding-top:12px; margin-top:6px;">
          <button class="btn btn-sm btn-secondary" onclick="window.setCalendarReminder('${apt.id}')">
            🔔 Remind Me
          </button>
          <button class="btn btn-sm btn-ghost text-danger" onclick="window.deleteAppointment('${apt.id}')">
            Remove
          </button>
        </div>
      </div>
    `;
  }).join('');
}

function convertTo24Hour(timeStr) {
  try {
    const [time, modifier] = timeStr.split(' ');
    let [hours, minutes] = time.split(':');
    if (hours === '12') hours = '00';
    if (modifier === 'PM') hours = parseInt(hours, 10) + 12;
    return `${hours}:${minutes}:00`;
  } catch (e) {
    return '10:00:00';
  }
}

window.deleteAppointment = function(id) {
  if (!confirm('Are you sure you want to remove this appointment?')) return;
  const state = store.getState();
  state.appointments = state.appointments.filter(a => a.id !== id);
  store.saveState();
  renderAppointments();
  showToast('Appointment removed.', 'info');
};

window.setCalendarReminder = function(id) {
  const state = store.getState();
  const apt = state.appointments.find(a => a.id === id);
  if (apt) {
    showToast(`🔔 Reminder active for ${apt.doctorName} on ${apt.date} at ${apt.time}!`, 'success');
  }
};

function setupAddAppointmentForm() {
  const form = document.getElementById('add-appointment-form');
  if (!form) return;

  form.addEventListener('submit', (e) => {
    e.preventDefault();

    const doctorName = document.getElementById('apt-input-doctor').value.trim();
    const specialty = document.getElementById('apt-input-specialty').value.trim();
    const clinic = document.getElementById('apt-input-clinic').value.trim();
    const date = document.getElementById('apt-input-date').value;
    const time = document.getElementById('apt-input-time').value;
    const type = document.getElementById('apt-input-type').value;
    const notes = document.getElementById('apt-input-notes').value.trim();
    const phone = document.getElementById('apt-input-phone').value.trim();

    if (!doctorName || !date || !time) {
      showToast('Please fill in Doctor Name, Date, and Time.', 'warning');
      return;
    }

    const state = store.getState();
    state.appointments.push({
      id: 'apt-' + Date.now(),
      doctorName,
      specialty: specialty || 'Specialist',
      clinic: clinic || 'Health Clinic',
      date,
      time,
      type: type || 'Consultation',
      notes: notes || 'Routine checkup',
      phone: phone || '+1 (555) 000-0000'
    });

    store.saveState();
    renderAppointments();

    const modal = document.getElementById('add-appointment-modal');
    if (modal) modal.classList.remove('active');
    form.reset();

    showToast(`✓ Booked appointment with ${doctorName}!`, 'success');
  });
}
