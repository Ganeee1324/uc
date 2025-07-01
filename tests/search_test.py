import requests
import json
import time
import sys
import os

# Test configuration
BASE_URL = "http://146.59.236.26:5000"

# Test users for different scenarios
TEST_USERS = [
    {
        "username": "mario_rossi",
        "name": "Mario",
        "surname": "Rossi",
        "email": "mario.rossi@test.com",
        "password": "password123"
    },
    {
        "username": "anna_verdi",
        "name": "Anna",
        "surname": "Verdi", 
        "email": "anna.verdi@test.com",
        "password": "password123"
    },
    {
        "username": "luca_bianchi",
        "name": "Luca",
        "surname": "Bianchi",
        "email": "luca.bianchi@test.com", 
        "password": "password123"
    }
]

# Sample course instances that should exist in the database
SAMPLE_COURSES = [
    {"course_code": "INF", "course_name": "Informatica", "faculty_name": "Ingegneria"},
    {"course_code": "MAT", "course_name": "Matematica", "faculty_name": "Scienze"},
    {"course_code": "FIS", "course_name": "Fisica", "faculty_name": "Scienze"},
    {"course_code": "ING", "course_name": "Ingegneria", "faculty_name": "Ingegneria"}
]

# Test vetrine to create for comprehensive search testing
TEST_VETRINE = [
    {
        "name": "Algoritmi Avanzati",
        "description": "Materiale completo per il corso di algoritmi e strutture dati avanzate",
        "course_match": "informatica"
    },
    {
        "name": "Calcolo Differenziale", 
        "description": "Appunti e esercizi di matematica per ingegneri",
        "course_match": "matematica"
    },
    {
        "name": "Fisica Quantistica",
        "description": "Dispense complete di fisica moderna e quantistica",
        "course_match": "fisica" 
    },
    {
        "name": "Programmazione Python",
        "description": "Corso base e avanzato di programmazione in Python per informatica",
        "course_match": "informatica"
    },
    {
        "name": "Analisi Numerica",
        "description": "Metodi numerici per la risoluzione di problemi matematici",
        "course_match": "matematica"
    },
    {
        "name": "Termodinamica Applicata",
        "description": "Principi di termodinamica per ingegneria meccanica",
        "course_match": "ingegneria"
    },
    # Additional vetrine for better priority testing
    {
        "name": "Strutture Dati",
        "description": "Algoritmi e strutture dati fondamentali per la programmazione",
        "course_match": "informatica"
    },
    {
        "name": "Appunti di Algoritmi",
        "description": "Raccolta completa di appunti sui principali algoritmi di ordinamento",
        "course_match": "informatica"
    },
    {
        "name": "Esercizi Vari",
        "description": "Algoritmi di ricerca e ordinamento con esempi pratici",
        "course_match": "informatica"
    },
    {
        "name": "Matematica Avanzata",
        "description": "Corso completo che include anche algoritmi matematici",
        "course_match": "matematica"
    }
]

def setup_test_users():
    """Create test users and return their tokens"""
    print("Setting up test users...")
    tokens = []
    
    for i, user in enumerate(TEST_USERS):
        try:
            # Try to register user
            response = requests.post(f"{BASE_URL}/register", json=user)
            
            if response.status_code == 200:
                data = response.json()
                tokens.append(data["access_token"])
                print(f"✓ Created user: {user['username']}")
            elif "email_already_exists" in response.text or "username_already_exists" in response.text:
                # User exists, try to login
                login_response = requests.post(f"{BASE_URL}/login", json={
                    "email": user["email"],
                    "password": user["password"]
                })
                if login_response.status_code == 200:
                    data = login_response.json()
                    tokens.append(data["access_token"])
                    print(f"✓ Logged in existing user: {user['username']}")
                else:
                    raise Exception(f"Failed to login user {user['username']}")
            else:
                raise Exception(f"Failed to create user {user['username']}: {response.text}")
                
        except Exception as e:
            print(f"✗ Error with user {user['username']}: {e}")
            raise
    
    return tokens

def get_available_course_instances():
    """Get available course instances from the hierarchy"""
    print("Getting available course instances...")
    
    response = requests.get(f"{BASE_URL}/hierarchy")
    if response.status_code != 200:
        raise Exception("Failed to get hierarchy")
    
    hierarchy = response.json()
    course_instances = {}
    
    # Map course names to course instance info (more flexible matching)
    for faculty_name, courses in hierarchy.items():
        for course_code, course_name in courses:
            # Create multiple keys for flexible matching
            keys_to_try = [
                course_name.lower(),
                course_code.lower(),
                course_name.lower().split()[0] if course_name else "",  # First word
                faculty_name.lower()
            ]
            
            for key in keys_to_try:
                if key and len(key) > 2:  # Avoid very short keys
                    if key not in course_instances:
                        course_instances[key] = {
                            "course_code": course_code,
                            "course_name": course_name,
                            "faculty_name": faculty_name
                        }
    
    print(f"✓ Found {len(course_instances)} searchable course patterns")
    return course_instances

def find_course_instance_id(course_info, token):
    """Find the actual course instance ID by creating a test vetrina"""
    headers = {"Authorization": f"Bearer {token}"}
    
    # Try common IDs first by getting existing vetrine
    response = requests.get(f"{BASE_URL}/vetrine", headers=headers)
    if response.status_code == 200:
        data = response.json()
        for vetrina in data['vetrine']:
            course = vetrina['course_instance']
            if (course_info['course_code'].lower() in course['course_code'].lower() or 
                course_info['course_name'].lower() in course['course_name'].lower()):
                return course['instance_id']
    
    # If not found, try creating with common IDs
    for test_id in range(1, 50):
        test_response = requests.post(f"{BASE_URL}/vetrine", headers=headers, json={
            "course_instance_id": test_id,
            "name": f"Test Find ID {time.time()}",
            "description": "Test"
        })
        
        if test_response.status_code == 200:
            # Delete the test vetrina
            search_response = requests.get(f"{BASE_URL}/vetrine?name=Test Find ID", headers=headers)
            if search_response.status_code == 200:
                search_data = search_response.json()
                for test_vetrina in search_data['vetrine']:
                    if "Test Find ID" in test_vetrina['name']:
                        requests.delete(f"{BASE_URL}/vetrine/{test_vetrina['id']}", headers=headers)
                        break
            return test_id
    
    raise Exception(f"Could not find course instance ID for {course_info}")

def create_test_vetrine(tokens):
    """Create test vetrine for comprehensive search testing"""
    print("Creating test vetrine...")
    
    # Get available course instances
    course_instances = get_available_course_instances()
    created_vetrine = []
    
    for i, vetrina_data in enumerate(TEST_VETRINE):
        try:
            # Use different users for different vetrine
            token = tokens[i % len(tokens)]
            user = TEST_USERS[i % len(tokens)]
            headers = {"Authorization": f"Bearer {token}"}
            
            # Find matching course
            course_match = vetrina_data["course_match"]
            course_info = None
            
            # Try to find exact match first
            if course_match in course_instances:
                course_info = course_instances[course_match]
            else:
                # Try partial matches
                for key, info in course_instances.items():
                    if course_match in key or key in course_match:
                        course_info = info
                        break
            
            # If still no match, use first available
            if not course_info:
                course_info = list(course_instances.values())[0]
                print(f"⚠ Course '{course_match}' not found, using: {course_info['course_name']}")
            else:
                print(f"✓ Matched '{course_match}' to: {course_info['course_name']}")
            
            # Find the course instance ID
            course_instance_id = find_course_instance_id(course_info, token)
            
            # Create the vetrina
            unique_name = f"{vetrina_data['name']} - {int(time.time())}"
            create_data = {
                "course_instance_id": course_instance_id,
                "name": unique_name,
                "description": vetrina_data["description"]
            }
            
            response = requests.post(f"{BASE_URL}/vetrine", headers=headers, json=create_data)
            
            if response.status_code == 200:
                print(f"✓ Created vetrina: {unique_name} by {user['username']}")
                created_vetrine.append({
                    **create_data,
                    "author": user,
                    "course_info": course_info
                })
            else:
                print(f"✗ Failed to create vetrina {unique_name}: {response.text}")
                
        except Exception as e:
            print(f"✗ Error creating vetrina {vetrina_data['name']}: {e}")
    
    print(f"✓ Created {len(created_vetrine)} test vetrine")
    return created_vetrine

def test_text_search_priority(token):
    """Test text search with priority ordering"""
    print("\n" + "="*60)
    print("TESTING TEXT SEARCH PRIORITY ORDERING")
    print("="*60)
    
    headers = {"Authorization": f"Bearer {token}"}
    
    # Test 1: Search for "Algoritmi" - should find multiple matches with different priorities
    print("\nTest 1: Searching for 'Algoritmi' (should find multiple matches)")
    response = requests.get(f"{BASE_URL}/vetrine?text=Algoritmi", headers=headers)
    
    if response.status_code == 200:
        data = response.json()
        print(f"✓ Found {data['count']} results")
        
        if data['count'] > 0:
            # Analyze and display all results with their match types
            print("\nResults ordered by priority:")
            for i, vetrina in enumerate(data['vetrine']):
                match_types = []
                search_term = "algoritmi"
                
                if search_term in vetrina['name'].lower():
                    match_types.append("vetrina name (priority 1)")
                if search_term in vetrina['description'].lower():
                    match_types.append("description (priority 2)")
                if search_term in vetrina['course_instance']['course_name'].lower():
                    match_types.append("course name (priority 3)")
                if search_term in vetrina['course_instance']['faculty_name'].lower():
                    match_types.append("faculty name (priority 4)")
                if search_term in vetrina['author']['username'].lower():
                    match_types.append("author username (priority 5)")
                if search_term in f"{vetrina['author']['name']} {vetrina['author']['surname']}".lower():
                    match_types.append("author name (priority 6)")
                
                match_str = ", ".join(match_types) if match_types else "no direct match found"
                print(f"  {i+1}. '{vetrina['name']}' - Match: {match_str}")
                
            # Verify priority ordering
            if data['count'] >= 2:
                print("\n✓ Priority verification:")
                priorities = []
                for vetrina in data['vetrine']:
                    search_term = "algoritmi"
                    if search_term in vetrina['name'].lower():
                        priorities.append(1)
                    elif search_term in vetrina['description'].lower():
                        priorities.append(2)
                    elif search_term in vetrina['course_instance']['course_name'].lower():
                        priorities.append(3)
                    elif search_term in vetrina['course_instance']['faculty_name'].lower():
                        priorities.append(4)
                    elif search_term in vetrina['author']['username'].lower():
                        priorities.append(5)
                    elif search_term in f"{vetrina['author']['name']} {vetrina['author']['surname']}".lower():
                        priorities.append(6)
                    else:
                        priorities.append(7)
                
                is_sorted = all(priorities[i] <= priorities[i+1] for i in range(len(priorities)-1))
                if is_sorted:
                    print("  ✓ Results are correctly ordered by priority")
                else:
                    print(f"  ⚠ Priority ordering issue: {priorities}")
        else:
            print("  ⚠ No results found - this might indicate the test data wasn't created properly")
    else:
        print(f"✗ Search failed: {response.status_code} - {response.text}")
    
    # Test 2: Search for "matematica" - should find course name matches
    print("\nTest 2: Searching for 'matematica' (should find course name matches)")
    response = requests.get(f"{BASE_URL}/vetrine?text=matematica", headers=headers)
    
    if response.status_code == 200:
        data = response.json()
        print(f"✓ Found {data['count']} results for 'matematica'")
        
        for i, vetrina in enumerate(data['vetrine'][:3]):  # Show first 3
            course_name = vetrina['course_instance']['course_name'].lower()
            if "matematica" in course_name:
                print(f"  {i+1}. '{vetrina['name']}' - Course: {vetrina['course_instance']['course_name']}")
    
    # Test 3: Search for a term that should match descriptions
    print("\nTest 3: Searching for 'appunti' (should find description matches)")
    response = requests.get(f"{BASE_URL}/vetrine?text=appunti", headers=headers)
    
    if response.status_code == 200:
        data = response.json()
        print(f"✓ Found {data['count']} results for 'appunti'")
        
        for i, vetrina in enumerate(data['vetrine'][:3]):  # Show first 3
            if "appunti" in vetrina['description'].lower():
                print(f"  {i+1}. '{vetrina['name']}' - Description contains 'appunti'")
    else:
        print(f"✗ Search failed: {response.status_code} - {response.text}")

def test_author_search(token):
    """Test searching by author name and username"""
    print("\n" + "="*60)
    print("TESTING AUTHOR NAME SEARCH")
    print("="*60)
    
    headers = {"Authorization": f"Bearer {token}"}
    
    # Test 1: Search by username
    print("\nTest 1: Searching by username 'mario'")
    response = requests.get(f"{BASE_URL}/vetrine?text=mario", headers=headers)
    
    if response.status_code == 200:
        data = response.json()
        print(f"✓ Found {data['count']} results for username search")
        
        for vetrina in data['vetrine']:
            if "mario" in vetrina['author']['username'].lower():
                print(f"  ✓ Found vetrina by mario: '{vetrina['name']}'")
                break
    
    # Test 2: Search by author first name  
    print("\nTest 2: Searching by author first name 'Anna'")
    response = requests.get(f"{BASE_URL}/vetrine?text=Anna", headers=headers)
    
    if response.status_code == 200:
        data = response.json()
        print(f"✓ Found {data['count']} results for first name search")
        
        for vetrina in data['vetrine']:
            if "anna" in vetrina['author']['name'].lower():
                print(f"  ✓ Found vetrina by Anna: '{vetrina['name']}'")
                break
    
    # Test 3: Search by full name
    print("\nTest 3: Searching by full name 'Luca Bianchi'")
    response = requests.get(f"{BASE_URL}/vetrine?text=Luca Bianchi", headers=headers)
    
    if response.status_code == 200:
        data = response.json()
        print(f"✓ Found {data['count']} results for full name search")
        
        for vetrina in data['vetrine']:
            full_name = f"{vetrina['author']['name']} {vetrina['author']['surname']}"
            if "luca bianchi" in full_name.lower():
                print(f"  ✓ Found vetrina by Luca Bianchi: '{vetrina['name']}'")
                break

def test_combined_search_filters(token):
    """Test combining text search with other filters"""
    print("\n" + "="*60)
    print("TESTING COMBINED SEARCH FILTERS")
    print("="*60)
    
    headers = {"Authorization": f"Bearer {token}"}
    
    # Test 1: Text search + course name filter
    print("\nTest 1: Text 'matematica' + course_name filter")
    response = requests.get(f"{BASE_URL}/vetrine?text=matematica&course_name=matematica", headers=headers)
    
    if response.status_code == 200:
        data = response.json()
        print(f"✓ Combined search found {data['count']} results")
        
        for vetrina in data['vetrine']:
            course_name = vetrina['course_instance']['course_name'].lower()
            if "matematica" in course_name:
                print(f"  ✓ Result matches filter: '{vetrina['name']}' - Course: {course_name}")
    
    # Test 2: Text search + faculty filter
    print("\nTest 2: Text 'fisica' + faculty filter 'Scienze'")
    response = requests.get(f"{BASE_URL}/vetrine?text=fisica&faculty=Scienze", headers=headers)
    
    if response.status_code == 200:
        data = response.json()
        print(f"✓ Combined search found {data['count']} results")
        
        for vetrina in data['vetrine']:
            faculty_name = vetrina['course_instance']['faculty_name']
            if "scienze" in faculty_name.lower():
                print(f"  ✓ Result matches filter: '{vetrina['name']}' - Faculty: {faculty_name}")

def test_edge_cases(token):
    """Test edge cases and special scenarios"""
    print("\n" + "="*60)
    print("TESTING EDGE CASES")
    print("="*60)
    
    headers = {"Authorization": f"Bearer {token}"}
    
    # Test 1: Empty search (should return all)
    print("\nTest 1: Empty search parameters")
    response = requests.get(f"{BASE_URL}/vetrine", headers=headers)
    
    if response.status_code == 200:
        data = response.json()
        print(f"✓ Empty search returned {data['count']} results")
    
    # Test 2: Non-existent search term
    print("\nTest 2: Non-existent search term")
    response = requests.get(f"{BASE_URL}/vetrine?text=xyznonexistent12345", headers=headers)
    
    if response.status_code == 200:
        data = response.json()
        if data['count'] == 0:
            print("✓ Non-existent search correctly returned 0 results")
        else:
            print(f"? Non-existent search returned {data['count']} results")
    
    # Test 3: Very short search term
    print("\nTest 3: Very short search term 'a'")
    response = requests.get(f"{BASE_URL}/vetrine?text=a", headers=headers)
    
    if response.status_code == 200:
        data = response.json()
        print(f"✓ Short search returned {data['count']} results")
    
    # Test 4: Special characters
    print("\nTest 4: Search with special characters")
    response = requests.get(f"{BASE_URL}/vetrine?text=C++", headers=headers)
    
    if response.status_code == 200:
        data = response.json()
        print(f"✓ Special character search returned {data['count']} results")
    
    # Test 5: Case sensitivity test
    print("\nTest 5: Case sensitivity test - 'ALGORITMI' vs 'algoritmi'")
    response1 = requests.get(f"{BASE_URL}/vetrine?text=ALGORITMI", headers=headers)
    response2 = requests.get(f"{BASE_URL}/vetrine?text=algoritmi", headers=headers)
    
    if response1.status_code == 200 and response2.status_code == 200:
        data1 = response1.json()
        data2 = response2.json()
        if data1['count'] == data2['count']:
            print(f"✓ Case insensitive search working correctly ({data1['count']} results)")
        else:
            print(f"? Case sensitivity issue: {data1['count']} vs {data2['count']}")

def test_search_result_structure(token):
    """Test the structure and completeness of search results"""
    print("\n" + "="*60)
    print("TESTING SEARCH RESULT STRUCTURE")
    print("="*60)
    
    headers = {"Authorization": f"Bearer {token}"}
    response = requests.get(f"{BASE_URL}/vetrine?text=test", headers=headers)
    
    if response.status_code == 200:
        data = response.json()
        
        # Check response structure
        if 'vetrine' in data and 'count' in data:
            print("✓ Response has correct structure (vetrine, count)")
        else:
            print("✗ Response missing required fields")
            return
        
        if data['count'] > 0:
            vetrina = data['vetrine'][0]
            
            # Check vetrina structure
            required_fields = ['id', 'name', 'description', 'author', 'course_instance']
            missing_fields = [field for field in required_fields if field not in vetrina]
            
            if not missing_fields:
                print("✓ Vetrina object has all required fields")
            else:
                print(f"✗ Vetrina missing fields: {missing_fields}")
            
            # Check author structure
            if 'author' in vetrina:
                author = vetrina['author']
                author_fields = ['id', 'username', 'name', 'surname', 'email']
                missing_author_fields = [field for field in author_fields if field not in author]
                
                if not missing_author_fields:
                    print("✓ Author object has all required fields")
                else:
                    print(f"✗ Author missing fields: {missing_author_fields}")
            
            # Check course_instance structure
            if 'course_instance' in vetrina:
                course = vetrina['course_instance']
                course_fields = ['instance_id', 'course_code', 'course_name', 'faculty_name']
                missing_course_fields = [field for field in course_fields if field not in course]
                
                if not missing_course_fields:
                    print("✓ Course instance has all required fields")
                else:
                    print(f"✗ Course instance missing fields: {missing_course_fields}")
            
            # Check if favorite field is present when user is authenticated
            if 'favorite' in vetrina:
                print("✓ Favorite status included for authenticated user")
            else:
                print("? Favorite status not present (may be expected)")
        
        print(f"✓ Search result structure validation completed for {data['count']} results")

def test_performance_and_limits(token):
    """Test search performance and limits"""
    print("\n" + "="*60)
    print("TESTING PERFORMANCE AND LIMITS")
    print("="*60)
    
    headers = {"Authorization": f"Bearer {token}"}
    
    # Test response time
    start_time = time.time()
    response = requests.get(f"{BASE_URL}/vetrine?text=test", headers=headers)
    end_time = time.time()
    
    if response.status_code == 200:
        response_time = (end_time - start_time) * 1000  # Convert to milliseconds
        print(f"✓ Search response time: {response_time:.2f}ms")
        
        data = response.json()
        if data['count'] <= 100:
            print(f"✓ Result limit respected: {data['count']} <= 100")
        else:
            print(f"? Result limit exceeded: {data['count']} > 100")

def cleanup_test_data(tokens):
    """Clean up test vetrine created during testing"""
    print("\n" + "="*60)
    print("CLEANING UP TEST DATA")
    print("="*60)
    
    cleaned_count = 0
    
    for token in tokens:
        headers = {"Authorization": f"Bearer {token}"}
        
        # Get all vetrine
        response = requests.get(f"{BASE_URL}/vetrine", headers=headers)
        if response.status_code == 200:
            data = response.json()
            
            # Delete test vetrine (those containing timestamp or test keywords)
            for vetrina in data['vetrine']:
                name = vetrina['name'].lower()
                if any(keyword in name for keyword in ['test', 'algoritmi', 'calcolo', 'fisica', 'programmazione', 'analisi', 'termodinamica']):
                    if any(char.isdigit() for char in vetrina['name']):  # Contains timestamp
                        delete_response = requests.delete(f"{BASE_URL}/vetrine/{vetrina['id']}", headers=headers)
                        if delete_response.status_code == 200:
                            cleaned_count += 1
                            print(f"  ✓ Deleted: {vetrina['name']}")
    
    print(f"✓ Cleaned up {cleaned_count} test vetrine")

def run_comprehensive_search_tests():
    """Run all comprehensive search tests"""
    print("="*60)
    print("COMPREHENSIVE SEARCH FUNCTIONALITY TESTS")
    print("="*60)
    
    try:
        # Setup
        tokens = setup_test_users()
        created_vetrine = create_test_vetrine(tokens)
        
        # Wait a moment for data to be available
        time.sleep(2)
        
        # Use first token for testing (any authenticated user)
        test_token = tokens[0]
        
        # Run all test suites
        test_text_search_priority(test_token)
        test_author_search(test_token)
        test_combined_search_filters(test_token)
        test_edge_cases(test_token)
        test_search_result_structure(test_token)
        test_performance_and_limits(test_token)
        
        # Cleanup
        cleanup_test_data(tokens)
        
        print("\n" + "="*60)
        print("ALL SEARCH TESTS COMPLETED SUCCESSFULLY")
        print("="*60)
        
    except Exception as e:
        print(f"\n✗ Test suite failed: {e}")
        import traceback
        traceback.print_exc()
        
        # Attempt cleanup even on failure
        try:
            if 'tokens' in locals():
                cleanup_test_data(tokens)
        except:
            pass
        
        sys.exit(1)

if __name__ == "__main__":
    run_comprehensive_search_tests()
