const express = require('express');
const app = express();
//Dotenv is a zero-dependency module that loads environment variables from a .env file into process.env.
const dotenv = require('dotenv');

//Setting up config.env file variables
dotenv.config({path: './config/config.env'});


const PORT = process.env.PORT;
app.listen(PORT, () => {
    console.log(`Server started on port: ${process.env.PORT} in ${process.env.NODE_ENV} mode.`);
});