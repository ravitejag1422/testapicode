const express = require('express');
const bodyParser = require('body-parser');
const config = require('./config');
var cors = require('cors');
const app = express();
app.use(bodyParser.json({limit: '50mb'}));
app.use(bodyParser.urlencoded({limit: '50mb', extended: true, parameterLimit: 50000 }));
app.listen(config.port);
app.use(cors());

 app.use(function(req, res, next) {
     res.header('Access-Control-Allow-Origin', '*');
     res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
     res.header('Access-Control-Allow-Headers', 'X-Requested-With,content-type');
     res.header('Access-Control-Allow-Credentials', true);
     next();
   });


var mw = require('./middleware.js');
var tokenCheck = require('./tokenChecker.js');
var userCtrl = require( './Controller/UserController.js' );
var masterCtrl = require( './Controller/MasterController.js');
var paymentCtrl = require( './Controller/PaymentController.js');

app.use(mw.appLogger);//log the api requests

//without authorization apis start
app.post('/api/registeruser', userCtrl.RegisterUser);
app.post('/api/registerprovider', userCtrl.RegisterProvider);
app.post('/api/registerorganization', userCtrl.RegisterOrganization);
app.get('/api/verifyemail', userCtrl.VerifyUserEmail);
app.post('/api/verifymobile', userCtrl.VerifyUserMobile);
app.post('/api/login', userCtrl.Login);
app.post('/api/authenticate', userCtrl.Authenticate);


app.get('/api/country', masterCtrl.GetCountry);
app.get('/api/state', masterCtrl.GetState);
app.get('/api/city', masterCtrl.GetCity);
app.get('/api/services', masterCtrl.GetServices);
app.get('/api/qualifications', masterCtrl.GetQualification);
app.get('/api/bank', masterCtrl.GetBanks);

app.post('/api/paymentStatus', paymentCtrl.paymentStatus);
app.post('/api/upload', userCtrl.UploadFiles);

//without authorization apis end


//NOTE: All Api end urls which require authorization should be have
//tokenChecker middleware function to check for authorization

//Any roles
app.post('/api/logout', tokenCheck.tokenChecker,userCtrl.LogoutUser);
app.post('/api/bankdetails', tokenCheck.tokenChecker,userCtrl.AddUpdateBankDetails);
app.post('/api/disablebank', tokenCheck.tokenChecker,userCtrl.DisableBankStatus);
app.get('/api/bankdetails', tokenCheck.tokenChecker,userCtrl.GetUserBankDetails);
app.get('/api/priceConstant',userCtrl.GetPriceConstants);



app.get('/api/providerdetails',tokenCheck.tokenChecker, userCtrl.GetProviderDetails);
app.post('/api/updateprofile', tokenCheck.tokenChecker,userCtrl.UpdateUserProfile);
app.post('/api/jobstatus',tokenCheck.tokenChecker,userCtrl.UpdateJobStatus);
app.get('/api/jobslist', tokenCheck.tokenChecker,userCtrl.GetJobsList);
app.get('/api/dashboard', tokenCheck.tokenChecker,userCtrl.GetDashboardDetails);


app.get('/api/notifications', tokenCheck.tokenChecker,userCtrl.GetNotifications);
app.post('/api/updateNotification', tokenCheck.tokenChecker,userCtrl.UpdateNotification);


//only Admin role
app.post('/api/validateprovider', tokenCheck.tokenChecker,userCtrl.ValidateProvider);
app.post('/api/addservice', tokenCheck.tokenChecker,masterCtrl.AddUpdateService);
app.post('/api/addcountry', tokenCheck.tokenChecker,masterCtrl.AddUpdateCountry);
app.post('/api/addstate', tokenCheck.tokenChecker,masterCtrl.AddUpdateState);
app.post('/api/addcity', tokenCheck.tokenChecker,masterCtrl.AddUpdateCity);
app.post('/api/addqualification', tokenCheck.tokenChecker,masterCtrl.AddUpdateQualification);
app.get('/api/users', tokenCheck.tokenChecker,userCtrl.GetUsers);
app.get('/api/allJobs', tokenCheck.tokenChecker,userCtrl.GetAllJobs);


//only Provider role
app.get('/api/jobdetails', tokenCheck.tokenChecker,userCtrl.GetJobDetails);
app.post('/api/price', tokenCheck.tokenChecker,userCtrl.UpdateProviderPrice);


//only member role
app.post('/api/favorite', tokenCheck.tokenChecker,userCtrl.AddFavorite);
app.get('/api/providers', tokenCheck.tokenChecker,userCtrl.GetProvidersList);
app.get('/api/userdetails', tokenCheck.tokenChecker,userCtrl.GetUserDetails);
app.post('/api/rating', tokenCheck.tokenChecker,userCtrl.AddUserRating);
app.get('/api/feedback', tokenCheck.tokenChecker,userCtrl.GetUserFeedback); 
app.post('/api/createjob', tokenCheck.tokenChecker,userCtrl.CreateJob);
app.post('/api/payment', tokenCheck.tokenChecker,paymentCtrl.pay);
app.get('/api/serviceByProvider',tokenCheck.tokenChecker, userCtrl.serviceByProvider);
app.get('/api/usercomments', tokenCheck.tokenChecker,userCtrl.GetUserCommentsOnProviderId);


console.log("listening on port ",config.port);