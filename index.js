
require('dotenv').config();
const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const session = require('express-session');

const app = express();
const port = process.env.PORT || 3000;

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'src', 'views'));


app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));
const sessionSecret = process.env.SESSION_SECRET || 'dev-secret';

app.use(session({
  secret: sessionSecret,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: false, 
  },
}));


//ROTTE
app.use("/auth", require("./src/routes/auth.routes"));
app.use("/studente", require("./src/routes/studente.routes"));
app.use("/professore", require("./src/routes/professore.routes"));
app.use("/amministratore", require("./src/routes/amministratore.routes"));

app.get('/', (req,res)=>{
    res.redirect('/auth');
})

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
