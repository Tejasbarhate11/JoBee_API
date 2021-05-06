const mongoose = require('mongoose');
const validator = require('validator');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
//Crypto is used to generate the reset password token
const crypto = require('crypto');

const userSchema= new mongoose.Schema({
    name : {
        type : String,
        required : [true, 'Please provide your name']
    },
    email : {
        type : String,
        required : [true, 'Please provide your email address'],
        unique : true,
        validate : [validator.isEmail, 'Please provide a valid email address']
    },
    role : {
        type : String,
        enum : {
            values : ['user', 'employer'],
            message : 'Please select the correct role'
        },
        default : 'user'
    },
    password : {
        type : String,
        required : [true, 'Please enter password for your account'],
        minlength : [8, 'Your password must be at least 8 characters long'],
        select : false
    },
    createdAt : {
        type : Date,
        default : Date.now
    },
    //The following fields are needed to reset the account password.
    resetPasswordToken : String,
    resetPasswordExpire : Date
},
{
    toJSON : { virtuals : true },
    toObject : {virtuals : true }
});


//Encrypting password before saving

userSchema.pre('save', async function(next){
    //Since this method is called each time we save the object 
    //We need a if statment ot check if we are updating the password
    if(this.isModified('password')){
        this.password = await bcrypt.hash(this.password, 10);
    }
    next();
});

//Return JSON web token
//Non static method
userSchema.methods.getJwtToken = function() {
    return jwt.sign({ id : this._id}, process.env.JWT_SECRET, {
        expiresIn : process.env.JWT_EXPIRES_TIME
    });
}

//Compare password
userSchema.methods.comparePassword = async function(enteredPassword){
    return await bcrypt.compare(enteredPassword, this.password);
}

//Generate password reset token
userSchema.methods.getResetPasswordToken = function(){
    //creating the token
    const resetToken = crypto.randomBytes(20).toString('hex');

    //Hash the token and save it in the object
    // The hashed version of the token will be saved in the database
    this.resetPasswordToken = crypto.createHash('sha256')
        .update(resetToken)
        .digest('hex');

    //Set token expire time 30 mins
    this.resetPasswordExpire = Date.now() + 30*60*1000;

    // we send the original token through email not the hashed version
    return resetToken;
}

//For employers
//Show all the jobs published/posted by a particular employer when showing his profile data
//We are going to use virtual property to do that beacuse we cant store that in the database
userSchema.virtual('jobPublished', {
    ref : 'Job',
    localField : '_id',
    foreignField : 'user',
    justOne : false
});



module.exports = mongoose.model('User', userSchema);
