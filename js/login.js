/* ==========================================================================
   CARESYNC - LOGIN PAGE LOGIC
   Handles authentication, registration, demo login, and Neon DB status
   ========================================================================== */

const API_BASE = '';

// ─── DOM References ───
const tabLogin = document.getElementById('tab-login');
const tabRegister = document.getElementById('tab-register');
const viewLogin = document.getElementById('view-login');
const viewRegister = document.getElementById('view-register');

const formLogin = document.getElementById('form-login');
const formRegister = document.getElementById('form-register');

const loginMsg = document.getElementById('login-msg');
const registerMsg = document.getElementById('register-msg');

const loginSubmitBtn = document.getElementById('login-submit-btn');
const registerSubmitBtn = document.getElementById('register-submit-btn');

// ─── Tab Switching ───
function switchTab(target) {
  const tabs = [tabLogin, tabRegister];
  const views = [viewLogin, viewRegister];

  tabs.forEach(t => t.classList.remove('active'));
  views.forEach(v => v.classList.remove('active'));

  if (target === 'register') {
    tabRegister.classList.add('active');
    viewRegister.classList.add('active');
  } else {
    tabLogin.classList.add('active');
    viewLogin.classList.add('active');
  }

  // Clear messages
  hideMessage(loginMsg);
  hideMessage(registerMsg);
}

tabLogin.addEventListener('click', () => switchTab('login'));
tabRegister.addEventListener('click', () => switchTab('register'));
document.getElementById('switch-to-register')?.addEventListener('click', () => switchTab('register'));
document.getElementById('switch-to-login')?.addEventListener('click', () => switchTab('login'));

// ─── Message Helpers ───
function showMessage(el, text, type = 'error') {
  if (!el) return;
  el.className = `login-message visible login-message--${type}`;
  el.innerHTML = `<span>${type === 'error' ? '⚠️' : type === 'success' ? '✅' : 'ℹ️'}</span> ${text}`;
}

function hideMessage(el) {
  if (!el) return;
  el.className = 'login-message';
  el.innerHTML = '';
}

// ─── Password Toggle ───
function setupPasswordToggle(toggleId, inputId) {
  const toggle = document.getElementById(toggleId);
  const input = document.getElementById(inputId);
  if (toggle && input) {
    toggle.addEventListener('click', () => {
      if (input.type === 'password') {
        input.type = 'text';
        toggle.textContent = '🙈';
      } else {
        input.type = 'password';
        toggle.textContent = '👁️';
      }
    });
  }
}

setupPasswordToggle('login-pw-toggle', 'login-password');
setupPasswordToggle('reg-pw-toggle', 'reg-password');

// ─── Password Strength Meter ───
const regPasswordInput = document.getElementById('reg-password');
const pwBars = [
  document.getElementById('pw-bar-1'),
  document.getElementById('pw-bar-2'),
  document.getElementById('pw-bar-3'),
  document.getElementById('pw-bar-4')
];
const pwText = document.getElementById('pw-strength-text');

function evaluatePassword(pwd) {
  let score = 0;
  if (pwd.length >= 6) score++;
  if (pwd.length >= 10) score++;
  if (/[A-Z]/.test(pwd) && /[a-z]/.test(pwd)) score++;
  if (/[0-9]/.test(pwd)) score++;
  if (/[^A-Za-z0-9]/.test(pwd)) score++;
  return Math.min(score, 4);
}

if (regPasswordInput) {
  regPasswordInput.addEventListener('input', () => {
    const pwd = regPasswordInput.value;
    const score = evaluatePassword(pwd);
    const labels = ['', 'Weak', 'Fair', 'Good', 'Strong'];
    const colors = ['', 'weak', 'medium', 'medium', 'strong'];
    const textColors = ['', '#fca5a5', '#fcd34d', '#6ee7b7', '#34d399'];

    pwBars.forEach((bar, i) => {
      bar.className = 'password-strength__bar';
      if (i < score) {
        bar.classList.add(colors[score]);
      }
    });

    if (pwd.length > 0) {
      pwText.textContent = labels[score] || 'Too short';
      pwText.style.color = textColors[score] || '#fca5a5';
    } else {
      pwText.textContent = '';
    }
  });
}

// ─── Role Selector ───
const roleCards = document.querySelectorAll('.login-role-card');
roleCards.forEach(card => {
  card.addEventListener('click', () => {
    roleCards.forEach(c => c.classList.remove('selected'));
    card.classList.add('selected');
  });
});

// ─── Login Handler ───
formLogin.addEventListener('submit', async (e) => {
  e.preventDefault();
  hideMessage(loginMsg);

  const username = document.getElementById('login-username').value.trim();
  const password = document.getElementById('login-password').value;

  if (!username || !password) {
    showMessage(loginMsg, 'Please enter both username and password.', 'error');
    return;
  }

  loginSubmitBtn.classList.add('loading');
  loginSubmitBtn.textContent = 'Signing In...';

  try {
    const res = await fetch(`${API_BASE}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });

    const data = await res.json();

    if (data.success && data.user) {
      showMessage(loginMsg, `Welcome back, ${data.user.fullName || data.user.username}!`, 'success');
      saveUserSession(data.user);

      // Redirect to main app after brief success animation
      setTimeout(() => {
        window.location.href = '/index.html';
      }, 800);
    } else {
      showMessage(loginMsg, data.error || 'Invalid username or password. Please try again.', 'error');
      loginSubmitBtn.classList.remove('loading');
      loginSubmitBtn.textContent = 'Sign In to CareSync';
    }
  } catch (err) {
    // If backend is unreachable, provide smooth offline session fallback
    const STORAGE_KEY = 'MED_HEALTH_TRACKER_DATA_V2';
    let savedState = {};
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) savedState = JSON.parse(raw);
    } catch (e) {}

    const existingUser = savedState.currentUser;
    if (existingUser && existingUser.username && existingUser.username.toLowerCase() === username.toLowerCase()) {
      showMessage(loginMsg, `Offline mode: Welcome back, ${existingUser.fullName || existingUser.username}!`, 'success');
      saveUserSession(existingUser);
      setTimeout(() => {
        window.location.href = '/index.html';
      }, 700);
      return;
    }

    // Auto-create local session for entered credentials
    const fallbackName = username.includes('@') ? username.split('@')[0] : username;
    const formattedName = fallbackName.charAt(0).toUpperCase() + fallbackName.slice(1);
    const localUser = {
      id: existingUser?.id || ('usr-local-' + Date.now()),
      username,
      fullName: formattedName,
      role: 'patient',
      onboardingCompleted: true
    };
    saveUserSession(localUser);
    showMessage(loginMsg, `Offline mode: Signed in as ${formattedName}! Redirecting...`, 'success');
    setTimeout(() => {
      window.location.href = '/index.html';
    }, 700);
  }
});

// ─── Register Handler ───
formRegister.addEventListener('submit', async (e) => {
  e.preventDefault();
  hideMessage(registerMsg);

  const fullName = document.getElementById('reg-fullname').value.trim();
  const username = document.getElementById('reg-username').value.trim();
  const email = document.getElementById('reg-email')?.value.trim() || '';
  const password = document.getElementById('reg-password').value;
  const roleRadio = document.querySelector('input[name="role"]:checked');
  const role = roleRadio ? roleRadio.value : 'patient';

  if (!fullName || !username || !password) {
    showMessage(registerMsg, 'Full name, username, and password are required.', 'error');
    return;
  }

  if (password.length < 6) {
    showMessage(registerMsg, 'Password must be at least 6 characters long.', 'error');
    return;
  }

  registerSubmitBtn.classList.add('loading');
  registerSubmitBtn.textContent = 'Creating Account...';

  try {
    const res = await fetch(`${API_BASE}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fullName, username, password, email, role })
    });

    const data = await res.json();

    if (data.success && data.user) {
      showMessage(registerMsg, `Account created for ${fullName}! Redirecting to setup...`, 'success');
      saveUserSession({ ...data.user, role, onboardingCompleted: false });

      setTimeout(() => {
        window.location.href = '/index.html?onboarding=true';
      }, 1000);
    } else {
      showMessage(registerMsg, data.error || 'Registration failed. Please try a different username.', 'error');
      registerSubmitBtn.classList.remove('loading');
      registerSubmitBtn.textContent = 'Create Account & Begin Setup →';
    }
  } catch (err) {
    // Local fallback
    const mockUser = {
      id: 'usr-' + Date.now(),
      username,
      fullName,
      role,
      onboardingCompleted: false
    };
    saveUserSession(mockUser);
    showMessage(registerMsg, `Account created locally! Redirecting...`, 'success');

    setTimeout(() => {
      window.location.href = '/index.html?onboarding=true';
    }, 1000);
  }
});

// ─── Demo Login Buttons ───
document.getElementById('demo-login-btn')?.addEventListener('click', () => {
  const demoUser = {
    id: 'usr-demo',
    username: 'demo_patient',
    fullName: 'Eleanor Vance',
    role: 'patient',
    onboardingCompleted: true
  };

  saveUserSession(demoUser);
  showMessage(loginMsg, '🧪 Logging in as Demo Patient (Eleanor Vance)...', 'success');

  setTimeout(() => {
    window.location.href = '/index.html';
  }, 600);
});

document.getElementById('demo-caregiver-btn')?.addEventListener('click', () => {
  const demoCg = {
    id: 'usr-demo-cg',
    username: 'demo_caregiver',
    fullName: 'Sarah Vance',
    role: 'caregiver',
    onboardingCompleted: true
  };

  saveUserSession(demoCg);
  showMessage(loginMsg, '🛡️ Logging in as Demo Caregiver (Sarah Vance)...', 'success');

  setTimeout(() => {
    window.location.href = '/index.html?role=caregiver';
  }, 600);
});

// ─── Forgot Password ───
document.getElementById('login-forgot-btn')?.addEventListener('click', () => {
  showMessage(loginMsg, 'Password reset is not yet available. Please contact your administrator.', 'info');
});

// ─── Session Management ───
function saveUserSession(user) {
  try {
    // Save to the same localStorage key used by the main app's store
    const STORAGE_KEY = 'MED_HEALTH_TRACKER_DATA_V2';
    const existingData = localStorage.getItem(STORAGE_KEY);
    let state = {};

    if (existingData) {
      try { state = JSON.parse(existingData); } catch (e) {}
    }

    state.currentUser = user;

    // Pre-populate patient data if it's a demo account
    if (user.id === 'usr-demo') {
      state.patient = {
        id: 'pt-1',
        name: 'Eleanor Vance',
        age: 71,
        gender: 'Female',
        heightCm: 164,
        weightKg: 68,
        targetWeightKg: 65,
        activityLevel: 'light',
        healthGoal: 'diabetic_control',
        dietaryPreference: 'low_carb',
        bodyProfileCompleted: false,
        nutritionPlan: null,
        bloodGroup: 'A+',
        avatarInitials: 'EV',
        conditions: ['Type 2 Diabetes', 'Hypertension (Stage 1)', 'Hyperlipidemia'],
        allergies: ['Penicillin', 'Sulfa Drugs'],
        primaryDoctor: 'Dr. Robert Hastings',
        emergencyContact: {
          name: 'Sarah Vance',
          relationship: 'Daughter / Primary Caregiver',
          phone: '+1 (555) 382-9910',
          email: 'sarah.vance@email.com'
        }
      };

      state.medicines = [
        {
          id: 'med-1', name: 'Metformin HCl', dosage: '500 mg', type: 'tablet', color: '#0d9488',
          frequency: 'daily', scheduleTimes: ['08:00', '20:00'],
          instructions: 'Take with food. Swallow whole with water.',
          purpose: 'Blood Sugar Control (Type 2 Diabetes)',
          prescribedBy: 'Dr. Robert Hastings', stockRemaining: 18, stockTotal: 60,
          refillThreshold: 10, active: true
        },
        {
          id: 'med-2', name: 'Lisinopril', dosage: '10 mg', type: 'tablet', color: '#6366f1',
          frequency: 'daily', scheduleTimes: ['08:00'],
          instructions: 'Take on empty stomach. Avoid potassium supplements.',
          purpose: 'Blood Pressure Management (ACE Inhibitor)',
          prescribedBy: 'Dr. Robert Hastings', stockRemaining: 4, stockTotal: 30,
          refillThreshold: 7, active: true
        },
        {
          id: 'med-3', name: 'Vitamin D3', dosage: '2000 IU', type: 'capsule', color: '#f59e0b',
          frequency: 'daily', scheduleTimes: ['08:00'],
          instructions: 'Take with a meal containing fat for better absorption.',
          purpose: 'Bone Health & Immune Support',
          prescribedBy: 'Dr. Robert Hastings', stockRemaining: 42, stockTotal: 60,
          refillThreshold: 10, active: true
        },
        {
          id: 'med-4', name: 'Atorvastatin', dosage: '20 mg', type: 'tablet', color: '#ec4899',
          frequency: 'daily', scheduleTimes: ['21:00'],
          instructions: 'Take in the evening. Avoid grapefruit.',
          purpose: 'Cholesterol Management (Statin)',
          prescribedBy: 'Dr. Robert Hastings', stockRemaining: 26, stockTotal: 30,
          refillThreshold: 7, active: true
        }
      ];

      // Generate today's dose logs
      const today = new Date().toISOString().split('T')[0];
      state.doseLogs = [];
      state.medicines.forEach(m => {
        m.scheduleTimes.forEach(time => {
          const hour = parseInt(time.split(':')[0], 10);
          let period = 'morning';
          if (hour >= 12 && hour < 17) period = 'afternoon';
          else if (hour >= 17 && hour < 21) period = 'evening';
          else if (hour >= 21 || hour < 5) period = 'bedtime';

          state.doseLogs.push({
            id: 'log-' + Math.random().toString(36).substr(2, 9),
            medId: m.id,
            medName: `${m.name} ${m.dosage}`,
            timeSlot: time,
            period,
            status: 'pending',
            takenAt: null,
            date: today
          });
        });
      });

      state.adherenceStreakDays = 12;

      state.vitals = {
        bloodPressure: [
          { systolic: 138, diastolic: 86, pulse: 72, date: '2026-10-15', time: '08:15' },
          { systolic: 142, diastolic: 90, pulse: 78, date: '2026-10-14', time: '07:50' },
          { systolic: 135, diastolic: 84, pulse: 70, date: '2026-10-13', time: '08:30' }
        ],
        bloodSugar: [
          { fasting: 112, postMeal: 148, date: '2026-10-15', time: '07:00' },
          { fasting: 108, postMeal: 142, date: '2026-10-14', time: '07:15' },
          { fasting: 115, postMeal: 150, date: '2026-10-13', time: '06:45' }
        ],
        weight: [
          { weightKg: 68.2, date: '2026-10-15' },
          { weightKg: 68.5, date: '2026-10-12' }
        ],
        temperature: [
          { tempF: 98.6, date: '2026-10-15', time: '08:00' }
        ],
        symptoms: [
          {
            id: 'sym-1',
            date: '2026-10-15',
            time: '08:30',
            painLevel: 2,
            energyLevel: 'Good',
            symptoms: ['Mild knee stiffness'],
            notes: 'Took morning walk, feeling generally good.'
          }
        ]
      };

      state.alerts = [];
      state.appointments = [
        {
          id: 'apt-1', title: 'Dr. Hastings - Diabetes Check',
          doctor: 'Dr. Robert Hastings', location: 'St. Jude Medical Center',
          date: '2026-10-22', time: '10:30', notes: 'Bring recent glucose logs',
          status: 'upcoming'
        }
      ];

      state.documents = [];
      state.activeRole = 'patient';
    }

    // If caregiver demo
    if (user.id === 'usr-demo-cg') {
      state.activeRole = 'caregiver';
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    console.error('Failed to save user session:', e);
  }
}

// ─── Check If Already Logged In ───
function checkExistingSession() {
  try {
    const STORAGE_KEY = 'MED_HEALTH_TRACKER_DATA_V2';
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const state = JSON.parse(saved);
      if (state.currentUser && state.currentUser.id) {
        // Already logged in, redirect to main app
        window.location.href = '/index.html';
      }
    }
  } catch (e) {
    // Ignore errors, stay on login page
  }
}

// ─── Neon DB Status Check ───
async function checkNeonStatus() {
  const dot = document.getElementById('login-neon-dot');
  const label = document.getElementById('login-neon-label');

  try {
    const res = await fetch(`${API_BASE}/api/config/neon/status`);
    const data = await res.json();

    if (data.connected) {
      if (dot) dot.classList.add('connected');
      if (label) label.textContent = '🟢 Neon DB: Connected';
    } else {
      if (dot) dot.classList.remove('connected');
      if (label) label.textContent = '⚡ Local Mode (No DB)';
    }
  } catch {
    if (dot) dot.classList.remove('connected');
    if (label) label.textContent = '📡 Backend Offline';
  }
}

// ─── Init ───
checkExistingSession();
checkNeonStatus();

// Refresh Neon status every 30s
setInterval(checkNeonStatus, 30000);
