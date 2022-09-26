var express = require('express');
var app = express();
var bodyParser = require("body-parser")
var methodOverride = require("method-override");
var fs = require("fs");
var qrcode = require("qrcode");
var pdf = require('html-pdf');
var sgMail = require('@sendgrid/mail')
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(methodOverride());

app.use(function (req, res, next) {

    // Website you wish to allow to connect
    res.setHeader('Access-Control-Allow-Origin', '*');
 
    // Request methods you wish to allow
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
 
    // Request headers you wish to allow
    res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type');
 
    // Set to true if you need the website to include cookies in the requests sent
    // to the API (e.g. in case you use sessions)
    res.setHeader('Access-Control-Allow-Credentials', true);
 
    // Pass to next layer of middleware
    next();
 });

var mysql      = require('mysql');
var connection = mysql.createConnection({
    host     : 'database-1.c8nykpb5gjgy.us-east-1.rds.amazonaws.com',
    database : 'worldlol',
    user     : 'admin',
    password : 'Rosales123*',
});

app.get('/healtcheck', function (req, res) {
   // First read existing users.
   res.send({"mensaje": "Funcionando correctamente"})
})

app.post('/usuario', async function (req, res) {
    const queryCuponUsuario = "SELECT * FROM usuario u where u.codigo_acceso = '"+ req.body.codigo_acceso  + "'";
    await connection.query(queryCuponUsuario, async function (error, result, fields) {
        if (result.length > 0 ) {
            res.send({"mensaje": "Tu cupon ya esta en uso con otro usuario", 'code': 500, 'data': 'no hay data'});
        } else {
            const queryCupon = "SELECT * FROM cupon cu where cu.clave = '"+ req.body.codigo_acceso  + "'";
            await connection.query(queryCupon, async function (error, results1, fields) {
                if(results1.length > 0) {   
                    const queryCupon = "SELECT * FROM evento ev where ev.id = '"+ results1[0].id_evento  + "'";
                    await connection.query(queryCupon, async function (error, results2, fields) {
                        const usuario =  generarUser();
                        const contrasenia =  generarString(10);
                        const query = "INSERT INTO worldlol.usuario (nombre,email,codigo_acceso,verificado,usuario,contrasenia,id_evento,id_cupon) \n"
                        + "VALUES ('" + req.body.nombre + "', '" + req.body.email + "', '" + req.body.codigo_acceso + "', "
                        + 0 + ", '" + usuario + "' , '" + contrasenia + "', " + results1[0].id_evento + ", " + results1[0].id + " )"
                        await connection.query(query, async function (error, results3, fields) {
                            const API_KEY = 'API'
                            const QR = await qrcode.toDataURL(req.body.codigo_acceso)
                            const codigo = QR.replace('data:image/png;base64,' , ''); 
                            sgMail.setApiKey(API_KEY)
                            const message = {
                                to: req.body.email,
                                from: 'registro@worldscdmx2022.com',
                                subject: '¡Bienvenido a World CDMX 2022',
                                text: '¡Tus boletos estan listo!',
                                html: '<img src="' + QR +'"/>' +
                                '<img src="cid:myimagecid"/>' +
                                '<center> <p style="color: black; font-size: 20px;">Código de acceso</p> </center>' +
                                '<center> <p style="color: black; font-size: 20px;">'+ req.body.codigo_acceso +'</p> </center>' +
                                '<center> <p style="color: black; font-size: 20px;">Usuario</p> </center>' +
                                '<center> <p style="color: black; font-size: 20px;">'+ usuario +'</p> </center>' +
                                '<center> <p style="color: black; font-size: 20px;">Contraseña</p> </center>' +
                                '<center> <p style="color: black; font-size: 20px;">'+ contrasenia +'</p> </center>' +
                                ' <center>  <p style="color: black; font-size: 20px;">Fecha</p> </center>' +
                                '<center> ' +
                                '<!-- eslint-disable-next-line max-len --> '+ 
                                '<p style="width: 540px; height: 40px; border-radius: 20px; color: #321BDD; text-align: center; padding-top: 8px; font-size: 20px;">' + results2[0].fecha.toISOString().substring(0, 10) + '</p> ' +
                                '<p style="color: black; font-size: 20px;">Hora</p> '+
                                '<!-- eslint-disable-next-line max-len --> ' + 
                                '<p style="width: 540px; height: 40px; border-radius: 20px; color: #321BDD; text-align: center; padding-top: 8px; font-size: 20px;">' +results2[0].hora_inicio + ' a ' + results2[0].hora_fin + 'hrs </p>' +
                                '<p style="color: black; font-size: 20px;"> ' +
                                'Lugar: Centro Cultural Estación Indianilla <br> ' +
                                '  Dirección: Claudio Bernard 111, Doctores, Cuauhtémoc,<br> 06720 Ciudad de México, CDMX '+
                                '</p> ' +
                                '<br> ' +
                                ' </center> '+
                                '<br>' ,
                                attachments: [
                                    {
                                    filename: "imageattachment.png",
                                    content: codigo,
                                    content_id: "myimagecid",
                                    }
                                ]     
                            }
                            sgMail.send(message)
                            .then(respose => console.log('Enviado' ))
                            .catch(error => console.log('Error' + error.message))
                            res.send({"mensaje": "Usuario registrado correctamente", 'code': 200, 'data': []});
                        });
                    });
                    
                } else {
                    res.send({"mensaje": "No se encontro ese cupon", 'code': 500, 'data': 'no hay data'});
                }
            }); 
        }
    });    
})

app.post('/confirmarCodigo', async function (req, res) {
    const queryCupon = "SELECT * FROM usuario u where u.codigo_acceso = '"+ req.body.codigo_acceso  + "'";
    await connection.query(queryCupon, async function (error, results, fields) {
        if(results.length > 0) { 
            const queryUser = "UPDATE usuario u SET u.verificado = 1 where u.id = " +  results[0].id;
            await connection.query(queryUser, async function (error, results, fields) {
                const queryCupons = "SELECT * FROM cupon cu where cu.clave = '"+ req.body.codigo_acceso  + "'";
                await connection.query(queryCupons, async function (error, results, fields) {
                    const queryUser = "UPDATE cupon cu SET cu.activo = 0 where cu.clave = '" + req.body.codigo_acceso  +"'" ;
                    await connection.query(queryUser, async function (error, results, fields) {
                        res.send({"mensaje": "Listo tu acceso", 'code': 200, 'data': []});
                    });
                });
            });
        } else {
            res.send({"mensaje": "No se encontro ese cupon", 'code': 500, 'data': 'no hay data'});
        }
        
    });    
})

app.post('/generateQR', async function (req, res) {
    const urlCv = req.body.codigo_acceso;
      const QR = await qrcode.toDataURL(urlCv)
      const htmlContent =  `
      <div style="display: flex; justify-content: center; align-items: center;">
      <h2>Boleto</h2>
      <img src="${QR}">
      </div>
      `;
      fs.writeFileSync('./index.html', htmlContent)    
    res.send({"mensaje": "Se genero correctamente el codigo QR"})
})


app.get('/generatePDF', async function (req, res) {
    var contenido = `
        <h1>Esto es un test de html-pdf</h1>
        <p>Estoy generando PDF a partir de este código HTML sencillo</p>
        `;

        pdf.create(contenido).toFile('./salida.pdf', function(err, res) {
            if (err){
                console.log(err);
            } else {
                console.log(res);
            }
    });
    res.send({"mensaje": "Se genero correctamente el codigo QR"})
})



app.get('/generatePDF', async function (req, res) {
    var contenido = `
        <h1>Esto es un test de html-pdf</h1>
        <p>Estoy generando PDF a partir de este código HTML sencillo</p>
        `;

        pdf.create(contenido).toFile('./salida.pdf', function(err, res) {
            if (err){
                console.log(err);
            } else {
                console.log(res);
            }
    });
    res.send({"mensaje": "Se genero correctamente el codigo QR"})
})

app.get('/enviarCorreo', async function (req, res) {
    const API_KEY = 'API'

    sgMail.setApiKey(API_KEY)
    const urlCv = 'L5R3P8';
    const QR = await qrcode.toDataURL(urlCv)
    const codigo = QR.replace('data:image/png;base64,' , ''); 
    const message = {
        to: 'erosalescoronel@gmail.com',
        from: 'registro@worldscdmx2022.com',
        subject: '¡Bienvenido a World CDMX 2022',
        text: '¡Tus boletos estan listo!',
        html: '<img src="' + QR +'"/>' +
        '<img src="cid:myimagecid"/>' +
        '<center> <p style="color: black; font-size: 20px;">Código de acceso</p> </center>' +
        '<center> <p style="color: black; font-size: 20px;">TOKEM1029288</p> </center>' +
        ' <center>  <p style="color: black; font-size: 20px;">Fecha</p> </center>' +
        '<center> ' +
        '<!-- eslint-disable-next-line max-len --> '+ 
          '<p style="width: 540px; height: 40px; border-radius: 20px; color: #321BDD; text-align: center; padding-top: 8px; font-size: 20px;">29 DE SEPTIEMBRE DEL 2022</p> ' +
          '<p style="color: black; font-size: 20px;">Hora</p> '+
          '<!-- eslint-disable-next-line max-len --> ' + 
          '<p style="width: 540px; height: 40px; border-radius: 20px; color: #321BDD; text-align: center; padding-top: 8px; font-size: 20px;">12:00 a 22:00 hrs</p> ' +
          '<p style="color: black; font-size: 20px;"> ' +
          'Lugar: Centro Cultural Estación Indianilla <br> ' +
          '  Dirección: Claudio Bernard 111, Doctores, Cuauhtémoc,<br> 06720 Ciudad de México, CDMX '+
          '</p> ' +
        '<br> ' +
        ' </center> '+
        '<br>',
        attachments: [
            {
              filename: "imageattachment.png",
              content: codigo,
              content_id: "myimagecid",
            }
        ]  
    }

    sgMail.send(message)
    .then(respose => console.log('Enviado' ))
    .catch(error => console.log('Error' + error.message))
    res.send({"mensaje": "Se genero correctamente el codigo QR"})
})



app.post('/generarBoleto', async function (req, res) {
    const urlCv = req.body.codigo_acceso;
    const QR = await qrcode.toDataURL(urlCv)
    const htmlContent =  `
        <div style="display: flex; justify-content: center; align-items: center;">
        <h2>Boleto</h2>
        <img src="${QR}">
        </div>
        `;
        const queryCupon = "SELECT * FROM worldlol.usuario u " +
        "inner join worldlol.evento e on e.id = u.id_evento " +
        "inner join worldlol.cupon c on c.id = u.id_cupon " +
        "where u.codigo_acceso =  '"+ req.body.codigo_acceso  + "'";
        await connection.query(queryCupon, async function (error, results, fields) {
            if(results.length > 0) { 
                res.send({"mensaje": "se generaron los boletos ", "code": 200, "data": results, "codigoQR": htmlContent, "base64": QR})
            } else {
                res.send({"mensaje": "No se encuentran los boletos ", "code": 500, "data": []})
            }
        });
    
})

const generarString = (longitud) => {
    let result = "";
    const abc = "a b c d e f g h i j k l m n o p q r s t u v w x y z".split(" "); // Espacios para convertir cara letra a un elemento de un array
    for(i=0;i<=longitud;i++) {
      const random = Math.floor(Math.random() * abc.length);
      result += abc[random]
    }
    return result;
};

const generarUser = () => {
    const minus = "abcdefghijklmnñopqrstuvwxyz";
    const mayus = "ABCDEFGHIJKLMNÑOPQRSTUVWXYZ";
    var contraseña = '';
    for (var i = 1; i <= 8; i++) {
        var eleccion = Math.floor(Math.random() * 3 + 1);
        if (eleccion == 1) {
            var caracter1 = minus.charAt(Math.floor(Math.random() * minus.length));
            contraseña += caracter1;
        } else {
            if (eleccion == 2) {
            var caracter2 = mayus.charAt(Math.floor(Math.random() * mayus.length));
            contraseña += caracter2;
            } else {
            var num = Math.floor(Math.random() * 10);
            contraseña += num;
            }
        }
    }
    return contraseña;
}


var server = app.listen(3000, function () {
   var host = server.address().address
   var port = server.address().port
   console.log("Example app listening at http://%s:%s", host, port)
})