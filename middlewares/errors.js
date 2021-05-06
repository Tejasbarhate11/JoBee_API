
const ErrorHandler = require('../utils/errorHandler');

//This middleware method is useful to send proper error status code and message
module.exports = (err, req, res, next) => {

    err.statusCode = err.statusCode || 500;

    //We need to send different error messages in case of production and development enviornment
    if(process.env.NODE_ENV === 'development'){
        res.status(err.statusCode ).json({
            success : false,
            error : err,
            err_msg : err.message,
            stack : err.stack
        });
    }else {
        //using ... operator to duplicate err object.
        let error = {...err};

        error.message = err.message;

        //Handling wrong Mongoose object error
        if(err.name === 'CastError'){
            const msg = `Resource not found. Invalid ${err.path}`;
            error = new ErrorHandler(msg, 404);
        }

        //Validation errors
        if(err.name === 'ValidatorError'){
            const msg = Object.values(err.errors).map(value => value.message);
            error = new ErrorHandler(msg, 400);
        }

        //Handling duplicate key error
        if(err.code === '11000'){
            const msg = `Duplicate ${Object.keys(err.keyValue)} entered.`;
            error = new ErrorHandler(msg, 400);
        }

        //Handling wrong JWT token error
        if(err.name === 'JsonWebTokenError'){
            const msg = "Invalid token provided. Please try again.",
            error = new ErrorHandler(msg, 500);
        }

        //Handle error due to expired jwt token
        if(err.name === 'TokenExpiredError'){
            const msg = 'Token is expired. Please login again to proceed with the request';
            error = new ErrorHandler(msg, 500);
        }

        res.status(error.statusCode).json({
            success : false,
            message : error.message || 'Internal Server Error'
        });
    }
}
