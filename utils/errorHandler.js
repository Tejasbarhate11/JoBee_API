//Create ErrorHandler class whuch extends Error class
class ErrorHandler extends Error {
        constructor(message, statusCode){
            super(message);
            this.statusCode = statusCode;

            Error.captureStackTrace(this, this.constructor)
        }    
}

//Export the class
module.exports = ErrorHandler;