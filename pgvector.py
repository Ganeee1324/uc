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

conn = psycopg.connect(dbname='pgvector_example', autocommit=True)

# conn.execute('CREATE EXTENSION IF NOT EXISTS vector')
# register_vector(conn)

# Create language-specific indexes
# conn.execute("CREATE INDEX ON documents USING GIN (to_tsvector('english', content)) WHERE language = 'en'")
# conn.execute("CREATE INDEX ON documents USING GIN (to_tsvector('italian', content)) WHERE language = 'it'")

sql = """
WITH semantic_search AS (
    SELECT id, RANK () OVER (ORDER BY embedding <=> %(embedding)s) AS rank
    FROM documents
    ORDER BY embedding <=> %(embedding)s
    LIMIT 20
),
keyword_search AS (
    SELECT id, RANK () OVER (ORDER BY ts_rank_cd(
        CASE 
            WHEN language = 'en' THEN to_tsvector('english', content)
            WHEN language = 'it' THEN to_tsvector('italian', content)
            ELSE to_tsvector('simple', content)
        END, query) DESC) AS rank
    FROM documents, 
         CASE 
            WHEN %(query_language)s = 'en' THEN plainto_tsquery('english', %(query)s)
            WHEN %(query_language)s = 'it' THEN plainto_tsquery('italian', %(query)s)
            ELSE plainto_tsquery('simple', %(query)s)
         END AS query
    WHERE CASE 
            WHEN language = 'en' THEN to_tsvector('english', content)
            WHEN language = 'it' THEN to_tsvector('italian', content)
            ELSE to_tsvector('simple', content)
          END @@ query
    ORDER BY ts_rank_cd(
        CASE 
            WHEN language = 'en' THEN to_tsvector('english', content)
            WHEN language = 'it' THEN to_tsvector('italian', content)
            ELSE to_tsvector('simple', content)
        END, query) DESC
    LIMIT 20
)
SELECT
    COALESCE(semantic_search.id, keyword_search.id) AS id,
    COALESCE(1.0 / (%(k)s + semantic_search.rank), 0.0) +
    COALESCE(1.0 / (%(k)s + keyword_search.rank), 0.0) AS score
FROM semantic_search
FULL OUTER JOIN keyword_search ON semantic_search.id = keyword_search.id
ORDER BY score DESC
LIMIT 5
"""
query = "bernoulli"
query_language = detect_language(query)
print(f"Detected language: {query_language}")
embedding = get_sentence_embedding(query)
k = 60
results = conn.execute(sql, {'query': query, 'embedding': embedding, 'k': k, 'query_language': query_language}).fetchall()
print("Query results:")
for row in results:
    print('document:', row[0], 'RRF score:', row[1])
