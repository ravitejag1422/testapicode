var paymentHelper = require('../paymentHelper');
var helper = require('../helper');
var readConfig = require('read-config'), config = readConfig('./config.json', {
	override : true
});

exports.pay = function(memberId, jobId, callback) {
	let response = {};
	let getBillableDetails = "call GetBillingDetails(?,?)";
	let paymentInitQuery = " INSERT INTO payment_audit(orderId,paymentURL)VALUES(?,?) ";
	try {
		helper.getConnection(function(fail, connection, pool) {
					if (!fail) {
						connection.query(getBillableDetails,[ memberId, jobId ],function(err, result) {
											if (!err) {
												if (result[0] != undefined && result[0].length > 0) {
													var queryResult = result[0];
													var totalAmount;
													var orderNote = "test payment";
													var customerName;
													var email;
													var mobileNumber;
													var paymentURL;
													queryResult.forEach(function(item) {
																totalAmount = item.totalPrice;
																customerName = item.name;
																email = item.email;
																mobileNumber = item.mobileNumber;
																paymentURL = item.paymentURL
															});
													// if order already placed
                                                    if(paymentURL != null && paymentURL != ""){
                                                    	var finalResult ={};
                                                    	finalResult.status = 'OK';
                                                    	finalResult.paymentLink = paymentURL;
                                                    	response = {
																success : true,
																message : 'Order created successfully',
																data : finalResult
															};
                                                    	connection.release();
														pool.end();
														callback(response);
                                                    }
                                                    else{
													paymentHelper.placeOrder(jobId,totalAmount,orderNote,customerName,email,mobileNumber,memberId, jobId,function(orderCallback) {
																		if (orderCallback.success == true) {
																			
																			connection.query(paymentInitQuery, [ jobId, orderCallback.message.paymentLink ], function(aerror, aresult) {
																				
																			});
																			
																			response = {
																				success : true,
																				message : 'Order created successfully',
																				data : orderCallback.message
																			};
																			// keep information in audit table
																			
																			let auditQuery = "INSERT INTO audit(userId,message,jobId)VALUES(?,?,?)";
																			var auditMessage = "Payment "+totalAmount + " INR, Initiated.";
																			connection.query(auditQuery, [ memberId, auditMessage,jobId ], function(aerror, aresult) {
																				connection.release();
																				pool.end();		
																				callback(response);
																			});
																		} else {
																			
																			response = {
																				success : false,
																				message : 'Error placing in order',
																				data : orderCallback.message
																			};
																			connection.release();
																			pool.end();
																			callback(response);
																		}
																	});
												     }
													
												} else {
													response = {success : false,message : "No data found with teh given data"};
													connection.release();
													pool.end();
													callback(response);
												}
											} else {
												response = {success : false,message : "Error in fetching the favorites"};
												connection.release();
												pool.end();
												callback(response);
											}
										});
					} else {
						response = {success : false,message : "Error in connection."};
						callback(response);
					}
				});
	} catch (e) {
		response = {success : false,message : "Invalid body params."};
		callback(response);
	}

}

exports.payout = function(providerId,amount,transferId,jobId) {
	console.log('providerid = '+providerId);
	console.log('amount = '+amount);
	console.log('transferId = '+transferId);
	console.log('jobId = '+jobId);
	
	let response = {};
	try{
		paymentHelper.getPayoutToken(function(tokenCallback) {
			if (tokenCallback.success == true) {
				var token = tokenCallback.message;
				paymentHelper.transferAmount(providerId,amount,transferId,token,function(transferCallback) {
					if(transferCallback.status == true){
						// close the job by changing the job status
						exports.closeJob(jobId);
					}else{
						console.log("Error in transfering money to the provider " + providerId + " due to "+transferCallback.message.message);
					}
					// payout audit
					var data = transferCallback.message.data ? transferCallback.message.data : {};
					exports.payoutAudit(jobId,providerId,amount,transferCallback.message.subCode,transferCallback.message.message,transferId,data);
				});
			}else{
				response = {success : false,message : "Error in generating token from payment gateway side. For payout method"};
				console.log(response);
			}
		}); 
	}catch (e) {
		response = {success : false,message : "Exception occured in payout menthod "+ e};
		console.log(response);
	}
}


exports.payoutAudit = function(jobId,providerId,amount,payoutStatus,message,transactionId,data) {
	let response = {};
	try{
		helper.getConnection(function(fail, connection, pool) {
			if (!fail) {
				let auditQuery = "INSERT INTO payout_audit(jobId,providerId,amount,payoutStatus,message,transactionId,data)VALUES(?,?,?,?,?,?,?)";
				connection.query(auditQuery, [ jobId, providerId, amount,payoutStatus,message,transactionId,JSON.stringify(data) ], function(aerror, aresult) {
					connection.release();
					pool.end();		
					console.log(response);
				});
			}else {
				response = {success : false,message : "Error in connection."};
				console.log(response);
			}
		});
	}catch (e) {
		response = {success : false,message : "Exception occured while inserting data into payment audit table."};
		console.log(response);
	}
}

exports.closeJob = function(id) {
	let response = {};
	try{
		helper.getConnection(function(fail, connection, pool) {
			if (!fail) {
				let updateQuery = "Update job set status=10,previousStatus=8 WHERE id = ?"
				connection.query(updateQuery, [ id ], function(aerror, aresult) {
					connection.release();
					pool.end();		
				});
			}else {
				response = {success : false,message : "Error in closing the job." +id };
				console.log(response);
			}
		});
	}catch (e) {
		response = {success : false,message : "Invalid body params."};
		console.log(response);
	}
}

exports.audit = function(userId,message,jobId) {
	let response = {};
	try{
		helper.getConnection(function(fail, connection, pool) {
			if (!fail) {
				let auditQuery = "INSERT INTO audit(userId,message,jobId)VALUES(?,?,?)";
				connection.query(auditQuery, [ userId, message, jobId ], function(aerror, aresult) {
					connection.release();
					pool.end();		
					console.log(response);
				});
			}else {
				response = {success : false,message : "Error in connection."};
				console.log(response);
			}
		});
	}catch (e) {
		response = {success : false,message : "Invalid body params."};
		console.log(response);
	}
}


exports.sendInvoice = function(userId,jobId,orderId,referenceId) {
	let response = {};
	try{
		helper.getConnection(function(fail, connection, pool) {
			if (!fail) {
				let query = "SELECT u.email,CONCAT(u.firstName,' ',IFNULL(u.middleName,''),' ',IFNULL(u.lastName,'')) AS `name`,s.name AS serviceName,j.count,j.totalCost,j.GST,CONCAT (CONCAT(j.adminFee) + j.serviceCost)AS serviceCost,t1.templateURL FROM `user` u, job j, services s, (SELECT templateURL FROM emailTemplate WHERE id=11) t1 WHERE u.id = ? AND j.id = ? AND s.id = j.serviceId";
				connection.query(query, [userId,jobId],  function (error, results) {
					if (!error) { 
						var details = results[0];
						var emailTableContent = '<td>1</td><td>' +details.serviceName + '</td><td>'+details.count+'</td><td>'+details.serviceCost+'</td>';
						
						var subject = 'Invoice for Job id - '+jobId;
						var cc = '';
						var bcc = '';
						 var emailbody=[{
							 InvoiceNo: jobId,
							 name:details.name,
							 email:details.email,
							 InvoiceDate: new Date().toISOString().split('T')[0],
							 subtotal:details.serviceCost,
							 GST:details.GST + '%',
							 total:details.totalCost,
							 admin_email:config.supportEmail,
							 details:emailTableContent,
							 orderId:orderId
                         }];
                         var fileName ="";
                         var fileContent="";
						
						helper.AWSSendMail(details.email, subject, cc, bcc, details.templateURL,emailbody,fileName,fileContent,function(callbackProviderMail){
							if(callbackProviderMail.success==true)
							{
								response = { success: true, message: 'Invoice mail sent to user for job id ' + jobId };
								//callback(response);
								console.log(response);
							}else{
								response = { success: false, message: 'Error in sending mail' };
								//callback(response);
								console.log(response);
							}
						});
			}else {
				response = {success : false,message : "Error in connection."};
				console.log(response);
			}
		});
	}else {
		response = {success : false,message : "Error in connection."};
		console.log(response);
	}
	});
	}catch (e) {
		response = {success : false,message : "Invalid body params."};
		console.log(response);
	}
}


exports.paymentAudit = function(orderId,orderAmount,referenceId,txStatus,paymentMode,txMsg,txTime,signature) {
	let response = {};
	try{
		helper.getConnection(function(fail, connection, pool) {
			if (!fail) {
				
				let auditQuery = "Update payment_audit set orderAmount=?,referenceId=?,txStatus=?,paymentMode=?,txMsg=?,txTime=?,signature=?  WHERE orderId = ?"
					
				connection.query(auditQuery, [ orderAmount,referenceId,txStatus,paymentMode,txMsg,txTime,signature,orderId ], function(aerror, aresult) {
					connection.release();
					pool.end();		
					//callback(response);
				});
			}else {
				response = {success : false,message : "Error in connection."};
				console.log(response);
			}
		});
	}catch (e) {
		response = {success : false,message : "Invalid body params."};
		console.log(response);
	}
}

exports.addBeneficiaries = function(id,userId,bankName,ifsc,accountNumber,accountName,callback) {
	let response = {};
	var token ="";
	var getUserDetailsQuery = "SELECT u.email,u.mobileNumber,u.address,c.name AS cname, s.name AS sname FROM `user` u,country c,state s, city ct WHERE c.id = u.countryId AND s.id = u.stateId AND u.id = ?"
	
	try{	
        helper.getConnection(function (fail, connection, pool) {
            if (!fail) {   
                connection.query(getUserDetailsQuery, [userId],  function (err, result) {
                    if (!err) {
                        if(result.length == 0){
                            response = { success: false, message: 'Invalid data/refreshToken' };
                            connection.release();
                            pool.end();
                            callback(response);
                        }else{
                        	connection.release();
                            pool.end();
                            var userInfo = result[0];
                            
                         // get token.
                    		paymentHelper.getPayoutToken(function(tokenCallback) {
                    			if (tokenCallback.success == true) {
                    				token = tokenCallback.message;
                    				
                    				// already data available, So first delete Beneficiaries 
                    				if(id != 0 ){
                    					paymentHelper.deleteBeneficiaries(token,userId,function(deleteCallback) {
                    						if(deleteCallback.success == true){
                    							//addBeneficiaries
                    							paymentHelper.addBeneficiaries(userId,accountName,userInfo.email,userInfo.mobileNumber,accountNumber,ifsc,userInfo.address,userInfo.cname,userInfo.sname,"",token,function(addCallback) {
                            						if(addCallback.success == true){
                            							response = {success : true,message : "Successfully added Beneficiaries details into payment gateway side"};
                            							callback(response);
                            						}else{
                            							response = {success : false,message : addCallback.message};
                            							callback(response);
                            						}
                            					});
                    						}else{
                    							response = {success : false,message : "Error in deleting account from payment gateway side."+deleteCallback.message};
                    							callback(response);
                    						}
                    					});
                    				}
                    				else{
                    					paymentHelper.addBeneficiaries(userId,accountName,userInfo.email,userInfo.mobileNumber,accountNumber,ifsc,userInfo.address,userInfo.cname,userInfo.sname,"",token,function(addCallback) {
                    						if(addCallback.success == true){
                    							response = {success : true,message : "Successfully added Beneficiaries details into payment gateway side"};
                    							callback(response);
                    						}else{
                    							response = {success : false,message : addCallback.message};
                    							callback(response);
                    						}
                    					});
                    				}
                    				
                    			}else{
                    				response = {success : false,message : "Error in generating token from payment gateway side."};
                    				callback(response);
                    			}
                    		});  
                        } 
                    } else {
                        response = { success: false, message: 'Invalid data/refreshToken' };
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
        
		
	}catch (e) {
		response = {success : false,message : "Invalid body params."};
		callback(response);
	}
}
