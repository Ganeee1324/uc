#!/usr/bin/env python3
"""
Directory-based file upload script for marketplace backend.

This script walks through a directory structure where:
- Each subdirectory represents a vetrina
- The subdirectory name becomes the vetrina name
- All files in each subdirectory are uploaded to that vetrina

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
API_BASE_URL = "http://146.59.236.26:5000"  # Hardcoded IP as requested
VALID_EXTENSIONS = ["pdf", "docx", "txt", "xlsx"]
VALID_TAGS = ["dispense", "appunti", "esercizi"]

# Authentication credentials - modify these as needed
LOGIN_EMAIL = "admin@admin.com"
LOGIN_PASSWORD = "admin"

class MarketplaceUploader:
    def __init__(self, base_url: str = API_BASE_URL):
        self.base_url = base_url
        self.session = requests.Session()
        self.access_token = None
        
    def login(self, email: str, password: str) -> bool:
        """Login to the marketplace API and get access token."""
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
                self.access_token = data["access_token"]
                print(f"✓ Successfully logged in as {email}")
                return True
            else:
                print(f"✗ Login failed: {response.status_code} - {response.text}")
                return False
                
        except Exception as e:
            print(f"✗ Login error: {e}")
            return False
    
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
    
    def create_vetrina(self, name: str, description: str, course_instance_id: int = 1, price: float = 0.0) -> Optional[int]:
        """Create a new vetrina."""
        if not self.access_token:
            print("✗ Not authenticated. Please login first.")
            return None
            
        vetrina_data = {
            "name": name,
            "description": description,
            "course_instance_id": course_instance_id,
            "price": price
        }
        
        headers = {
            "Authorization": f"Bearer {self.access_token}",
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
                return self.find_vetrina_id(name)
            else:
                print(f"✗ Failed to create vetrina '{name}': {response.status_code} - {response.text}")
                return None
                
        except Exception as e:
            print(f"✗ Error creating vetrina '{name}': {e}")
            return None
    
    def find_vetrina_id(self, vetrina_name: str) -> Optional[int]:
        """Find vetrina ID by searching for vetrina with the given name."""
        if not self.access_token:
            return None
            
        headers = {
            "Authorization": f"Bearer {self.access_token}"
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
    
    def upload_file(self, vetrina_id: int, file_path: Path, tag: Optional[str] = None) -> bool:
        """Upload a file to a vetrina."""
        if not self.access_token:
            print("✗ Not authenticated. Please login first.")
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
            "Authorization": f"Bearer {self.access_token}"
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
            vetrina_id = self.create_vetrina(vetrina_name, description, price=random.uniform(2.0, 3.0))
            if vetrina_id is None:
                print(f"  ✗ Skipping {vetrina_name} due to vetrina creation failure")
                continue
            
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
                if self.upload_file(vetrina_id, file_path):
                    successful_uploads += 1
            
            print(f"  📊 Upload summary: {successful_uploads}/{len(files_to_upload)} files uploaded successfully")

def main():
    directory_path = Path(r"C:\Users\fdimo\Desktop\TES-MARKDOWN")
    
    # Initialize uploader
    uploader = MarketplaceUploader()
    
    # Login
    print("🔐 Logging in...")
    if not uploader.login(LOGIN_EMAIL, LOGIN_PASSWORD):
        print("✗ Authentication failed. Please check your credentials.")
        sys.exit(1)
    
    # Process directory
    uploader.process_directory(directory_path)
    
    print("\n🎉 Upload process completed!")

if __name__ == "__main__":
    main()