const User = require('../models/user');
const Job = require('../models/job');
const asyncErrorHandler = require('../middlewares/asyncErrorHandler');
const ErrorHandler = require('../utils/errorHandler');
const sendToken = require('../utils/jwtToken');
const fs = require('fs');
const APIFilters = require('../utils/apiFilters');
const { JsonWebTokenError } = require('jsonwebtoken');

//Get current user profile
// /api/v1/me
exports.getUserProfile = asyncErrorHandler( async (req, res, next) => {
    //Get the current user
    //We need to use the populate method to populate the user with the virtual data 
    const user = await User.findById(req.user.id).select('-__v')
        .populate({
            path : 'jobsPublished',
            select : 'title postingDate -user'
        });

    res.status(200).json({
        success : true,
        data : user
    });
});

//Update the current user's password
// /api/v1/password/update
exports.updatePassword = asyncErrorHandler( async (req, res, next) => {
    //Get the user
    const user = await User.findById(req.user.id).select('+password');

    //Double check the current password
    const isMatched = await user.comparePassword(req.body.currentPassword);
    if(!isMatched){
        return next(new ErrorHandler('Password update failed! Please enter correct current password.', 401));
    }

    user.password = req.body.newPassword;
    await user.save();

    sendToken(user, 200, res);
});

//Update current user's profile data
// /api/v1/me/update
exports.updateUser = asyncErrorHandler( async (req, res, next) => {
    //Only name and email are changeable
    const newUserData = {
        name : req.body.name,
        email : req.body.email
    }

    const user = await User.findByIdAndUpdate(req.user.id, newUserData, {
        new : true,
        runValidators : true,
        useFindAndModify : false
    });

    res.status(200).json({
        success : true,
        message : 'User data is updated',
        data : user
    });

});

//Show all applied Jobs by a user
// /api/v1/me/applied_jobs
exports.getAppliedJobs = asyncErrorHandler( async (req, res, next) => {
    //Get all the jobs
    const jobs = await Job.find({ 'appliedApplicants.id' : req.user.id})
        .select('-__v');

    res.status(200).json({
        success : true,
        results : jobs.length,
        data : jobs
    })
});

//Show all jobs published by an employer
exports.getPublishedJobs = asyncErrorHandler( async (req, res, next) => {
    //get jobs
    const jobs = await Job.find({ user : req.user.id }).select('-__v');

    res.status(200).json({
        success : true,
        results : jobs.length,
        data : jobs
    });
});

//Delete user
// /api/v1/me/delete
exports.deleteUser = asyncErrorHandler( async (req, res, next) => {

    //Delete the resume data before deleting the user
    deleteUserData(req.user.id, req.user.role);

    //Find the user and delete it from database
    const user = await User.findByIdAndDelete(req.user.id);

    //Remove the cookie 
    res.cookie('token', 'none', {
        expires : new Date(Date.now()),
        httpOnly : true
    });

    //send response back
    res.status(200).json({
        success : true,
        message : 'Your account has been deleted successfully.'
    });
});



//Admin controller methods

// Show all users registered with JoBee
exports.adminGetUsers = asyncErrorHandle( async (req, res, next) => {
    //Create the filters
    const apiFilters = new APIFilters(User.find(), req.query)
        .filter()
        .sort()
        .limitFields()
        .pagination();

    const users = await apiFilters.query;

    res.status(200).json({
        success : true,
        results : users.length,
        data : users
    })
});

// Delete User(Admin)    
// /api/v1/user/:id
exports.adminRemoveUser = asyncErrorHandler( async (req, res, next) => {
    
    //Get the user from db
    const user = await User.findById(req.params.id);

    //Check user exists or not
    if(!user) {
        return next(new ErrorHandler(`No user found with id: ${req.params.id}.`, 404));
    }

    //Delete all user data
    deleteUserData(user.id, user.role);

    //Remove user from db
    await user.remove();

    //Send response
    res.status(200).json({
        success : true,
        message : 'User successfully deleted.'
    });

});

//Util function for deleting user data from database
async function deleteUserData(user, role){
    //While deleting employer just delete all the jobs applied by this employer
    if(role === 'employer'){
        await Job.deleteMany({ user : user});
    }

    if(role === 'user'){

        //Select all the jobs in which the user has applied into the array 'appliedJobs' (select only the appliedApplicants field).
        const appliedJobs = await Job.find({'appliedApplicants.id' : user}).select('+appliedApplicants');

        //Loop through all the jobs
        for( let i = 0; i < appliedJobs.length; i++){

            //Get the particular user object from eah job's appliedApplicants object
            let obj = appliedJobs[i].applcantsApplied
                .find(o => o.id === user);

            //We use the replace method because when we use __dirname in the controller method the path will conatin \\controllers we dont need that
            let filePath = `${__dirname}/public/uploads/${obj.resume}`.replace('\\controllers', '');

            fs.unlink(filePath, err => {
                if (err){
                    return console.log(err);
                }
            });

            //splice can be used to delete a particular object from array
            appliedJobs[i].applcantsApplied.splice(appliedJobs[i].applcantsApplied.indexOf(obj.id));

            //Save the modified Jobs
            await appliedJobs[i].save();
        }
    }
}