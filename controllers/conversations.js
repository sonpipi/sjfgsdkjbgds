var express = require('express');
var router = express.Router();
var mysql = require('mysql');
var config = require('../config.js');
var bodyParser = require('body-parser');
var escapeSQL = require('sqlstring');
var jwt = require('jsonwebtoken');

// parse application/x-www-form-urlencoded
var urlParser = bodyParser.urlencoded({ extended: false });
// parse application/json
router.use(bodyParser.json());
var async = require('async');


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
//-- FCM
var FCM = require('fcm-push');
var serverKey = config.android;
var collapse_key = 'com.android.abc';
var fcm = new FCM(serverKey);
// 
var apn = require('apn');
var apnService = new apn.Provider({
    cert: "certificates/cert.pem",
    key: "certificates/key.pem",
});

/*********--------------------------*********
 **********------- FUNCTION ------*********
 **********--------------------------*********/

/*********--------NEW CONVERSATION----------*********/
router.post('/new', urlParser, function(req, res) {
    var access_token = req.body.access_token || req.query.access_token || req.headers['x-access-token'] || req.params.access_token;
    var key = req.body.users_key || req.query.users_key || req.params.users_key;
    if (typeof key != 'string') {
        if (isEmpty(key)) {

            return res.sendStatus(300);
        
        }
    }
    BASE.authenticateWithToken(key, access_token, function(logged) {
        if (logged) {
            var userSQL = "SELECT * FROM `conversations` WHERE `key`='" + req.body.key + "'";
            BASE.getObjectWithSQL(userSQL, function(data) {
                if (data) {
                    return res.send(echoResponse(404, 'This conversation already exists', 'success', true));
                } else {
                    
                    var json = req.body.members;
                    delete req.body.access_token;
                    delete req.body.members;

                    var sql = escapeSQL.format("INSERT INTO `conversations` SET ?", req.body);
                    BASE.insertWithSQL(sql, function(status) {
                        if (status) {
                            console.log("Vừa thêm conversation thành công với key " + req.body.key);
                            
                            console.log("start -------------------------------------------------------");
                            var members;
                            if (isJsonString(json)) {
                                members = JSON.parse(json);
                            } else {
                                var stringJson = JSON.stringify(json, null, 2);
                                members = JSON.parse(stringJson);
                            }
                            console.log(members);
                              

                            if (isEmpty(members) == false) {
                                // json = JSON.parse(req.body.members);
                                for (var n = 0; n < members.length; n++) {
                                    console.log(members[n].user_id);
                                    var iMSQL = "INSERT INTO `members`(`users_key`,`conversations_key`)";
                                    var dMSQL = "VALUES ('" + members[n].user_id + "','" + req.body.key + "')";
                                    BASE.insertWithSQL(iMSQL + dMSQL, function(stt) {
                                        console.log("INSERT members SUCCESS");
                                    });
                                }
                                return res.send(echoResponse(200, 'Created conversation successfully.', 'success', false));
                            } else {
                                return res.send(echoResponse(404, 'Members error JSON string.', 'success', false));
                            }
                        } else {
                            return res.send(echoResponse(404, 'Create failed.', 'success', true));
                        }
                    });
                }
            });
        } else {
            return res.send(echoResponse(403, 'Authenticate failed', 'success', false));
        }
    });
});




/*********--------UPDATE CONVERSATION----------*********/
router.post('/update', urlParser, function(req, res) {
    var access_token = req.body.access_token || req.query.access_token || req.headers['x-access-token'] || req.params.access_token;
    var key = req.body.users_key || req.query.users_key || req.params.users_key;
    if (typeof key != 'string') {
        if (isEmpty(key)) {
            return res.sendStatus(300);
        }
    }
    BASE.authenticateWithToken(key, access_token, function(logged) {
        if (logged) {
            delete req.body.access_token;
            delete req.body.users_key;
            var userSQL = "SELECT * FROM `conversations` WHERE `key`='" + req.body.key + "'";
            client.query(userSQL, function(error, data, fields) {
                if (error) {
                    console.log(error);
                    return res.sendStatus(300);
                } else {
                    if (data.length > 0) {
                        if (req.body.members) {
                            return res.send(echoResponse(300, 'Update not need members in conversation.', 'failed', true));
                        }
                        var data = req.body;
                        delete data.access_token;
                        var insertSQL = escapeSQL.format("UPDATE `conversations` SET ? WHERE `key`='" + req.body.key + "'", data);
                        client.query(insertSQL, function(eInsert, dInsert, fInsert) {
                            if (eInsert) {
                                console.log(eInsert);
                                return res.sendStatus(300);
                            } else {
                                //console.log("Update conversation thành công với key " + req.body.key);
                                return res.send(echoResponse(200, 'Updated conversation successfully.', 'success', false));
                            }
                        });
                    } else {
                        return res.send(echoResponse(404, 'This conversation does not exists', 'success', true));
                    }
                }
            });
        } else {
            return res.send(echoResponse(403, 'Authenticate failed', 'success', false));
        }
    });
});



/*********--------UPDATE CONVERSATION----------*********/
router.post('/type=add', urlParser, function(req, res) {
    var access_token = req.body.access_token || req.query.access_token || req.headers['x-access-token'] || req.params.access_token;
    var users_key = req.body.users_key || req.query.users_key || req.params.users_key;
     if (typeof users_key != 'string') {
        if (isEmpty(users_key)) {
            return res.sendStatus(300);
        }
    }

    BASE.authenticateWithToken(users_key, access_token, function(logged) {
        if (logged) {
            delete req.body.access_token;
            var userSQL = "SELECT * FROM `conversations` WHERE `key`='" + req.body.key + "'";
            client.query(userSQL, function(error, data, fields) {
                if (error) {
                    console.log(error);
                    return res.sendStatus(300);
                } else {
                    if (data.length > 0) {
                        if (isJsonString(req.body.members)) {
                            json = JSON.parse(req.body.members);
                            var duplicateUser = [];
                            async.forEachOf(json, function(ele, n, callback) {
                                var checkDuplicate = "SELECT * FROM `members` WHERE `conversations_key`='" + req.body.key + "' AND `users_key`='" + json[n].user_id + "'";
                                client.query(checkDuplicate, function(eDup, dataDup, FDL) {
                                    if (eDup) {
                                        console.log(eDup);
                                        return res.sendStatus(300);
                                    } else {
                                        if (dataDup.length > 0) {
                                            duplicateUser.push(json[n].user_id);
                                            if (n === json.length - 1) {
                                                if (duplicateUser.length > 0) {
                                                    return res.send(echoResponse(200, duplicateUser, 'success', false));
                                                } else {
                                                    return res.send(echoResponse(200, 'Added members successfully.', 'success', false));
                                                }
                                            }
                                        } else {
                                            var insertMember = "INSERT INTO `members`(`users_key`,`conversations_key`)";
                                            var dataMember = "VALUES ('" + json[n].user_id + "','" + req.body.key + "')";
                                            client.query(insertMember + dataMember, function(eMember, rMember, fMember) {
                                                if (eMember) {
                                                    console.log(eMember);
                                                    return res.sendStatus(300);
                                                } else {
                                                    if (n === json.length - 1) {
                                                        if (duplicateUser.length > 0) {
                                                            return res.send(echoResponse(200, duplicateUser, 'success', false));
                                                        } else {
                                                            return res.send(echoResponse(200, 'Added members successfully.', 'success', false));
                                                        }
                                                    }
                                                    console.log("INSERT members SUCCESS");
                                                }
                                            });
                                        }
                                    }
                                });
                            });
                        } else {
                            return res.send(echoResponse(404, 'Members error JSON string.', 'success', false));
                        }
                    } else {
                        return res.send(echoResponse(404, 'This conversation does not exists', 'success', true));
                    }
                }
            });
        } else {
            return res.send(echoResponse(403, 'Authenticate failed', 'success', false));
        }
    });
});



/*********--------UPDATE CONVERSATION----------*********/
router.post('/type=remove', urlParser, function(req, res) {
    var access_token = req.body.access_token || req.query.access_token || req.headers['x-access-token'] || req.params.access_token;
    var users_key = req.body.users_key || req.query.users_key || req.params.users_key;
   if (typeof users_key != 'string') {
        if (isEmpty(users_key)) {
            return res.sendStatus(300);
        }
    }
    BASE.authenticateWithToken(users_key, access_token, function(logged) {
        if (logged) {
            delete req.body.access_token;
            var adminSQL = "SELECT `created_by` FROM `conversations` WHERE `key`='" + req.body.key + "'";
            client.query(adminSQL, function(eAdmin, dataAdmin, fieldAdmin) {
                if (eAdmin) {
                    console.log(eAdmin);
                    return res.sendStatus(300);
                } else {
                    if (dataAdmin.length > 0) {
                        if (dataAdmin[0].created_by === req.body.users_key) {
                            var userSQL = "SELECT * FROM `members` WHERE `users_key`='" + req.body.friend_key + "' AND `conversations_key`='" + req.body.key + "'";
                            client.query(userSQL, function(error, data, fields) {
                                if (error) {
                                    console.log(error);
                                    return res.sendStatus(300);
                                } else {
                                    if (data.length > 0) {
                                        var sqlAddMember = "DELETE FROM `members` WHERE `users_key`='" + req.body.friend_key + "' AND `conversations_key`='" + req.body.key + "'";
                                        client.query(sqlAddMember, function(eInsert, dInsert, fInsert) {
                                            if (eInsert) {
                                                console.log(eInsert);
                                                return res.sendStatus(300);
                                            } else {
                                                console.log("Xóa members cho " + req.body.key);
                                                return res.send(echoResponse(200, 'Removed members successfully.', 'success', false));
                                            }
                                        });
                                    } else {
                                        return res.send(echoResponse(404, 'This conversation does not exists', 'success', true));
                                    }
                                }
                            });
                        } else {
                            return res.send(echoResponse(404, 'You not have permission remove this members.', 'success', true));
                        }
                    } else {
                        return res.send(echoResponse(404, 'This conversation does not exists', 'success', true));
                    }
                }
            });
        } else {
            return res.send(echoResponse(403, 'Authenticate failed', 'success', false));
        }
    });
});



/*********--------LEAVE GROUP CONVERSATION----------*********/
router.post('/type=leave', urlParser, function(req, res) {
    var access_token = req.body.access_token || req.query.access_token || req.headers['x-access-token'] || req.params.access_token;
    var key = req.body.key || req.query.key || req.params.key;
    var users_key = req.body.users_key || req.query.users_key || req.params.users_key;
    if (typeof users_key != 'string') {
        if (isEmpty(users_key)) {
            return res.sendStatus(300);
        }
    }
    BASE.authenticateWithToken(users_key, access_token, function(logged) {
        if (logged) {
            delete req.body.access_token;
            var adminSQL = "SELECT `users_key` FROM `conversations` WHERE `key`='" + req.body.key + "'";
            client.query(adminSQL, function(eAdmin, dataAdmin, fieldAdmin) {
                if (eAdmin) {
                    console.log(eAdmin);
                    return res.sendStatus(300);
                } else {
                    if (dataAdmin.length > 0) {
                        var sqlAddMember = "DELETE FROM `members` WHERE `users_key`='" + req.body.users_key + "' AND `conversations_key`='" + req.body.key + "'";
                        client.query(sqlAddMember);
                        //----
                        var selectUser = "SELECT * FROM `members` WHERE `conversations_key`='" + req.body.key + "'";
                        client.query(selectUser, function(eSelect, dSelect, fSelect) {
                            if (eSelect) {
                                console.log(eSelect);
                                return res.sendStatus(300);
                            } else {
                                if (dSelect.length > 0) {
                                    var updateConver = "UPDATE `conversations` SET `created_by`='" + dSelect[0].users_key + "' WHERE `key`='" + req.body.key + "'";
                                    client.query(updateConver, function(eUp, dUp, fUp) {
                                        if (eUp) {
                                            console.log(eUp);
                                            return res.sendStatus(300);
                                        } else {
                                            return res.send(echoResponse(200, 'Leaved conversation successfully', 'success', false));
                                        }
                                    });
                                } else {
                                    var removeConver = "DELETE FROM `conversation` WHERE `key`='" + req.body.key + "'";
                                    client.query(removeConver);
                                    return res.send(echoResponse(200, 'Leaved conversation successfully', 'success', false));
                                }
                            }
                        });
                    } else {
                        return res.send(echoResponse(404, 'This conversation does not exists', 'success', true));
                    }
                }
            });
        } else {
            return res.send(echoResponse(403, 'Authenticate failed', 'success', false));
        }
    });
});




router.get('/type=countunread', urlParser, function(req, res) {
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
            var userSQL = "SELECT `key` FROM conversations INNER JOIN members ON members.conversations_key = conversations.key AND members.users_key = '" + key + "' AND members.is_deleted='0'";
            client.query(userSQL, function(qError, qData, qFiels) {
                if (qError) {
                    console.log(qError);
                    return res.sendStatus(300);
                } else {
                    if (qData.length > 0) {
                        var conversationUnread = [];
                        async.forEachOf(qData, function(data, i, call) {
                            var sqlSelect = "SELECT `key` FROM conversations INNER JOIN members ON members.conversations_key = conversations.key AND members.users_key = '" + key + "' AND members.is_deleted='0' AND `key` IN (SELECT `conversations_key` FROM `message_status` WHERE `conversations_key`='" + qData[i].key + "' AND `users_key`='" + key + "' AND `status`='0' OR `conversations_key`='" + qData[i].key + "' AND `users_key`='" + key + "' AND `status`='1')";
                            client.query(sqlSelect, function(e, d, f) {
                                if (e) {
                                    console.log(e);
                                    return res.sendStatus(300);
                                } else {
                                    if (d.length > 0) {
                                        conversationUnread.push(qData[i]);
                                    }
                                    if (i === qData.length - 1) {
                                        return res.send(echoResponse(200, conversationUnread.length, 'success', false));
                                    }
                                }
                            });
                        });
                    } else {
                        return res.send(echoResponse(404, 0, 'success', true));
                    }
                }
            });
        } else {
            return res.send(echoResponse(403, 'Authenticate failed', 'success', false));
        }
    });
});





/*********--------SETTINGS CONVERSATION----------*********/
router.post('/settings', urlParser, function(req, res) {
    var access_token = req.body.access_token || req.query.access_token || req.headers['x-access-token'] || req.params.access_token;
    var key = req.body.users_key || req.query.users_key || req.params.users_key;
    if (typeof key != 'string') {
        if (isEmpty(key)) {
            return res.sendStatus(300);
        }
    }
    BASE.authenticateWithToken(key, access_token, function(logged) {
        if (logged) {
            delete req.body.access_token;
            var userSQL = "SELECT * FROM `members` WHERE `users_key`='" + req.body.users_key + "' AND `conversations_key`='" + req.body.conversations_key + "'";
            client.query(userSQL, function(error, data, fields) {
                if (error) {
                    console.log(error);
                    return res.sendStatus(300);
                } else {
                    if (data.length > 0) {
                        var insert = [];
                        for (var k in req.body) {
                            if (k != 'access_token') {
                                insert.push("`" + k + "`=" + "'" + req.body[k] + "'");
                            }
                        }

                        console.log("SQL: " + insert.toString());
                        var dataSQL = "UPDATE `members` SET " + insert.toString() + " WHERE `users_key`='" + req.body.users_key + "' AND `conversations_key`='" + req.body.conversations_key + "'";
                        
                        client.query(dataSQL, function(eInsert, dInsert, fInsert) {
                            if (eInsert) {
                                console.log(eInsert);
                                return res.sendStatus(300);
                            } else {
                                console.log("Update settings conversation thành công với key " + req.body.conversations_key);
                                return res.send(echoResponse(200, 'Updated settings conversation successfully.', 'success', false));
                            }
                        });
                    } else {
                        return res.send(echoResponse(404, 'This conversation does not exists', 'success', true));
                    }
                }
            });
        } else {
            return res.send(echoResponse(403, 'Authenticate failed', 'success', false));
        }
    });
});




router.get('/:conversations_key/users_key=:key', function(req, res) {
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
            var sqlConver = "SELECT * FROM `conversations` WHERE `key`='" + req.params.conversations_key + "'";
            client.query(sqlConver, function(eConver, dConver, fConver) {
                if (eConver) {
                    console.log(eConver);
                    return res.sendStatus(300);
                } else {
                    if (dConver.length > 0) {
                        var sqlUser = "SELECT * FROM `users` WHERE `key` IN (SELECT `users_key` FROM `members` WHERE `conversations_key`='" + req.params.conversations_key + "')";
                        client.query(sqlUser, function(errr, rsss, fiii) {
                            if (errr) {
                                return res.send(echoResponse(300, 'error', JSON.stringify(errr), true));
                            } else {
                                if (rsss.length > 0) {
                                    var dataResponse = dConver[0];
                                    dataResponse.members = rsss;
                                    var sqlMembers = "SELECT * FROM `members` WHERE `conversations_key`='" + req.params.conversations_key + "' AND `users_key`='" + req.params.key + "'";
                                    client.query(sqlMembers, function(e, d, f) {
                                        if (e) {
                                            console.log(e);
                                            return res.sendStatus(300);
                                        } else {
                                            if (d.length > 0) {
                                                getStatusLastMessage(req.params.conversations_key, function(status) {
                                                    getLastMessage(req.params.conversations_key, function(last_message) {
                                                        dataResponse.on_notification = d[0].on_notification;
                                                        dataResponse.is_deleted = d[0].is_deleted;
                                                        dataResponse.conversations_key = d[0].conversations_key;
                                                        dataResponse.lastmessage = last_message;
                                                        dataResponse.status = status;
                                                        return res.send(echoResponse(200, dataResponse, 'success', false));
                                                    });
                                                });

                                            } else {
                                                return res.send(echoResponse(404, 'No members', 'success', true));
                                            }
                                        }
                                    });
                                } else {
                                    return res.send(echoResponse(404, 'No user', 'success', true));
                                }
                            }
                        });
                    } else {
                        return res.send(echoResponse(404, 'This conversation does not exists', 'success', true));
                    }
                }
            });
        } else {
            return res.send(echoResponse(403, 'Authenticate failed', 'success', false));
        }
    });
});




function getLastMessage(conversations_key, status) {
    var getLastMessage = "SELECT * FROM `messages` WHERE `conversations_key`='" + conversations_key + "' AND `key` IS NOT NULL ORDER BY `time_server` DESC LIMIT 1";
    client.query(getLastMessage, function(eMessage, dMessage, FM) {
        if (eMessage) {
            console.log(eMessage);
            status(null);
        } else {
            var message_key;
            if (dMessage.length > 0) {
                status(dMessage[0]);
            } else {
                status(null);
            }
        }
    });
}

function getStatusLastMessage(conversations_key, status) {
    var getLastMessage = "SELECT * FROM `messages` WHERE `conversations_key`='" + conversations_key + "' AND `key` IS NOT NULL ORDER BY `time_server` DESC LIMIT 1";
    client.query(getLastMessage, function(eMessage, dMessage, FM) {
        if (eMessage) {
            console.log(eMessage);
            status([]);
        } else {
            var message_key;
            if (dMessage.length > 0) {
                message_key = dMessage[0].key;
            } else {
                message_key = "nil";
            }
            var statusMessage = "SELECT `status`,`users_key` FROM `message_status` WHERE `messages_key`='" + message_key + "'";
            client.query(statusMessage, function(eStatus, dStatus, FS) {
                if (eStatus) {
                    console.log(eStatus);
                    status([]);
                } else {
                    status(dStatus);
                }
            });
        }
    });
}

/*********--------------------------*********
 **********------ ECHO RESPONSE -----*********
 **********--------------------------*********/

function isEmpty(val) {
    return (val === undefined || val == null || val.length <= 0) ? true : false;
}

function isJsonString(str) {
    try {
        JSON.parse(str);
    } catch (e) {
        return false;
    }
    return true;
}

function echoResponse(status, data, message, error) {
    return JSON.stringify({
        status: status,
        data: data,
        message: message,
        error: error
    });
}
module.exports = router;