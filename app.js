const express = require('express');
const app = express();
//Dotenv is a zero-dependency module that loads environment variables from a .env file into process.env.
const dotenv = require('dotenv');
//Import module for uploading files
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

//Setting up bodyparser
app.use(express.json());

//Setup cookie parser
app.use(cookieParser());

//setup file uploading middleware
app.user(fileUpload());

//Importing routes
const jobsRoutes = require('./routes/jobsRoutes');
const userRoutes = require('./routes/userRoutes');
const authRoutes = require('./routes/auth');


//Setting routes
app.use('/api/v1/jobs', jobsRoutes);
app.use('/api/v1', authRoutes);
app.user('/api/v1', userRoutes);

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