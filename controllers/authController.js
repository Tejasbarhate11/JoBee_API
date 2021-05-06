const User = require('../models/user');
const asyncErrorHandler = require('../middlewares/asyncErrorHandler');
const ErrorHandler = require('../utils/errorHandler');
const sendToken = require('../utils/jwtToken');
const sendEmail = require('../utils/emailService');
const crypto = require('crypto');

//Register a new user
// /api/v1/register
exports.registerUser = asyncErrorHandler( async (req, res, next) => {
    const {name, email, password, role} = req.body;

    const user = await User.create({
        name,
        email,
        password,
        role
    });

    sendToken(user, 200, res);
});

//Login a user
// /api/v1/login
exports.loginUser = asyncErrorHandler( async (req, res, next) => {
    const { email, password } = req.body;

    //Verify input
    if(!email){
        return next(new asyncErrorHandler("Please enter email address", 400));
    }
    if(!password){
        return next(new asyncErrorHandler("Please enter your password", 400));
    }

    //Finding user in database
    const user = await User.findOne({email}).select('+password');

    //check user exits
    if(!user){
        return next(new ErrorHandler('No user found. Verify the email address', 401));
    }

    //Check password
    const login = await user.comparePassword(password);

    if(!login){
        return next(new ErrorHandler('Invalid email or password', 401));
    }

    sendToken(user, 200, res);

});

//Password reset route
// /api/v1/password/reset
exports.forgotPassword = asyncErrorHandler( async (req, res, next) => {
    //Get the user from the database
    const user = await User.findOne({ email : req.body.email});

    //Check if the email provided is already registered
    if(!user){
        return next(new ErrorHandler('This email is not registered with us.', 404));
    }

    //Get the reset token using the model method
    const resetToken = user.getResetPasswordToken();

    await user.save({ validateBeforeSave : false });

    // Create the link for password recovery
    const resetUrl = `${req.protocol}://${req.get('host')}/api/v1/password/reset/${resetToken}`;

    // message which we will 
    const message = `Password reset link:\n${resetUrl}\n\nIf not required, please ignore.`;

    //To catch the error if we are unable to send the email
    try{
        await sendEmail({
            email : user.email,
            subject : 'JoBee API Password Reset',
            message
        });
    
        res.status(200).json({
            success : true,
            message : `Email sent to ${user.email}`
        });
    }catch(error){
        //Incase of error we need to set the respective terms to undefined and save the user object
        user.resetPasswordToken = undefined;
        user.resetPasswordExpire = undefined;

        await user.save({ validateBeforeSave : false});

        return next(new ErrorHandler('Error sending the recovery email.', 500));
    }
});


//Reset password 
// /api/v1/password/reset/:token
exports.resetPassword = asyncErrorHandler( async (req, res, next) => {
    //Hash the token which we receive and compare it with the hashed token saved in the database
    const resetPasswordToken = crypto.createHash('sha256')
        .update(req.params.token)
        .digest('hex');

    const user = await User.findOne( { 
        resetPasswordToken, 
        resetPasswordExpire: {$gt : Date.now()
    }});

    if(!user){
        return next( new ErrorHandler('Password reset token is incorrect or is expired', 400));
    }

    //Setup new password
    user.password = req.body.password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;

    //save the new password in the database
    await user.save();

    //Send the response and the token back 
    sendToken(user, 200, res);

});

//Logout user
// /api/v1/logout

exports.logoutUser = asyncErrorHandler( async (req, res, next) => {
    res.cookie('token', 'none', {
        expires : new Date(Date.now()),
        httpOnly : true
    });

    res.status(200).json({
        success : true,
        message : 'Logged out successfully.'
    });
});