/* ==========================================================================
   MEDICINE REMINDER & HEALTH TRACKER - AUTHENTICATION & ONBOARDING (NEON DB)
   ========================================================================== */

import { store } from './store.js';
import { showToast, playChimeSound } from './reminders.js';
import { renderSchedule, renderMedicinesList } from './medicines.js';
import { renderVitalsCards, renderChart } from './vitals.js';
import { renderCaregiverHeader } from './caregiver.js';
import confetti from 'canvas-confetti';

let currentOnboardingStep = 1;
let onboardingData = {
  fullName: '',
  age: 71,
  gender: 'Female',
  heightCm: 164,
  weightKg: 68,
  conditions: [],
  allergies: [],
  emergencyContact: {
    name: '',
    relationship: '',
    phone: ''
  },
  initialMedicines: []
};

export function initAuthAndOnboarding() {
  setupAuthModal();
  setupOnboardingWizard();
  setupNeonConfigModal();
  checkNeonStatus();

  // User is guaranteed to be authenticated at this point
  // (login.html handles unauthenticated access)
  const state = store.getState();
  if (state.currentUser) {
    updateUserDisplay();
  }
}

/**
 * Neon Connection Status Checker
 */
export async function checkNeonStatus() {
  try {
    const res = await fetch('/api/config/neon/status');
    const data = await res.json();
    const badge = document.getElementById('neon-status-badge');
    const text = document.getElementById('neon-status-text');

    if (badge && text) {
      if (data.connected) {
        badge.style.background = 'var(--success-50)';
        badge.style.borderColor = 'rgba(16, 185, 129, 0.4)';
        badge.style.color = 'var(--success-700)';
        text.textContent = '🟢 Neon DB: Connected';
      } else {
        badge.style.background = 'var(--warning-50)';
        badge.style.borderColor = 'rgba(245, 158, 11, 0.4)';
        badge.style.color = 'var(--warning-700)';
        text.textContent = '⚡ Neon DB: Click to Connect';
      }
    }
  } catch (err) {
    console.warn('Could not check Neon status:', err);
  }
}

/**
 * Neon Config Modal Setup
 */
function setupNeonConfigModal() {
  const badge = document.getElementById('neon-status-badge');
  const modal = document.getElementById('neon-config-modal');
  const form = document.getElementById('neon-config-form');

  if (badge && modal) {
    badge.addEventListener('click', () => {
      modal.classList.add('active');
    });
  }

  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const connStr = document.getElementById('neon-conn-input').value.trim();
      const statusEl = document.getElementById('neon-modal-status');

      if (!connStr) {
        showToast('Please enter your Neon connection string or database URL.', 'warning');
        return;
      }

      statusEl.textContent = 'Testing connection to Neon PostgreSQL...';
      statusEl.style.color = 'var(--primary-600)';

      try {
        const res = await fetch('/api/config/neon', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ connectionString: connStr })
        });
        const result = await res.json();

        if (result.success) {
          statusEl.textContent = `✓ Connected to Neon DB (${result.dbName})! Tables initialized.`;
          statusEl.style.color = 'var(--success-600)';
          showToast('🎉 Connected to Neon PostgreSQL Database!', 'success');
          checkNeonStatus();
          setTimeout(() => {
            modal.classList.remove('active');
            statusEl.textContent = '';
          }, 1500);
        } else {
          statusEl.textContent = `Error: ${result.error || 'Connection failed'}`;
          statusEl.style.color = 'var(--danger-500)';
        }
      } catch (err) {
        statusEl.textContent = `Network error: ${err.message}`;
        statusEl.style.color = 'var(--danger-500)';
      }
    });
  }
}

/**
 * Auth Modal Setup (Login & Registration)
 */
function setupAuthModal() {
  const authModal = document.getElementById('auth-modal');
  const switchTabs = document.querySelectorAll('.auth-tab-btn');
  const loginForm = document.getElementById('login-form');
  const registerForm = document.getElementById('register-form');
  const loginView = document.getElementById('auth-login-view');
  const registerView = document.getElementById('auth-register-view');

  // Tab switching
  switchTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      switchTabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      const target = tab.getAttribute('data-auth');
      if (target === 'login') {
        loginView.classList.remove('hidden');
        registerView.classList.add('hidden');
      } else {
        loginView.classList.add('hidden');
        registerView.classList.remove('hidden');
      }
    });
  });

  // Open Auth modal button in navbar
  document.getElementById('btn-open-auth')?.addEventListener('click', () => {
    authModal.classList.add('active');
  });

  // Login handler
  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const username = document.getElementById('login-username').value.trim();
      const password = document.getElementById('login-password').value;

      try {
        const res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username, password })
        });
        const data = await res.json();

        if (data.success && data.user) {
          handleAuthSuccess(data.user);
          authModal.classList.remove('active');
          loginForm.reset();
        } else {
          showToast(data.error || 'Login failed. Check credentials.', 'danger');
        }
      } catch (err) {
        // Fallback demo check
        if (username.toLowerCase() === 'eleanor') {
          handleAuthSuccess({
            id: 'usr-demo',
            username: 'eleanor',
            fullName: 'Eleanor Vance',
            role: 'patient',
            onboardingCompleted: true
          });
          authModal.classList.remove('active');
        } else {
          showToast('Network error during login: ' + err.message, 'danger');
        }
      }
    });
  }

  // Quick Demo Login Button
  document.getElementById('btn-quick-login-eleanor')?.addEventListener('click', () => {
    handleAuthSuccess({
      id: 'usr-demo',
      username: 'eleanor',
      fullName: 'Eleanor Vance',
      role: 'patient',
      onboardingCompleted: true
    });
    authModal.classList.remove('active');
  });

  // Registration handler
  if (registerForm) {
    registerForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const fullName = document.getElementById('reg-fullname').value.trim();
      const username = document.getElementById('reg-username').value.trim();
      const password = document.getElementById('reg-password').value;

      if (!fullName || !username || !password) {
        showToast('Please fill in all registration fields.', 'warning');
        return;
      }

      try {
        const res = await fetch('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fullName, username, password })
        });
        const data = await res.json();

        if (data.success && data.user) {
          authModal.classList.remove('active');
          registerForm.reset();
          showToast(`Account created for ${fullName}! Let's personalize your care routine.`, 'success');
          // Start Onboarding Wizard popup immediately!
          startOnboardingWizard(data.user);
        } else {
          showToast(data.error || 'Registration failed.', 'danger');
        }
      } catch (err) {
        // Local fallback
        const mockUser = {
          id: 'usr-' + Date.now(),
          username,
          fullName,
          role: 'patient',
          onboardingCompleted: false
        };
        authModal.classList.remove('active');
        registerForm.reset();
        showToast(`Account created! Starting health onboarding.`, 'success');
        startOnboardingWizard(mockUser);
      }
    });
  }
}

/**
 * Handle successful authentication
 */
function handleAuthSuccess(user) {
  const state = store.getState();
  store.update({
    currentUser: user,
    patient: {
      ...state.patient,
      name: user.fullName || user.username,
      age: user.age || state.patient.age,
      conditions: user.conditions || state.patient.conditions,
      allergies: user.allergies || state.patient.allergies,
      emergencyContact: user.emergencyContact || state.patient.emergencyContact
    }
  });

  updateUserDisplay();
  showToast(`Welcome back, ${user.fullName || user.username}!`, 'success');

  if (!user.onboardingCompleted) {
    startOnboardingWizard(user);
  }
}

function updateUserDisplay() {
  const state = store.getState();
  const user = state.currentUser;
  const label = document.getElementById('user-role-label');
  const userButton = document.getElementById('user-profile-btn-text');
  const ribbonName = document.getElementById('ribbon-patient-name');
  const ribbonSubtext = document.getElementById('ribbon-patient-subtext');

  if (user) {
    if (label) label.textContent = `${user.fullName || user.username} (${state.activeRole === 'patient' ? 'Patient' : 'Caregiver'})`;
    if (userButton) userButton.textContent = user.fullName || user.username;
    if (ribbonName) ribbonName.textContent = `${user.fullName || user.username} • ${state.patient.age ? state.patient.age + ' Years Old' : 'Patient'} • Care Program`;
    if (ribbonSubtext) {
      const conds = state.patient.conditions && state.patient.conditions.length > 0 ? state.patient.conditions.join(', ') : 'Active Health Tracking';
      const cgName = state.patient.emergencyContact?.name || 'Linked';
      ribbonSubtext.innerHTML = `Conditions: <strong>${conds}</strong> • Caregiver: <strong>${cgName}</strong>`;
    }
  } else {
    if (label) label.textContent = 'Not Signed In';
    if (userButton) userButton.textContent = 'Sign In / Register';
    if (ribbonName) ribbonName.textContent = 'CareSync Health Portal';
    if (ribbonSubtext) ribbonSubtext.textContent = 'Sign in or create an account to start your personalized health routine';
  }

  // Refresh views
  renderSchedule();
  renderMedicinesList();
  renderVitalsCards();
  renderCaregiverHeader();
}

/**
 * Start Onboarding Wizard Popup
 */
export function startOnboardingWizard(user = null) {
  const state = store.getState();
  const activeUser = user || state.currentUser || { id: 'usr-1', fullName: 'Patient' };

  onboardingData.fullName = activeUser.fullName;
  onboardingData.userId = activeUser.id;
  currentOnboardingStep = 1;

  document.getElementById('onboarding-user-name').textContent = activeUser.fullName;
  document.getElementById('ob-name-input').value = activeUser.fullName;

  updateOnboardingStepView();
  const modal = document.getElementById('onboarding-wizard-modal');
  if (modal) modal.classList.add('active');
}

/**
 * Setup Onboarding Wizard Controls
 */
function setupOnboardingWizard() {
  const nextBtn = document.getElementById('ob-btn-next');
  const prevBtn = document.getElementById('ob-btn-prev');

  // Condition chip selection
  document.querySelectorAll('.ob-condition-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      chip.classList.toggle('active');
      const val = chip.getAttribute('data-condition');
      if (chip.classList.contains('active')) {
        if (!onboardingData.conditions.includes(val)) onboardingData.conditions.push(val);
      } else {
        onboardingData.conditions = onboardingData.conditions.filter(c => c !== val);
      }
    });
  });

  // Allergy chip selection
  document.querySelectorAll('.ob-allergy-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      chip.classList.toggle('active');
      const val = chip.getAttribute('data-allergy');
      if (chip.classList.contains('active')) {
        if (!onboardingData.allergies.includes(val)) onboardingData.allergies.push(val);
      } else {
        onboardingData.allergies = onboardingData.allergies.filter(a => a !== val);
      }
    });
  });

  // Height / Weight BMI calculation preview
  const heightInput = document.getElementById('ob-height-input');
  const weightInput = document.getElementById('ob-weight-input');
  function calcBmi() {
    const h = parseFloat(heightInput.value) / 100;
    const w = parseFloat(weightInput.value);
    const bmiEl = document.getElementById('ob-bmi-display');
    if (h > 0 && w > 0 && bmiEl) {
      const bmi = (w / (h * h)).toFixed(1);
      let cat = 'Normal Weight';
      if (bmi < 18.5) cat = 'Underweight';
      else if (bmi >= 25 && bmi < 30) cat = 'Overweight';
      else if (bmi >= 30) cat = 'Obese Range';
      bmiEl.textContent = `BMI: ${bmi} (${cat})`;
    }
  }
  if (heightInput && weightInput) {
    heightInput.addEventListener('input', calcBmi);
    weightInput.addEventListener('input', calcBmi);
  }

  // Next / Submit button
  if (nextBtn) {
    nextBtn.addEventListener('click', async () => {
      if (currentOnboardingStep === 1) {
        // Save biometrics
        onboardingData.fullName = document.getElementById('ob-name-input').value.trim() || onboardingData.fullName;
        onboardingData.age = parseInt(document.getElementById('ob-age-input').value, 10) || 71;
        onboardingData.gender = document.getElementById('ob-gender-select').value;
        onboardingData.heightCm = parseFloat(document.getElementById('ob-height-input').value) || 164;
        onboardingData.weightKg = parseFloat(document.getElementById('ob-weight-input').value) || 68;

        currentOnboardingStep = 2;
        updateOnboardingStepView();
      } else if (currentOnboardingStep === 2) {
        // Conditions & Allergies
        const customCond = document.getElementById('ob-custom-condition').value.trim();
        if (customCond && !onboardingData.conditions.includes(customCond)) {
          onboardingData.conditions.push(customCond);
        }

        const customAllergy = document.getElementById('ob-custom-allergy').value.trim();
        if (customAllergy && !onboardingData.allergies.includes(customAllergy)) {
          onboardingData.allergies.push(customAllergy);
        }

        currentOnboardingStep = 3;
        updateOnboardingStepView();
      } else if (currentOnboardingStep === 3) {
        // Collect medications
        const medName1 = document.getElementById('ob-med1-name').value.trim();
        const medDose1 = document.getElementById('ob-med1-dosage').value.trim();
        const medTime1 = document.getElementById('ob-med1-time').value;

        const medName2 = document.getElementById('ob-med2-name').value.trim();
        const medDose2 = document.getElementById('ob-med2-dosage').value.trim();
        const medTime2 = document.getElementById('ob-med2-time').value;

        onboardingData.initialMedicines = [];
        if (medName1) {
          onboardingData.initialMedicines.push({
            name: medName1,
            dosage: medDose1 || '1 tablet',
            scheduleTimes: [medTime1 || '08:00'],
            instructions: 'Take with water after food',
            type: 'tablet',
            color: '#0d9488',
            stock: 30
          });
        }
        if (medName2) {
          onboardingData.initialMedicines.push({
            name: medName2,
            dosage: medDose2 || '1 capsule',
            scheduleTimes: [medTime2 || '20:00'],
            instructions: 'Take as directed',
            type: 'capsule',
            color: '#6366f1',
            stock: 30
          });
        }

        currentOnboardingStep = 4;
        updateOnboardingStepView();
      } else if (currentOnboardingStep === 4) {
        // Caregiver link & Finish
        onboardingData.emergencyContact = {
          name: document.getElementById('ob-cg-name').value.trim() || 'Sarah Vance',
          relationship: document.getElementById('ob-cg-rel').value.trim() || 'Family Caregiver',
          phone: document.getElementById('ob-cg-phone').value.trim() || '+1 (555) 382-9910'
        };

        // Submit to API
        await completeOnboarding();
      }
    });
  }

  if (prevBtn) {
    prevBtn.addEventListener('click', () => {
      if (currentOnboardingStep > 1) {
        currentOnboardingStep -= 1;
        updateOnboardingStepView();
      }
    });
  }
}

function updateOnboardingStepView() {
  document.querySelectorAll('.ob-step-section').forEach(sec => {
    sec.classList.add('hidden');
    if (sec.id === `ob-step-${currentOnboardingStep}`) {
      sec.classList.remove('hidden');
    }
  });

  const nextBtn = document.getElementById('ob-btn-next');
  const prevBtn = document.getElementById('ob-btn-prev');
  const stepIndicator = document.getElementById('ob-step-indicator');

  if (stepIndicator) {
    stepIndicator.textContent = `Step ${currentOnboardingStep} of 4`;
  }

  if (prevBtn) {
    if (currentOnboardingStep === 1) prevBtn.classList.add('hidden');
    else prevBtn.classList.remove('hidden');
  }

  if (nextBtn) {
    if (currentOnboardingStep === 4) {
      nextBtn.textContent = '🎉 Complete & Personalize My App';
      nextBtn.className = 'btn btn-success';
    } else {
      nextBtn.textContent = 'Next Step →';
      nextBtn.className = 'btn btn-primary';
    }
  }
}

async function completeOnboarding() {
  const modal = document.getElementById('onboarding-wizard-modal');
  const state = store.getState();

  try {
    await fetch('/api/onboarding', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: state.currentUser ? state.currentUser.id : 'usr-1',
        ...onboardingData
      })
    });
  } catch (err) {
    console.warn('Backend sync failed, storing locally:', err);
  }

  // Update central reactive store with personalized user data!
  const initials = onboardingData.fullName
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase() || 'PT';

  const updatedPatient = {
    ...state.patient,
    name: onboardingData.fullName,
    age: onboardingData.age,
    gender: onboardingData.gender,
    avatarInitials: initials,
    conditions: onboardingData.conditions.length > 0 ? onboardingData.conditions : state.patient.conditions,
    allergies: onboardingData.allergies.length > 0 ? onboardingData.allergies : ['None known'],
    emergencyContact: onboardingData.emergencyContact
  };

  // Replace or augment medicines if user entered their own
  let updatedMedicines = state.medicines;
  let updatedDoseLogs = state.doseLogs;

  if (onboardingData.initialMedicines.length > 0) {
    updatedMedicines = onboardingData.initialMedicines.map((m, idx) => ({
      id: 'med-user-' + idx,
      name: m.name,
      dosage: m.dosage,
      type: m.type,
      color: m.color,
      frequency: 'daily',
      scheduleTimes: m.scheduleTimes,
      instructions: m.instructions,
      purpose: 'Prescribed Regimen',
      prescribedBy: 'Attending Physician',
      stockRemaining: m.stock,
      stockTotal: m.stock,
      refillThreshold: 5,
      active: true
    }));

    updatedDoseLogs = [];
    updatedMedicines.forEach(m => {
      m.scheduleTimes.forEach(time => {
        const hour = parseInt(time.split(':')[0], 10);
        let period = 'morning';
        if (hour >= 12 && hour < 17) period = 'afternoon';
        else if (hour >= 17 && hour < 21) period = 'evening';
        else if (hour >= 21 || hour < 5) period = 'bedtime';

        updatedDoseLogs.push({
          id: 'log-' + Math.random(),
          medId: m.id,
          medName: `${m.name} ${m.dosage}`,
          timeSlot: time,
          period,
          status: 'pending',
          takenAt: null,
          date: new Date().toISOString().split('T')[0]
        });
      });
    });
  }

  // Save personalized state
  store.update({
    patient: updatedPatient,
    medicines: updatedMedicines,
    doseLogs: updatedDoseLogs,
    currentUser: {
      ...state.currentUser,
      fullName: onboardingData.fullName,
      onboardingCompleted: true
    }
  });

  if (modal) modal.classList.remove('active');

  playChimeSound('gentle');
  confetti({
    particleCount: 120,
    spread: 80,
    origin: { y: 0.5 }
  });

  updateUserDisplay();
  renderSchedule();
  renderMedicinesList();
  renderVitalsCards();
  renderChart('bp');
  renderCaregiverHeader();

  showToast(`🎉 Setup Complete! Welcome to your personalized CareSync, ${onboardingData.fullName}!`, 'success', 6000);
}

window.openOnboardingWizard = function() {
  startOnboardingWizard();
};

window.openAuthModal = function(defaultTab = 'login') {
  const modal = document.getElementById('auth-modal');
  if (!modal) return;

  const loginTab = document.querySelector('.auth-tab-btn[data-auth="login"]');
  const regTab = document.querySelector('.auth-tab-btn[data-auth="register"]');
  const loginView = document.getElementById('auth-login-view');
  const registerView = document.getElementById('auth-register-view');

  if (defaultTab === 'register') {
    loginTab?.classList.remove('active');
    regTab?.classList.add('active');
    loginView?.classList.add('hidden');
    registerView?.classList.remove('hidden');
  } else {
    regTab?.classList.remove('active');
    loginTab?.classList.add('active');
    registerView?.classList.add('hidden');
    loginView?.classList.remove('hidden');
  }

  modal.classList.add('active');
};

window.signOut = function() {
  store.update({
    currentUser: null,
    patient: {
      id: null,
      name: 'New Patient',
      age: null,
      gender: 'Unspecified',
      avatarInitials: '👤',
      conditions: [],
      allergies: [],
      emergencyContact: { name: '', relationship: '', phone: '' }
    },
    medicines: [],
    doseLogs: [],
    vitals: { bloodPressure: [], bloodSugar: [], weight: [], temperature: [], symptoms: [] },
    alerts: [],
    appointments: [],
    documents: [],
    adherenceStreakDays: 0
  });

  // Redirect to login page
  window.location.href = '/login.html';
};


