import sys
import pathlib
import os
import hashlib
import uuid
from datetime import datetime

# Ensure project root is on the path
sys.path.append(str(pathlib.Path(__file__).resolve().parents[1]))

from database import connect, create_vetrina, add_file_to_vetrina

def create_test_file(filename, content):
    """Create a test file with given content"""
    files_dir = "files"
    os.makedirs(files_dir, exist_ok=True)
    
    file_content = content.encode('utf-8')
    file_hash = hashlib.sha256(file_content).hexdigest()
    
    # Create unique filename
    unique_filename = f"{uuid.uuid4()}-1-{filename}"
    file_path = os.path.join(files_dir, unique_filename)
    
    with open(file_path, 'wb') as f:
        f.write(file_content)
    
    return unique_filename, file_hash, len(file_content)

def populate_database():
    """Populate database with test vetrine and files"""
    
    # Get admin user ID (created during setup)
    with connect() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT id FROM users WHERE username = 'admin'")
            admin_user = cur.fetchone()
            if not admin_user:
                print("No admin user found. Run setup_database.py first.")
                return
            user_id = admin_user['id']
            
            # Get some course instances to use
            cur.execute("SELECT id, course_name, faculty_name FROM course_instances LIMIT 5")
            courses = cur.fetchall()
            if not courses:
                print("No course instances found. Run setup_database.py first.")
                return
    
    print(f"Creating test vetrine and files for user ID: {user_id}")
    
    # Create test vetrine and files
    vetrine_data = [
        {
            "name": "Appunti Completi Analisi Matematica I",
            "description": "Appunti dettagliati del corso di Analisi Matematica I, con tutti i teoremi, dimostrazioni ed esercizi svolti. Include limiti, derivate, integrali e serie numeriche.",
            "files": [
                ("appunti_analisi_1.pdf", "# Appunti Analisi Matematica I\n\n## Capitolo 1: Limiti\n\nDefinizione di limite...\n\n## Capitolo 2: Derivate\n\nLa derivata di una funzione...", 0),
                ("formulario_analisi.pdf", "# Formulario Analisi Matematica\n\n∫ x dx = x²/2 + C\n∫ sin(x) dx = -cos(x) + C\n...", 5)
            ]
        },
        {
            "name": "Slides Fisica Generale",
            "description": "Raccolta completa delle slides utilizzate durante le lezioni di Fisica Generale. Coprono meccanica, termodinamica, elettromagnetismo e ottica.",
            "files": [
                ("slides_meccanica.pdf", "# Fisica Generale - Meccanica\n\n## Cinematica\nMoto rettilineo uniforme: s = vt\n\n## Dinamica\nF = ma\n...", 3),
                ("esercizi_fisica.pdf", "# Esercizi Fisica Generale\n\n1. Un corpo di massa m = 5kg...\n2. Calcolare la forza necessaria...", 0)
            ]
        },
        {
            "name": "Riassunto Programmazione Java",
            "description": "Riassunto completo del corso di Programmazione in Java. Include sintassi, OOP, collections, thread e design patterns con esempi pratici.",
            "files": [
                ("riassunto_java.pdf", "# Programmazione Java - Riassunto\n\n## Tipi di dati\nint, double, String...\n\n## Classi e Oggetti\npublic class Persona { ... }", 0),
                ("esempi_codice.pdf", "# Esempi di Codice Java\n\n```java\npublic class HelloWorld {\n    public static void main(String[] args) {\n        System.out.println(\"Hello World!\");\n    }\n}\n```", 2)
            ]
        }
    ]
    
    created_vetrine = []
    
    for i, vetrina_info in enumerate(vetrine_data):
        # Use different course instances for variety
        course = courses[i % len(courses)]
        
        print(f"\nCreating vetrina: {vetrina_info['name']}")
        print(f"Course: {course['course_name']} - {course['faculty_name']}")
        
        # Create vetrina
        vetrina = create_vetrina(
            user_id=user_id,
            course_instance_id=course['id'],
            name=vetrina_info['name'],
            description=vetrina_info['description']
        )
        
        created_vetrine.append(vetrina)
        print(f"✓ Created vetrina ID: {vetrina.id}")
        
        # Add files to vetrina
        for filename, content, price in vetrina_info['files']:
            print(f"  Adding file: {filename}")
            
            # Create the physical file
            unique_filename, file_hash, file_size = create_test_file(filename, content)
            
            # Add to database
            db_file = add_file_to_vetrina(
                requester_id=user_id,
                vetrina_id=vetrina.id,
                file_name=unique_filename,
                sha256=file_hash,
                price=price,
                size=file_size
            )
            
            print(f"  ✓ Created file ID: {db_file.id} (Price: €{price})")
    
    print(f"\n🎉 Successfully created {len(created_vetrine)} vetrine with files!")
    
    # Print summary
    print("\n📊 Database Summary:")
    with connect() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT COUNT(*) as cnt FROM vetrina")
            vetrina_count = cur.fetchone()['cnt']
            cur.execute("SELECT COUNT(*) as cnt FROM files")
            files_count = cur.fetchone()['cnt']
            
            print(f"  Vetrine: {vetrina_count}")
            print(f"  Files: {files_count}")

if __name__ == '__main__':
    populate_database() 