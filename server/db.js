/* ==========================================================================
   NEON POSTGRESQL DATABASE ADAPTER & SCHEMA MIGRATION
   ========================================================================== */

import { neon } from '@neondatabase/serverless';
import dotenv from 'dotenv';
dotenv.config();

let sql = null;
let isConnected = false;
let connectionError = null;

export function getDatabaseUrl() {
  return process.env.NEON_DATABASE_URL || process.env.DATABASE_URL || '';
}

export async function initDatabase(customUrl = null) {
  const url = customUrl || getDatabaseUrl();

  if (!url) {
    isConnected = false;
    connectionError = 'No Neon Database connection string configured yet.';
    console.log('⚠️ [Neon DB]: No DATABASE_URL provided. Operating in Local Cache mode until API key is provided.');
    return { connected: false, message: connectionError };
  }

  try {
    sql = neon(url);
    // Test query
    const result = await sql`SELECT NOW() as current_time, current_database() as db_name`;
    isConnected = true;
    connectionError = null;
    console.log(`✅ [Neon DB]: Successfully connected to database "${result[0].db_name}" at ${result[0].current_time}`);

    // Create database tables if they do not exist
    await createSchema();

    return { connected: true, dbName: result[0].db_name, time: result[0].current_time };
  } catch (err) {
    isConnected = false;
    connectionError = err.message;
    console.error('❌ [Neon DB Connection Error]:', err.message);
    return { connected: false, error: err.message };
  }
}

export function getDbStatus() {
  return {
    connected: isConnected,
    hasUrl: !!getDatabaseUrl(),
    error: connectionError
  };
}

export function getSql() {
  return sql;
}

/**
 * Creates CareSync dedicated tables in Neon PostgreSQL with med_ prefix
 */
async function createSchema() {
  if (!sql) return;

  try {
    console.log('🔄 [Neon DB]: Ensuring CareSync database schema and tables exist in Neon PostgreSQL...');

    // 1. Users table
    await sql`
      CREATE TABLE IF NOT EXISTS med_users (
        id VARCHAR(64) PRIMARY KEY,
        username VARCHAR(100) UNIQUE NOT NULL,
        email VARCHAR(150),
        password_hash VARCHAR(255) NOT NULL,
        role VARCHAR(20) DEFAULT 'patient',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `;

    // 2. Patient profiles
    await sql`
      CREATE TABLE IF NOT EXISTS med_patient_profiles (
        id VARCHAR(64) PRIMARY KEY,
        user_id VARCHAR(64) REFERENCES med_users(id) ON DELETE CASCADE,
        full_name VARCHAR(150) NOT NULL,
        age INT,
        gender VARCHAR(30),
        height_cm NUMERIC(5,2),
        weight_kg NUMERIC(5,2),
        blood_group VARCHAR(10),
        conditions JSONB DEFAULT '[]'::jsonb,
        allergies JSONB DEFAULT '[]'::jsonb,
        emergency_contact JSONB DEFAULT '{}'::jsonb,
        onboarding_completed BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `;

    // 3. Medicines
    await sql`
      CREATE TABLE IF NOT EXISTS med_medicines (
        id VARCHAR(64) PRIMARY KEY,
        user_id VARCHAR(64) REFERENCES med_users(id) ON DELETE CASCADE,
        name VARCHAR(150) NOT NULL,
        dosage VARCHAR(100) NOT NULL,
        type VARCHAR(50) DEFAULT 'tablet',
        color VARCHAR(20) DEFAULT '#0d9488',
        frequency VARCHAR(50) DEFAULT 'daily',
        schedule_times JSONB DEFAULT '[]'::jsonb,
        instructions TEXT,
        purpose VARCHAR(255),
        prescribed_by VARCHAR(150),
        stock_remaining INT DEFAULT 30,
        stock_total INT DEFAULT 30,
        refill_threshold INT DEFAULT 5,
        active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `;

    // 4. Dose logs
    await sql`
      CREATE TABLE IF NOT EXISTS med_dose_logs (
        id VARCHAR(64) PRIMARY KEY,
        user_id VARCHAR(64) REFERENCES med_users(id) ON DELETE CASCADE,
        medicine_id VARCHAR(64) REFERENCES med_medicines(id) ON DELETE CASCADE,
        med_name VARCHAR(150),
        time_slot VARCHAR(20),
        period VARCHAR(20),
        status VARCHAR(20) DEFAULT 'pending',
        taken_at VARCHAR(30),
        log_date DATE DEFAULT CURRENT_DATE
      );
    `;

    // 5. Vitals
    await sql`
      CREATE TABLE IF NOT EXISTS med_vitals (
        id VARCHAR(64) PRIMARY KEY,
        user_id VARCHAR(64) REFERENCES med_users(id) ON DELETE CASCADE,
        systolic INT,
        diastolic INT,
        pulse INT,
        fasting_sugar INT,
        post_meal_sugar INT,
        weight_kg NUMERIC(5,2),
        temp_f NUMERIC(4,1),
        pain_level INT DEFAULT 0,
        energy_level VARCHAR(50),
        notes TEXT,
        recorded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `;

    // 6. Caregiver alerts
    await sql`
      CREATE TABLE IF NOT EXISTS med_caregiver_alerts (
        id VARCHAR(64) PRIMARY KEY,
        user_id VARCHAR(64) REFERENCES med_users(id) ON DELETE CASCADE,
        type VARCHAR(30) DEFAULT 'info',
        title VARCHAR(200) NOT NULL,
        message TEXT,
        resolved BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `;

    // 7. Doctor appointments
    await sql`
      CREATE TABLE IF NOT EXISTS med_appointments (
        id VARCHAR(64) PRIMARY KEY,
        user_id VARCHAR(64) REFERENCES med_users(id) ON DELETE CASCADE,
        doctor_name VARCHAR(150) NOT NULL,
        specialty VARCHAR(100),
        clinic VARCHAR(200),
        appointment_date VARCHAR(50),
        appointment_time VARCHAR(50),
        notes TEXT,
        phone VARCHAR(50),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `;

    // 8. Pharmacy refill orders
    await sql`
      CREATE TABLE IF NOT EXISTS med_refill_orders (
        id VARCHAR(64) PRIMARY KEY,
        user_id VARCHAR(64) REFERENCES med_users(id) ON DELETE CASCADE,
        medicine_name VARCHAR(150) NOT NULL,
        dosage VARCHAR(100),
        pharmacy_name VARCHAR(150),
        status VARCHAR(50) DEFAULT 'Ready for Pickup',
        requested_at VARCHAR(50),
        order_number VARCHAR(50),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `;

    console.log('✅ [Neon DB]: All 8 CareSync tables verified and created in Neon PostgreSQL!');
  } catch (err) {
    console.error('❌ [Neon DB Schema Error]:', err.message);
  }
}
