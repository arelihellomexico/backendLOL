
var express = require('express');
var app = express();
var bodyParser = require("body-parser")
var methodOverride = require("method-override");
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(methodOverride());


app.get('/healtcheck', function (req, res) {
   // First read existing users.
   res.send({"mensaje": "Funcionando correctamente"})
})

app.post('/usuario', function (req, res) {
   // First read existing users.
   if(req.body.usuario === 'prueba' && req.body.email === 'prueba@gmail.com' && req.body.cupon === '12345' ){
      res.status(200).send({"mensaje": "Funcionando correctamente"})
   } else {
      res.status(500).send({"mensaje": "no esta funcionando correctamente"})
   }
})

var server = app.listen(3000, function () {
   var host = server.address().address
   var port = server.address().port
   console.log("Example app listening at http://%s:%s", host, port)
})