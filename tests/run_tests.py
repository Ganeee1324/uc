#!/usr/bin/env python3
"""
Test runner for the marketplace backend search API tests.

This script runs the search API tests and provides options for different test configurations.
"""

import subprocess
import sys
import os
import argparse
from pathlib import Path

def run_command(cmd, cwd=None):
    """Run a command and return the result"""
    try:
        result = subprocess.run(cmd, shell=True, cwd=cwd, capture_output=True, text=True)
        return result.returncode == 0, result.stdout, result.stderr
    except Exception as e:
        return False, "", str(e)

def install_requirements():
    """Install test requirements"""
    print("Installing test requirements...")
    success, stdout, stderr = run_command("pip install -r requirements.txt", cwd="tests")
    if not success:
        print(f"Failed to install requirements: {stderr}")
        return False
    print("Requirements installed successfully")
    return True

def run_tests(test_file=None, verbose=False, specific_test=None):
    """Run the tests"""
    print("Running search API tests...")
    
    # Build pytest command
    cmd_parts = ["python", "-m", "pytest"]
    
    if verbose:
        cmd_parts.append("-v")
    
    if specific_test:
        cmd_parts.extend(["-k", specific_test])
    
    if test_file:
        cmd_parts.append(test_file)
    else:
        cmd_parts.append("test_search_api.py")
    
    cmd = " ".join(cmd_parts)
    
    print(f"Running: {cmd}")
    success, stdout, stderr = run_command(cmd, cwd="tests")
    
    print(stdout)
    if stderr:
        print("STDERR:", stderr)
    
    return success

def main():
    parser = argparse.ArgumentParser(description="Run marketplace backend search API tests")
    parser.add_argument("--install", action="store_true", help="Install test requirements")
    parser.add_argument("--verbose", "-v", action="store_true", help="Run tests in verbose mode")
    parser.add_argument("--test", "-t", help="Run specific test (pattern matching)")
    parser.add_argument("--file", "-f", help="Run specific test file")
    parser.add_argument("--no-install", action="store_true", help="Skip installing requirements")
    
    args = parser.parse_args()
    
    # Change to project root directory
    script_dir = Path(__file__).parent
    os.chdir(script_dir.parent)
    
    # Install requirements unless explicitly skipped
    if not args.no_install:
        if not install_requirements():
            print("Failed to install requirements. Use --no-install to skip.")
            sys.exit(1)
    
    # Run tests
    success = run_tests(
        test_file=args.file,
        verbose=args.verbose,
        specific_test=args.test
    )
    
    if success:
        print("\n✅ All tests passed!")
        sys.exit(0)
    else:
        print("\n❌ Some tests failed!")
        sys.exit(1)

if __name__ == "__main__":
    main() 