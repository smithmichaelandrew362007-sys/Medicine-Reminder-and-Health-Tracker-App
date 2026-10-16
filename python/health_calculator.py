"""
CareSync Health & Nutrition Biometrics Engine (Python Companion Module)
Calculates exact age from calendar dates, BMI, BMR (Mifflin-St Jeor), 
TDEE, and clinical macronutrient targets.
"""

from datetime import datetime, date
import json
import sys


class HealthMetricsCalculator:
    """Core clinical calculator for patient biometrics and nutrition planning."""

    @staticmethod
    def calculate_age(birth_date: str | date) -> dict:
        """
        Calculates exact age from a calendar birth date string (YYYY-MM-DD) or date object.
        Returns exact years, months, days, and total days lived.
        """
        if isinstance(birth_date, str):
            # Parse multiple common date formats
            for fmt in ("%Y-%m-%d", "%d/%m/%Y", "%m/%d/%Y", "%Y/%m/%d"):
                try:
                    b_date = datetime.strptime(birth_date.strip(), fmt).date()
                    break
                except ValueError:
                    continue
            else:
                raise ValueError(f"Unable to parse birth date: '{birth_date}'. Please use YYYY-MM-DD.")
        else:
            b_date = birth_date

        today = date.today()
        if b_date > today:
            raise ValueError("Birth date cannot be in the future.")

        years = today.year - b_date.year
        months = today.month - b_date.month
        days = today.day - b_date.day

        if days < 0:
            months -= 1
            # Days in previous month
            prev_month = today.month - 1 or 12
            prev_year = today.year if prev_month != 12 else today.year - 1
            days_in_prev_month = (date(today.year, today.month, 1) - date(prev_year, prev_month, 1)).days
            days += days_in_prev_month

        if months < 0:
            years -= 1
            months += 12

        total_days = (today - b_date).days

        return {
            "years": years,
            "months": months,
            "days": days,
            "total_days_lived": total_days,
            "display": f"{years} years, {months} months"
        }

    @staticmethod
    def calculate_bmi(weight_kg: float, height_cm: float) -> dict:
        """
        Calculates Body Mass Index (BMI) and AHA/WHO clinical category.
        Formula: BMI = weight (kg) / (height in m)^2
        """
        if height_cm <= 0 or weight_kg <= 0:
            raise ValueError("Height and weight must be positive numbers.")

        height_m = height_cm / 100.0
        bmi_value = round(weight_kg / (height_m ** 2), 1)

        if bmi_value < 18.5:
            category = "Underweight"
            color = "#3b82f6"
            risk = "Risk of nutritional deficiency"
        elif 18.5 <= bmi_value < 25.0:
            category = "Normal Weight"
            color = "#10b981"
            risk = "Lowest health risk category"
        elif 25.0 <= bmi_value < 30.0:
            category = "Overweight"
            color = "#f59e0b"
            risk = "Elevated risk of cardiovascular stress & insulin resistance"
        else:
            category = "Obesity Range"
            color = "#ef4444"
            risk = "Clinical obesity - medical supervision advised"

        # Prime BMI (ratio to upper normal limit of 25)
        bmi_prime = round(bmi_value / 25.0, 2)

        return {
            "bmi": bmi_value,
            "category": category,
            "color_code": color,
            "clinical_notes": risk,
            "bmi_prime": bmi_prime
        }

    @staticmethod
    def calculate_bmr(gender: str, weight_kg: float, height_cm: float, age_years: int) -> int:
        """
        Mifflin-St Jeor equation for Basal Metabolic Rate (BMR):
        Men:   BMR = (10 × weight_kg) + (6.25 × height_cm) - (5 × age) + 5
        Women: BMR = (10 × weight_kg) + (6.25 × height_cm) - (5 × age) - 161
        """
        base = (10.0 * weight_kg) + (6.25 * height_cm) - (5.0 * age_years)
        is_male = gender.strip().lower().startswith("m")
        bmr = base + 5.0 if is_male else base - 161.0
        return max(800, round(bmr))

    @staticmethod
    def calculate_tdee(bmr: int, activity_level: str = "light") -> int:
        """Total Daily Energy Expenditure (TDEE) based on activity factor."""
        multipliers = {
            "sedentary": 1.2,
            "light": 1.375,
            "moderate": 1.55,
            "active": 1.725,
            "very_active": 1.9
        }
        factor = multipliers.get(activity_level.lower(), 1.375)
        return round(bmr * factor)

    @classmethod
    def compute_full_profile(
        cls,
        birth_date: str,
        gender: str,
        height_cm: float,
        weight_kg: float,
        target_weight_kg: float = None,
        activity_level: str = "light",
        health_goal: str = "maintenance"
    ) -> dict:
        """Generates a comprehensive clinical health & nutritional profile."""
        age_info = cls.calculate_age(birth_date)
        age = age_info["years"]
        bmi_info = cls.calculate_bmi(weight_kg, height_cm)
        bmr = cls.calculate_bmr(gender, weight_kg, height_cm, age)
        tdee = cls.calculate_tdee(bmr, activity_level)

        if target_weight_kg is None:
            target_weight_kg = weight_kg

        # Goal calorie calibration
        if health_goal == "weight_loss":
            recommended_calories = max(1200, tdee - 450)
            reason = "Prescribed with a safe 450 kcal deficit calibrated for steady fat reduction."
        elif health_goal == "weight_gain":
            recommended_calories = tdee + 400
            reason = "Prescribed with a 400 kcal surplus for healthy lean mass accretion."
        elif health_goal == "diabetic_control":
            recommended_calories = max(1200, tdee - 250)
            reason = "Prescribed with low glycemic carb distribution and controlled calories."
        elif health_goal == "heart_health":
            recommended_calories = max(1200, tdee - 200)
            reason = "DASH protocol caloric balance with low sodium emphasis."
        else:
            recommended_calories = tdee
            reason = "Maintenance balance for steady daily energy and metabolic homeostasis."

        # Macronutrient distributions (grams)
        # Protein: 4 kcal/g, Carbs: 4 kcal/g, Fat: 9 kcal/g
        protein_g = round((recommended_calories * 0.25) / 4)
        carbs_g = round((recommended_calories * 0.45) / 4)
        fats_g = round((recommended_calories * 0.30) / 9)

        # Imperial equivalents
        height_inches = height_cm / 2.54
        feet = int(height_inches // 12)
        inches = round(height_inches % 12)
        weight_lbs = round(weight_kg * 2.20462, 1)
        target_weight_lbs = round(target_weight_kg * 2.20462, 1)

        return {
            "calendar_dob": str(birth_date),
            "age": age_info,
            "gender": gender,
            "metrics": {
                "height_cm": height_cm,
                "height_display": f"{height_cm} cm ({feet}' {inches}\")",
                "weight_kg": weight_kg,
                "weight_display": f"{weight_kg} kg ({weight_lbs} lbs)",
                "target_weight_kg": target_weight_kg,
                "target_weight_display": f"{target_weight_kg} kg ({target_weight_lbs} lbs)",
            },
            "bmi": bmi_info,
            "caloric_blueprint": {
                "bmr_kcal": bmr,
                "tdee_kcal": tdee,
                "recommended_daily_calories": recommended_calories,
                "goal_strategy": reason,
                "macros": {
                    "protein": {"grams": protein_g, "kcal": protein_g * 4, "pct": 25},
                    "carbohydrates": {"grams": carbs_g, "kcal": carbs_g * 4, "pct": 45},
                    "healthy_fats": {"grams": fats_g, "kcal": fats_g * 9, "pct": 30}
                }
            }
        }


def main():
    print("=" * 64)
    print("  CareSync Python Health & Clinical Nutrition Engine")
    print("=" * 64)

    # Demo Eleanor Vance profile
    sample_dob = "1953-06-15"
    sample_gender = "Female"
    sample_height = 164.0
    sample_weight = 68.0
    sample_target = 65.0

    print(f"\n[DEMO PATIENT]: Eleanor Vance")
    print(f"Date of Birth: {sample_dob}")
    print(f"Height: {sample_height} cm | Weight: {sample_weight} kg | Target: {sample_target} kg")
    
    result = HealthMetricsCalculator.compute_full_profile(
        birth_date=sample_dob,
        gender=sample_gender,
        height_cm=sample_height,
        weight_kg=sample_weight,
        target_weight_kg=sample_target,
        activity_level="light",
        health_goal="weight_loss"
    )

    print("\n[OK] CareSync Python Health Engine calculation completed successfully.")


if __name__ == "__main__":
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8")
    main()
