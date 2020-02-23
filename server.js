const express = require('express')
const app = express()
const expressLayouts = require('express-ejs-layouts')
const bodyParser = require('body-parser');

/*
  This module sets up the Server.
*/
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
    extended: false
}));

const indexRouter = require('./routes/index')

app.set('view engine', 'ejs')
app.set('views', __dirname + '/views')
app.use(express.static('public'))

app.use('/', indexRouter)

app.listen(8888)
