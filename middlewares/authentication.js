const jwt = require('jsonwebtoken');
const User = require('../models/user');
const asyncErrorHandler = require('../middlewares/asyncErrorHandler');
const ErrorHandler = require('../utils/errorHandler');


//Verify if the user is authenticated
exports.isUserAuthenticated = asyncErrorHandler( async (req, res, next) => {
    //Variable for token
    let token;

    //Check wether the req contains the authorization header and its value starts with 'Bearer'
    if(req.headers.authorization && req.headers.authorization.startsWith('Bearer')){
        //Get the token from the value of the header
        token = req.headers.authorization.split(' ')[1];
    }

    //If token is not present
    if(!token){
        return next(new ErrorHandler('Access denied', 401));
    }


    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = await User.findById(decoded.id);

    next();
});

//Handling roles
//This method will take te roles allowed access as paramters and will allow passage if the user has a proper role
exports.authorizeRoles = (...roles) => {
    return (req, res, next) => {
        if(!roles.includes(req.user.role)){
            return next(new ErrorHandler(`Role(${req.user.role}) is not allowed access to this route.`, 403));
        }
        next();
    }
}