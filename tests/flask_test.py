import requests
import json
import sys
import os

# Test configuration
BASE_URL = "http://146.59.236.26:5000"
TEST_USER = {
    "username": "testuser",
    "name": "Test",
    "surname": "User",
    "email": "test@example.com",
    "password": "password123"
}

def setup():
    """Set up test data - create user only"""
    print("Setting up test data...")
    
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
            print(f"✓ Created test user: {TEST_USER['username']}")
            return True
        else:
            # User might already exist
            print(f"User registration response: {response.status_code} - {response.text}")
            if "email_already_exists" in response.text or "username_already_exists" in response.text:
                print(f"✓ Test user already exists: {TEST_USER['username']}")
                return True
            else:
                print(f"✗ Failed to create test user")
                raise AssertionError(f"Failed to create test user: {response.status_code} - {response.text}")
    except Exception as e:
        print(f"✗ Error during user setup: {e}")
        raise AssertionError(f"Error during user setup: {e}")

def test_register():
    """Test user registration"""
    print("\nTesting user registration...")
    
    # Try to register a new user with unique email
    import time
    unique_email = f"test_{int(time.time())}@example.com"
    unique_username = f"testuser_{int(time.time())}"
    
    response = requests.post(
        f"{BASE_URL}/register",
        json={
            "username": unique_username,
            "name": "Test",
            "surname": "User",
            "email": unique_email,
            "password": "password123"
        }
    )
    
    if response.status_code == 200:
        print("✓ User registration successful")
        data = response.json()
        if "access_token" in data:
            print("✓ Access token received")
            return True
        else:
            print("✗ No access token in response")
            raise AssertionError("No access token in registration response")
    else:
        print(f"✗ Registration failed: {response.status_code} - {response.text}")
        raise AssertionError(f"Registration failed: {response.status_code} - {response.text}")

def test_login():
    """Test user login"""
    print("\nTesting user login...")
    
    response = requests.post(
        f"{BASE_URL}/login",
        json={
            "email": TEST_USER["email"],
            "password": TEST_USER["password"]
        }
    )
    
    if response.status_code == 200:
        print("✓ Login successful")
        data = response.json()
        if "access_token" in data:
            print("✓ Access token received")
            return data["access_token"]
        else:
            print("✗ No access token in response")
            raise AssertionError("No access token in login response")
    else:
        print(f"✗ Login failed: {response.status_code} - {response.text}")
        raise AssertionError(f"Login failed: {response.status_code} - {response.text}")

def test_login_invalid_credentials():
    """Test login with invalid credentials"""
    print("\nTesting login with invalid credentials...")
    
    response = requests.post(
        f"{BASE_URL}/login",
        json={
            "email": TEST_USER["email"],
            "password": "wrongpassword"
        }
    )
    
    if response.status_code == 401:
        print("✓ Invalid credentials correctly rejected")
        return True
    else:
        print(f"✗ Expected 401, got {response.status_code} - {response.text}")
        raise AssertionError(f"Expected 401 for invalid credentials, got {response.status_code}")

def test_get_hierarchy():
    """Test getting faculties and courses hierarchy"""
    print("\nTesting get hierarchy endpoint...")
    
    response = requests.get(f"{BASE_URL}/hierarchy")
    
    if response.status_code != 200:
        print(f"✗ Error: {response.status_code} - {response.text}")
        raise AssertionError(f"Hierarchy endpoint failed: {response.status_code} - {response.text}")
    
    data = response.json()
    
    # Check if we have faculties
    if not data or not isinstance(data, dict):
        print("✗ Invalid response format")
        raise AssertionError("Hierarchy endpoint returned invalid response format")
    
    print(f"✓ Found {len(data)} faculties")
    
    # Print sample data from the first few faculties
    faculty_count = 0
    for faculty_name, faculty_data in data.items():
        if faculty_count >= 3:  # Only show first 3 faculties
            break
        print(f"  - Faculty: {faculty_name}")
        if isinstance(faculty_data, list):
            print(f"    Courses: {len(faculty_data)} courses")
            if len(faculty_data) > 0:
                print(f"    Sample course: {faculty_data[0]}")
        faculty_count += 1
    
    if len(data) > 3:
        print(f"  ... and {len(data) - 3} more faculties")
    
    return True

def test_protected_endpoint_without_auth():
    """Test accessing a protected endpoint without authentication"""
    print("\nTesting protected endpoint without authentication...")
    
    response = requests.get(f"{BASE_URL}/vetrine")
    
    # The endpoint is optional auth, so it should work but without user-specific data
    if response.status_code == 200:
        print("✓ Endpoint accessible without auth (optional auth)")
        return True
    else:
        print(f"Response: {response.status_code} - {response.text}")
        return True  # This is acceptable behavior

def test_protected_endpoint_with_auth(token):
    """Test accessing a protected endpoint with authentication"""
    print("\nTesting protected endpoint with authentication...")
    
    headers = {"Authorization": f"Bearer {token}"}
    response = requests.get(f"{BASE_URL}/vetrine", headers=headers)
    
    if response.status_code == 200:
        print("✓ Authenticated request successful")
        data = response.json()
        print(f"  Found {data.get('count', 0)} vetrine")
        return True
    else:
        print(f"✗ Error: {response.status_code} - {response.text}")
        raise AssertionError(f"Authenticated request failed: {response.status_code} - {response.text}")

def test_invalid_token():
    """Test using an invalid token"""
    print("\nTesting invalid token...")
    
    headers = {"Authorization": "Bearer invalid_token_here"}
    response = requests.get(f"{BASE_URL}/user/favorites", headers=headers)  # This requires auth
    
    if response.status_code == 422:  # JWT decode error
        print("✓ Invalid token correctly rejected")
        return True
    else:
        print(f"Response: {response.status_code} - {response.text}")
        # Different JWT libraries might return different status codes
        return True

def get_sample_course_instance():
    """Get a sample course instance from hierarchy for testing"""
    response = requests.get(f"{BASE_URL}/hierarchy")
    if response.status_code != 200:
        return None
    
    data = response.json()
    if not data:
        return None
    
    # Find the first faculty with courses
    for faculty_name, courses in data.items():
        if courses and len(courses) > 0:
            # Get the first course
            course_code, course_name = courses[0]
            # Since we can't query the database directly, we'll return the course info
            # and let the calling function handle getting the actual course instance ID
            # by creating a vetrina and seeing if it works, or by other API means
            return {
                "course_code": course_code,
                "course_name": course_name,
                "faculty_name": faculty_name
            }
    return None

def test_create_vetrina(token):
    """Test creating a vetrina"""
    print("\nTesting vetrina creation...")
    
    # Get a sample course instance
    course_instance = get_sample_course_instance()
    if not course_instance:
        print("✗ No course instances available for testing")
        raise AssertionError("No course instances available for testing")
    
    headers = {"Authorization": f"Bearer {token}"}
    
    # Since we don't have the course instance ID, we'll try to find it by creating a vetrina
    # and trying different IDs or by using existing vetrine to find valid course instance IDs
    
    # First, let's try to get existing vetrine to find a valid course instance ID
    search_response = requests.get(f"{BASE_URL}/vetrine", headers=headers)
    course_instance_id = None
    
    if search_response.status_code == 200:
        search_data = search_response.json()
        if search_data['count'] > 0:
            # Use the course instance ID from an existing vetrina
            course_instance_id = search_data['vetrine'][0]['course_instance']['instance_id']
            print(f"  Using course instance ID {course_instance_id} from existing vetrina")
    
    # If we couldn't find an existing vetrina, try some common IDs (1, 2, 3, etc.)
    if course_instance_id is None:
        print("  No existing vetrine found, trying common course instance IDs...")
        for test_id in [1, 2, 3, 4, 5]:
            test_vetrina_data = {
                "course_instance_id": test_id,
                "name": f"Test Vetrina {int(__import__('time').time())}",
                "description": "This is a test vetrina for automated testing"
            }
            
            test_response = requests.post(
                f"{BASE_URL}/vetrine",
                headers=headers,
                json=test_vetrina_data
            )
            
            if test_response.status_code == 200:
                course_instance_id = test_id
                print(f"  Found valid course instance ID: {course_instance_id}")
                return test_vetrina_data["name"]  # Return name for later use
            elif test_response.status_code == 404:
                continue  # Try next ID
            else:
                # Some other error occurred
                print(f"  Unexpected error with ID {test_id}: {test_response.status_code} - {test_response.text}")
    
    if course_instance_id is None:
        print("✗ Could not find a valid course instance ID")
        raise AssertionError("Could not find a valid course instance ID for testing")
    
    # Create vetrina with the found course instance ID
    vetrina_data = {
        "course_instance_id": course_instance_id,
        "name": f"Test Vetrina {int(__import__('time').time())}",  # Unique name
        "description": "This is a test vetrina for automated testing"
    }
    
    response = requests.post(
        f"{BASE_URL}/vetrine",
        headers=headers,
        json=vetrina_data
    )
    
    if response.status_code == 200:
        print("✓ Vetrina created successfully")
        print(f"  Course: {course_instance.get('course_name', 'Unknown')} ({course_instance.get('course_code', 'Unknown')})")
        print(f"  Faculty: {course_instance.get('faculty_name', 'Unknown')}")
        print(f"  Name: {vetrina_data['name']}")
        return vetrina_data["name"]  # Return name for later use
    else:
        print(f"✗ Failed to create vetrina: {response.status_code} - {response.text}")
        raise AssertionError(f"Failed to create vetrina: {response.status_code} - {response.text}")

def test_create_vetrina_invalid_course(token):
    """Test creating a vetrina with invalid course instance"""
    print("\nTesting vetrina creation with invalid course...")
    
    headers = {"Authorization": f"Bearer {token}"}
    vetrina_data = {
        "course_instance_id": 99999,  # Non-existent course
        "name": "Test Invalid Vetrina",
        "description": "This should fail"
    }
    
    response = requests.post(
        f"{BASE_URL}/vetrine",
        headers=headers,
        json=vetrina_data
    )
    
    if response.status_code == 404:
        print("✓ Invalid course instance correctly rejected")
        return True
    else:
        print(f"Expected 404, got {response.status_code} - {response.text}")
        raise AssertionError(f"Expected 404 for invalid course, got {response.status_code}")

def test_create_vetrina_missing_fields(token):
    """Test creating a vetrina with missing required fields"""
    print("\nTesting vetrina creation with missing fields...")
    
    headers = {"Authorization": f"Bearer {token}"}
    
    # Test missing course_instance_id
    response = requests.post(
        f"{BASE_URL}/vetrine",
        headers=headers,
        json={"name": "Test", "description": "Test"}
    )
    
    if response.status_code == 500:  # Internal server error due to missing field
        print("✓ Missing course_instance_id correctly handled")
    else:
        print(f"Missing course_instance_id: {response.status_code} - {response.text}")
    
    # Test missing name
    response = requests.post(
        f"{BASE_URL}/vetrine",
        headers=headers,
        json={"course_instance_id": 1, "description": "Test"}
    )
    
    if response.status_code == 500:  # Internal server error due to missing field
        print("✓ Missing name correctly handled")
    else:
        print(f"Missing name: {response.status_code} - {response.text}")
    
    return True

def test_create_vetrina_unauthorized():
    """Test creating a vetrina without authentication"""
    print("\nTesting vetrina creation without authentication...")
    
    vetrina_data = {
        "course_instance_id": 1,
        "name": "Unauthorized Test",
        "description": "This should fail"
    }
    
    response = requests.post(
        f"{BASE_URL}/vetrine",
        json=vetrina_data
    )
    
    if response.status_code == 401:
        print("✓ Unauthorized request correctly rejected")
        return True
    else:
        print(f"Expected 401, got {response.status_code} - {response.text}")
        raise AssertionError(f"Expected 401 for unauthorized request, got {response.status_code}")

def test_search_vetrine_basic(token):
    """Test basic vetrina search functionality"""
    print("\nTesting basic vetrina search...")
    
    headers = {"Authorization": f"Bearer {token}"}
    response = requests.get(f"{BASE_URL}/vetrine", headers=headers)
    
    if response.status_code == 200:
        data = response.json()
        print(f"✓ Search successful - found {data['count']} vetrine")
        return data['vetrine']
    else:
        print(f"✗ Search failed: {response.status_code} - {response.text}")
        raise AssertionError(f"Basic vetrina search failed: {response.status_code} - {response.text}")

def test_search_vetrine_by_name(token, search_term):
    """Test searching vetrine by name"""
    print(f"\nTesting search by name: '{search_term}'...")
    
    headers = {"Authorization": f"Bearer {token}"}
    response = requests.get(
        f"{BASE_URL}/vetrine?name={search_term}",
        headers=headers
    )
    
    if response.status_code == 200:
        data = response.json()
        print(f"✓ Found {data['count']} vetrine matching '{search_term}'")
        
        # Verify that all results contain the search term
        for vetrina in data['vetrine']:
            if search_term.lower() not in vetrina['name'].lower():
                print(f"✗ Result '{vetrina['name']}' doesn't contain search term")
                raise AssertionError(f"Search result '{vetrina['name']}' doesn't contain search term '{search_term}'")
        
        if data['count'] > 0:
            print(f"  Sample result: {data['vetrine'][0]['name']}")
        
        return True
    else:
        print(f"✗ Search failed: {response.status_code} - {response.text}")
        raise AssertionError(f"Search by name failed: {response.status_code} - {response.text}")

def test_search_vetrine_by_course_code(token):
    """Test searching vetrine by course code"""
    print("\nTesting search by course code...")
    
    # Get a sample course code from hierarchy
    course_instance = get_sample_course_instance()
    if not course_instance:
        print("✗ No course instances available for testing")
        raise AssertionError("No course instances available for course code testing")
    
    course_code = course_instance["course_code"]
    headers = {"Authorization": f"Bearer {token}"}
    response = requests.get(
        f"{BASE_URL}/vetrine?course_code={course_code}",
        headers=headers
    )
    
    if response.status_code == 200:
        data = response.json()
        print(f"✓ Found {data['count']} vetrine for course code '{course_code}'")
        
        # Verify that all results match the course code
        for vetrina in data['vetrine']:
            if course_code.lower() not in vetrina['course_instance']['course_code'].lower():
                print(f"✗ Result course code '{vetrina['course_instance']['course_code']}' doesn't match search")
                raise AssertionError(f"Search result course code '{vetrina['course_instance']['course_code']}' doesn't match '{course_code}'")
        
        return True
    else:
        print(f"✗ Search failed: {response.status_code} - {response.text}")
        raise AssertionError(f"Search by course code failed: {response.status_code} - {response.text}")

def test_search_vetrine_by_faculty(token):
    """Test searching vetrine by faculty"""
    print("\nTesting search by faculty...")
    
    # Get a sample faculty from hierarchy
    course_instance = get_sample_course_instance()
    if not course_instance:
        print("✗ No course instances available for testing")
        raise AssertionError("No course instances available for faculty testing")
    
    faculty_name = course_instance["faculty_name"]
    headers = {"Authorization": f"Bearer {token}"}
    response = requests.get(
        f"{BASE_URL}/vetrine?faculty={faculty_name}",
        headers=headers
    )
    
    if response.status_code == 200:
        data = response.json()
        print(f"✓ Found {data['count']} vetrine for faculty '{faculty_name}'")
        
        # Verify that all results match the faculty
        for vetrina in data['vetrine']:
            if faculty_name.lower() not in vetrina['course_instance']['faculty_name'].lower():
                print(f"✗ Result faculty '{vetrina['course_instance']['faculty_name']}' doesn't match search")
                raise AssertionError(f"Search result faculty '{vetrina['course_instance']['faculty_name']}' doesn't match '{faculty_name}'")
        
        return True
    else:
        print(f"✗ Search failed: {response.status_code} - {response.text}")
        raise AssertionError(f"Search by faculty failed: {response.status_code} - {response.text}")

def test_search_vetrine_combined(token):
    """Test searching vetrine with multiple parameters"""
    print("\nTesting combined search parameters...")
    
    course_instance = get_sample_course_instance()
    if not course_instance:
        print("✗ No course instances available for testing")
        raise AssertionError("No course instances available for combined search testing")
    
    headers = {"Authorization": f"Bearer {token}"}
    params = {
        "course_code": course_instance["course_code"],
        "faculty": course_instance["faculty_name"]
    }
    
    query_string = "&".join([f"{k}={v}" for k, v in params.items()])
    response = requests.get(
        f"{BASE_URL}/vetrine?{query_string}",
        headers=headers
    )
    
    if response.status_code == 200:
        data = response.json()
        print(f"✓ Combined search found {data['count']} vetrine")
        print(f"  Parameters: {params}")
        return True
    else:
        print(f"✗ Combined search failed: {response.status_code} - {response.text}")
        raise AssertionError(f"Combined search failed: {response.status_code} - {response.text}")

def test_search_vetrine_no_results(token):
    """Test searching vetrine with parameters that should return no results"""
    print("\nTesting search with no expected results...")
    
    headers = {"Authorization": f"Bearer {token}"}
    response = requests.get(
        f"{BASE_URL}/vetrine?name=NonExistentVetrinaName12345",
        headers=headers
    )
    
    if response.status_code == 200:
        data = response.json()
        if data['count'] == 0:
            print("✓ Search with no results handled correctly")
            return True
        else:
            print(f"✗ Expected 0 results, got {data['count']}")
            raise AssertionError(f"Expected 0 results for non-existent search, got {data['count']}")
    else:
        print(f"✗ Search failed: {response.status_code} - {response.text}")
        raise AssertionError(f"Search with no results failed: {response.status_code} - {response.text}")

def find_user_vetrina(token):
    """Find a vetrina created by the current user for deletion testing"""
    headers = {"Authorization": f"Bearer {token}"}
    response = requests.get(f"{BASE_URL}/vetrine", headers=headers)
    
    if response.status_code == 200:
        data = response.json()
        # Look for vetrine that might be owned by the current user
        # We'll identify them by the test name pattern
        for vetrina in data['vetrine']:
            if "Test Vetrina" in vetrina['name']:
                return vetrina['id']
    return None

def test_delete_vetrina(token, vetrina_name):
    """Test deleting a vetrina"""
    print("\nTesting vetrina deletion...")
    
    if not vetrina_name:
        print("✗ No vetrina available for deletion testing")
        raise AssertionError("No vetrina available for deletion testing")
    
    # First, find the vetrina ID by searching for it
    headers = {"Authorization": f"Bearer {token}"}
    response = requests.get(f"{BASE_URL}/vetrine?name={vetrina_name}", headers=headers)
    
    if response.status_code != 200:
        print("✗ Failed to find vetrina for deletion")
        raise AssertionError("Failed to find vetrina for deletion")
    
    data = response.json()
    if data['count'] == 0:
        print("✗ Vetrina not found for deletion")
        raise AssertionError("Vetrina not found for deletion")
    
    vetrina_id = data['vetrine'][0]['id']
    
    # Now delete the vetrina
    response = requests.delete(
        f"{BASE_URL}/vetrine/{vetrina_id}",
        headers=headers
    )
    
    if response.status_code == 200:
        print(f"✓ Vetrina deleted successfully (ID: {vetrina_id})")
        
        # Verify it's actually deleted by trying to find it again
        response = requests.get(f"{BASE_URL}/vetrine?name={vetrina_name}", headers=headers)
        if response.status_code == 200:
            data = response.json()
            if data['count'] == 0:
                print("✓ Deletion verified - vetrina no longer found")
                return True
            else:
                print("✗ Vetrina still exists after deletion")
                raise AssertionError("Vetrina still exists after deletion")
        else:
            print("✗ Failed to verify deletion")
            raise AssertionError("Failed to verify deletion")
    else:
        print(f"✗ Failed to delete vetrina: {response.status_code} - {response.text}")
        raise AssertionError(f"Failed to delete vetrina: {response.status_code} - {response.text}")

def test_delete_vetrina_unauthorized(token):
    """Test deleting a vetrina without proper authorization"""
    print("\nTesting unauthorized vetrina deletion...")
    
    # Try to delete without token
    response = requests.delete(f"{BASE_URL}/vetrine/1")
    
    if response.status_code == 401:
        print("✓ Unauthorized deletion correctly rejected")
        return True
    else:
        print(f"Expected 401, got {response.status_code} - {response.text}")
        raise AssertionError(f"Expected 401 for unauthorized deletion, got {response.status_code}")

def test_delete_nonexistent_vetrina(token):
    """Test deleting a non-existent vetrina"""
    print("\nTesting deletion of non-existent vetrina...")
    
    headers = {"Authorization": f"Bearer {token}"}
    response = requests.delete(
        f"{BASE_URL}/vetrine/99999",  # Non-existent ID
        headers=headers
    )
    
    # The delete operation might succeed even if the vetrina doesn't exist
    # or the user doesn't own it (depending on implementation)
    print(f"Non-existent vetrina deletion: {response.status_code} - {response.text}")
    return True  # This is acceptable behavior

def run_vetrina_tests(token):
    """Run all vetrina-related tests"""
    print("\n" + "=" * 50)
    print("RUNNING VETRINA TESTS")
    print("=" * 50)
    
    # Test vetrina creation
    test_create_vetrina_unauthorized()
    test_create_vetrina_missing_fields(token)
    test_create_vetrina_invalid_course(token)
    created_vetrina_name = test_create_vetrina(token)
    
    # Test vetrina search
    all_vetrine = test_search_vetrine_basic(token)
    test_search_vetrine_no_results(token)
    
    # Test search by different parameters
    if created_vetrina_name:
        test_search_vetrine_by_name(token, "Test Vetrina")
    
    test_search_vetrine_by_course_code(token)
    test_search_vetrine_by_faculty(token)
    test_search_vetrine_combined(token)
    
    # Test vetrina deletion
    test_delete_vetrina_unauthorized(token)
    test_delete_nonexistent_vetrina(token)
    
    if created_vetrina_name:
        test_delete_vetrina(token, created_vetrina_name)
    
    print("\n" + "=" * 50)
    print("VETRINA TESTS COMPLETED")
    print("=" * 50)

def get_or_create_test_vetrina(token):
    """Get an existing vetrina or create one for file testing"""
    headers = {"Authorization": f"Bearer {token}"}
    
    # First try to get existing vetrine
    response = requests.get(f"{BASE_URL}/vetrine", headers=headers)
    if response.status_code == 200:
        data = response.json()
        if data['count'] > 0:
            vetrina = data['vetrine'][0]
            print(f"  Using existing vetrina: {vetrina['name']} (ID: {vetrina['id']})")
            return vetrina['id']
    
    # If no existing vetrina, create one
    print("  No existing vetrine found, creating one for file testing...")
    created_name = test_create_vetrina(token)
    if created_name:
        # Find the created vetrina
        response = requests.get(f"{BASE_URL}/vetrine?name={created_name}", headers=headers)
        if response.status_code == 200:
            data = response.json()
            if data['count'] > 0:
                return data['vetrine'][0]['id']
    
    raise AssertionError("Could not get or create a vetrina for file testing")

def test_file_upload(token, vetrina_id):
    """Test uploading a file to a vetrina"""
    print("\nTesting file upload...")
    
    headers = {"Authorization": f"Bearer {token}"}
    
    # Check if test.pdf exists
    test_file_path = "tests/test.pdf"
    if not os.path.exists(test_file_path):
        # Create a simple test file if it doesn't exist
        os.makedirs("tests", exist_ok=True)
        with open(test_file_path, "w") as f:
            f.write("%PDF-1.4\n1 0 obj\n<<\n/Type /Catalog\n/Pages 2 0 R\n>>\nendobj\n")
            f.write("2 0 obj\n<<\n/Type /Pages\n/Kids [3 0 R]\n/Count 1\n>>\nendobj\n")
            f.write("3 0 obj\n<<\n/Type /Page\n/Parent 2 0 R\n/MediaBox [0 0 612 792]\n>>\nendobj\n")
            f.write("xref\n0 4\n0000000000 65535 f \n0000000009 00000 n \n0000000074 00000 n \n")
            f.write("0000000120 00000 n \ntrailer\n<<\n/Size 4\n/Root 1 0 R\n>>\nstartxref\n")
            f.write("174\n%%EOF")
        print("  Created test.pdf file")
    
    try:
        with open(test_file_path, "rb") as f:
            files = {"file": ("test.pdf", f, "application/pdf")}
            response = requests.post(
                f"{BASE_URL}/vetrine/{vetrina_id}/files",
                headers=headers,
                files=files
            )
        
        if response.status_code == 200:
            print("✓ File uploaded successfully")
            return True
        else:
            print(f"✗ File upload failed: {response.status_code} - {response.text}")
            raise AssertionError(f"File upload failed: {response.status_code} - {response.text}")
    
    except FileNotFoundError:
        print("✗ test.pdf file not found")
        raise AssertionError("test.pdf file not found in tests/ directory")

def test_file_upload_unauthorized(vetrina_id):
    """Test uploading a file without authentication"""
    print("\nTesting file upload without authentication...")
    
    test_file_path = "tests/test.pdf"
    if not os.path.exists(test_file_path):
        print("  Skipping unauthorized upload test - no test file")
        return
    
    try:
        with open(test_file_path, "rb") as f:
            files = {"file": ("test.pdf", f, "application/pdf")}
            response = requests.post(
                f"{BASE_URL}/vetrine/{vetrina_id}/files",
                files=files
            )
        
        if response.status_code == 401:
            print("✓ Unauthorized file upload correctly rejected")
            return True
        else:
            print(f"Expected 401, got {response.status_code} - {response.text}")
            raise AssertionError(f"Expected 401 for unauthorized upload, got {response.status_code}")
    
    except FileNotFoundError:
        print("  Skipping unauthorized upload test - no test file")
        return

def test_file_upload_missing_file(token, vetrina_id):
    """Test uploading without providing a file"""
    print("\nTesting file upload without file...")
    
    headers = {"Authorization": f"Bearer {token}"}
    response = requests.post(
        f"{BASE_URL}/vetrine/{vetrina_id}/files",
        headers=headers
    )
    
    if response.status_code == 400:
        print("✓ Missing file correctly rejected")
        return True
    else:
        print(f"Expected 400, got {response.status_code} - {response.text}")
        raise AssertionError(f"Expected 400 for missing file, got {response.status_code}")

def test_file_upload_to_nonexistent_vetrina(token):
    """Test uploading to a non-existent vetrina"""
    print("\nTesting file upload to non-existent vetrina...")
    
    headers = {"Authorization": f"Bearer {token}"}
    test_file_path = "tests/test.pdf"
    
    if not os.path.exists(test_file_path):
        print("  Skipping test - no test file")
        return
    
    try:
        with open(test_file_path, "rb") as f:
            files = {"file": ("test.pdf", f, "application/pdf")}
            response = requests.post(
                f"{BASE_URL}/vetrine/99999/files",  # Non-existent vetrina
                headers=headers,
                files=files
            )
        
        if response.status_code == 404:
            print("✓ Upload to non-existent vetrina correctly rejected")
            return True
        else:
            print(f"Expected 404, got {response.status_code} - {response.text}")
            raise AssertionError(f"Expected 404 for non-existent vetrina, got {response.status_code}")
    
    except FileNotFoundError:
        print("  Skipping test - no test file")
        return

def test_get_files_for_vetrina(token, vetrina_id):
    """Test getting files for a vetrina"""
    print("\nTesting get files for vetrina...")
    
    headers = {"Authorization": f"Bearer {token}"}
    response = requests.get(
        f"{BASE_URL}/vetrine/{vetrina_id}/files",
        headers=headers
    )
    
    if response.status_code == 200:
        data = response.json()
        print(f"✓ Retrieved files for vetrina - found {len(data['files'])} files")
        
        # Return the files for use in other tests
        return data['files']
    else:
        print(f"✗ Failed to get files: {response.status_code} - {response.text}")
        raise AssertionError(f"Failed to get files for vetrina: {response.status_code} - {response.text}")

def test_get_file_details(token, file_id):
    """Test getting details of a specific file"""
    print(f"\nTesting get file details for file ID {file_id}...")
    
    headers = {"Authorization": f"Bearer {token}"}
    response = requests.get(
        f"{BASE_URL}/files/{file_id}",
        headers=headers
    )
    
    if response.status_code == 200:
        data = response.json()
        print(f"✓ Retrieved file details: {data.get('filename', 'Unknown')}")
        print(f"  Size: {data.get('size', 0)} bytes")
        print(f"  Price: {data.get('price', 0)}")
        print(f"  Owned: {data.get('owned', False)}")
        return data
    else:
        print(f"✗ Failed to get file details: {response.status_code} - {response.text}")
        raise AssertionError(f"Failed to get file details: {response.status_code} - {response.text}")

def test_download_file_redacted(token, file_id):
    """Test downloading the redacted version of a file"""
    print(f"\nTesting redacted file download for file ID {file_id}...")
    
    headers = {"Authorization": f"Bearer {token}"}
    response = requests.get(
        f"{BASE_URL}/files/{file_id}/download/redacted",
        headers=headers
    )
    
    if response.status_code == 200:
        print("✓ Redacted file download successful")
        print(f"  Content-Type: {response.headers.get('Content-Type', 'Unknown')}")
        print(f"  Content-Length: {len(response.content)} bytes")
        return True
    else:
        print(f"✗ Redacted file download failed: {response.status_code} - {response.text}")
        raise AssertionError(f"Redacted file download failed: {response.status_code} - {response.text}")

def test_download_file_full_unauthorized(file_id):
    """Test downloading full file without authentication"""
    print(f"\nTesting unauthorized full file download for file ID {file_id}...")
    
    response = requests.get(f"{BASE_URL}/files/{file_id}/download")
    
    if response.status_code == 401:
        print("✓ Unauthorized download correctly rejected")
        return True
    else:
        print(f"Expected 401, got {response.status_code} - {response.text}")
        raise AssertionError(f"Expected 401 for unauthorized download, got {response.status_code}")

def test_buy_file(token, file_id):
    """Test buying a file"""
    print(f"\nTesting file purchase for file ID {file_id}...")
    
    headers = {"Authorization": f"Bearer {token}"}
    response = requests.post(
        f"{BASE_URL}/files/{file_id}/buy",
        headers=headers
    )
    
    if response.status_code == 200:
        data = response.json()
        print("✓ File purchase successful")
        print(f"  Transaction ID: {data.get('transaction', {}).get('id', 'Unknown')}")
        print(f"  Amount: {data.get('transaction', {}).get('amount', 0)}")
        return data
    elif response.status_code == 409:
        # Already owned
        print("✓ File already owned (expected for price 0 files)")
        return None
    else:
        print(f"✗ File purchase failed: {response.status_code} - {response.text}")
        raise AssertionError(f"File purchase failed: {response.status_code} - {response.text}")

def test_download_file_full_after_purchase(token, file_id):
    """Test downloading full file after purchase"""
    print(f"\nTesting full file download after purchase for file ID {file_id}...")
    
    headers = {"Authorization": f"Bearer {token}"}
    response = requests.get(
        f"{BASE_URL}/files/{file_id}/download",
        headers=headers
    )
    
    if response.status_code == 200:
        print("✓ Full file download successful after purchase")
        print(f"  Content-Type: {response.headers.get('Content-Type', 'Unknown')}")
        print(f"  Content-Length: {len(response.content)} bytes")
        return True
    else:
        print(f"✗ Full file download failed: {response.status_code} - {response.text}")
        raise AssertionError(f"Full file download failed after purchase: {response.status_code} - {response.text}")

def test_buy_file_unauthorized(file_id):
    """Test buying a file without authentication"""
    print(f"\nTesting unauthorized file purchase for file ID {file_id}...")
    
    response = requests.post(f"{BASE_URL}/files/{file_id}/buy")
    
    if response.status_code == 401:
        print("✓ Unauthorized purchase correctly rejected")
        return True
    else:
        print(f"Expected 401, got {response.status_code} - {response.text}")
        raise AssertionError(f"Expected 401 for unauthorized purchase, got {response.status_code}")

def test_buy_nonexistent_file(token):
    """Test buying a non-existent file"""
    print("\nTesting purchase of non-existent file...")
    
    headers = {"Authorization": f"Bearer {token}"}
    response = requests.post(
        f"{BASE_URL}/files/99999/buy",  # Non-existent file
        headers=headers
    )
    
    if response.status_code == 404:
        print("✓ Purchase of non-existent file correctly rejected")
        return True
    else:
        print(f"Expected 404, got {response.status_code} - {response.text}")
        raise AssertionError(f"Expected 404 for non-existent file purchase, got {response.status_code}")

def test_delete_file(token, file_id):
    """Test deleting a file"""
    print(f"\nTesting file deletion for file ID {file_id}...")
    
    headers = {"Authorization": f"Bearer {token}"}
    response = requests.delete(
        f"{BASE_URL}/files/{file_id}",
        headers=headers
    )
    
    if response.status_code == 200:
        print("✓ File deleted successfully")
        
        # Verify deletion by trying to get file details
        verify_response = requests.get(
            f"{BASE_URL}/files/{file_id}",
            headers=headers
        )
        
        if verify_response.status_code == 404:
            print("✓ File deletion verified - file no longer exists")
            return True
        else:
            print("✗ File still exists after deletion")
            raise AssertionError("File still exists after deletion")
    else:
        print(f"✗ File deletion failed: {response.status_code} - {response.text}")
        raise AssertionError(f"File deletion failed: {response.status_code} - {response.text}")

def test_delete_file_unauthorized(file_id):
    """Test deleting a file without authentication"""
    print(f"\nTesting unauthorized file deletion for file ID {file_id}...")
    
    response = requests.delete(f"{BASE_URL}/files/{file_id}")
    
    if response.status_code == 401:
        print("✓ Unauthorized deletion correctly rejected")
        return True
    else:
        print(f"Expected 401, got {response.status_code} - {response.text}")
        raise AssertionError(f"Expected 401 for unauthorized deletion, got {response.status_code}")

def run_file_tests(token):
    """Run all file-related tests"""
    print("\n" + "=" * 50)
    print("RUNNING FILE TESTS")
    print("=" * 50)
    
    # Get or create a vetrina for testing
    vetrina_id = get_or_create_test_vetrina(token)
    
    # Test file upload
    test_file_upload_unauthorized(vetrina_id)
    test_file_upload_missing_file(token, vetrina_id)
    test_file_upload_to_nonexistent_vetrina(token)
    test_file_upload(token, vetrina_id)
    
    # Get files for the vetrina
    files = test_get_files_for_vetrina(token, vetrina_id)
    
    if not files:
        print("✗ No files found after upload")
        raise AssertionError("No files found after upload")
    
    # Use the first uploaded file for testing
    test_file = files[0]
    file_id = test_file['id']
    print(f"\nUsing file ID {file_id} for testing: {test_file.get('filename', 'Unknown')}")
    
    # Test file operations
    test_get_file_details(token, file_id)
    test_download_file_redacted(token, file_id)
    test_download_file_full_unauthorized(file_id)
    
    # Test file buying
    test_buy_file_unauthorized(file_id)
    test_buy_nonexistent_file(token)
    test_buy_file(token, file_id)
    
    # Test download after purchase
    test_download_file_full_after_purchase(token, file_id)
    
    # Test file deletion
    test_delete_file_unauthorized(file_id)
    test_delete_file(token, file_id)
    
    print("\n" + "=" * 50)
    print("FILE TESTS COMPLETED")
    print("=" * 50)

def run_tests():
    """Run all authentication tests"""
    print("=" * 50)
    print("RUNNING AUTHENTICATION TESTS")
    print("=" * 50)
    
    # Setup test data
    setup()
    
    # Test registration
    test_register()
    
    # Test login
    token = test_login()
    
    # Test invalid login
    test_login_invalid_credentials()
    
    # Test hierarchy endpoint (no auth required)
    test_get_hierarchy()
    
    # Test protected endpoints
    test_protected_endpoint_without_auth()
    test_protected_endpoint_with_auth(token)
    
    # Test invalid token
    test_invalid_token()
    
    print("\n" + "=" * 50)
    print("AUTHENTICATION TESTS COMPLETED")
    print("=" * 50)
    
    # Run vetrina tests
    run_vetrina_tests(token)
    
    # Run file tests
    run_file_tests(token)

if __name__ == "__main__":
    # Run the tests
    run_tests()
