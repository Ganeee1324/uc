import requests
import json
import os
from PIL import Image
import base64
from io import BytesIO

def quick_test():
    """Quick test to check if model server is running"""
    
    model_server_url = "http://lancionaco.love:8222/enrich_snippets"
    pdf_path = r"Statistics Exam - DONE.pdf"
    
    print("Quick Model Server Test")
    print("=" * 30)
    
    # Check if PDF exists
    if not os.path.exists(pdf_path):
        print(f"❌ PDF file not found: {pdf_path}")
        return
    
    # Create minimal test data
    test_snippets = [
        {
            "description": "Test snippet for probability theory",
            "context": "Statistics, Mathematics",
            "page_number": 1
        }
    ]
    
    try:
        with open(pdf_path, 'rb') as pdf_file:
            files = {'pdf': ('test.pdf', pdf_file, 'application/pdf')}
            data = {
                'num_windows': 4, 
                'window_height_percentage': 0.35,
                'snippets': json.dumps(test_snippets)
            }
            
            print("Sending test request...")
            response = requests.post(
                model_server_url,
                files=files,
                data=data,
                timeout=60  # 1 minute timeout
            )
            
            print(f"Status: {response.status_code}")
            
            if response.status_code == 200:
                result = response.json()
                snippet = result['snippets'][0]
                print("✅ Server is working!")
                print(f"Image present: {'image' in snippet}")
                print(f"Embedding present: {'embedding' in snippet}")
                
                if 'image' in snippet and snippet['image']:
                    # Test image decoding
                    try:
                        image_data = base64.b64decode(snippet['image'])
                        image = Image.open(BytesIO(image_data))
                        print(f"Image size: {image.size}")
                        print("✅ Image decoding works!")
                    except Exception as e:
                        print(f"❌ Image decoding failed: {e}")
                
                if 'embedding' in snippet and snippet['embedding']:
                    print(f"Embedding length: {len(snippet['embedding'])}")
                    print("✅ Embedding generation works!")
                    
            else:
                print(f"❌ Server error: {response.text}")
                
    except requests.exceptions.ConnectionError:
        print("❌ Cannot connect to model server")
        print("Make sure it's running on localhost:8222")
        
    except requests.exceptions.Timeout:
        print("❌ Request timed out")
        print("Server might be overloaded or processing")
        
    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == "__main__":
    quick_test() 