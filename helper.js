var mysql = require('mysql');
var readConfig = require('read-config'),
    config = readConfig('./config.json', { override: true });
var nodemailer      = require('nodemailer');
var mailConfig      = config.mail;
var from            = config.mail.from;
var transporter     = nodemailer.createTransport(mailConfig);
var reqGetPost = require('request');
const crypto = require('crypto');
const algorithm = 'aes-256-cbc';
const key = crypto.randomBytes(32);
const iv = crypto.randomBytes(16);
/*database connection start*/ 

var host = config.environment == "TEST" ? config.dbConfig.development.host : config.dbConfig.production.host;
var user = config.environment == "TEST" ? config.dbConfig.development.user : config.dbConfig.production.user;
var password = config.environment == "TEST" ? config.dbConfig.development.password : config.dbConfig.production.user;
var database = config.environment == "TEST" ? config.dbConfig.development.database : config.dbConfig.production.user;

exports.getConnection = function (callback) {
    var pool = mysql.createPool({
        connectionLimit: 100, //important
        acquireTimeout: 20000,
        host: host,
        user: user,
        password: password,
        database: database,
        debug: false
    });

    pool.getConnection(function (err, connection) {
        callback(err, connection, pool);
    });
};


exports.AWSSendMail = function (toEmail,subject,cc,bcc,templateUrl,bodyParams,fileName,fileContent,callback) {
    let response={};
    var postData = {
        "toEmail": toEmail,
        "subject":subject,
        "cc":cc,
        "bcc":bcc,
        "templateUrl":templateUrl,
        "bodyParams":bodyParams,
        "fileName":fileName,
        "fileContent":fileContent
    };
    var elasticUrl = config.environment == "TEST" ? config.Elastic.sendemail.test : config.Elastic.sendemail.prod;
    
    if (toEmail != undefined && subject != undefined  && templateUrl !=undefined && bodyParams !=undefined) {
        reqGetPost({
            url: elasticUrl,
            method: "POST",
            json: true,   // <--Very important!!!
            body: postData
        }, function (error, response, body) {
            if(error){
                response = { success: false, message: "Error in sending mail" };
                callback(response);
            }else{
                if(body["success"] !=undefined && body["success"]==true){
                    response = { success: true, message: body["success"] };
                    callback(response);
                }else{
                    response = { success: false, message: "Error in sending mail"};
                    callback(response);
                }  
            }
        });
    } else {
        response = { success: false, message: "Invalid body params" };
        callback(response);;
    }
}

//AWS send mail end

//AWS send mobile start(Replace the logic instead of sending otp by mail to send otp from mobile)

exports.SendMobileOTP = function (message,country,mobileNumber,callback) {
	// msg91 (https://msg91.com/)
	let response={};
	
	var SMSGatewayLink = config.environment == "TEST" ? config.externalRESTCalls.sms.test : config.Elastic.sendemail.prod;
	
	SMSGatewayLink = SMSGatewayLink +"?route="+config.smsGatewayParams.route;
	SMSGatewayLink = SMSGatewayLink +"&sender="+config.smsGatewayParams.sender;
	SMSGatewayLink = SMSGatewayLink +"&message="+message;
	SMSGatewayLink = SMSGatewayLink +"&country="+config.smsGatewayParams.countryCode;
	SMSGatewayLink = SMSGatewayLink +"&flash="+config.smsGatewayParams.flash;
	SMSGatewayLink = SMSGatewayLink +"&unicode="+config.smsGatewayParams.unicode;
	SMSGatewayLink = SMSGatewayLink +"&mobiles="+mobileNumber;
	SMSGatewayLink = SMSGatewayLink +"&authkey="+config.smsGatewayParams.authKey;
	
	//console.log("SMSGatewayLink = " + SMSGatewayLink); 
	
	reqGetPost({
        url: SMSGatewayLink,
        method: "GET",
        json: true   // <--Very important!!!
    }, function (error, response, body) {
        if(error){
        	//console.log("error = " + error);
            response = { success: false, message: "Error in sending SMS" };
            callback(response);
        }else{
            response = { success: true, message: body["success"] };
            callback(response); 
        }
    });
}


// Gegister user In Talk js side for chatting purpose.

exports.RegisterChat = function (userId,role,name,email,imageUrl,mobile,callback) {
	// talk js (https://talkjs.com/)
	let res={};
	
	var chatLink = config.talkJs.endPointURL;
	var secretKey = config.talkJs.secretKey;
	
	var emails = [];
	emails.push(email);
	
	var mobileNumber = [];
	mobileNumber.push('+91'+mobile.toString());
	
	var customdata ={};
	customdata.country ="in";
	
	var header = {
			   "Accept" : "application/json",
			   "Content-Type":"application/json",
			   "Authorization":"Bearer "+secretKey
		      }
	var data = {
			"name":name,
			"email":emails,
	        "welcomeMessage":"New user created",
	        "photoUrl":imageUrl,
	        "role":role,
	        "phone":mobileNumber,
	        "custom":customdata
	}
	
	//console.log("data = " + JSON.stringify(data));
	
	
	reqGetPost({
        url: chatLink+userId,
        method: "PUT",
        headers:header,
        json: true,   // <--Very important!!!
        body: data
    }, function (error, response, body) {
        if(error){
        	//console.log('error = ' + error);
        	res = { success: false, message: response };
            callback(res);
        }else{
        	//console.log('success  = ' + JSON.stringify(response) + 'body ' + JSON.stringify(body));
        	res = { success: true, message: response };
            callback(res); 
        }
    });
}


//encryptanddecrypt functions start
exports.encrypt = function (text) {
    var cipherkey = config.cipherKey;
    var cipher = crypto.createCipher('aes-256-cbc',cipherkey);
    var encrypted = cipher.update(text,'utf8','hex');
    encrypted += cipher.final('hex');
    return encrypted.toString('hex');
   }
   
exports.decrypt = function (text) {
    var cipherkey = config.cipherKey;
    var decipher = crypto.createDecipher('aes-256-cbc',cipherkey);
    var decrypted = decipher.update(text,'hex','utf8');
    decrypted += decipher.final('utf8');
    return decrypted.toString();
   }
//encryptanddecrypt functions end