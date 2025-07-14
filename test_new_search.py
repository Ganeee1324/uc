#!/usr/bin/env python3
"""
Test file for the new search function.
Tests semantic + keyword search with vector embeddings.
"""

import requests
import json
import sys
from typing import Dict, Any

# Configuration
BASE_URL = "http://127.0.0.1:5000"
SEARCH_ENDPOINT = f"{BASE_URL}/vetrine/search"


def test_search(query: str, description: str = "", params: Dict[str, Any] = {}) -> Dict[str, Any]:
    """
    Test the new search endpoint with a given query.

    Args:
        query: The search query string
        description: Optional description of what we're testing

    Returns:
        Dictionary containing the response data
    """
    print(f"\n{'='*60}")
    print(f"Testing search: '{query}'")
    if description:
        print(f"Description: {description}")
    print(f"{'='*60}")

    response = requests.get(SEARCH_ENDPOINT, params={"q": query, **params})

    print(f"Status Code: {response.status_code}")
    print(f"Response Headers: {dict(response.headers)}")

    if response.status_code == 200:
        data = response.json()
        print(f"Results found: {data.get('count', 0)}")
        print(f"Query processed: {data.get('query', 'N/A')}")

        # Display results
        vetrine = data.get("vetrine")
        # print the first 5 results
        for i, vetrina in enumerate(vetrine):
            print(f"\nResult {i+1}:")
            print(f"  Name: {vetrina.get('name')}")
            print(f"  Description: {vetrina.get('description', '')[:100]}...")
            if file_id := vetrina.get("file_id"):
                file_info = get_file_info(file_id)
                print(f"  File name: {file_info.get('filename')}")
                print(f"  Page number: {vetrina.get('page_number') + 1}")
                print(f"  Combined score: {vetrina.get('combined_score')}")
            else:
                print("  No file associated")
                raise Exception("No file associated")

        return data
    else:
        print(f"Error: {response.status_code}")
        try:
            error_data = response.json()
            print(f"Error details: {json.dumps(error_data, indent=2)}")
        except:
            print(f"Error response: {response.text}")
        return {}


def get_file_info(file_id: int) -> Dict[str, Any]:
    """
    Get the information of a file.
    """
    response = requests.get(f"{BASE_URL}/files/{file_id}")
    return response.json()


def test_server_connection():
    """Test if the server is running and accessible."""
    print("Testing server connection...")
    response = requests.get(f"{BASE_URL}/hierarchy", timeout=5)
    if response.status_code == 200:
        print("✅ Server is running and accessible")
        return True
    else:
        print(f"⚠️  Server responded with status {response.status_code}")
        return False


def main():
    """Main test function."""
    print("🔍 New Search Function Test Suite")
    print("=" * 60)

    # Test server connection first
    if not test_server_connection():
        print("\n❌ Cannot proceed with tests - server is not accessible")
        sys.exit(1)

    # Test queries
    test_queries = [
        {"query": "probability", "description": "Testing English search for spectral decomposition", "params": {}},
        # {"query": "explanation of entropy and cross entropy", "description": "Testing English search for notes on entropy"},
    ]

    results = []
    for test_case in test_queries:
        result = test_search(test_case["query"], test_case["description"], test_case["params"])
        results.append(
            {
                "query": test_case["query"],
                "description": test_case["description"],
                "success": bool(result),
                "count": result.get("count", 0) if result else 0,
            }
        )

    # Summary
    print(f"\n{'='*60}")
    print("TEST SUMMARY")
    print(f"{'='*60}")

    successful_tests = sum(1 for r in results if r["success"])
    total_tests = len(results)

    print(f"Tests completed: {total_tests}")
    print(f"Successful tests: {successful_tests}")
    print(f"Failed tests: {total_tests - successful_tests}")

    print(f"\nDetailed Results:")
    for result in results:
        status = "✅" if result["success"] else "❌"
        print(f"{status} '{result['query']}' - {result['count']} results")

    if successful_tests == total_tests:
        print(f"\n🎉 All tests passed!")
    else:
        print(f"\n⚠️  Some tests failed. Check the server logs for details.")


if __name__ == "__main__":
    main()
