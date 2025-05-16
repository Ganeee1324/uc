from datetime import timedelta
import database
from flask import Flask, jsonify, request
from dotenv import load_dotenv
import os
from psycopg.errors import UniqueViolation
import hashlib
from db_errors import NotFoundException, UnauthorizedError, ForbiddenError

from flask_jwt_extended import JWTManager, create_access_token, jwt_required, get_jwt_identity
import uuid

load_dotenv()

# Check if JWT secret key exists in environment
jwt_secret_key = os.getenv("JWT_SECRET_KEY")
if not jwt_secret_key:
    # Fallback to a default key for development (not recommended for production)
    jwt_secret_key = "your-fallback-secret-key-here"
    print("Warning: Using default JWT secret key. This is not secure for production.")

app = Flask(__name__)

app.config["JWT_SECRET_KEY"] = jwt_secret_key
app.config["JWT_VERIFY_SUB"] = False
app.config["JWT_ACCESS_TOKEN_EXPIRES"] = timedelta(days=30)
jwt = JWTManager(app)

# file folder
files_folder = os.getenv("FILES_FOLDER")
if not files_folder:
    files_folder = "files"
    print("Warning: Using default files folder. This is not secure for production.")

files_folder_path = os.path.join(os.path.dirname(__file__), files_folder)
os.makedirs(files_folder_path, exist_ok=True)

# ---------------------------------------------
# Error handlers
# ---------------------------------------------


@app.errorhandler(Exception)
def handle_exception(e):
    return jsonify({"error": "internal_server_error", "msg": str(e)}), 500


@app.errorhandler(ForbiddenError)
def forbidden_error(e):
    return jsonify({"error": "forbidden", "msg": str(e)}), 403


@app.errorhandler(NotFoundException)
def not_found_error(e):
    return jsonify({"error": "not_found", "msg": str(e)}), 404


@app.errorhandler(UniqueViolation)
def unique_violation_error(e):
    diag = e.diag
    if diag.constraint_name == "users_email_key":
        return jsonify({"error": "email_already_exists", "msg": "Email already exists"}), 409
    elif diag.constraint_name == "users_username_key":
        return jsonify({"error": "username_already_exists", "msg": "Username already exists"}), 409
    elif diag.constraint_name == "vetrina_subscriptions_pkey":
        return jsonify({"error": "already_subscribed", "msg": "User already subscribed to this vetrina"}), 309
    else:
        return jsonify({"error": "unique_violation", "msg": f"Unique violation error on constraint {diag.constraint_name}"}), 500


@app.errorhandler(UnauthorizedError)
def unauthorized_error(e):
    return jsonify({"error": "unauthorized", "msg": str(e)}), 401


# ---------------------------------------------
# User routes
# ---------------------------------------------


@app.route("/register", methods=["POST"])
def register():
    data = request.json
    user = database.create_user(
        data.get("username"),
        data.get("email"),
        data.get("password"),
        data.get("name"),
        data.get("surname"),
    )
    access_token = create_access_token(identity=user.id)
    return jsonify({"access_token": access_token}), 200


@app.route("/login", methods=["POST"])
def login():
    data = request.json
    email = data.get("email")
    password = data.get("password")

    user = database.verify_user(email, password)
    access_token = create_access_token(identity=user.id)
    return jsonify({"access_token": access_token}), 200


# ---------------------------------------------
# Vetrina routes
# ---------------------------------------------


@app.route("/vetrine/<int:vetrina_id>", methods=["GET"])
@jwt_required()
def get_vetrina(vetrina_id):
    return jsonify(database.get_vetrina_by_id(vetrina_id).to_dict()), 200


# subscribe to vetrina
@app.route("/vetrine/<int:vetrina_id>/subscriptions", methods=["POST"])
@jwt_required()
def subscribe_to_vetrina(vetrina_id):
    user_id = get_jwt_identity()
    database.subscribe_to_vetrina(user_id, vetrina_id)
    return jsonify({"msg": "Subscribed to vetrina"}), 200


# unsubscribe from vetrina
@app.route("/vetrine/<int:vetrina_id>/subscriptions", methods=["DELETE"])
@jwt_required()
def unsubscribe_from_vetrina(vetrina_id):
    user_id = get_jwt_identity()
    database.unsubscribe_from_vetrina(user_id, vetrina_id)
    return jsonify({"msg": "Unsubscribed from vetrina"}), 200


@app.route("/vetrine", methods=["GET"])
@jwt_required()
def search_vetrine():
    # Create a dictionary of search parameters from query args
    search_params = {}
    for key, value in request.args.items():
        if key in ["name", "course_code", "course_name", "faculty"]:
            if value and value.strip():  # Check if value exists and is not just whitespace
                search_params[key] = value.strip()

    # Perform the search
    results = database.search_vetrine(search_params)
    return jsonify({"vetrine": [vetrina.to_dict() for vetrina in results], "count": len(results)}), 200


@app.route("/vetrine/<int:vetrina_id>/files", methods=["POST"])
@jwt_required()
def upload_file(vetrina_id):
    requester_id = get_jwt_identity()
    file = request.files["file"]
    new_file_name = "-".join([str(uuid.uuid4()), str(requester_id), file.filename])
    new_file_path = os.path.join(files_folder_path, new_file_name)
    if os.path.exists(new_file_path):
        return jsonify({"error": "file_already_exists", "msg": "File already exists"}), 500
    db_file = database.add_file_to_vetrina(requester_id, vetrina_id, new_file_name, hashlib.sha256(file.read()).hexdigest())
    try:
        file.save(new_file_path)
    except Exception as e:
        try:
            os.remove(new_file_path)
        except Exception as e:
            print(f"Error deleting file: {e}")
        try:
            database.delete_file(requester_id, db_file.id)
        except Exception as e:
            print(f"Error deleting file from database: {e}")
        return jsonify({"error": "save_failed", "msg": str(e)}), 500
    file.close()
    return jsonify({"msg": "File uploaded"}), 200


@app.route("/files/<int:file_id>", methods=["DELETE"])
@jwt_required()
def delete_file(file_id):
    user_id = get_jwt_identity()
    db_file = database.delete_file(user_id, file_id)
    try:
        os.remove(os.path.join(files_folder_path, db_file.filename))
    except Exception as e:
        print(f"Error deleting file: {e}")
    return jsonify({"msg": "File deleted"}), 200


@app.route("/vetrine/<int:vetrina_id>/files", methods=["GET"])
@jwt_required()
def get_files_for_vetrina(vetrina_id):
    files = database.get_files_from_vetrina(vetrina_id)
    return jsonify({"files": [file.to_dict() for file in files]}), 200


@app.route("/files/<int:file_id>", methods=["GET"])
@jwt_required()
def get_file(file_id):
    file = database.get_file(file_id)
    return jsonify(file.to_dict()), 200


# ---------------------------------------------
# Courses routes
# ---------------------------------------------


# get faculties and courses
@app.route("/hierarchy", methods=["GET"])
def get_hierarchy():
    # if database.faculties_courses_cache is None:
    database.faculties_courses_cache = database.scrape_faculties_courses()
    return jsonify(database.faculties_courses_cache), 200


if __name__ == "__main__":
    app.run(debug=True)
