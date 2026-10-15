# Medicine Reminder and Health Tracker App

A comprehensive desktop (Electron) and web application designed to help patients take their medicines on time, log and visualize critical health data, and provide caregivers with real-time monitoring and safety alerts. Powered by a Neon PostgreSQL cloud database.

---

## 🌟 Key Features

### 1. Dual-Persona Role Switcher (Patient & Caregiver)
- **Patient Mode (`Eleanor Vance, Age 71`)**:
  - Personalized daily medicine schedule grouped by periods (Morning, Afternoon, Evening, Bedtime).
  - Quick dose confirmation buttons (`✓ Taken`, `⏰ Snooze 10m`, `✕ Skip`).
  - Adherence progress ring & daily streak counter with celebratory confetti animations (`canvas-confetti`).
  - High-visibility typography and clear color-coded indicators suited for elderly individuals.
- **Caregiver Portal (`Sarah Vance, Daughter & Primary Caregiver`)**:
  - Live patient status overview (age, chronic conditions, verified daily adherence rate).
  - Real-time Alert Feed: Instant alerts for missed doses, high blood pressure readings, and low pill stock.
  - Emergency SOS Trigger with audio alarm and notification dispatch.
  - Quick action buttons: Direct phone call simulation and instant reminder SMS dispatch.

### 2. Intelligent Medicine Reminder & Alarm Engine
- **Web Audio API Melodic Chimes**:
  - Ascending gentle chime sequence (`C5 -> E5 -> G5 -> C6`) for scheduled reminders.
  - Urgent alarm beeps for overdue medication or emergency escalation.
- **Urgent Fullscreen Alarm Dialog**:
  - Displays pill visual representation, dosage, food relationship instructions ("Take after breakfast with water").
  - Actions: Mark as Taken, Snooze 10 Minutes, Skip Dose.
- **Browser Notification API**:
  - Standard browser push alerts with permission management.
- **Interactive Alarm Testing**:
  - Dedicated "Test Alarm" buttons to experience reminder workflows immediately.

### 3. Comprehensive Health Vitals & Interactive Analytics
- **Vital Signs Tracked**:
  - **Blood Pressure & Pulse**: Systolic/Diastolic (mmHg) with automated AHA classification (*Normal*, *Elevated*, *Stage 1*, *Stage 2 Hypertension*). Automatically alerts caregiver if reading is dangerously elevated.
  - **Blood Glucose**: Fasting and Post-meal glucose (mg/dL) with diabetic range categorization (*Normal*, *Prediabetes*, *High Glucose*).
  - **Body Weight & BMI**: Automatically calculates Body Mass Index based on patient height.
  - **Body Temperature**: Oral temperature in °F and °C with fever detection.
  - **Wellness & Symptoms Feed**: Daily pain scale rating (1-10 slider), energy levels, and symptom notes.
- **Interactive Trend Graphs (`Chart.js`)**:
  - Historical telemetry tabs: Blood Pressure trends, Blood Sugar progression, and Weight tracking.
  - Responsive charts with adaptive grid colors for both Light and Dark themes.

### 4. Doctor Appointment Reminders
- Schedule clinical appointments with specialists (e.g., Cardiologist, Endocrinologist).
- Automatic countdown badges (*"2 days away"*, *"Tomorrow"*, *"Today"*).
- Pre-consultation preparation notes (e.g., *"Fasting 8 hours prior; bring BP log"*).

### 5. Digital Health Vault (Prescriptions & Lab Reports)
- Secure local document storage for prescriptions, blood test panels, and imaging reports.
- File upload supporting photos and PDF documents with category tagging.
- Fullscreen preview modal with zoom and doctor notes.

### 6. Pharmacy & Refill Management Hub
- **Medication Fuel Gauges**: Visual progress bars showing remaining pill stock and days remaining.
- **Refill Alert Thresholds**: Flags medications below 7 days supply, highlighting critical refills.
- **1-Click Refill Order**:
  - Select pharmacy, choose Curbside Pickup or Same-day Home Delivery, and select 30-day or 90-day supplies.
  - Live order tracking stepper with order number and status.
- **Nearby Pharmacies Directory**:
  - Interactive directory with distance, 24/7 hours, phone number, and directions.

### 7. AI Health Insights & Clinical Summary Export
- Behavioral adherence pattern analytics (analyzing morning vs evening compliance).
- Medication & food safety precautions (e.g., Grapefruit warning with Atorvastatin).
- **Printable Doctor Visit Report**: Formatted clinical summary containing patient demographics, 30-day adherence rate, vitals baseline averages, and active prescriptions for printing or saving as PDF.

---

## 🛠️ Technology Stack

- **Core**: Semantic HTML5 & Modern Vanilla ES Modules JavaScript
- **Styling**: Vanilla CSS3 Design System with CSS variables, Glassmorphism, and responsive layouts
- **Theme**: Built-in Dark Mode and Light Mode support
- **Preview Modes**: Dual desktop and smartphone frame simulator
- **Visual Analytics**: [Chart.js](https://www.chartjs.org/)
- **Micro-Animations**: [Canvas Confetti](https://github.com/catdad/canvas-confetti)
- **Audio Synthesis**: Native Browser Web Audio API (zero external sound files needed)
- **State Persistence**: LocalStorage reactive store with instant synchronization

---

### 🖥️ Desktop Application (Electron)
```bash
# Launch Electron with automatic server + Vite dev integration
npm run electron:dev

# Launch Electron directly
npm run electron

# Build web assets and run in Electron
npm run electron:build
```

### 🌐 Web Application Only
```bash
# Start backend API (with Neon PostgreSQL connection)
npm run server

# Start Vite Web Dev Server
npm run dev
```
Open [http://localhost:5173/login.html](http://localhost:5173/login.html) in your browser.

### 📦 Production Web Build
```bash
npm run build
```
The optimized bundle will be created in the `dist/` directory.

---

## 🧪 Testing Workflows

1. **Test Taking a Medicine**:
   - Go to **Daily Schedule**.
   - Click `✓ Taken` on any pending dose (e.g. *Vitamin D3*). Notice the adherence circle updates and a toast notification confirms the dose.
2. **Test Reminder Alarm**:
   - Click `🔔 Test Alarm` on any card to trigger the urgent modal and Web Audio chime.
3. **Test Caregiver Alert Trigger**:
   - Click `+ Log Vitals` and enter a systolic blood pressure $\ge 140$ (e.g., 148/92). Submit and switch to **Caregiver Portal** to observe the critical alert generated for Sarah Vance.
4. **Test Pharmacy Refill**:
   - Navigate to **Pharmacy & Refills**, click `📦 1-Click Refill Request`, select *Lisinopril 10mg*, and submit to replenish stock and generate an active order tracker.
5. **Test Doctor Summary Export**:
   - Navigate to **AI Health Insights** and click `🖨️ Export Doctor Visit Report (PDF)` to preview the physician summary.
