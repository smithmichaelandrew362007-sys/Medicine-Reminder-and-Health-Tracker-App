/* ==========================================================================
   CARESYNC - GEMINI AI NUTRITION & CALORIE CONTROLLER
   Handles body questionnaire, calorie/macro calculation, Gemini chat,
   meal analyzer, and API key configuration.
   ========================================================================== */

import { store } from './store.js';
import { showToast } from './reminders.js';

let currentStep = 1;
let questionnaireData = {
  fullName: '',
  age: 65,
  gender: 'Female',
  heightCm: 165,
  weightKg: 68,
  targetWeightKg: 65,
  activityLevel: 'light',
  healthGoal: 'maintenance',
  dietaryPreference: 'standard',
  conditions: [],
  allergies: [],
  initialMedicines: []
};

/**
 * Initialize Nutrition View & Gemini Features
 */
export function initNutritionView() {
  setupBodyQuestionnaire();
  setupGeminiKeyModal();
  setupMealAnalyzer();
  setupGeminiChat();
  checkGeminiStatus();

  // Render initial plan if exists
  renderNutritionPlan();

  // Re-render when store updates
  store.subscribe((state) => {
    if (state.patient && state.patient.nutritionPlan) {
      renderNutritionPlan();
    }
  });

  // Check if body profile is incomplete for active patient
  checkPromptBodyProfile();
}

/**
 * Check if the user needs to be prompted for their body profile questionnaire
 */
export function checkPromptBodyProfile() {
  const state = store.getState();
  if (!state.currentUser) return;

  const patient = state.patient || {};
  // If user hasn't completed their body profile yet, open modal after slight delay
  if (!patient.bodyProfileCompleted) {
    setTimeout(() => {
      openBodyQuestionnaire();
    }, 500);
  }
}

/**
 * Open the Body Profile Questionnaire Modal
 */
export function openBodyQuestionnaire() {
  const state = store.getState();
  const patient = state.patient || {};
  const user = state.currentUser || {};

  currentStep = 1;
  questionnaireData = {
    fullName: patient.name || user.fullName || 'Patient',
    age: patient.age || 65,
    gender: patient.gender || 'Female',
    heightCm: patient.heightCm || 165,
    weightKg: patient.weightKg || (state.vitals?.weight?.[state.vitals.weight.length - 1]?.weightKg) || 68,
    targetWeightKg: patient.targetWeightKg || 65,
    activityLevel: patient.activityLevel || 'light',
    healthGoal: patient.healthGoal || 'maintenance',
    dietaryPreference: patient.dietaryPreference || 'standard',
    conditions: [...(patient.conditions || [])],
    allergies: [...(patient.allergies || [])],
    initialMedicines: state.medicines || []
  };

  // Helper formatters
  const formatHeight = (cm) => {
    const totalInches = cm / 2.54;
    const feet = Math.floor(totalInches / 12);
    const inches = Math.round(totalInches % 12);
    return `${cm} cm • ${feet}' ${inches}"`;
  };

  const formatWeight = (kg) => {
    const lbs = (kg * 2.20462).toFixed(1);
    return `${parseFloat(kg).toFixed(1)} kg • ${lbs} lbs`;
  };

  const approximateDobFromAge = (age) => {
    const yr = new Date().getFullYear() - (parseInt(age, 10) || 70);
    return `${yr}-06-15`;
  };

  // Populate inputs
  const nameInput = document.getElementById('bq-name-input');
  if (nameInput) nameInput.value = questionnaireData.fullName;

  const ageInput = document.getElementById('bq-age-input');
  const ageBadge = document.getElementById('bq-age-badge');
  const dobInput = document.getElementById('bq-dob-input');
  if (ageInput) ageInput.value = questionnaireData.age;
  if (ageBadge) ageBadge.textContent = `${questionnaireData.age} yrs`;
  const initialDob = approximateDobFromAge(questionnaireData.age);
  if (dobInput) dobInput.value = initialDob;
  if (typeof window.syncCustomDobFromDate === 'function') {
    window.syncCustomDobFromDate(initialDob);
  }

  const genderSelect = document.getElementById('bq-gender-select');
  if (genderSelect) genderSelect.value = questionnaireData.gender;

  const heightInput = document.getElementById('bq-height-input');
  const heightRange = document.getElementById('bq-height-range');
  const heightBadge = document.getElementById('bq-height-badge');
  if (heightInput) heightInput.value = questionnaireData.heightCm;
  if (heightRange) heightRange.value = questionnaireData.heightCm;
  if (heightBadge) heightBadge.textContent = formatHeight(questionnaireData.heightCm);

  const weightInput = document.getElementById('bq-weight-input');
  const weightRange = document.getElementById('bq-weight-range');
  const weightBadge = document.getElementById('bq-weight-badge');
  if (weightInput) weightInput.value = questionnaireData.weightKg;
  if (weightRange) weightRange.value = questionnaireData.weightKg;
  if (weightBadge) weightBadge.textContent = formatWeight(questionnaireData.weightKg);

  const targetWeightInput = document.getElementById('bq-target-weight-input');
  const targetWeightRange = document.getElementById('bq-target-weight-range');
  const targetWeightBadge = document.getElementById('bq-target-weight-badge');
  if (targetWeightInput) targetWeightInput.value = questionnaireData.targetWeightKg;
  if (targetWeightRange) targetWeightRange.value = questionnaireData.targetWeightKg;
  if (targetWeightBadge) targetWeightBadge.textContent = formatWeight(questionnaireData.targetWeightKg);

  // Preselect activity radio
  const activityRadio = document.querySelector(`input[name="bq-activity"][value="${questionnaireData.activityLevel}"]`);
  if (activityRadio) {
    activityRadio.checked = true;
    document.querySelectorAll('.activity-card').forEach(c => c.classList.remove('selected'));
    activityRadio.closest('.activity-card')?.classList.add('selected');
  }

  // Preselect goal radio
  const goalRadio = document.querySelector(`input[name="bq-goal"][value="${questionnaireData.healthGoal}"]`);
  if (goalRadio) {
    goalRadio.checked = true;
    document.querySelectorAll('.goal-card').forEach(c => c.classList.remove('selected'));
    goalRadio.closest('.goal-card')?.classList.add('selected');
  }

  // Dietary select
  const dietSelect = document.getElementById('bq-diet-select');
  if (dietSelect) dietSelect.value = questionnaireData.dietaryPreference;

  // Active condition chips
  document.querySelectorAll('.bq-condition-chip').forEach(chip => {
    const val = chip.getAttribute('data-condition');
    if (questionnaireData.conditions.includes(val)) {
      chip.classList.add('active');
    } else {
      chip.classList.remove('active');
    }
  });

  // Active allergy chips
  document.querySelectorAll('.bq-allergy-chip').forEach(chip => {
    const val = chip.getAttribute('data-allergy');
    if (questionnaireData.allergies.includes(val)) {
      chip.classList.add('active');
    } else {
      chip.classList.remove('active');
    }
  });

  updateBmiPreview();
  updateStepView();

  const modal = document.getElementById('body-questionnaire-modal');
  if (modal) modal.classList.add('active');
}

window.openBodyQuestionnaire = openBodyQuestionnaire;

/**
 * Setup Questionnaire Controls
 */
function setupBodyQuestionnaire() {
  const modal = document.getElementById('body-questionnaire-modal');
  if (!modal) return;

  const nextBtn = document.getElementById('bq-btn-next');
  const prevBtn = document.getElementById('bq-btn-prev');

  // Formatters
  const formatHeight = (cm) => {
    const totalInches = cm / 2.54;
    const feet = Math.floor(totalInches / 12);
    const inches = Math.round(totalInches % 12);
    return `${cm} cm • ${feet}' ${inches}"`;
  };

  const formatWeight = (kg) => {
    const lbs = (kg * 2.20462).toFixed(1);
    return `${parseFloat(kg).toFixed(1)} kg • ${lbs} lbs`;
  };

  const approximateDobFromAge = (age) => {
    const yr = new Date().getFullYear() - (parseInt(age, 10) || 70);
    return `${yr}-06-15`;
  };

  // 1. Date of Birth Calendar Picker & Age Steppers
  const dobInput = document.getElementById('bq-dob-input');
  const ageInput = document.getElementById('bq-age-input');
  const ageBadge = document.getElementById('bq-age-badge');
  const ageDecBtn = document.getElementById('bq-age-dec');
  const ageIncBtn = document.getElementById('bq-age-inc');

  const setAge = (newAge) => {
    const val = Math.max(1, Math.min(120, newAge));
    questionnaireData.age = val;
    if (ageInput) ageInput.value = val;
    if (ageBadge) ageBadge.textContent = `${val} yrs`;

    // Derive new DOB preserving month and day
    let currentIso = dobInput?.value || '1961-06-15';
    let parts = currentIso.split('-');
    let mm = parts[1] || '06';
    let dd = parts[2] || '15';
    const newYear = new Date().getFullYear() - val;
    const newIso = `${newYear}-${mm}-${dd}`;

    if (typeof window.syncCustomDobFromDate === 'function') {
      window.syncCustomDobFromDate(newIso);
    } else {
      if (dobInput) dobInput.value = newIso;
      updateBmiPreview();
    }
  };

  ageDecBtn?.addEventListener('click', () => setAge((parseInt(ageInput?.value, 10) || 65) - 1));
  ageIncBtn?.addEventListener('click', () => setAge((parseInt(ageInput?.value, 10) || 65) + 1));
  ageInput?.addEventListener('input', () => setAge(parseInt(ageInput.value, 10) || 65));

  // Initialize Custom Visual Calendar & Python Bio-Chronology Engine
  setupCustomDobCalendar();

  // 2. Height Slider & Steppers
  const heightRange = document.getElementById('bq-height-range');
  const heightInput = document.getElementById('bq-height-input');
  const heightBadge = document.getElementById('bq-height-badge');
  const heightDecBtn = document.getElementById('bq-height-dec');
  const heightIncBtn = document.getElementById('bq-height-inc');

  const setHeight = (val) => {
    const cm = Math.max(100, Math.min(230, Math.round(val)));
    if (heightRange) heightRange.value = cm;
    if (heightInput) heightInput.value = cm;
    if (heightBadge) heightBadge.textContent = formatHeight(cm);
    questionnaireData.heightCm = cm;
    updateBmiPreview();
  };

  heightRange?.addEventListener('input', (e) => setHeight(e.target.value));
  heightDecBtn?.addEventListener('click', () => setHeight((parseInt(heightInput?.value, 10) || 164) - 1));
  heightIncBtn?.addEventListener('click', () => setHeight((parseInt(heightInput?.value, 10) || 164) + 1));

  // 3. Weight Slider & Steppers
  const weightRange = document.getElementById('bq-weight-range');
  const weightInput = document.getElementById('bq-weight-input');
  const weightBadge = document.getElementById('bq-weight-badge');
  const weightDecBtn = document.getElementById('bq-weight-dec');
  const weightIncBtn = document.getElementById('bq-weight-inc');

  const setWeight = (val) => {
    const kg = Math.max(30, Math.min(200, Math.round(val * 2) / 2));
    if (weightRange) weightRange.value = kg;
    if (weightInput) weightInput.value = kg;
    if (weightBadge) weightBadge.textContent = formatWeight(kg);
    questionnaireData.weightKg = kg;
    updateBmiPreview();
  };

  weightRange?.addEventListener('input', (e) => setWeight(e.target.value));
  weightDecBtn?.addEventListener('click', () => setWeight((parseFloat(weightInput?.value) || 68) - 0.5));
  weightIncBtn?.addEventListener('click', () => setWeight((parseFloat(weightInput?.value) || 68) + 0.5));

  // 4. Target Weight Slider & Steppers
  const targetWeightRange = document.getElementById('bq-target-weight-range');
  const targetWeightInput = document.getElementById('bq-target-weight-input');
  const targetWeightBadge = document.getElementById('bq-target-weight-badge');
  const targetWeightDecBtn = document.getElementById('bq-target-weight-dec');
  const targetWeightIncBtn = document.getElementById('bq-target-weight-inc');

  const setTargetWeight = (val) => {
    const kg = Math.max(30, Math.min(200, Math.round(val * 2) / 2));
    if (targetWeightRange) targetWeightRange.value = kg;
    if (targetWeightInput) targetWeightInput.value = kg;
    if (targetWeightBadge) targetWeightBadge.textContent = formatWeight(kg);
    questionnaireData.targetWeightKg = kg;
  };

  targetWeightRange?.addEventListener('input', (e) => setTargetWeight(e.target.value));
  targetWeightDecBtn?.addEventListener('click', () => setTargetWeight((parseFloat(targetWeightInput?.value) || 65) - 0.5));
  targetWeightIncBtn?.addEventListener('click', () => setTargetWeight((parseFloat(targetWeightInput?.value) || 65) + 0.5));

  // Activity cards selection
  document.querySelectorAll('.activity-card').forEach(card => {
    card.addEventListener('click', () => {
      document.querySelectorAll('.activity-card').forEach(c => c.classList.remove('selected'));
      card.classList.add('selected');
      const radio = card.querySelector('input[type="radio"]');
      if (radio) {
        radio.checked = true;
        questionnaireData.activityLevel = radio.value;
      }
    });
  });

  // Goal cards selection
  document.querySelectorAll('.goal-card').forEach(card => {
    card.addEventListener('click', () => {
      document.querySelectorAll('.goal-card').forEach(c => c.classList.remove('selected'));
      card.classList.add('selected');
      const radio = card.querySelector('input[type="radio"]');
      if (radio) {
        radio.checked = true;
        questionnaireData.healthGoal = radio.value;
      }
    });
  });

  // Condition chips
  document.querySelectorAll('.bq-condition-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      chip.classList.toggle('active');
      const val = chip.getAttribute('data-condition');
      if (chip.classList.contains('active')) {
        if (!questionnaireData.conditions.includes(val)) questionnaireData.conditions.push(val);
      } else {
        questionnaireData.conditions = questionnaireData.conditions.filter(c => c !== val);
      }
    });
  });

  // Allergy chips
  document.querySelectorAll('.bq-allergy-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      chip.classList.toggle('active');
      const val = chip.getAttribute('data-allergy');
      if (chip.classList.contains('active')) {
        if (!questionnaireData.allergies.includes(val)) questionnaireData.allergies.push(val);
      } else {
        questionnaireData.allergies = questionnaireData.allergies.filter(a => a !== val);
      }
    });
  });

  // Navigation handlers
  nextBtn?.addEventListener('click', async () => {
    if (currentStep === 1) {
      // Validate & Save Step 1
      questionnaireData.fullName = document.getElementById('bq-name-input')?.value.trim() || questionnaireData.fullName;
      questionnaireData.age = parseInt(document.getElementById('bq-age-input')?.value, 10) || questionnaireData.age;
      questionnaireData.gender = document.getElementById('bq-gender-select')?.value || 'Female';
      questionnaireData.heightCm = parseFloat(document.getElementById('bq-height-input')?.value) || 165;
      questionnaireData.weightKg = parseFloat(document.getElementById('bq-weight-input')?.value) || 68;
      questionnaireData.targetWeightKg = parseFloat(document.getElementById('bq-target-weight-input')?.value) || questionnaireData.weightKg;

      currentStep = 2;
      updateStepView();
    } else if (currentStep === 2) {
      // Save Step 2
      const activeAct = document.querySelector('input[name="bq-activity"]:checked');
      if (activeAct) questionnaireData.activityLevel = activeAct.value;

      const activeGoal = document.querySelector('input[name="bq-goal"]:checked');
      if (activeGoal) questionnaireData.healthGoal = activeGoal.value;

      questionnaireData.dietaryPreference = document.getElementById('bq-diet-select')?.value || 'standard';

      currentStep = 3;
      updateStepView();
    } else if (currentStep === 3) {
      // Save Step 3 (Conditions & Allergies)
      const customCond = document.getElementById('bq-custom-condition')?.value.trim();
      if (customCond && !questionnaireData.conditions.includes(customCond)) {
        questionnaireData.conditions.push(customCond);
      }

      const customAllergy = document.getElementById('bq-custom-allergy')?.value.trim();
      if (customAllergy && !questionnaireData.allergies.includes(customAllergy)) {
        questionnaireData.allergies.push(customAllergy);
      }

      // Transition to Step 4: AI Computation
      currentStep = 4;
      updateStepView();
      await executeGeminiAnalysis();
    } else if (currentStep === 4) {
      // Complete & Close
      modal.classList.remove('active');
      showToast('🎉 Personalized Gemini Nutrition Plan saved!', 'success');

      // Switch to Nutrition Tab automatically to view results
      const nutritionTabBtn = document.querySelector('.nav-item[data-tab="nutrition"]');
      nutritionTabBtn?.click();
    }
  });

  prevBtn?.addEventListener('click', () => {
    if (currentStep > 1 && currentStep < 4) {
      currentStep--;
      updateStepView();
    }
  });
}

function updateBmiPreview() {
  const hInput = document.getElementById('bq-height-input');
  const wInput = document.getElementById('bq-weight-input');
  const bmiDisplay = document.getElementById('bq-bmi-display');

  if (!hInput || !wInput || !bmiDisplay) return;

  const h = parseFloat(hInput.value) / 100;
  const w = parseFloat(wInput.value);

  if (h > 0 && w > 0) {
    const bmi = (w / (h * h)).toFixed(1);
    let cat = 'Normal Weight';
    let chipClass = 'normal';

    if (bmi < 18.5) {
      cat = 'Underweight';
      chipClass = 'warning';
    } else if (bmi >= 25 && bmi < 30) {
      cat = 'Overweight';
      chipClass = 'warning';
    } else if (bmi >= 30) {
      cat = 'Obese Range';
      chipClass = 'alert';
    }

    bmiDisplay.className = `vital-status-chip ${chipClass}`;
    bmiDisplay.innerHTML = `● BMI: <strong>${bmi}</strong> (${cat})`;
  }
}

function updateStepView() {
  document.querySelectorAll('.bq-step-section').forEach(sec => {
    sec.classList.add('hidden');
    if (sec.id === `bq-step-${currentStep}`) {
      sec.classList.remove('hidden');
    }
  });

  const nextBtn = document.getElementById('bq-btn-next');
  const prevBtn = document.getElementById('bq-btn-prev');
  const indicator = document.getElementById('bq-step-indicator');
  const progressBar = document.getElementById('bq-progress-bar');

  if (indicator) {
    indicator.textContent = `Step ${currentStep} of 4`;
  }

  if (progressBar) {
    progressBar.style.width = `${currentStep * 25}%`;
  }

  if (prevBtn) {
    if (currentStep === 1 || currentStep === 4) {
      prevBtn.classList.add('hidden');
    } else {
      prevBtn.classList.remove('hidden');
    }
  }

  if (nextBtn) {
    if (currentStep === 3) {
      nextBtn.textContent = '✨ Compute with Gemini AI →';
      nextBtn.className = 'btn btn-primary';
    } else if (currentStep === 4) {
      nextBtn.textContent = '🚀 Activate My Nutrition Blueprint';
      nextBtn.className = 'btn btn-success';
    } else {
      nextBtn.textContent = 'Next Step →';
      nextBtn.className = 'btn btn-primary';
    }
  }
}

/**
 * Setup Custom Attractive Interactive Visual Calendar & Python Bio-Chronology Engine
 */
function setupCustomDobCalendar() {
  const triggerCard = document.getElementById('dob-card-trigger');
  const toggleBtn = document.getElementById('btn-toggle-custom-calendar');
  const popover = document.getElementById('dob-popover');
  const monthSelect = document.getElementById('dob-month-select');
  const yearSelect = document.getElementById('dob-year-select');
  const prevMonthBtn = document.getElementById('dob-prev-month');
  const nextMonthBtn = document.getElementById('dob-next-month');
  const daysGrid = document.getElementById('dob-days-grid');
  const decadeStrip = document.getElementById('dob-decade-strip');
  const dobInput = document.getElementById('bq-dob-input');
  const btnToday = document.getElementById('dob-btn-today');
  const btnConfirm = document.getElementById('dob-btn-confirm');
  const presetBtns = document.querySelectorAll('.dob-preset-pill');

  if (!popover || !dobInput) return;

  // Calendar State
  let currentDate = dobInput.value ? new Date(dobInput.value + 'T00:00:00') : new Date(1961, 5, 15);
  if (isNaN(currentDate.getTime())) currentDate = new Date(1961, 5, 15);

  let viewYear = currentDate.getFullYear();
  let viewMonth = currentDate.getMonth(); // 0 - 11

  // Populate Year Dropdown (1920 to Current Year, descending)
  const currentSystemYear = new Date().getFullYear();
  if (yearSelect && yearSelect.options.length <= 1) {
    yearSelect.innerHTML = '';
    for (let y = currentSystemYear; y >= 1920; y--) {
      const opt = document.createElement('option');
      opt.value = y;
      opt.textContent = y;
      if (y === viewYear) opt.selected = true;
      yearSelect.appendChild(opt);
    }
  }

  // Format ISO YYYY-MM-DD
  const formatIsoDate = (year, month, day) => {
    const mm = String(month + 1).padStart(2, '0');
    const dd = String(day).padStart(2, '0');
    return `${year}-${mm}-${dd}`;
  };

  // Sync active decade pill
  const updateDecadePill = (year) => {
    const decadeBase = Math.floor(year / 10) * 10;
    decadeStrip?.querySelectorAll('.dob-decade-pill').forEach(pill => {
      const pillDecade = parseInt(pill.getAttribute('data-decade'), 10);
      if (pillDecade === decadeBase) {
        pill.classList.add('active');
      } else {
        pill.classList.remove('active');
      }
    });
  };

  // Render Days Grid
  const renderDaysGrid = () => {
    if (!daysGrid) return;
    daysGrid.innerHTML = '';

    if (monthSelect) monthSelect.value = viewMonth;
    if (yearSelect) yearSelect.value = viewYear;
    updateDecadePill(viewYear);

    const totalDays = new Date(viewYear, viewMonth + 1, 0).getDate();
    // Monday-based day of week (Monday=0 ... Sunday=6)
    const firstDayDow = (new Date(viewYear, viewMonth, 1).getDay() + 6) % 7;

    // Previous month padding
    const prevMonthDays = new Date(viewYear, viewMonth, 0).getDate();
    for (let i = firstDayDow - 1; i >= 0; i--) {
      const dayNum = prevMonthDays - i;
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'dob-day-cell outside';
      btn.textContent = dayNum;
      btn.setAttribute('tabindex', '-1');
      btn.addEventListener('click', () => {
        if (viewMonth === 0) {
          viewYear--;
          viewMonth = 11;
        } else {
          viewMonth--;
        }
        selectDate(viewYear, viewMonth, dayNum);
      });
      daysGrid.appendChild(btn);
    }

    // Days in current month
    const today = new Date();
    const isCurrentMonthThisMonth = today.getFullYear() === viewYear && today.getMonth() === viewMonth;
    const isSelectedMonthCurrent = currentDate.getFullYear() === viewYear && currentDate.getMonth() === viewMonth;

    for (let day = 1; day <= totalDays; day++) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'dob-day-cell';
      btn.textContent = day;

      if (isSelectedMonthCurrent && currentDate.getDate() === day) {
        btn.classList.add('selected');
      }
      if (isCurrentMonthThisMonth && today.getDate() === day) {
        btn.classList.add('today');
      }

      btn.addEventListener('click', () => {
        selectDate(viewYear, viewMonth, day, true);
      });

      daysGrid.appendChild(btn);
    }

    // Trailing padding to complete grid
    const filledCells = firstDayDow + totalDays;
    const nextCells = (7 - (filledCells % 7)) % 7;
    for (let nextDay = 1; nextDay <= nextCells; nextDay++) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'dob-day-cell outside';
      btn.textContent = nextDay;
      btn.setAttribute('tabindex', '-1');
      btn.addEventListener('click', () => {
        if (viewMonth === 11) {
          viewYear++;
          viewMonth = 0;
        } else {
          viewMonth++;
        }
        selectDate(viewYear, viewMonth, nextDay);
      });
      daysGrid.appendChild(btn);
    }
  };

  // Select a date and invoke Python analysis
  const selectDate = (year, month, day, closeAfterSelect = false) => {
    currentDate = new Date(year, month, day);
    viewYear = year;
    viewMonth = month;

    const isoStr = formatIsoDate(year, month, day);
    dobInput.value = isoStr;

    renderDaysGrid();
    analyzeDobWithPython(isoStr);

    if (closeAfterSelect) {
      setTimeout(() => {
        popover.classList.remove('active');
      }, 160);
    }
  };

  // Decade strip click
  decadeStrip?.addEventListener('click', (e) => {
    const pill = e.target.closest('.dob-decade-pill');
    if (!pill) return;
    const targetDecade = parseInt(pill.getAttribute('data-decade'), 10);
    viewYear = targetDecade + 5;
    const maxDayInTarget = new Date(viewYear, viewMonth + 1, 0).getDate();
    const clampedDay = Math.min(currentDate.getDate(), maxDayInTarget);
    selectDate(viewYear, viewMonth, clampedDay);
  });

  // Month & Year select changes
  monthSelect?.addEventListener('change', () => {
    viewMonth = parseInt(monthSelect.value, 10);
    const maxDay = new Date(viewYear, viewMonth + 1, 0).getDate();
    const clampedDay = Math.min(currentDate.getDate(), maxDay);
    selectDate(viewYear, viewMonth, clampedDay);
  });

  yearSelect?.addEventListener('change', () => {
    viewYear = parseInt(yearSelect.value, 10);
    const maxDay = new Date(viewYear, viewMonth + 1, 0).getDate();
    const clampedDay = Math.min(currentDate.getDate(), maxDay);
    selectDate(viewYear, viewMonth, clampedDay);
  });

  // Prev / Next Month
  prevMonthBtn?.addEventListener('click', () => {
    if (viewMonth === 0) {
      viewYear--;
      viewMonth = 11;
    } else {
      viewMonth--;
    }
    const maxDay = new Date(viewYear, viewMonth + 1, 0).getDate();
    const clampedDay = Math.min(currentDate.getDate(), maxDay);
    selectDate(viewYear, viewMonth, clampedDay);
  });

  nextMonthBtn?.addEventListener('click', () => {
    if (viewMonth === 11) {
      viewYear++;
      viewMonth = 0;
    } else {
      viewMonth++;
    }
    const maxDay = new Date(viewYear, viewMonth + 1, 0).getDate();
    const clampedDay = Math.min(currentDate.getDate(), maxDay);
    selectDate(viewYear, viewMonth, clampedDay);
  });

  // Fast Presets (e.g. 65y, 70y, 50y, 30y)
  presetBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const ageVal = parseInt(btn.getAttribute('data-age'), 10) || 65;
      const targetYear = currentSystemYear - ageVal;
      selectDate(targetYear, 5, 15); // June 15th
    });
  });

  // Today button
  btnToday?.addEventListener('click', () => {
    const now = new Date();
    selectDate(now.getFullYear(), now.getMonth(), now.getDate());
  });

  // Confirm button
  btnConfirm?.addEventListener('click', () => {
    popover.classList.remove('active');
  });

  // Popover toggling
  const togglePopover = (e) => {
    e.stopPropagation();
    const isActive = popover.classList.contains('active');
    if (!isActive) {
      if (dobInput.value) {
        const parts = dobInput.value.split('-').map(Number);
        if (parts.length === 3) {
          viewYear = parts[0];
          viewMonth = parts[1] - 1;
          currentDate = new Date(viewYear, viewMonth, parts[2]);
        }
      }
      renderDaysGrid();
      popover.classList.add('active');
    } else {
      popover.classList.remove('active');
    }
  };

  triggerCard?.addEventListener('click', (e) => {
    if (e.target.closest('#btn-toggle-custom-calendar')) return;
    togglePopover(e);
  });
  toggleBtn?.addEventListener('click', togglePopover);

  // Close when clicking outside
  document.addEventListener('click', (e) => {
    if (popover.classList.contains('active')) {
      if (!popover.contains(e.target) && !triggerCard?.contains(e.target)) {
        popover.classList.remove('active');
      }
    }
  });

  // Expose global helper to synchronize DOB and Python analysis
  window.syncCustomDobFromDate = (isoStr) => {
    if (!isoStr) return;
    const parts = isoStr.split('-').map(Number);
    if (parts.length === 3) {
      viewYear = parts[0];
      viewMonth = parts[1] - 1;
      currentDate = new Date(viewYear, viewMonth, parts[2]);
      if (dobInput) dobInput.value = isoStr;
      renderDaysGrid();
      analyzeDobWithPython(isoStr);
    }
  };

  // Initial render & analysis
  renderDaysGrid();
  if (dobInput.value) {
    analyzeDobWithPython(dobInput.value);
  }
}

/**
 * Call Python Bio-Chronology Engine via /api/calendar/analyze-dob
 * Updates the UI with exact age, total days/weeks/hours lived, zodiac, Chinese zodiac,
 * generation cohort, clinical life stage recommendations, and next birthday countdown.
 */
async function analyzeDobWithPython(dobString) {
  const mainDisplay = document.getElementById('dob-display-main');
  const subDisplay = document.getElementById('dob-display-weekday');
  const ageInput = document.getElementById('bq-age-input');
  const ageBadge = document.getElementById('bq-age-badge');
  const exactAgeBadge = document.getElementById('py-exact-age');
  const zodiacBadge = document.getElementById('py-zodiac');
  const chineseZodiacBadge = document.getElementById('py-chinese-zodiac');
  const genBadge = document.getElementById('py-generation');
  const stageIcon = document.getElementById('py-stage-icon');
  const stageName = document.getElementById('py-stage-name');
  const recoText = document.getElementById('py-recommendation');
  const nextBday = document.getElementById('py-next-bday');
  const enginePill = document.getElementById('python-engine-pill');

  if (!dobString) return;

  try {
    const res = await fetch('/api/calendar/analyze-dob', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dob: dobString })
    });

    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    const result = await res.json();

    if (result.success && result.data) {
      const d = result.data;

      // Update date displays
      if (mainDisplay) mainDisplay.textContent = d.display_date;
      if (subDisplay) subDisplay.textContent = `${d.day_of_week} • Born in ${d.year} (${d.generation.name})`;

      // Update age stepper and badge
      const calculatedAge = d.age.years;
      questionnaireData.age = calculatedAge;
      if (ageInput) ageInput.value = calculatedAge;
      if (ageBadge) ageBadge.textContent = `${calculatedAge} yrs`;

      // Update Python Bio-Chronology Cards
      if (exactAgeBadge) {
        exactAgeBadge.textContent = `${d.age.years} yrs, ${d.age.months} mos (${d.age.total_days_lived.toLocaleString()} days)`;
      }
      if (zodiacBadge) {
        zodiacBadge.textContent = `${d.zodiac.sign} ${d.zodiac.icon} (${d.zodiac.element})`;
      }
      if (chineseZodiacBadge) {
        chineseZodiacBadge.textContent = d.chinese_zodiac.display;
      }
      if (genBadge) {
        genBadge.textContent = `${d.generation.name} (${d.generation.desc})`;
      }
      if (stageIcon) stageIcon.textContent = d.clinical_guidance.stage_icon || '🌟';
      if (stageName) stageName.textContent = `${d.clinical_guidance.life_stage} (Age ${d.age.years})`;
      if (recoText) recoText.textContent = d.clinical_guidance.recommendation;
      if (nextBday) {
        nextBday.textContent = `🎈 Next Birthday in ${d.next_birthday.days_remaining} days (${d.next_birthday.day_of_week})`;
      }
      if (enginePill) {
        enginePill.innerHTML = '<span class="python-pulse-dot"></span><span>Python 3.14 Connected</span>';
      }

      updateBmiPreview();
      return;
    }
  } catch (err) {
    console.warn('[CareSync] Python DOB microservice fallback to local JS calculation:', err);
  }

  // Graceful client fallback if server offline
  fallbackDobAnalysis(dobString);
}

/**
 * Fallback date of birth calculation if offline
 */
function fallbackDobAnalysis(dobString) {
  const parts = dobString.split('-').map(Number);
  if (parts.length !== 3) return;
  const birth = new Date(parts[0], parts[1] - 1, parts[2]);
  const today = new Date();
  let years = today.getFullYear() - birth.getFullYear();
  let m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
    years--;
    m = (m + 12) % 12;
  }
  const age = Math.max(1, Math.min(120, years));
  questionnaireData.age = age;

  const ageInput = document.getElementById('bq-age-input');
  const ageBadge = document.getElementById('bq-age-badge');
  const mainDisplay = document.getElementById('dob-display-main');
  const subDisplay = document.getElementById('dob-display-weekday');
  const exactAgeBadge = document.getElementById('py-exact-age');

  if (ageInput) ageInput.value = age;
  if (ageBadge) ageBadge.textContent = `${age} yrs`;

  const monthNames = ["January","February","March","April","May","June","July","August","September","October","November","December"];
  const dayNames = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];

  if (mainDisplay) mainDisplay.textContent = `${parts[2]} ${monthNames[parts[1] - 1]} ${parts[0]}`;
  if (subDisplay) subDisplay.textContent = `${dayNames[birth.getDay()]} • Born in ${parts[0]}`;
  if (exactAgeBadge) exactAgeBadge.textContent = `${age} yrs (${Math.round((today - birth) / (1000*60*60*24)).toLocaleString()} days)`;

  updateBmiPreview();
}

/**
 * Execute Gemini AI Analysis Call
 */
async function executeGeminiAnalysis() {
  const loadingEl = document.getElementById('bq-ai-loading');
  const resultsEl = document.getElementById('bq-ai-results');
  const nextBtn = document.getElementById('bq-btn-next');

  if (loadingEl) loadingEl.classList.remove('hidden');
  if (resultsEl) resultsEl.classList.add('hidden');
  if (nextBtn) nextBtn.disabled = true;

  const state = store.getState();
  const medications = state.medicines || [];

  const payload = {
    age: questionnaireData.age,
    gender: questionnaireData.gender,
    heightCm: questionnaireData.heightCm,
    weightKg: questionnaireData.weightKg,
    targetWeightKg: questionnaireData.targetWeightKg,
    activityLevel: questionnaireData.activityLevel,
    healthGoal: questionnaireData.healthGoal,
    conditions: questionnaireData.conditions,
    allergies: questionnaireData.allergies,
    medications
  };

  try {
    const res = await fetch('/api/ai/nutrition-plan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const data = await res.json();
    const plan = data.plan;

    // Save to store
    store.update({
      patient: {
        ...state.patient,
        name: questionnaireData.fullName,
        age: questionnaireData.age,
        gender: questionnaireData.gender,
        heightCm: questionnaireData.heightCm,
        weightKg: questionnaireData.weightKg,
        targetWeightKg: questionnaireData.targetWeightKg,
        activityLevel: questionnaireData.activityLevel,
        healthGoal: questionnaireData.healthGoal,
        dietaryPreference: questionnaireData.dietaryPreference,
        conditions: questionnaireData.conditions,
        allergies: questionnaireData.allergies,
        bodyProfileCompleted: true,
        nutritionPlan: plan
      }
    });

    // Populate Results Step in Modal
    renderModalResults(plan);

    if (loadingEl) loadingEl.classList.add('hidden');
    if (resultsEl) resultsEl.classList.remove('hidden');
    if (nextBtn) nextBtn.disabled = false;
  } catch (err) {
    console.error('Failed to generate nutrition plan:', err);
    if (loadingEl) loadingEl.classList.add('hidden');
    if (resultsEl) resultsEl.classList.remove('hidden');
    if (nextBtn) nextBtn.disabled = false;
  }
}

function renderModalResults(plan) {
  if (!plan) return;

  const calEl = document.getElementById('bq-result-calories');
  const bmrEl = document.getElementById('bq-result-bmr');
  const tdeeEl = document.getElementById('bq-result-tdee');
  const reasonEl = document.getElementById('bq-result-reason');
  const sourceEl = document.getElementById('bq-result-source');

  if (calEl) calEl.textContent = plan.targetCalories?.toLocaleString() || '1,800';
  if (bmrEl) bmrEl.textContent = `${plan.bmr || 1400} kcal`;
  if (tdeeEl) tdeeEl.textContent = `${plan.tdee || 1900} kcal`;
  if (reasonEl) reasonEl.textContent = plan.calorieAdjustmentText || 'Clinically calibrated for optimal wellness.';
  if (sourceEl) {
    sourceEl.innerHTML = plan.source === 'gemini_ai'
      ? '✨ Powered by Live Google Gemini AI'
      : '⚡ Clinical Dietetics Engine (Connect Gemini API Key for deep AI insights)';
  }

  // Macro bars
  const pG = plan.macros?.protein?.grams || 80;
  const cG = plan.macros?.carbs?.grams || 180;
  const fG = plan.macros?.fats?.grams || 50;

  const macroText = document.getElementById('bq-result-macros');
  if (macroText) {
    macroText.innerHTML = `
      <span class="macro-badge protein">🍗 Protein: <strong>${pG}g</strong> (${plan.macros?.protein?.percentage || 25}%)</span>
      <span class="macro-badge carbs">🌾 Carbs: <strong>${cG}g</strong> (${plan.macros?.carbs?.percentage || 45}%)</span>
      <span class="macro-badge fats">🥑 Fats: <strong>${fG}g</strong> (${plan.macros?.fats?.percentage || 30}%)</span>
    `;
  }
}

/**
 * Render Full Nutrition Blueprint in View Panel
 */
export function renderNutritionPlan() {
  const state = store.getState();
  const patient = state.patient || {};
  const plan = patient.nutritionPlan;

  if (!plan) return;

  // Hero Calorie Display
  const targetCalEl = document.getElementById('nutri-target-calories');
  const bmrEl = document.getElementById('nutri-bmr-val');
  const tdeeEl = document.getElementById('nutri-tdee-val');
  const reasonEl = document.getElementById('nutri-calorie-reason');
  const aiBadgeEl = document.getElementById('nutri-ai-engine-badge');

  if (targetCalEl) targetCalEl.textContent = plan.targetCalories?.toLocaleString() || '--';
  if (bmrEl) bmrEl.textContent = `${plan.bmr || '--'} kcal`;
  if (tdeeEl) tdeeEl.textContent = `${plan.tdee || '--'} kcal`;
  if (reasonEl) reasonEl.textContent = plan.calorieAdjustmentText || '';
  if (aiBadgeEl) {
    aiBadgeEl.textContent = plan.source === 'gemini_ai' ? '✨ Gemini 2.5 Flash' : '⚡ Clinical Calculation Engine';
  }

  // Macros Bars
  const p = plan.macros?.protein || { grams: 85, percentage: 25 };
  const c = plan.macros?.carbs || { grams: 180, percentage: 45 };
  const f = plan.macros?.fats || { grams: 55, percentage: 30 };

  const pVal = document.getElementById('macro-protein-val');
  const cVal = document.getElementById('macro-carbs-val');
  const fVal = document.getElementById('macro-fats-val');

  if (pVal) pVal.textContent = `${p.grams}g (${p.percentage}%)`;
  if (cVal) cVal.textContent = `${c.grams}g (${c.percentage}%)`;
  if (fVal) fVal.textContent = `${f.grams}g (${f.percentage}%)`;

  const pBar = document.getElementById('macro-protein-bar');
  const cBar = document.getElementById('macro-carbs-bar');
  const fBar = document.getElementById('macro-fats-bar');

  if (pBar) pBar.style.width = `${p.percentage}%`;
  if (cBar) cBar.style.width = `${c.percentage}%`;
  if (fBar) fBar.style.width = `${f.percentage}%`;

  // Clinical limits
  const sodiumEl = document.getElementById('limit-sodium-val');
  const sugarEl = document.getElementById('limit-sugar-val');
  const fiberEl = document.getElementById('limit-fiber-val');
  const waterEl = document.getElementById('limit-water-val');

  if (sodiumEl) sodiumEl.textContent = `< ${plan.clinicalLimits?.maxSodiumMg || 2000} mg`;
  if (sugarEl) sugarEl.textContent = `< ${plan.clinicalLimits?.maxSugarG || 25} g`;
  if (fiberEl) fiberEl.textContent = `≥ ${plan.clinicalLimits?.minFiberG || 30} g`;
  if (waterEl) waterEl.textContent = `${plan.clinicalLimits?.dailyWaterLiters || 2.5} L/day`;

  // Medication Precautions
  const precContainer = document.getElementById('nutri-medication-precautions');
  if (precContainer && plan.medicationPrecautions) {
    precContainer.innerHTML = plan.medicationPrecautions.map(item => `
      <div class="precaution-item">
        <span class="precaution-icon">⚠️</span>
        <div>${item}</div>
      </div>
    `).join('');
  }

  // Condition Guidelines
  const condContainer = document.getElementById('nutri-condition-guidelines');
  if (condContainer && plan.conditionGuidelines) {
    condContainer.innerHTML = plan.conditionGuidelines.map(item => `
      <div class="guideline-item">
        <span class="guideline-icon">✓</span>
        <div>${item}</div>
      </div>
    `).join('');
  }

  // Sample Day Meal Plan
  const mealContainer = document.getElementById('nutri-meal-plan-grid');
  if (mealContainer && plan.sampleDayMealPlan) {
    const meals = [
      { key: 'breakfast', icon: '🍳', label: 'Breakfast' },
      { key: 'lunch', icon: '🥗', label: 'Lunch' },
      { key: 'afternoonSnack', icon: '🍎', label: 'Afternoon Snack' },
      { key: 'dinner', icon: '🍲', label: 'Dinner' }
    ];

    mealContainer.innerHTML = meals.map(m => {
      const item = plan.sampleDayMealPlan[m.key];
      if (!item) return '';
      return `
        <div class="meal-card">
          <div class="meal-card-header">
            <span class="meal-icon">${m.icon}</span>
            <div>
              <div class="meal-label">${m.label}</div>
              <div class="meal-calories">${item.calories} kcal</div>
            </div>
          </div>
          <div class="meal-title">${item.title}</div>
          <div class="meal-macros">
            <span>P: ${item.proteinG || item.protein}g</span> • 
            <span>C: ${item.carbsG || item.carbs}g</span> • 
            <span>F: ${item.fatsG || item.fats}g</span>
          </div>
          ${item.notes ? `<div class="meal-notes">ℹ️ ${item.notes}</div>` : ''}
        </div>
      `;
    }).join('');
  }
}

/**
 * Interactive Food & Meal Calorie Analyzer
 */
function setupMealAnalyzer() {
  const form = document.getElementById('meal-analyzer-form');
  const input = document.getElementById('meal-analyzer-input');
  const submitBtn = document.getElementById('meal-analyzer-btn');
  const resultContainer = document.getElementById('meal-analyzer-result');

  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const query = input.value.trim();
    if (!query) return;

    submitBtn.disabled = true;
    submitBtn.textContent = 'Analyzing with Gemini...';
    resultContainer.innerHTML = `
      <div style="padding:16px; text-align:center; color:var(--text-muted);">
        ✨ Consulting Gemini AI for calorie & medication safety analysis...
      </div>
    `;

    const state = store.getState();
    const patientContext = {
      conditions: state.patient?.conditions || [],
      medications: state.medicines || []
    };

    try {
      const res = await fetch('/api/ai/analyze-meal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mealDescription: query, patientContext })
      });

      const data = await res.json();
      renderMealAnalysisResult(data);
    } catch (err) {
      resultContainer.innerHTML = `<div style="color:var(--danger-500); padding:10px;">Analysis failed: ${err.message}</div>`;
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Calculate & Check Safety';
    }
  });
}

function renderMealAnalysisResult(data) {
  const container = document.getElementById('meal-analyzer-result');
  if (!container) return;

  const m = data.macros || {};
  container.innerHTML = `
    <div class="analysis-result-card">
      <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:12px;">
        <div>
          <div style="font-weight:700; font-size:1.1rem; color:var(--text-heading);">${data.meal}</div>
          <div style="font-size:0.85rem; color:var(--text-muted);">${data.verdict || 'Nutritional breakdown computed'}</div>
        </div>
        <div style="background:var(--primary-100); color:var(--primary-700); font-weight:800; font-size:1.3rem; padding:6px 14px; border-radius:var(--radius-pill);">
          ${data.estimatedCalories} kcal
        </div>
      </div>

      <div style="display:flex; gap:10px; flex-wrap:wrap; margin-bottom:12px;">
        <span class="macro-badge protein">Protein: ${m.proteinG || 0}g</span>
        <span class="macro-badge carbs">Carbs: ${m.carbsG || 0}g</span>
        <span class="macro-badge fats">Fats: ${m.fatsG || 0}g</span>
        ${m.fiberG ? `<span class="macro-badge" style="background:#e0f2fe; color:#0284c7;">Fiber: ${m.fiberG}g</span>` : ''}
        ${m.sodiumMg ? `<span class="macro-badge" style="background:#fef3c7; color:#d97706;">Sodium: ${m.sodiumMg}mg</span>` : ''}
      </div>

      ${data.interactionWarning ? `
        <div style="background:rgba(239, 68, 68, 0.1); border-left:4px solid var(--danger-500); padding:10px; border-radius:4px; font-size:0.88rem; margin-top:8px;">
          <strong>🛡️ Drug & Condition Safety:</strong> ${data.interactionWarning}
        </div>
      ` : ''}
    </div>
  `;
}

/**
 * Interactive Gemini AI Nutrition Chat Assistant
 */
function setupGeminiChat() {
  const form = document.getElementById('gemini-chat-form');
  const input = document.getElementById('gemini-chat-input');
  const messagesBox = document.getElementById('gemini-chat-messages');

  if (!form) return;

  // Suggested prompt chips
  document.querySelectorAll('.ai-chat-prompt-pill').forEach(pill => {
    pill.addEventListener('click', () => {
      if (input) {
        input.value = pill.textContent.replace(/^"|"$/g, '').trim();
        form.dispatchEvent(new Event('submit'));
      }
    });
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const query = input.value.trim();
    if (!query) return;

    // Append User Message
    appendChatMessage('user', query);
    input.value = '';

    // Append Typing Indicator
    const typingId = 'typing-' + Date.now();
    appendTypingIndicator(typingId);

    const state = store.getState();
    const patientContext = {
      fullName: state.patient?.name || 'Patient',
      age: state.patient?.age,
      gender: state.patient?.gender,
      heightCm: state.patient?.heightCm,
      weightKg: state.patient?.weightKg,
      targetCalories: state.patient?.nutritionPlan?.targetCalories || 1800,
      conditions: state.patient?.conditions || [],
      medications: state.medicines || []
    };

    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: query, patientContext })
      });

      const data = await res.json();
      removeTypingIndicator(typingId);
      appendChatMessage('ai', data.reply);
    } catch (err) {
      removeTypingIndicator(typingId);
      appendChatMessage('ai', `Sorry, error contacting Gemini: ${err.message}`);
    }
  });

  function appendChatMessage(sender, text) {
    if (!messagesBox) return;
    const msg = document.createElement('div');
    msg.className = `chat-bubble chat-bubble--${sender}`;
    msg.innerHTML = `
      <div class="chat-bubble-avatar">${sender === 'user' ? '👤' : '✨'}</div>
      <div class="chat-bubble-content">${formatMarkdownText(text)}</div>
    `;
    messagesBox.appendChild(msg);
    messagesBox.scrollTop = messagesBox.scrollHeight;
  }

  function appendTypingIndicator(id) {
    if (!messagesBox) return;
    const el = document.createElement('div');
    el.id = id;
    el.className = 'chat-bubble chat-bubble--ai typing';
    el.innerHTML = `
      <div class="chat-bubble-avatar">✨</div>
      <div class="chat-bubble-content"><em>Gemini AI is thinking...</em></div>
    `;
    messagesBox.appendChild(el);
    messagesBox.scrollTop = messagesBox.scrollHeight;
  }

  function removeTypingIndicator(id) {
    document.getElementById(id)?.remove();
  }

  function formatMarkdownText(raw) {
    return raw
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/\n\n/g, '<br><br>')
      .replace(/\n/g, '<br>');
  }
}

/**
 * Gemini API Key Configuration Modal & Navbar Badge
 */
export async function checkGeminiStatus() {
  const badge = document.getElementById('gemini-status-badge');
  const badgeText = document.getElementById('gemini-status-text');

  try {
    const res = await fetch('/api/config/gemini/status');
    const data = await res.json();

    if (data.configured) {
      if (badge) {
        badge.classList.add('connected');
        badge.title = `Gemini AI Active (${data.preview}). Click to change key.`;
      }
      if (badgeText) badgeText.textContent = `✨ Gemini AI: Active`;
    } else {
      if (badge) {
        badge.classList.remove('connected');
        badge.title = 'Click to connect your Gemini API Key';
      }
      if (badgeText) badgeText.textContent = `✨ Gemini AI: Connect Key`;
    }
  } catch {
    if (badgeText) badgeText.textContent = `✨ Gemini AI: Connect Key`;
  }
}

function setupGeminiKeyModal() {
  const badge = document.getElementById('gemini-status-badge');
  const modal = document.getElementById('gemini-key-modal');
  const form = document.getElementById('gemini-key-form');
  const keyInput = document.getElementById('gemini-key-input');
  const toggleBtn = document.getElementById('gemini-key-toggle');

  badge?.addEventListener('click', () => {
    if (modal) modal.classList.add('active');
  });

  toggleBtn?.addEventListener('click', () => {
    if (keyInput.type === 'password') {
      keyInput.type = 'text';
      toggleBtn.textContent = '🙈';
    } else {
      keyInput.type = 'password';
      toggleBtn.textContent = '👁️';
    }
  });

  form?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const apiKey = keyInput.value.trim();
    if (!apiKey) return;

    const btn = form.querySelector('button[type="submit"]');
    if (btn) btn.textContent = 'Connecting...';

    try {
      const res = await fetch('/api/config/gemini', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey })
      });

      const data = await res.json();
      if (data.success) {
        showToast('✅ Gemini API Key activated successfully!', 'success');
        modal?.classList.remove('active');
        keyInput.value = '';
        checkGeminiStatus();

        // If patient plan exists, offer re-calculation with Gemini
        const state = store.getState();
        if (state.patient && state.patient.bodyProfileCompleted) {
          executeGeminiAnalysis();
        }
      } else {
        showToast(data.error || 'Failed to save Gemini key', 'danger');
      }
    } catch (err) {
      showToast('Error saving key: ' + err.message, 'danger');
    } finally {
      if (btn) btn.textContent = 'Activate Gemini AI';
    }
  });
}
