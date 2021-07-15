var readConfig = require('read-config'),
    config = readConfig('./config.json', { override: true });

var masterService = require( '../Service/MasterService.js' );

exports.GetCountry = function (req, res, next) {
	var status =req.query.status ? req.query.status : null;
    let response = {};
    let selectQuery = config.sqlMasterQueries.country;
    if(status != null){
    	selectQuery = selectQuery +" WHERE STATUS = "+status;
    }
    let params =[];
    try{
        masterService.getMasterTableDetails(selectQuery,params,function(callback){
            if(callback.success==true)
            {
                response = callback;
                res.status(200).send(response);   
            }else{
                response = { success: false, message: 'Error in fetching countries' };
                res.status(200).send(response);
            }
        });
    }catch(e){
        response = { success: false, message: "Invalid body params." };
        res.status(200).send(response);
    }  
}

exports.GetBanks = function (req, res, next) {
    let response = {};
    let selectQuery = config.sqlMasterQueries.bank;
    let params =[];
    try{
        masterService.getMasterTableDetails(selectQuery,params,function(callback){
            if(callback.success==true)
            {
                response = callback;
                res.status(200).send(response);   
            }else{
                response = { success: false, message: 'Error in fetching countries' };
                res.status(200).send(response);
            }
        });
    }catch(e){
        response = { success: false, message: "Invalid body params." };
        res.status(200).send(response);
    }
}

exports.GetState = function (req, res, next) {
    var countryId =req.query.countryId ? req.query.countryId : "";
    var status =req.query.status ? req.query.status : null;
    let response = {};
    let selectQuery = "";
    let params = [];
    if(countryId != ""){
    	selectQuery = config.sqlMasterQueries.state;
        params =[{countryId:countryId}];
    }else{
    	selectQuery = config.sqlMasterQueries.allStates;
    }
    if(status != null){
    	selectQuery = selectQuery +" AND s.status = "+status;
    }
        try{
            masterService.getMasterTableDetails(selectQuery,params,function(callback){
                if(callback.success==true)
                {
                    response = callback;
                    res.status(200).send(response);   
                }else{
                    response = { success: false, message: 'Error in fetching states' };
                    res.status(200).send(response);
                }
            });
          
        }catch(e){
            response = { success: false, message: "Invalid body params." };
            res.status(200).send(response);
        }
}

exports.GetCity = function (req, res, next) {
    var stateId =req.query.stateId ? req.query.stateId : "";
    var status =req.query.status ? req.query.status : null;
    let response = {};
    let selectQuery = "";
    let params = [];
    if(stateId != ""){
    	selectQuery = config.sqlMasterQueries.city;
        params =[{stateId:stateId}];
        
    }else{
    	selectQuery = config.sqlMasterQueries.allCities;
    }
    if(status != null){
        	selectQuery = selectQuery +" AND ct.STATUS = "+status;
        }
        try{
            masterService.getMasterTableDetails(selectQuery,params,function(callback){
                if(callback.success==true)
                {
                    response = callback;
                    res.status(200).send(response);   
                }else{
                    response = { success: false, message: 'Error in fetching cities' };
                    res.status(200).send(response);
                }
            });
        }catch(e){
            response = { success: false, message: "Invalid body params." };
            res.status(200).send(response);
        }
}

exports.GetQualification = function (req, res, next) {
	var status =req.query.status ? req.query.status : null;
    let response = {};
    let selectQuery = config.sqlMasterQueries.qualification;
    let params =[];
    if(status != null){
        selectQuery = selectQuery +" WHERE STATUS = "+status;
     }
    try{
        masterService.getMasterTableDetails(selectQuery,params,function(callback){
            if(callback.success==true)
            {
                response = callback;
                res.status(200).send(response);   
            }else{
                response = { success: false, message: 'Error in fetching qualifications' };
                res.status(200).send(response);
            }
        });
    }catch(e){
        response = { success: false, message: "Invalid body params." };
        res.status(200).send(response);
    }
}

exports.GetServices = function (req, res, next) {
	var status =req.query.status ? req.query.status : null;
    let response = {};
    let selectQuery = config.sqlMasterQueries.service;
    let params =[];
    if(status != null){
    	selectQuery = selectQuery +" WHERE STATUS = "+status;
    }
    try{
        masterService.getMasterTableDetails(selectQuery,params,function(callback){
            if(callback.success==true)
            {
                response = callback;
                res.status(200).send(response);   
            }else{
                response = { success: false, message: 'Error in fetching services' };
                res.status(200).send(response);
            }
        });
    }catch(e){
        response = { success: false, message: "Invalid body params." };
        res.status(200).send(response);
    }
}

exports.AddUpdateService = function (req, res, next) {
    var id = req.body.id ? req.body.id : 0;
    var name = req.body.name;
    var description = req.body.description ? req.body.description : "";
    var status = req.body.status;
    let response = {};
    var existsQuery = config.sqlMasterQueries.checkServiceExistInsert;
    var existsParams =[{name:name}];
    var query = config.sqlMasterQueries.addService;
    var params =[{name:name,description:description,status:status}];
    var message = " successfully added the record";
    if(id !=0){
        existsQuery = config.sqlMasterQueries.checkServiceExistUpdate;
        existsParams =[{name:name,id:id}];
        query = config.sqlMasterQueries.updateService;
        params =[{id:id,name:name,description:description,status:status}];
        message = " successfully updated the record";
    }
    if (id !=undefined && name != undefined) {
        try{
            masterService.getMasterTableDetails(existsQuery,existsParams,function(callback){
                if(callback.success==true)
                {
                    if(callback.data.length >0){
                        response = { success: false, message: "Record already exists" };
                        res.status(200).send(response);
                    }else{
                        masterService.AddUpdateMasterTableDetails(query,params,function(callback){
                            if(callback.success==true)
                            {
                                response = {success:true,message: message};  
                                res.status(200).send(response);   
                            }else{
                                response = { success: false, message: callback.message };
                                res.status(200).send(response);
                            }
                        });  
                    }
                    
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

exports.AddUpdateCountry = function (req, res, next) {
    var id = req.body.id ? req.body.id : 0;
    var name = req.body.name;
    var description = req.body.description ? req.body.description : "";
    var status = req.body.status;
    let response = {};
    var existsQuery = config.sqlMasterQueries.checkCountryExistInsert;
    var existsParams =[{name:name}];
    var query = config.sqlMasterQueries.addCountry;
    var params =[{name:name,description:description,status:status}];
    var message = " successfully added the record";
    if(id !=0){
        existsQuery = config.sqlMasterQueries.checkCountryExistUpdate;
        existsParams =[{name:name,id:id}];
        query = config.sqlMasterQueries.updateCountry;
        params =[{id:id,name:name,description:description,status:status}];
        message = " successfully updated the record";
    }
    if (id !=undefined && name != undefined) {
        try{
            masterService.getMasterTableDetails(existsQuery,existsParams,function(callback){
                if(callback.success==true)
                {
                    if(callback.data.length >0){
                        response = { success: false, message: "Record already exists" };
                        res.status(200).send(response);
                    }else{
                        masterService.AddUpdateMasterTableDetails(query,params,function(callback){
                            if(callback.success==true)
                            {
                                response = {success:true,message: message};  
                                res.status(200).send(response);   
                            }else{
                                response = { success: false, message: callback.message };
                                res.status(200).send(response);
                            }
                        });  
                    }
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

exports.AddUpdateState = function (req, res, next) {
    var id = req.body.id ? req.body.id : 0;
    var name = req.body.name;
    var description = req.body.description ? req.body.description : "";
    var countryId =req.body.countryId ? req.body.countryId : 0;
    var status = req.body.status;
    let response = {};
    var existsQuery = config.sqlMasterQueries.checkStateExistInsert;
    var existsParams =[{name:name,countryId:countryId}];
    var query = config.sqlMasterQueries.addState;
    var params =[{name:name,description:description,countryId:countryId,status:status}];
    var message = " successfully added the record";
    if(id !=0){
        existsQuery = config.sqlMasterQueries.checkStateExistUpdate;
        existsParams =[{name:name,countryId:countryId,id:id}];
        query = config.sqlMasterQueries.updateState;
        params =[{id:id,name:name,description:description,countryId:countryId,status:status}];
        message = " successfully updated the record";
    }
    if (id !=undefined && name != undefined && countryId !=0) {
        try{
            masterService.getMasterTableDetails(existsQuery,existsParams,function(callback){
                if(callback.success==true)
                {
                    if(callback.data.length >0){
                        response = { success: false, message: "Record already exists" };
                        res.status(200).send(response);
                    }else{
                        masterService.AddUpdateMasterTableDetails(query,params,function(callback){
                            if(callback.success==true)
                            {
                                response = {success:true,message: message};  
                                res.status(200).send(response);   
                            }else{
                                response = { success: false, message: callback.message };
                                res.status(200).send(response);
                            }
                        });  
                    }
                    
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

exports.AddUpdateCity = function (req, res, next) {
    var id = req.body.id ? req.body.id : 0;
    var name = req.body.name;
    var description = req.body.description ? req.body.description : "";
    var stateId =req.body.stateId ? req.body.stateId : 0;
    var status = req.body.status;
    let response = {};
    var existsQuery = config.sqlMasterQueries.checkCityExistInsert;
    var existsParams =[{name:name,stateId:stateId}];
    var query = config.sqlMasterQueries.addCity;
    var params =[{name:name,description:description,stateId:stateId,status:status}];
    var message = " successfully added the record";
    if(id !=0){
        existsQuery = config.sqlMasterQueries.checkCityExistUpdate;
        existsParams =[{name:name,stateId:stateId,id:id}];
        query = config.sqlMasterQueries.updateCity;
        params =[{id:id,name:name,description:description,stateId:stateId,status:status}];
        message = " successfully updated the record";
    }
    if (id !=undefined && name != undefined && stateId !=0) {
        try{
            masterService.getMasterTableDetails(existsQuery,existsParams,function(callback){
                if(callback.success==true)
                {
                    if(callback.data.length >0){
                        response = { success: false, message: "Record already exists" };
                        res.status(200).send(response);
                    }else{
                        masterService.AddUpdateMasterTableDetails(query,params,function(callback){
                            if(callback.success==true)
                            {
                                response = {success:true,message: message};  
                                res.status(200).send(response);   
                            }else{
                                response = { success: false, message: callback.message };
                                res.status(200).send(response);
                            }
                        });  
                    }
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

exports.AddUpdateQualification = function (req, res, next) {
    var id = req.body.id ? req.body.id : 0;
    var name = req.body.name;
    var description = req.body.description ? req.body.description : "";
    var status = req.body.status;
    let response = {};
    var existsQuery = config.sqlMasterQueries.checkQualificationExistInsert;
    var existsParams =[{name:name}];
    var query = config.sqlMasterQueries.addQualification;
    var params =[{name:name,description:description,status:status}];
    var message = " successfully added the record";
    if(id !=0){
        existsQuery = config.sqlMasterQueries.checkQualificationExistUpdate;
        existsParams =[{name:name,id:id}];
        query = config.sqlMasterQueries.updateQualification;
        params =[{id:id,name:name,description:description,status:status}];
        message = " successfully updated the record";
    }
    if (id !=undefined && name != undefined) {
        try{
            masterService.getMasterTableDetails(existsQuery,existsParams,function(callback){
                if(callback.success==true)
                {
                    if(callback.data.length >0){
                        response = { success: false, message: "Record already exists" };
                        res.status(200).send(response);
                    }else{
                        masterService.AddUpdateMasterTableDetails(query,params,function(callback){
                            if(callback.success==true)
                            {
                                response = {success:true,message: message};  
                                res.status(200).send(response);   
                            }else{
                                response = { success: false, message: callback.message };
                                res.status(200).send(response);
                            }
                        });  
                    }
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