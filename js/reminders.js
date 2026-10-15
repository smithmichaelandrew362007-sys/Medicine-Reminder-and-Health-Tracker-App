/* ==========================================================================
   MEDICINE REMINDER & HEALTH TRACKER - REMINDERS & ALARM ENGINE
   ========================================================================== */

import { store } from './store.js';

let audioCtx = null;

function getAudioContext() {
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

/**
 * Web Audio Melodic Chime Synthesizer
 * Plays a pleasant, high-fidelity alert sound
 */
export function playChimeSound(type = 'gentle') {
  const state = store.getState();
  if (!state.soundEnabled) return;

  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;

    if (type === 'urgent') {
      // 3 urgent alert beeps
      [0, 0.25, 0.5].forEach((offset, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(880, now + offset); // A5
        osc.frequency.setValueAtTime(1046.5, now + offset + 0.1); // C6

        gain.gain.setValueAtTime(0.3, now + offset);
        gain.gain.exponentialRampToValueAtTime(0.01, now + offset + 0.2);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now + offset);
        osc.stop(now + offset + 0.22);
      });
    } else {
      // Melodic gentle health chime: C5 -> E5 -> G5 -> C6
      const notes = [523.25, 659.25, 783.99, 1046.5];
      notes.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + i * 0.15);

        gain.gain.setValueAtTime(0, now + i * 0.15);
        gain.gain.linearRampToValueAtTime(0.25, now + i * 0.15 + 0.04);
        gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.15 + 0.45);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now + i * 0.15);
        osc.stop(now + i * 0.15 + 0.5);
      });
    }
  } catch (e) {
    console.warn('Audio playback error:', e);
  }
}

/**
 * Native Browser Notification Dispatcher
 */
export async function requestNotificationPermission() {
  if (!('Notification' in window)) {
    showToast('Notifications are not supported by this browser.', 'warning');
    return false;
  }
  if (Notification.permission === 'granted') {
    store.update({ notificationsEnabled: true });
    showToast('Notification alerts are enabled!', 'success');
    return true;
  }
  const perm = await Notification.requestPermission();
  if (perm === 'granted') {
    store.update({ notificationsEnabled: true });
    showToast('Notification alerts enabled successfully!', 'success');
    return true;
  } else {
    store.update({ notificationsEnabled: false });
    showToast('Notification permission was declined.', 'warning');
    return false;
  }
}

export function sendBrowserNotification(title, body) {
  // Electron Native Desktop Notification Bridge
  if (window.electronAPI && typeof window.electronAPI.sendNotification === 'function') {
    window.electronAPI.sendNotification({ title, body });
    return;
  }

  const state = store.getState();
  if (!state.notificationsEnabled || !('Notification' in window)) return;
  if (Notification.permission === 'granted') {
    try {
      new Notification(title, {
        body,
        icon: 'https://cdn-icons-png.flaticon.com/512/2966/2966327.png',
        tag: 'med-reminder'
      });
    } catch (e) {
      console.warn('Could not fire native notification:', e);
    }
  }
}

/**
 * Toast Notification Utility
 */
export function showToast(message, type = 'info', duration = 3500) {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  
  let icon = '🔔';
  if (type === 'success') icon = '✅';
  if (type === 'warning') icon = '⚠️';
  if (type === 'danger') icon = '🚨';

  toast.innerHTML = `
    <span style="font-size: 1.2rem;">${icon}</span>
    <div style="flex: 1;">${message}</div>
    <button style="background:none;border:none;cursor:pointer;color:var(--text-muted);font-size:1.1rem;" onclick="this.parentElement.remove()">✕</button>
  `;

  container.appendChild(toast);

  setTimeout(() => {
    toast.style.transition = 'opacity 0.4s ease, transform 0.4s ease';
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(15px)';
    setTimeout(() => toast.remove(), 400);
  }, duration);
}

/**
 * Urgent Reminder Modal Trigger
 */
export function triggerReminderModal(med, timeSlot = 'Now') {
  playChimeSound('urgent');
  sendBrowserNotification(
    `⏰ Medicine Reminder: ${med.name} (${med.dosage})`,
    `Time for your scheduled dose! ${med.instructions}`
  );

  const modal = document.getElementById('urgent-alarm-modal');
  if (!modal) return;

  document.getElementById('alarm-med-name').textContent = med.name;
  document.getElementById('alarm-med-dosage').textContent = `${med.dosage} (${med.type})`;
  document.getElementById('alarm-med-instruction').textContent = med.instructions;
  document.getElementById('alarm-med-time').textContent = `Scheduled at: ${timeSlot}`;

  const takeBtn = document.getElementById('alarm-btn-take');
  const snoozeBtn = document.getElementById('alarm-btn-snooze');
  const skipBtn = document.getElementById('alarm-btn-skip');

  takeBtn.onclick = () => {
    // Log as taken
    const state = store.getState();
    const log = state.doseLogs.find(l => l.medId === med.id && l.status === 'pending');
    if (log) {
      log.status = 'taken';
      log.takenAt = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    // Decrement stock
    const targetMed = state.medicines.find(m => m.id === med.id);
    if (targetMed && targetMed.stockRemaining > 0) {
      targetMed.stockRemaining -= 1;
    }
    store.saveState();
    closeReminderModal();
    showToast(`✓ Marked ${med.name} as Taken! Great job.`, 'success');
  };

  snoozeBtn.onclick = () => {
    closeReminderModal();
    showToast(`⏰ Snoozed ${med.name} for 10 minutes.`, 'info');
  };

  skipBtn.onclick = () => {
    const state = store.getState();
    const log = state.doseLogs.find(l => l.medId === med.id && l.status === 'pending');
    if (log) {
      log.status = 'missed';
    }
    // Add caregiver alert
    state.alerts.unshift({
      id: 'alt-' + Date.now(),
      type: 'critical',
      title: `Missed Dose: ${med.name} ${med.dosage}`,
      message: `Eleanor Vance skipped scheduled dose at ${timeSlot}. Reason: Patient marked skipped.`,
      time: 'Just now',
      resolved: false
    });
    store.saveState();
    closeReminderModal();
    showToast(`Marked as Missed. Caregiver Sarah Vance has been alerted.`, 'warning');
  };

  modal.classList.add('active');
}

export function closeReminderModal() {
  const modal = document.getElementById('urgent-alarm-modal');
  if (modal) modal.classList.remove('active');
}

/**
 * Clock & Real-time Reminder Scheduler
 */
export function initClockScheduler() {
  function tick() {
    const now = new Date();
    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const clockEl = document.getElementById('live-clock-display');
    if (clockEl) clockEl.textContent = timeStr;

    // Check every minute on the 0th second
    if (now.getSeconds() === 0) {
      const currentHoursMins = now.toTimeString().substring(0, 5); // "08:00"
      const state = store.getState();
      state.doseLogs.forEach(log => {
        if (log.timeSlot === currentHoursMins && log.status === 'pending') {
          const med = state.medicines.find(m => m.id === log.medId);
          if (med) {
            triggerReminderModal(med, log.timeSlot);
          }
        }
      });
    }
  }

  tick();
  setInterval(tick, 1000);
}
