import pytest
import requests
import json
from typing import Dict, Any, Optional
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Test configuration
BASE_URL = os.getenv("TEST_BASE_URL", "http://localhost:5000")
TEST_EMAIL = os.getenv("TEST_EMAIL", "test@example.com")
TEST_PASSWORD = os.getenv("TEST_PASSWORD", "testpassword")
TEST_USERNAME = os.getenv("TEST_USERNAME", "testuser")


class TestSearchAPI:
    """Test suite for the search API functionality"""
    
    def setup_method(self):
        """Setup method called before each test"""
        self.base_url = BASE_URL
        self.access_token = None
        self.headers = {"Content-Type": "application/json"}
        
    def _make_request(self, method: str, endpoint: str, data: Optional[Dict] = None, 
                     params: Optional[Dict] = None, auth_required: bool = False) -> requests.Response:
        """Helper method to make HTTP requests"""
        url = f"{self.base_url}{endpoint}"
        headers = self.headers.copy()
        
        if auth_required and self.access_token:
            headers["Authorization"] = f"Bearer {self.access_token}"
            
        if method.upper() == "GET":
            return requests.get(url, headers=headers, params=params)
        elif method.upper() == "POST":
            return requests.post(url, headers=headers, json=data, params=params)
        elif method.upper() == "DELETE":
            return requests.delete(url, headers=headers, params=params)
        else:
            raise ValueError(f"Unsupported HTTP method: {method}")
    
    def _login(self) -> str:
        """Helper method to login and get access token"""
        login_data = {
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        }
        
        response = self._make_request("POST", "/login", data=login_data)
        
        if response.status_code == 200:
            self.access_token = response.json()["access_token"]
            return self.access_token
        else:
            # Try to register first if login fails
            register_data = {
                "email": TEST_EMAIL,
                "password": TEST_PASSWORD,
                "username": TEST_USERNAME,
                "name": "Test",
                "surname": "User"
            }
            
            register_response = self._make_request("POST", "/register", data=register_data)
            if register_response.status_code == 200:
                self.access_token = register_response.json()["access_token"]
                return self.access_token
            else:
                raise Exception(f"Failed to login or register: {register_response.text}")
    
    def test_search_without_authentication(self):
        """Test search functionality without authentication"""
        response = self._make_request("GET", "/vetrine")
        
        assert response.status_code == 200
        data = response.json()
        
        # Check response structure
        assert "vetrine" in data
        assert "count" in data
        assert isinstance(data["vetrine"], list)
        assert isinstance(data["count"], int)
        assert data["count"] == len(data["vetrine"])
        
        # Check that favorite field is not included when not authenticated
        if data["vetrine"]:
            vetrina = data["vetrine"][0]
            assert "favorite" not in vetrina or vetrina["favorite"] is False
    
    def test_search_with_authentication(self):
        """Test search functionality with authentication"""
        self._login()
        
        response = self._make_request("GET", "/vetrine", auth_required=True)
        
        assert response.status_code == 200
        data = response.json()
        
        # Check response structure
        assert "vetrine" in data
        assert "count" in data
        assert isinstance(data["vetrine"], list)
        assert isinstance(data["count"], int)
        
        # Check that favorite field is included when authenticated
        if data["vetrine"]:
            vetrina = data["vetrine"][0]
            assert "favorite" in vetrina
            assert isinstance(vetrina["favorite"], bool)
    
    def test_search_with_text_parameter(self):
        """Test search with text parameter"""
        search_params = {"text": "programming"}
        
        response = self._make_request("GET", "/vetrine", params=search_params)
        
        assert response.status_code == 200
        data = response.json()
        
        assert "vetrine" in data
        assert "count" in data
        assert isinstance(data["vetrine"], list)
        
        # Verify search results contain the search term (case-insensitive)
        search_term = search_params["text"].lower()
        for vetrina in data["vetrine"]:
            # Check if search term appears in name, description, course_name, or faculty_name
            found_in_name = search_term in vetrina["name"].lower()
            found_in_description = search_term in vetrina["description"].lower()
            found_in_course = search_term in vetrina["course_instance"]["course_name"].lower()
            found_in_faculty = search_term in vetrina["course_instance"]["faculty_name"].lower()
            found_in_author = search_term in vetrina["author"]["username"].lower()
            found_in_author_name = search_term in f"{vetrina['author']['first_name']} {vetrina['author']['last_name']}".lower()
            
            assert any([found_in_name, found_in_description, found_in_course, 
                       found_in_faculty, found_in_author, found_in_author_name])
    
    def test_search_with_course_name_filter(self):
        """Test search with course_name filter"""
        search_params = {"course_name": "Mathematics"}
        
        response = self._make_request("GET", "/vetrine", params=search_params)
        
        assert response.status_code == 200
        data = response.json()
        
        # Verify all results match the course name filter
        for vetrina in data["vetrine"]:
            assert vetrina["course_instance"]["course_name"] == search_params["course_name"]
    
    def test_search_with_faculty_filter(self):
        """Test search with faculty filter"""
        search_params = {"faculty": "Engineering"}
        
        response = self._make_request("GET", "/vetrine", params=search_params)
        
        assert response.status_code == 200
        data = response.json()
        
        # Verify all results match the faculty filter
        for vetrina in data["vetrine"]:
            assert vetrina["course_instance"]["faculty_name"] == search_params["faculty"]
    
    def test_search_with_language_filter(self):
        """Test search with language filter"""
        search_params = {"language": "EN"}
        
        response = self._make_request("GET", "/vetrine", params=search_params)
        
        assert response.status_code == 200
        data = response.json()
        
        # Verify all results match the language filter
        for vetrina in data["vetrine"]:
            assert vetrina["course_instance"]["language"] == search_params["language"]
    
    def test_search_with_date_year_filter(self):
        """Test search with date_year filter"""
        search_params = {"date_year": "2024"}
        
        response = self._make_request("GET", "/vetrine", params=search_params)
        
        assert response.status_code == 200
        data = response.json()
        
        # Verify all results match the date_year filter
        for vetrina in data["vetrine"]:
            assert vetrina["course_instance"]["date_year"] == int(search_params["date_year"])
    
    def test_search_with_course_year_filter(self):
        """Test search with course_year filter"""
        search_params = {"course_year": "1"}
        
        response = self._make_request("GET", "/vetrine", params=search_params)
        
        assert response.status_code == 200
        data = response.json()
        
        # Verify all results match the course_year filter
        for vetrina in data["vetrine"]:
            assert vetrina["course_instance"]["course_year"] == int(search_params["course_year"])
    
    def test_search_with_canale_filter(self):
        """Test search with canale filter"""
        search_params = {"canale": "A"}
        
        response = self._make_request("GET", "/vetrine", params=search_params)
        
        assert response.status_code == 200
        data = response.json()
        
        # Verify all results match the canale filter
        for vetrina in data["vetrine"]:
            assert vetrina["course_instance"]["canale"] == search_params["canale"]
    
    def test_search_with_tag_filter(self):
        """Test search with tag filter (file-based filter)"""
        search_params = {"tag": "appunti"}
        
        response = self._make_request("GET", "/vetrine", params=search_params)
        
        assert response.status_code == 200
        data = response.json()
        
        # Note: This test assumes that vetrine with the specified tag exist
        # The actual verification would require checking the files in each vetrina
        assert "vetrine" in data
        assert "count" in data
    
    def test_search_with_extension_filter(self):
        """Test search with extension filter (file-based filter)"""
        search_params = {"extension": "pdf"}
        
        response = self._make_request("GET", "/vetrine", params=search_params)
        
        assert response.status_code == 200
        data = response.json()
        
        # Note: This test assumes that vetrine with PDF files exist
        assert "vetrine" in data
        assert "count" in data
    
    def test_search_with_multiple_filters(self):
        """Test search with multiple filters combined"""
        search_params = {
            "text": "programming",
            "language": "EN",
            "course_year": "2"
        }
        
        response = self._make_request("GET", "/vetrine", params=search_params)
        
        assert response.status_code == 200
        data = response.json()
        
        # Verify all results match all filters
        search_term = search_params["text"].lower()
        for vetrina in data["vetrine"]:
            # Check text search
            found_in_name = search_term in vetrina["name"].lower()
            found_in_description = search_term in vetrina["description"].lower()
            found_in_course = search_term in vetrina["course_instance"]["course_name"].lower()
            found_in_faculty = search_term in vetrina["course_instance"]["faculty_name"].lower()
            found_in_author = search_term in vetrina["author"]["username"].lower()
            found_in_author_name = search_term in f"{vetrina['author']['first_name']} {vetrina['author']['last_name']}".lower()
            
            assert any([found_in_name, found_in_description, found_in_course, 
                       found_in_faculty, found_in_author, found_in_author_name])
            
            # Check other filters - note that course_year is now an integer
            assert vetrina["course_instance"]["language"] == search_params["language"]
            assert vetrina["course_instance"]["course_year"] == int(search_params["course_year"])
    
    def test_search_with_empty_parameters(self):
        """Test search with empty parameters"""
        search_params = {"text": "", "course_name": ""}
        
        response = self._make_request("GET", "/vetrine", params=search_params)
        
        assert response.status_code == 200
        data = response.json()
        
        # Empty parameters should be ignored and return all vetrine
        assert "vetrine" in data
        assert "count" in data
    
    def test_search_response_structure(self):
        """Test that search response has correct structure"""
        response = self._make_request("GET", "/vetrine")
        
        assert response.status_code == 200
        data = response.json()
        
        # Check main response structure
        assert "vetrine" in data
        assert "count" in data
        assert isinstance(data["vetrine"], list)
        assert isinstance(data["count"], int)
        
        # Check vetrina structure if results exist
        if data["vetrine"]:
            vetrina = data["vetrine"][0]
            
            # Required fields
            assert "vetrina_id" in vetrina
            assert "name" in vetrina
            assert "description" in vetrina
            assert "author" in vetrina
            assert "course_instance" in vetrina
            
            # Author structure
            author = vetrina["author"]
            assert "user_id" in author
            assert "username" in author
            assert "first_name" in author
            assert "last_name" in author
            
            # Course instance structure
            course = vetrina["course_instance"]
            assert "instance_id" in course
            assert "course_code" in course
            assert "course_name" in course
            assert "faculty_name" in course
            assert "course_year" in course
            assert "date_year" in course
            assert "language" in course
            assert "course_semester" in course
            assert "canale" in course
            assert "professors" in course
    
    def test_search_ordering_by_text_relevance(self):
        """Test that search results are ordered by text relevance"""
        search_params = {"text": "test"}
        
        response = self._make_request("GET", "/vetrine", params=search_params)
        
        assert response.status_code == 200
        data = response.json()
        
        if len(data["vetrine"]) > 1:
            # Check that results are ordered by relevance
            # (vetrina name matches should come before description matches, etc.)
            search_term = search_params["text"].lower()
            
            previous_priority = 0
            for vetrina in data["vetrine"]:
                current_priority = 7  # default priority
                
                if search_term in vetrina["name"].lower():
                    current_priority = 1
                elif search_term in vetrina["description"].lower():
                    current_priority = 2
                elif search_term in vetrina["course_instance"]["course_name"].lower():
                    current_priority = 3
                elif search_term in vetrina["course_instance"]["faculty_name"].lower():
                    current_priority = 4
                elif search_term in vetrina["author"]["username"].lower():
                    current_priority = 5
                elif search_term in f"{vetrina['author']['first_name']} {vetrina['author']['last_name']}".lower():
                    current_priority = 6
                
                # Priority should not decrease (lower number = higher priority)
                assert current_priority >= previous_priority
                previous_priority = current_priority
    
    def test_search_limit(self):
        """Test that search results are limited to 100 items"""
        response = self._make_request("GET", "/vetrine")
        
        assert response.status_code == 200
        data = response.json()
        
        # Results should be limited to 100 items
        assert len(data["vetrine"]) <= 100
        assert data["count"] == len(data["vetrine"])
    
    def test_search_with_invalid_parameters(self):
        """Test search with invalid parameter values"""
        search_params = {"date_year": "invalid_year"}
        
        response = self._make_request("GET", "/vetrine", params=search_params)
        
        # Should still return 200 - invalid integer parameters are silently skipped
        assert response.status_code == 200
        data = response.json()
        assert "vetrine" in data
        assert "count" in data
        # The invalid date_year parameter should be ignored, so this should return all vetrine
        
    def test_search_with_valid_integer_parameters(self):
        """Test search with valid integer parameters"""
        search_params = {
            "date_year": "2024",
            "course_year": "2"
        }
        
        response = self._make_request("GET", "/vetrine", params=search_params)
        
        assert response.status_code == 200
        data = response.json()
        assert "vetrine" in data
        assert "count" in data
        
        # Verify that integer filters are properly applied
        for vetrina in data["vetrine"]:
            assert vetrina["course_instance"]["date_year"] == 2024  # Should be integer
            assert vetrina["course_instance"]["course_year"] == 2  # Should be integer
    
    def test_search_case_insensitive(self):
        """Test that text search is case insensitive"""
        search_params_lower = {"text": "programming"}
        search_params_upper = {"text": "PROGRAMMING"}
        search_params_mixed = {"text": "Programming"}
        
        response_lower = self._make_request("GET", "/vetrine", params=search_params_lower)
        response_upper = self._make_request("GET", "/vetrine", params=search_params_upper)
        response_mixed = self._make_request("GET", "/vetrine", params=search_params_mixed)
        
        assert response_lower.status_code == 200
        assert response_upper.status_code == 200
        assert response_mixed.status_code == 200
        
        # All should return the same results
        data_lower = response_lower.json()
        data_upper = response_upper.json()
        data_mixed = response_mixed.json()
        
        assert data_lower["count"] == data_upper["count"] == data_mixed["count"]
    
    def test_search_parameter_type_validation(self):
        """Test that parameter types are properly validated and converted"""
        # Test with mixed valid and invalid parameters
        search_params = {
            "text": "programming",
            "date_year": "2024",  # Valid integer as string
            "course_year": "invalid",  # Invalid integer - should be ignored
            "language": "EN"  # Valid string
        }
        
        response = self._make_request("GET", "/vetrine", params=search_params)
        
        assert response.status_code == 200
        data = response.json()
        assert "vetrine" in data
        assert "count" in data
        
        # Results should be filtered by text, date_year, and language
        # course_year should be ignored due to invalid value
        for vetrina in data["vetrine"]:
            assert vetrina["course_instance"]["date_year"] == 2024
            assert vetrina["course_instance"]["language"] == "EN"
            # course_year filter should not be applied (any value is acceptable)


if __name__ == "__main__":
    # Run tests with pytest
    pytest.main([__file__, "-v"]) 