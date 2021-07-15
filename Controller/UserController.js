var helper = require('../helper');
var readConfig = require('read-config'),
    config = readConfig('./config.json', { override: true });
var saltRounds = config.saltRounds;
var generator = require('generate-password');
var bcrypt = require('bcryptjs');
var reqGetPost = require('request');
const jwt = require('jsonwebtoken');
var validator = require('validator');

var emailVerifyLink = config.environment == "TEST" ? config.urls.development.emailvefifyURL : config.urls.production.emailvefifyURL;

var userService = require( '../Service/UserService.js' );
var paymentService = require( '../Service/PaymentService.js' );
/**Without authorization required apis start*/
exports.RegisterUser = function (req, res, next) {
	
    //user table params
    var email = req.body.email ? req.body.email : "";
    var firstName = req.body.firstName ? req.body.firstName : "";
    var lastName = req.body.lastName ? req.body.lastName: "";
    var gender = req.body.gender ? req.body.gender : "O";
    var latitude = req.body.latitude ? req.body.latitude : 0;
    var longitude = req.body.longitude ? req.body.longitude : 0;
    var countryId = req.body.countryId ? req.body.countryId : 0;
    var stateId = req.body.stateId ? req.body.stateId : 0;
    var cityId = req.body.cityId ? req.body.cityId : 0;
    var role = req.body.role ? req.body.role : 0;
    var location = req.body.location ? req.body.location : "";
    var address = req.body.address ? req.body.address : "";
    var mobileNumber = req.body.mobileNumber ?  req.body.mobileNumber : "";
    var dob = req.body.dob ? req.body.dob : "";
    var base64ImageContent = req.body.base64ImageContent ? req.body.base64ImageContent : "";
    
    let response = {};
    var encryptedPassword = "";

    var emailOtp = generator.generate( {
        length: 6,
        numbers: true,
        exclude:'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ',
        excludeSimilarCharacters:true,
    });
    var mobileOtp = generator.generate( {
        length: 6,
        numbers: true,
        exclude:'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ',
        excludeSimilarCharacters:true,
    });
    var password = generator.generate( {
        length: 6,
        numbers: true,
        exclude:'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ',
        excludeSimilarCharacters:true,
    });
    var combinedStr = email+","+emailOtp;
    var encryptedDataForVerifyURL = helper.encrypt(combinedStr);
    var verificationURL = emailVerifyLink+encryptedDataForVerifyURL;
    var userParams = {
        email: email,
        password: encryptedPassword,
        firstName: firstName,
        lastName: lastName,
        gender: gender,
        latitude: latitude,
        longitude: longitude,
        countryId: countryId,
        stateId: stateId,
        cityId: cityId,
        role: role,
        location: location,
        address: address,
        mobileNumber: mobileNumber,
        dob:dob,
        status: 2,
        emailOtp:emailOtp,
        mobileOtp:mobileOtp
    };
    
    //validations
    var validEmail = validator.isEmail(email);

    if (validEmail !=false && role != 0 && role==4 && firstName !="" && lastName!="" && countryId !=0 && stateId !=0 && cityId !=0 && mobileNumber!="") { 
        try{
            userService.RegisterUser(email,password,base64ImageContent,userParams,verificationURL,function(callback){
                if(callback.success==true)
                {
                    response = callback;
                    res.status(200).send(response);   
                }else{
                    response = { success: false, message: callback.message };
                    res.status(200).send(response);
                }
            });
            
        }catch(e){
            response = { success: false, message: "Invalid body params." };
            res.status(200).send(response);
        }
    }
    else{
        response = { success: false, message: "Invalid body params." };
        res.status(200).send(response);
    }
}

exports.RegisterProvider = function (req, res, next) {
    //user table params
    var email = req.body.email ? req.body.email : "";
    var firstName = req.body.firstName ? req.body.firstName : "";
    var lastName = req.body.lastName ? req.body.lastName : "";
    var gender = req.body.gender ? req.body.gender : "O";
    var latitude = req.body.latitude ? req.body.latitude : 0;
    var longitude = req.body.longitude ? req.body.longitude : 0;
    var countryId = req.body.countryId ? req.body.countryId : 0;
    var stateId = req.body.stateId ? req.body.stateId : 0;
    var cityId = req.body.cityId ? req.body.cityId : 0;
    var role = req.body.role ? req.body.role : 0;
    var location = req.body.location ? req.body.location : "";
    var address = req.body.address ? req.body.address : "";
    var mobileNumber = req.body.mobileNumber ? req.body.mobileNumber : "";
    var dob = req.body.dob ? req.body.dob : "";
    var base64ImageContent = req.body.base64ImageContent ? req.body.base64ImageContent : "";

    //provider table params
    var experience = req.body.experience ? req.body.experience : 0;
    var timings = req.body.timings ? req.body.timings :{};
    var primaryIdentity = req.body.primaryIdentity ? req.body.primaryIdentity : 0;
    var primaryIdentityValue = req.body.primaryIdentityValue ? req.body.primaryIdentityValue : "";
    var secondaryIdentity = req.body.secondaryIdentity ? req.body.secondaryIdentity : 0;
    var secondaryIdentityValue = req.body.secondaryIdentityValue ? req.body.secondaryIdentityValue : "";
    var qualificationId = req.body.qualificationId ? req.body.qualificationId : 0;
    var base64DocumentContent = req.body.base64DocumentContent ? req.body.base64DocumentContent : "";
    var documentName = req.body.documentName ? req.body.documentName : "";
    var description = req.body.description ? req.body.description : "";

    //providerService table params
    var services = req.body.services;
    

    let response = {};
    var encryptedPassword = "";
    
    var emailOtp = generator.generate( {
        length: 6,
        numbers: true,
        exclude:'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ',
        excludeSimilarCharacters:true,
    });
    var mobileOtp = generator.generate( {
        length: 6,
        numbers: true,
        exclude:'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ',
        excludeSimilarCharacters:true,
    });
    var password = generator.generate( {
        length: 6,
        numbers: true,
        exclude:'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ',
        excludeSimilarCharacters:true,
    });

    var userParams = {
        email: email,
        password: encryptedPassword,
        firstName: firstName,
        lastName: lastName,
        gender: gender,
        latitude: latitude,
        longitude: longitude,
        countryId: countryId,
        stateId: stateId,
        cityId: cityId,
        role: role,
        location: location,
        address: address,
        mobileNumber: mobileNumber,
        dob:dob,
        status: 1,
        emailOtp:emailOtp,
        mobileOtp:mobileOtp
    };
    var providerParams={
        provider:0,
        experience:experience,
        timings:JSON.stringify(timings),
        primaryIdentity:primaryIdentity,
        primaryIdentityValue:primaryIdentityValue,
        secondaryIdentity:secondaryIdentity,
        secondaryIdentityValue:secondaryIdentityValue,
        qualificationId:qualificationId,
        description:description,
        documentName:documentName
    };
    var combinedStr = email+","+emailOtp;
    var encryptedDataForVerifyURL = helper.encrypt(combinedStr);
    var verificationURL = emailVerifyLink+encryptedDataForVerifyURL;
    
    //validations
    var validEmail = validator.isEmail(email);
    if (validEmail != false && role != 0 && role==3 && firstName !="" && lastName!="" && countryId !=0 && stateId !=0 && cityId !=0 && primaryIdentity!=0 && primaryIdentityValue != "" && experience !=0 && qualificationId!=0 && base64DocumentContent!="" && documentName != "" && mobileNumber !="") { 
        try{
            userService.RegisterProvider(email,password,base64ImageContent,documentName,base64DocumentContent,userParams,providerParams,services,verificationURL,function(callback){
                if(callback.success==true)
                {
                    response = callback;
                    res.status(200).send(response);   
                }else{
                    response = { success: false, message: callback.message };
                    res.status(200).send(response);
                }
            }); 
        }catch(e){
            response = { success: false, message: "Invalid body params." };
            res.status(200).send(response);
        }
    }
    else{
        response = { success: false, message: "Invalid body params." };
        res.status(200).send(response);
    }
}

exports.RegisterOrganization = function (req, res, next) {
    //user table params
    var email = req.body.email ? req.body.email : "";
    var firstName = req.body.organization ? req.body.organization : "";
    var countryId = req.body.countryId ? req.body.countryId : 0;
    var stateId = req.body.stateId ?  req.body.stateId : 0;
    var cityId = req.body.cityId ? req.body.cityId : 0;
    var role = req.body.role ? req.body.role : 0;
    var location = req.body.location ? req.body.location : "";
    var address = req.body.address ? req.body.address : "";
    var mobileNumber = req.body.oraganizationPhoneNumber ? req.body.oraganizationPhoneNumber : ""; 
    var base64ImageContent = req.body.base64ImageContent ? req.body.base64ImageContent : "";

    //organization table params
    var communicator = req.body.communicator ? req.body.communicator : "";
    var communicatorPhoneNumber = req.body.communicatorPhoneNumber ? req.body.communicatorPhoneNumber : "";
    var primaryIdentity = req.body.primaryIdentity ? req.body.primaryIdentity : 0;
    var primaryIdentityValue = req.body.primaryIdentityValue ? req.body.primaryIdentityValue : "";
    var secondaryIdentity = req.body.secondaryIdentity ? req.body.secondaryIdentity : 0;
    var secondaryIdentityValue = req.body.secondaryIdentityValue ? req.body.secondaryIdentityValue : "";
    var startedYear = req.body.startedYear ? req.body.startedYear : 0;
    var totalMembers = req.body.totalMembers ? req.body.totalMembers : 0;
    var description = req.body.description ? req.body.description : "";

    //providerService table params
    var services = req.body.services;
    
    let response = {};
    var encryptedPassword = "";
    
    var emailOtp = generator.generate( {
        length: 6,
        numbers: true,
        exclude:'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ',
        excludeSimilarCharacters:true,
    });
    var mobileOtp = generator.generate( {
        length: 6,
        numbers: true,
        exclude:'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ',
        excludeSimilarCharacters:true,
    });
    var password = generator.generate( {
        length: 6,
        numbers: true,
        exclude:'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ',
        excludeSimilarCharacters:true,
    });

    var userParams = {
        email: email,
        password: encryptedPassword,
        firstName: firstName,
        lastName: "",
        countryId: countryId,
        stateId: stateId,
        cityId: cityId,
        role: role,
        location: location,
        address: address,
        mobileNumber: mobileNumber,
        status: 1,
        emailOtp:emailOtp,
        mobileOtp:mobileOtp
    };
    var organizationParams={
        organizationId:0,
        communicator:communicator,
        communicatorPhoneNumber:communicatorPhoneNumber,
        primaryIdentity:primaryIdentity,
        primaryIdentityValue:primaryIdentityValue,
        secondaryIdentity:secondaryIdentity,
        secondaryIdentityValue:secondaryIdentityValue,
        startedYear:startedYear,
        totalMembers:totalMembers,
        description:description
    };
    var combinedStr = email+","+emailOtp;
    var encryptedDataForVerifyURL = helper.encrypt(combinedStr);
    var verificationURL = emailVerifyLink+encryptedDataForVerifyURL;
    
    //validations
    var validEmail = validator.isEmail(email);
    if (validEmail != false && role != 0 && role==5 && firstName !="" && communicator!="" && communicatorPhoneNumber!="" && countryId !=0 && stateId !=0 && cityId !=0 && primaryIdentity!=0 && primaryIdentityValue != "" && startedYear !=0 && mobileNumber !="") { 
        try{
            userService.RegisterOrganization(email,password,base64ImageContent,userParams,organizationParams,services,verificationURL,function(callback){
                if(callback.success==true)
                {
                    response = callback;
                    res.status(200).send(response);   
                }else{
                    response = { success: false, message: callback.message };
                    res.status(200).send(response);
                }
            });
            
        }catch(e){
            response = { success: false, message: "Invalid body params." };
            res.status(200).send(response);
        }
    }
    else{
        response = { success: false, message: "Invalid body params." };
        res.status(200).send(response);
    }
}

exports.ValidateProvider = function (req, res, next) {
    var providerId = req.body.providerId;
    let response = {};
    if (providerId != undefined) { 
        try{
            userService.ValidateProvider(providerId,function(callback){
                if(callback.success==true)
                {
                    response = callback;
                    res.status(200).send(response);   
                }else{
                    response = { success: false, message: callback.message };
                    res.status(200).send(response);
                }
            });
        }catch(e){
            response = { success: false, message: "Invalid body params." };
            res.status(200).send(response);
        }
    }
    else{
        response = { success: false, message: "Invalid body params." };
        res.status(200).send(response);
    }
}

exports.VerifyUserEmail = function (req, res, next) {
    var encryptedData = req.query.token;
    let response = {};
    if (encryptedData != undefined) { 
        try{
            userService.VerifyUserEmail(encryptedData,function(callback){
                if(callback.success==true)
                {
                    response = callback;
                    res.status(200).send(response);   
                }else{
                    response = { success: false, message: callback.message };
                    res.status(200).send(response);
                }
            });
        }catch(e){
            response = { success: false, message: "Invalid body params." };
            res.status(200).send(response);
        }
    }
    else{
        response = { success: false, message: "Invalid body params." };
        res.status(200).send(response);
    }
}

exports.serviceByProvider = function (req, res, next) {
    var prividerId = req.query.providerId;
    let response = {};
    if (prividerId != undefined) { 
        try{
            userService.serviceByProvider(prividerId,function(callback){
                if(callback.success==true)
                {
                    response = callback;
                    res.status(200).send(response);   
                }else{
                    response = { success: false, message: callback.message };
                    res.status(200).send(response);
                }
            }); 
        }catch(e){
            response = { success: false, message: "Invalid body params." };
            res.status(200).send(response);
        }
    }
    else{
        response = { success: false, message: "Invalid body params." };
        res.status(200).send(response);
    }
}

exports.VerifyUserMobile = function (req, res, next) {
    var mobileNumber = req.body.mobileNumber;
    var otp = req.body.otp;
    let response = {};
    if (mobileNumber != undefined && otp != undefined) { 
        try{
            userService.VerifyUserMobile(mobileNumber,otp,function(callback){
                if(callback.success==true)
                {
                    response = callback;
                    res.status(200).send(response);   
                }else{
                    response = { success: false, message: callback.message };
                    res.status(200).send(response);
                }
            });
        }catch(e){
            response = { success: false, message: "Invalid body params." };
            res.status(200).send(response);
        }
    }
    else{
        response = { success: false, message: "Invalid body params." };
        res.status(200).send(response);
    }
}


exports.Authenticate = function (req, res, next) {
    var mobileNumber = req.body.mobileNumber;
    let response = {};
    if (mobileNumber != undefined) {
        try{
            userService.Authenticate(mobileNumber,function(callback){
                if(callback.success==true)
                {
                    response = callback;
                    res.status(200).send(response);   
                }else{
                    response = { success: false, message: callback.message, isMobileVerified:callback.isMobileVerified };
                    res.status(200).send(response);
                }
            });
        }catch(e){
            response = { success: false, message: "Invalid body params." };
            res.status(200).send(response);
        }
    }
    else{
        response = { success: false, message: "Invalid body params." };
        res.status(200).send(response);
    }
}

exports.Login = function (req, res, next) {
    var mobileNumber = req.body.mobileNumber;
    var password = req.body.password;
    var otpExpiryTime = config.otpExpiryTime;
    let response = {};
    if (mobileNumber != undefined && password !=undefined) {
        try{
            userService.Login(mobileNumber,password,function(callback){
                if(callback.success==true)
                {
                    response = callback;
                    res.status(200).send(response);   
                }else{
                    response = { success: false, message: callback.message };
                    res.status(200).send(response);
                }
            });
        }catch(e){
            response = { success: false, message: "Invalid body params." };
            res.status(200).send(response);
        }
    }
    else{
        response = { success: false, message: "Invalid body params." };
        res.status(200).send(response);
    }
}


/**Without authorization required apis end*/

/**Below are the authorization required apis start*/

exports.UpdateUserProfile = function (req, res, next) {
    //user table params
    var id = req.body.id ? req.body.id : 0;
    
    //User table params
    var firstName = req.body.firstName ? req.body.firstName : "";
    var lastName = req.body.lastName ? req.body.lastName : "";
    var countryId = req.body.countryId ? req.body.countryId : 0;
    var stateId = req.body.stateId ? req.body.stateId : 0;
    var cityId = req.body.cityId ? req.body.cityId : 0;
    var dob = req.body.dob ? req.body.dob: "";
    var gender = req.body.gender ? req.body.gender : "O";
    var location = req.body.location ? req.body.location : "";
    var address = req.body.address ? req.body.address : "";
    var base64ImageContent = req.body.base64ImageContent ? req.body.base64ImageContent : "";

    //provider table params
    var description = req.body.description ? req.body.description : "";
    var experience = req.body.experience ? req.body.experience : 0;  
    var qualificationId = req.body.qualificationId ? req.body.qualificationId : 0;

    //organization table params
    var communicator = req.body.communicator ? req.body.communicator : "";
    var communicatorPhoneNumber = req.body.communicatorPhoneNumber ? req.body.communicatorPhoneNumber : "";  
    var startedYear = req.body.startedYear ? req.body.startedYear : 0;
    var totalMembers = req.body.totalMembers ? req.body.totalMembers : "";
    var description = req.body.description ? req.body.description : "";
    
    let response = {};
    
    var userParams = {
        firstName: firstName,
        lastName: lastName,
        countryId: countryId,
        stateId: stateId,
        cityId: cityId,
        dob:dob,
        gender: gender,
        location: location,
        address: address
    };
    var providerParams={
        provider:id,
        description:description,
        experience:experience,
        qualificationId:qualificationId
        
    };
    var organizationParams={
        organizationId:id,
        communicator:communicator,
        communicatorPhoneNumber:communicatorPhoneNumber, 
        startedYear:startedYear,
        totalMembers:totalMembers,
        description:description
    };

    if (id != 0 && firstName!="") { 
        try{
            userService.UpdateUserProfile(id,userParams,providerParams,organizationParams,base64ImageContent,function(callback){
                if(callback.success==true)
                {
                    response = callback;
                    res.status(200).send(response);   
                }else{
                    response = { success: false, message: callback.message };
                    res.status(200).send(response);
                }
            });
            
        }catch(e){
            response = { success: false, message: "Invalid body params." };
            res.status(200).send(response);
        }
    }
    else{
        response = { success: false, message: "Invalid body params." };
        res.status(200).send(response);
    }
}


exports.LogoutUser = function (req, res, next) {
    var mobileNumber = req.body.mobileNumber;
    var refreshToken = req.body.refreshToken;
    let response = {};
    if (mobileNumber != undefined && refreshToken != undefined) {
        try{
            userService.LogoutUser(mobileNumber,refreshToken,function(callback){
                if(callback.success==true)
                {
                    response = callback;
                    res.status(200).send(response);   
                }else{
                    response = { success: false, message: callback.message };
                    res.status(200).send(response);
                }
            });
            
        }catch(e){
            response = { success: false, message: "Invalid body params." };
            res.status(200).send(response);
        }
    }
    else{
        response = { success: false, message: "Invalid body params." };
        res.status(200).send(response);
    }
}


exports.AddUpdateBankDetails = function (req, res, next) {
    var id = req.body.id ? req.body.id : 0;
    var userId = req.body.userId;
    var bankName = req.body.bankName;
    var ifsc = req.body.ifsc;
    var accountNumber = req.body.accountNumber;
    var accountName = req.body.accountName;

    let response = {};
    if (id != undefined && userId != undefined && bankName != undefined && ifsc != undefined && accountNumber != undefined && accountName != undefined ) {
        try{
        	paymentService.addBeneficiaries(id,userId,bankName,ifsc,accountNumber,accountName,function(callback){
                if(callback.success==true)
                {
                	 userService.AddUpdateBankDetails(id,userId,bankName,ifsc,accountNumber,accountName,function(callback){
                         if(callback.success==true)
                         {
                             response = callback;
                             res.status(200).send(response);   
                         }else{
                             response = { success: false, message: callback.message };
                             res.status(200).send(response);
                         }
                     });
                }else{
                    response = { success: false, message: callback.message };
                    res.status(200).send(response);
                }
            });
        }catch(e){
            response = { success: false, message: "Invalid body params." };
            res.status(200).send(response);
        }
    }
    else{
        response = { success: false, message: "Invalid body params." };
        res.status(200).send(response);
    }  
}

exports.DisableBankStatus = function (req, res, next) {
    var id = req.body.id ? req.body.id : 0;
    var userId = req.body.userId;
    let response = {};
    if (id != 0 && userId != undefined ) {
        try{
            userService.DisableBankStatus(id,userId,function(callback){
                if(callback.success==true)
                {
                    response = callback;
                    res.status(200).send(response);   
                }else{
                    response = { success: false, message: callback.message };
                    res.status(200).send(response);
                }
            }); 
        }catch(e){
            response = { success: false, message: "Invalid body params." };
            res.status(200).send(response);
        }
    }
    else{
        response = { success: false, message: "Invalid body params." };
        res.status(200).send(response);
    }    
}

exports.GetUserBankDetails = function (req, res, next) {
    var userId = req.query.userId ? req.query.userId : 0; 
    let response = {};
    if (userId != undefined ) {
        try{
            userService.GetUserBankDetails(userId,function(callback){
                if(callback.success==true)
                {
                    response = callback;
                    res.status(200).send(response);   
                }else{
                    response = { success: false, message: callback.message };
                    res.status(200).send(response);
                }
            });
        }catch(e){
            response = { success: false, message: "Invalid body params." };
            res.status(200).send(response);
        }
    }
    else{
        response = { success: false, message: "Invalid body params." };
        res.status(200).send(response);
    }   
}


exports.AddUserRating = function (req, res, next) {
    var memberId = req.body.memberId;
    var providerId = req.body.providerId;
    var rating = req.body.rating;
    var message = req.body.message;
    
    let response = {};
    if (memberId !=undefined && providerId != undefined && rating != undefined ) {
        try{
            userService.AddUserRating(memberId,providerId,rating,message,function(callback){
                if(callback.success==true)
                {
                    response = callback;
                    res.status(200).send(response);   
                }else{
                    response = { success: false, message: callback.message };
                    res.status(200).send(response);
                }
            });
            
        }catch(e){
            response = { success: false, message: "Invalid body params." };
            res.status(200).send(response);
        }
    }
    else{
        response = { success: false, message: "Invalid body params." };
        res.status(200).send(response);
    }  
}

exports.AddFavorite = function (req, res, next) {
    var memberId = req.body.memberId;
    var providerId = req.body.providerId;
    let response = {};
    if (memberId !=undefined && providerId !=undefined) {
        try{
            userService.AddFavorite(memberId,providerId,function(callback){
                if(callback.success==true)
                {
                    response = callback;
                    res.status(200).send(response);   
                }else{
                    response = { success: false, message: callback.message };
                    res.status(200).send(response);
                }
            });
            
        }catch(e){
            response = { success: false, message: "Invalid body params." };
            res.status(200).send(response);
        }
    }
    else{
        response = { success: false, message: "Invalid body params." };
        res.status(200).send(response);
    } 
}

exports.GetProvidersList = function (req, res, next) {
    var userId = req.query.userId;
    var pgSkip = req.query.pgSkip ? req.query.pgSkip : 0;
    var pgLimit = req.query.pgLimit ? req.query.pgLimit: 10;
    var sortBy = req.query.sortBy ? req.query.sortBy: "";
    var sortByFlag = req.query.sortByFlag == 1 ? " DESC" : " ASC";
    var cityId = req.query.cityId ? req.query.cityId : "";
    var qualificationId = req.query.qualificationId ? req.query.qualificationId : "";
    var serviceId = req.query.serviceId ? req.query.serviceId : "";
    var providerType = req.query.providerType ? req.query.providerType : "";
    var favorite = req.query.favorite ? req.query.favorite : "";
    var name = req.query.name ? req.query.name : "";

    let response = {};
    if (userId !=undefined) {
        try{
            userService.GetProvidersList(userId,pgSkip,pgLimit,sortBy,sortByFlag,cityId,qualificationId,serviceId,providerType,favorite,name,function(callback){
                if(callback.success==true)
                {
                    response = callback;
                    res.status(200).send(response);   
                }else{
                    response = { success: false, message: callback.message };
                    res.status(200).send(response);
                }
            });
        }catch(e){
            response = { success: false, message: "Invalid body params." };
            res.status(200).send(response);
        }
    }
    else{
        response = { success: false, message: "Invalid body params." };
        res.status(200).send(response);
    } 
}

exports.GetUserDetails = function (req, res, next) {
    var userId = req.query.userId;
    let response = {};
    if (userId !=undefined) {
        try{
            userService.GetUserDetails(userId,function(callback){
                if(callback.success==true)
                {
                    response = callback;
                    res.status(200).send(response);   
                }else{
                    response = { success: false, message: callback.message };
                    res.status(200).send(response);
                }
            });
        }catch(e){
            response = { success: false, message: "Invalid body params." };
            res.status(200).send(response);
        }
    }
    else{
        response = { success: false, message: "Invalid body params." };
        res.status(200).send(response);
    } 
}

exports.GetProviderDetails = function (req, res, next) {
    var userId = req.query.userId;
    var providerId = req.query.providerId;
    let response = {};
    if (userId !=undefined && providerId !=undefined) {
        try{
            userService.GetProviderDetails(userId,providerId,function(callback){
                if(callback.success==true)
                {
                    response = callback;
                    res.status(200).send(response);   
                }else{
                    response = { success: false, message: callback.message };
                    res.status(200).send(response);
                }
            });
        }catch(e){
            response = { success: false, message: "Invalid body params." };
            res.status(200).send(response);
        }
    }
    else{
        response = { success: false, message: "Invalid body params." };
        res.status(200).send(response);
    } 
}

exports.GetUserFeedback = function (req, res, next) {
    var providerId = req.query.providerId;
    let response = {};
    if (providerId != undefined) {
        try{
            userService.GetUserFeedback(providerId,function(callback){
                if(callback.success==true)
                {
                    response = callback;
                    res.status(200).send(response);   
                }else{
                    response = { success: false, message: callback.message };
                    res.status(200).send(response);
                }
            });
        }catch(e){
            response = { success: false, message: "Invalid body params." };
            res.status(200).send(response);
        }
    }
    else{
        response = { success: false, message: "Invalid body params." };
        res.status(200).send(response);
    } 
}

exports.CreateJob = function (req, res, next) {

    var memberId = req.body.memberId ? req.body.memberId : 0;
    var providerId = req.body.providerId ? req.body.providerId : 0;
    var serviceId = req.body.serviceId ? req.body.serviceId : 0;
    var counts = req.body.count ? req.body.count : 0;
    var description = req.body.description ? req.body.description : "";
    let response = {};
    if (memberId !=0 && providerId !=0 && serviceId!=0 && counts!=0 && description!="") {
        try{
            userService.CreateJob(memberId,providerId,serviceId,counts,description,function(callback){
                if(callback.success==true)
                {
                	//userService.insertNotification(memberId,providerId,null,1);
                    response = callback;
                    res.status(200).send(response);   
                }else{
                    response = { success: false, message: callback.message };
                    res.status(200).send(response);
                }
            });
            
        }catch(e){
            response = { success: false, message: "Invalid body params." };
            res.status(200).send(response);
        }
    }
    else{
        response = { success: false, message: "Invalid body params." };
        res.status(200).send(response);
    } 
}

exports.UpdateJobStatus = function (req, res, next) {

    var userId = req.body.userId ? req.body.userId : 0;
    var jobId = req.body.jobId ? req.body.jobId : 0;
    var statusId = req.body.statusId ? req.body.statusId : 0;
    var reason = req.body.reason ? req.body.reason : "";

    let response = {};
    if (userId !=0 && jobId !=0 && statusId!=0) {
        try{
        	if(statusId != 2){
        		userService.UpdateJobStatus(userId,jobId,statusId,reason,function(callback){
                    if(callback.success==true)
                    {
                        response = callback;
                        res.status(200).send(response);   
                    }else{
                        response = { success: false, message: callback.message };
                        res.status(200).send(response);
                    }
                });
        	}else {
        		paymentService.pay(userId,jobId,function(callback){
                    if(callback.success==true)
                    {
                        response = callback;
                        res.status(200).send(response);   
                    }else{
                        response = { success: false, message: callback.message };
                        res.status(200).send(response);
                    }
                });
        	}
        }catch(e){
            response = { success: false, message: "Invalid body params." };
            res.status(200).send(response);
        }
    }
    else{
        response = { success: false, message: "Invalid body params." };
        res.status(200).send(response);
    } 
}

exports.GetJobsList = function (req, res, next) {

    var userId = req.query.userId ? req.query.userId : 0;
    var pgSkip = req.query.pgSkip ? req.query.pgSkip : 0;
    var pgLimit = req.query.pgLimit ? req.query.pgLimit: 10;
    var sortBy = req.query.sortBy ? req.query.sortBy: "";
    var sortByFlag = req.query.sortByFlag == 1 ? " DESC" : " ASC";
    var jobId = req.query.jobId ? req.query.jobId: "";
    var memberName = req.query.memberName ? req.query.memberName: "";
    var createdDate = req.query.createdDate ? req.query.createdDate: "";
    var providerName = req.query.providerName ? req.query.providerName: "";
    let response = {};
    if (userId !=0) {
        try{
            userService.GetJobsList(userId,pgSkip,pgLimit,sortBy,sortByFlag,jobId,memberName,createdDate,providerName, function(callback){
                if(callback.success==true)
                {
                    response = callback;
                    res.status(200).send(response);   
                }else{
                    response = { success: false, message: callback.message };
                    res.status(200).send(response);
                }
            });
            
        }catch(e){
            response = { success: false, message: "Invalid body params." };
            res.status(200).send(response);
        }
    }
    else{
        response = { success: false, message: "Invalid body params." };
        res.status(200).send(response);
    } 
}

exports.GetJobDetails = function (req, res, next) {
    var userId = req.query.userId;
    var jobId = req.query.jobId;
    let response = {};
    if (userId !=undefined && jobId !=undefined) {
        try{
            userService.GetJobDetails(userId,jobId,function(callback){
                if(callback.success==true)
                {
                    response = callback;
                    res.status(200).send(response);   
                }else{
                    response = { success: false, message: callback.message };
                    res.status(200).send(response);
                }
            });
        }catch(e){
            response = { success: false, message: "Invalid body params." };
            res.status(200).send(response);
        }
    }
    else{
        response = { success: false, message: "Invalid body params." };
        res.status(200).send(response);
    } 
}

exports.GetDashboardDetails = function (req, res, next) {
    var userId = req.query.userId;
    let response = {};
    if (userId !=undefined) {
        try{
            userService.GetDashboardDetails(userId,function(callback){
                if(callback.success==true)
                {
                    response = callback;
                    res.status(200).send(response);   
                }else{
                    response = { success: false, message: callback.message };
                    res.status(200).send(response);
                }
            });
        }catch(e){
            response = { success: false, message: "Invalid body params." };
            res.status(200).send(response);
        }
    }
    else{
        response = { success: false, message: "Invalid body params." };
        res.status(200).send(response);
    } 
}

exports.GetUsers = function (req, res, next) {

    var userType = req.query.userType ? req.query.userType : "";
    var pgSkip = req.query.pgSkip ? req.query.pgSkip : 0;
    var pgLimit = req.query.pgLimit ? req.query.pgLimit: 10;
    var sortBy = req.query.sortBy ? req.query.sortBy: "";
    var sortByFlag = req.query.sortByFlag == 1 ? " DESC" : " ASC";
    var userName = req.query.userName ? req.query.userName: "";
    let response = {};
    if (userType !="") {
        try{
            userService.GetUsers(userType,pgSkip,pgLimit,sortBy,sortByFlag,userName, function(callback){
                if(callback.success==true)
                {
                    response = callback;
                    res.status(200).send(response);   
                }else{
                    response = { success: false, message: callback.message };
                    res.status(200).send(response);
                }
            });
        }catch(e){
            response = { success: false, message: "Invalid body params." };
            res.status(200).send(response);
        }
    }
    else{
        response = { success: false, message: "Invalid body params." };
        res.status(200).send(response);
    } 
}

exports.GetAllJobs = function (req, res, next) {
    var pgSkip = req.query.pgSkip ? req.query.pgSkip : 0;
    var pgLimit = req.query.pgLimit ? req.query.pgLimit: 10;
    var jobId = req.query.jobId ? req.query.jobId: "";
    var memberName = req.query.memberName ? req.query.memberName: "";
    var createdDate = req.query.createdDate ? req.query.createdDate: "";
    var providerName = req.query.providerName ? req.query.providerName: "";
    var sortBy = req.query.sortBy ? req.query.sortBy: "";
    var sortByFlagBoolean = req.query.sortByFlag ? req.query.sortByFlag: 0;
    var sortByFlag = 'ASC';
    if(sortByFlagBoolean ==1){
    	var sortByFlag = 'DESC';
    }
    let response = {};
        try{
            userService.GetAllJobs(pgSkip,pgLimit,jobId,memberName,createdDate,providerName,sortBy,sortByFlag, function(callback){
                if(callback.success==true)
                {
                    response = callback;
                    res.status(200).send(response);   
                }else{
                    response = { success: false, message: callback.message };
                    res.status(200).send(response);
                }
            });
        }catch(e){
            response = { success: false, message: "Invalid body params." };
            res.status(200).send(response);
        }
}

exports.GetPriceConstants = function (req, res, next) {
    let response = {};
        try{
            userService.GetPriceConstants(function(callback){
                if(callback.success==true)
                {
                    response = callback;
                    res.status(200).send(response);   
                }else{
                    response = { success: false, message: callback.message };
                    res.status(200).send(response);
                }
            });
        }catch(e){
            response = { success: false, message: "Invalid body params." };
            res.status(200).send(response);
        }
}


 exports.GetUserCommentsOnProviderId = function (req, res, next) {

     var providerId = req.query.providerId;
    let response = {};
     if (providerId !=undefined) {
         try{
             userService.GetUserCommentsOnProviderId(providerId,function(callback){
                 if(callback.success==true)
                 {
                     response = callback;
                     res.status(200).send(response);   
                 }else{
                     response = { success: false, message: callback.message };
                     res.status(200).send(response);
                 }
             });
         }catch(e){
             response = { success: false, message: "Invalid body params." };
             res.status(200).send(response);
         }
     }
     else{
         response = { success: false, message: "Invalid body params." };
         res.status(200).send(response);
     } 
 }

 exports.UploadFiles = function (req, res, next) {
     var userId = req.body.userId;
     var base64Content = req.body.base64Content;
     var flag = req.body.flag;//if P then update the imageURL of the user
     var fileName = req.body.fileName;
     let response={};
     try{
         if (flag != undefined && userId != undefined && base64Content != undefined) {
             userService.UploadDocuments(flag,userId,base64Content,fileName,function(callback){
                 if(callback.success==true)
                 {
                     response = {success:true,message: callback.message};        
                     res.status(200).send(response);
                 }else{
                     response = { success: false, message: callback.message };
                     res.status(200).send(response);  
                 }
             });            
         } else {
             response = { success: false, message: "Invalid body params." };
             res.status(200).send(response);
         }   
     }catch(e){
         response = { success: false, message: "Invalid body params." };
         res.status(200).send(response);
     }
 }

 exports.UpdateProviderPrice = function (req, res, next) {

     var providerId = req.body.providerId;
     var servicePrices = req.body.servicePrices ?  req.body.servicePrices : [];
     let response = {};
     if (providerId !=undefined && servicePrices.length > 0) {
         try{
             userService.UpdateProviderPrice(providerId,servicePrices,function(callback){
                 if(callback.success==true)
                 {
                     response = callback;
                     res.status(200).send(response);   
                 }else{
                     response = { success: false, message: callback.message };
                     res.status(200).send(response);
                 }
             });
            
         }catch(e){
             response = { success: false, message: "Invalid body params." };
             res.status(200).send(response);
         }
     }
     else{
         response = { success: false, message: "Invalid body params." };
         res.status(200).send(response);
     } 
 }
 
 exports.GetNotifications = function (req, res, next) {

	    var userId = req.query.userId;
	    var viewStatus = req.query.viewStatus ? req.query.viewStatus: null;
	    var pgSkip = req.query.pgSkip ? req.query.pgSkip: 0;
	    var pgLimit = req.query.pgLimit ? req.query.pgLimit: 0;
	    
	    let response = {};
	    if (userId !=undefined) {
	        try{
	            userService.GetNotifications(userId,viewStatus,pgSkip,pgLimit,function(callback){
	                if(callback.success==true)
	                {
	                    response = callback;
	                    res.status(200).send(response);   
	                }else{
	                    response = { success: false, message: callback.message };
	                    res.status(200).send(response);
	                }
	            });
	            
	        }catch(e){
	            response = { success: false, message: "Invalid body params." };
	            res.status(200).send(response);
	        }
	    }
	    else{
	        response = { success: false, message: "Invalid body params." };
	        res.status(200).send(response);
	    } 
}
 
 exports.UpdateNotification = function (req, res, next) {

	    var notificationId = req.body.notificationId;
	    var action = req.body.action;
	    let response = {};
	    if (notificationId != undefined) { 
	        try{
	            userService.UpdateNotification(notificationId,action,function(callback){
	                if(callback.success==true)
	                {
	                    response = callback;
	                    res.status(200).send(response);   
	                }else{
	                    response = { success: false, message: callback.message };
	                    res.status(200).send(response);
	                }
	            });
	        }catch(e){
	            response = { success: false, message: "Invalid body params." };
	            res.status(200).send(response);
	        }
	    }
	    else{
	        response = { success: false, message: "Invalid body params." };
	        res.status(200).send(response);
	    }
	}