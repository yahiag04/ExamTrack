
const express = require("express");
const router = express.Router();
const db = require("../models/db");
const { isAuthenticated, isStudente } = require("../middlewares/auth");

//////////////ROTTE STUDENTE///////////////////

//GET STUDENTE
router.get('/', isAuthenticated, isStudente, async (req,res)=>{
    const id_utente = req.session.id_utente;

    try{

      const studente_selezionato = await db.query(
        "SELECT * FROM studente WHERE id_utente=$1",
        [id_utente]
      );

      if(controlloEsistenza(studente_selezionato.rows.length)){
        res.send("studente non trovato");
      }

      const studente = studente_selezionato.rows[0];

      const tentativo = await db.query(`
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
        ORDER BY t.data_svolgimento DESC
        `, [studente.matricola]);   

        const tentativi = tentativo.rows;

        const voti = await db.query(`
          SELECT 
          t.voto
          FROM tentativo t
          WHERE t.matricola = $1 AND t.verbalizzazione = TRUE
          `, [studente.matricola]);

        const voti_totali = voti.rows;
        let somma_voti=0;
        voti_totali.forEach(voto => somma_voti+=voto.voto);
        const media = parseFloat((somma_voti/voti_totali.length).toFixed(1));
        const totaleTentativi = tentativi.filter(t => t.tipo_tentativo === 'completo').length;
        

        //nuove aggiunte 30/11/2025
        const esamiVerbalizzati = await db.query(`
          SELECT 
            t.voto,
            t.data_svolgimento,
            t.codice_insegnamento,
            i.nome AS nome_insegnamento,
            i.cfu AS cfu
          FROM tentativo t
          JOIN insegnamento i ON t.codice_insegnamento = i.codice_insegnamento
          WHERE t.matricola = $1
            AND t.verbalizzazione = TRUE
            AND t.tipo_tentativo = 'completo'
          ORDER BY t.data_svolgimento DESC
        `, [studente.matricola]);

        const ricercaCfu = await db.query(`
          SELECT 
            SUM(i.cfu) AS cfu_totali
          FROM tentativo t
          JOIN insegnamento i ON t.codice_insegnamento = i.codice_insegnamento
          WHERE t.matricola = $1 AND t.verbalizzazione = TRUE; 
          `, [studente.matricola]);

        const cfuTotali = ricercaCfu.rows[0].cfu_totali || 0;

        res.render('studente/dashboard', {
          studente,
          tentativi,
          media:media,
          cfuTotali,
          totTentativi: totaleTentativi,
          esamiVerbalizzati: esamiVerbalizzati.rows
        });
      

    }catch(err){
      console.log("error");
      res.send("errore");
    }

});

//POST STUDENTE
router.post('/tentativi/:id_tentativo/accetta', isAuthenticated, isStudente, async (req, res) => {
  const id_tentativo = req.params.id_tentativo;
  const id_utente = req.session.id_utente;

  try {
    await db.query(`
      UPDATE tentativo t
      SET accettato = TRUE
      FROM studente s
      WHERE t.id_tentativo = $1
        AND s.id_utente = $2
        AND t.matricola = s.matricola
        AND t.tipo_tentativo = 'completo'
        AND t.voto >= 18
        AND t.verbalizzazione = FALSE
    `, [id_tentativo, id_utente]);

    return res.redirect('/studente');
  } catch (err) {
    console.log(err);
    return res.send("errore");
  }
});

router.post('/tentativi/:id_tentativo/rifiuta', isAuthenticated, isStudente, async (req, res) => {
  const id_tentativo = req.params.id_tentativo;
  const id_utente = req.session.id_utente;

  try {
    await db.query(`
      UPDATE tentativo t
      SET visibile_studente = FALSE
      FROM studente s
      WHERE t.id_tentativo = $1 AND s.id_utente = $2 AND t.matricola = s.matricola AND t.verbalizzazione = FALSE
    `, [id_tentativo, id_utente]);

    return res.redirect('/studente');

  } catch (err) {
    console.log(err);
    return res.send("errore");
  }
});

router.post('/tentativi/:id_tentativo/presa_visione', isAuthenticated, isStudente, async (req, res) => {
  const id_tentativo = req.params.id_tentativo;
  const id_utente = req.session.id_utente;

  try {
    await db.query(`
      UPDATE tentativo t
      SET visibile_studente = FALSE
      FROM studente s
      WHERE t.id_tentativo = $1 AND s.id_utente = $2 AND t.matricola = s.matricola AND t.tipo_tentativo = 'completo' 
        AND t.voto < 18
        AND t.verbalizzazione = FALSE
    `, [id_tentativo, id_utente]);

    return res.redirect('/studente');
  } catch (err) {
    console.log(err);
    return res.send('errore');
  }
});

function controlloEsistenza(n){
  return n===0;
}

module.exports = router;