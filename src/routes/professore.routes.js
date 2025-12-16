const express = require("express");
const router = express.Router();
const db = require("../models/db");
const { isAuthenticated, isProfessore } = require("../middlewares/auth");

///////////////ROTTE PROFESSORE/////////////////

//GET PROFESSORE
router.get('/',isAuthenticated,isProfessore, async(req,res)=>{
    const id_utente = req.session.id_utente;

    try{
    const result = await db.query(`
      SELECT 
        p.nome,
        p.cognome,
        u.email AS email,
        i.nome AS nome_corso
      FROM professore p
      JOIN utente u ON p.id_utente = u.id_utente
      LEFT JOIN insegnamento i ON p.id_prof = i.id_prof
      WHERE u.id_utente = $1
      `, [id_utente]);
      const professore = result.rows[0];

      res.render('professore/dashboard', {
        professore:{
        nome:professore.nome,cognome: professore.cognome, email:professore.email, nome_insegnamento:professore.nome_corso
        }
      });
    }catch(err){
      console.log("errore");
      res.send("errore");
    }


});

router.get('/dashboard', isAuthenticated,isProfessore, (req,res)=>{
  res.redirect('/professore');
})

router.get('/nuovo_voto', isAuthenticated,isProfessore, async(req,res)=>{
  const id_utente = req.session.id_utente;

  try{
  const result = await db.query(`
    SELECT 
      i.nome,
      i.codice_insegnamento
    FROM insegnamento i
    JOIN professore p ON i.id_prof = p.id_prof
    JOIN utente u ON p.id_utente = u.id_utente
    WHERE u.id_utente = $1
    `, [id_utente]);

    if(result.rows.length ===0){
      return res.send("professore non ha insegnamento");
    }
    const insegnamento = result.rows[0];
    res.render('professore/nuovo_voto', {
      insegnamento,
      error:null,
      success:null,
      formData:null
    })
  }catch(err){
    console.log("errore");
    res.send("errore");
  }
});

router.get('/verbalizzazioni', isAuthenticated,isProfessore, async(req,res)=>{

  const id_utente = req.session.id_utente;

  try{
  const result = await db.query(`
    SELECT
    t.id_tentativo,
    t.voto,
    t.data_svolgimento,
    s.nome AS nome_studente,
    s.cognome AS cognome_studente,
    s.matricola,
    i.nome AS nome_insegnamento
    FROM tentativo t
    JOIN studente s ON t.matricola = s.matricola
    JOIN insegnamento i ON t.codice_insegnamento = i.codice_insegnamento
    JOIN professore p ON t.id_prof = p.id_prof
    JOIN utente u ON p.id_utente = u.id_utente
    WHERE t.accettato = TRUE AND t.verbalizzazione = FALSE AND u.id_utente = $1 AND i.id_prof = p.id_prof
    ORDER BY t.data_svolgimento DESC
    `,[id_utente]);
  const votiDaVerbalizzare = result.rows;

  res.render('professore/verbalizzazioni', {
    votiDaVerbalizzare,
    error:null,
    success:null
  });
}catch(err){
  console.log("errore");
  res.send("errore");
}
});

router.get('/statistiche_corso', isAuthenticated, isProfessore, async (req, res) => {
  const id_utente = req.session.id_utente;

  try {
    const corsoResult = await db.query(`
      SELECT 
        i.codice_insegnamento,
        i.nome AS nome_insegnamento
      FROM insegnamento i
      JOIN professore p ON i.id_prof = p.id_prof
      JOIN utente u ON p.id_utente = u.id_utente
      WHERE u.id_utente = $1
    `, [id_utente]);

    if (corsoResult.rows.length === 0) {
      return res.render('professore/statistiche_corso', {
        corso: null,
        numSuperati: 0,
        numNonSuperati: 0,
        error: 'Nessun insegnamento è associato a questo account docente.',
        success: null
      });
    }

    const corso = corsoResult.rows[0]; 

    const statsResult = await db.query(`
      SELECT
        COUNT(*) FILTER (
          WHERE tipo_tentativo = 'completo'
            AND esito_finale = 'superato'
        ) AS num_superati,
        COUNT(*) FILTER (
          WHERE tipo_tentativo = 'completo'
            AND esito_finale = 'non_superato'
        ) AS num_non_superati
      FROM tentativo
      WHERE codice_insegnamento = $1
    `, [corso.codice_insegnamento]);

    const stats = statsResult.rows[0] || { num_superati: 0, num_non_superati: 0 };

    const numSuperati = Number(stats.num_superati) || 0;
    const numNonSuperati = Number(stats.num_non_superati) || 0;

    return res.render('professore/statistiche_corso', {
      corso: {
        nome_insegnamento: corso.nome_insegnamento,
        codice_insegnamento: corso.codice_insegnamento
      },
      numSuperati,
      numNonSuperati,
      error: null,
      success: null
    });

  } catch (err) {
    console.error(err);
    return res.render('professore/statistiche_corso', {
      corso: null,
      numSuperati: 0,
      numNonSuperati: 0,
      error: 'errore',
      success: null
    });
  }
});

//POST PROFESSORE
router.post('/nuovo_voto', isAuthenticated,isProfessore, async(req,res)=>{

  const {matricola, tipo_tentativo, presenza,voto, data_svolgimento, note} = req.body;
  const formData = {matricola,tipo_tentativo,presenza,voto,data_svolgimento,note};

  const id_utente = req.session.id_utente;

  try{
  const result = await db.query(`
    SELECT 
      i.nome,
      i.codice_insegnamento
    FROM insegnamento i
    JOIN professore p ON i.id_prof = p.id_prof
    JOIN utente u ON p.id_utente = u.id_utente
    WHERE u.id_utente = $1
    `, [id_utente]);

  const insegnamento = result.rows[0];

  //controlli e validazioni

  //controllo sulla matricola
  const checkMatricola = await db.query(`
    SELECT *
    FROM studente
    WHERE matricola = $1
    `, [matricola]);
  
  if(checkMatricola.rows.length === 0){
    return res.render('professore/nuovo_voto',{
      insegnamento,
      error: "Studente non esistente",
      success: null,
      formData
    } )
  }

  //controllo voto (anche se già fatto in html/ejs)

  if(voto > 30 || voto < 0){
    return res.render('professore/nuovo_voto',{
      insegnamento,
      error: "Voto non conforme",
      success: null,
      formData
    } )
  }
  
  //controllo data
  const date = new Date();
  const dataEsame = new Date(data_svolgimento);
  if(dataEsame>date){
    return res.render('professore/nuovo_voto',{
      insegnamento,
      error: "Data non può essere futura",
      success: null,
      formData
    });
  }

  //controllo esame già superato
  
  const esameSuperato = await db.query(`
    SELECT *
    FROM tentativo
    WHERE
      matricola = $1 AND
      codice_insegnamento = $2 AND
      accettato = TRUE
    
    `,[matricola,insegnamento.codice_insegnamento]);

  const superato = esameSuperato.rows;

  if(superato.length>0){
    return res.render('professore/nuovo_voto',{
      insegnamento,
      error: "Esame già superato dallo studente",
      success: null,
      formData
    });
  }

  //controllo voto in fase di accettazione o rifiuto
      const esisteCompleto = await db.query(`
        SELECT 1
        FROM tentativo t
        WHERE t.matricola = $1
          AND t.codice_insegnamento = $2
          AND t.tipo_tentativo = 'completo'
          AND t.verbalizzazione = FALSE
          AND t.visibile_studente = TRUE
          AND t.presenza = TRUE
        LIMIT 1
      `, [matricola, insegnamento.codice_insegnamento]);

      if (esisteCompleto.rows.length > 0) {
        return res.render('professore/nuovo_voto', {
          insegnamento,
          error: "Esiste già un esame completo non ancora gestito dallo studente per questo corso.",
          success: null,
          formData
        });
      }


  //inserimento

  const votoInt = voto !== "" ? parseInt(voto, 10) : null;
  let esito_finale;
  if(votoInt >= 18 && presenza==='true'){
    esito_finale="superato";
  }
  else if(tipo_tentativo==='parziale' && presenza==='true' && votoInt>=18){
    esito_finale="non_applicabile";
  }else{
    esito_finale="non_superato";
  }

  const profe = await db.query(`
    SELECT id_prof
    FROM professore
    JOIN utente ON professore.id_utente = utente.id_utente
    WHERE utente.id_utente = $1
    `, [id_utente]);
  
    const prof = profe.rows[0];


  await db.query(`
    INSERT INTO tentativo(voto,verbalizzazione,tipo_tentativo,accettato,presenza,data_svolgimento,esito_finale,matricola,codice_insegnamento,id_prof)
    values($1,FALSE,$2,NULL,$3,$4,$5,$6,$7,$8)
    `, [votoInt,tipo_tentativo,presenza,data_svolgimento,esito_finale,matricola,insegnamento.codice_insegnamento,prof.id_prof]);
  

  //CREAZIONE VOTO DATI DUE PARZIALI INSERITI 
  if(tipo_tentativo==='parziale' && voto > 17){
  const ricercaParziali = await db.query(`
    SELECT *
    FROM tentativo
    WHERE tipo_tentativo = 'parziale' AND voto > 17 AND matricola=$1 AND codice_insegnamento=$2
    ORDER BY data_svolgimento DESC
    `, [matricola,insegnamento.codice_insegnamento]);

  const parziali_trovati = ricercaParziali.rows;
  if(parziali_trovati.length >= 2){
    const voto1 = parseInt(parziali_trovati[0].voto, 10);
    const voto2 = parseInt(parziali_trovati[1].voto, 10);
    const media = Math.round((voto1+voto2) / 2);
    const data_svolgimento_ultimo = parziali_trovati[1].data_svolgimento;
    await db.query(`
    INSERT INTO tentativo(voto,verbalizzazione,tipo_tentativo,accettato,presenza,data_svolgimento,esito_finale,matricola,codice_insegnamento,id_prof)
    values($1,FALSE,'completo',NULL,TRUE,$2,'superato',$3,$4,$5)
    `, [media,data_svolgimento_ultimo,matricola,insegnamento.codice_insegnamento,prof.id_prof]);

    await db.query(`
      UPDATE tentativo t
      SET visibile_studente = FALSE
      WHERE id_tentativo in ($1,$2)
      `, [parziali_trovati[0].id_tentativo,parziali_trovati[1].id_tentativo]);

  }
} 

  return res.render('professore/nuovo_voto', {
      insegnamento,
      error: null,
      success: "Voto inserito con successo.",
      formData
    });
  }catch(err){
    console.log(err);
    res.send("errore");
  }

});

router.post('/verbalizzazioni/:id_tentativo/verbalizza', isAuthenticated,isProfessore, async(req,res)=>{
  const id_utente = req.session.id_utente;
  const id_tentativo = req.params.id_tentativo;

  try{
    await db.query(`
      UPDATE tentativo t
      SET verbalizzazione = TRUE
      WHERE t.id_tentativo = $1

      `, [id_tentativo]);

      
    const result = await db.query(`
    SELECT
    t.id_tentativo,
    t.voto,
    t.data_svolgimento,
    s.nome AS nome_studente,
    s.cognome AS cognome_studente,
    s.matricola,
    i.nome AS nome_insegnamento
    FROM tentativo t
    JOIN studente s ON t.matricola = s.matricola
    JOIN insegnamento i ON t.codice_insegnamento = i.codice_insegnamento
    JOIN professore p ON t.id_prof = p.id_prof
    JOIN utente u ON p.id_utente = u.id_utente
    WHERE t.accettato = TRUE AND t.verbalizzazione = FALSE AND u.id_utente = $1 AND i.id_prof = p.id_prof
    ORDER BY t.data_svolgimento DESC
    `,[id_utente]);
  const votiDaVerbalizzare = result.rows;

  res.render('professore/verbalizzazioni', {
    votiDaVerbalizzare,
    error:null,
    success:null
  });

  }catch(err){
    console.log("errore");
    res.send("errore");
  }
});



module.exports = router;
