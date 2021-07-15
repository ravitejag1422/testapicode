var readConfig = require('read-config'),
    config = readConfig('./config.json', { override: true });
var paymentService = require( '../Service/PaymentService.js' );
var userService = require( '../Service/UserService.js' );


exports.pay = function (req, res, next) {
    var memberId = req.body.memberId;
    var jobId = req.body.jobId;
    let response = {};
    if (memberId !=undefined && jobId !=undefined) {
       try{
    	   paymentService.pay(memberId,jobId,function(callback){
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
            response = { success: false, message: "Invalid body params" };
            res.status(200).send(response);
        }
    }
    else{
        response = { success: false, message: "Invalid body params." };
        res.status(200).send(response);
    } 
}

exports.paymentStatus = function (req, res, next) {
	//console.log("inside payment success function..");
	var txStatus = req.body.txStatus;
    var userId = req.query.userId;
    var jobId  = req.query.jobId;
    var statusId = 2 // after payment success
    var reason = "";
    var message = "Payment is success."
    
    // store transaction details in payment audit table.
    paymentService.paymentAudit(req.body.orderId,req.body.orderAmount,req.body.referenceId,req.body.txStatus,req.body.paymentMode,req.body.txMsg,req.body.txTime,req.body.signature);
    
    let response = {};
    if (userId !=undefined && jobId !=undefined) {
       try{
    	   if(txStatus =='SUCCESS'){
    		   paymentService.audit(userId,message,jobId);
    		   paymentService.sendInvoice(userId,jobId,req.body.orderId,req.body.referenceId);
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
    	   }else{
    		   response = { success: false, message: 'Transaction '+ txStatus};
               res.status(200).send(response);
    	   }
        }catch(e){
            response = { success: false, message: "Invalid body params" };
            res.status(200).send(response);
        }
    }
    else{
        response = { success: false, message: "Invalid body params." };
        res.status(200).send(response);
    }
}