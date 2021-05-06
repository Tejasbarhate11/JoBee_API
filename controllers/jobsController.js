const Job = require('../models/job');
const { geocode } = require('../utils/geocoder');
const geoCoder = require('../utils/geocoder');
const ErrorHandler = require('../utils/errorHandler');
const asyncErrorHandler = require('../middlewares/asyncErrorHandler');
const APIFilters = require('../utils/apiFilters');
const fs = require('fs');


//GET all jobs from the database /api/v1/jobs
exports.getJobs = asyncErrorHandler(async (req, res, next) => {

    //Creating the apifilters object and applying the different filters.
    const apiFilters = new APIFilters(Job.find(), req.query)
        .filter()
        .sort()
        .limitFields()
        .searchByQuery()
        .pagination();

    const jobs = await apiFilters.query;

    res.status(200).json({
        success : true,
        results : jobs.length,
        data : jobs 
    });
});

//Create a new job and save to database /api/v1/jobs/new
//To catch the async errors simply wrap the async function inside the asyncErrors() method.
exports.newJob = asyncErrorHandler( async (req, res, next) => {

    //Adding the user id  inside the body
    req.body.user = req.user.id;
    
    //Create a job object
    const job = await Job.create(req.body);
    
    res.status(201).json({
        success : true,
        message : 'Successfully created a new job.',
        data : job
    });
});

//Update an exsisting job using its id /api/v1/jobs/:id
//we can pass only the field we want to update in the request body
exports.updateJob = asyncErrorHandler( async (req, res, next) => {
    let job = await Job.findById(req.params.id);

    if(!job) {
        return next(new ErrorHandler('Job not found', 404));
    }

    //Check if the user trying to update the job is the one who posted the job
    if(job.user.toString() !== req.user.id && req.user.role !== 'admin'){
        return next(new ErrorHandler('Permission denied.', 403));
    }

    job = await Job.findByIdAndUpdate(req.params.id, req.body, {
        new : true,
        runValidators : true,
        useFindAndModify : false  
    });

    res.status(200).json({
        success : true,
        message : 'Job is updated',
        data : job
    });
});

//Get a sungle job by its id and slug /api/v1/jobs/:id/:slug
exports.getJob = asyncErrorHandler( async (req, res, next) => {
    //Below code is used to get the job only through id but we need through slug as well
    //const job = await Job.findById(req.params.id);

    //The below code uses the and operator 
    //Both the id and the slug should match exactly
    const job = await Job.find({$and : [ { _id : req.params.id }, { slug : req.params.slug}]});

    if(!job || job.length === 0) {
        return next(new ErrorHandler('Required job not found', 404)); 
    }

    res.status(200).json({
        success : true,
        data : job
    });
});

//Deleting a job using its id /api/v1/jobs/:id
exports.deleteJob = asyncErrorHandler( async (req, res, next) => {
    let job = await Job.findById(req.params.id);

    if(!job) {
        return next(new ErrorHandler('Job not found', 404));
    }

    //Check if the user trying to update the job is the one who posted the job
    if(job.user.toString() !== req.user.id && req.user.role !== 'admin'){
        return next(new ErrorHandler('Permission denied.', 403));
    }

    // Deleting all files associated with job
    for (let i = 0; i < job.applicantsApplied.length; i++) {
        //Getting the path for the file
        let filepath = `${__dirname}/public/uploads/${job.applicantsApplied[i].resume}`.replace('\\controllers', '');

        fs.unlink(filepath, err => {
            if (err) return console.log(err);
        });
    }


    job = await Job.findByIdAndDelete(req.params.id);

    res.status(200).json({
        success : true,
        message : 'The specified job is deleted'
    });
});

//Search for jobs within a specified radius of a specified zipcode /api/v1/jobs/:zipcode/:distance
exports.getJobsInRadius = asyncErrorHandler( async (req, res, next) => {
    //Get the parameters
    const { zipcode, distance} = req.params;

    //Gettin the latitude and longitude from geocoder with zipcode
    const loc = await geoCoder.geocode(zipcode);
    const latitude = loc[0].latitude;
    const longitude = loc[0].longitude;

    //distance should be in miles and the radius will be in terms of radius of earth
    const radius = distance / 3963;


    const jobs = await Job.find({
        //geoWithin is mongoDB operator
        location : {$geoWithin : {$centerSphere : [[ longitude, latitude ], radius]}}
    });

    res.status(200).json({
        success : true,
        results : jobs.length,
        data : jobs
    });
});

//Get statistics about properties by specifying a topic(title)
// /api/v1/jobs/stats/:topic
exports.jobStats = asyncErrorHandler( async (req, res, next) => {
    //aggregate method is used to obtain data aggregation
    const stats = await Job.aggregate([
        {
            //We need to match the topic with the title 
            // we already created the index that is the title 
            //db.jobs.createIndex({ title : "text" }) this command was used in mongo.exe
            $match : { $text : { $search : "\""+req.params.topic+"\""}}
        },
        {
            $group : {
                //The groups are according to the property specified in the _id object
                _id : '$experience',
                total_jobs : {$sum : 1},
                average_positions : {$avg : '$positions'},
                average_salary : { $avg : '$salary'},
                min_salary : {$min : '$salary'},
                max_salary : { $max : '$salary'}
            }
        }
    ]);

    if(stats.length === 0){
        return next(new ErrorHandler(`No stats found for - ${req.params.topic}`, 200));
    }

    res.status(200).json({
        success : true,
        topic : `${req.params.topic}`,
        data : stats
    });
});

//Applying to a specific job
// /api/v1/jobs/:id/apply
exports.applyJob = asyncErrorHandler( async (req, res, next) => {

    //Get the job from db
    let job = await Job.findById(req.params.id).select('+appliedApplicants');
    //verify
    if(!job){
        return next(new ErrorHandler('Job not found', 404));
    }

    //Verify that the user has not already applied
    for(let i = 0; i < job.appliedApplicants.length; i++){
        //Check the id with all the applied users
        if(job.appliedApplicants[i].id === req.user.id){
            return next(new ErrorHandler('You\'ve already applied for this job!', 400));
        }
    }

    //Check if the job's last date of application is passed
    if(job.lastDate < new Date(Date.now())){
        return next(new ErrorHandler('This job is no longer accepting applications', 400));
    }

    //Check if the files are uploaded
    if(!req.files){
        return next(new ErrorHandler('Please upload the necessary files', 400));
    }

    const file = req.files.file;

    //Check the file type
    const supportedFileTypes = /.docx|.pdf/;
    if(supportedFileTypes.test(path.extname(file.name))){
        return next(new ErrorHandler('Unsupported file type. Only .pdf and .docs are allowed', 400));
    }

    //Check file size
    if(file.size > process.env.MAX_FILE_SIZE){
        return next(new ErrorHandler('File too large. Please keep the file size below 2MB', 400));
    }

    //Renaming the file (give a unique name)
    file.name = `${req.user.name.replace(' ', '_')}_${job._id}${path.parse(file.name).ext}`;

    //Store the file
    file.mv(`${process.env.UPLOAD_PATH}/${file.name}}`, async err => {
        if(err){
            console.log(err);
            return next(new ErrorHandler('Resume upload failed', 500));
        }

        await Job.findByIdAndUpdate(req.params.id, {
            $push : {
                appliedApplicants : {
                    id : req.user.id,
                    resume : file.name
                }
            }
        },
        {
            new : true,
            runValidators : true,
            useFindAndModify : false
        });

        res.status(200).json({
            success : true,
            message : 'Successfully applied to the job.',
            data : file.name
        });
    });

});