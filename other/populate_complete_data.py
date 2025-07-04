import sys
import pathlib
import os
import hashlib
import uuid
from datetime import datetime, timedelta
import random

# Ensure project root is on the path
sys.path.append(str(pathlib.Path(__file__).resolve().parents[1]))

from database import connect, create_vetrina, add_file_to_vetrina

def create_realistic_file(filename, content, file_type="pdf"):
    """Create a realistic file with given content"""
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

def generate_realistic_content(subject, file_type):
    """Generate realistic content based on subject and file type"""
    
    if file_type == "dispense":
        return f"""# Dispense {subject}

## Introduzione
Queste dispense coprono i concetti fondamentali di {subject} e sono state preparate per gli studenti del corso.

## Contenuti principali
1. Concetti base
2. Teoria avanzata
3. Applicazioni pratiche
4. Esempi risolti

## Bibliografia
- Testo principale del corso
- Articoli scientifici di riferimento
- Materiale aggiuntivo consigliato

---
*Preparato per il corso universitario - Anno Accademico 2024/2025*
"""
    
    elif file_type == "appunti":
        return f"""# Appunti {subject}

## Lezione 1: Introduzione
- Concetti fondamentali
- Definizioni importanti
- Esempi pratici

## Lezione 2: Sviluppo teorico
- Teoremi principali
- Dimostrazioni
- Corollari

## Lezione 3: Applicazioni
- Problemi risolti
- Metodologie
- Tecniche avanzate

## Lezione 4: Esercitazioni
- Esercizi guidati
- Problemi da svolgere
- Soluzioni commentate

---
*Appunti presi durante le lezioni - {subject}*
"""
    
    elif file_type == "esercizi":
        return f"""# Esercizi {subject}

## Esercizio 1
**Problema:** [Descrizione del problema]
**Soluzione:** [Soluzione dettagliata]

## Esercizio 2
**Problema:** [Descrizione del problema]
**Soluzione:** [Soluzione dettagliata]

## Esercizio 3
**Problema:** [Descrizione del problema]
**Soluzione:** [Soluzione dettagliata]

## Esercizio 4
**Problema:** [Descrizione del problema]
**Soluzione:** [Soluzione dettagliata]

## Esercizio 5
**Problema:** [Descrizione del problema]
**Soluzione:** [Soluzione dettagliata]

---
*Raccolta di esercizi per {subject}*
"""
    
    elif file_type == "formulario":
        return f"""# Formulario {subject}

## Formule fondamentali
- Formula 1: [formula matematica]
- Formula 2: [formula matematica]
- Formula 3: [formula matematica]

## Teoremi principali
- Teorema 1: [enunciato]
- Teorema 2: [enunciato]
- Teorema 3: [enunciato]

## Corollari
- Corollario 1: [enunciato]
- Corollario 2: [enunciato]

## Tabelle di riferimento
- Tabella 1: [dati di riferimento]
- Tabella 2: [dati di riferimento]

---
*Formulario completo per {subject}*
"""
    
    elif file_type == "progetto":
        return f"""# Progetto {subject}

## Obiettivi del progetto
- Obiettivo 1
- Obiettivo 2
- Obiettivo 3

## Metodologia
- Fase 1: [descrizione]
- Fase 2: [descrizione]
- Fase 3: [descrizione]

## Risultati
- Risultato 1
- Risultato 2
- Risultato 3

## Conclusioni
[Conclusioni del progetto]

---
*Progetto realizzato per {subject}*
"""
    
    else:
        return f"""# Documento {subject}

## Contenuto
Questo documento contiene materiale relativo a {subject}.

## Sezioni
1. Introduzione
2. Sviluppo
3. Conclusioni

---
*Documento per {subject}*
"""

def populate_complete_database():
    """Populate database with complete, realistic vetrine and files"""
    
    # Get admin user ID (created during setup)
    with connect() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT user_id FROM users WHERE username = 'admin'")
            admin_user = cur.fetchone()
            if not admin_user:
                print("No admin user found. Run setup_database.py first.")
                return
            user_id = admin_user['user_id']
            
            # Get course instances to use - select diverse courses
            cur.execute("""
                SELECT DISTINCT course_instance_id, course_name, faculty_name, language, course_semester, canale, professors, date_year 
                FROM course_instances 
                WHERE faculty_name IS NOT NULL 
                AND course_name IS NOT NULL 
                ORDER BY faculty_name, course_name 
                LIMIT 20
            """)
            courses = cur.fetchall()
            if not courses:
                print("No course instances found. Run setup_database.py first.")
                return
    
    print(f"Creating complete vetrine and files for user ID: {user_id}")
    print(f"Found {len(courses)} course instances to use")
    
    # Clear existing vetrine and files first
    with connect() as conn:
        with conn.cursor() as cur:
            print("Clearing existing vetrine and files...")
            cur.execute("DELETE FROM files WHERE vetrina_id IN (SELECT vetrina_id FROM vetrina WHERE author_id = %s)", (user_id,))
            cur.execute("DELETE FROM vetrina WHERE author_id = %s", (user_id,))
            conn.commit()
            print("✓ Cleared existing data")
    
    # Complete vetrine data with proper course mapping
    complete_vetrine_data = [
        # Computer Science & Programming
        {
            "name": "Corso Completo di Programmazione Python",
            "description": "Corso completo di programmazione Python dal livello base all'avanzato. Include dispense teoriche, esercizi pratici, progetti e soluzioni dettagliate. Perfetto per studenti di informatica e ingegneria.",
            "files": [
                ("python_basics.pdf", "Programmazione Python", "dispense", 5),
                ("python_advanced.pdf", "Python Avanzato", "dispense", 5),
                ("python_exercises.pdf", "Esercizi Python", "esercizi", 3),
                ("python_project.pdf", "Progetto Python", "progetto", 4),
                ("python_formulas.pdf", "Formulario Python", "formulario", 2)
            ]
        },
        {
            "name": "Algoritmi e Strutture Dati",
            "description": "Raccolta completa di materiale per il corso di Algoritmi e Strutture Dati. Include teoria, implementazioni, analisi della complessità e esercizi risolti.",
            "files": [
                ("algoritmi_teoria.pdf", "Teoria Algoritmi", "dispense", 4),
                ("strutture_dati.pdf", "Strutture Dati", "dispense", 4),
                ("algoritmi_esercizi.pdf", "Esercizi Algoritmi", "esercizi", 3),
                ("complessita_computazionale.pdf", "Complessità Computazionale", "appunti", 3)
            ]
        },
        
        # Mathematics
        {
            "name": "Matematica Discreta - Materiale Completo",
            "description": "Bundle completo per Matematica Discreta: teoria degli insiemi, logica proposizionale, grafi, alberi e combinatoria. Include dispense, appunti e esercizi.",
            "files": [
                ("teoria_insiemi.pdf", "Teoria degli Insiemi", "dispense", 4),
                ("logica_proposizionale.pdf", "Logica Proposizionale", "dispense", 3),
                ("grafi_alberi.pdf", "Grafi e Alberi", "dispense", 3),
                ("combinatoria.pdf", "Combinatoria", "appunti", 3),
                ("esercizi_discreta.pdf", "Esercizi Matematica Discreta", "esercizi", 2)
            ]
        },
        {
            "name": "Calcolo Differenziale e Integrale",
            "description": "Corso completo di calcolo con focus su limiti, derivate, integrali e loro applicazioni. Materiale teorico e pratico con molti esempi.",
            "files": [
                ("calcolo_teoria.pdf", "Teoria del Calcolo", "dispense", 5),
                ("derivate_integrali.pdf", "Derivate e Integrali", "dispense", 4),
                ("applicazioni_calcolo.pdf", "Applicazioni del Calcolo", "appunti", 3),
                ("esercizi_calcolo.pdf", "Esercizi di Calcolo", "esercizi", 3)
            ]
        },
        
        # Economics & Finance
        {
            "name": "Economia Aziendale - Corso Completo",
            "description": "Corso completo di economia aziendale con focus su contabilità, bilancio, analisi finanziaria e gestione aziendale. Materiale aggiornato e completo.",
            "files": [
                ("economia_aziendale.pdf", "Economia Aziendale", "dispense", 5),
                ("contabilita_bilancio.pdf", "Contabilità e Bilancio", "dispense", 4),
                ("analisi_finanziaria.pdf", "Analisi Finanziaria", "dispense", 4),
                ("gestione_aziendale.pdf", "Gestione Aziendale", "appunti", 3),
                ("esercizi_economia.pdf", "Esercizi Economia", "esercizi", 2)
            ]
        },
        {
            "name": "Finanza Aziendale e Corporate Finance",
            "description": "Materiale completo per finanza aziendale: valutazione degli investimenti, struttura del capitale, dividendi e politica finanziaria.",
            "files": [
                ("finanza_aziendale.pdf", "Finanza Aziendale", "dispense", 5),
                ("valutazione_investimenti.pdf", "Valutazione Investimenti", "dispense", 4),
                ("struttura_capitale.pdf", "Struttura del Capitale", "dispense", 4),
                ("dividendi_politica.pdf", "Dividendi e Politica", "appunti", 3)
            ]
        },
        
        # Physics & Chemistry
        {
            "name": "Fisica Generale - Meccanica e Termodinamica",
            "description": "Corso di fisica generale con focus su meccanica classica, termodinamica e loro applicazioni. Include teoria, esempi e problemi risolti.",
            "files": [
                ("meccanica_classica.pdf", "Meccanica Classica", "dispense", 5),
                ("termodinamica.pdf", "Termodinamica", "dispense", 4),
                ("applicazioni_fisica.pdf", "Applicazioni della Fisica", "appunti", 3),
                ("problemi_fisica.pdf", "Problemi di Fisica", "esercizi", 3),
                ("formulario_fisica.pdf", "Formulario Fisica", "formulario", 2)
            ]
        },
        {
            "name": "Chimica Organica - Materiale Completo",
            "description": "Corso completo di chimica organica: reazioni, meccanismi, stereochimica e sintesi organica. Materiale teorico e pratico.",
            "files": [
                ("chimica_organica.pdf", "Chimica Organica", "dispense", 5),
                ("reazioni_organiche.pdf", "Reazioni Organiche", "dispense", 4),
                ("meccanismi_reazione.pdf", "Meccanismi di Reazione", "dispense", 4),
                ("stereochimica.pdf", "Stereochimica", "appunti", 3),
                ("formulario_chimica.pdf", "Formulario Chimica", "formulario", 2)
            ]
        },
        
        # Law & Political Science
        {
            "name": "Diritto Civile - Corso Completo",
            "description": "Corso completo di diritto civile: persone, famiglia, proprietà, obbligazioni e contratti. Materiale aggiornato con la normativa vigente.",
            "files": [
                ("diritto_civile.pdf", "Diritto Civile", "dispense", 5),
                ("persone_famiglia.pdf", "Persone e Famiglia", "dispense", 4),
                ("proprieta_obbligazioni.pdf", "Proprietà e Obbligazioni", "dispense", 4),
                ("contratti.pdf", "Contratti", "appunti", 3),
                ("casi_giurisprudenza.pdf", "Casi di Giurisprudenza", "esercizi", 2)
            ]
        },
        {
            "name": "Scienze Politiche - Teoria e Pratica",
            "description": "Corso di scienze politiche con focus su teoria politica, relazioni internazionali, politica comparata e analisi delle istituzioni.",
            "files": [
                ("teoria_politica.pdf", "Teoria Politica", "dispense", 4),
                ("relazioni_internazionali.pdf", "Relazioni Internazionali", "dispense", 4),
                ("politica_comparata.pdf", "Politica Comparata", "dispense", 3),
                ("istituzioni_politiche.pdf", "Istituzioni Politiche", "appunti", 3),
                ("analisi_politica.pdf", "Analisi Politica", "esercizi", 2)
            ]
        },
        
        # Engineering
        {
            "name": "Ingegneria dei Sistemi - Corso Completo",
            "description": "Corso di ingegneria dei sistemi: modellazione, analisi, controllo e ottimizzazione di sistemi complessi. Include teoria e applicazioni pratiche.",
            "files": [
                ("ingegneria_sistemi.pdf", "Ingegneria dei Sistemi", "dispense", 5),
                ("modellazione_sistemi.pdf", "Modellazione dei Sistemi", "dispense", 4),
                ("controllo_sistemi.pdf", "Controllo dei Sistemi", "dispense", 4),
                ("ottimizzazione.pdf", "Ottimizzazione", "appunti", 3),
                ("progetti_sistemi.pdf", "Progetti di Sistemi", "progetto", 3)
            ]
        },
        {
            "name": "Elettronica Digitale e Microprocessori",
            "description": "Corso di elettronica digitale: circuiti logici, microprocessori, architettura dei calcolatori e programmazione assembly.",
            "files": [
                ("elettronica_digitale.pdf", "Elettronica Digitale", "dispense", 5),
                ("circuiti_logici.pdf", "Circuiti Logici", "dispense", 4),
                ("microprocessori.pdf", "Microprocessori", "dispense", 4),
                ("architettura_calcolatori.pdf", "Architettura Calcolatori", "appunti", 3),
                ("assembly_programming.pdf", "Programmazione Assembly", "esercizi", 3)
            ]
        },
        
        # Medicine & Biology
        {
            "name": "Anatomia Umana - Corso Completo",
            "description": "Corso completo di anatomia umana: sistemi, apparati, organi e loro funzioni. Include atlanti anatomici e descrizioni dettagliate.",
            "files": [
                ("anatomia_generale.pdf", "Anatomia Generale", "dispense", 5),
                ("sistemi_organi.pdf", "Sistemi e Organi", "dispense", 4),
                ("apparato_circolatorio.pdf", "Apparato Circolatorio", "dispense", 4),
                ("sistema_nervoso.pdf", "Sistema Nervoso", "appunti", 3),
                ("atlante_anatomico.pdf", "Atlante Anatomico", "formulario", 2)
            ]
        },
        {
            "name": "Biologia Cellulare e Molecolare",
            "description": "Corso di biologia cellulare e molecolare: struttura cellulare, metabolismo, genetica e biotecnologie. Materiale aggiornato con le ultime scoperte.",
            "files": [
                ("biologia_cellulare.pdf", "Biologia Cellulare", "dispense", 5),
                ("metabolismo_cellulare.pdf", "Metabolismo Cellulare", "dispense", 4),
                ("genetica_molecolare.pdf", "Genetica Molecolare", "dispense", 4),
                ("biotecnologie.pdf", "Biotecnologie", "appunti", 3),
                ("laboratorio_biologia.pdf", "Laboratorio di Biologia", "esercizi", 2)
            ]
        },
        
        # Psychology & Sociology
        {
            "name": "Psicologia Generale - Corso Completo",
            "description": "Corso completo di psicologia generale: processi cognitivi, emozioni, personalità e comportamento sociale. Include teoria e casi studio.",
            "files": [
                ("psicologia_generale.pdf", "Psicologia Generale", "dispense", 5),
                ("processi_cognitivi.pdf", "Processi Cognitivi", "dispense", 4),
                ("emozioni_personalita.pdf", "Emozioni e Personalità", "dispense", 4),
                ("comportamento_sociale.pdf", "Comportamento Sociale", "appunti", 3),
                ("casi_studio_psicologia.pdf", "Casi Studio Psicologia", "esercizi", 2)
            ]
        },
        {
            "name": "Sociologia - Teoria e Metodologia",
            "description": "Corso di sociologia: teorie sociologiche, metodologia della ricerca, analisi dei fenomeni sociali e statistiche sociali.",
            "files": [
                ("teorie_sociologiche.pdf", "Teorie Sociologiche", "dispense", 4),
                ("metodologia_ricerca.pdf", "Metodologia della Ricerca", "dispense", 4),
                ("fenomeni_sociali.pdf", "Analisi Fenomeni Sociali", "dispense", 3),
                ("statistiche_sociali.pdf", "Statistiche Sociali", "appunti", 3),
                ("ricerca_sociologica.pdf", "Progetti di Ricerca", "progetto", 2)
            ]
        },
        
        # Languages & Literature
        {
            "name": "Lingua Inglese - Corso Avanzato",
            "description": "Corso avanzato di lingua inglese: grammatica avanzata, business english, academic writing e preparazione esami internazionali.",
            "files": [
                ("grammatica_avanzata.pdf", "Grammatica Avanzata", "dispense", 4),
                ("business_english.pdf", "Business English", "dispense", 4),
                ("academic_writing.pdf", "Academic Writing", "dispense", 3),
                ("esercizi_inglese.pdf", "Esercizi di Inglese", "esercizi", 2),
                ("preparazione_esami.pdf", "Preparazione Esami", "formulario", 2)
            ]
        },
        {
            "name": "Letteratura Italiana - Dal Medioevo al Novecento",
            "description": "Corso di letteratura italiana: autori, opere, movimenti letterari e analisi testuale dal Medioevo al Novecento.",
            "files": [
                ("letteratura_medievale.pdf", "Letteratura Medievale", "dispense", 4),
                ("rinascimento_umanesimo.pdf", "Rinascimento e Umanesimo", "dispense", 4),
                ("ottocento_letterario.pdf", "Ottocento Letterario", "dispense", 3),
                ("novecento_letterario.pdf", "Novecento Letterario", "appunti", 3),
                ("analisi_testuale.pdf", "Analisi Testuale", "esercizi", 2)
            ]
        },
        
        # Business & Management
        {
            "name": "Marketing Strategico - Corso Completo",
            "description": "Corso completo di marketing strategico: analisi di mercato, posizionamento, strategie di marketing e gestione del brand.",
            "files": [
                ("marketing_strategico.pdf", "Marketing Strategico", "dispense", 5),
                ("analisi_mercato.pdf", "Analisi di Mercato", "dispense", 4),
                ("posizionamento_brand.pdf", "Posizionamento e Brand", "dispense", 4),
                ("strategie_marketing.pdf", "Strategie di Marketing", "appunti", 3),
                ("casi_studio_marketing.pdf", "Casi Studio Marketing", "esercizi", 2)
            ]
        },
        {
            "name": "Gestione delle Risorse Umane",
            "description": "Corso di gestione delle risorse umane: reclutamento, selezione, formazione, valutazione e sviluppo del personale.",
            "files": [
                ("gestione_risorse_umane.pdf", "Gestione Risorse Umane", "dispense", 4),
                ("reclutamento_selezione.pdf", "Reclutamento e Selezione", "dispense", 4),
                ("formazione_sviluppo.pdf", "Formazione e Sviluppo", "dispense", 3),
                ("valutazione_personale.pdf", "Valutazione del Personale", "appunti", 3),
                ("casi_hr.pdf", "Casi Studio HR", "esercizi", 2)
            ]
        }
    ]
    
    created_vetrine = []
    
    for i, vetrina_info in enumerate(complete_vetrine_data):
        # Use different course instances for variety
        course = courses[i % len(courses)]
        
        print(f"\nCreating vetrina: {vetrina_info['name']}")
        print(f"Course: {course['course_name']} - {course['faculty_name']}")
        print(f"Language: {course['language']}, Semester: {course['course_semester']}, Channel: {course['canale']}")
        
        # Create vetrina
        vetrina = create_vetrina(
            user_id=user_id,
            course_instance_id=course['course_instance_id'],
            name=vetrina_info['name'],
            description=vetrina_info['description']
        )
        
        created_vetrine.append(vetrina)
        print(f"✓ Created vetrina ID: {vetrina.vetrina_id}")
        
        # Add files to vetrina
        for filename, subject, file_type, price in vetrina_info['files']:
            print(f"  Adding file: {filename} (Type: {file_type}, Price: €{price})")
            
            # Generate realistic content
            content = generate_realistic_content(subject, file_type)
            
            # Create the physical file
            unique_filename, file_hash, file_size = create_realistic_file(filename, content)
            
            # Add to database
            extension = unique_filename.split('.')[-1]
            db_file = add_file_to_vetrina(
                requester_id=user_id,
                vetrina_id=vetrina.vetrina_id,
                file_name=unique_filename,
                sha256=file_hash,
                extension=extension,
                price=price,
                size=file_size,
                tag=file_type
            )
            
            print(f"  ✓ Created file ID: {db_file.file_id} (Size: {file_size} bytes)")
    
    print(f"\n🎉 Successfully created {len(created_vetrine)} complete vetrine with files!")
    
    # Print summary
    print("\n📊 Database Summary:")
    with connect() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT COUNT(*) as cnt FROM vetrina")
            vetrina_count = cur.fetchone()['cnt']
            cur.execute("SELECT COUNT(*) as cnt FROM files")
            files_count = cur.fetchone()['cnt']
            cur.execute("SELECT SUM(price) as total_value FROM files")
            total_value = cur.fetchone()['total_value'] or 0
            
            print(f"  Vetrine: {vetrina_count}")
            print(f"  Files: {files_count}")
            print(f"  Total Value: €{total_value}")
            
            # Show some statistics by tag
            cur.execute("SELECT tag, COUNT(*) as cnt, AVG(price) as avg_price FROM files WHERE tag IS NOT NULL GROUP BY tag")
            tag_stats = cur.fetchall()
            print("\n📈 Files by Type:")
            for stat in tag_stats:
                print(f"  {stat['tag']}: {stat['cnt']} files (avg €{stat['avg_price']:.1f})")
            
            # Show course information sample
            print("\n🎓 Course Information Sample:")
            cur.execute("""
                SELECT v.name as vetrina_name, ci.course_name, ci.faculty_name, ci.language, ci.course_semester, ci.canale
                FROM vetrina v
                JOIN course_instances ci ON v.course_instance_id = ci.course_instance_id
                WHERE v.author_id = %s
                LIMIT 5
            """, (user_id,))
            course_samples = cur.fetchall()
            for sample in course_samples:
                print(f"  {sample['vetrina_name']} -> {sample['course_name']} ({sample['faculty_name']})")

if __name__ == '__main__':
    populate_complete_database() 