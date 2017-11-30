var express = require('express');
var router = express.Router();
var mysql = require('mysql');
var config = require('../config.js');
var bodyParser = require('body-parser');
var escapeSQL = require('sqlstring');
var jwt = require('jsonwebtoken');
var async = require('async');

var _ = require('lodash');

var moment = require('moment-timezone');
// parse application/x-www-form-urlencoded
var urlParser = bodyParser.urlencoded({ extended: false });
// parse application/json
router.use(bodyParser.json());
var apn = require('apn');
var apnService = new apn.Provider({
    cert: "certificates/cert.pem",
    key: "certificates/key.pem",
});
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
//-- FCM
var FCM = require('fcm-push');
var serverKey = config.android;
var collapse_key = 'com.android.abc';
var fcm = new FCM(serverKey);
var avatarApp = "http://i.imgur.com/rt1NU2t.png";

/*********--------------------------*********
 **********------- MYSQL CONNECT ----*********
 **********--------------------------*********/

/*-------------------------------------------------------------------------------------------*/
/*-------------------------------------------------------------------------------------------*/
/*-------------------------------------------------------------------------------------------*/
/*-------------------------------------------------------------------------------------------*/
/*-------------------------------------------------------------------------------------------*/
/*-------------------------------------------------------------------------------------------*/
var Base = require('../base.js');
var BASE = new Base();
var client = BASE.client();
var LocalString = require('../localizable/localizable.js');
var LOCALIZABLE = new LocalString();
/*-------------------------------------------------------------------------------------------*/
/*-------------------------------------------------------------------------------------------*/
/*-------------------------------------------------------------------------------------------*/
/*-------------------------------------------------------------------------------------------*/
/*-------------------------------------------------------------------------------------------*/
/*-------------------------------------------------------------------------------------------*/


/*********--------------------------*********
 **********------- FUNCTION ------*********
 **********--------------------------*********/
router.get('/type=username', urlParser, function(req, res) {
    var username = req.params.username || req.query.username;
    var sql = "SELECT `username`,`key`,`avatar`,`cover`,`email`,`nickname` FROM `users` WHERE `username`='" + username + "'";
    client.query(sql, function(error, data, fields) {
        if (error) {
            console.log(error);
            return res.sendStatus(300);
        } else {
            if (data.length > 0) {
                return res.send(echoResponse(200, data[0], 'success', false));
            } else {
                return res.send(echoResponse(404, "No have any data", 'success', true));
            }
        }
    });
});
router.get('/type=received', urlParser, function(req, res) {
    var access_token = req.body.access_token || req.query.access_token || req.headers['x-access-token'] || req.params.access_token;
    var key = req.body.key || req.query.key || req.params.key;
    if (typeof key != 'string') {
        if (key.length == 0) {
            return res.sendStatus(300);
        }
    }
    BASE.authenticateWithToken(key, access_token, function(logged) {
        if (logged) {
            delete req.body.access_token;
            var page = req.params.page || req.query.page;
            var per_page = req.params.per_page || req.query.per_page;
            var sql = "SELECT `id`,`content`,`time` FROM `questions` WHERE `receiver_deleted`=0 AND `receiver_key`='" + key + "' ORDER BY `time` DESC LIMIT " + parseInt(per_page, 10) + " OFFSET " + parseInt(page, 10) * parseInt(per_page, 10) + "";
            client.query(sql, function(error, data, fields) {
                if (error) {
                    console.log(error);
                    return res.sendStatus(300);
                } else {
                    if (data.length > 0) {
                        return res.send(echoResponse(200, data, 'success', false));
                    } else {
                        return res.send(echoResponse(404, "No have any data", 'success', true));
                    }
                }
            });
        } else {
            return res.send(echoResponse(403, 'Authenticate failed', 'success', false));
        }
    });
});




router.get('/type=sent', urlParser, function(req, res) {
    var access_token = req.body.access_token || req.query.access_token || req.headers['x-access-token'] || req.params.access_token;
    var key = req.body.key || req.query.key || req.params.key;
    if (typeof key != 'string') {
        if (key.length == 0) {
            return res.sendStatus(300);
        }
    }
    BASE.authenticateWithToken(key, access_token, function(logged) {
        if (logged) {
            delete req.body.access_token;
            var page = req.params.page || req.query.page;
            var per_page = req.params.per_page || req.query.per_page;
            var sql = "SELECT * FROM `questions` WHERE `sender_deleted`=0 AND `sender_key`='" + key + "' ORDER BY `time` DESC LIMIT " + parseInt(per_page, 10) + " OFFSET " + parseInt(page, 10) * parseInt(per_page, 10) + "";
            client.query(sql, function(error, data, fields) {
                if (error) {
                    console.log(error);
                    return res.sendStatus(300);
                } else {
                    if (data.length > 0) {
                        var arrayData = [];
                        async.forEachOf(data, function(element, i, callback) {
                            var tmp = element;
                            getUser(element.receiver_key, function(info) {
                                tmp.receiver = info;
                                delete tmp.sender_deleted;
                                delete tmp.receiver_deleted;
                                delete tmp.sender_key;
                                delete tmp.receiver_key;
                                arrayData.push(tmp);
                                if (i == data.length - 1) {
                                    return res.send(echoResponse(200, arrayData, 'success', false));
                                }
                            });
                        });
                    } else {
                        return res.send(echoResponse(404, "No have any data", 'success', true));
                    }
                }
            });
        } else {
            return res.send(echoResponse(403, 'Authenticate failed', 'success', false));
        }
    });
});




router.get('/type=answers', urlParser, function(req, res) {
    // var access_token = req.body.access_token || req.query.access_token || req.headers['x-access-token'] || req.params.access_token;
    // var key = req.body.key || req.query.key || req.params.key;
    // if (key.length == 0) {
    //     return res.sendStatus(300);
    // }
    // BASE.authenticateWithToken(key, access_token, function(logged) {
    //     if (logged) {
    var questions_id = req.params.questions_id || req.query.questions_id;
    var page = req.params.page || req.query.page;
    var per_page = req.params.per_page || req.query.per_page;
    var sql = "SELECT * FROM `answers` WHERE `questions_id`='" + questions_id + "' ORDER BY `time` DESC LIMIT " + parseInt(per_page, 10) + " OFFSET " + parseInt(page, 10) * parseInt(per_page, 10) + "";
    client.query(sql, function(error, data, fields) {
        if (error) {
            console.log(error);
            return res.sendStatus(300);
        } else {
            if (data.length > 0) {
                return res.send(echoResponse(200, data, 'success', false));
            } else {
                return res.send(echoResponse(404, "No have any data", 'success', true));
            }
        }
    });
    //     } else {
    //         return res.send(echoResponse(403, 'Authenticate failed', 'success', false));
    //     }
    // });
});

function getUser(key, callback) {
    client.query("SELECT `key`,`avatar`,`nickname` FROM `users` WHERE `key`='" + key + "'", function(e, d, f) {
        if (e) {
            console.log(e);
            callback(null);
        } else {
            if (d.length > 0) {
                callback(d[0]);
            } else {
                callback(null);
            }
        }
    });
}

router.post('/questions/new', urlParser, function(req, res) {
    var time = new Date().getTime();
    var content = escapeSQL.escape(decodeURIComponent(req.body.content));
    var sender_key = req.body.sender_key;
    var receiver_key = req.body.receiver_key;
    if (!req.body.content || !req.body.receiver_key) {
        return res.sendStatus(300);
    }
    client.query("INSERT INTO `questions` SET `time`=" + time + ", `sender_key`='" + sender_key + "', `receiver_key`='" + receiver_key + "', `content`=" + content + "", function(error, data, fields) {
        if (error) {
            console.log(error);
            return res.sendStatus(300);
        } else {
            client.query("INSERT INTO `answers` SET `content`=" + content + ", `time`=" + time + ", `questions_id`=" + data.insertId + ", `sender_key`='" + sender_key + "'", function(error2, data2, fields2) {
                if (error2) {
                    console.log(error2);
                    return res.sendStatus(300);
                } else {
                    sendNotification(sender_key, receiver_key, req.body.content, "questions", data.insertId);
                    return res.send(echoResponse(200, 'Send successfully', 'success', false));
                }
            });
        }
    });
});


router.post('/questions/delete', urlParser, function(req, res) {
    var access_token = req.body.access_token || req.query.access_token || req.headers['x-access-token'] || req.params.access_token;
    var key = req.body.key || req.query.key || req.params.key;
    if (typeof key != 'string') {
        if (key.length == 0) {
            return res.sendStatus(300);
        }
    }
    BASE.authenticateWithToken(key, access_token, function(logged) {
        if (logged) {
            delete req.body.access_token;
            var id = req.body.id;
            if (!req.body.id || !req.body.key) {
                return res.sendStatus(300);
            }
            client.query("SELECT * FROM `questions` WHERE `id`=" + id + "", function(error, data, fields) {
                if (error) {
                    console.log(error);
                    return res.sendStatus(300);
                } else {
                    if (data.length > 0) {
                        var sql;
                        if (key == data[0].sender_key) {
                            sql = "UPDATE `questions` SET `sender_deleted`=1 WHERE `id`=" + id + "";
                        } else if (key == data[0].receiver_key) {
                            sql = "UPDATE `questions` SET `receiver_deleted`=1 WHERE `id`=" + id + "";
                        }
                        client.query(sql, function(error2, data2, fields2) {
                            if (error2) {
                                console.log(error2);
                                return res.sendStatus(300);
                            } else {
                                client.query("SELECT * FROM `questions` WHERE `id`=" + id + "", function(errorDel, dataDel, fieldsDel) {
                                    if (errorDel) {
                                        console.log(errorDel);
                                        return res.sendStatus(300);
                                    } else {
                                        if (dataDel.length > 0) {
                                            if (dataDel[0].sender_deleted == 1 && dataDel[0].receiver_deleted == 1) {
                                                client.query("DELETE FROM `questions` WHERE `id`=" + id + "", function(error2, data2, fields2) {
                                                    if (error2) {
                                                        console.log(error2);
                                                        return res.sendStatus(300);
                                                    } else {
                                                        return res.send(echoResponse(200, 'Delete successfully', 'success', false));
                                                    }
                                                });
                                            } else {
                                                return res.send(echoResponse(200, 'Delete successfully', 'success', false));
                                            }
                                        } else {
                                            return res.send(echoResponse(404, 'This questions not exists', 'success', true));
                                        }
                                    }
                                });
                            }
                        });
                    } else {
                        return res.send(echoResponse(404, 'This questions not exists', 'success', true));
                    }
                }
            });
        } else {
            return res.send(echoResponse(403, 'Authenticate failed', 'success', false));
        }
    });
});




router.post('/answers/new', urlParser, function(req, res) {
    var access_token = req.body.access_token || req.query.access_token || req.headers['x-access-token'] || req.params.access_token;
    var key = req.body.sender_key || req.query.sender_key || req.params.sender_key;
    if (typeof key != 'string') {
        if (key.length == 0) {
            return res.sendStatus(300);
        }
    }
    BASE.authenticateWithToken(key, access_token, function(logged) {
        if (logged) {
            delete req.body.access_token;
            var time = new Date().getTime();
            var content = escapeSQL.escape(decodeURIComponent(req.body.content));
            var sender_key = req.body.sender_key;
            var questions_id = req.body.questions_id;
            if (!req.body.content || !req.body.sender_key || !req.body.questions_id) {
                return res.sendStatus(300);
            }
            client.query("SELECT * FROM `questions` WHERE `id`=" + questions_id + "", function(error2, data2, fields2) {
                if (error2) {
                    console.log(error2);
                    return res.sendStatus(300);
                } else {
                    if (data2.length > 0) {
                        client.query("INSERT INTO `answers` SET `time`=" + time + ", `sender_key`='" + sender_key + "', `questions_id`=" + questions_id + ", `content`=" + content + "", function(error, data, fields) {
                            if (error) {
                                console.log(error);
                                return res.sendStatus(300);
                            } else {

                                console.log("receiver Notification 1: " + data2[0].receiver_key + " data sen: " + data2[0].sender_key + " senderley : " + sender_key);
                                if (sender_key == data2[0].sender_key) {
                                    client.query("UPDATE `questions` SET `sender_deleted`=0 WHERE `id`=" + questions_id + "");
                                    sendNotification(sender_key, data2[0].receiver_key, req.body.content, "answers", questions_id);
                                    
                                    console.log("receiver Notification 1: " + data2[0].receiver_key);
                                } else if (sender_key == data2[0].receiver_key) {
                                    client.query("UPDATE `questions` SET `receiver_deleted`=0 WHERE `id`=" + questions_id + "");
                                    sendNotification(sender_key, data2[0].sender_key, req.body.content, "answers", questions_id);
                                    
                                     console.log("receiver Notification 2: " + data2[0].sender_key);
                                }
                                return res.send(echoResponse(200, 'Send successfully', 'success', false));
                            }
                        });
                    } else {
                        return res.send(echoResponse(404, 'This questions not exists', 'success', true));
                    }
                }
            });
        } else {
            return res.send(echoResponse(403, 'Authenticate failed', 'success', false));
        }
    });
});


/*********--------------------------*********
 **********------- END ------*********
 **********--------------------------*********/
function sendNotification(sender_key, receiver_key, noidung, kieu, questions_id) {
    var senderSQL = "SELECT `nickname` FROM `users` WHERE `key`='" + sender_key + "'";
    client.query(senderSQL, function(loiNguoiGui, dataNguoiGui, FNG) {
        if (loiNguoiGui) {
            console.log(loiNguoiGui);
        } else {
            numberBadge(receiver_key, function(count) {
                var receiverSQL = "SELECT `device_token`,`device_type` FROM `users` WHERE `key`='" + receiver_key + "'";
                client.query(receiverSQL, function(loiNguoiNhan, dataNguoiNhan, FNN) {
                    if (loiNguoiNhan) {
                        console.log(loiNguoiNhan);
                    } else {
                        if (dataNguoiNhan[0].device_type == 'ios') {
                            //--------APNS
                            var note = new apn.Notification();
                            note.alert = noidung;
                            note.sound = 'default';
                            note.topic = config.ios;
                            note.badge = count;
                            if (questions_id) {
                                note.payload = {
                                    "questions_id": questions_id,
                                    "content": noidung,
                                    "type": kieu
                                };
                            } else {
                                note.payload = {
                                    "sender_id": sender_key,
                                    "content": noidung,
                                    "type": kieu
                                };
                            }

                            apnService.send(note, dataNguoiNhan[0].device_token).then(result => {
                                console.log("ASK iOS Send:", result.sent.length);
                                console.log(JSON.stringify(result));
                            });
                        } else {
                            var message;
                            if (questions_id) {
                                message = {
                                    to: dataNguoiNhan[0].device_token,
                                    collapse_key: collapse_key,
                                    data: {
                                        questions_id: questions_id,
                                        content: noidung,
                                        type: kieu,
                                        title: 'IUDI',
                                        body: noidung
                                    }
                                };
                            } else {
                                message = {
                                    to: dataNguoiNhan[0].device_token,
                                    collapse_key: collapse_key,
                                    data: {
                                        sender_id: sender_key,
                                        content: noidung,
                                        type: kieu,
                                        title: 'IUDI',
                                        body: noidung
                                    }
                                };
                            }

                            //callback style
                            fcm.send(message, function(err, response) {
                                if (err) {
                                    console.log("Something has gone wrong!");
                                } else {
                                    console.log("Successfully sent with response: ", response);
                                }
                            });
                        }
                    }
                });
            });
        }
    });
}

function insertNotificationNoImage(friend_key, nickname, avatar, type, time, users_key, questions_id) {
    var select = "SELECT * FROM `notification_feed` WHERE `friend_key`='" + friend_key + "' AND `users_key`='" + users_key + "' AND `questions_id`='" + questions_id + "' AND `type`='" + type + "'";
    client.query(select, function(eSelect, dSelect, fSelect) {
        if (eSelect) {
            console.log(eSelect);
        } else {
            if (dSelect.length > 0) {
                async.forEachOf(dSelect, function(data, i, callback) {
                    var update = "UPDATE `notification_feed` SET `nickname`='" + nickname + "',`avatar`='" + avatar + "', `time`='" + time + "', `is_seen`='0' WHERE `friend_key`='" + friend_key + "' AND `users_key`='" + users_key + "' AND `questions_id`='" + questions_id + "' AND `type`='" + type + "'";
                    client.query(update, function(e, d, r) {
                        if (e) {
                            console.log(e);
                        } else {
                            console.log("OK Notification");
                        }
                    });
                });
            } else {
                var insert = "INSERT INTO `notification_feed`(`created_by`,`friend_key`,`nickname`,`avatar`,`type`, `time`, `users_key`, `posts_id`)";
                var value = "VALUES('" + friend_key + "','" + friend_key + "','" + nickname + "','" + avatar + "','" + type + "','" + time + "','" + users_key + "','" + posts_id + "')";
                client.query(insert + value, function(e, d, r) {
                    if (e) {
                        console.log(e);
                        return res.sendStatus(300);
                    } else {
                        console.log("INSERT Notification With Type: " + type);
                    }
                });
            }
        }
    });
}

function numberBadge(key, count) {
    var userSQL = "SELECT `key` FROM conversations INNER JOIN members ON members.conversations_key = conversations.key AND members.users_key = '" + key + "' AND members.is_deleted='0'";
    client.query(userSQL, function(qError, qData, qFiels) {
        if (qError) {
            console.log(qError);
            count(0);
        } else {
            if (qData.length > 0) {
                var conversationUnread = [];
                async.forEachOf(qData, function(data, i, call) {
                    var sqlSelect = "SELECT `key` FROM conversations INNER JOIN members ON members.conversations_key = conversations.key AND members.users_key = '" + key + "' AND members.is_deleted='0' AND `key` IN (SELECT `conversations_key` FROM `message_status` WHERE `conversations_key`='" + qData[i].key + "' AND `users_key`='" + key + "' AND `is_read`='0')";
                    client.query(sqlSelect, function(e, d, f) {
                        if (e) {
                            console.log(e);
                            return res.sendStatus(300);
                        } else {
                            if (d.length > 0) {
                                conversationUnread.push(qData[i]);
                            }
                            if (i === qData.length - 1) {
                                var userSQL = "SELECT * FROM `notification_feed` INNER JOIN `notification_refresh` ON `notification_feed`.`users_key` = '" + key + "' AND `notification_feed`.`users_key` = notification_refresh.users_key AND `notification_feed`.`time` > `notification_refresh`.`time`";
                                client.query(userSQL, function(error, data, fields) {
                                    if (error) {
                                        console.log(error);
                                        return res.sendStatus(300);
                                    } else {
                                        if (data.length > 0) {
                                            count(conversationUnread.length + data.length);
                                        } else {
                                            count(conversationUnread.length);
                                        }
                                    }
                                });
                            }
                        }
                    });
                });
            } else {
                count(0);
            }
        }
    });
}

function isJsonString(str) {
    try {
        JSON.parse(str);
    } catch (e) {
        return false;
    }
    return true;
}
/*********--------------------------*********
 **********------ ECHO RESPONSE -----*********
 **********--------------------------*********/
function echoResponse(status, data, message, error) {
    return JSON.stringify({
        status: status,
        data: data,
        message: message,
        error: error
    });
}


module.exports = router;