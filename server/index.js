/* ==========================================================================
   MEDICINE REMINDER & HEALTH TRACKER - EXPRESS API BACKEND WITH NEON POSTGRESQL
   ========================================================================== */

import express from 'express';
import cors from 'cors';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { initDatabase, getDbStatus, getSql } from './db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const envFilePath = path.join(__dirname, '..', '.env');

const app = express();
app.use(cors());
app.use(express.json());

// In-memory local fallback store (clean slate)
const localStore = {
  users: [],
  profiles: {}
};

function hashPassword(pwd) {
  return crypto.createHash('sha256').update(pwd).digest('hex');
}

/**
 * 1. Neon DB Status & Configuration Endpoint
 */
app.get('/api/config/neon/status', (req, res) => {
  const status = getDbStatus();
  res.json(status);
});

app.post('/api/config/neon', async (req, res) => {
  const { connectionString } = req.body;
  if (!connectionString) {
    return res.status(400).json({ error: 'Connection string is required' });
  }

  try {
    // Save to .env
    let envContent = '';
    if (fs.existsSync(envFilePath)) {
      envContent = fs.readFileSync(envFilePath, 'utf8');
      if (envContent.includes('NEON_DATABASE_URL=')) {
        envContent = envContent.replace(/NEON_DATABASE_URL=.*/g, `NEON_DATABASE_URL=${connectionString}`);
      } else {
        envContent += `\nNEON_DATABASE_URL=${connectionString}\n`;
      }
    } else {
      envContent = `NEON_DATABASE_URL=${connectionString}\n`;
    }
    fs.writeFileSync(envFilePath, envContent.trim() + '\n', 'utf8');
    process.env.NEON_DATABASE_URL = connectionString;

    // Test connection
    const result = await initDatabase(connectionString);
    if (result.connected) {
      res.json({ success: true, message: 'Successfully connected to Neon PostgreSQL database!', dbName: result.dbName });
    } else {
      res.status(400).json({ success: false, error: result.error });
    }
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * 2. Auth: Register
 */
app.post('/api/auth/register', async (req, res) => {
  const { username, password, fullName, email } = req.body;

  if (!username || !password || !fullName) {
    return res.status(400).json({ error: 'Username, password, and full name are required.' });
  }

  const userId = 'usr-' + Date.now();
  const passwordHash = hashPassword(password);
  const sql = getSql();

  try {
    if (sql) {
      // Check existing in Neon
      const existing = await sql`SELECT id FROM med_users WHERE username = ${username}`;
      if (existing.length > 0) {
        return res.status(400).json({ error: 'Username is already taken.' });
      }

      await sql`
        INSERT INTO med_users (id, username, email, password_hash, role)
        VALUES (${userId}, ${username}, ${email || ''}, ${passwordHash}, 'patient')
      `;

      await sql`
        INSERT INTO med_patient_profiles (id, user_id, full_name, onboarding_completed)
        VALUES (${'prof-' + Date.now()}, ${userId}, ${fullName}, FALSE)
      `;
    } else {
      // Local fallback
      const exists = localStore.users.find(u => u.username.toLowerCase() === username.toLowerCase());
      if (exists) {
        return res.status(400).json({ error: 'Username is already taken.' });
      }
      localStore.users.push({
        id: userId,
        username,
        email,
        passwordHash,
        fullName,
        role: 'patient',
        onboardingCompleted: false
      });
      localStore.profiles[userId] = {
        fullName,
        onboardingCompleted: false
      };
    }

    res.json({
      success: true,
      user: {
        id: userId,
        username,
        fullName,
        onboardingCompleted: false
      }
    });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * 3. Auth: Login
 */
app.post('/api/auth/login', async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required.' });
  }

  const hash = hashPassword(password);
  const sql = getSql();

  try {
    if (sql) {
      const users = await sql`
        SELECT u.id, u.username, u.role, p.full_name, p.age, p.height_cm, p.weight_kg, p.onboarding_completed, p.conditions, p.allergies, p.emergency_contact
        FROM med_users u
        LEFT JOIN med_patient_profiles p ON p.user_id = u.id
        WHERE u.username = ${username} AND u.password_hash = ${hash}
      `;

      if (users.length === 0) {
        return res.status(401).json({ error: 'Invalid username or password.' });
      }

      const row = users[0];
      return res.json({
        success: true,
        user: {
          id: row.id,
          username: row.username,
          fullName: row.full_name || row.username,
          role: row.role,
          age: row.age,
          heightCm: row.height_cm,
          weightKg: row.weight_kg,
          conditions: row.conditions || [],
          allergies: row.allergies || [],
          emergencyContact: row.emergency_contact || {},
          onboardingCompleted: !!row.onboarding_completed
        }
      });
    } else {
      // Local check
      const user = localStore.users.find(u => u.username.toLowerCase() === username.toLowerCase() && u.passwordHash === hash);
      if (!user) {
        return res.status(401).json({ error: 'Invalid username or password.' });
      }

      const prof = localStore.profiles[user.id] || {};
      return res.json({
        success: true,
        user: {
          id: user.id,
          username: user.username,
          fullName: user.fullName || prof.fullName,
          role: user.role,
          ...prof,
          onboardingCompleted: !!prof.onboardingCompleted
        }
      });
    }
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * 4. Post-Login Onboarding (Personalization Wizard)
 */
app.post('/api/onboarding', async (req, res) => {
  const {
    userId,
    fullName,
    age,
    gender,
    heightCm,
    weightKg,
    conditions,
    allergies,
    emergencyContact,
    initialMedicines
  } = req.body;

  if (!userId) {
    return res.status(400).json({ error: 'User ID is required.' });
  }

  const sql = getSql();

  try {
    if (sql) {
      // Update patient profile
      await sql`
        UPDATE med_patient_profiles
        SET
          full_name = ${fullName || 'User'},
          age = ${age ? parseInt(age, 10) : null},
          gender = ${gender || 'Unspecified'},
          height_cm = ${heightCm ? parseFloat(heightCm) : null},
          weight_kg = ${weightKg ? parseFloat(weightKg) : null},
          conditions = ${JSON.stringify(conditions || [])}::jsonb,
          allergies = ${JSON.stringify(allergies || [])}::jsonb,
          emergency_contact = ${JSON.stringify(emergencyContact || {})}::jsonb,
          onboarding_completed = TRUE
        WHERE user_id = ${userId}
      `;

      // Insert initial medicines if any provided
      if (Array.isArray(initialMedicines) && initialMedicines.length > 0) {
        for (const med of initialMedicines) {
          const medId = 'med-' + Date.now() + '-' + Math.floor(Math.random() * 1000);
          await sql`
            INSERT INTO med_medicines (id, user_id, name, dosage, type, color, schedule_times, instructions, stock_remaining, stock_total)
            VALUES (
              ${medId},
              ${userId},
              ${med.name},
              ${med.dosage || '1 dose'},
              ${med.type || 'tablet'},
              ${med.color || '#0d9488'},
              ${JSON.stringify(med.scheduleTimes || ['08:00'])}::jsonb,
              ${med.instructions || 'Take with water'},
              ${med.stock || 30},
              ${med.stock || 30}
            )
          `;

          // Insert today's dose log
          for (const time of (med.scheduleTimes || ['08:00'])) {
            const hour = parseInt(time.split(':')[0], 10);
            let period = 'morning';
            if (hour >= 12 && hour < 17) period = 'afternoon';
            else if (hour >= 17 && hour < 21) period = 'evening';
            else if (hour >= 21 || hour < 5) period = 'bedtime';

            await sql`
              INSERT INTO med_dose_logs (id, user_id, medicine_id, med_name, time_slot, period, status)
              VALUES (
                ${'log-' + Date.now() + '-' + Math.floor(Math.random() * 1000)},
                ${userId},
                ${medId},
                ${med.name + ' ' + (med.dosage || '')},
                ${time},
                ${period},
                'pending'
              )
            `;
          }
        }
      }
    } else {
      // Local fallback
      localStore.profiles[userId] = {
        fullName: fullName || 'User',
        age: parseInt(age, 10) || 70,
        gender: gender || 'Female',
        heightCm: parseFloat(heightCm) || 165,
        weightKg: parseFloat(weightKg) || 68,
        conditions: conditions || [],
        allergies: allergies || [],
        emergencyContact: emergencyContact || {},
        onboardingCompleted: true
      };
    }

    res.json({
      success: true,
      message: 'Personalized onboarding completed successfully!',
      profile: {
        fullName,
        age,
        gender,
        heightCm,
        weightKg,
        conditions,
        allergies,
        emergencyContact,
        onboardingCompleted: true
      }
    });
  } catch (err) {
    console.error('Onboarding save error:', err);
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, async () => {
  console.log(`🚀 CareSync Backend API running on http://localhost:${PORT}`);
  // Attempt Neon connection if URL present
  await initDatabase();
});
