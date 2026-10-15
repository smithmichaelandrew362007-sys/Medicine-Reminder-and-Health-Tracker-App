/* ==========================================================================
   MEDICINE REMINDER & HEALTH TRACKER - HEALTH VITALS & CHARTS
   ========================================================================== */

import { store } from './store.js';
import { showToast } from './reminders.js';
import Chart from 'chart.js/auto';

let activeChartInstance = null;
let currentChartTab = 'bp'; // 'bp', 'sugar', 'weight'

export function initVitalsView() {
  renderVitalsCards();
  renderChart(currentChartTab);
  setupVitalsChartTabs();
  setupLogVitalForm();
}

export function renderVitalsCards() {
  const state = store.getState();
  const vitals = state.vitals || {};

  // 1. Blood Pressure
  const bpList = vitals.bloodPressure || [];
  const latestBP = bpList[bpList.length - 1];
  const bpCardEl = document.getElementById('vital-card-bp-val');
  if (bpCardEl) {
    if (latestBP) {
      let bpStatus = 'Normal';
      let bpClass = 'normal';
      if (latestBP.systolic >= 140 || latestBP.diastolic >= 90) {
        bpStatus = 'Stage 2 Hypertension';
        bpClass = 'alert';
      } else if (latestBP.systolic >= 130 || latestBP.diastolic >= 80) {
        bpStatus = 'Stage 1 Hypertension';
        bpClass = 'warning';
      } else if (latestBP.systolic >= 120 && latestBP.diastolic < 80) {
        bpStatus = 'Elevated';
        bpClass = 'warning';
      }

      bpCardEl.innerHTML = `
        <div class="vital-value-display">
          <span class="vital-big-number">${latestBP.systolic}/${latestBP.diastolic}</span>
          <span class="vital-unit">mmHg</span>
        </div>
        <div style="font-size:0.85rem; color:var(--text-muted); margin-top:2px;">
          Pulse: <strong>${latestBP.pulse || 72} bpm</strong>
        </div>
        <div style="margin-top:6px;">
          <span class="vital-status-chip ${bpClass}">● ${bpStatus}</span>
        </div>
      `;
    } else {
      bpCardEl.innerHTML = `
        <div class="vital-value-display">
          <span class="vital-big-number" style="color:var(--text-muted); font-size:1.8rem;">--/--</span>
          <span class="vital-unit">mmHg</span>
        </div>
        <div style="font-size:0.8rem; color:var(--text-muted); margin-top:6px;">No reading recorded yet</div>
      `;
    }
  }

  // 2. Blood Sugar
  const sugarList = vitals.bloodSugar || [];
  const latestSugar = sugarList[sugarList.length - 1];
  const sugarCardEl = document.getElementById('vital-card-sugar-val');
  if (sugarCardEl) {
    if (latestSugar) {
      let sugarStatus = 'Normal';
      let sugarClass = 'normal';
      if (latestSugar.fasting >= 126 || latestSugar.postMeal >= 200) {
        sugarStatus = 'High Glucose';
        sugarClass = 'alert';
      } else if (latestSugar.fasting >= 100 || latestSugar.postMeal >= 140) {
        sugarStatus = 'Pre-diabetic Range';
        sugarClass = 'warning';
      }

      sugarCardEl.innerHTML = `
        <div class="vital-value-display">
          <span class="vital-big-number">${latestSugar.fasting}</span>
          <span class="vital-unit">mg/dL</span>
        </div>
        <div style="font-size:0.85rem; color:var(--text-muted); margin-top:2px;">
          Post-Meal: <strong>${latestSugar.postMeal} mg/dL</strong>
        </div>
        <div style="margin-top:6px;">
          <span class="vital-status-chip ${sugarClass}">● ${sugarStatus}</span>
        </div>
      `;
    } else {
      sugarCardEl.innerHTML = `
        <div class="vital-value-display">
          <span class="vital-big-number" style="color:var(--text-muted); font-size:1.8rem;">--</span>
          <span class="vital-unit">mg/dL</span>
        </div>
        <div style="font-size:0.8rem; color:var(--text-muted); margin-top:6px;">No glucose logged yet</div>
      `;
    }
  }

  // 3. Weight & BMI
  const weightList = vitals.weight || [];
  const latestWeight = weightList[weightList.length - 1];
  const weightCardEl = document.getElementById('vital-card-weight-val');
  if (weightCardEl) {
    if (latestWeight) {
      const height = (state.patient && state.patient.heightCm) ? (state.patient.heightCm / 100) : 1.65;
      const bmi = (latestWeight.weightKg / (height * height)).toFixed(1);

      weightCardEl.innerHTML = `
        <div class="vital-value-display">
          <span class="vital-big-number">${latestWeight.weightKg}</span>
          <span class="vital-unit">kg</span>
        </div>
        <div style="font-size:0.85rem; color:var(--text-muted); margin-top:2px;">
          BMI: <strong>${bmi}</strong>
        </div>
        <div style="margin-top:6px;">
          <span class="vital-status-chip ${bmi > 25 ? 'warning' : 'normal'}">● ${bmi > 25 ? 'Slightly Overweight' : 'Normal Weight'}</span>
        </div>
      `;
    } else {
      weightCardEl.innerHTML = `
        <div class="vital-value-display">
          <span class="vital-big-number" style="color:var(--text-muted); font-size:1.8rem;">--</span>
          <span class="vital-unit">kg</span>
        </div>
        <div style="font-size:0.8rem; color:var(--text-muted); margin-top:6px;">No weight logged yet</div>
      `;
    }
  }

  // 4. Temperature
  const tempList = vitals.temperature || [];
  const latestTemp = tempList[tempList.length - 1];
  const tempCardEl = document.getElementById('vital-card-temp-val');
  if (tempCardEl) {
    if (latestTemp) {
      tempCardEl.innerHTML = `
        <div class="vital-value-display">
          <span class="vital-big-number">${latestTemp.tempF}°</span>
          <span class="vital-unit">F</span>
        </div>
        <div style="font-size:0.85rem; color:var(--text-muted); margin-top:2px;">
          Oral Reading (${((latestTemp.tempF - 32) * 5 / 9).toFixed(1)}°C)
        </div>
        <div style="margin-top:6px;">
          <span class="vital-status-chip normal">● Normal Temperature</span>
        </div>
      `;
    } else {
      tempCardEl.innerHTML = `
        <div class="vital-value-display">
          <span class="vital-big-number" style="color:var(--text-muted); font-size:1.8rem;">--°</span>
          <span class="vital-unit">F</span>
        </div>
        <div style="font-size:0.8rem; color:var(--text-muted); margin-top:6px;">No temperature logged yet</div>
      `;
    }
  }


  // 5. Symptoms Feed
  const symptomsList = vitals.symptoms || [];
  const symptomsFeedEl = document.getElementById('symptoms-feed-container');
  if (symptomsFeedEl) {
    symptomsFeedEl.innerHTML = symptomsList.slice(0, 3).map(s => `
      <div style="padding:12px; background:var(--bg-subtle); border-radius:var(--radius-md); margin-bottom:10px;">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;">
          <span style="font-weight:700; font-size:0.9rem;">${s.date} • ${s.time}</span>
          <span style="font-size:0.75rem; background:var(--bg-card); padding:2px 8px; border-radius:var(--radius-pill); font-weight:600;">
            Pain: ${s.painLevel}/10
          </span>
        </div>
        <div style="font-size:0.85rem; color:var(--text-muted);">
          <strong>Energy:</strong> ${s.energyLevel} | <strong>Symptoms:</strong> ${s.symptoms.join(', ')}
        </div>
        ${s.notes ? `<div style="font-size:0.8rem; color:var(--text-muted); margin-top:4px; font-style:italic;">"${s.notes}"</div>` : ''}
      </div>
    `).join('');
  }
}

/**
 * Interactive Chart.js Renderer
 */
export function renderChart(tab = 'bp') {
  currentChartTab = tab;
  const canvas = document.getElementById('vitals-trend-chart');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  const state = store.getState();
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  const gridColor = isDark ? '#243048' : '#e2e8f0';
  const textColor = isDark ? '#94a3b8' : '#64748b';

  if (activeChartInstance) {
    activeChartInstance.destroy();
  }

  let chartConfig = {};

  if (tab === 'bp') {
    const data = state.vitals.bloodPressure || [];
    chartConfig = {
      type: 'line',
      data: {
        labels: data.map(d => d.date),
        datasets: [
          {
            label: 'Systolic (Target < 120)',
            data: data.map(d => d.systolic),
            borderColor: '#ef4444',
            backgroundColor: 'rgba(239, 68, 68, 0.12)',
            tension: 0.35,
            fill: false,
            borderWidth: 3,
            pointBackgroundColor: '#ef4444',
            pointRadius: 5
          },
          {
            label: 'Diastolic (Target < 80)',
            data: data.map(d => d.diastolic),
            borderColor: '#0d9488',
            backgroundColor: 'rgba(13, 148, 136, 0.12)',
            tension: 0.35,
            fill: false,
            borderWidth: 3,
            pointBackgroundColor: '#0d9488',
            pointRadius: 5
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { labels: { color: textColor, font: { family: 'Plus Jakarta Sans', weight: '600' } } },
          tooltip: { padding: 12, cornerRadius: 8 }
        },
        scales: {
          x: { grid: { color: gridColor }, ticks: { color: textColor } },
          y: { min: 60, max: 160, grid: { color: gridColor }, ticks: { color: textColor } }
        }
      }
    };
  } else if (tab === 'sugar') {
    const data = state.vitals.bloodSugar || [];
    chartConfig = {
      type: 'line',
      data: {
        labels: data.map(d => d.date),
        datasets: [
          {
            label: 'Fasting Sugar (Target 70-100 mg/dL)',
            data: data.map(d => d.fasting),
            borderColor: '#6366f1',
            backgroundColor: 'rgba(99, 102, 241, 0.1)',
            tension: 0.35,
            borderWidth: 3,
            pointRadius: 5
          },
          {
            label: 'Post-Meal Sugar (Target < 140 mg/dL)',
            data: data.map(d => d.postMeal),
            borderColor: '#f59e0b',
            backgroundColor: 'rgba(245, 158, 11, 0.1)',
            tension: 0.35,
            borderWidth: 3,
            pointRadius: 5
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { labels: { color: textColor, font: { family: 'Plus Jakarta Sans', weight: '600' } } }
        },
        scales: {
          x: { grid: { color: gridColor }, ticks: { color: textColor } },
          y: { min: 60, max: 200, grid: { color: gridColor }, ticks: { color: textColor } }
        }
      }
    };
  } else if (tab === 'weight') {
    const data = state.vitals.weight || [];
    chartConfig = {
      type: 'line',
      data: {
        labels: data.map(d => d.date),
        datasets: [
          {
            label: 'Body Weight (kg)',
            data: data.map(d => d.weightKg),
            borderColor: '#10b981',
            backgroundColor: 'rgba(16, 185, 129, 0.1)',
            fill: true,
            tension: 0.3,
            borderWidth: 3,
            pointRadius: 5
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { labels: { color: textColor, font: { family: 'Plus Jakarta Sans', weight: '600' } } }
        },
        scales: {
          x: { grid: { color: gridColor }, ticks: { color: textColor } },
          y: { min: 60, max: 75, grid: { color: gridColor }, ticks: { color: textColor } }
        }
      }
    };
  }

  activeChartInstance = new Chart(ctx, chartConfig);
}

function setupVitalsChartTabs() {
  const tabs = document.querySelectorAll('.chart-tab-btn');
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      const chartType = tab.getAttribute('data-chart') || 'bp';
      renderChart(chartType);
    });
  });
}

function setupLogVitalForm() {
  const form = document.getElementById('log-vital-form');
  if (!form) return;

  form.addEventListener('submit', (e) => {
    e.preventDefault();

    const systolic = parseInt(document.getElementById('vital-input-systolic').value, 10);
    const diastolic = parseInt(document.getElementById('vital-input-diastolic').value, 10);
    const pulse = parseInt(document.getElementById('vital-input-pulse').value, 10) || 72;
    const fasting = parseInt(document.getElementById('vital-input-fasting').value, 10);
    const postMeal = parseInt(document.getElementById('vital-input-postmeal').value, 10);
    const weight = parseFloat(document.getElementById('vital-input-weight').value);
    const temp = parseFloat(document.getElementById('vital-input-temp').value) || 98.6;
    const pain = parseInt(document.getElementById('vital-input-pain').value, 10) || 0;
    const notes = document.getElementById('vital-input-notes').value.trim();

    const state = store.getState();
    const todayLabel = 'Today ' + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    // BP
    if (!isNaN(systolic) && !isNaN(diastolic)) {
      state.vitals.bloodPressure.push({
        date: todayLabel,
        systolic,
        diastolic,
        pulse,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      });

      // High BP Alert trigger (> 140 / 90)
      if (systolic >= 140 || diastolic >= 90) {
        state.alerts.unshift({
          id: 'alt-' + Date.now(),
          type: 'critical',
          title: `High Blood Pressure Alert: ${systolic}/${diastolic} mmHg`,
          message: `Elevated vital recorded for Eleanor Vance at ${todayLabel}. Immediate rest and verification recommended.`,
          time: 'Just now',
          resolved: false
        });
        showToast(`🚨 High Blood Pressure logged (${systolic}/${diastolic} mmHg). Caregiver notified!`, 'danger', 5000);
      }
    }

    // Blood Sugar
    if (!isNaN(fasting) || !isNaN(postMeal)) {
      state.vitals.bloodSugar.push({
        date: todayLabel,
        fasting: fasting || 110,
        postMeal: postMeal || 140,
        time: 'Logged'
      });

      if ((fasting && fasting >= 180) || (postMeal && postMeal >= 200)) {
        state.alerts.unshift({
          id: 'alt-' + Date.now(),
          type: 'critical',
          title: `High Glucose Alert: ${postMeal || fasting} mg/dL`,
          message: `Significant blood sugar spike logged. Check hydration and insulin/medication protocol.`,
          time: 'Just now',
          resolved: false
        });
      }
    }

    // Weight
    if (!isNaN(weight)) {
      state.vitals.weight.push({
        date: todayLabel,
        weightKg: weight
      });
    }

    // Symptoms
    if (pain > 0 || notes) {
      state.vitals.symptoms.unshift({
        id: 'sym-' + Date.now(),
        date: 'Today',
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        painLevel: pain,
        energyLevel: pain > 5 ? 'Low' : 'Moderate',
        symptoms: pain > 3 ? ['Joint discomfort / pain'] : ['General wellness check'],
        notes: notes || 'Daily vital check-in'
      });
    }

    store.saveState();
    renderVitalsCards();
    renderChart(currentChartTab);

    // Close modal
    const modal = document.getElementById('log-vital-modal');
    if (modal) modal.classList.remove('active');
    form.reset();

    showToast('✓ Health vitals recorded successfully!', 'success');
  });
}
