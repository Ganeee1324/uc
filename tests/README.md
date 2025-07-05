# Search API Tests

This directory contains comprehensive tests for the marketplace backend search API functionality.

## Files

- `test_search_api.py` - Main test suite for search functionality
- `run_tests.py` - Test runner script with various options
- `requirements.txt` - Python dependencies for running tests
- `README.md` - This file

## Setup

1. **Install dependencies:**
   ```bash
   pip install -r tests/requirements.txt
   ```

2. **Configure environment variables:**
   Create a `.env` file in the project root with the following variables:
   ```
   TEST_BASE_URL=http://localhost:5000
   TEST_EMAIL=test@example.com
   TEST_PASSWORD=testpassword123
   TEST_USERNAME=testuser
   ```

3. **Start the API server:**
   Make sure your Flask application is running on the configured URL (default: http://localhost:5000)

## Running Tests

### Using the test runner (recommended):

```bash
# Run all tests with automatic dependency installation
python tests/run_tests.py

# Run tests in verbose mode
python tests/run_tests.py --verbose

# Run specific test
python tests/run_tests.py --test "test_search_with_text_parameter"

# Skip dependency installation
python tests/run_tests.py --no-install
```

### Using pytest directly:

```bash
# Run all search API tests
pytest tests/test_search_api.py -v

# Run specific test
pytest tests/test_search_api.py::TestSearchAPI::test_search_with_text_parameter -v

# Run tests matching a pattern
pytest tests/test_search_api.py -k "authentication" -v
```

## Test Coverage

The test suite covers the following search API functionality:

### Authentication Tests
- `test_search_without_authentication` - Tests unauthenticated search
- `test_search_with_authentication` - Tests authenticated search with favorite information

### Basic Search Tests
- `test_search_with_text_parameter` - Tests text search across multiple fields
- `test_search_response_structure` - Validates response structure

### Filter Tests
- `test_search_with_course_name_filter` - Tests exact course name filtering
- `test_search_with_faculty_filter` - Tests exact faculty filtering
- `test_search_with_language_filter` - Tests language filtering
- `test_search_with_date_year_filter` - Tests academic year filtering
- `test_search_with_course_year_filter` - Tests course year filtering
- `test_search_with_canale_filter` - Tests canale (channel) filtering
- `test_search_with_tag_filter` - Tests file tag filtering
- `test_search_with_extension_filter` - Tests file extension filtering

### Advanced Search Tests
- `test_search_with_multiple_filters` - Tests combining multiple filters
- `test_search_with_empty_parameters` - Tests handling of empty parameters
- `test_search_ordering_by_text_relevance` - Tests result ordering by relevance
- `test_search_limit` - Tests result limit (100 items)
- `test_search_with_invalid_parameters` - Tests handling of invalid parameter values
- `test_search_with_valid_integer_parameters` - Tests proper integer parameter conversion
- `test_search_parameter_type_validation` - Tests type validation and conversion of mixed parameters
- `test_search_case_insensitive` - Tests case-insensitive search

## API Endpoints Tested

- `GET /vetrine` - Main search endpoint with various query parameters:
  - `text` - Text search across multiple fields
  - `course_name` - Exact course name match
  - `faculty` - Exact faculty name match
  - `language` - Exact language match
  - `date_year` - Exact academic year match
  - `course_year` - Exact course year match
  - `canale` - Exact canale match
  - `tag` - File tag filter
  - `extension` - File extension filter

## Test Data Requirements

The tests expect:
1. A running Flask API server
2. A populated database with course instances, vetrine, and files
3. Valid user credentials for authentication tests

## Troubleshooting

### Common Issues

1. **Connection refused errors:**
   - Ensure the API server is running on the configured URL
   - Check that the `TEST_BASE_URL` environment variable is correct

2. **Authentication failures:**
   - Verify test user credentials in environment variables
   - The test will attempt to register a new user if login fails

3. **Database-related errors:**
   - Ensure the database is properly set up and populated
   - Check database connection settings in the main application

4. **Missing dependencies:**
   - Run `pip install -r tests/requirements.txt` to install required packages

### Debug Mode

For detailed debugging, run tests with maximum verbosity:

```bash
pytest tests/test_search_api.py -vvv --tb=long
```

## Contributing

When adding new search functionality:

1. Add corresponding test cases to `test_search_api.py`
2. Update this README with new test descriptions
3. Ensure all tests pass before submitting changes

## Notes

- Tests use the `requests` library to make actual HTTP calls to the API
- Authentication is handled via JWT tokens
- Tests are designed to be independent and can run in any order
- The test suite includes both positive and negative test cases 