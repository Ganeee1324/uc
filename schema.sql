DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS files CASCADE;
DROP TABLE IF EXISTS owned_files CASCADE;
DROP TABLE IF EXISTS transactions CASCADE;
DROP TABLE IF EXISTS course_instances CASCADE;
DROP TABLE IF EXISTS vetrina CASCADE;
DROP TABLE IF EXISTS favourite_vetrine CASCADE;
DROP TABLE IF EXISTS favourite_file CASCADE;
DROP TABLE IF EXISTS chunk_embeddings CASCADE;
DROP TABLE IF EXISTS review CASCADE;
DROP TABLE IF EXISTS embedding_queue CASCADE;
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS users (
    user_id SERIAL PRIMARY KEY,
    username VARCHAR(255) NOT NULL UNIQUE,
    first_name VARCHAR(255) NOT NULL,
    last_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    last_login TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    registration_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    user_faculty VARCHAR(255),
    user_enrollment_year INTEGER,
    user_canale VARCHAR(255),
    bio TEXT,
    profile_picture VARCHAR(255),
    password VARCHAR(255) NOT NULL,
    uploaded_documents_count INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS course_instances (
    instance_id SERIAL PRIMARY KEY,
    professors VARCHAR(40)[],
    course_code VARCHAR(10) NOT NULL,
    course_name VARCHAR(255) NOT NULL,
    faculty_name VARCHAR(255) NOT NULL,
    course_year INTEGER,
    date_year INTEGER,
    language VARCHAR(15),
    course_semester VARCHAR(40),
    canale VARCHAR(10),
    UNIQUE (course_code, faculty_name, canale)
);

CREATE TABLE IF NOT EXISTS vetrina (
    vetrina_id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    author_id INTEGER REFERENCES users(user_id) ON DELETE CASCADE NOT NULL,
    course_instance_id INTEGER REFERENCES course_instances(instance_id) ON DELETE CASCADE NOT NULL,
    description TEXT NOT NULL,
    average_rating REAL,
    reviews_count INTEGER NOT NULL DEFAULT 0,
    tags VARCHAR(50)[],
    file_count INTEGER NOT NULL DEFAULT 0,
    price REAL NOT NULL DEFAULT 0,
    language VARCHAR(15) NOT NULL DEFAULT 'en',
    copertina VARCHAR(255),
    UNIQUE (author_id, name, course_instance_id)
);

CREATE TABLE IF NOT EXISTS files (
    file_id SERIAL PRIMARY KEY,
    filename VARCHAR(255) NOT NULL,
    display_name VARCHAR(255) NOT NULL,
    upload_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    fact_mark INTEGER,
    sha256 VARCHAR(64) NOT NULL,
    fact_mark_updated_at TIMESTAMP,
    size INTEGER NOT NULL DEFAULT 0,
    download_count INTEGER NOT NULL DEFAULT 0,
    price REAL NOT NULL DEFAULT 0,
    extension VARCHAR(10) NOT NULL,
    tag VARCHAR(50),
    language VARCHAR(15) NOT NULL DEFAULT 'en',
    num_pages INTEGER NOT NULL,
    reviews_count INTEGER NOT NULL DEFAULT 0,
    average_rating REAL,
    thumbnail VARCHAR(255),
    vetrina_id INTEGER REFERENCES vetrina(vetrina_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS transactions (
    transaction_id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(user_id) NOT NULL,
    amount REAL NOT NULL DEFAULT 0,
    transaction_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS owned_files (
    file_id INTEGER REFERENCES files(file_id) ON DELETE CASCADE NOT NULL,
    owner_id INTEGER REFERENCES users(user_id) ON DELETE CASCADE NOT NULL,
    transaction_id INTEGER REFERENCES transactions(transaction_id),
    PRIMARY KEY (file_id, owner_id)
);

CREATE TABLE IF NOT EXISTS favourite_vetrine (
    user_id INTEGER REFERENCES users(user_id) ON DELETE CASCADE NOT NULL,
    vetrina_id INTEGER REFERENCES vetrina(vetrina_id) ON DELETE CASCADE NOT NULL,
    PRIMARY KEY (user_id, vetrina_id)
);

CREATE TABLE IF NOT EXISTS favourite_file (
    user_id INTEGER REFERENCES users(user_id) ON DELETE CASCADE NOT NULL,
    file_id INTEGER REFERENCES files(file_id) ON DELETE CASCADE NOT NULL,
    PRIMARY KEY (user_id, file_id)
);

CREATE TABLE IF NOT EXISTS chunk_embeddings (
    chunk_id SERIAL PRIMARY KEY,
    description TEXT NOT NULL,
    page_number INTEGER NOT NULL,
    vetrina_id INTEGER REFERENCES vetrina(vetrina_id) ON DELETE CASCADE NOT NULL,
    file_id INTEGER REFERENCES files(file_id) ON DELETE CASCADE NOT NULL,
    embedding vector(1024) NOT NULL
);

CREATE TABLE IF NOT EXISTS review (
    user_id INTEGER REFERENCES users(user_id) ON DELETE CASCADE NOT NULL,
    vetrina_id INTEGER REFERENCES vetrina(vetrina_id) ON DELETE CASCADE,
    file_id INTEGER REFERENCES files(file_id) ON DELETE CASCADE,
    rating INTEGER NOT NULL,
    review_text TEXT NOT NULL,
    review_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, vetrina_id, file_id),
    CONSTRAINT check_review_target CHECK (
        (vetrina_id IS NOT NULL AND file_id IS NULL) OR 
        (vetrina_id IS NULL AND file_id IS NOT NULL)
    )
);

CREATE TABLE IF NOT EXISTS follow (
    user_id INTEGER REFERENCES users(user_id) ON DELETE CASCADE NOT NULL,
    followed_user_id INTEGER REFERENCES users(user_id) ON DELETE CASCADE NOT NULL,
    PRIMARY KEY (user_id, followed_user_id)
);

CREATE TABLE IF NOT EXISTS embedding_queue (
    file_id INTEGER REFERENCES files(file_id) ON DELETE CASCADE NOT NULL,
    vetrina_id INTEGER REFERENCES vetrina(vetrina_id) ON DELETE CASCADE NOT NULL,
    PRIMARY KEY (file_id, vetrina_id)
);

CREATE TABLE IF NOT EXISTS forum_threads (
    thread_id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    author_id INTEGER REFERENCES users(user_id) ON DELETE CASCADE NOT NULL,
    tag VARCHAR(50),
    posts_count INTEGER NOT NULL DEFAULT 0,
    last_post_timestamp TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS forum_posts (
    post_id SERIAL PRIMARY KEY,
    thread_id INTEGER REFERENCES forum_threads(thread_id) ON DELETE CASCADE NOT NULL,
    user_id INTEGER REFERENCES users(user_id) ON DELETE CASCADE NOT NULL,
    text TEXT NOT NULL,
    edited BOOLEAN NOT NULL DEFAULT FALSE,
    edited_at TIMESTAMP,
    post_timestamp TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);


CREATE INDEX ON vetrina USING GIN (to_tsvector('english', description)) WHERE language = 'en';
CREATE INDEX ON vetrina USING GIN (to_tsvector('italian', description)) WHERE language = 'it';


-- Function to update vetrina review statistics
CREATE OR REPLACE FUNCTION update_vetrina_review_stats()
RETURNS TRIGGER AS $$
BEGIN
    -- Handle INSERT and UPDATE operations
    IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
        -- Update vetrina stats if vetrina_id is not null
        IF NEW.vetrina_id IS NOT NULL THEN
            UPDATE vetrina 
            SET 
                reviews_count = (
                    SELECT COUNT(*) 
                    FROM review 
                    WHERE vetrina_id = NEW.vetrina_id
                ),
                average_rating = (
                    SELECT AVG(rating) 
                    FROM review 
                    WHERE vetrina_id = NEW.vetrina_id
                )
            WHERE vetrina_id = NEW.vetrina_id;
        END IF;
        RETURN NEW;
    END IF;
    
    -- Handle DELETE operation
    IF TG_OP = 'DELETE' THEN
        -- Update vetrina stats if vetrina_id is not null
        IF OLD.vetrina_id IS NOT NULL THEN
            UPDATE vetrina 
            SET 
                reviews_count = (
                    SELECT COUNT(*) 
                    FROM review 
                    WHERE vetrina_id = OLD.vetrina_id
                ),
                average_rating = (
                    SELECT AVG(rating) 
                    FROM review 
                    WHERE vetrina_id = OLD.vetrina_id
                )
            WHERE vetrina_id = OLD.vetrina_id;
        END IF;
        RETURN OLD;
    END IF;
    
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Function to update file review statistics
CREATE OR REPLACE FUNCTION update_file_review_stats()
RETURNS TRIGGER AS $$
BEGIN
    -- Handle INSERT and UPDATE operations
    IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
        -- Update file stats if file_id is not null
        IF NEW.file_id IS NOT NULL THEN
            UPDATE files 
            SET 
                reviews_count = (
                    SELECT COUNT(*) 
                    FROM review 
                    WHERE file_id = NEW.file_id
                ),
                average_rating = (
                    SELECT AVG(rating) 
                    FROM review 
                    WHERE file_id = NEW.file_id
                )
            WHERE file_id = NEW.file_id;
        END IF;
        RETURN NEW;
    END IF;
    
    -- Handle DELETE operation
    IF TG_OP = 'DELETE' THEN
        -- Update file stats if file_id is not null
        IF OLD.file_id IS NOT NULL THEN
            UPDATE files 
            SET 
                reviews_count = (
                    SELECT COUNT(*) 
                    FROM review 
                    WHERE file_id = OLD.file_id
                ),
                average_rating = (
                    SELECT AVG(rating) 
                    FROM review 
                    WHERE file_id = OLD.file_id
                )
            WHERE file_id = OLD.file_id;
        END IF;
        RETURN OLD;
    END IF;
    
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Function to update vetrina tags and file count
CREATE OR REPLACE FUNCTION update_vetrina_tags_and_file_count()
RETURNS TRIGGER AS $$
BEGIN
    -- Handle INSERT and UPDATE operations
    IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
        UPDATE vetrina 
        SET 
            tags = (
                SELECT ARRAY(
                    SELECT DISTINCT tag 
                    FROM files 
                    WHERE vetrina_id = NEW.vetrina_id 
                    AND tag IS NOT NULL
                    ORDER BY tag
                )
            ),
            file_count = (
                SELECT COUNT(*) 
                FROM files 
                WHERE vetrina_id = NEW.vetrina_id
            )
        WHERE vetrina_id = NEW.vetrina_id;
        RETURN NEW;
    END IF;
    
    -- Handle DELETE operation
    IF TG_OP = 'DELETE' THEN
        UPDATE vetrina 
        SET 
            tags = (
                SELECT ARRAY(
                    SELECT DISTINCT tag 
                    FROM files 
                    WHERE vetrina_id = OLD.vetrina_id 
                    AND tag IS NOT NULL
                    ORDER BY tag
                )
            ),
            file_count = (
                SELECT COUNT(*) 
                FROM files 
                WHERE vetrina_id = OLD.vetrina_id
            )
        WHERE vetrina_id = OLD.vetrina_id;
        RETURN OLD;
    END IF;
    
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Function to update user uploaded documents count
CREATE OR REPLACE FUNCTION update_user_document_count()
RETURNS TRIGGER AS $$
BEGIN
    -- Handle INSERT and UPDATE operations
    IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
        -- Update user stats if vetrina_id is not null
        IF NEW.vetrina_id IS NOT NULL THEN
            UPDATE users 
            SET uploaded_documents_count = (
                SELECT COUNT(DISTINCT f.file_id) 
                FROM files f
                JOIN vetrina v ON f.vetrina_id = v.vetrina_id
                WHERE v.author_id = (
                    SELECT author_id 
                    FROM vetrina 
                    WHERE vetrina_id = NEW.vetrina_id
                )
            )
            WHERE user_id = (
                SELECT author_id 
                FROM vetrina 
                WHERE vetrina_id = NEW.vetrina_id
            );
        END IF;
        RETURN NEW;
    END IF;
    
    -- Handle DELETE operation
    IF TG_OP = 'DELETE' THEN
        -- Update user stats if vetrina_id is not null
        IF OLD.vetrina_id IS NOT NULL THEN
            UPDATE users 
            SET uploaded_documents_count = (
                SELECT COUNT(DISTINCT f.file_id) 
                FROM files f
                JOIN vetrina v ON f.vetrina_id = v.vetrina_id
                WHERE v.author_id = (
                    SELECT author_id 
                    FROM vetrina 
                    WHERE vetrina_id = OLD.vetrina_id
                )
            )
            WHERE user_id = (
                SELECT author_id 
                FROM vetrina 
                WHERE vetrina_id = OLD.vetrina_id
            );
        END IF;
        RETURN OLD;
    END IF;
    
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Function to update thread statistics
CREATE OR REPLACE FUNCTION update_thread_stats()
RETURNS TRIGGER AS $$
BEGIN
    -- Handle INSERT and UPDATE operations
    IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
        UPDATE forum_threads 
        SET 
            posts_count = (
                SELECT COUNT(*) 
                FROM forum_posts 
                WHERE thread_id = NEW.thread_id
            ),
            last_post_timestamp = (
                SELECT MAX(post_timestamp) 
                FROM forum_posts 
                WHERE thread_id = NEW.thread_id
            )
        WHERE thread_id = NEW.thread_id;
        RETURN NEW;
    END IF;
    
    -- Handle DELETE operation
    IF TG_OP = 'DELETE' THEN
        UPDATE forum_threads 
        SET 
            posts_count = (
                SELECT COUNT(*) 
                FROM forum_posts 
                WHERE thread_id = OLD.thread_id
            ),
            last_post_timestamp = (
                SELECT MAX(post_timestamp) 
                FROM forum_posts 
                WHERE thread_id = OLD.thread_id
            )
        WHERE thread_id = OLD.thread_id;
        RETURN OLD;
    END IF;
    
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for review table
DROP TRIGGER IF EXISTS trigger_update_vetrina_stats_insert ON review;
DROP TRIGGER IF EXISTS trigger_update_vetrina_stats_update ON review;
DROP TRIGGER IF EXISTS trigger_update_vetrina_stats_delete ON review;
DROP TRIGGER IF EXISTS trigger_update_file_stats_insert ON review;
DROP TRIGGER IF EXISTS trigger_update_file_stats_update ON review;
DROP TRIGGER IF EXISTS trigger_update_file_stats_delete ON review;

CREATE TRIGGER trigger_update_vetrina_stats_insert
    AFTER INSERT ON review
    FOR EACH ROW
    EXECUTE FUNCTION update_vetrina_review_stats();

CREATE TRIGGER trigger_update_vetrina_stats_update
    AFTER UPDATE ON review
    FOR EACH ROW
    EXECUTE FUNCTION update_vetrina_review_stats();

CREATE TRIGGER trigger_update_vetrina_stats_delete
    AFTER DELETE ON review
    FOR EACH ROW
    EXECUTE FUNCTION update_vetrina_review_stats();

CREATE TRIGGER trigger_update_file_stats_insert
    AFTER INSERT ON review
    FOR EACH ROW
    EXECUTE FUNCTION update_file_review_stats();

CREATE TRIGGER trigger_update_file_stats_update
    AFTER UPDATE ON review
    FOR EACH ROW
    EXECUTE FUNCTION update_file_review_stats();

CREATE TRIGGER trigger_update_file_stats_delete
    AFTER DELETE ON review
    FOR EACH ROW
    EXECUTE FUNCTION update_file_review_stats();

-- Create triggers for files table to update vetrina tags and file count
DROP TRIGGER IF EXISTS trigger_update_vetrina_tags_insert ON files;
DROP TRIGGER IF EXISTS trigger_update_vetrina_tags_update ON files;
DROP TRIGGER IF EXISTS trigger_update_vetrina_tags_delete ON files;

CREATE TRIGGER trigger_update_vetrina_tags_insert
    AFTER INSERT ON files
    FOR EACH ROW
    EXECUTE FUNCTION update_vetrina_tags_and_file_count();

CREATE TRIGGER trigger_update_vetrina_tags_update
    AFTER UPDATE ON files
    FOR EACH ROW
    EXECUTE FUNCTION update_vetrina_tags_and_file_count();

CREATE TRIGGER trigger_update_vetrina_tags_delete
    AFTER DELETE ON files
    FOR EACH ROW
    EXECUTE FUNCTION update_vetrina_tags_and_file_count();

-- Create triggers for files table to update user document count
DROP TRIGGER IF EXISTS trigger_update_user_document_count_insert ON files;
DROP TRIGGER IF EXISTS trigger_update_user_document_count_update ON files;
DROP TRIGGER IF EXISTS trigger_update_user_document_count_delete ON files;

CREATE TRIGGER trigger_update_user_document_count_insert
    AFTER INSERT ON files
    FOR EACH ROW
    EXECUTE FUNCTION update_user_document_count();

CREATE TRIGGER trigger_update_user_document_count_update
    AFTER UPDATE ON files
    FOR EACH ROW
    EXECUTE FUNCTION update_user_document_count();

CREATE TRIGGER trigger_update_user_document_count_delete
    AFTER DELETE ON files
    FOR EACH ROW
    EXECUTE FUNCTION update_user_document_count();

-- Create triggers for messages table to update thread statistics
DROP TRIGGER IF EXISTS trigger_update_thread_stats_insert ON forum_posts;
DROP TRIGGER IF EXISTS trigger_update_thread_stats_update ON forum_posts;
DROP TRIGGER IF EXISTS trigger_update_thread_stats_delete ON forum_posts;

CREATE TRIGGER trigger_update_thread_stats_insert
    AFTER INSERT ON forum_posts
    FOR EACH ROW
    EXECUTE FUNCTION update_thread_stats();

CREATE TRIGGER trigger_update_thread_stats_update
    AFTER UPDATE ON forum_posts
    FOR EACH ROW
    EXECUTE FUNCTION update_thread_stats();

CREATE TRIGGER trigger_update_thread_stats_delete
    AFTER DELETE ON forum_posts
    FOR EACH ROW
    EXECUTE FUNCTION update_thread_stats();

INSERT INTO users (username, first_name, last_name, email, password) VALUES ('admin', 'admin', 'admin', 'admin@admin.com', 'admin');