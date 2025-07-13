#!/usr/bin/env python3
"""
Directory-based file upload script for marketplace backend.

This script walks through a directory structure where:
- Each subdirectory represents a vetrina
- The subdirectory name becomes the vetrina name
- All files in each subdirectory are uploaded to that vetrina
- Randomly assigns one of 3 users as the author of each vetrina

Usage:
    python upload_files_windows.py <directory_path>
"""

import os
import random
import sys
import requests
import json
from pathlib import Path
import mimetypes
from typing import Dict, List, Optional, Tuple

# Configuration
API_BASE_URL = "https://symbia.it:5000"  # Hardcoded IP as requested
VALID_EXTENSIONS = ["pdf", "docx", "txt", "xlsx"]
VALID_TAGS = ["dispense", "appunti", "esercizi"]

# User credentials for 3 different users
USERS = [
    {"email": "user1@example.com", "password": "password123", "name": "User1", "surname": "User1", "username": "user1"},
    {"email": "user2@example.com", "password": "password123", "name": "User2", "surname": "User2", "username": "user2"},
    {"email": "user3@example.com", "password": "password123", "name": "User3", "surname": "User3", "username": "user3"}
]

class MarketplaceUploader:
    def __init__(self, base_url: str = API_BASE_URL):
        self.base_url = base_url
        self.session = requests.Session()
        self.user_tokens = {}  # Dictionary to store tokens for each user
        
    def register_user(self, email: str, password: str, name: str, surname: str, username: str) -> bool:
        """Register a new user."""
        register_data = {
            "email": email,
            "password": password,
            "name": name,
            "surname": surname,
            "username": username
        }
        
        try:
            response = self.session.post(
                f"{self.base_url}/register",
                json=register_data,
                headers={"Content-Type": "application/json"}
            )
            
            if response.status_code == 200:
                print(f"✓ Successfully registered {name} ({email})")
                return True
            elif response.status_code == 400 and "already exists" in response.text.lower():
                print(f"ℹ User {name} ({email}) already exists")
                return True
            else:
                print(f"✗ Registration failed for {name}: {response.status_code} - {response.text}")
                return False
                
        except Exception as e:
            print(f"✗ Registration error for {name}: {e}")
            return False
    
    def login_user(self, email: str, password: str, name: str) -> bool:
        """Login a user and store their token."""
        login_data = {
            "email": email,
            "password": password
        }
        
        try:
            response = self.session.post(
                f"{self.base_url}/login",
                json=login_data,
                headers={"Content-Type": "application/json"}
            )
            
            if response.status_code == 200:
                data = response.json()
                token = data["access_token"]
                self.user_tokens[email] = token
                print(f"✓ Successfully logged in {name} ({email})")
                return True
            else:
                print(f"✗ Login failed for {name}: {response.status_code} - {response.text}")
                return False
                
        except Exception as e:
            print(f"✗ Login error for {name}: {e}")
            return False
    
    def setup_users(self) -> bool:
        """Register and login all users."""
        print("👥 Setting up users...")
        
        for user in USERS:
            # Register user
            if not self.register_user(user["email"], user["password"], user["name"], user["surname"], user["username"]):
                print(f"✗ Failed to register {user['name']}")
                return False
            
            # Login user
            if not self.login_user(user["email"], user["password"], user["name"]):
                print(f"✗ Failed to login {user['name']}")
                return False
        
        print(f"✓ All {len(USERS)} users are ready")
        return True
    
    def get_random_user_token(self) -> Optional[str]:
        """Get a random user's token."""
        if not self.user_tokens:
            print("✗ No user tokens available")
            return None
        
        email = random.choice(list(self.user_tokens.keys()))
        return self.user_tokens[email]
    
    def get_course_instances(self) -> List[Dict]:
        """Get available course instances from the hierarchy endpoint."""
        try:
            response = self.session.get(f"{self.base_url}/hierarchy")
            if response.status_code == 200:
                hierarchy = response.json()
                print(f"✓ Retrieved course hierarchy with {len(hierarchy)} faculties")
                return hierarchy
            else:
                print(f"✗ Failed to get hierarchy: {response.status_code}")
                return {}
        except Exception as e:
            print(f"✗ Error getting hierarchy: {e}")
            return {}
    
    def create_vetrina(self, name: str, description: str, course_instance_id: int = 1, price: float = 0.0) -> Optional[Tuple[int, str]]:
        """Create a new vetrina with a random user as author. Returns (vetrina_id, author_token)."""
        # Get a random user's token
        token = self.get_random_user_token()
        if not token:
            print("✗ No user tokens available. Please setup users first.")
            return None
            
        vetrina_data = {
            "name": name,
            "description": description,
            "course_instance_id": course_instance_id,
            "price": price
        }
        
        headers = {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json"
        }
        
        try:
            response = self.session.post(
                f"{self.base_url}/vetrine",
                json=vetrina_data,
                headers=headers
            )
            
            if response.status_code == 200:
                print(f"✓ Created vetrina: {name}")
                # Since the API doesn't return vetrina_id, we need to search for it
                vetrina_id = self.find_vetrina_id(name, token)
                if vetrina_id:
                    return (vetrina_id, token)
                else:
                    return None
            else:
                print(f"✗ Failed to create vetrina '{name}': {response.status_code} - {response.text}")
                return None
                
        except Exception as e:
            print(f"✗ Error creating vetrina '{name}': {e}")
            return None
    
    def find_vetrina_id(self, vetrina_name: str, token: str) -> Optional[int]:
        """Find vetrina ID by searching for vetrina with the given name."""
        headers = {
            "Authorization": f"Bearer {token}"
        }
        
        try:
            response = self.session.get(
                f"{self.base_url}/vetrine",
                params={"text": vetrina_name},
                headers=headers
            )
            
            if response.status_code == 200:
                data = response.json()
                vetrine = data.get("vetrine", [])
                
                # Look for exact match
                for vetrina in vetrine:
                    if vetrina["name"] == vetrina_name:
                        return vetrina["vetrina_id"]
                        
                print(f"✗ Could not find vetrina ID for '{vetrina_name}'")
                return None
            else:
                print(f"✗ Failed to search vetrine: {response.status_code}")
                return None
                
        except Exception as e:
            print(f"✗ Error searching for vetrina '{vetrina_name}': {e}")
            return None
    
    def upload_file(self, vetrina_id: int, file_path: Path, author_token: str, tag: Optional[str] = None) -> bool:
        """Upload a file to a vetrina using the author's token."""
        if not author_token:
            print("✗ No author token provided.")
            return False
            
        if not file_path.exists():
            print(f"✗ File not found: {file_path}")
            return False
            
        # Check file extension
        extension = file_path.suffix.lower().lstrip('.')
        if extension not in VALID_EXTENSIONS:
            print(f"✗ Invalid file extension '{extension}' for {file_path.name}. Valid extensions: {VALID_EXTENSIONS}")
            return False
                
        headers = {
            "Authorization": f"Bearer {author_token}"
        }
        
        try:
            with open(file_path, 'rb') as f:
                files = {
                    'file': (file_path.name, f, mimetypes.guess_type(str(file_path))[0] or 'application/octet-stream')
                }
                
                data = {}
                data['tag'] = random.choice(VALID_TAGS)
                
                response = self.session.post(
                    f"{self.base_url}/vetrine/{vetrina_id}/files",
                    files=files,
                    data=data,
                    headers=headers
                )
                
                if response.status_code == 200:
                    tag_info = f" (tag: {tag})" if tag else ""
                    print(f"  ✓ Uploaded: {file_path.name}{tag_info}")
                    return True
                else:
                    print(f"  ✗ Failed to upload {file_path.name}: {response.status_code} - {response.text}")
                    return False
                    
        except Exception as e:
            print(f"  ✗ Error uploading {file_path.name}: {e}")
            return False
    
    def process_directory(self, root_dir: Path) -> None:
        """Process a directory structure and upload files to vetrine."""
        if not root_dir.exists():
            print(f"✗ Directory not found: {root_dir}")
            return
            
        if not root_dir.is_dir():
            print(f"✗ Path is not a directory: {root_dir}")
            return
        
        print(f"📁 Processing directory: {root_dir}")
        
        # Get all subdirectories
        subdirs = [d for d in root_dir.iterdir() if d.is_dir()]
        
        if not subdirs:
            print("✗ No subdirectories found. Each subdirectory should represent a vetrina.")
            return
        
        print(f"Found {len(subdirs)} subdirectories (vetrine)")
        
        # Process each subdirectory as a vetrina
        for subdir in subdirs:
            vetrina_name = subdir.name
            description = f"Vetrina for {vetrina_name} - auto-generated"
            
            print(f"\n📚 Processing vetrina: {vetrina_name}")
            
            # Create vetrina
            result = self.create_vetrina(vetrina_name, description, price=random.uniform(2.0, 3.0))
            if result is None:
                print(f"  ✗ Skipping {vetrina_name} due to vetrina creation failure")
                continue
            
            vetrina_id, author_token = result
            
            # Get all files in the subdirectory
            files_to_upload = []
            for file_path in subdir.iterdir():
                if file_path.is_file():
                    files_to_upload.append(file_path)
            
            if not files_to_upload:
                print(f"  ⚠ No files found in {vetrina_name}")
                continue
            
            print(f"  📄 Found {len(files_to_upload)} files to upload")
            
            # Upload each file
            successful_uploads = 0
            for file_path in files_to_upload:
                if self.upload_file(vetrina_id, file_path, author_token):
                    successful_uploads += 1
            
            print(f"  📊 Upload summary: {successful_uploads}/{len(files_to_upload)} files uploaded successfully")

def main():
    directory_path = Path(r"C:\Users\fdimo\Desktop\TES-MARKDOWN")
    
    # Initialize uploader
    uploader = MarketplaceUploader()
    
    # Setup users (register and login)
    print("🔐 Setting up users...")
    if not uploader.setup_users():
        print("✗ User setup failed. Please check your credentials and API availability.")
        sys.exit(1)
    
    # Process directory
    uploader.process_directory(directory_path)
    
    print("\n🎉 Upload process completed!")

if __name__ == "__main__":
    main()