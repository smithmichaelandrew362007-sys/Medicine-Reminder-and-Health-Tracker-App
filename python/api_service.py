"""
CareSync Python Microservice API
Lightweight HTTP service using Python's standard library.
Provides biometrics calculation, age derivation from calendar dates, 
and nutritional caloric planning.
"""

from http.server import HTTPServer, BaseHTTPRequestHandler
import json
import sys
from datetime import date
from health_calculator import HealthMetricsCalculator


class CareSyncApiHandler(BaseHTTPRequestHandler):
    def _send_cors_headers(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")

    def do_OPTIONS(self):
        self.send_response(200)
        self._send_cors_headers()
        self.end_headers()

    def do_GET(self):
        if self.path == "/" or self.path == "/health":
            self.send_response(200)
            self._send_cors_headers()
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            response = {
                "service": "CareSync Python Biometrics & Nutrition Engine",
                "status": "healthy",
                "python_version": sys.version.split()[0],
                "endpoints": {
                    "POST /api/biometrics/calculate": "Calculates age, BMI, BMR, TDEE & Caloric plan from birthdate & biometrics"
                }
            }
            self.wfile.write(json.dumps(response).encode("utf-8"))
        else:
            self.send_response(404)
            self.end_headers()

    def do_POST(self):
        if self.path == "/api/calendar/analyze-dob":
            content_length = int(self.headers.get("Content-Length", 0))
            body = self.rfile.read(content_length).decode("utf-8")
            try:
                data = json.loads(body) if body else {}
                birth_date = data.get("birth_date", "1961-06-15")
                result = HealthMetricsCalculator.analyze_birth_date(birth_date)

                self.send_response(200)
                self._send_cors_headers()
                self.send_header("Content-Type", "application/json")
                self.end_headers()
                self.wfile.write(json.dumps({"success": True, "data": result}).encode("utf-8"))
            except Exception as e:
                self.send_response(400)
                self._send_cors_headers()
                self.send_header("Content-Type", "application/json")
                self.end_headers()
                self.wfile.write(json.dumps({"success": False, "error": str(e)}).encode("utf-8"))

        elif self.path == "/api/biometrics/calculate":
            content_length = int(self.headers.get("Content-Length", 0))
            body = self.rfile.read(content_length).decode("utf-8")
            
            try:
                data = json.loads(body) if body else {}
                birth_date = data.get("birth_date", "1953-06-15")
                gender = data.get("gender", "Female")
                height_cm = float(data.get("height_cm", 164.0))
                weight_kg = float(data.get("weight_kg", 68.0))
                target_weight_kg = float(data.get("target_weight_kg", 65.0))
                activity_level = data.get("activity_level", "light")
                health_goal = data.get("health_goal", "maintenance")

                result = HealthMetricsCalculator.compute_full_profile(
                    birth_date=birth_date,
                    gender=gender,
                    height_cm=height_cm,
                    weight_kg=weight_kg,
                    target_weight_kg=target_weight_kg,
                    activity_level=activity_level,
                    health_goal=health_goal
                )

                self.send_response(200)
                self._send_cors_headers()
                self.send_header("Content-Type", "application/json")
                self.end_headers()
                self.wfile.write(json.dumps({"success": True, "data": result}).encode("utf-8"))

            except Exception as e:
                self.send_response(400)
                self._send_cors_headers()
                self.send_header("Content-Type", "application/json")
                self.end_headers()
                self.wfile.write(json.dumps({"success": False, "error": str(e)}).encode("utf-8"))
        else:
            self.send_response(404)
            self.end_headers()


def run(port: int = 5050):
    server_address = ("127.0.0.1", port)
    httpd = HTTPServer(server_address, CareSyncApiHandler)
    print(f"[Python Service] Running CareSync Python API on http://127.0.0.1:{port}")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\n[Python Service] Shutting down.")
        httpd.server_close()


if __name__ == "__main__":
    port = 5050
    if len(sys.argv) > 1:
        try:
            port = int(sys.argv[1])
        except ValueError:
            pass
    run(port)
