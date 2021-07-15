const jwt = require('jsonwebtoken')
const config = require('./config')


exports.tokenChecker = function(req,res,next) {
    const role = req.headers['role'];
    const path = req.path;
    var adminApis = config.accessApis.Admin;
    var memberApis = config.accessApis.Member;
    var providerApis = config.accessApis.Provider;
    var grantAccess = false;
    if(role == "Admin"){
      grantAccess =true;
    }
    else if(((role == "Provider" || role== "Organization" ) && adminApis.indexOf(path) < 0  && providerApis.indexOf(path) > -1) ){
      grantAccess =true;
    }
    else if(role == "Member" && adminApis.indexOf(path) < 0  && memberApis.indexOf(path) > -1 ){
      grantAccess =true;
    }
    else{
      return res.status(401).send({"error": true,"message": 'Unauthorized access'});
    }
    
    if(grantAccess==true){
      const token = req.body.token || req.query.token || req.headers['x-access-token'];
      // decode token
      if (token) {
        // verifies secret and checks exp
        jwt.verify(token, config.secret, function(err, decoded) {
            if (err) {
                return res.status(401).json({"error": true, "message": 'Unauthorized access.' });
            }
          req.decoded = decoded;
          return next();
        });
      } else {
        // if there is no token
        // return an error
        return res.status(403).send({
            "error": true,
            "message": 'No token provided.'
        });
      }
    }else{
      return res.status(401).send({"error": true,"message": 'Unauthorized access'});
    }
    
  }