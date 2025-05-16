import requests
import json
import sys
import os

# Add parent directory to path to import modules
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import database
from app import app

# Test configuration
BASE_URL = "http://localhost:5000"
TEST_USER = {
    "username": "testuser",
    "name": "Test",
    "surname": "User",
    "email": "test@example.com",
    "password": "password123"
}

def setup():
    """Set up test data - create user, course instance, and vetrine"""
    print("Setting up test data...")

    database.create_tables()
    
    # Create test user using the API
    try:
        response = requests.post(
            f"{BASE_URL}/register",
            json={
                "username": TEST_USER["username"],
                "name": TEST_USER["name"],
                "surname": TEST_USER["surname"],
                "email": TEST_USER["email"],
                "password": TEST_USER["password"]
            }
        )
        
        if response.status_code == 200:
            print(f"Created test user: {TEST_USER['username']}")
            # Get the user from database to have the full user object
            with database.connect() as conn:
                with conn.cursor() as cursor:
                    cursor.execute("SELECT id FROM users WHERE email = %s", (TEST_USER["email"],))
                    user_id = cursor.fetchone()[0]
                    user = database.get_user_by_id(user_id)
        else:
            # User might already exist, try to get it
            print(f"User registration error (might already exist): {response.text}")
            with database.connect() as conn:
                with conn.cursor() as cursor:
                    cursor.execute("SELECT id FROM users WHERE email = %s", (TEST_USER["email"],))
                    user_id = cursor.fetchone()[0]
                    user = database.get_user_by_id(user_id)
                    print(f"Using existing user: {user.username} (ID: {user.id})")
    except Exception as e:
        # Handle any other errors
        print(f"Error during user setup: {e}")
        # Try to get the user if it exists
        with database.connect() as conn:
            with conn.cursor() as cursor:
                cursor.execute("SELECT id FROM users WHERE email = %s", (TEST_USER["email"],))
                result = cursor.fetchone()
                if result:
                    user_id = result[0]
                    user = database.get_user_by_id(user_id)
                    print(f"Using existing user: {user.username} (ID: {user.id})")
                else:
                    raise Exception("Failed to create or find test user")
    
    # Create test course instances for different faculties and course codes
    test_courses = [
        {
            "course_code": "CS101", 
            "course_name": "Introduction to Computer Science", 
            "faculty_name": "Computer Science", 
            "course_year": 1, 
            "date_year": 2023, 
            "language": "English", 
            "course_semester": "Fall", 
            "canale": "A", 
            "professors": ["Prof. Smith"]
        },
        {
            "course_code": "MATH201", 
            "course_name": "Linear Algebra", 
            "faculty_name": "Mathematics", 
            "course_year": 2, 
            "date_year": 2023, 
            "language": "English", 
            "course_semester": "Spring", 
            "canale": "B", 
            "professors": ["Prof. Johnson"]
        },
        {
            "course_code": "ENG303", 
            "course_name": "Technical Writing", 
            "faculty_name": "Engineering", 
            "course_year": 3, 
            "date_year": 2023, 
            "language": "English", 
            "course_semester": "Fall", 
            "canale": "C", 
            "professors": ["Prof. Williams"]
        }
    ]
    
    created_courses = []
    with database.connect() as conn:
        with conn.cursor() as cursor:
            for course_data in test_courses:
                cursor.execute(
                    """
                    INSERT INTO course_instances 
                    (course_code, course_name, faculty_name, course_year, date_year, language, course_semester, canale, professors)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
                    ON CONFLICT (course_code, faculty_name, canale) DO UPDATE 
                    SET course_name = EXCLUDED.course_name
                    RETURNING id
                    """,
                    (
                        course_data["course_code"], 
                        course_data["course_name"], 
                        course_data["faculty_name"], 
                        course_data["course_year"], 
                        course_data["date_year"], 
                        course_data["language"], 
                        course_data["course_semester"], 
                        course_data["canale"], 
                        course_data["professors"]
                    )
                )
                course_id = cursor.fetchone()[0]
                conn.commit()
                course = database.get_course_by_id(course_id)
                created_courses.append(course)
                print(f"Created/updated course: {course.course_name} (ID: {course.instance_id})")
    
    # Create test vetrine with different names for search testing
    vetrine_data = [
        {"name": "Python Programming", "description": "Resources for Python programming", "course_id": created_courses[0].instance_id},
        {"name": "Data Structures", "description": "Materials about data structures", "course_id": created_courses[0].instance_id},
        {"name": "Linear Algebra Notes", "description": "Complete notes for Linear Algebra", "course_id": created_courses[1].instance_id},
        {"name": "Math Programming", "description": "Programming applications in mathematics", "course_id": created_courses[1].instance_id},
        {"name": "Technical Writing Guide", "description": "Guide for technical documentation", "course_id": created_courses[2].instance_id}
    ]
    
    created_vetrine = []
    for data in vetrine_data:
        try:
            vetrina = database.create_vetrina(
                user.id, 
                data["course_id"], 
                data["name"], 
                data["description"]
            )
            created_vetrine.append(vetrina)
            print(f"Created vetrina: {vetrina.name} (ID: {vetrina.id}) for course ID: {data['course_id']}")
        except Exception as e:
            print(f"Error creating vetrina {data['name']}: {e}")
    
    return user, created_courses, created_vetrine

def get_auth_token(email, password):
    """Get JWT auth token for API requests"""
    response = requests.post(
        f"{BASE_URL}/login",
        json={"email": email, "password": password}
    )
    
    if response.status_code != 200:
        print(f"Login failed: {response.text}")
        return None
    
    return response.json()["access_token"]

def test_get_all_vetrine(token):
    """Test getting all vetrine (first 100)"""
    print("\nTesting get all vetrine...")
    
    headers = {"Authorization": f"Bearer {token}"}
    response = requests.get(f"{BASE_URL}/vetrine", headers=headers)
    
    if response.status_code != 200:
        print(f"Error: {response.status_code} - {response.text}")
        return False
    
    data = response.json()
    print(f"Found {data['count']} vetrine")
    
    if data['count'] > 0:
        print(f"Sample vetrina: {data['vetrine'][0]['name']}")
    
    return True

def test_search_by_name(token, search_term, expected_count=None):
    """Test searching vetrine by name"""
    print(f"\nTesting search by name: '{search_term}'...")
    
    headers = {"Authorization": f"Bearer {token}"}
    response = requests.get(
        f"{BASE_URL}/vetrine?name={search_term}", 
        headers=headers
    )
    
    if response.status_code != 200:
        print(f"Error: {response.status_code} - {response.text}")
        return False
    
    data = response.json()
    print(f"Found {data['count']} vetrine matching '{search_term}'")
    
    for vetrina in data['vetrine']:
        print(f"- {vetrina['name']}")
    
    if expected_count is not None:
        assert data['count'] == expected_count, f"Expected {expected_count} results, got {data['count']}"
        print(f"✓ Assertion passed: Found expected number of results ({expected_count})")
    
    return True

def test_search_by_course_code(token, course_code, expected_count=None):
    """Test searching vetrine by course code"""
    print(f"\nTesting search by course code: '{course_code}'...")
    
    headers = {"Authorization": f"Bearer {token}"}
    response = requests.get(
        f"{BASE_URL}/vetrine?course_code={course_code}", 
        headers=headers
    )
    
    if response.status_code != 200:
        print(f"Error: {response.status_code} - {response.text}")
        return False
    
    data = response.json()
    print(f"Found {data['count']} vetrine for course code '{course_code}'")
    
    for vetrina in data['vetrine']:
        print(f"- {vetrina['name']}")
    
    if expected_count is not None:
        assert data['count'] == expected_count, f"Expected {expected_count} results, got {data['count']}"
        print(f"✓ Assertion passed: Found expected number of results ({expected_count})")
    
    return True

def test_search_by_faculty(token, faculty, expected_count=None):
    """Test searching vetrine by faculty"""
    print(f"\nTesting search by faculty: '{faculty}'...")
    
    headers = {"Authorization": f"Bearer {token}"}
    response = requests.get(
        f"{BASE_URL}/vetrine?faculty={faculty}", 
        headers=headers
    )
    
    if response.status_code != 200:
        print(f"Error: {response.status_code} - {response.text}")
        return False
    
    data = response.json()
    print(f"Found {data['count']} vetrine for faculty '{faculty}'")
    
    for vetrina in data['vetrine']:
        print(f"- {vetrina['name']}")
    
    if expected_count is not None:
        assert data['count'] == expected_count, f"Expected {expected_count} results, got {data['count']}"
        print(f"✓ Assertion passed: Found expected number of results ({expected_count})")
    
    return True

def test_combined_search(token, params, expected_count=None):
    """Test searching vetrine with multiple parameters"""
    print(f"\nTesting combined search with params: {params}...")
    
    headers = {"Authorization": f"Bearer {token}"}
    
    # Build query string
    query_parts = []
    for key, value in params.items():
        query_parts.append(f"{key}={value}")
    query_string = "&".join(query_parts)
    
    response = requests.get(
        f"{BASE_URL}/vetrine?{query_string}", 
        headers=headers
    )
    
    if response.status_code != 200:
        print(f"Error: {response.status_code} - {response.text}")
        return False
    
    data = response.json()
    print(f"Found {data['count']} vetrine matching combined search")
    
    for vetrina in data['vetrine']:
        print(f"- {vetrina['name']}")
    
    if expected_count is not None:
        assert data['count'] == expected_count, f"Expected {expected_count} results, got {data['count']}"
        print(f"✓ Assertion passed: Found expected number of results ({expected_count})")
    
    return True

def test_get_hierarchy():
    """Test getting faculties and courses hierarchy"""
    print("\nTesting get hierarchy endpoint...")
    
    response = requests.get(f"{BASE_URL}/hierarchy")
    
    if response.status_code != 200:
        print(f"Error: {response.status_code} - {response.text}")
        return False
    
    data = response.json()
    
    # Check if we have faculties
    if not data or not isinstance(data, dict):
        print("Error: Invalid response format")
        return False
    
    print(f"Found {len(data)} faculties")
    print(f"Faculties: {data}")
    
    # Print sample data from the first faculty
    if len(data) > 0:
        faculty = list(data.keys())[0]
        print(f"Sample faculty: {faculty}")
        if 'courses' in data[faculty] and len(data[faculty]['courses']) > 0:
            print(f"Sample course: {data[faculty]['courses'][0]}")
    
    return True

def test_subscribe_to_vetrina(token, vetrina_id):
    """Test subscribing to a vetrina"""
    print(f"\nTesting subscribe to vetrina ID: {vetrina_id}...")
    
    headers = {"Authorization": f"Bearer {token}"}
    response = requests.post(
        f"{BASE_URL}/vetrine/{vetrina_id}/subscriptions", 
        headers=headers
    )
    
    if response.status_code != 200:
        print(f"Error: {response.status_code} - {response.text}")
        return False
    
    print(f"Successfully subscribed to vetrina ID: {vetrina_id}")
    return True

def test_unsubscribe_from_vetrina(token, vetrina_id):
    """Test unsubscribing from a vetrina"""
    print(f"\nTesting unsubscribe from vetrina ID: {vetrina_id}...")
    
    headers = {"Authorization": f"Bearer {token}"}
    response = requests.delete(
        f"{BASE_URL}/vetrine/{vetrina_id}/subscriptions", 
        headers=headers
    )
    
    if response.status_code != 200:
        print(f"Error: {response.status_code} - {response.text}")
        return False
    
    print(f"Successfully unsubscribed from vetrina ID: {vetrina_id}")
    return True

def test_get_vetrina_details(token, vetrina_id):
    """Test getting details of a specific vetrina"""
    print(f"\nTesting get vetrina details for ID: {vetrina_id}...")
    
    headers = {"Authorization": f"Bearer {token}"}
    response = requests.get(
        f"{BASE_URL}/vetrine/{vetrina_id}", 
        headers=headers
    )
    
    if response.status_code != 200:
        print(f"Error: {response.status_code} - {response.text}")
        return False
    
    data = response.json()
    print(f"Vetrina details: {data}")
    return True

def test_already_subscribed_case(token, vetrina_id):
    """Test the behavior when a user is already subscribed to a vetrina"""
    print(f"\nTesting 'already subscribed' case for vetrina ID: {vetrina_id}...")
    
    headers = {"Authorization": f"Bearer {token}"}
    
    # First, make sure we're subscribed
    subscribe_response = requests.post(
        f"{BASE_URL}/vetrine/{vetrina_id}/subscriptions", 
        headers=headers
    )
    
    if subscribe_response.status_code != 200:
        print(f"Error during initial subscription: {subscribe_response.status_code} - {subscribe_response.text}")
        return False
    
    # Now try to subscribe again - should return 200 with an "already_subscribed" message
    duplicate_response = requests.post(
        f"{BASE_URL}/vetrine/{vetrina_id}/subscriptions", 
        headers=headers
    )
    
    if duplicate_response.status_code != 309:
        print(f"Error: Expected status code 309 for already subscribed case, got {duplicate_response.status_code}")
        return False
    
    response_data = duplicate_response.json()
    if "error" in response_data and response_data["error"] == "already_subscribed":
        print("✓ Successfully detected 'already subscribed' case")
    else:
        print(f"Warning: Expected 'already_subscribed' error, got: {response_data}")
    
    # Clean up by unsubscribing
    requests.delete(
        f"{BASE_URL}/vetrine/{vetrina_id}/subscriptions", 
        headers=headers
    )
    
    return True

def test_file_operations(token, vetrina_id):
    """Test file upload, retrieval and deletion for a vetrina"""
    print(f"\nTesting file operations for vetrina ID: {vetrina_id}...")
    
    headers = {"Authorization": f"Bearer {token}"}
    
    # Create a test file
    test_file_path = "test_upload_file.txt"
    with open(test_file_path, "w") as f:
        f.write("This is a test file for upload testing.")
    
    try:
        # 1. Upload file
        print("Testing file upload...")
        with open(test_file_path, "rb") as f:
            files = {"file": f}
            response = requests.post(
                f"{BASE_URL}/vetrine/{vetrina_id}/files",
                headers=headers,
                files=files
            )
        
        if response.status_code != 200:
            print(f"Error uploading file: {response.status_code} - {response.text}")
            return False
        
        print("✓ File uploaded successfully")
        
        # 2. Get files for vetrina
        print("Testing get files for vetrina...")
        response = requests.get(
            f"{BASE_URL}/vetrine/{vetrina_id}/files",
            headers=headers
        )
        
        if response.status_code != 200:
            print(f"Error getting files: {response.status_code} - {response.text}")
            return False
        
        files_data = response.json()
        if not files_data["files"] or len(files_data["files"]) == 0:
            print("Error: No files found after upload")
            return False
        
        # Get the first file for testing
        file_id = files_data["files"][0]["id"]
        print(f"✓ Found {len(files_data['files'])} files, using file ID: {file_id}")
        
        # 3. Get specific file details
        print("Testing get specific file details...")
        response = requests.get(
            f"{BASE_URL}/files/{file_id}",
            headers=headers
        )
        
        if response.status_code != 200:
            print(f"Error getting file details: {response.status_code} - {response.text}")
            return False
        
        file_details = response.json()["file"]
        print(f"✓ Got file details: {file_details['filename']}")
        
        # 4. Delete file
        print("Testing file deletion...")
        response = requests.delete(
            f"{BASE_URL}/files/{file_id}",
            headers=headers
        )
        
        if response.status_code != 200:
            print(f"Error deleting file: {response.status_code} - {response.text}")
            return False
        
        print("✓ File deleted successfully")
        
        # 5. Verify file is deleted
        print("Verifying file deletion...")
        response = requests.get(
            f"{BASE_URL}/files/{file_id}",
            headers=headers
        )
        
        if response.status_code == 404:
            print("✓ File deletion verified - file no longer exists")
        else:
            print(f"Warning: File still accessible after deletion: {response.status_code} - {response.text}")
            return False
        
        return True
    
    finally:
        # Clean up test file
        if os.path.exists(test_file_path):
            os.remove(test_file_path)
            print(f"Cleaned up test file: {test_file_path}")

def test_file_upload_without_auth():
    """Test file upload without authentication"""
    print("\nTesting file upload without authentication...")
    
    # Create a test file
    test_file_path = "test_upload_file.txt"
    with open(test_file_path, "w") as f:
        f.write("This is a test file for upload testing.")
    
    try:
        # Try to upload without auth token
        with open(test_file_path, "rb") as f:
            files = {"file": f}
            response = requests.post(
                f"{BASE_URL}/vetrine/1/files",  # Using arbitrary vetrina ID
                files=files
            )
        
        if response.status_code == 401:
            print("✓ Correctly rejected unauthenticated file upload")
            return True
        else:
            print(f"Error: Expected 401 status code, got {response.status_code} - {response.text}")
            return False
    
    finally:
        # Clean up test file
        if os.path.exists(test_file_path):
            os.remove(test_file_path)

def test_file_operations_wrong_vetrina(token):
    """Test file operations with a non-existent vetrina"""
    print("\nTesting file operations with non-existent vetrina...")
    
    headers = {"Authorization": f"Bearer {token}"}
    non_existent_vetrina_id = 99999  # Assuming this ID doesn't exist
    
    # Create a test file
    test_file_path = "test_upload_file.txt"
    with open(test_file_path, "w") as f:
        f.write("This is a test file for upload testing.")
    
    try:
        # Try to upload to non-existent vetrina
        with open(test_file_path, "rb") as f:
            files = {"file": f}
            response = requests.post(
                f"{BASE_URL}/vetrine/{non_existent_vetrina_id}/files",
                headers=headers,
                files=files
            )
        
        if response.status_code == 404:
            print("✓ Correctly rejected upload to non-existent vetrina")
            return True
        else:
            print(f"Warning: Expected 404 status code, got {response.status_code} - {response.text}")
            return False
    
    finally:
        # Clean up test file
        if os.path.exists(test_file_path):
            os.remove(test_file_path)

def run_tests():
    """Run all tests"""
    # Start Flask app in a separate thread for testing
    import threading
    threading.Thread(target=lambda: app.run(debug=False, port=5000)).start()
    
    # Setup test data
    user, courses, vetrine = setup()
    
    # Get auth token
    token = get_auth_token(TEST_USER["email"], TEST_USER["password"])
    if not token:
        print("Failed to get auth token. Tests cannot continue.")
        return
    
    # Run tests with expected counts
    test_get_all_vetrine(token)
    test_search_by_name(token, "Python", expected_count=1)
    test_search_by_name(token, "Programming", expected_count=2)
    
    # Test course code searches
    test_search_by_course_code(token, "CS101", expected_count=2)
    test_search_by_course_code(token, "MATH201", expected_count=2)
    test_search_by_course_code(token, "ENG303", expected_count=1)
    
    # Test faculty searches
    test_search_by_faculty(token, "Computer Science", expected_count=2)
    test_search_by_faculty(token, "Mathematics", expected_count=2)
    test_search_by_faculty(token, "Engineering", expected_count=1)
    
    # Combined search tests
    test_combined_search(token, {
        "name": "Programming",
        "course_code": "CS101"
    }, expected_count=1)
    
    test_combined_search(token, {
        "name": "Programming",
        "faculty": "Mathematics"
    }, expected_count=1)
    
    # Test hierarchy endpoint
    test_get_hierarchy()
    
    # Test subscription functionality
    if vetrine and len(vetrine) > 0:
        # Get details of the first vetrina
        test_get_vetrina_details(token, vetrine[0].id)
        
        # Test already subscribed case
        test_already_subscribed_case(token, vetrine[0].id)
        
        # Test subscribe and unsubscribe
        test_subscribe_to_vetrina(token, vetrine[0].id)
        test_unsubscribe_from_vetrina(token, vetrine[0].id)
        
        # Test file operations
        test_file_operations(token, vetrine[0].id)
    
    # Test file upload without authentication
    test_file_upload_without_auth()
    
    # Test file operations with non-existent vetrina
    test_file_operations_wrong_vetrina(token)
    
    print("\nAll tests completed!")

if __name__ == "__main__":
    # Create database tables if they don't exist
    database.create_tables()
    
    # Run the tests
    run_tests()
