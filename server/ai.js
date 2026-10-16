/* ==========================================================================
   CARESYNC - GEMINI AI CLINICAL NUTRITION & CALORIE ENGINE
   Powered by Google Gemini AI (@google/genai)
   ========================================================================== */

import { GoogleGenAI } from '@google/genai';

/**
 * Helper to get initialized Gemini client
 */
function getAiClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey.trim() === '' || apiKey.includes('YOUR_')) {
    return null;
  }
  return new GoogleGenAI({ apiKey: apiKey.trim() });
}

/**
 * Clinically grounded fallback calculation (Mifflin-St Jeor + ADA/AHA Guidelines)
 * Used if Gemini API Key is pending or network is offline
 */
export function calculateClinicalNutritionFallback({
  age = 65,
  gender = 'Female',
  heightCm = 165,
  weightKg = 68,
  targetWeightKg = 65,
  activityLevel = 'light', // 'sedentary', 'light', 'moderate', 'active', 'very_active'
  healthGoal = 'maintenance', // 'weight_loss', 'maintenance', 'weight_gain', 'diabetic_control', 'heart_health'
  conditions = [],
  allergies = [],
  medications = []
}) {
  const numAge = Number(age) || 65;
  const numHeight = Number(heightCm) || 165;
  const numWeight = Number(weightKg) || 68;

  // Mifflin-St Jeor Formula
  // Men: BMR = (10 × weight in kg) + (6.25 × height in cm) - (5 × age in years) + 5
  // Women: BMR = (10 × weight in kg) + (6.25 × height in cm) - (5 × age in years) - 161
  let bmr = (10 * numWeight) + (6.25 * numHeight) - (5 * numAge);
  if (String(gender).toLowerCase().startsWith('m')) {
    bmr += 5;
  } else {
    bmr -= 161;
  }
  bmr = Math.round(bmr);

  // Activity multipliers
  const activityMultipliers = {
    sedentary: 1.2,
    light: 1.375,
    moderate: 1.55,
    active: 1.725,
    very_active: 1.9
  };
  const multiplier = activityMultipliers[activityLevel] || 1.375;
  const tdee = Math.round(bmr * multiplier);

  // Target calorie adjustment based on health goal
  let targetCalories = tdee;
  let calorieAdjustmentText = 'Calculated for healthy weight maintenance.';
  
  if (healthGoal === 'weight_loss') {
    targetCalories = Math.max(1200, Math.round(tdee - 450));
    calorieAdjustmentText = 'Prescribed with a moderate 450 kcal deficit for safe, sustainable fat loss (approx 0.4–0.5 kg/week).';
  } else if (healthGoal === 'weight_gain') {
    targetCalories = Math.round(tdee + 350);
    calorieAdjustmentText = 'Prescribed with a 350 kcal surplus to support lean mass gain and recovery.';
  } else if (healthGoal === 'diabetic_control') {
    targetCalories = Math.max(1300, Math.round(tdee - 250));
    calorieAdjustmentText = 'Optimized for steady blood sugar control with low glycemic-index carbohydrates and moderate caloric balance.';
  } else if (healthGoal === 'heart_health') {
    targetCalories = Math.round(tdee - 150);
    calorieAdjustmentText = 'Cardioprotective caloric intake modeled on DASH/Mediterranean clinical guidelines with strict sodium limits.';
  }

  // Macro distribution tailored to health conditions
  const isDiabetic = conditions.some(c => /diabet/i.test(c)) || healthGoal === 'diabetic_control';
  const isHypertensive = conditions.some(c => /hypertens|blood pressure/i.test(c)) || healthGoal === 'heart_health';

  let proteinPct = 0.25;
  let carbPct = 0.45;
  let fatPct = 0.30;

  if (isDiabetic) {
    // Lower carb, higher lean protein & healthy fat
    carbPct = 0.38;
    proteinPct = 0.28;
    fatPct = 0.34;
  }

  const proteinKcal = Math.round(targetCalories * proteinPct);
  const carbKcal = Math.round(targetCalories * carbPct);
  const fatKcal = Math.round(targetCalories * fatPct);

  const proteinGrams = Math.round(proteinKcal / 4);
  const carbGrams = Math.round(carbKcal / 4);
  const fatGrams = Math.round(fatKcal / 9);

  // Medication-specific safety warnings
  const medicationPrecautions = [];
  medications.forEach(m => {
    const name = (m.name || m).toLowerCase();
    if (name.includes('metformin')) {
      medicationPrecautions.push('Metformin: Take doses with or immediately after meals to minimize gastrointestinal discomfort. Limit alcohol consumption to avoid lactic acidosis.');
    }
    if (name.includes('lisinopril') || name.includes('enalapril') || name.includes('ramipril') || name.includes('losartan')) {
      medicationPrecautions.push('ACE Inhibitor / ARB: Avoid excessive potassium intake (e.g. potassium-based salt substitutes) as it can elevate serum potassium levels.');
    }
    if (name.includes('atorvastatin') || name.includes('simvastatin') || name.includes('statin')) {
      medicationPrecautions.push('Statin Alert: Avoid grapefruit and fresh grapefruit juice; compounds in grapefruit inhibit CYP3A4 enzymes and increase medication blood concentration.');
    }
    if (name.includes('aspirin') || name.includes('warfarin')) {
      medicationPrecautions.push('Anticoagulant Alert: Maintain a consistent daily intake of Vitamin K (dark leafy greens like spinach/kale) and take with food to prevent gastric irritation.');
    }
  });

  if (medicationPrecautions.length === 0) {
    medicationPrecautions.push('Ensure regular hydration and take medications with a full glass of water as scheduled.');
  }

  // Condition guidelines
  const conditionGuidelines = [];
  if (isDiabetic) {
    conditionGuidelines.push('Prioritize complex, high-fiber carbs (oats, legumes, non-starchy vegetables) to maintain stable postprandial glucose.');
    conditionGuidelines.push('Keep simple added sugars under 20g daily; pair carbs with protein to blunt insulin spikes.');
  }
  if (isHypertensive) {
    conditionGuidelines.push('Limit sodium intake to under 1,500–2,000 mg/day (DASH Diet protocol); season with herbs, garlic, and citrus instead of table salt.');
  }
  if (conditionGuidelines.length === 0) {
    conditionGuidelines.push('Balance every plate with 50% colorful vegetables, 25% lean protein, and 25% complex whole grains.');
  }

  // Sample meal plan
  const sampleDayMealPlan = {
    breakfast: {
      title: isDiabetic ? 'Steel-Cut Oats with Chia Seeds & Walnuts' : 'Avocado & Poached Egg Whole-Grain Toast',
      calories: Math.round(targetCalories * 0.25),
      proteinG: Math.round(proteinGrams * 0.25),
      carbsG: Math.round(carbGrams * 0.25),
      fatsG: Math.round(fatGrams * 0.25),
      notes: 'Take morning medications with this meal and 250ml water.'
    },
    lunch: {
      title: 'Mediterranean Grilled Chicken / Tofu Salad Bowl',
      calories: Math.round(targetCalories * 0.35),
      proteinG: Math.round(proteinGrams * 0.35),
      carbsG: Math.round(carbGrams * 0.35),
      fatsG: Math.round(fatGrams * 0.35),
      notes: 'Baby spinach, cherry tomatoes, cucumbers, olive oil dressing, quinoa.'
    },
    afternoonSnack: {
      title: 'Greek Yogurt with Blueberries & Roasted Almonds',
      calories: Math.round(targetCalories * 0.12),
      proteinG: Math.round(proteinGrams * 0.12),
      carbsG: Math.round(carbGrams * 0.12),
      fatsG: Math.round(fatGrams * 0.12),
      notes: 'Low glycemic snack providing probiotic support and healthy satiety.'
    },
    dinner: {
      title: 'Baked Herb Atlantic Salmon with Steamed Asparagus & Sweet Potato',
      calories: Math.round(targetCalories * 0.28),
      proteinG: Math.round(proteinGrams * 0.28),
      carbsG: Math.round(carbGrams * 0.28),
      fatsG: Math.round(fatGrams * 0.28),
      notes: 'Rich in Omega-3 fatty acids for cardiovascular & cognitive health.'
    }
  };

  return {
    source: 'clinical_engine',
    bmr,
    tdee,
    targetCalories,
    calorieAdjustmentText,
    macros: {
      protein: { grams: proteinGrams, kcal: proteinKcal, percentage: Math.round(proteinPct * 100) },
      carbs: { grams: carbGrams, kcal: carbKcal, percentage: Math.round(carbPct * 100) },
      fats: { grams: fatGrams, kcal: fatKcal, percentage: Math.round(fatPct * 100) }
    },
    clinicalLimits: {
      maxSodiumMg: isHypertensive ? 1800 : 2300,
      maxSugarG: isDiabetic ? 20 : 36,
      minFiberG: 30,
      dailyWaterLiters: Math.max(2.0, (numWeight * 0.033).toFixed(1))
    },
    conditionGuidelines,
    medicationPrecautions,
    sampleDayMealPlan,
    topRecommendedFoods: [
      'Leafy Greens (Spinach, Kale, Arugula)',
      'Wild-Caught Fatty Fish (Salmon, Mackerel)',
      'Berries (Blueberries, Blackberries - low glycemic)',
      'Raw Nuts & Seeds (Walnuts, Chia, Flaxseed)',
      'Extra Virgin Olive Oil',
      'Lentils & Legumes'
    ],
    foodsToAvoid: [
      'Ultra-processed snacks with high sodium',
      'Refined sugary beverages & juices',
      'Trans-fat fried foods',
      ...(isDiabetic ? ['White bread and refined bakery goods'] : []),
      ...(isHypertensive ? ['Canned soups and processed deli meats'] : [])
    ]
  };
}

/**
 * Generate Personalized Clinical Nutrition Plan using Google Gemini AI
 */
export async function generateGeminiNutritionPlan(patientProfile) {
  const ai = getAiClient();
  
  // If no Gemini API key configured, use clinical fallback engine
  if (!ai) {
    console.log('[Gemini Nutrition] No Gemini API key provided. Using clinical calculation engine.');
    return calculateClinicalNutritionFallback(patientProfile);
  }

  try {
    const {
      age, gender, heightCm, weightKg, targetWeightKg,
      activityLevel, healthGoal, conditions = [], allergies = [], medications = []
    } = patientProfile;

    const medNames = medications.map(m => typeof m === 'object' ? `${m.name} (${m.dosage || ''})` : m).join(', ');
    const condList = conditions.join(', ') || 'None reported';
    const allergyList = allergies.join(', ') || 'None reported';

    const prompt = `
You are a senior clinical dietitian and clinical pharmacologist assistant.
Generate a personalized, medically-safe nutrition and daily calorie plan for the following patient:

PATIENT BIOMETRICS & PROFILE:
- Age: ${age} years
- Biological Gender: ${gender}
- Height: ${heightCm} cm
- Current Weight: ${weightKg} kg
- Target Weight: ${targetWeightKg || weightKg} kg
- Activity Level: ${activityLevel} (sedentary/light/moderate/active/very_active)
- Primary Health Goal: ${healthGoal} (e.g. weight_loss, diabetic_control, heart_health, maintenance, weight_gain)
- Diagnosed Conditions: ${condList}
- Allergies / Intolerances: ${allergyList}
- Active Medications: ${medNames || 'None currently logged'}

Calculate their exact BMR (Mifflin-St Jeor), TDEE, and recommended daily target calories based on their goal.
Then provide macronutrient splits, specific medical condition guidelines, crucial drug-nutrient interactions for their medications, and a 1-day sample meal plan.

Return your response ONLY as valid JSON (no markdown fences, no surrounding commentary) matching this exact schema:
{
  "source": "gemini_ai",
  "bmr": number,
  "tdee": number,
  "targetCalories": number,
  "calorieAdjustmentText": string,
  "macros": {
    "protein": { "grams": number, "kcal": number, "percentage": number },
    "carbs": { "grams": number, "kcal": number, "percentage": number },
    "fats": { "grams": number, "kcal": number, "percentage": number }
  },
  "clinicalLimits": {
    "maxSodiumMg": number,
    "maxSugarG": number,
    "minFiberG": number,
    "dailyWaterLiters": number
  },
  "conditionGuidelines": [string],
  "medicationPrecautions": [string],
  "sampleDayMealPlan": {
    "breakfast": { "title": string, "calories": number, "proteinG": number, "carbsG": number, "fatsG": number, "notes": string },
    "lunch": { "title": string, "calories": number, "proteinG": number, "carbsG": number, "fatsG": number, "notes": string },
    "afternoonSnack": { "title": string, "calories": number, "proteinG": number, "carbsG": number, "fatsG": number, "notes": string },
    "dinner": { "title": string, "calories": number, "proteinG": number, "carbsG": number, "fatsG": number, "notes": string }
  },
  "topRecommendedFoods": [string],
  "foodsToAvoid": [string],
  "aiDoctorNote": string
}
`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json'
      }
    });

    const text = response.text;
    const parsed = JSON.parse(text);
    parsed.source = 'gemini_ai';
    return parsed;
  } catch (err) {
    console.error('[Gemini Nutrition] Gemini API call error:', err.message);
    // Fall back seamlessly to clinical calculations
    const fallback = calculateClinicalNutritionFallback(patientProfile);
    fallback.note = `AI response fallback: ${err.message}`;
    return fallback;
  }
}

/**
 * Interactive Chat Assistant with Gemini for Nutrition & Health Questions
 */
export async function chatWithGeminiNutrition({ message, conversationHistory = [], patientContext = {} }) {
  const ai = getAiClient();
  if (!ai) {
    return {
      reply: "I am ready to assist you! To enable live Gemini AI responses, please configure your Gemini API Key in the settings or .env file. Meanwhile, your clinical daily calorie targets and guidelines have been computed based on clinical medical standards.",
      configured: false
    };
  }

  try {
    const { fullName, age, gender, heightCm, weightKg, targetCalories, conditions = [], medications = [] } = patientContext;
    
    const medList = medications.map(m => typeof m === 'object' ? `${m.name} (${m.dosage || ''})` : m).join(', ');
    const condList = conditions.join(', ') || 'None';

    const systemPrompt = `
You are CareSync's Gemini Health & Nutrition Specialist.
You are assisting ${fullName || 'the patient'} (${age || 65}yo, ${gender || 'Unspecified'}, ${weightKg || 68}kg, ${heightCm || 164}cm).
Their diagnosed conditions: ${condList}.
Their active medications: ${medList || 'None'}.
Their target daily caloric intake: ${targetCalories || 1800} kcal.

Your goals:
1. Provide compassionate, evidence-based nutrition, meal, calorie, and food advice.
2. ALWAYS check for food-drug interactions with their active medications (e.g. grapefruit with statins, high potassium with ACE inhibitors like Lisinopril, taking Metformin with meals).
3. If they ask about calorie content of food, estimate calories, protein, carbs, and fats clearly.
4. Keep answers friendly, practical, structured, and easy for patients to read. Include disclaimer for severe medical concerns.
`;

    const contents = [
      { role: 'user', parts: [{ text: `${systemPrompt}\n\nPatient asks: ${message}` }] }
    ];

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents
    });

    return {
      reply: response.text,
      configured: true
    };
  } catch (err) {
    console.error('[Gemini Chat] Error:', err.message);
    return {
      reply: `Sorry, I encountered an issue connecting to Gemini: ${err.message}. Please check your API key and network connection.`,
      configured: false,
      error: err.message
    };
  }
}

/**
 * Quick Food & Meal Calorie / Macro Analyzer
 */
export async function analyzeMealCalories({ mealDescription, patientContext = {} }) {
  const ai = getAiClient();
  if (!ai) {
    return {
      meal: mealDescription,
      estimatedCalories: 450,
      macros: { proteinG: 22, carbsG: 45, fatsG: 18 },
      interactionWarning: 'Configure Gemini API Key for deep clinical meal analysis.',
      verdict: 'Standard healthy meal estimate.'
    };
  }

  try {
    const medList = (patientContext.medications || []).map(m => typeof m === 'object' ? m.name : m).join(', ');
    const condList = (patientContext.conditions || []).join(', ');

    const prompt = `
Analyze the following meal for a patient with conditions [${condList}] taking medications [${medList}]:
Meal: "${mealDescription}"

Return ONLY a JSON object:
{
  "meal": "${mealDescription}",
  "estimatedCalories": number,
  "macros": { "proteinG": number, "carbsG": number, "fatsG": number, "fiberG": number, "sodiumMg": number },
  "diabeticFriendly": boolean,
  "heartHealthy": boolean,
  "interactionWarning": string,
  "verdict": string,
  "tips": [string]
}
`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: { responseMimeType: 'application/json' }
    });

    return JSON.parse(response.text);
  } catch (err) {
    return {
      meal: mealDescription,
      estimatedCalories: 400,
      macros: { proteinG: 20, carbsG: 40, fatsG: 15 },
      interactionWarning: 'Could not perform AI meal analysis: ' + err.message,
      verdict: 'General estimate.'
    };
  }
}
