var querystring = require('querystring');
var request = require('request');
const util = require('util')
var readConfig = require('read-config'),
    config = readConfig('./config.json', { override: true });

exports.placeOrder = function (orderId,totalAmount,orderNote,customerName,email,mobileNumber,memberId, jobId,callback) {
   
	var cashFreeData = config.environment == "TEST" ? config.externalRESTCalls.payment.test : config.externalRESTCalls.payment.prod;
	
	var data = {
        "appId" : cashFreeData.appId,
        "secretKey":cashFreeData.secretKey,
        "orderId":orderId,
        "orderAmount":totalAmount,
        "orderCurrency":"INR",
        "orderNote":orderNote,
        "customerEmail":email,
        "customerName":customerName,
        "customerPhone":mobileNumber,
        "returnUrl":cashFreeData.returnUrl,
        "notifyUrl":cashFreeData.notifyUrl+"?userId="+memberId+"&jobId="+jobId
    }
   
	var formData = querystring.stringify(data);
	var contentLength = formData.length;
		
	request({
	    headers: {
	      'Content-Length': contentLength,
	      'Content-Type': 'application/x-www-form-urlencoded'
	    },
	    uri: cashFreeData.cashFreeUrl,
	    body: formData,
	    method: 'POST'
	  }, function (error,response,body) {
		  
            if(error){
                response = { success: false, message: "Error in placing order" };
                callback(response);
            }else{
            	//console.log(util.inspect(response, {showHidden: false, depth: null}))
            	// console.log(util.inspect(body, {showHidden: false, depth: null}))
            	var res = JSON.parse(body);
                if(res.status !=undefined && res.status == 'OK'){
                    response = { success: true, message: res };
                    callback(response);
                }else{
                    response = { success: false,message: res };
                    callback(response);
                } 
            }
        });
   
};

exports.getPayoutToken = function (callback) {
	
	var cashFreeData = config.environment == "TEST" ? config.externalRESTCalls.payment.test : config.externalRESTCalls.payment.prod;
	
	request({url: cashFreeData.cashFreePayoutURL+"authorize",method: "POST",
        json: false,   // <--Very important!!!
        headers: {
            'X-Client-Id': cashFreeData.cashFreeClientId,
            'X-Client-Secret': cashFreeData.clientSecret
          }
       
    },function (error, response, body) {
            if(error){
                response = { success: false, message: error };
                callback(response);
            }else{
            	//console.log(util.inspect(response, {showHidden: false, depth: null}))
            	//console.log(util.inspect(body, {showHidden: false, depth: null}))
            	var res = JSON.parse(body);
            	
                if(res.status !=undefined && res.status == 'SUCCESS'){
                    response = { success: true, message: res.data.token };
                    callback(response);
                }else{
                    response = { success: false,message: res };
                    callback(response);
                } 
            }
        });
	
}

exports.deleteBeneficiaries = function (token,userId,callback) {
	var cashFreeData = config.environment == "TEST" ? config.externalRESTCalls.payment.test : config.externalRESTCalls.payment.prod;
	var data = {
			"beneId": userId.toString(),
	};
	
	request({url: cashFreeData.cashFreePayoutURL+"removeBeneficiary",method: "POST",
        json: false,   // <--Very important!!!
        body:JSON.stringify(data),
        headers: {
            'Authorization': "Bearer "+token
          }
    },function (error, response, body) {
            if(error){
                response = { success: false, message: error };
                callback(response);
            }else{
            	// console.log(util.inspect(response, {showHidden: false, depth: null}))
            	//console.log(util.inspect(body, {showHidden: false, depth: null}))
            	
            	var res = JSON.parse(body);
                if(res.subCode !=undefined && res.subCode == '200'){
                    response = { success: true, message: res.message};
                    callback(response);
                }else{
                    response = { success: false,message: res };
                    callback(response);
                } 
            }
        });
}


exports.addBeneficiaries = function (userId,name,email,phone,bankAccount,ifsc,address1,city,state,pincode,token,callback) {
	
	var cashFreeData = config.environment == "TEST" ? config.externalRESTCalls.payment.test : config.externalRESTCalls.payment.prod;
	
	if(address1 == null || address1 == ""){
		address1 = "address";
	}
	var data = {
				  "beneId": userId.toString(),
				  "name": name,
				  "email": email,
				  "phone": phone,
				  "bankAccount": bankAccount,
				  "ifsc": ifsc,
				  "address1": address1,
				  "city": "",
				  "state": "",
				  "pincode": ""
	        };
	
	
	request({url: cashFreeData.cashFreePayoutURL+"addBeneficiary",method: "POST",
        json: false,   // <--Very important!!!
        body:JSON.stringify(data),
        headers: {
            'Authorization': "Bearer "+token
          }
    },function (error, response, body) {
            if(error){
                response = { success: false, message: error };
                callback(response);
            }else{
            	var res = JSON.parse(body);
            	// console.log(util.inspect(response, {showHidden: false, depth: null}))
            	// console.log(util.inspect(body, {showHidden: false, depth: null}))
                if(res.subCode !=undefined && res.subCode == '200'){
                	console.log(res.message);
                    response = { success: true, message: res.message };
                    callback(response);
                }else{
                    response = { success: false,message: res };
                    callback(response);
                } 
            }
        });
}

exports.transferAmount = function (providerId,amount,transferId,token,callback) {
	var cashFreeData = config.environment == "TEST" ? config.externalRESTCalls.payment.test : config.externalRESTCalls.payment.prod;
	var data = {
				  "beneId": providerId.toString(),
				  "amount": amount,
				  "transferId": transferId
	        };
	request({url: cashFreeData.cashFreePayoutURL+"requestTransfer",method: "POST",
        json: false,   // <--Very important!!!
        body:JSON.stringify(data),
        headers: {
            'Authorization': "Bearer "+token
          }
    },function (error, response, body) {
            if(error){
                response = { success: false, message: error };
                callback(response);
            }else{
            	var res = JSON.parse(body);
            	//console.log(util.inspect(response, {showHidden: false, depth: null}))
            	//console.log(util.inspect(body, {showHidden: false, depth: null}))
                if(res.subCode !=undefined && res.subCode == '200'){
                	// console.log(res.message);
                    response = { success: true, message: res };
                    callback(response);
                }else{
                	// console.log(res.message);
                    response = { success: false,message: res };
                    callback(response);
                } 
            }
        });
}
