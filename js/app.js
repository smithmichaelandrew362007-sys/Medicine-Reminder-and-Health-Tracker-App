/* ==========================================================================
   MEDICINE REMINDER & HEALTH TRACKER - MAIN APPLICATION CONTROLLER
   ========================================================================== */

import { store } from './store.js';
import { initClockScheduler, requestNotificationPermission, playChimeSound, showToast } from './reminders.js';
import { initMedicinesView, renderSchedule, renderMedicinesList } from './medicines.js';
import { initVitalsView, renderVitalsCards, renderChart } from './vitals.js';
import { initCaregiverView, renderCaregiverHeader, renderAlertsFeed, renderPatientActivityFeed } from './caregiver.js';
import { initAppointmentsView, renderAppointments } from './appointments.js';
import { initPrescriptionsView, renderDocuments } from './prescriptions.js';
import { initPharmacyView, renderInventoryStatus, renderRefillOrders, renderNearbyPharmacies } from './pharmacy.js';
import { initAIInsightsView, renderAIInsights } from './ai-insights.js';
import { initAuthAndOnboarding } from './auth.js';

let currentTab = 'schedule';

document.addEventListener('DOMContentLoaded', () => {
  initApp();
});

function initApp() {
  // ── Auth Gate: Redirect unauthenticated users to login page ──
  const state = store.getState();
  if (!state.currentUser || !state.currentUser.id) {
    window.location.href = '/login.html';
    return;
  }

  applyStoredTheme();
  setupNavigation();
  setupRoleSwitcher();
  setupThemeToggle();
  setupSoundToggle();
  setupSimulatorToggle();
  setupModalDismissals();
  setupResetDemoData();

  // Initialize feature modules
  initClockScheduler();
  initMedicinesView();
  initVitalsView();
  initCaregiverView();
  initAppointmentsView();
  initPrescriptionsView();
  initPharmacyView();
  initAIInsightsView();
  initAuthAndOnboarding();

  // Check if user arrived from registration with onboarding flag
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get('onboarding') === 'true' && !state.currentUser.onboardingCompleted) {
    setTimeout(() => {
      window.openOnboardingWizard?.();
    }, 600);
  }

  // If user arrived as caregiver, switch to caregiver tab
  if (urlParams.get('role') === 'caregiver' || state.activeRole === 'caregiver') {
    setTimeout(() => {
      document.querySelector('[data-tab="caregiver"]')?.click();
    }, 300);
  }

  // Subscribe to store updates to keep UI synchronized
  store.subscribe((updatedState) => {
    updateBadges(updatedState);
    if (updatedState.theme !== document.documentElement.getAttribute('data-theme')) {
      document.documentElement.setAttribute('data-theme', updatedState.theme);
    }
  });

  updateBadges(store.getState());
  showToast(`Welcome back, ${state.currentUser.fullName || state.currentUser.username}!`, 'info', 4000);
}

/**
 * Tab Navigation
 */
function setupNavigation() {
  const navButtons = document.querySelectorAll('.sidebar-nav .nav-item');
  const viewSections = document.querySelectorAll('.view-section');

  navButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const targetTab = btn.getAttribute('data-tab');
      if (!targetTab) return;

      navButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      viewSections.forEach(section => {
        section.classList.add('hidden');
        if (section.id === `view-${targetTab}`) {
          section.classList.remove('hidden');
        }
      });

      currentTab = targetTab;

      // Trigger re-renders for active tab
      if (targetTab === 'schedule') {
        renderSchedule();
        renderMedicinesList();
      } else if (targetTab === 'vitals') {
        renderVitalsCards();
        renderChart('bp');
      } else if (targetTab === 'caregiver') {
        renderCaregiverHeader();
        renderAlertsFeed();
        renderPatientActivityFeed();
      } else if (targetTab === 'appointments') {
        renderAppointments();
      } else if (targetTab === 'vault') {
        renderDocuments();
      } else if (targetTab === 'pharmacy') {
        renderInventoryStatus();
        renderRefillOrders();
        renderNearbyPharmacies();
      } else if (targetTab === 'insights') {
        renderAIInsights();
      }
    });
  });
}

/**
 * Role Switcher (Patient Mode vs Caregiver Mode)
 */
function setupRoleSwitcher() {
  const patientBtn = document.getElementById('role-btn-patient');
  const caregiverBtn = document.getElementById('role-btn-caregiver');
  const roleIndicator = document.getElementById('user-role-label');

  if (patientBtn && caregiverBtn) {
    patientBtn.addEventListener('click', () => {
      patientBtn.classList.add('active');
      caregiverBtn.classList.remove('active');
      store.update({ activeRole: 'patient' });
      if (roleIndicator) roleIndicator.textContent = 'Eleanor Vance (Patient)';
      showToast('Switched to Patient View (Eleanor Vance)', 'info');
      // Navigate to schedule tab
      document.querySelector('[data-tab="schedule"]')?.click();
    });

    caregiverBtn.addEventListener('click', () => {
      caregiverBtn.classList.add('active');
      patientBtn.classList.remove('active');
      store.update({ activeRole: 'caregiver' });
      if (roleIndicator) roleIndicator.textContent = 'Sarah Vance (Caregiver)';
      showToast('Switched to Caregiver View (Sarah Vance)', 'info');
      // Navigate to caregiver tab
      document.querySelector('[data-tab="caregiver"]')?.click();
    });
  }
}

/**
 * Theme Toggle (Light / Dark)
 */
function setupThemeToggle() {
  const toggleBtn = document.getElementById('btn-toggle-theme');
  if (toggleBtn) {
    toggleBtn.addEventListener('click', () => {
      const current = document.documentElement.getAttribute('data-theme') || 'light';
      const next = current === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', next);
      toggleBtn.innerHTML = next === 'dark' ? '☀️' : '🌙';
      store.update({ theme: next });
      // Redraw charts with adapted grid colors
      if (currentTab === 'vitals') {
        renderChart('bp');
      }
    });
  }
}

function applyStoredTheme() {
  const state = store.getState();
  const theme = state.theme || 'light';
  document.documentElement.setAttribute('data-theme', theme);
  const toggleBtn = document.getElementById('btn-toggle-theme');
  if (toggleBtn) {
    toggleBtn.innerHTML = theme === 'dark' ? '☀️' : '🌙';
  }
}

/**
 * Audio Chime Sound Toggle
 */
function setupSoundToggle() {
  const soundBtn = document.getElementById('btn-toggle-sound');
  if (soundBtn) {
    soundBtn.addEventListener('click', () => {
      const state = store.getState();
      const next = !state.soundEnabled;
      store.update({ soundEnabled: next });
      soundBtn.innerHTML = next ? '🔊' : '🔇';
      showToast(next ? 'Sound alarms enabled' : 'Sound alarms muted', 'info');
      if (next) playChimeSound('gentle');
    });
  }
}

/**
 * Mobile Simulator Toggle
 */
function setupSimulatorToggle() {
  const simBtn = document.getElementById('btn-toggle-simulator');
  const simWrapper = document.getElementById('simulator-wrapper');

  if (simBtn && simWrapper) {
    simBtn.addEventListener('click', () => {
      const isMobile = simWrapper.classList.toggle('mobile-mode');
      simBtn.classList.toggle('active', isMobile);
      simBtn.title = isMobile ? 'Switch to Full Desktop View' : 'Preview Mobile Phone Frame';
      showToast(isMobile ? '📱 Mobile Phone Preview Mode' : '🖥️ Responsive Desktop Mode', 'info');
    });
  }
}

/**
 * Modal Backdrop & Close button handling
 */
function setupModalDismissals() {
  document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        overlay.classList.remove('active');
      }
    });

    const closeBtns = overlay.querySelectorAll('.modal-close, [data-dismiss="modal"]');
    closeBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        overlay.classList.remove('active');
      });
    });
  });
}

/**
 * Update Sidebar Notification Badges
 */
function updateBadges(state) {
  const alertsBadge = document.getElementById('caregiver-badge-count');
  const unresolvedAlerts = (state.alerts || []).filter(a => !a.resolved);
  if (alertsBadge) {
    if (unresolvedAlerts.length > 0) {
      alertsBadge.textContent = unresolvedAlerts.length;
      alertsBadge.classList.remove('hidden');
    } else {
      alertsBadge.classList.add('hidden');
    }
  }

  const doseBadge = document.getElementById('due-doses-badge');
  const pendingDoses = (state.doseLogs || []).filter(l => l.status === 'pending');
  if (doseBadge) {
    if (pendingDoses.length > 0) {
      doseBadge.textContent = pendingDoses.length;
      doseBadge.classList.remove('hidden');
    } else {
      doseBadge.classList.add('hidden');
    }
  }
}

/**
 * Reset Demo Data Button
 */
function setupResetDemoData() {
  const resetBtn = document.getElementById('btn-reset-demo-data');
  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      if (confirm('Reset all demo data back to default values?')) {
        store.resetToDefault();
        location.reload();
      }
    });
  }

  // Quick Open Modal buttons
  document.getElementById('btn-open-add-med')?.addEventListener('click', () => {
    document.getElementById('add-medicine-modal')?.classList.add('active');
  });

  document.getElementById('btn-open-log-vital')?.addEventListener('click', () => {
    document.getElementById('log-vital-modal')?.classList.add('active');
  });

  document.getElementById('btn-open-add-appointment')?.addEventListener('click', () => {
    document.getElementById('add-appointment-modal')?.classList.add('active');
  });

  document.getElementById('btn-open-upload-doc')?.addEventListener('click', () => {
    document.getElementById('upload-document-modal')?.classList.add('active');
  });

  document.getElementById('btn-request-notifications')?.addEventListener('click', () => {
    requestNotificationPermission();
  });
}
