const mongoose = require('mongoose');


//this method is used to connect to the database 
const connectDatabase = () => {mongoose.connect(process.env.DB_LOCAL_URI, {
    useNewUrlParser : true,
    useUnifiedTopology : true,
    useCreateIndex : true
}).then(con => {
    console.log(`MongoDB database connected to host: ${con.connection.host}`);
    })
};

module.exports = connectDatabase;