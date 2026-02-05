const express = require("express");
const router = express.Router();
const db = require("../models/db");
const bcrypt = require("bcryptjs");
const { isAuthenticated, isAdmin } = require("../middlewares/auth");

///////////ROTTE AMMINISTRAZIONE/////////////

//GET AMMINISTRAZIONE
router.get('/', isAuthenticated, isAdmin, (req,res)=>{ 
    res.render('amministratore/dashboard');
});


router.get('/creazione_utente', isAuthenticated, isAdmin, (req,res)=>{
    res.render('amministratore/creazione_utente.ejs', {error: null, success:null});
});

router.get('/studenti', isAuthenticated, isAdmin, async (req,res)=>{
  const result = await db.query(`
    SELECT s.matricola, s.nome, s.cognome, s.corso, u.username
    FROM studente s
    JOIN utente u ON s.id_utente = u.id_utente
    ORDER BY u.data_creazione DESC
    `);

  const studenti = result.rows;
  
  res.render('amministratore/studenti', {
    studenti
  })
  
  
});

router.get('/corsi', isAuthenticated,isAdmin, async(req,res)=>{
  const result = await db.query(`
    SELECT
      i.codice_insegnamento,
      i.nome AS nome,
      i.cfu,
      p.nome AS nome_prof,
      p.cognome AS cognome_prof
    FROM insegnamento i
    JOIN professore p ON i.id_prof = p.id_prof
    JOIN utente u ON p.id_utente = u.id_utente
    ORDER BY i.nome;
    `);

  const corsi = result.rows;
  
  res.render('amministratore/corsi', {
    corsi
  })
});

router.get('/creazione_corso', isAuthenticated, isAdmin, async(req,res)=>{

  const result = await db.query(`
    SELECT *
    FROM professore
<<<<<<< HEAD
=======
    JOIN utente ON professore.id_utente = utente.id_utente
>>>>>>> 1794028 (containerization)
    `);
    
  const professori = result.rows;

  res.render('amministratore/creazione_corso.ejs', {professori,error: null, success:null, formData:null});
});

router.get('/professori', isAuthenticated,isAdmin, async(req,res)=>{
  const result = await db.query(`
    SELECT p.id_prof, p.nome, p.cognome, u.email, u.username, i.nome as nome_insegnamento
    FROM professore p
    JOIN utente u ON p.id_utente = u.id_utente
    LEFT JOIN insegnamento i ON p.id_prof = i.id_prof
    ORDER BY p.cognome DESC
    `);

  const professori = result.rows;
  
  res.render('amministratore/professori', {
    professori
  })
});

router.get('/professori/:id_prof/modifica', isAuthenticated,isAdmin, async(req,res)=>{
  const id_prof = req.params.id_prof;

  try{
    const result = await db.query(`
      SELECT
      p.id_prof,
      p.nome,
      p.cognome,
      u.email,
      u.username
      FROM professore p
      JOIN utente u ON p.id_utente = u.id_utente
      WHERE p.id_prof = $1
      `, [id_prof]);

      const professore = result.rows[0];

      res.render('amministratore/modifica_professore', {
        professore: professore,
        error: null,
        success: null
      });
  }catch(err){
    console.log("errore");
    res.send("errore");
  }
});

router.get('/studenti/:matricola/modifica', isAuthenticated, isAdmin,async (req, res) => {
    const matricola = req.params.matricola;

    try {
      const result = await db.query(`
        SELECT 
          s.matricola,
          s.nome,
          s.cognome,
          s.corso,
          u.username,
          u.id_utente
        FROM studente s
        JOIN utente u ON s.id_utente = u.id_utente
        WHERE s.matricola = $1
      `, [matricola]);

      const studente = result.rows[0];

      res.render('amministratore/modifica_studente', {
        studente: studente,
        error: null,
        success: null
      });

    } catch (err) {
      console.error(err);
      res.send("Errore interno");
    }
});

//ROTTE POST AMMINISTRATORE
router.post('/creazione_utente', isAuthenticated, isAdmin, async (req,res)=>{
  const { username, email, password, ruolo } = req.body;
  const { 
    matricola, 
    nome_studente, 
    cognome_studente, 
    corso,
    nome_prof,
    cognome_prof
  } = req.body;

  //validazioni
  if (!username || !email || !password || !ruolo) {
    return res.render('amministratore/creazione_utente', { 
      error: "Compila tutti i campi obbligatori.", 
      success: null 
    });
  }

  if (ruolo === 'studente') {
    if (!matricola || !nome_studente || !cognome_studente) {
      return res.render('amministratore/creazione_utente', {
        error: "Per il ruolo studente devi compilare matricola, nome e cognome.",
        success: null,
      });
    }
  }

  if (ruolo === 'professore') {
    if (!nome_prof || !cognome_prof) {
      return res.render('amministratore/creazione_utente', {
        error: "Per il ruolo professore devi compilare nome e cognome.",
        success: null,
      });
    }
  }

  try {

    const esistente = await db.query(
      "SELECT * FROM utente WHERE username = $1 OR email = $2",
      [username, email]
    );

    if (esistente.rows.length > 0) {
      return res.render('amministratore/creazione_utente', {
        error: "Username o email già esistenti.",
        success: null,
      });
    }

    const esistenza_matricola = await db.query(`
      SELECT * from studente WHERE matricola = $1
      `, [matricola]);
    if (esistenza_matricola.rows.length > 0) {
      return res.render('amministratore/creazione_utente', {
        error: "Matricola già presente nel sistema",
        success: null,
      });
    }

    //inserimento

    //hashed password
    const hashedPassword = await bcrypt.hash(password, 10); //10 = salt rounds


    const inserimento = await db.query(
      `INSERT INTO utente (username, email, password, ruolo, data_creazione)
       VALUES ($1, $2, $3, $4, CURRENT_DATE)
       RETURNING id_utente`,
      [username, email, hashedPassword, ruolo]
    );

    const id_utente = inserimento.rows[0].id_utente;

    if (ruolo === 'studente') {

      await db.query(
        `INSERT INTO studente (matricola, nome, cognome, corso, id_utente)
         VALUES ($1, $2, $3, $4, $5)`,
        [matricola, nome_studente, cognome_studente, corso, id_utente]
      );

    } else if (ruolo === 'professore') {

      await db.query(
        `INSERT INTO professore (nome, cognome, id_utente)
         VALUES ($1, $2, $3)`,
        [nome_prof, cognome_prof, id_utente]
      );

    } else if (ruolo === 'amministratore') {

      await db.query(
        `INSERT INTO amministratore (nome, cognome, id_utente)
         VALUES ($1, $2, $3)`,
        ['Admin', 'Admin', id_utente]  
      );
    }

    return res.render('amministratore/creazione_utente', {
      error: null,
      success: "Utente creato con successo.",
    });

  } catch (err) {
    console.error("Errore creazione utente:", err);
    return res.render('amministratore/creazione_utente', {
      error: "Errore interno, riprova più tardi.",
      success: null,
    });
  }
});


router.post('/creazione_corso', isAuthenticated, isAdmin, async(req,res)=>{
  const { codice_insegnamento,nome,cfu,id_prof,descrizione } = req.body;
  const formData = { codice_insegnamento, nome, cfu, id_prof, descrizione };
  try{

  const resultprof = await db.query(`
    SELECT *
    FROM professore
<<<<<<< HEAD
    JOIN utente ON professore.id_utente = utente.id_utente
=======
>>>>>>> 1794028 (containerization)
    `);
    
  const professori = resultprof.rows;

  const esistente = await db.query(`
    SELECT *
    FROM insegnamento
    WHERE codice_insegnamento = $1
    `, [codice_insegnamento]);
  const result = esistente.rows;

  if(result.length>0){
    return res.render('amministratore/creazione_corso', {
      professori,
      error: "Corso già esistente",
      success: null,
      formData
      });
  }

  const controlloAppartenenza = await db.query(`
    SELECT *
    from insegnamento
    JOIN professore ON insegnamento.id_prof = professore.id_prof
    WHERE professore.id_prof = $1
    `, [id_prof])
  
  if(controlloAppartenenza.rows.length>0){
    return res.render('amministratore/creazione_corso', {
      professori,
      error: "Professore già assegnato",
      success: null,
      formData
      });
  }

  await db.query(`
    INSERT INTO insegnamento(codice_insegnamento,nome,cfu,descrizione,id_prof)
    VALUES($1,$2,$3,$4,$5)
    `,[codice_insegnamento,nome,cfu,descrizione,id_prof] );

  return res.render('amministratore/creazione_corso', {
      professori,
      error: null,
      success: "Corso aggiunto con successo.",
      formData
    });
  }catch(err){
    console.log(err);
    res.send("errore");
  }

});

router.post('/professori/:id_prof/modifica',isAuthenticated,isAdmin, async (req, res) => {

    const id_prof = req.params.id_prof;
    const { password, confermaPassword } = req.body;

    try {
      // 1) Recupero dati del professore + utente
      const result = await db.query(
        `SELECT 
           p.id_prof,
           p.nome,
           p.cognome,
           u.id_utente,
           u.email AS email,
           u.username
         FROM professore p
         JOIN utente u ON p.id_utente = u.id_utente
         WHERE p.id_prof = $1`,
        [id_prof]
      );

      if (result.rows.length === 0) {
        return res.send("Professore non trovato");
      }

      const professore = result.rows[0];
      const id_utente = professore.id_utente;

      // 2) Caso: nessuna password inserita → non cambio niente
      if (!password || password.trim() === "") {
        return res.render('amministratore/modifica_professore', {
          professore: {
            id_prof: professore.id_prof,
            nome: professore.nome,
            cognome: professore.cognome,
            email: professore.email,
            username: professore.username
          },
          error: null,
          success: null
        });
      }

      // 3) Password inserita ma non coincide con conferma
      if (password !== confermaPassword) {
        return res.render('amministratore/modifica_professore', {
          professore: {
            id_prof: professore.id_prof,
            nome: professore.nome,
            cognome: professore.cognome,
            email: professore.email,
            username: professore.username
          },
          error: "Le password non coincidono",
          success: null
        });
      }


      const hashedPassword = await bcrypt.hash(password,10);
      await db.query(
        `UPDATE utente
         SET password = $1
         WHERE id_utente = $2`,
        [hashedPassword, id_utente]
      );

      return res.render('amministratore/modifica_professore', {
        professore: {
          id_prof: professore.id_prof,
          nome: professore.nome,
          cognome: professore.cognome,
          email: professore.email,
          username: professore.username
        },
        error: null,
        success: "Password aggiornata con successo!"
      });

    } catch (err) {
      console.error("Errore durante l’esecuzione della query:", err);
      return res.send("Errore interno");
    }
  }
);

router.post('/studenti/:matricola/modifica', isAuthenticated, isAdmin, async(req,res)=>{
  const matricola = req.params.matricola;
  const {corso,username,password,confermaPassword} = req.body;

  try{
    const result = await db.query(`
      SELECT
      s.nome,
      s.cognome,
      s.id_utente
      FROM studente s
      WHERE s.matricola = $1
      `, [matricola]);

      if(controlloEsistenza(result.rows.length)){res.send("studente non esistente");}

      const stud = result.rows[0];
      const id_utente = result.rows[0].id_utente;

      //controllo username gia in uso o no
      const controllo = await db.query(`
        SELECT id_utente
        from utente
        WHERE username = $1 AND id_utente <> $2
        `, [username, id_utente]);

        if(!controlloEsistenza(controllo.rows.length)){
          return res.render('amministratore/modifica_studente', {
            studente: {matricola,nome:stud.nome,cognome:stud.cognome,corso,username},
            error: "Username già in uso",
            success:null
          });
        }

        //modifica corso
        if(corso && corso.trim() !== ""){
        await db.query(`
          UPDATE studente
          SET corso=$1
          WHERE matricola=$2
          `, [corso, matricola]);
        }

        //modifica password
        if(password && password.trim() !== ""){
          if(password === confermaPassword){
          const hashedPassword = await bcrypt.hash(password,10);
          await db.query(`
          UPDATE utente
          SET password=$1
          WHERE id_utente=$2
          `, [hashedPassword, id_utente]);
          }else{
            return res.render('amministratore/modifica_studente', {
              studente: {matricola,nome:stud.nome,cognome:stud.cognome,corso,username},
              error: "Le password non coincidono",
              success:null
          });
          }
        }

        //modifica username
        if(username && username.trim() !== ""){
        await db.query(`
          UPDATE utente
          SET username=$1
          WHERE id_utente=$2
          `, [username, id_utente]);
        }

        
        res.render('amministratore/modifica_studente', {
        studente: { matricola,nome:stud.nome,cognome:stud.cognome,corso,username },
        error: null,
        success: "Modifiche salvate con successo!"
        });

  }catch(err){
    console.log("errore");
    res.send("errore");
  }
});

router.post('/studenti/:matricola/elimina', isAuthenticated, isAdmin, async(req,res)=>{
  const matricola = req.params.matricola;
  try{

    await db.query(`
      DELETE FROM utente
      WHERE id_utente = (
        SELECT id_utente
        FROM studente
        WHERE matricola = $1
        );
      `, [matricola]);

    return res.redirect('/amministratore/studenti');

  }catch(err){
    console.log(err);
    res.send("errore")
  }
});

function controlloEsistenza(n){
  return n===0;
}

module.exports = router;
