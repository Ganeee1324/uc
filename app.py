from datetime import timedelta
from database import create_user, verify_user
from flask import Flask, jsonify, request
from dotenv import load_dotenv
import os
from psycopg.errors import UniqueViolation
from db_errors import UnauthorizedError

from flask_jwt_extended import JWTManager, create_access_token, jwt_required, get_jwt_identity

load_dotenv()

# Check if JWT secret key exists in environment
jwt_secret_key = os.getenv("JWT_SECRET_KEY")
if not jwt_secret_key:
    # Fallback to a default key for development (not recommended for production)
    jwt_secret_key = "your-fallback-secret-key-here"
    print("Warning: Using default JWT secret key. This is not secure for production.")

app = Flask(__name__)

app.config["JWT_SECRET_KEY"] = jwt_secret_key
app.config["JWT_ACCESS_TOKEN_EXPIRES"] = timedelta(days=30)
jwt = JWTManager(app)


@app.errorhandler(Exception)
def handle_exception(e):
    return jsonify({"error": "internal_server_error", "message": str(e)}), 500


@app.errorhandler(UniqueViolation)
def unique_violation_error(e):
    diag = e.diag
    if diag.constraint_name == "users_email_key":
        return jsonify({"error": "email_already_exists", "message": "Email already exists"}), 400
    elif diag.constraint_name == "users_username_key":
        return jsonify({"error": "username_already_exists", "message": "Username already exists"}), 400
    else:
        return jsonify({"error": "unique_violation", "message": f"Unique violation error on constraint {diag.constraint_name}"}), 500


@app.errorhandler(UnauthorizedError)
def unauthorized_error(e):
    return jsonify({"error": "unauthorized", "message": str(e)}), 401


@app.route("/register", methods=["POST"])
def register():
    data = request.json
    email = data.get("email")
    password = data.get("password")
    username = data.get("username")
    user = create_user(username, email, password)
    access_token = create_access_token(identity=user.id)
    return jsonify({"access_token": access_token}), 200


@app.route("/login", methods=["POST"])
def login():
    data = request.json
    email = data.get("email")
    password = data.get("password")

    user = verify_user(email, password)
    access_token = create_access_token(identity=user.id)
    return jsonify({"access_token": access_token}), 200


if __name__ == "__main__":
    app.run(debug=True)
