var helper = require('../helper');
var readConfig = require('read-config'),
    config = readConfig('./config.json', { override: true });
var saltRounds = config.saltRounds;
var generator = require('generate-password');
var bcrypt = require('bcryptjs');
var reqGetPost = require('request');
const jwt = require('jsonwebtoken');
var paymentService = require( '../Service/PaymentService.js');
var loginURL = config.environment == "TEST" ? config.urls.development.loginURL : config.urls.production.loginURL;


exports.RegisterUser = function (email,password,base64ImageContent,userParams,verificationURL,callback) {
		
    let response = {};
    try{
        //check already email exists and get register template url
        let checkUserQuery ="SELECT t1.emailExists,t2.mobileExists,t3.templateURL,t4.templateURL AS mobileotpURL FROM (SELECT EXISTS(SELECT id FROM user WHERE email= ?) emailExists) t1, " +
        " (SELECT EXISTS(SELECT id FROM user WHERE mobileNumber= ?) mobileExists) t2, " + 
        " (SELECT templateURL FROM emailTemplate WHERE id=1) t3, " + 
        " (SELECT templateURL FROM emailTemplate WHERE id=10) t4";
        if(email !=undefined){
            helper.getConnection(function (fail, connection, pool) {
                if (!fail) {
                    connection.query(checkUserQuery, [email,userParams.mobileNumber],  function (error, results) {
                        if (!error) { 
                            var userDetails = results[0];
                            var emailExists = userDetails.emailExists;
                            var mobileExists = userDetails.mobileExists;
                            var existsMessage = "";
                            var mobileotpURL  = userDetails.mobileotpURL;
                            if(emailExists == 1){existsMessage = "email already exists. Kindly register with other valid mail id"};
                            if(mobileExists == 1){existsMessage = "mobile number already exists. Kindly register with other valid mobile Number"};
                            if(emailExists == 1 && mobileExists == 1){existsMessage = "email and mobile number already exists. Kindly register with other valid email and mobile Number"};
                            var templateUrl = userDetails.templateURL;
                            if(emailExists == 0 && mobileExists == 0){
                                bcrypt.hash(password, saltRounds, function (err, hash) {
                                    encryptedPassword = hash;
                                    userParams.password= encryptedPassword;
                                   
                                    //email body params start
                                    var subject ="Welcome to Sugam Vyappar";
                                    var cc = "";
                                    var bcc = "";
                                    var emailbody=[{
                                        toName: userParams.firstName +" "+userParams.lastName,
                                        verificationURL:verificationURL
                                    }];
                                    var fileName ="";
                                    var fileContent="";
                                    //email body params end

                                     //email body params for otp start
                                    var otpsubject ="Welcome to Sugam Vyappar";
                                    var otpemailbody=[{
                                        toName: userParams.firstName +" "+userParams.lastName,
                                        otp:userParams.mobileOtp
                                    }];

                                     //email body params for otp end

                                    
                                    connection.query(" INSERT INTO user SET ?", userParams,  function (err, result) {
                                        if (!err) {  
                                            var lastInsertedId = result.insertId;
                                            connection.release();
                                            pool.end();
                                             
                                            helper.AWSSendMail(email, subject, cc, bcc, templateUrl,emailbody,fileName,fileContent,function(callbackMail){
                                                if(callbackMail.success==true)
                                                {
                                                    //helper.SendMobileOTP(email, otpsubject, "", "", mobileotpURL,otpemailbody,"","",function(callbackMobileOtp){
                                                	var message = "Dear " + userParams.firstName +" "+userParams.lastName +", Thanks for registering with Sugam Vyappar, "+
                                                	              "Please login with the given OTP " +userParams.mobileOtp ;
                                                	helper.SendMobileOTP(message, "", userParams.mobileNumber,function(callbackMobileOtp){
                                                    if(callbackMobileOtp.success==true)
                                                    {
                                                        response = { success: true, message: 'Registered successfully. Kindly check the registered mail/mobile for credentials.' };
                                                        if(base64ImageContent!=""){
                                                            UploadFilesFunc("P",lastInsertedId,base64ImageContent,"",function(callbackUpload){
                                                                if(callbackUpload.success==true)
                                                                {
                                                                	helper.RegisterChat(lastInsertedId,'user',userParams.firstName + " "+userParams.lastName,userParams.email,callbackUpload.url,userParams.mobileNumber,function(callbackRegisterChat){
                                                                        if(callbackRegisterChat.success==true && callbackRegisterChat.message.statusCode == 200)
                                                                        {
                                                                            callback(response);
                                                                        }
                                                                        else{
                                                                            console.log('Error creating talk js account for user = ' + lastInsertedId);
                                                                            callback(response);
                                                                        }
                                                                    });
                                                                }
                                                                else{
                                                                    response = { success: false, message: callback.message }; 
                                                                    callback(response);
                                                                }
                                                            });
                                                        }else{
                                                            callback(response);
                                                        }    
                                                    }
                                                    else{
                                                        response = { success: false, message: 'Error in sending mobile otp' };
                                                        callback(response);
                                                    }
                                                });
                                                        
                                                }else{
                                                    response = { success: false, message: 'Error in sending mail' };
                                                    callback(response);
                                                }
                                            }); 

                                        } else {
                                            response = { success: false, message: 'Error in connection' };
                                            connection.release();
                                            pool.end();
                                            callback(response);
                                        }
                                    });  
                                });
                            }else{
                                response = { success: false, message: existsMessage };
                                connection.release();
                                pool.end();
                                callback(response);
                            }
                            
                        } else {
                            response = { success: false, message: 'Invalid body params' };
                            connection.release();
                            pool.end();
                            callback(response);
                        }
                    }); 
                    
                }else{
                    response = { success: false, message: "Error in connection." };
                    callback(response);
                }
            });
        }else{
            response = { success: false, message: "Invalid body params." };
            callback(response);
        }
    }catch(e){
        response = { success: false, message: "Invalid body params." };
        callback(response);
    }  
}

exports.RegisterProvider = function (email,password,base64ImageContent,documentName,base64DocumentContent,userParams,providerParams,services,verificationURL,callback) {
    let response = {};
    try{
        //check already email exists and get register template url
        let checkUserQuery ="SELECT t1.emailExists,t2.mobileExists,t3.templateURL,t4.name AS adminName,t4.email AS adminEmail,t5.templateURL AS templateUrlAdmin, t6.primaryIdType,t7.secondaryIdType,t8.qualification, t9.templateURL AS mobileotpURL" +
        " FROM (SELECT EXISTS(SELECT id FROM user WHERE email= ?) emailExists) t1, " +
        " (SELECT EXISTS(SELECT id FROM user WHERE mobileNumber= ?) mobileExists) t2, " +
        " (SELECT templateURL FROM emailTemplate WHERE id=4) t3, " +
        " ( SELECT 'Admin' AS NAME ,GROUP_CONCAT(email) AS email FROM `user` WHERE role = 2 GROUP BY role) t4," +
        " (SELECT templateURL FROM emailTemplate WHERE id=7) t5," +
        " (SELECT COUNT(id) ,IFNULL(name,'') AS primaryIdType FROM  identity WHERE id = ?) t6," +
        " (SELECT COUNT(id),IFNULL(name,'') AS secondaryIdType FROM  identity WHERE id = ?) t7," +
        " (SELECT COUNT(id),IFNULL(name,'') AS qualification FROM  qualification WHERE id = ?) t8, " +
        " (SELECT templateURL FROM emailTemplate WHERE id=10) t9";

        if(email !=undefined){
            helper.getConnection(function (fail, connection, pool) {
                if (!fail) {   
                    connection.beginTransaction(function(tranerror){
                        if (tranerror) { 
                            response = { success: false, message: "Error in connection" };
                            callback(response);
                        }else{
                            connection.query(checkUserQuery, [email,userParams.mobileNumber,providerParams.primaryIdentity,providerParams.secondaryIdentity,providerParams.qualificationId],  function (error, results) {
                                if (!error) { 
                                    var userDetails = results[0];
                                    var emailExists = userDetails.emailExists;
                                    var mobileExists = userDetails.mobileExists;
                                    var templateUrl = userDetails.templateURL;
                                    var adminName =userDetails.adminName;
                                    var adminEmail =userDetails.adminEmail;
                                    var templateUrlAdmin = userDetails.templateUrlAdmin;
                                    var primaryIdType = userDetails.primaryIdType;
                                    var secondaryIdType = userDetails.secondaryIdType;
                                    var qualification = userDetails.qualification;
                                    var mobileotpURL = userDetails.mobileotpURL;
                                    var existsMessage = "";
                                    if(emailExists == 1){existsMessage = " Email already exists. Kindly register with other mail id"};
                                    if(mobileExists == 1){existsMessage = " mobile number already exists. Kindly register with other mobile Number"};
                                    if(emailExists == 1 && mobileExists == 1){existsMessage = " Email and mobile number already exists. Kindly register with other email and mobile Number"};
                                    if(emailExists == 0 && mobileExists == 0){
                                        bcrypt.hash(password, saltRounds, function (err, hash) {
                                            encryptedPassword = hash;
                                            userParams.password= encryptedPassword;
                                            
        
                                            // provider email body params start
                                            var subject ="Welcome to Sugam Vyappar";
                                            var cc = "";
                                            var bcc = "";
                                            var emailbody=[{
                                                toName: userParams.firstName +" "+userParams.lastName,
                                                verificationURL:verificationURL
                                            }];
                                            var fileName ="";
                                            var fileContent="";
                                            //provider email body params end
        
                                            // Admin email body params start
                                            var subjectAdmin ="Provider Details";
                                            var emailbodyAdmin=[{
                                                toName: adminName,
                                                providerName: userParams.firstName +" "+userParams.lastName,
                                                providerEmail: userParams.email,
                                                providerMobileNumber: userParams.mobileNumber,
                                                primaryId: primaryIdType +" - "+ providerParams.primaryIdentityValue,
                                                secondaryId: secondaryIdType +" - "+ providerParams.secondaryIdentityValue,
                                                qualification: qualification,
                                                workExp: providerParams.experience +" years",
                                                loginURL: loginURL
                                            }];
                                            var fileNameAdmin =documentName;
                                            var fileContentAdmin=base64DocumentContent;
                                            //Admin email body params end
                                            
                                            //email body params for otp start
                                            var otpsubject ="Welcome to Sugam Vyappar";
                                            var otpemailbody=[{
                                                toName: userParams.firstName +" "+userParams.lastName,
                                                otp:userParams.mobileOtp
                                            }];

                                            //email body params for otp end

                                            connection.query("INSERT INTO user SET ?", userParams,  function (err, result) {
                                                if (!err) { 
                                                    var lastInsertedId = result.insertId;
                                                    providerParams.provider = lastInsertedId;
                                                    connection.query("INSERT INTO provider SET ?", providerParams,  function (err1, result1) {
                                                        if (!err1) { 
                                                            var servicesArr = [];
                                                            var auditCombinedRecords=[];
                                                            services.forEach(function(item){
                                                                servicesArr.push("(" + lastInsertedId + ", " + item + ", 0, 1)");
                                                                auditCombinedRecords.push("{providerId:" + lastInsertedId + ", serviceId:" + item + ", price:0, status:1}");
                                                            });
                                                            var serviceInsertQuery = "INSERT INTO providerService(providerId, serviceId, price, status) VALUES " + servicesArr + "";
                                                            connection.query(serviceInsertQuery, function (serror, sresult) { 
                                                                if(!serror){
                                                                    var auditMessage = " services added by the provider when registering "+JSON.stringify(auditCombinedRecords)+"";
                                                                    let auditQuery = " INSERT INTO audit(userId,message)VALUES(?,?)" ;
                                                                    connection.query(auditQuery,[lastInsertedId,auditMessage], function (aerror, aresult) { 
                                                                        if(!aerror){ 
                                                                            connection.commit(function (commiterror) {
                                                                                if (commiterror) { 
                                                                                    connection.rollback(function () {
                                                                                        response = { success: true, message: ' Error in connection' };
                                                                                        connection.release();
                                                                                        pool.end();
                                                                                        callback(response);
                                                                                    });
                                                                                }
                                                                                connection.release();
                                                                                pool.end();
                                                                                helper.AWSSendMail(email, subject, cc, bcc, templateUrl,emailbody,fileName,fileContent,function(callbackProviderMail){
                                                                                    if(callbackProviderMail.success==true)
                                                                                    {
                                                                                    	var message = "Welcome to Sugam Vyappar please use this otp for validate your mobile number " +userParams.mobileOtp;
                                                                                   	    helper.SendMobileOTP(message, "", userParams.mobileNumber,function(callbackMobileOtp){
                                                                                        //helper.SendMobileOTP(email, otpsubject, "", "", mobileotpURL,otpemailbody,"","",function(callbackMobileOtp){
                                                                                            if(callbackMobileOtp.success==true)
                                                                                            {
                                                                                                helper.AWSSendMail(adminEmail, subjectAdmin, "", "", templateUrlAdmin,emailbodyAdmin,fileNameAdmin,fileContentAdmin,function(callbackAdminMail){
                                                                                                    if(callbackAdminMail.success ==true){
                                                                                                        response = { success: true, message: 'Registered successfully. Kindly check the registered mail for instructions.' };
                                                                                                        UploadFilesFunc("D",lastInsertedId,base64DocumentContent,documentName,function(callbackDocument){
                                                                                                            if(callbackDocument.success==true)
                                                                                                            {
                                                                                                                if(base64ImageContent !=""){
                                                                                                                    UploadFilesFunc("P",lastInsertedId,base64ImageContent,"",function(callbackProfile){
                                                                                                                        if(callbackProfile.success==true)
                                                                                                                        {
                                                                                                                        	helper.RegisterChat(lastInsertedId,'provider',userParams.firstName + " "+userParams.lastName,userParams.email,callbackProfile.url,userParams.mobileNumber,function(callbackRegisterChat){
                                                                                                                                if(callbackRegisterChat.success==true && callbackRegisterChat.message.statusCode == 200)
                                                                                                                                {
                                                                                                                                    callback(response);
                                                                                                                                }
                                                                                                                                else{
                                                                                                                                    console.log('Error creating talk js account for user = ' + lastInsertedId);
                                                                                                                                    callback(response);
                                                                                                                                }
                                                                                                                            });
                                                                                                                        }
                                                                                                                        else{
                                                                                                                            response = { success: false, message: callback.message };
                                                                                                                            callback(response);
                                                                                                                        }
                                                                                                                    }); 
                                                                                                                }else{
                                                                                                                    callback(response);
                                                                                                                }
                                                                                                                
                                                                                                            }
                                                                                                            else{
                                                                                                                response = { success: false, message: callback.message }; 
                                                                                                                callback(response);
                                                                                                            }
                                                                                                        });
                                                                                                    }else{
                                                                                                        response = { success: false, message: 'Error in sending mail' };
                                                                                                        callback(response);
                                                                                                    }
                                                                                                });
                                                                                            }
                                                                                            else{
                                                                                                response = { success: false, message: 'Error in sending mobile otp' };
                                                                                                callback(response);
                                                                                            }
                                                                                        });
                                                                                        
                                                                                        
                                                                                    }else{
                                                                                        response = { success: false, message: 'Error in sending mail' };
                                                                                        callback(response);
                                                                                    }
                                                                                }); 
                                                                              
                                                                            });
                                                                        }else{
                                                                            response = { success: false, message: 'Error in connection' };
                                                                            connection.release();
                                                                            pool.end();
                                                                            callback(response);
                                                                        }
                                                                    });
                                                                    
                                                                    
                                                                }else{
                                                                    response = { success: false, message: 'Error in connection'};
                                                                    connection.release();
                                                                    pool.end();
                                                                    callback(response);
                                                                }
                                                            });
                                                            
                                                        }else{
                                                            response = { success: false, message: 'Error in connection' };
                                                            connection.release();
                                                            pool.end();
                                                            callback(response);
                                                        }
                                                    });
    
                                                } else {
                                                    response = { success: false, message: 'Error in connection' };
                                                    connection.release();
                                                    pool.end();
                                                    callback(response);
                                                }
                                            });  
                                        });
                                    }else{
                                        response = { success: false, message: existsMessage };
                                        connection.release();
                                        pool.end();
                                        callback(response);
                                    }
                                    
                                } else {
                                	console.log(error);
                                    response = { success: false, message: 'Invalid body params' };
                                    connection.release();
                                    pool.end();
                                    callback(response);
                                }
                            });
                        }
                    });
                    
                }else{
                	console.log(fail);
                    response = { success: false, message: "Error in connection." };
                    callback(response);
                }
            });
        }else{
            response = { success: false, message: "Invalid body params." };
            callback(response);
        }
    }catch(e){
        response = { success: false, message: "Invalid body params." };
        callback(response);
    }
}

exports.RegisterOrganization = function (email,password,base64ImageContent,userParams,organizationParams,services,verificationURL,callback) {
    let response = {};
    try{
        //check already email exists and get register template url
    	
        let checkUserQuery ="SELECT t1.emailExists,t2.mobileExists,t3.templateURL,t4.name AS adminName,t4.email AS adminEmail,t5.templateURL AS templateUrlAdmin, t6.primaryIdType,t7.secondaryIdType,t8.templateURL AS mobileotpURL " +
        " FROM (SELECT EXISTS(SELECT id FROM user WHERE email= ?) emailExists) t1, " +
        " (SELECT EXISTS(SELECT id FROM user WHERE mobileNumber= ?) mobileExists) t2, " +
        " (SELECT templateURL FROM emailTemplate WHERE id=6) t3, " +
        " (SELECT 'Admin' AS NAME ,GROUP_CONCAT(email) as email FROM `user` WHERE role = 2 GROUP BY role) t4," +
        " (SELECT templateURL FROM emailTemplate WHERE id=8) t5," +
        " (SELECT COUNT(id) ,IFNULL(name,'') AS primaryIdType FROM  identity WHERE id = ?) t6," +
        " (SELECT COUNT(id),IFNULL(name,'') AS secondaryIdType FROM  identity WHERE id = ?) t7," +
        " (SELECT templateURL FROM emailTemplate WHERE name='verifymobileotp') t8";
        

        if(email !=undefined){
            helper.getConnection(function (fail, connection, pool) {
                if (!fail) {   
                    connection.beginTransaction(function(tranerror){
                        if (tranerror) { 
                            response = { success: false, message: "Error in connection." };
                            callback(response);
                        }else{
                            connection.query(checkUserQuery, [email,userParams.mobileNumber,organizationParams.primaryIdentity,organizationParams.secondaryIdentity],  function (error, results) {
                                if (!error) { 
                                    var userDetails = results[0];
                                    var emailExists = userDetails.emailExists;
                                    var mobileExists = userDetails.mobileExists;
                                    var templateUrl = userDetails.templateURL;
                                    var adminName =userDetails.adminName;
                                    var adminEmail =userDetails.adminEmail;
                                    var templateUrlAdmin = userDetails.templateUrlAdmin;
                                    var primaryIdType = userDetails.primaryIdType;
                                    var secondaryIdType = userDetails.secondaryIdType;
                                    var mobileotpURL = userDetails.mobileotpURL;
                                    var existsMessage = "";
                                    if(emailExists == 1){existsMessage = " Email already exists. Kindly register with other mail id"};
                                    if(mobileExists == 1){existsMessage = " mobile number already exists. Kindly register with other mobile Number"};
                                    if(emailExists == 1 && mobileExists == 1){existsMessage = " Email and mobile number already exists. Kindly register with other email and mobile Number"};
                                    if(emailExists == 0 && mobileExists == 0){
                                        bcrypt.hash(password, saltRounds, function (err, hash) {
                                            encryptedPassword = hash;
                                            userParams.password= encryptedPassword;
                                            
        
                                            //organization email body params start
                                            var subject ="Welcome to Sugam Vyappar";
                                            var cc = "";
                                            var bcc = "";
                                            var emailbody=[{
                                                toName: userParams.firstName,
                                                verificationURL:verificationURL
                                            }];
                                            var fileName ="";
                                            var fileContent="";
                                            //organization email body params end
        
                                            // Admin email body params start
                                            var subjectAdmin ="Organization Details";
                                            var emailbodyAdmin=[{
                                                toName: adminName,
                                                organizationName: userParams.firstName,
                                                organizationEmail: userParams.email,
                                                organizationPhoneNumber: userParams.mobileNumber,
                                                communicator:organizationParams.communicator,
                                                communicatorPhoneNumber:organizationParams.communicatorPhoneNumber,
                                                primaryId: primaryIdType +" - "+ organizationParams.primaryIdentityValue,
                                                secondaryId: secondaryIdType +" - "+ organizationParams.secondaryIdentityValue,
                                                startedYear: organizationParams.startedYear,
                                                totalMembers: organizationParams.totalMembers,
                                                loginURL: loginURL
                                            }];
                                            //Admin email body params end

                                             //email body params for otp start
                                            var otpsubject ="Welcome to Sugam Vyappar";
                                            var otpemailbody=[{
                                                toName: userParams.firstName +" "+userParams.lastName,
                                                otp:userParams.mobileOtp
                                            }];
                                              //email body params for otp stop

                                            connection.query(" INSERT INTO user SET ?", userParams,  function (err, result) {
                                                if (!err) { 
                                                    var lastInsertedId = result.insertId;
                                                    organizationParams.organizationId = lastInsertedId;
                                                    connection.query(" INSERT INTO organization SET ?", organizationParams,  function (err1, result1) {
                                                        if (!err1) { 
                                                            var servicesArr = [];
                                                            var auditCombinedRecords=[];
                                                            services.forEach(function(item){
                                                                servicesArr.push("(" + lastInsertedId + ", " + item + ", 0, 1)");
                                                                auditCombinedRecords.push("{providerId:" + lastInsertedId + ", serviceId:" + item + ", price:0, status:1}");
                                                            });
                                                            var serviceInsertQuery = "INSERT INTO providerService(providerId, serviceId, price, status) VALUES " + servicesArr + "";
                                                            connection.query(serviceInsertQuery, function (serror, sresult) { 
                                                                if(!serror){
                                                                    var auditMessage = " services added by the organization when registering "+JSON.stringify(auditCombinedRecords)+"";
                                                                    let auditQuery = " INSERT INTO audit(userId,message)VALUES(?,?)" ;
                                                                    connection.query(auditQuery,[lastInsertedId, auditMessage], function (aerror, aresult) { 
                                                                        if(!aerror){
                                                                            connection.commit(function (commiterror) {
                                                                                if (commiterror) { 
                                                                                    connection.rollback(function () {
                                                                                        response = { success: true, message: ' Error in connection' };
                                                                                        connection.release();
                                                                                        pool.end();
                                                                                        callback(response);
                                                                                    });
                                                                                }
                                                                                connection.release();
                                                                                pool.end();
                                                                                helper.AWSSendMail(email, subject, cc, bcc, templateUrl,emailbody,fileName,fileContent,function(callbackOrgMail){
                                                                                    if(callbackOrgMail.success==true)
                                                                                    {
                                                                                    	//var message = "Thanks for Registring Sugam vyappar,Please user the below code to very your mobile number "+userParams.mobileOtp ;
                                                                                    	var message = "Thanks for Registring,User the below code to very your mobile number "+userParams.mobileOtp ;
                                                                                   	    helper.SendMobileOTP(message, "", userParams.mobileNumber,function(callbackMobileOtp){
                                                                                       // helper.SendMobileOTP(email, otpsubject, "", "", mobileotpURL,otpemailbody,"","",function(callbackMobileOtp){
                                                                                            if(callbackMobileOtp.success==true)
                                                                                            {
                                                                                                helper.AWSSendMail(adminEmail, subjectAdmin, "", "", templateUrlAdmin,emailbodyAdmin,"","",function(callbackAdminMail){
                                                                                                    if(callbackAdminMail.success==true){
                                                                                                        response = { success: true, message: ' Registered successfully. Kindly check the registered mail for instructions.' };
                                                                                                        if(base64ImageContent!=""){
                                                                                                            UploadFilesFunc("P",lastInsertedId,base64ImageContent,"",function(callbackProfile){
                                                                                                                if(callbackProfile.success==true)
                                                                                                                {
                                                                                                                	helper.RegisterChat(lastInsertedId,'provider',userParams.firstName + " "+userParams.lastName,userParams.email,callbackProfile.url,userParams.mobileNumber,function(callbackRegisterChat){
                                                                                                                        if(callbackRegisterChat.success==true && callbackRegisterChat.message.statusCode == 200)
                                                                                                                        {
                                                                                                                            callback(response);
                                                                                                                        }
                                                                                                                        else{
                                                                                                                            console.log('Error creating talk js account for user = ' + lastInsertedId);
                                                                                                                            callback(response);
                                                                                                                        }
                                                                                                                    });
                                                                                                                }
                                                                                                                else{
                                                                                                                    response = { success: false, message: callback.message };
                                                                                                                    callback(response);
                                                                                                                }
                                                                                                            }); 
                                                                                                        }else{
                                                                                                            callback(response);
                                                                                                        } 
                                                                                                    }else{
                                                                                                        response = { success: false, message: 'Error in sending mail' };
                                                                                                        callback(response);
                                                                                                    }
                                                                                                });      
                                                                                            }
                                                                                            else{
                                                                                                response = { success: false, message: 'Error in sending mobile otp' };
                                                                                                callback(response);
                                                                                            }
                                                                                        });
                                                                                                                                                               
                                                                                    }else{
                                                                                        response = { success: false, message: 'Error in sending mail' };
                                                                                        callback(response);
                                                                                    }
                                                                                }); 
                                                                                
                                                                            });
                                                                        }else{
                                                                            response = { success: false, message: 'Error in connection' };
                                                                            connection.release();
                                                                            pool.end();
                                                                            callback(response);
                                                                        }
                                                                    });
                                                                    
                                                                    
                                                                }else{
                                                                    response = { success: false, message: 'Error in connection' };
                                                                    connection.release();
                                                                    pool.end();
                                                                    callback(response);
                                                                }
                                                            });
                                                            
                                                        }else{
                                                            response = { success: false, message: 'Error in connection' };
                                                            connection.release();
                                                            pool.end();
                                                            callback(response);
                                                        }
                                                    });
    
                                                } else {
                                                    response = { success: false, message: 'Error in connection' };
                                                    connection.release();
                                                    pool.end();
                                                    callback(response);
                                                }
                                            });  
                                        });
                                    }else{
                                        response = { success: false, message: existsMessage };
                                        connection.release();
                                        pool.end();
                                        callback(response);
                                    }
                                    
                                } else {
                                    response = { success: false, message: 'Invalid body params' };
                                    connection.release();
                                    pool.end();
                                    callback(response);
                                }
                            });
                        }
                    });
                    
                }else{
                    response = { success: false, message: "Error in connection." };
                    callback(response);
                }
            });
        }else{
            response = { success: false, message: "Invalid body params." };
            callback(response);
        }
    }catch(e){
        response = { success: false, message: "Invalid body params." };
        callback(response);
    }
}

exports.ValidateProvider = function (providerId,callback) {
    let response = {};

    var userId = providerId;
    var password = generator.generate( {
        length: 6,
        numbers: true,
        exclude:'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ',
        excludeSimilarCharacters:true,
    });

    try{
        //check user exists and get register template url
        let checkUserQuery ="SELECT t1.email,t1.role,t1.fullName,t2.templateURL FROM (SELECT email,role,CONCAT(firstName,lastName) AS fullName FROM user WHERE id= ?)  t1, " +
        " (SELECT templateURL FROM emailTemplate WHERE id=5) t2";
        
        helper.getConnection(function (fail, connection, pool) {
            if (!fail) {
                connection.query(checkUserQuery, [userId],  function (error, results) {
                    if (!error) { 
                        var userDetails = results[0];
                        var userExist = userDetails.id;
                        var email = userDetails.email;
                        var role = userDetails.role;
                        var fullName = userDetails.fullName;
                        var templateUrl = userDetails.templateURL;
                        if(userDetails != undefined){
                            bcrypt.hash(password, saltRounds, function (err, hash) {
                                var encryptedPassword = hash;
                                
                                //email body params start
                                var subject ="Verified your profile by Admin";
                                var cc = "";
                                var bcc = "";
                                var emailbody=[{
                                    toName: fullName
  
                                }];
                                var fileName ="";
                                var fileContent="";
                                //email body params end

                                if (role != undefined && (role==3 || role==5)&& userId !=undefined && encryptedPassword !=undefined) { 
                                    connection.query(" UPDATE user SET password =?,status=2,modifiedDate=NOW() where id=?", [encryptedPassword,userId],  function (err, result) {
                                        if (!err) { 
                                            helper.AWSSendMail(email, subject, cc, bcc, templateUrl,emailbody,fileName,fileContent,function(callbackMail){
                                                if(callbackMail.success==true)
                                                {
                                                    response = { success: true, message: ' Verified by Admin successfully. Kindly check the registered mail for credentials.' };
                                                    connection.release();
                                                    pool.end();
                                                    callback(response);
                                                    
                                                }else{
                                                    response = { success: false, message: 'Error in sending mail' };
                                                    connection.release();
                                                    pool.end();
                                                    callback(response);
                                                }
                                            }); 
                                        } else {
                                            response = { success: false, message: 'Error in connection' };
                                            connection.release();
                                            pool.end();
                                            callback(response);
                                        }
                                    });  
                                }
                                else {
                                    response = { success: false, message: "Invalid body params." };
                                    callback(response);
                                }
                                
                            });
                        }else{
                            response = { success: false, message: 'User does not exists' };
                            connection.release();
                            pool.end();
                            callback(response);
                        }
                        
                    } else {
                        response = { success: false, message: 'Invalid body params' };
                        connection.release();
                        pool.end();
                        callback(response);
                    }
                }); 
                
            }else{
                response = { success: false, message: "Error in connection." };
                callback(response);
            }
        });
        
    }catch(e){
        response = { success: false, message: "Invalid body params." };
        callback(response);
    }

}

exports.Authenticate = function (mobileNumber,callback) {
    let response = {};
    let userQuery = " SELECT t1.id,t1.email,t1.mobileVerified,t1.firstName,t1.lastName,t2.templateURL FROM (SELECT u.id,u.email,u.firstName,u.lastName, u.mobileVerified FROM user u " +
    " WHERE u.status = 2 AND u.mobileNumber =? LIMIT 1) t1, " +
    " (SELECT templateURL FROM emailTemplate WHERE id=9) t2";

    let updateQuery = " Update user set password = ?, modifiedDate=Now() where id = ?";

    try{
        var password = generator.generate( {
            length: 6,
            numbers: true,
            exclude:'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ',
            excludeSimilarCharacters:true,
        });
        helper.getConnection(function (fail, connection, pool) {
            if (!fail) {   
                connection.query(userQuery, [mobileNumber],  function (err, result) {
                    if (!err) {
                        if(result.length == 0){
                            response = { success: false, message: 'Invalid/Not verified mobile number',isMobileVerified:true };
                            connection.release();
                            pool.end();
                            callback(response);
                        }else{
                        	var userInfo = result[0];
                        	if(userInfo.mobileVerified == 0){
                        		response = { success: false, message: 'Mobile number Not verified',isMobileVerified:false };
                                connection.release();
                                pool.end();
                                callback(response);
                        	}else{
                            var userId = userInfo.id;
                            var email = userInfo.email;
                            var firstName = userInfo.firstName;
                            var lastName = userInfo.lastName;
                            var templateUrl =userInfo.templateURL;
                            bcrypt.hash(password, saltRounds, function (err, hash) {
                                var encryptedPassword = hash;
                                
                                //email body params start
                                var subject ="Your Login OTP";
                                var cc = "";
                                var bcc = "";
                                var emailbody=[{
                                    toName: firstName +" "+lastName,
                                    password: password
  
                                }];
                                var fileName ="";
                                var fileContent="";
                                //email body params end

                                connection.query(updateQuery, [encryptedPassword,userId],  function (err1, result1) {
                                    if (!err1) { 
                                       helper.AWSSendMail(email, subject, cc, bcc, templateUrl,emailbody,fileName,fileContent,function(callbackMail){
                                         
                                        });
                                    	// send sms
                                    	var message = "Please Use the OTP to login to Sugam " + password;
                                    	 helper.SendMobileOTP(message, "", mobileNumber,function(callbackSMS){
                                             if(callbackSMS.success==true)
                                             {
                                                 response = { success: true, message: 'OTP is sent to your registered mobile number' };
                                                 connection.release();
                                                 pool.end();
                                                 callback(response);
                                                 
                                             }else{
                                                 response = { success: false, message: 'Error in sending SMS',isMobileVerified:true };
                                                 connection.release();
                                                 pool.end();
                                                 callback(response);
                                             }
                                         }); 
                                    } else {
                                        response = { success: false, message: 'Error in connection',isMobileVerified:true };
                                        connection.release();
                                        pool.end();
                                        callback(response);
                                    }
                                });  
                            });
                        }
                            
                        }
                    } else {
                        response = { success: false, message: 'Invalid credentials',isMobileVerified:true };
                        connection.release();
                        pool.end();
                        callback(response);
                    }
                });
            }else{
                response = { success: false, message: "Error in connection.",isMobileVerified:true };
                callback(response);
            }
        });
    }catch(e){
        response = { success: false, message: "Invalid body params.",isMobileVerified:true };
        callback(response);
    }
}

exports.Login = function (mobileNumber,password,callback) {
    let response = {};
    let userQuery = " Select u.id,u.email,u.password AS encryptedPassword,u.mobileNumber,u.firstName,u.lastName,u.role AS roleId,r.name as role,u.emailVerified,u.mobileVerified,u.imageURL from user u LEFT JOIN role r on r.id=u.role WHERE u.status = 2 AND u.mobileNumber =? AND TIMESTAMPDIFF(SECOND,modifiedDate,NOW()) <=1800 LIMIT 1";
    let updateQuery = " Update user set refreshToken = ?, lastTokenRefreshed = NOW(),password = NULL where id = ?";
    //update user table when email/mobile message sent successfully.
    try{
        helper.getConnection(function (fail, connection, pool) {
            if (!fail) {   
                connection.query(userQuery, [mobileNumber],  function (err, result) {
                    if (!err) {
                        if(result.length == 0){
                            response = { success: false, message: 'Invalid mobile number/OTP' };
                            connection.release();
                            pool.end();
                            callback(response);
                        }else{
                            var userInfo = result[0];
                            var encryptedPassword = userInfo.encryptedPassword;
                            var email = userInfo.email;
                            var mobileNumber = userInfo.mobileNumber;
                            var firstName = userInfo.firstName;
                            var lastName = userInfo.lastName;
                            var userId = userInfo.id;
                            var role = userInfo.role;
                            var passwordMatched = bcrypt.compareSync(password, encryptedPassword);
                            var emailVerified = userInfo.emailVerified;
                            var mobileVerified = userInfo.mobileVerified;
                            var imageURL = userInfo.imageURL;
                            const user = {
                                "mobileNumber": mobileNumber,
                                "name": firstName +" "+ lastName
                            }
                            if (passwordMatched) {
                                const token = jwt.sign(user, config.secret);
                                const refreshToken = jwt.sign(user, config.refreshTokenSecret);
                                connection.query(updateQuery, [refreshToken,userId],  function (err1, result1) {
                                    if(err1){
                                        response = { success: false, message: 'Error in connection' };
                                        connection.release();
                                        pool.end();
                                        callback(response);
                                    }else{
                                        response = {success:true,message: "Authenticated",token: token,refreshToken: refreshToken,role:role,email:email,mobileNumber:mobileNumber,id:userId,emailVerified:emailVerified,mobileVerified:mobileVerified,name:firstName +" "+ lastName,imageURL:imageURL};
                                        connection.release();
                                        pool.end();
                                        callback(response);                                                
                                    }
                                });
                            }else{
                                response = { success: false, message: 'Invalid credentials' };
                                connection.release();
                                pool.end();
                                callback(response);
                            }
                        }
                    } else {
                        response = { success: false, message: 'Invalid credentials' };
                        connection.release();
                        pool.end();
                        callback(response);
                    }
                });
            }else{
                response = { success: false, message: "Error in connection." };
                callback(response);
            }
        });
    }catch(e){
        response = { success: false, message: "Invalid body params." };
        callback(response);
    }
}


/**Below are the authorization required apis start*/
function UploadFilesFunc(flag,userId,base64Content,fileName,callback){
    
    var flag = flag;//if P then update the imageURL of the user else update in provider table
    var userId = userId;
    var fileName = fileName;
    var base64Content = base64Content;

    let response={};
    var postData = {
        "flag": flag,
        "userId":userId,
        "fileName":fileName,
        "base64Content": base64Content
    };
    var elasticUrl = config.environment == "TEST" ? config.Elastic.uploadfiles.test : config.Elastic.uploadfiles.prod;
    
    var updateQuery=" Update user set imageURL=?, modifiedDate=NOW() WHERE id = ?";
    if(flag=="D"){
        updateQuery = " Update provider set documentLink=?, modifiedDate=NOW() WHERE provider = ?";
    }
    try{
        reqGetPost({
            url: elasticUrl,
            method: "POST",
            json: true,   // <--Very important!!!
            body: postData
        }, function (error, response, body) {
            if(error){
                response = { success: false, message: "Error in uploading." };
                callback(response);
            }else{
                if(body["fileURL"] !=undefined){
                    var fileURL = body.fileURL;
                    helper.getConnection(function (fail, connection, pool) {
                        if (!fail) {  
                    connection.query(updateQuery, [fileURL,userId],  function (err, result) {
                        if (!err) {
                            response = {success:true,message: "Successfully updated the fileURL",url:fileURL};        
                            connection.release();
                            pool.end();
                            callback(response);  
                        } 
                        else {
                            response = { success: false, message: "Error in updating the fileURL" };
                            connection.release();
                            pool.end();
                            callback(response);
                        }
                    });
                }else{
                    response = { success: false, message: "Error in connection." };
                    connection.release();
                    pool.end();
                    callback(response);
                }
                });
                }else{
                    response = { success: false, message: "Error in uploading.",fileURL:"" };
                    callback(response);
                } 
            }
        });  
    }catch(e){
        response = { success: false, message: "Invalid body params." };
        callback(response);
    }

}



/**Below are the authorization required apis end*/

exports.LogoutUser = function (mobileNumber,refreshToken,callback) {
    let response = {};
    let userQuery = " Select id from user WHERE mobileNumber = ? AND refreshToken = ? LIMIT 1";
    let updateQuery = " Update user set refreshToken = NULL where id = ?";

    try{
        helper.getConnection(function (fail, connection, pool) {
            if (!fail) {   
                connection.query(userQuery, [mobileNumber, refreshToken],  function (err, result) {
                    if (!err) {
                        if(result.length == 0){
                            response = { success: false, message: 'Invalid mobileNumber/refreshToken' };
                            connection.release();
                            pool.end();
                            callback(response);
                        }else{
                            var userInfo = result[0];
                            var userId = userInfo.id;
                            connection.query(updateQuery,[userId],  function (err1, result1) {
                                if(err1){
                                    response = { success: false, message: 'Error in connection' };
                                    connection.release();
                                    pool.end();
                                    callback(response);
                                }else{
                                    response = {success:true,message: "successfully logged out"};
                                    connection.release();
                                    pool.end();
                                    callback(response);
                                }
                            });
                        } 
                    } else {
                        response = { success: false, message: 'Invalid email/refreshToken' };
                        connection.release();
                        pool.end();
                        callback(response);
                    }
                });
                
            }else{
                response = { success: false, message: "Error in connection." };
                callback(response);
            }
        }); 
    }catch(e){
        response = { success: false, message: "Invalid body params." };
        callback(response);
    }

}



exports.AddUpdateBankDetails = function (id,userId,bankName,ifsc,accountNumber,accountName,callback) {
    let response = {};

    let insertQuery = " insert into bankDetails(userId,bankName,ifsc,accountNumber,accountName,status)VALUES(?,?,?,?,?,1)";
    let updateQuery = " Update bankDetails set bankName=?,ifsc=?,accountNumber=?,accountName=?, modifiedDate=NOW() WHERE id = ? AND userId = ?";

    try{
        //insert
        if (id == 0) {
            helper.getConnection(function (fail, connection, pool) {
                if (!fail) {   
                    connection.query(insertQuery, [userId,bankName,ifsc,accountNumber,accountName],  function (err, result) {
                        if (!err) {
                            response = {success:true,message: "Successfully added the bank details"};        
                            connection.release();
                            pool.end();
                            callback(response);
                        } 
                        else {
                            response = { success: false, message: "Error in adding the bank details" };
                            connection.release();
                            pool.end();
                            callback(response);
                        }
                    });
                }else{
                    response = { success: false, message: "Error in connection." };
                    callback(response);
                }
            });
        }//update
        else if (id != 0 ) {
            helper.getConnection(function (fail, connection, pool) {
                if (!fail) {   
                    connection.query(updateQuery, [bankName,ifsc,accountNumber,accountName,id,userId],  function (err, result) {
                        if (!err) {
                            response = {success:true,message: "Successfully updated the bank details"};        
                            connection.release();
                            pool.end();
                            callback(response);
                        } 
                        else {
                            response = { success: false, message: "Error in updating the bank details" };
                            connection.release();
                            pool.end();
                            callback(response);
                        }
                    });
                }else{
                    response = { success: false, message: "Error in connection." };
                    callback(response);
                }
            });
        }
        else {
            response = { success: false, message: "Invalid body params." };
            callback(response);
        }
        
    }catch(e){
        response = { success: false, message: "Invalid body params." };
        callback(response);
    }
}

exports.insertNotification = function (memberId,providerId,jobId,jobStatus) {
	
    let insertQuery = "CALL InsertNotification(?,?,?,?);";
    try{
            helper.getConnection(function (fail, connection, pool) {
                if (!fail) {   
                    connection.query(insertQuery, [memberId,providerId,jobId,jobStatus],  function (err, result) {
                        if (!err) {
                            connection.release();
                            pool.end();
                        } 
                        else {
                        	console.log("error " + err);
                            connection.release();
                            pool.end();
                        }
                    });
                }else{
                    console.log("Error in connection.");
                }
            }); 
    }catch(e){
        response = { success: false, message: "Invalid body params." };
        console.log(response);
    }
  }


exports.DisableBankStatus = function (id,userId,callback) {
    let response = {};

    let updateQuery = " Update bankDetails set status=0, modifiedDate=NOW() WHERE id = ? AND userId = ?";

    try{
        if (id != 0 && userId != undefined ) {
            helper.getConnection(function (fail, connection, pool) {
                if (!fail) {   
                    connection.query(updateQuery, [id,userId],  function (err, result) {
                        if (!err) {
                            response = {success:true,message: "Successfully disabled the bank details"};        
                            connection.release();
                            pool.end();
                            callback(response);
                        } 
                        else {
                            response = { success: false, message: "Error in disabling the bank details" };
                            connection.release();
                            pool.end();
                            callback(response);
                        }
                    });
                }else{
                    response = { success: false, message: "Error in connection." };
                    callback(response);
                }
            });
        }
        else {
            response = { success: false, message: "Invalid body params." };
            callback(response);
        }
        
    }catch(e){
        response = { success: false, message: "Invalid body params." };
        callback(response);
    }
}

exports.GetUserBankDetails = function (userId,callback) {
    let response = {};

    let bankQuery = "Select id,userId,bankName,ifsc,accountNumber,accountName,status from bankDetails where status = 1 AND userId = ? LIMIT 1";

    try{
        helper.getConnection(function (fail, connection, pool) {
            if (!fail) {   
                connection.query(bankQuery,[userId],  function (err, result) {
                    if (!err) {
                        var bankdetails = result.length == 0 ? [] : result;
                        response = {success:true,bankdetails: bankdetails};        
                        connection.release();
                        pool.end();
                        callback(response);
                    } 
                    else {
                        response = { success: false, message: "Error in fetching the bank details" };
                        connection.release();
                        pool.end();
                        callback(response);
                    }
                });
            }else{
                response = { success: false, message: "Error in connection." };
                callback(response);
            }
        });
    }catch(e){
        response = { success: false, message: "Invalid body params." };
        callback(response);
    }
}


exports.AddUserRating = function (memberId,providerId,rating,message,callback) {
    let response = {};

    let insertQuery = "insert into rating(memberId,providerId,rating,message)VALUES(?,?,?,?)";

    try{
        //insert
        helper.getConnection(function (fail, connection, pool) {
            if (!fail) {   
                connection.query(insertQuery, [memberId,providerId,rating,message],  function (err, result) {
                    if (!err) {
                        response = {success:true,message: "Successfully added the rating"};        
                        connection.release();
                        pool.end();
                        callback(response);
                    } 
                    else {
                        response = { success: false, message: "Error in adding the rating" };
                        connection.release();
                        pool.end();
                        callback(response);
                    }
                });
            }else{
                response = { success: false, message: "Error in connection." };
                callback(response);
            }
        });  
    }catch(e){
        response = { success: false, message: "Invalid body params." };
        callback(response);
    }
}

exports.AddFavorite = function (memberId,providerId,callback) {
    let response = {};
    let checkFavorite = " Select id from favorite where memberId = ? and providerId = ? LIMIT 1";
    let insertFavorite = " INSERT INTO favorite(memberId,providerId)VALUES(?,?)";
    let deleteFavorite = " DELETE FROM favorite where memberId = ? AND providerId = ?";

    try{
        helper.getConnection(function (fail, connection, pool) {
            if (!fail) {   
                connection.query(checkFavorite,[memberId,providerId],  function (err, result) {
                    if (!err) {
                        if(result.length > 0){
                            connection.query(deleteFavorite,[memberId,providerId],  function (err1, result1) {
                                if (!err1) {
                                    response = {success:true,message: "Marked as unfavorite"};        
                                    connection.release();
                                    pool.end();
                                    callback(response);
                                } 
                                else {
                                    response = { success: false, message: "Error in making as unfavorite" };
                                    connection.release();
                                    pool.end();
                                    callback(response);
                                }
                            });
                        }else{
                            connection.query(insertFavorite,[memberId,providerId],  function (err1, result1) {
                                if (!err1) {
                                    response = {success:true,message: "Marked as favorite"};        
                                    connection.release();
                                    pool.end();
                                    callback(response);
                                } 
                                else {
                                    response = { success: false, message: "Error in making as favorite" };
                                    connection.release();
                                    pool.end();
                                    callback(response);
                                }
                            });
                        }
                    } 
                    else {
                        response = { success: false, message: "Error in fetching the favorites" };
                        connection.release();
                        pool.end();
                        callback(response);
                    }
                });
            }else{
                response = { success: false, message: "Error in connection." };
                callback(response);
            }
        });
    }catch(e){
        response = { success: false, message: "Invalid body params." };
        callback(response);
    }

}

exports.GetProvidersList = function (userId,pgSkip,pgLimit,sortBy,sortByFlag,cityId,qualificationId,serviceId,providerType,favorite,name,callback) {
    let response = {};

    let commentsQuery = " CALL GetProviders(?,?,?,?,?,?,?,?,?,?,?)";

    try{
        helper.getConnection(function (fail, connection, pool) {
            if (!fail) {   
                connection.query(commentsQuery,[userId,pgSkip,pgLimit,sortBy,sortByFlag,cityId,qualificationId,serviceId,providerType,favorite,name],  function (err, result) {
                    if (!err) {
                        var totalCount =0;
                        var finalResult =[];
                        if(result[0] != undefined && result[0].length > 0){
                            var queryResult = result[0];
                            totalCount = queryResult[0].totalCount;
                            queryResult.forEach(function(item){
                                let resObj = {};
                                resObj.providerId = item.providerId;
                                resObj.fullName = item.fullName;
                                resObj.gender = item.gender;
                                resObj.dob = item.dob;
                                resObj.imageURL = item.imageURL;
                                resObj.description = item.description;
                                resObj.experience = item.experience;
                                resObj.rating = item.rating;
                                resObj.jobs = item.jobs;
                                resObj.isFavorite = item.isFavorite;
                                resObj.isActive = item.IsActive;
                                resObj.services = JSON.parse(item.services);
                                finalResult.push(resObj);
                            });
                        }
                        response = {success:true,totalCount:totalCount,providers: finalResult};        
                        connection.release();
                        pool.end();
                        callback(response);
                    } 
                    else {
                        response = { success: false, message: "Error in fetching the providers list" };
                        connection.release();
                        pool.end();
                        callback(response);
                    }
                });
            }else{
                response = { success: false, message: "Error in connection." };
                callback(response);
            }
        });
    }catch(e){
        response = { success: false, message: "Invalid body params." };
        callback(response);
    }

}

exports.GetUserDetails = function (userId,callback) {
    let response = {};
    let selectQuery = "CALL getProviderById(?)";
    try{
        helper.getConnection(function (fail, connection, pool) {
            if (!fail) {   
                connection.query(selectQuery,[userId],  function (err, result) {
                    if (!err) {
                        var data = result.length == 0 ? [] : result[0];
                        response = {success:true,userDetails: data};        
                        connection.release();
                        pool.end();
                        callback(response);
                    } 
                    else {
                        response = { success: false, message: "Error in fetching the user details" };
                        connection.release();
                        pool.end();
                        callback(response);
                    }
                });
            }else{
                response = { success: false, message: "Error in connection." };
                callback(response);
            }
        });
    }catch(e){
        response = { success: false, message: "Invalid body params." };
        callback(response);
    }

}

exports.GetProviderDetails = function (userId,providerId,callback) {
    let response = {};

    let selectQuery = " SELECT t1.providerId,IsActive,fullName,t1.firstName,t1.lastName,t1.countryId,t1.stateId,t1.cityId,t1.dob,t1.location, " +
    " t1.address,t1.email,t1.mobileNumber,t1.gender,t1.qualificationId,t1.documentName,isFavorite,description,experience,CONCAT('[',t3.services,']') AS services, " +
    " imageURL,IFNULL(t2.rating,0) AS rating,startedYear,totalMembers,t1.primaryIdentity,t1.primaryIdentityValue,t1.secondaryIdentity,t1.secondaryIdentityValue,IFNULL(t4.JobsCompleted,0) AS jobs FROM " +
    " (SELECT u.id AS providerId,CONCAT(u.firstName, ' ', u.lastName) AS fullName,u.firstName,u.lastName,u.countryId,u.stateId,u.cityId,DATE_FORMAT(u.dob,'%d-%b-%Y') AS dob,u.address,u.location,u.email, " +
    " u.mobileNumber,u.gender,(CASE WHEN IFNULL(refreshToken,'')!='' THEN 1 ELSE 0 END) AS IsActive,u.imageURL,(CASE WHEN f.id !=0 THEN 1 ELSE 0 END) AS isFavorite,IFNULL(p.qualificationId,0) AS qualificationId,IFNULL(p.documentName,'') AS documentName, " +
    " (CASE WHEN u.role =3 THEN p.description ELSE org.description END) AS description,(CASE WHEN u.role =3 THEN IFNULL(p.experience,0) ELSE IFNULL((YEAR(NOW())-IFNULL(org.startedYear,0)),0) END) AS experience, " +
    " IFNULL(org.startedYear,0) AS startedYear,IFNULL(org.totalMembers,0) AS totalMembers,(CASE WHEN u.role=3 THEN p.primaryIdentity ELSE org.primaryIdentity END) AS primaryIdentity, " +
    " (CASE WHEN u.role=3 THEN p.primaryIdentityValue ELSE org.primaryIdentityValue END) AS primaryIdentityValue,(CASE WHEN u.role=3 THEN p.secondaryIdentity ELSE org.secondaryIdentity END) AS secondaryIdentity, " +
    " (CASE WHEN u.role=3 THEN p.secondaryIdentityValue ELSE org.secondaryIdentityValue END) AS secondaryIdentityValue FROM user u LEFT JOIN provider p ON p.provider = u.id LEFT JOIN organization org ON org.organizationId=u.id " +
    " LEFT JOIN favorite f ON  f.providerId=u.id AND f.memberId=? WHERE u.id = ? ) t1 LEFT JOIN " +
    " (SELECT providerId,ROUND(AVG(rating),1) rating FROM rating WHERE providerId=? GROUP BY providerId ORDER BY providerId) t2 ON t2.providerId = t1.providerId LEFT JOIN " +
    " (SELECT providerId,GROUP_CONCAT(JSON_OBJECT('id',t.id,'name',t.name,'price',t.price) ORDER BY t.id) AS services FROM(SELECT DISTINCT ps.providerId,s.id,s.name,ROUND(ps.totalPrice,2) price FROM providerService ps LEFT JOIN " +
    " services s ON s.id=ps.serviceId WHERE  ps.providerId = ?) t ) t3 ON t1.providerId = t3.providerId LEFT JOIN " + 
    " (SELECT providerId, COUNT(id) AS JobsCompleted FROM job WHERE providerId = ? AND previousStatus=8 OR status = 8 GROUP BY providerId ORDER BY providerId) t4 on t4.providerId = t1.providerId";

    try{
        helper.getConnection(function (fail, connection, pool) {
            if (!fail) {   
                connection.query(selectQuery,[userId,providerId,providerId,providerId,providerId],  function (err, result) {
                    if (!err) {

                        if(result.length > 0){
                            var data = result[0];
                            var services = JSON.parse(data.services);
                            delete data.services;

                        }
                        response = {success:true,providerDetails: data,services:services};        
                        connection.release();
                        pool.end();
                        callback(response);
                    } 
                    else {
                        response = { success: false, message: "Error in fetching the user details" };
                        connection.release();
                        pool.end();
                        callback(response);
                    }
                });
            }else{
                response = { success: false, message: "Error in connection." };
                callback(response);
            }
        });
    }catch(e){
        response = { success: false, message: "Invalid body params." };
        callback(response);
    }

}


exports.GetUserFeedback = function (providerId, callback) {
    let response = {};
    let selectQuery = "SELECT r.memberId, CONCAT(u.firstName,' ', u.lastName) AS memberName,r.message,r.createdDate,r.rating,u.imageURL FROM rating r,`user` u WHERE r.providerId = ? AND r.memberId = u.id";
    try{
        helper.getConnection(function (fail, connection, pool) {
            if (!fail) {   
                connection.query(selectQuery,[providerId],  function (err, result) {
                    if (!err) {
                        var data = result.length == 0 ? [] : result; 
                       
                        response = {success:true,userFeedback: data};        
                        connection.release();
                        pool.end();
                        callback(response);
                    } 
                    else {
                        response = { success: false, message: "Error in fetching the user details" };
                        connection.release();
                        pool.end();
                        callback(response);
                    }
                });
            }else{
                response = { success: false, message: "Error in connection." };
                callback(response);
            }
        });
    }catch(e){
        response = { success: false, message: "Invalid body params." };
        callback(response);
    }

}


exports.VerifyUserEmail = function (encryptedData,callback) {
    var encryptedData = encryptedData;
    let response = {};
    let userQuery = " Select id from user WHERE email =? AND emailOtp = ? LIMIT 1";
    let updateQuery = " Update user set emailVerified= 1, emailOtp = null where id = ?";
    try{
        var decryptedData = helper.decrypt(encryptedData);
        var splitArr = decryptedData.split(',');
        var email = splitArr[0];
        var otp = splitArr[1];
        if (email != undefined && otp !=undefined) {
            helper.getConnection(function (fail, connection, pool) {
                if (!fail) {   
                    connection.query(userQuery, [email, otp],  function (err, result) {
                        if (!err) {
                            if(result.length == 0){
                                response = { success: false, message: 'Invalid credentials' };
                                connection.release();
                                pool.end();
                                callback(response);
                            }else{
                                var userInfo = result[0];
                                var userId = userInfo.id;
                                connection.query(updateQuery,[userId],  function (err1, result1) {
                                    if(err1){
                                        response = { success: false, message: 'Error in connection' };
                                        connection.release();
                                        pool.end();
                                        callback(response);
                                    }else{
                                        response = {
                                            "success":true,
                                            "message": "Congratulations! email is verified successfully"
                                        }
                                        connection.release();
                                        pool.end();
                                        callback(response);
                                    }
                                });
                            } 
                        } else {
                            response = { success: false, message: 'Error in connection' };
                            connection.release();
                            pool.end();
                            callback(response);
                        }
                    });
                }else{
                    response = { success: false, message: "Error in connection." };
                    callback(response);
                }
            });
        }
        else {
            response = { success: false, message: "Invalid body params." };
            callback(response);
        }
        
    }catch(e){
        response = { success: false, message: "Invalid body params." };
        callback(response);
    }
}

exports.serviceByProvider = function (prividerId,callback) {
    var prividerId = prividerId;
    let response = {};
    let selectQuery = "SELECT p.id,p.providerId,p.serviceId,s.name AS serviceName,p.price,p.adminFee,p.totalPrice FROM providerService p , services s WHERE p.providerId = ? AND p.status = 1 AND p.serviceId = s.id";
    try{
            helper.getConnection(function (fail, connection, pool) {
                if (!fail) {   
                    connection.query(selectQuery, [prividerId],  function (err, result) {
                        if (!err) {
                        	//console.log("result = " + result);
                        	var mes = "Successfully fetched provider service details."
                        	if(result == ""){
                        		mes = "No service are found for the given provider"
                        	}
                        	response = { success: true, message: mes,data: result };
                            connection.release();
                            pool.end();
                            callback(response);
                        } else {
                            response = { success: false, message: 'Error in while fectching data' };
                            connection.release();
                            pool.end();
                            callback(response);
                        }
                    });
                }else{
                    response = { success: false, message: "Error in connection." };
                    callback(response);
                }
            });
              
    }catch(e){
        response = { success: false, message: "Invalid body params." };
        callback(response);
    }
}

exports.VerifyUserMobile = function (mobileNumber,otp,callback) {   
    let response = {};
    let userQuery = " Select id from user WHERE mobileNumber =? AND mobileOtp = ? LIMIT 1";
    let updateQuery = " Update user set mobileVerified = 1, mobileOtp = NULL where id = ?";
    try{
        helper.getConnection(function (fail, connection, pool) {
            if (!fail) {   
                connection.query(userQuery, [mobileNumber, otp],  function (err, result) {
                    if (!err) {
                        if(result.length == 0){
                            response = { success: false, message: 'Invalid credentials' };
                            connection.release();
                            pool.end();
                            callback(response);
                        }else{
                            var userInfo = result[0];
                            var userId = userInfo.id;
                            connection.query(updateQuery,[userId],  function (err1, result1) {
                                if(err1){
                                    response = { success: false, message: 'Error in connection' };
                                    connection.release();
                                    pool.end();
                                    callback(response);
                                }else{
                                    response = {
                                        "success":true,
                                        "message": "Congratulations! Your mobile number is verified successfully"
                                    }
                                    connection.release();
                                    pool.end();
                                    callback(response);
                                }
                            });
                        } 
                    } else {
                        response = { success: false, message: 'Error in connection' };
                        connection.release();
                        pool.end();
                        callback(response);
                    }
                });
            }else{
                response = { success: false, message: "Error in connection." };
                callback(response);
            }
        });     
    }catch(e){
        response = { success: false, message: "Invalid body params." };
        callback(response);
    }
}

exports.UpdateUserProfile = function (id,userParams,providerParams,organizationParams,base64ImageContent,callback) {
    let response = {};
    try{

        let checkUserQuery =" SELECT id,role FROM user WHERE id = ?";
        let updateUserQuery =" UPDATE user SET firstName=?,lastName=?,countryId=?,stateId=?,cityId=?,dob=?,gender=?,location=?,address=?,modifiedDate=NOW() WHERE id=?";
        let updateProviderQuery =" UPDATE provider SET description=?,experience=?,qualificationId=?,modifiedDate=NOW() WHERE provider=? ";
        let updateOrganizationQuery =" UPDATE organization SET communicator=?,communicatorPhoneNumber=?,startedYear=?,totalMembers=?,description=?,modifiedDate=NOW() WHERE organizationId=?";

        helper.getConnection(function (fail, connection, pool) {
            if (!fail) {   
                connection.beginTransaction(function(tranerror){
                    if (tranerror) { 
                        response = { success: false, message: "Error in connection." };
                        callback(response);
                    }else{
                        connection.query(checkUserQuery, [id],  function (error, results) {
                            if (!error) { 
                                var userDetails = results[0];
                                var role = userDetails.role;
                                if(userDetails != undefined){
                                    if(role == 4)//Member 
                                    {
                                        connection.query(updateUserQuery, [userParams.firstName,userParams.lastName,userParams.countryId,userParams.stateId,userParams.cityId,userParams.dob,userParams.gender,userParams.location,userParams.address,id],  function (err, result) {
                                            if (!err) { 
                                                connection.commit(function (commiterror) {
                                                    if (commiterror) { 
                                                        connection.rollback(function () {
                                                            response = { success: true, message: ' Error in connection' };
                                                            connection.release();
                                                            pool.end();
                                                            callback(response);
                                                        });
                                                    }
                                                    connection.release();
                                                    pool.end();
                                                    response = { success: true, message: ' Updated the details successfully.' };                    
                                                    if(base64ImageContent !=""){
                                                        UploadFilesFunc("P",id,base64ImageContent,"",function(callbackProfile){
                                                            if(callbackProfile.success==true)
                                                            {
                                                                callback(response);
                                                            }
                                                            else{
                                                                response = { success: false, message: callback.message };
                                                                callback(response);
                                                            }
                                                        }); 
                                                    }else{
                                                        callback(response);
                                                    }
                                                });
    
                                            } else {
                                                response = { success: false, message: 'Error in connection' };
                                                connection.release();
                                                pool.end();
                                                callback(response);
                                            }
                                        });  
                                    }
                                    if(role == 3){//Provider
                                        connection.query(updateUserQuery,  [userParams.firstName,userParams.lastName,userParams.countryId,userParams.stateId,userParams.cityId,userParams.dob,userParams.gender,userParams.location,userParams.address,id],  function (err, result) {
                                            if (!err) { 
                                                connection.query(updateProviderQuery, [providerParams.description,providerParams.experience,providerParams.qualificationId,id],  function (err1, result1) {
                                                    if (!err1) {         
                                                        connection.commit(function (commiterror) {
                                                            if (commiterror) { 
                                                                connection.rollback(function () {
                                                                    response = { success: true, message: ' Error in connection' };
                                                                    connection.release();
                                                                    pool.end();
                                                                    callback(response);
                                                                });
                                                            }
                                                            connection.release();
                                                            pool.end();     
                                                            response = { success: true, message: ' Updated the details successfully.' };
                                                            if(base64ImageContent !=""){
                                                                UploadFilesFunc("P",id,base64ImageContent,"",function(callbackProfile){
                                                                    if(callbackProfile.success==true)
                                                                    {
                                                                        callback(response);
                                                                    }
                                                                    else{
                                                                        response = { success: false, message: callback.message };
                                                                        callback(response);
                                                                    }
                                                                }); 
                                                            }else{
                                                                callback(response);
                                                            }
                                                        });
                                                    }else{
                                                        response = { success: false, message: 'Error in connection' };
                                                        connection.release();
                                                        pool.end();
                                                        callback(response);
                                                    }
                                                });
                                            } else {
                                                response = { success: false, message: 'Error in connection' };
                                                connection.release();
                                                pool.end();
                                                callback(response);
                                            }
                                        });  
                                    } 
                                    if(role == 5){//Organization
                                        connection.query(updateUserQuery,  [userParams.firstName,userParams.lastName,userParams.countryId,userParams.stateId,userParams.cityId,userParams.dob,userParams.gender,userParams.location,userParams.address,id],  function (err, result) {
                                            if (!err) { 
                                                connection.query(updateOrganizationQuery, [organizationParams.communicator,organizationParams.communicatorPhoneNumber,organizationParams.startedYear,organizationParams.totalMembers,organizationParams.description,id],  function (err1, result1) {
                                                    if (!err1) { 
                                                        connection.commit(function (commiterror) {
                                                            if (commiterror) { 
                                                                connection.rollback(function () {
                                                                    response = { success: true, message: ' Error in connection' };
                                                                    connection.release();
                                                                    pool.end();
                                                                    callback(response);
                                                                });
                                                            }
                                                            connection.release();
                                                            pool.end();     
                                                            response = { success: true, message: ' Updated the details successfully.' };
                                                            if(base64ImageContent !=""){
                                                                UploadFilesFunc("P",id,base64ImageContent,"",function(callbackProfile){
                                                                    if(callbackProfile.success==true)
                                                                    {
                                                                        callback(response);
                                                                    }
                                                                    else{
                                                                        response = { success: false, message: callback.message };
                                                                        callback(response);
                                                                    }
                                                                }); 
                                                            }else{
                                                                callback(response);
                                                            }
                                                        });
                                                    }else{
                                                        response = { success: false, message: 'Error in connection' };
                                                        connection.release();
                                                        pool.end();
                                                        callback(response);
                                                    }
                                                });
                                            } else {
                                                response = { success: false, message: 'Error in connection' };
                                                connection.release();
                                                pool.end();
                                                callback(response);
                                            }
                                        }); 
                                    }      
                                }else{
                                    response = { success: false, message: 'Invalid user' };
                                    connection.release();
                                    pool.end();
                                    callback(response);
                                }
                            } else {
                                response = { success: false, message: 'Error in connection' };
                                connection.release();
                                pool.end();
                                callback(response);
                            }
                        });
                    }
                });               
            }else{
                response = { success: false, message: "Error in connection." };
                callback(response);
            }
        });
        
    }catch(e){
        response = { success: false, message: "Invalid body params." };
        callback(response);
    }
}

exports.CreateJob = function (memberId,providerId,serviceId,counts,description,callback) {
    let response = {};
    let createJobProc = " CALL CreateJob(?,?,?,?,?)";
    try{
        helper.getConnection(function (fail, connection, pool) {
            if (!fail) {   
                connection.query(createJobProc,[memberId,providerId,serviceId,counts,description],  function (err, result) {
                    if (!err) {
                        if(result.length > 0){
                            var returnResult = result[0];
                            if(returnResult[0].success ==1){
                                response = {success:true,message:" Job created successfully!"};        
                                connection.release();
                                pool.end();
                                callback(response);
                            }else{
                                response = {success:true,message:" Error in creating the Job!"};        
                                connection.release();
                                pool.end();
                                callback(response);
                            }
                        }  
                    } 
                    else {
                        response = { success: false, message: "Error in creating the job" };
                        connection.release();
                        pool.end();
                        callback(response);
                    }
                });
            }else{
                response = { success: false, message: "Error in connection." };
                callback(response);
            }
        });
    }catch(e){
        response = { success: false, message: "Invalid body params." };
        callback(response);
    }
}

exports.UpdateJobStatus = function (userId,jobId,statusId,reason,callback) {
    let response = {};
    let JobStatusChangeProc = " CALL JobStatusChange(?,?,?,?)";
    try{
        helper.getConnection(function (fail, connection, pool) {
            if (!fail) {   
                connection.query(JobStatusChangeProc,[userId,jobId,statusId,reason],  function (err, result) {
                    if (!err) {
                        if(result.length > 0){
                            var returnResult = result[0];
                            if(returnResult[0].success ==1){
                                var cuurentStatus = returnResult[0].currentStatus;
                                var nextAction = returnResult[0].nextAction;
                                var message = returnResult[0].message;
                                var memberId = returnResult[0].memberId;
                                var providerId = returnResult[0].providerid;
                                var totalCost = returnResult[0].totalCost;
                                exports.insertNotification(memberId,providerId,jobId,statusId);
                                response = {success:true,message:message,cuurentStatus:cuurentStatus,nextAction:JSON.parse(nextAction)};        
                                connection.release();
                                pool.end();
                                // if user accept the job then call payout
                                if(statusId == 8){
                                	 paymentService.payout(providerId,totalCost,'MEM'+memberId+'PRVIDER'+providerId+'DATE'+new Date().getTime(),jobId);
                                }
                                callback(response);
                            }else{
                                response = {success:false,message:" Error in changing the job status!"};        
                                connection.release();
                                pool.end();
                                callback(response);
                            }
                        }else{
                                response = {success:false,message:" Error in changing the job status!"};        
                                connection.release();
                                pool.end();
                                callback(response);
                        }
                    } 
                    else {
                        response = { success: false, message: "Error in connection" };
                        connection.release();
                        pool.end();
                        callback(response);
                    }
                });
            }else{
                response = { success: false, message: "Error in connection." };
                callback(response);
            }
        });
    }catch(e){
        response = { success: false, message: "Invalid body params." };
        callback(response);
    }

}

exports.GetJobsList = function (userId,pgSkip,pgLimit,sortBy,sortByFlag,jobId,memberName,createdDate,providerName,callback) {
    let response = {};
    let JobsListProc = " CALL JobsList(?,?,?,?,?,?,?,?,?)";
    try{
        helper.getConnection(function (fail, connection, pool) {
            if (!fail) {   
                connection.query(JobsListProc,[userId,pgSkip,pgLimit,sortBy,sortByFlag,jobId,memberName,createdDate,providerName],  function (err, result) {
                    if (!err) {
                        var totalCount =0;
                        var finalResult =[];
                        if(result[0] !=undefined && result[0].length >0){
                            var queryResult = result[0];
                            totalCount = queryResult[0].totalCount;
                            queryResult.forEach(function(item){
                                let resObj = {};
                                resObj.jobId = item.jobId;
                                resObj.memberId = item.memberId;
                                resObj.providerId = item.providerId;
                                resObj.serviceId = item.serviceId;
                                resObj.counts = item.counts;
                                resObj.serviceName = item.serviceName;
                                resObj.createdDate = item.createdDate;
                                resObj.memberName = item.memberName;
                                resObj.providerName = item.providerName;
                                resObj.statusId = item.statusId;
                                resObj.jobStatusName = item.jobStatusName;
                                resObj.PayedAmount = item.PayedAmount;
                                resObj.PaymentStatus = item.PaymentStatus;
                                resObj.nextAction = JSON.parse(item.nextAction);
                                finalResult.push(resObj);
                            });
                            response = {success:true,totalCount:totalCount,job: finalResult};        
                            connection.release();
                            pool.end();
                            callback(response);
                        }else{
                            response = {success:true,message:" No Records"};        
                            connection.release();
                            pool.end();
                            callback(response);
                        }
                        
                    } 
                    else {
                        response = { success: false, message: "Error in connection" };
                        connection.release();
                        pool.end();
                        callback(response);
                    }
                });
            }else{
                response = { success: false, message: "Error in connection." };
                callback(response);
            }
        });
    }catch(e){
        response = { success: false, message: "Invalid body params." };
        callback(response);
    }

}

exports.GetJobDetails = function (userId,jobId,callback) {
    let response = {};
    let JobDetailsProc = "CALL JobDetails(?,?)";
    try{
        helper.getConnection(function (fail, connection, pool) {
            if (!fail) {   
                connection.query(JobDetailsProc,[userId,jobId],  function (err, result) {
                    if (!err) {
                        if(result.length > 0){
                            if(result[0] != undefined && result[0].length > 0){
                                var returnResult = result[0];
                                var nextAction = returnResult[0].nextAction;
                                delete returnResult[0].nextAction;
                                response = {success:true,jobDetails:returnResult[0],nextAction:JSON.parse(nextAction)};        
                                connection.release();
                                pool.end();
                                callback(response);
                            }else{
                                response = {success:true,message:"No Records"};        
                                connection.release();
                                pool.end();
                                callback(response);
                            }
                        }else{
                            response = {success:true,message:" No Records"};        
                            connection.release();
                            pool.end();
                            callback(response);
                        }
                    } 
                    else {
                        response = { success: false, message: "Error in connection" };
                        connection.release();
                        pool.end();
                        callback(response);
                    }
                });
            }else{
                response = { success: false, message: "Error in connection." };
                callback(response);
            }
        });
    }catch(e){
        response = { success: false, message: "Invalid body params." };
        callback(response);
    }
}

exports.GetDashboardDetails = function (userId,callback) {
    let response = {};
    let DashboardDetailsProc = " CALL DashboardDetails(?)";
    try{
        helper.getConnection(function (fail, connection, pool) {
            if (!fail) {   
                connection.query(DashboardDetailsProc,[userId],  function (err, result) {
                    if (!err) {
                        if(result.length > 0){
                            if(result[0] !=undefined && result[0].length > 0){
                                var returnResult = result[0];
                                response = {success:true,dashboardDetails:returnResult};        
                                connection.release();
                                pool.end();
                                callback(response);
                            }else{
                                response = {success:true,message:" Error in fetching the dashboard details!"};        
                                connection.release();
                                pool.end();
                                callback(response);
                            }
                        } 
                    } 
                    else {
                        response = { success: false, message: "Error in connection" };
                        connection.release();
                        pool.end();
                        callback(response);
                    }
                });
            }else{
                response = { success: false, message: "Error in connection." };
                callback(response);
            }
        });
    }catch(e){
        response = { success: false, message: "Invalid body params." };
        callback(response);
    }
}

exports.GetUsers = function (userType,pgSkip,pgLimit,sortBy,sortByFlag,userName,callback) {
    let response = {};
    let UsersProc = " CALL GetUsers(?,?,?,?,?,?)";
    try{
        helper.getConnection(function (fail, connection, pool) {
            if (!fail) {   
                connection.query(UsersProc,[userType,pgSkip,pgLimit,sortBy,sortByFlag,userName],  function (err, result) {
                    if (!err) {
                        var totalCount =0;
                        var finalResult =[];
                        if(result[0] !=undefined && result[0].length >0){
                            var queryResult = result[0];
                            totalCount = queryResult[0].totalCount;
                            queryResult.forEach(function(item){
                                let resObj = {};
                                resObj.userId = item.userId;
                                resObj.firstName = item.firstName;
                                resObj.lastName = item.lastName;
                                resObj.userName = item.userName;
                                resObj.country = item.country;
                                resObj.state = item.state;
                                resObj.city = item.city;
                                resObj.email = item.email;
                                resObj.mobileNumber = item.mobileNumber;
                                resObj.dob = item.dob;
                                resObj.userType = "Member";
                                if(item.role == 3){
                                	resObj.userType = "Individual";
                                }else if(item.role == 5){
                                	resObj.userType = "Organization";
                                }
                                resObj.userStatus = item.status
                                finalResult.push(resObj);
                            });
                            response = {success:true,totalCount:totalCount,users: finalResult};        
                            connection.release();
                            pool.end();
                            callback(response);
                        }else{
                            response = {success:true,message:" No Records"};        
                            connection.release();
                            pool.end();
                            callback(response);
                        }
                    } 
                    else {
                        response = { success: false, message: "Error in connection" };
                        connection.release();
                        pool.end();
                        callback(response);
                    }
                });
            }else{
                response = { success: false, message: "Error in connection." };
                callback(response);
            }
        });
    }catch(e){
        response = { success: false, message: "Invalid body params." };
        callback(response);
    }
}


exports.GetAllJobs = function (pgSkip,pgLimit,jobId,memberName,createdDate,providerName,sortBy,sortByFlag,callback) {
    let response = {};
    let jobsProc = " CALL AllJobs(?,?,?,?,?,?,?,?)";
    try{
        helper.getConnection(function (fail, connection, pool) {
            if (!fail) {   
                connection.query(jobsProc,[pgSkip,pgLimit,jobId,memberName,createdDate,providerName,sortBy,sortByFlag],  function (err, result) {
                    if (!err) {
                        var totalCount =0;
                        var finalResult =[];
                        if(result[0] !=undefined && result[0].length >0){
                            var queryResult = result[0];
                            totalCount = queryResult[0].totalCount;
                            queryResult.forEach(function(item){
                                let resObj = {};
                                resObj.jobId = item.jobId;
                                resObj.count = item.count;
                                resObj.createdDate = item.createdDate;
                                resObj.memberId = item.memberId;
                                resObj.memberName = item.memberName;
                                resObj.providerId = item.providerId;
                                resObj.providerName = item.providerName;
                                resObj.statusId = item.statusId;
                                resObj.statusDescription = item.description;
                                resObj.amount = item.amount;
                                finalResult.push(resObj);
                            });
                            response = {success:true,totalCount:totalCount,jobs: finalResult};        
                            connection.release();
                            pool.end();
                            callback(response);
                        }else{
                            response = {success:true,message:" No Records"};        
                            connection.release();
                            pool.end();
                            callback(response);
                        }
                    } 
                    else {
                        response = { success: false, message: "Error in connection" };
                        connection.release();
                        pool.end();
                        callback(response);
                    }
                });
            }else{
                response = { success: false, message: "Error in connection." };
                callback(response);
            }
        });
    }catch(e){
        response = { success: false, message: "Invalid body params." };
        callback(response);
    }
}

exports.GetPriceConstants = function (callback) {
    let response = {};
    let selectQuery = "SELECT * FROM jobConstants";
    try{
        helper.getConnection(function (fail, connection, pool) {
            if (!fail) {   
                connection.query(selectQuery, function (err, result) {
                    if (!err) {
                        response = {success:true,data: result};        
                        connection.release();
                        pool.end();
                        callback(response);
                    } 
                    else {
                        response = { success: false, message: "Error in fetching the data" };
                        connection.release();
                        pool.end();
                        callback(response);
                    }
                });
            }else{
                response = { success: false, message: "Error in connection." };
                callback(response);
            }
        });
    }catch(e){
        response = { success: false, message: "Invalid body params." };
        callback(response);
    }
}

exports.GetUserCommentsOnProviderId = function (providerId,callback) {
     let response = {};
     let commentsQuery = " SELECT c.memberId,CONCAT(u.firstName,u.lastName) memberName,c.message,DATE_FORMAT(c.createdDate,'%d-%b-%Y') AS createdDate FROM comments c LEFT JOIN user u ON u.id=c.memberId WHERE c.status = 1 AND c.providerId = ?";
     try{
         helper.getConnection(function (fail, connection, pool) {
             if (!fail) {   
                 connection.query(commentsQuery,[providerId],  function (err, result) {
                     if (!err) {
                         var comments = result.length == 0 ? [] : result;
                         response = {success:true,services: comments};        
                         connection.release();
                         pool.end();
                         callback(response);
                     } 
                     else {
                         response = { success: false, message: "Error in fetching the user comments" };
                         connection.release();
                         pool.end();
                         callback(response);
                     }
                 });
             }else{
                 response = { success: false, message: "Error in connection." };
                 callback(response);
             }
         });
     }catch(e){
         response = { success: false, message: "Invalid body params." };
         callback(response);
     }

 }

 exports.UploadDocuments= function(flag,userId,base64Content,fileName,callback){
    
     var flag = flag;//if P then update the imageURL of the user else update in provider table
     var userId = userId;
     var fileName = fileName;
     var base64Content = base64Content;

     let response={};
     var postData = {
         "flag": flag,
         "userId":userId,
         "fileName":fileName,
         "base64Content": base64Content
     };
     var elasticUrl = config.environment == "TEST" ? config.Elastic.uploadfiles.test : config.Elastic.uploadfiles.prod;
    
     var updateQuery=" Update user set imageURL=?, modifiedDate=NOW() WHERE id = ?";
     if(flag=="D"){
         updateQuery = " Update provider set documentLink=?, modifiedDate=NOW() WHERE provider = ?";
     }
     try{
         reqGetPost({
             url: elasticUrl,
             method: "POST",
             json: true,   // <--Very important!!!
             body: postData
         }, function (error, response, body) {
             if(error){
                 response = { success: false, message: "Error in uploading." };
                 callback(response);
             }else{
                 if(body["fileURL"] !=undefined){
                     var fileURL = body.fileURL;
                     helper.getConnection(function (fail, connection, pool) {
                         if (!fail) {  
                     connection.query(updateQuery, [fileURL,userId],  function (err, result) {
                         if (!err) {
                             response = {success:true,message: "Successfully updated the fileURL"};        
                             connection.release();
                             pool.end();
                             callback(response);  
                         } 
                        else {
                             response = { success: false, message: "Error in updating the fileURL" };
                             connection.release();
                             pool.end();
                             callback(response);
                         }
                     });
                 }else{
                     response = { success: false, message: "Error in connection." };
                     connection.release();
                     pool.end();
                     callback(response);
                 }
                 });
                 }else{
                     response = { success: false, message: "Error in uploading.",fileURL:"" };
                     callback(response);
                 } 
             }
         });  
     }catch(e){
         response = { success: false, message: "Invalid body params." };
         callback(response);
     }

 }

 exports.UpdateProviderPrice = function (providerId,servicePrices,callback) {
     let response = {};
     var combinedRecords =[];
     var auditCombinedRecords =[];
     servicePrices.forEach(function(item){
         if(item.id !=0){
             combinedRecords.push("("+item.id+","+providerId+", "+ item.serviceId+", " +item.price+ ", " +item.adminFee+ ", " +item.totalPrice+") ");       
         }else{
        	// combinedRecords.push("("+item.id+","+providerId+", "+ item.serviceId+", " +item.price+ ") "); 
             combinedRecords.push("("+"null"+","+providerId+", "+ item.serviceId+", " +item.price+  ", " +item.adminFee+ ", " +item.totalPrice+ ") ");       
         }
         //combinedRecords.push("("+item.id+","+providerId+", "+ item.serviceId+", " +item.price+ ") "); 
         auditCombinedRecords.push("{id:"+item.id+",providerId:"+providerId+", serviceId:"+ item.serviceId+", price:" +item.price+", " +item.adminFee+ ", " +item.totalPrice+ "} "); 
     });
    
     let insertUpdateQuery = " INSERT IGNORE INTO providerService (id,providerId,serviceId,price,adminFee,totalPrice) VALUES "+combinedRecords+" "+
     " ON DUPLICATE KEY UPDATE price=VALUES(price),adminFee = VALUES(adminFee), totalPrice = VALUES(totalPrice), modifiedDate=NOW()";

     var auditMessage = " services added/updated by the provider when updating the price "+JSON.stringify(auditCombinedRecords)+"";
     let auditQuery = " INSERT INTO audit(userId,message)VALUES(?,?)" ;
     try{
         helper.getConnection(function (fail, connection, pool) {
             if (!fail) {   
                 connection.query(insertUpdateQuery,  function (err, result) {
                     if (!err) {      
                         connection.query(auditQuery,[providerId, auditMessage],  function (err1, result1) {
                             if (!err1) {
                                 response = {success:true,message: "Updated the service prices"};        
                                 connection.release();
                                 pool.end();
                                 callback(response);
                             } 
                             else {
                                 response = { success: false, message: "Error in updating the service prices" };
                                 connection.release();
                                 pool.end();
                                 callback(response);
                             }
                         });
                     } 
                     else {
                         response = { success: false, message: "Error in updating the service prices" };
                         connection.release();
                         pool.end();
                         callback(response);
                     }
                 });
             }else{
                 response = { success: false, message: "Error in connection." };
                 callback(response);
             }
         });
     }catch(e){
         response = { success: false, message: "Invalid body params." };
         callback(response);
     }

 }
 
 exports.GetNotifications = function (userId,viewStatus,pgSkip,pgLimit,callback) {
	    let response = {};
	   // var totalCount = 0;

	    let selectQuery = "SELECT n.* FROM notification n WHERE  n.userId =?" // AND `view`=1  ORDER BY createdDate LIMIT 0,2";
	    	if(viewStatus != null){
	    		selectQuery = selectQuery + " AND n.view ="+viewStatus;
	    	}
	    	selectQuery = selectQuery +  " ORDER BY n.createdDate";
	    	if(pgSkip != 0 && pgLimit != 0){
	    		selectQuery = selectQuery + " LIMIT "+pgSkip+","+pgLimit;
	    	}
	    	//console.log(selectQuery);
	    try{
	        helper.getConnection(function (fail, connection, pool) {
	            if (!fail) {   
	                connection.query(selectQuery,[userId],  function (err, result) {
	                    if (!err) {
	                    	//console.log(result);
	                        var finalResult =[];
	                        //console.log(result[0]);
	                        if(result !=undefined && result.length >0){
	                        	//totalCount = result.length;
	                        	  result.forEach(function(item){
	                                let resObj = {};
	                                resObj.id = item.id;
	                                resObj.message = JSON.parse(item.message);
	                                resObj.userId = item.userId;
	                                resObj.viewed = item.view;
	                                resObj.createdDate = item.createdDate;
	                                finalResult.push(resObj);
	                            });
	                            response = {success:true,notifications: finalResult};        
	                            connection.release();
	                            pool.end();
	                            callback(response);
	                        }else{
	                            response = {success:true,notifications:[]};        
	                            connection.release();
	                            pool.end();
	                            callback(response);
	                        }
	                        
	                    } 
	                    else {
	                        response = { success: false, message: "Error in connection" };
	                        connection.release();
	                        pool.end();
	                        callback(response);
	                    }
	                });
	            }else{
	                response = { success: false, message: "Error in connection." };
	                callback(response);
	            }
	        });
	    }catch(e){
	        response = { success: false, message: "Invalid body params." };
	        callback(response);
	    }
	}
 
 exports.UpdateNotification = function (notificationId,action,callback) {
	    let response = {};

	    try{
	        var query = "";
	        var message = "";
	        if(action == "UPDATE"){
	        	query = "UPDATE notification SET `view` = 0 WHERE id IN (" +notificationId+ ")";
	        	message = "Successfully updatde the records."
	        }else{
	        	query = "DELETE FROM notification WHERE id IN (" +notificationId+ ")";
	        	message = "Successfully deleted the records."
	        }
	        
	        helper.getConnection(function (fail, connection, pool) {
	            if (!fail) {
	                connection.query(query,  function (error, results) {
	                    if (!error) { 
	                    	response = { success: true, message: message };
	                        connection.release();
	                        pool.end();
	                        callback(response);
	                      
	                    } else {
	                        response = { success: false, message: 'DB error' };
	                        connection.release();
	                        pool.end();
	                        callback(response);
	                    }
	                }); 
	            }else{
	                response = { success: false, message: "Error in connection." };
	                callback(response);
	            }
	        });
	    }catch(e){
	        response = { success: false, message: "Invalid body params." };
	        callback(response);
	    }

	}