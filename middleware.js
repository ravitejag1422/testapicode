
var path = require("path");
var appRoot = path.resolve(__dirname);
var rootLogPath = path.join(appRoot,"logs","test.log");
var moment = require('moment');
var winston = require('winston');
winston.transports.DailyRotateFile = require('winston-daily-rotate-file');
var datePatternLog = "YYYY-MM-D";

var logger = new (winston.Logger)({
    transports: [

        new (winston.transports.Console)({silent: true}),
        new(winston.transports.DailyRotateFile)({
            filename: rootLogPath ,
            datePattern: datePatternLog,
            timestamp: function() {
                localMoment = moment();
                return  localMoment.format().replace(/T/, ' ').replace('+', ' ');
            }})
    ]
});

exports.appLogger = function (req, res, next) {
    logger.log("info",req.url,moment().format('YYYY-MM-DD HH:mm:ss'));
    res.on("finish", function(e){
        logger.log("info",req.url,moment().format('YYYY-MM-DD HH:mm:ss'));
        });
    return next();  
    
}



