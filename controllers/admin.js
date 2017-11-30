var express = require('express');
var router = express.Router();
var mysql = require('mysql');
var config = require('../config.js');
var bodyParser = require('body-parser');
var escapeSQL = require('sqlstring');
var jwt = require('jsonwebtoken');
var moment = require('moment-timezone');

var atob = require('atob');
var btoa = require('btoa');

var async = require('async');

//-- APNS
var apn = require('apn');
var apnService = new apn.Provider({
    cert: "certificates/cert.pem",
    key: "certificates/key.pem",
});

var fetchUrl = require("fetch").fetchUrl;
var cheerio = require("cheerio");
var imgur = require('imgur');
imgur.setClientId('7cb30e33649106f');
imgur.setAPIUrl('https://api.imgur.com/3/');

// parse application/x-www-form-urlencoded
var urlParser = bodyParser.urlencoded({ extended: false });
// parse application/json
router.use(bodyParser.json());

/// ----- MAIL
var nodemailer = require('nodemailer');
let transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true, // secure:true for port 465, secure:false for port 587
    auth: {
        user: config.emailAdmin,
        pass: config.passAdmin
    }
});

/*********--------------------------*********
 **********------- MYSQL CONNECT ----*********
 **********--------------------------*********/
var Base = require('../base.js');
var BASE = new Base();
var client = BASE.client();
/*********--------------------------*********
 **********------- FUNCTION ------*********
 **********--------------------------*********/



router.post('/send', urlParser, function(req, res) {
    var email = req.body.email || req.query.email || req.params.email;
    var password = req.body.password || req.query.password || req.params.password;
    var list = req.body.list || req.query.list || req.params.list;
    var title = req.body.title || req.query.title || req.params.title;
    var content = req.body.content || req.query.content || req.params.content;

    var trans = nodemailer.createTransport({
        host: 'smtp.gmail.com',
        port: 465,
        secure: true, // secure:true for port 465, secure:false for port 587
        auth: {
            user: email,
            pass: password
        }
    });

    var list_email = list.split(",");
    if (list_email.length > 0) {
        var arrayTmp = [];
        var totalArray = [];
        async.forEachOf(list_email, function(element, i, callback) {
            arrayTmp.push("<" + element + ">");
            if (i == list_email.length - 1) {
                while (arrayTmp.length) {
                    totalArray.push(arrayTmp.splice(0, 500));
                    console.log(totalArray.length);
                }
            }
        });
        async.forEachOf(totalArray, function(element, i, callback) {
            if (element instanceof Array) {
                var sbj = element.toString();
                var tinnhan = {
                    to: sbj,
                    subject: title,
                    html: content
                };
                console.log(sbj);
                trans.sendMail(tinnhan, (error, info) => {
                    if (error) {
                        console.log(error.message);
                    } else {
                        console.log('Server responded with "%s"', info.response);
                        trans.close();
                    }
                    if (i == list_email.length - 1) {
                        return res.send(echoResponse(200, "OK", "success", false));
                    }
                });
            }
        });
    } else {
        return res.send(echoResponse(404, "No Email", "success", false));
    }
});




/*********--------SIGNIN----------*********/
router.post('/signin', urlParser, function(req, res) {
    var userSQL = "SELECT * FROM `administrator` WHERE `username`='" + req.body.username + "' AND `password`='" + req.body.password + "'";
    client.query(userSQL, function(error, data, fields) {
        if (error) {
            console.log(error);
            return res.sendStatus(300);
        } else {
            if (data.length > 0) {

                var currentTime = moment().tz('Asia/Ho_Chi_Minh').format('YYYY-MM-DD hh:mm:ss');
                var data_key = data[0].id;
                var data_name = data[0].username;
                var data_pass = data[0].password;

                var json = { pass: data_pass, current_time: currentTime, id: data_key, username: data_name };
                var token = jwt.sign(json, config.secretAdmin, { expiresIn: '1h' });

                var dataSQL = "UPDATE `administrator` SET `access_token`='" + token + "' WHERE `username`='" + req.body.username + "' AND `password`='" + req.body.password + "'";
                client.query(dataSQL, function(eUpdate, dUpdate, fUpdate) {
                    if (eUpdate) {
                        console.log(eUpdate);
                        return res.sendStatus(300);
                    } else {
                        var datafull = data;
                        datafull.access_token = token;
                        return res.send(echoResponse(200, datafull, 'success', false));
                    }
                });
            } else {
                return res.send(echoResponse(404, 'This administrator is not exists.', 'success', true));
            }
        }
    });
});


/*********--------GET ALL USER----------*********/
router.get('/type=users', function(req, res) {
    var token = req.body.access_token || req.query.access_token || req.headers['x-access-token'] || req.params.access_token;
    if (token) {
        jwt.verify(token, config.secretAdmin, function(err, decoded) {
            if (err) {
                return res.json({ success: false, message: 'Failed to authenticate token.' });
            } else {
                ///-----Check nếu tồn tại access_token thì chạy xuống dưới
                var userSQL = "SELECT `facebook_id` FROM `users` WHERE `facebook_point`='-1' AND `facebook_id` IS NOT NULL";
                //var dk4 = " AND `facebook_id` NOT IN (SELECT `facebook_id` FROM `facebook_bot`)";
                // var limit = "LIMIT 10";
                client.query(userSQL, function(error, data, fields) {
                    if (error) {
                        console.log(error);
                        return res.sendStatus(300);
                    } else {
                        if (data.length > 0) {
                            // var n = getRandomInt(0,100);
                            // var nameBot = "BOT"+n;
                            // async.forEachOf(data, function(element, i, callback){
                            //     client.query("INSERT INTO `facebook_bot`(`name`,`facebook_id`) VALUES ('"+nameBot+"','"+data[i].facebook_id+"')");
                            //     if (i === data.length-1) {
                            return res.send(echoResponse(200, data, "success", false));
                            // }
                            // });
                        } else {
                            return res.send(echoResponse(404, 'No user.', 'success', true));
                        }
                    }
                });
                //---- Kết thúc đoạn xử lý data
            }
        });
    } else {
        return res.send(echoResponse(403, 'Authenticate: No token provided.', 'success', true));
    }
});

/*********--------------------------*********
 **********------ ECHO RESPONSE -----*********
 **********--------------------------*********/
function getRandomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function isBase64(str) {
    try {
        return btoa(atob(str)) == str;
    } catch (err) {
        return false;
    }
}

function echoResponse(status, data, message, error) {
    return JSON.stringify({
        status: status,
        data: data,
        message: message,
        error: error
    });
}

function echo5Response(status, data, other, message, error) {
    return JSON.stringify({
        status: status,
        data: data,
        other: other,
        message: message,
        error: error
    });
}

module.exports = router;