/* ==========================================================================
   MEDICINE REMINDER & HEALTH TRACKER - STORE & STATE MANAGEMENT (FRESH STATE)
   ========================================================================== */

const STORAGE_KEY = 'MED_HEALTH_TRACKER_DATA_V2';

const DEFAULT_STATE = {
  activeRole: 'patient', // 'patient' or 'caregiver'
  theme: 'light',
  soundEnabled: true,
  notificationsEnabled: false,
  simulatorMode: false, // mobile frame toggle
  currentUser: null, // Starts unauthenticated for fresh user creation

  patient: {
    id: null,
    name: 'New Patient',
    age: null,
    gender: 'Unspecified',
    heightCm: null,
    weightKg: null,
    targetWeightKg: null,
    activityLevel: 'light',
    healthGoal: 'maintenance',
    dietaryPreference: 'standard',
    bodyProfileCompleted: false,
    nutritionPlan: null,
    bloodGroup: '',
    avatarInitials: '👤',
    conditions: [],
    allergies: [],
    primaryDoctor: '',
    emergencyContact: {
      name: '',
      relationship: '',
      phone: '',
      email: ''
    }
  },

  caregiver: {
    id: null,
    name: 'Caregiver',
    role: 'Primary Caregiver',
    linkedPatientId: null,
    phone: '',
    notifyOnMissedDose: true,
    notifyOnVitalsSpike: true,
    notifyOnLowRefill: true
  },

  medicines: [],
  doseLogs: [],
  adherenceStreakDays: 0,

  vitals: {
    bloodPressure: [],
    bloodSugar: [],
    weight: [],
    temperature: [],
    symptoms: []
  },

  alerts: [],
  appointments: [],
  documents: [],

  // Nearby Pharmacies reference directory
  pharmacies: [
    {
      id: 'ph-1',
      name: 'Walgreens Pharmacy #4102',
      address: '742 Evergreen Blvd, Metro City',
      distance: '0.4 miles away',
      phone: '+1 (555) 925-4700',
      hours: 'Open 24 Hours',
      features: ['Drive-thru pickup', 'Free delivery', 'Online refill sync']
    },
    {
      id: 'ph-2',
      name: 'CVS Pharmacy & MinuteClinic',
      address: '1204 Pine Ridge Ave, Metro City',
      distance: '1.2 miles away',
      phone: '+1 (555) 831-2940',
      hours: 'Open 8:00 AM - 10:00 PM',
      features: ['Automated text alerts', 'Curbside pickup']
    },
    {
      id: 'ph-3',
      name: 'St. Jude Community Health Pharmacy',
      address: '350 Hospital Way, Building B',
      distance: '2.1 miles away',
      phone: '+1 (555) 674-8833',
      hours: 'Mon - Fri 9:00 AM - 6:00 PM',
      features: ['Senior discount', 'Compounding services']
    }
  ],

  refillOrders: []
};

class Store {
  constructor() {
    this.subscribers = [];
    this.state = this.loadState();
  }

  loadState() {
    try {
      localStorage.removeItem('MED_HEALTH_TRACKER_DATA_V1');
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.warn('Failed to load state from localStorage:', e);
    }
    return JSON.parse(JSON.stringify(DEFAULT_STATE));
  }

  saveState() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state));
    } catch (e) {
      console.error('Failed to save state to localStorage:', e);
    }
    this.notify();
  }

  getState() {
    return this.state;
  }

  update(updater) {
    if (typeof updater === 'function') {
      updater(this.state);
    } else {
      this.state = { ...this.state, ...updater };
    }
    this.saveState();
  }

  subscribe(listener) {
    this.subscribers.push(listener);
    return () => {
      this.subscribers = this.subscribers.filter(sub => sub !== listener);
    };
  }

  notify() {
    this.subscribers.forEach(listener => {
      try {
        listener(this.state);
      } catch (err) {
        console.error('Subscriber error:', err);
      }
    });
  }

  resetToDefault() {
    localStorage.removeItem('MED_HEALTH_TRACKER_DATA_V1');
    localStorage.removeItem(STORAGE_KEY);
    this.state = JSON.parse(JSON.stringify(DEFAULT_STATE));
    this.saveState();
  }
}

export const store = new Store();
