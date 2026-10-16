"""
CareSync Health & Nutrition Biometrics Engine (Python Companion Module)
Calculates exact age from calendar dates, BMI, BMR (Mifflin-St Jeor), 
TDEE, and clinical macronutrient targets.
"""

from datetime import datetime, date
import calendar
import json
import sys


class HealthMetricsCalculator:
    """Core clinical calculator for patient biometrics, calendar intelligence and nutrition planning."""

    @staticmethod
    def get_zodiac(month: int, day: int) -> dict:
        """Determines western astrological sign, symbol, and element."""
        zodiacs = [
            (1, 20, "Capricorn", "♑", "Earth"),
            (2, 19, "Aquarius", "♒", "Air"),
            (3, 20, "Pisces", "♓", "Water"),
            (4, 20, "Aries", "♈", "Fire"),
            (5, 21, "Taurus", "♉", "Earth"),
            (6, 21, "Gemini", "♊", "Air"),
            (7, 23, "Cancer", "♋", "Water"),
            (8, 23, "Leo", "♌", "Fire"),
            (9, 23, "Virgo", "♍", "Earth"),
            (10, 23, "Libra", "♎", "Air"),
            (11, 22, "Scorpio", "♏", "Water"),
            (12, 22, "Sagittarius", "♐", "Fire"),
            (12, 31, "Capricorn", "♑", "Earth")
        ]
        for m, d, sign, icon, elem in zodiacs:
            if month < m or (month == m and day <= d):
                return {"sign": sign, "icon": icon, "element": elem, "display": f"{icon} {sign} ({elem})"}
        return {"sign": "Capricorn", "icon": "♑", "element": "Earth", "display": "♑ Capricorn (Earth)"}

    @staticmethod
    def get_chinese_zodiac(year: int) -> dict:
        """Calculates Chinese Lunar animal sign based on 12-year cycle."""
        animals = [
            ("Rat", "🐀"), ("Ox", "🐂"), ("Tiger", "🐅"), ("Rabbit", "🐇"),
            ("Dragon", "🐉"), ("Snake", "🐍"), ("Horse", "🐎"), ("Goat", "🐐"),
            ("Monkey", "🐒"), ("Rooster", "🐓"), ("Dog", "🐕"), ("Pig", "🐖")
        ]
        idx = (year - 1900) % 12
        name, icon = animals[idx]
        return {"animal": name, "icon": icon, "display": f"{icon} Year of the {name}"}

    @staticmethod
    def get_generation(year: int) -> dict:
        """Identifies sociological generational cohort."""
        if year < 1928:
            return {"name": "Greatest Generation", "icon": "🏛️", "desc": "Born before 1928"}
        elif 1928 <= year <= 1945:
            return {"name": "Silent Generation", "icon": "📻", "desc": "1928 – 1945"}
        elif 1946 <= year <= 1964:
            return {"name": "Baby Boomer", "icon": "👶", "desc": "1946 – 1964"}
        elif 1965 <= year <= 1980:
            return {"name": "Generation X", "icon": "📼", "desc": "1965 – 1980"}
        elif 1981 <= year <= 1996:
            return {"name": "Millennial (Gen Y)", "icon": "💻", "desc": "1981 – 1996"}
        elif 1997 <= year <= 2012:
            return {"name": "Generation Z", "icon": "📱", "desc": "1997 – 2012"}
        else:
            return {"name": "Generation Alpha", "icon": "🚀", "desc": "2013 – Present"}

    @classmethod
    def analyze_birth_date(cls, birth_date: str | date) -> dict:
        """Full astronomical, chronological and clinical analysis of birth date."""
        if isinstance(birth_date, str):
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

        age_dict = cls.calculate_age(b_date)
        years = age_dict["years"]
        months = age_dict["months"]
        days = age_dict["days"]
        total_days = age_dict["total_days_lived"]

        weekday_name = b_date.strftime("%A")
        month_name = b_date.strftime("%B")

        try:
            next_bday = date(today.year, b_date.month, b_date.day)
            if next_bday < today:
                next_bday = date(today.year + 1, b_date.month, b_date.day)
        except ValueError:
            next_bday = date(today.year, 3, 1) if date(today.year, 3, 1) >= today else date(today.year + 1, 3, 1)

        days_until_next = (next_bday - today).days

        if years >= 65:
            guidance = "Priority: DEXA bone scan, cardiac rhythm checks, shingles & pneumococcal vaccination, fall safety."
            life_stage = "Senior / Golden Years"
            stage_icon = "🌟"
        elif years >= 50:
            guidance = "Priority: Colorectal health, blood pressure baseline, mammogram/prostate check, cholesterol panel."
            life_stage = "Mature Adult"
            stage_icon = "🌿"
        elif years >= 30:
            guidance = "Priority: Fasting blood glucose, metabolic panel, active cardiovascular endurance, stress balance."
            life_stage = "Prime Adult"
            stage_icon = "💪"
        else:
            guidance = "Priority: Nutritional baseline, hydration habit, preventative wellness and postural health."
            life_stage = "Young Adult"
            stage_icon = "⚡"

        return {
            "iso_date": b_date.isoformat(),
            "display_date": f"{b_date.day} {month_name} {b_date.year}",
            "full_long_date": f"{weekday_name}, {month_name} {b_date.day}, {b_date.year}",
            "year": b_date.year,
            "month": b_date.month,
            "month_name": month_name,
            "day": b_date.day,
            "day_of_week": weekday_name,
            "day_of_year": b_date.timetuple().tm_yday,
            "is_leap_year": calendar.isleap(b_date.year),
            "age": {
                "years": years,
                "months": months,
                "days": days,
                "total_days_lived": total_days,
                "total_weeks_lived": round(total_days / 7, 1),
                "total_hours_lived": total_days * 24,
                "display": f"{years} years old",
                "detailed_display": f"{years} yrs, {months} mos, {days} days"
            },
            "zodiac": cls.get_zodiac(b_date.month, b_date.day),
            "chinese_zodiac": cls.get_chinese_zodiac(b_date.year),
            "generation": cls.get_generation(b_date.year),
            "next_birthday": {
                "date": next_bday.isoformat(),
                "days_remaining": days_until_next,
                "day_of_week": next_bday.strftime("%A"),
                "turning_age": years + 1,
                "display": f"In {days_until_next} days ({next_bday.strftime('%A')})"
            },
            "clinical_guidance": {
                "life_stage": life_stage,
                "stage_icon": stage_icon,
                "recommendation": guidance
            }
        }

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
    
    if len(sys.argv) > 1 and sys.argv[1] == "--analyze":
        dob = sys.argv[2] if len(sys.argv) > 2 else "1953-06-15"
        try:
            analysis = HealthMetricsCalculator.analyze_birth_date(dob)
            print(json.dumps({"success": True, "data": analysis}))
        except Exception as err:
            print(json.dumps({"success": False, "error": str(err)}))
        sys.exit(0)

    main()
