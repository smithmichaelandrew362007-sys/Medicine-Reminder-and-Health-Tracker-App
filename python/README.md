# CareSync Python Health & Clinical Nutrition Module

This Python companion module provides clinical calculations for patient biometrics, calendar-based date of birth to age conversion, and personalized dietary/macronutrient planning.

---

## 🚀 Features

- **Calendar Date of Birth to Age**: Accurate years, months, and days calculated from any standard date format (`YYYY-MM-DD`).
- **Body Mass Index (BMI)**: AHA/WHO classification, prime ratio, and clinical risk evaluation.
- **Basal Metabolic Rate (BMR)**: Clinical Mifflin-St Jeor formula calibrated for biological sex.
- **Total Daily Energy Expenditure (TDEE)**: Physical activity coefficient multipliers.
- **Macronutrient Blueprints**: Precision grams & calorie targets for Protein, Carbohydrates, and Healthy Fats.

---

## 💻 How to Run

### 1. Interactive CLI Calculation

Run the health calculator script directly using Python:
```bash
py python/health_calculator.py
```

### 2. Run the Python HTTP Microservice

Start the built-in HTTP API on `http://127.0.0.1:5050` (zero external pip packages required!):
```bash
py python/api_service.py
```

#### Test Endpoint (`GET /health`):
```bash
curl http://127.0.0.1:5050/health
```

#### Calculate Biometrics Endpoint (`POST /api/biometrics/calculate`):
```bash
curl -X POST http://127.0.0.1:5050/api/biometrics/calculate \
  -H "Content-Type: application/json" \
  -d '{
    "birth_date": "1953-06-15",
    "gender": "Female",
    "height_cm": 164,
    "weight_kg": 68,
    "target_weight_kg": 65,
    "activity_level": "light",
    "health_goal": "weight_loss"
  }'
```

### 3. Import in Your Own Python Scripts

```python
from python.health_calculator import HealthMetricsCalculator

profile = HealthMetricsCalculator.compute_full_profile(
    birth_date="1953-06-15",
    gender="Female",
    height_cm=164,
    weight_kg=68,
    target_weight_kg=65
)

print(profile["bmi"])
print(profile["caloric_blueprint"])
```
