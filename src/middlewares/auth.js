function isAuthenticated(req, res, next) {
  if (!req.session || !req.session.id_utente) {
    return res.redirect('/auth');
  }
  next();
}

function isStudente(req, res, next) {
  if (req.session.ruolo !== 'studente') {
    return res.redirect('/auth');
  }
  next();
}

function isProfessore(req, res, next) {
  if (req.session.ruolo !== 'professore') {
    return res.redirect('/auth');
  }
  next();
}

function isAdmin(req, res, next) {
  if (req.session.ruolo !== 'amministratore') {
    return res.redirect('/auth');
  }
  next();
}

module.exports = {
  isAuthenticated,
  isStudente,
  isProfessore,
  isAdmin,
};