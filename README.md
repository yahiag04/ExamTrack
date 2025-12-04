# ExamTrack – University Exam Management System

ExamTrack is a full-stack web application designed to monitor university exam attempts, grades, outcomes, and overall student progress. It provides a clean, icon-based interface and an optimized PostgreSQL backend for fast and structured data retrieval.

## Features
- Track all exam attempts per student.
- View grades, outcomes, acceptance status, and verbalization details.
- Automatically compute the number of attempts for each course.
- Clean UI focused on clarity and efficiency.
- Modular backend with optimized SQL queries.
- REST endpoints exposing structured exam and student data.

## Tech Stack
**Frontend:** EJS, CSS, JavaScript  
**Backend:** Node.js, Express  
**Database:** PostgreSQL  
**Other Tools:** Axios, pg library, dotenv

## Architecture Overview
The system follows a simple MVC-style structure:

- **Routes** handle incoming requests and connect them with controllers.  
- **Controllers** run validations and call database services.  
- **Database layer** contains optimized SQL queries used to fetch and aggregate exam data.  
- **Views (EJS)** render the UI using data passed from the backend.

## Installation

### Prerequisites
- Node.js ≥ 18  
- PostgreSQL installed and running  
- A configured database with the required tables (`studente`, `insegnamento`, `tentativo`, …)

### Setup
```bash
git clone <repository-url>
cd examtrack
npm install
```

Create a `.env` file:
```bash
DB_HOST=localhost
DB_USER=your_username
DB_PASSWORD=your_password
DB_NAME=examtrack
DB_PORT=5432
PORT=3000
```

Run the server:
```bash
npm start
```

Visit:
```bash
http://localhost:3000
```

## Example Query (Backend)
The system uses optimized SQL queries to compute the attempt count per course:

```sql
SELECT
  i.nome AS nome_insegnamento,
  t.voto,
  t.tipo_tentativo,
  t.esito_finale,
  t.verbalizzazione,
  t.id_tentativo,
  t.accettato,
  t.data_svolgimento,
  (
    SELECT COUNT(*)
    FROM tentativo t2
    WHERE t2.matricola = t.matricola
      AND t2.codice_insegnamento = t.codice_insegnamento
  ) AS numero_tentativi
FROM tentativo t
JOIN insegnamento i ON t.codice_insegnamento = i.codice_insegnamento
WHERE t.matricola = $1
  AND t.visibile_studente = TRUE
ORDER BY t.data_svolgimento DESC;
```

## Project Structure
```text
examtrack/
│── routes/
│── controllers/
│── db/
│── public/
│── views/
│── server.js
│── package.json
│── README.md
```

## Roadmap
- Add admin dashboard  
- Add CSV export for exam history  
- Add search and filters  
- Add authentication and role-based access  

## License
MIT License.

## Acknowledgements
Built for academic purposes using Node.js, Express, and PostgreSQL.
