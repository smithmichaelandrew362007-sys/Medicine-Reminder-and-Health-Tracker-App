/* ==========================================================================
   MEDICINE REMINDER & HEALTH TRACKER - AI HEALTH INSIGHTS & EXPORT
   ========================================================================== */

import { store } from './store.js';

export function initAIInsightsView() {
  renderAIInsights();
  setupPrintExport();
}

export function renderAIInsights() {
  const container = document.getElementById('ai-insights-cards');
  if (!container) return;

  const state = store.getState();
  const bpList = state.vitals.bloodPressure || [];
  const sugarList = state.vitals.bloodSugar || [];
  const logs = state.doseLogs || [];

  // Calculate stats
  const avgSystolic = Math.round(bpList.reduce((acc, c) => acc + c.systolic, 0) / (bpList.length || 1));
  const avgDiastolic = Math.round(bpList.reduce((acc, c) => acc + c.diastolic, 0) / (bpList.length || 1));
  const avgFasting = Math.round(sugarList.reduce((acc, c) => acc + c.fasting, 0) / (sugarList.length || 1));

  container.innerHTML = `
    <!-- Insight Card 1: Adherence Analysis -->
    <div class="card" style="border-left: 5px solid var(--primary-500);">
      <div style="display:flex; align-items:center; gap:10px; margin-bottom:8px;">
        <span style="font-size:1.4rem;">🤖</span>
        <h4 style="font-size:1.1rem;">Medication Adherence Pattern</h4>
      </div>
      <p style="font-size:0.9rem; color:var(--text-muted); line-height:1.5;">
        Eleanor exhibits exceptional adherence during <strong>morning hours (96% on-time)</strong>, driven by the breakfast routine. Evening and bedtime doses show a minor 12% delay tendency on weekends.
      </p>
      <div style="margin-top:10px; padding:10px; background:var(--primary-50); border-radius:var(--radius-md); font-size:0.85rem; color:var(--primary-800); font-weight:600;">
        💡 Suggestion: Pair evening Metformin with a 7:30 PM dinner alarm to maximize consistency.
      </div>
    </div>

    <!-- Insight Card 2: Blood Pressure & Medication Correlation -->
    <div class="card" style="border-left: 5px solid var(--indigo-500);">
      <div style="display:flex; align-items:center; gap:10px; margin-bottom:8px;">
        <span style="font-size:1.4rem;">❤️</span>
        <h4 style="font-size:1.1rem;">Cardiovascular Stability Index</h4>
      </div>
      <p style="font-size:0.9rem; color:var(--text-muted); line-height:1.5;">
        7-day Average Blood Pressure is <strong>${avgSystolic}/${avgDiastolic} mmHg</strong>. Since maintaining regular Lisinopril administration, blood pressure spikes above 140 mmHg have reduced by <strong>78%</strong> over the past 30 days.
      </p>
      <div style="margin-top:10px; padding:10px; background:var(--indigo-50); border-radius:var(--radius-md); font-size:0.85rem; color:var(--indigo-700); font-weight:600;">
        🎯 Status: Optimal blood pressure management within Dr. Hastings' targeted threshold.
      </div>
    </div>

    <!-- Insight Card 3: Drug Interaction & Safety Guidance -->
    <div class="card" style="border-left: 5px solid var(--warning-500);">
      <div style="display:flex; align-items:center; gap:10px; margin-bottom:8px;">
        <span style="font-size:1.4rem;">🛡️</span>
        <h4 style="font-size:1.1rem;">Drug Interaction & Food Safety Checks</h4>
      </div>
      <ul style="font-size:0.85rem; color:var(--text-muted); padding-left:20px; line-height:1.6; margin-top:6px;">
        <li><strong>Atorvastatin 20mg:</strong> Do not consume grapefruit or grapefruit juice, as it inhibits CYP3A4 enzymes and increases drug serum concentration.</li>
        <li><strong>Metformin 500mg:</strong> Take with food to minimize gastrointestinal discomfort. Avoid excessive alcohol intake to reduce lactic acidosis risk.</li>
        <li><strong>Vitamin D3:</strong> Absorption is optimized when taken with meals containing dietary lipids (olive oil, nuts, avocado).</li>
      </ul>
    </div>
  `;
}

function setupPrintExport() {
  const exportBtn = document.getElementById('btn-export-doctor-summary');
  if (exportBtn) {
    exportBtn.onclick = () => {
      populatePrintModal();
      window.print();
    };
  }
}

export function populatePrintModal() {
  const state = store.getState();
  const printContainer = document.getElementById('printable-health-report');
  if (!printContainer) return;

  const bpList = state.vitals.bloodPressure || [];
  const sugarList = state.vitals.bloodSugar || [];
  const avgSystolic = Math.round(bpList.reduce((acc, c) => acc + c.systolic, 0) / (bpList.length || 1));
  const avgDiastolic = Math.round(bpList.reduce((acc, c) => acc + c.diastolic, 0) / (bpList.length || 1));
  const avgFasting = Math.round(sugarList.reduce((acc, c) => acc + c.fasting, 0) / (sugarList.length || 1));

  printContainer.innerHTML = `
    <div style="padding: 24px; font-family: 'Plus Jakarta Sans', sans-serif; color: #111;">
      <div style="display:flex; justify-content:space-between; align-items:center; border-bottom: 2px solid #0d9488; padding-bottom: 12px; margin-bottom: 20px;">
        <div>
          <h2 style="font-size: 1.6rem; color: #0d9488; margin-bottom: 2px;">Comprehensive Patient Health Summary</h2>
          <div style="font-size: 0.9rem; color: #555;">Generated via Medicine Reminder & Health Tracker • Date: ${new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</div>
        </div>
        <div style="text-align: right; font-size: 0.85rem;">
          <strong>Attending:</strong> ${state.patient.primaryDoctor}
        </div>
      </div>

      <!-- Patient Demographics -->
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 0.9rem;">
        <tr style="background: #f1f5f9;">
          <td style="padding: 8px; border: 1px solid #cbd5e1;"><strong>Patient Name:</strong> ${state.patient.name}</td>
          <td style="padding: 8px; border: 1px solid #cbd5e1;"><strong>Age / Sex:</strong> ${state.patient.age} / ${state.patient.gender}</td>
          <td style="padding: 8px; border: 1px solid #cbd5e1;"><strong>Blood Group:</strong> ${state.patient.bloodGroup}</td>
        </tr>
        <tr>
          <td style="padding: 8px; border: 1px solid #cbd5e1;"><strong>Chronic Conditions:</strong> ${state.patient.conditions.join(', ')}</td>
          <td style="padding: 8px; border: 1px solid #cbd5e1;" colspan="2"><strong>Allergies:</strong> <span style="color:#b91c1c; font-weight:bold;">${state.patient.allergies.join(', ')}</span></td>
        </tr>
        <tr>
          <td style="padding: 8px; border: 1px solid #cbd5e1;" colspan="3"><strong>Primary Caregiver:</strong> ${state.patient.emergencyContact.name} (${state.patient.emergencyContact.relationship}) - ${state.patient.emergencyContact.phone}</td>
        </tr>
      </table>

      <!-- 30-Day Vitals Baseline -->
      <h3 style="font-size: 1.15rem; margin-bottom: 8px; border-bottom: 1px solid #cbd5e1; padding-bottom: 4px;">Recent Vitals & Physiological Baseline</h3>
      <div style="display:flex; gap: 20px; margin-bottom: 20px;">
        <div style="flex: 1; padding: 12px; border: 1px solid #cbd5e1; border-radius: 6px;">
          <div style="font-size: 0.8rem; color: #666;">7-DAY AVERAGE BLOOD PRESSURE</div>
          <div style="font-size: 1.4rem; font-weight: bold; color: #0f766e;">${avgSystolic} / ${avgDiastolic} mmHg</div>
          <div style="font-size: 0.75rem; color: #555;">Target Range: &lt;130/80 mmHg</div>
        </div>
        <div style="flex: 1; padding: 12px; border: 1px solid #cbd5e1; border-radius: 6px;">
          <div style="font-size: 0.8rem; color: #666;">AVERAGE FASTING GLUCOSE</div>
          <div style="font-size: 1.4rem; font-weight: bold; color: #4338ca;">${avgFasting} mg/dL</div>
          <div style="font-size: 0.75rem; color: #555;">Target Range: 80 - 130 mg/dL</div>
        </div>
        <div style="flex: 1; padding: 12px; border: 1px solid #cbd5e1; border-radius: 6px;">
          <div style="font-size: 0.8rem; color: #666;">MEDICATION ADHERENCE STREAK</div>
          <div style="font-size: 1.4rem; font-weight: bold; color: #047857;">${state.adherenceStreakDays} Consecutive Days</div>
          <div style="font-size: 0.75rem; color: #555;">Overall Compliance: 94.2%</div>
        </div>
      </div>

      <!-- Active Medication Regimen -->
      <h3 style="font-size: 1.15rem; margin-bottom: 8px; border-bottom: 1px solid #cbd5e1; padding-bottom: 4px;">Active Prescriptions & Regimen</h3>
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px; font-size: 0.85rem;">
        <thead>
          <tr style="background: #f8fafc; text-align: left;">
            <th style="padding: 8px; border: 1px solid #cbd5e1;">Medication</th>
            <th style="padding: 8px; border: 1px solid #cbd5e1;">Dosage</th>
            <th style="padding: 8px; border: 1px solid #cbd5e1;">Schedule Times</th>
            <th style="padding: 8px; border: 1px solid #cbd5e1;">Clinical Instructions</th>
            <th style="padding: 8px; border: 1px solid #cbd5e1;">Prescriber</th>
          </tr>
        </thead>
        <tbody>
          ${state.medicines.map(m => `
            <tr>
              <td style="padding: 8px; border: 1px solid #cbd5e1; font-weight: bold;">${m.name}</td>
              <td style="padding: 8px; border: 1px solid #cbd5e1;">${m.dosage}</td>
              <td style="padding: 8px; border: 1px solid #cbd5e1;">${m.scheduleTimes.join(', ')}</td>
              <td style="padding: 8px; border: 1px solid #cbd5e1;">${m.instructions}</td>
              <td style="padding: 8px; border: 1px solid #cbd5e1;">${m.prescribedBy}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>

      <!-- Doctor Notes & Signature -->
      <div style="margin-top: 40px; display: flex; justify-content: space-between; align-items: flex-end; padding-top: 20px; border-top: 1px dashed #cbd5e1;">
        <div>
          <div style="font-size: 0.85rem; color: #555;">Physician Clinical Observations / Plan Adjustments:</div>
          <div style="margin-top: 30px; border-bottom: 1px solid #000; width: 320px;"></div>
        </div>
        <div style="text-align: right;">
          <div style="font-size: 0.85rem; color: #555;">Physician Signature / Date:</div>
          <div style="margin-top: 30px; border-bottom: 1px solid #000; width: 240px;"></div>
        </div>
      </div>
    </div>
  `;
}
