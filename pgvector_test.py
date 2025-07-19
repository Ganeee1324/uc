from pgvector.psycopg import register_vector
import psycopg
from bge import get_sentence_embedding
from langdetect import detect

def detect_language(text):
    """Detect language of text, fallback to 'en' if uncertain"""
    try:
        lang = detect(text)
        # Map common language codes to our supported ones
        if lang in ['en']:
            return 'en'
        elif lang in ['it']:
            return 'it'
        else:
            return 'en'  # Default fallback
    except:
        return 'en'  # Fallback if detection fails

conn = psycopg.connect(dbname='pgvector_example', autocommit=True, row_factory=psycopg.rows.dict_row)

# conn.execute('CREATE EXTENSION IF NOT EXISTS vector')
# register_vector(conn)

# Create language-specific indexes for vetrina descriptions
# conn.execute("CREATE INDEX ON vetrina USING GIN (to_tsvector('english', description)) WHERE language = 'en'")
# conn.execute("CREATE INDEX ON vetrina USING GIN (to_tsvector('italian', description)) WHERE language = 'it'")

sql = """
WITH semantic_search AS (
    SELECT 
        pe.vetrina_id,
        pe.file_id,
        pe.page_id,
        RANK() OVER (ORDER BY pe.embedding <=> %(embedding)s) AS rank
    FROM page_embeddings pe
    ORDER BY pe.embedding <=> %(embedding)s
    LIMIT 20
),
keyword_search AS (
    SELECT 
        v.vetrina_id,
        NULL::integer AS file_id,
        NULL::integer AS page_id,
        RANK() OVER (ORDER BY ts_rank_cd(
            CASE 
                WHEN ci.language = 'en' THEN to_tsvector('english', v.description)
                WHEN ci.language = 'it' THEN to_tsvector('italian', v.description)
                ELSE to_tsvector('simple', v.description)
            END, query) DESC) AS rank
    FROM vetrina v
    JOIN course_instances ci ON v.course_instance_id = ci.instance_id,
         CASE 
            WHEN %(query_language)s = 'en' THEN plainto_tsquery('english', %(query)s)
            WHEN %(query_language)s = 'it' THEN plainto_tsquery('italian', %(query)s)
            ELSE plainto_tsquery('simple', %(query)s)
         END AS query
    WHERE CASE 
            WHEN ci.language = 'en' THEN to_tsvector('english', v.description)
            WHEN ci.language = 'it' THEN to_tsvector('italian', v.description)
            ELSE to_tsvector('simple', v.description)
          END @@ query
    ORDER BY ts_rank_cd(
        CASE 
            WHEN ci.language = 'en' THEN to_tsvector('english', v.description)
            WHEN ci.language = 'it' THEN to_tsvector('italian', v.description)
            ELSE to_tsvector('simple', v.description)
        END, query) DESC
    LIMIT 20
)
SELECT 
    COALESCE(semantic_search.vetrina_id, keyword_search.vetrina_id) AS vetrina_id,
    COALESCE(1.0 / (%(k)s + semantic_search.rank), 0.0) +
    COALESCE(1.0 / (%(k)s + keyword_search.rank), 0.0) AS score,
    semantic_search.file_id,
    semantic_search.page_id,
    v.*,
    u.*,
    ci.*
FROM semantic_search
FULL OUTER JOIN keyword_search ON semantic_search.vetrina_id = keyword_search.vetrina_id
JOIN vetrina v ON COALESCE(semantic_search.vetrina_id, keyword_search.vetrina_id) = v.vetrina_id
JOIN users u ON v.author_id = u.user_id
JOIN course_instances ci ON v.course_instance_id = ci.instance_id
ORDER BY score DESC
LIMIT 10
"""

query = "bernoulli"
query_language = detect_language(query)
print(f"Detected language: {query_language}")
embedding = get_sentence_embedding(query)
k = 60

results = conn.execute(sql, {
    'query': query, 
    'embedding': embedding, 
    'k': k, 
    'query_language': query_language
}).fetchall()

print("Hybrid search results:")
print("=" * 80)
for row in results:
    print(f"Vetrina ID: {row['vetrina_id']}")
    print(f"RRF Score: {row['score']:.4f}")
    print(f"Vetrina Name: {row['name']}")
    print(f"Description: {row['description'][:100]}...")
    print(f"Course: {row['course_name']} - {row['course_code']}")
    print(f"Author: {row['first_name']} {row['last_name']}")
    
    # Show file info if available (from semantic search)
    if row['file_id'] is not None:  # file_id
        print(f"Related File: {row['file_id']} (Page ID: {row['page_id']})")
    else:
        print("Result from keyword search (no specific file)")
    
    print("-" * 40)
