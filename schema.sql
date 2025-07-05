DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS files CASCADE;
DROP TABLE IF EXISTS owned_files CASCADE;
DROP TABLE IF EXISTS vetrina_subscriptions CASCADE;
DROP TABLE IF EXISTS transactions CASCADE;
DROP TABLE IF EXISTS course_instances CASCADE;
DROP TABLE IF EXISTS vetrina CASCADE;
DROP TABLE IF EXISTS favourite_vetrine CASCADE;
DROP TABLE IF EXISTS favourite_file CASCADE;

CREATE TABLE IF NOT EXISTS users (
    user_id SERIAL PRIMARY KEY,
    username VARCHAR(255) NOT NULL UNIQUE,
    first_name VARCHAR(255) NOT NULL,
    last_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    last_login TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    registration_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    password VARCHAR(255) NOT NULL
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
    UNIQUE (author_id, name, course_instance_id)
);

CREATE TABLE IF NOT EXISTS files (
    file_id SERIAL PRIMARY KEY,
    filename VARCHAR(255) NOT NULL,
    upload_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    fact_mark INTEGER NOT NULL DEFAULT 0,
    sha256 VARCHAR(64) NOT NULL,
    fact_mark_updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    size INTEGER NOT NULL DEFAULT 0,
    download_count INTEGER NOT NULL DEFAULT 0,
    price INTEGER NOT NULL DEFAULT 0,
    extension VARCHAR(10) NOT NULL,
    tag VARCHAR(50),
    vetrina_id INTEGER REFERENCES vetrina(vetrina_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS transactions (
    transaction_id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(user_id) NOT NULL,
    amount INTEGER NOT NULL DEFAULT 0,
    transaction_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS owned_files (
    file_id INTEGER REFERENCES files(file_id) ON DELETE CASCADE NOT NULL,
    owner_id INTEGER REFERENCES users(user_id) ON DELETE CASCADE NOT NULL,
    transaction_id INTEGER REFERENCES transactions(transaction_id),
    PRIMARY KEY (file_id, owner_id)
);

CREATE TABLE IF NOT EXISTS vetrina_subscriptions (
    subscriber_id INTEGER REFERENCES users(user_id) ON DELETE CASCADE NOT NULL,
    price INTEGER NOT NULL DEFAULT 0,
    vetrina_id INTEGER REFERENCES vetrina(vetrina_id) ON DELETE CASCADE NOT NULL,
    subscription_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    transaction_id INTEGER REFERENCES transactions(transaction_id),
    PRIMARY KEY (subscriber_id, vetrina_id)
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

INSERT INTO users (username, first_name, last_name, email, password) VALUES ('admin', 'admin', 'admin', 'admin@admin.com', 'admin');