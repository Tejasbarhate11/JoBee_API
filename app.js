const express = require('express');
const app = express();

//for cross origin resourse sharing
const cors = require('cors');

//rate limit
const rateLimit = require('express-rate-limit');

//Dotenv is a zero-dependency module that loads environment variables from a .env file into process.env.
const dotenv = require('dotenv');

//Body-Parser
const bodyparser = require('body-parser');

//Data Sanitization : preventing exploits using mongo operators
const mongoSanitize = require('express-mongo-sanitize');

//xss attacks
const xssClean = require('xss-clean');  

//Parameter pollution control
// ex ?sort=jobType&sort=salary ( this gives error )
const hpp = require('hpp');

//Helmet helps you secure your express apps by setting various HTTP headers
//Import module for uploading files
const helmet = require('helmet');

//we can also use Multer for this
const fileUpload = require('express-fileupload');

//Import the cookie parser
const cookieParser = require('cookie-parser');
//Import error middlerware
const errorMiddleware = require('./middlewares/errors');
const ErrorHandler = require('./utils/errorHandler');
const connectDatabase = require('./config/database');

//Setting up config.env file variables
dotenv.config({path: './config/config.env'});

//Handling uncaught exceptions before connecting to database
process.on('uncaughtException', err => {
    console.log(`Error message: ${err.message}`);
    console.log("Shutting down the server");
    process.exit(1);
});

//Connecting to database
connectDatabase();

//Setting body-parser
app.use(bodyparser.urlencoded({ extended : true }));

//setting the index.html serve static files 
//now we can load the files present in the public directory
app.use(express.static('public'))

//Setting secure HTTP Headers
app.use(helmet());

//Setting up bodyparser
app.use(express.json());

//Setup cookie parser
app.use(cookieParser());

//setup file uploading middleware
app.use(fileUpload());

//Rate limiting
//It will show too many requests please try again later
const limiter = rateLimit({
    windowMs : 30*60*1000,  //30 minutes
    max : 100   //100 requests per 30 min
});

//Setting the mongo sanitizer
app.use(mongoSanitize());

//Preventing xss attacks
app.use(xssClean());

//preventing paramters pollution
app.use(hpp({
    whitelist : ['positions']
})); 

//setup limiter middleware
app.use(limiter);


//Setting cors accesible to other domains
app.use(cors());


//Importing routes
const jobsRoutes = require('./routes/jobsRoutes');
const userRoutes = require('./routes/userRoutes');
const authRoutes = require('./routes/auth');


//Setting routes
app.use('/api/v1/jobs', jobsRoutes);
app.use('/api/v1', authRoutes);
app.use('/api/v1', userRoutes);

// Handling errors for wrong route
// all is used to catch any type of requests
// * is used to catch all routes.
app.all('*', (req, res, next) => {
    next(new ErrorHandler(`${req.originalUrl} does not exist`, 404));
});

//Setting error middleware
app.use(errorMiddleware);

const PORT = process.env.PORT;
const server = app.listen(PORT, () => {
    console.log(`Server started on port: ${process.env.PORT} in ${process.env.NODE_ENV} mode.`);
});

//Handling Unhandled Promise Rejection
process.on('unhandledRejection', err => {
    console.log(`Error message: ${err.message}`);
    console.log("Shutting the server down due to a fatal error");

    server.close(() => {
        process.exit(1);
    });
});