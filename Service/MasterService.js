var helper = require('../helper');

exports.getMasterTableDetails = function (query,queryParams,callback) {
    let response = {};
    var selectQuery = query;
    try{
        if(queryParams.length > 0){
            var paramsBody=queryParams[0];
            Object.keys(paramsBody).forEach(function(key) {
                selectQuery = selectQuery.replace('{{'+key+'}}', paramsBody[key]);   
            });
            selectQuery = selectQuery.replace(/{{%}}/g,'%');   
         }
        helper.getConnection(function (fail, connection, pool) {
            if (!fail) {   
                connection.query(selectQuery,  function (err, result) {
                    if (!err) {
                        var result = result.length == 0 ? [] : result;
                        response = {success:true,data: result};        
                        connection.release();
                        pool.end();
                        callback(response);
                    } 
                    else {
                        response = { success: false, message: "Error in fetching data" };  
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

exports.AddUpdateMasterTableDetails = function (query,queryParams,callback) {
    let response = {};
    var Query = query;
    if(queryParams.length > 0){
        var paramsBody=queryParams[0];
        Object.keys(paramsBody).forEach(function(key) {
            Query = Query.replace('{{'+key+'}}', paramsBody[key]);
        });
     }
    try{
        helper.getConnection(function (fail, connection, pool) {
            if (!fail) {   
                connection.query(Query,  function (err, result) {
                    if (!err) {
                        var result = result.length == 0 ? [] : result;
                        response = {success:true,data: result};        
                        connection.release();
                        pool.end();
                        callback(response);
                    } 
                    else {
                        response = { success: false, message: "Error in adding/updating the record" }; 
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


exports.AddUpdateService = function (id,name,description,callback) {
    let response = {};

    let insertQuery = " insert into services(name,description)VALUES(?,?)";
    let updateQuery = " Update services set name=?,description=? WHERE id = ?";

    try{
        //insert
        if (id == 0 ) {
            helper.getConnection(function (fail, connection, pool) {
                if (!fail) {   
                    connection.query(insertQuery, [name,description],  function (err, result) {
                        if (!err) {
                            response = {success:true,message: "Successfully added the service"};        
                            connection.release();
                            pool.end();
                            callback(response);
                        } 
                        else {
                            response = { success: false, message: "Error in adding the service" };
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
        else if (id != 0) {
            helper.getConnection(function (fail, connection, pool) {
                if (!fail) {   
                    connection.query(updateQuery, [name,description,id],  function (err, result) {
                        if (!err) {
                            response = {success:true,message: "Successfully updated the service"};        
                            connection.release();
                            pool.end();
                            callback(response);
                        } 
                        else {
                            response = { success: false, message: "Error in updating the service" };
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