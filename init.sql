-- ExamTrack Database Schema

-- Users table
CREATE TABLE IF NOT EXISTS utente (
    id_utente SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    ruolo VARCHAR(20) NOT NULL CHECK (ruolo IN ('studente', 'professore', 'amministratore')),
    data_creazione DATE DEFAULT CURRENT_DATE
);

-- Students table
CREATE TABLE IF NOT EXISTS studente (
    matricola VARCHAR(20) PRIMARY KEY,
    nome VARCHAR(50) NOT NULL,
    cognome VARCHAR(50) NOT NULL,
    corso VARCHAR(100),
    id_utente INTEGER UNIQUE NOT NULL REFERENCES utente(id_utente) ON DELETE CASCADE
);

-- Professors table
CREATE TABLE IF NOT EXISTS professore (
    id_prof SERIAL PRIMARY KEY,
    nome VARCHAR(50) NOT NULL,
    cognome VARCHAR(50) NOT NULL,
    id_utente INTEGER UNIQUE NOT NULL REFERENCES utente(id_utente) ON DELETE CASCADE
);

-- Administrators table
CREATE TABLE IF NOT EXISTS amministratore (
    id_admin SERIAL PRIMARY KEY,
    nome VARCHAR(50) NOT NULL,
    cognome VARCHAR(50) NOT NULL,
    id_utente INTEGER UNIQUE NOT NULL REFERENCES utente(id_utente) ON DELETE CASCADE
);

-- Courses/Subjects table
CREATE TABLE IF NOT EXISTS insegnamento (
    codice_insegnamento VARCHAR(20) PRIMARY KEY,
    nome VARCHAR(100) NOT NULL,
    cfu INTEGER NOT NULL CHECK (cfu > 0),
    descrizione TEXT,
    id_prof INTEGER REFERENCES professore(id_prof) ON DELETE SET NULL
);

-- Exam attempts table
CREATE TABLE IF NOT EXISTS tentativo (
    id_tentativo SERIAL PRIMARY KEY,
    voto INTEGER CHECK (voto >= 0 AND voto <= 30),
    verbalizzazione BOOLEAN DEFAULT FALSE,
    tipo_tentativo VARCHAR(20) NOT NULL CHECK (tipo_tentativo IN ('completo', 'parziale')),
    accettato BOOLEAN,
    visibile_studente BOOLEAN DEFAULT TRUE,
    presenza BOOLEAN DEFAULT TRUE,
    data_svolgimento DATE NOT NULL,
    esito_finale VARCHAR(20) CHECK (esito_finale IN ('superato', 'non_superato', 'non_applicabile')),
    matricola VARCHAR(20) NOT NULL REFERENCES studente(matricola) ON DELETE CASCADE,
    codice_insegnamento VARCHAR(20) NOT NULL REFERENCES insegnamento(codice_insegnamento) ON DELETE CASCADE,
    id_prof INTEGER NOT NULL REFERENCES professore(id_prof) ON DELETE CASCADE
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_tentativo_matricola ON tentativo(matricola);
CREATE INDEX IF NOT EXISTS idx_tentativo_codice_insegnamento ON tentativo(codice_insegnamento);
CREATE INDEX IF NOT EXISTS idx_tentativo_id_prof ON tentativo(id_prof);
CREATE INDEX IF NOT EXISTS idx_studente_id_utente ON studente(id_utente);
CREATE INDEX IF NOT EXISTS idx_professore_id_utente ON professore(id_utente);

