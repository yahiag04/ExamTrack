const express = require("express");
const router = express.Router();
const db = require("../models/db");
const bcrypt = require("bcryptjs");

//ROTTE LOGIN
router.get('/', (req,res)=>{
    res.render('auth/login', { error: null });
});

router.post('/login', async (req,res)=>{
    const username = req.body["username"];
    const password = req.body["password"];

    const result = await db.query(
        `SELECT * from utente 
        WHERE username = $1`, 
        [username])

    if(result.rows.length === 0){
        return res.render('auth/login', {error: "utente non esistente"})
    }

    const utente = result.rows[0];
    const password_utente = utente.password;
    const passwordCorretta = await bcrypt.compare(password, password_utente);
    if(!passwordCorretta){
        return res.render('auth/login', {error:"credenziali errate"});
    }
    req.session.id_utente = utente.id_utente;
    req.session.ruolo = utente.ruolo;

    return res.redirect(`/${utente.ruolo}`);
});


module.exports = router;