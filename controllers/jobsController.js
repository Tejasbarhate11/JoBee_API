const Job = require('../models/job');
const { geocode } = require('../utils/geocoder');
const geoCoder = require('../utils/geocoder');


//GET all jobs from the database /api/v1/jobs
exports.getJobs = async (req, res, next) => {

    const jobs = await Job.find();

    res.status(200).json({
        success : true,
        results : jobs.length,
        data : jobs 
    });
}

//Create a new job and save to database /api/v1/jobs/new
exports.newJob = async (req, res, next) => {

    //Create a job object
    const job = await Job.create(req.body);
    
    res.status(201).json({
        success : true,
        message : 'Successfully created a new job.',
        data : job
    });
}

//Update an exsisting job using its id /api/v1/jobs/:id
//we can pass only the field we want to update in the request body
exports.updateJob = async (req, res, next) => {
    let job = await Job.findById(req.params.id);

    if(!job) {
        return res.status(404).json({
            success : false,
            message : 'Job not found.'
        });
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
}

//Get a sungle job by its id and slug /api/v1/jobs/:id/:slug
exports.getJob = async (req, res, next) => {
    //Below code is used to get the job only through id but we need through slug as well
    //const job = await Job.findById(req.params.id);

    //The below code uses the and operator 
    //Both the id and the slug should match exactly
    const job = await Job.find({$and : [ { _id : req.params.id }, { slug : req.params.slug}]});

    if(!job || job.length === 0) {
        return res.status(404).json({
            success : false,
            message : "Job not found"
        });
    }

    res.status(200).json({
        success : true,
        data : job
    });
}

//Deleting a job using its id /api/v1/jobs/:id
exports.deleteJob = async (req, res, next) => {
    let job = await Job.findById(req.params.id);

    if(!job) {
        return res.status(404).json({
            success : false,
            message : 'No job found'
        });
    }

    job = await Job.findByIdAndDelete(req.params.id);

    res.status(200).json({
        success : true,
        message : 'The specified job is deleted'
    });
}

//Search for jobs within a specified radius of a specified zipcode /api/v1/jobs/:zipcode/:distance
exports.getJobsInRadius = async (req, res, next) => {
    //get the parameters
    const { zipcode, distance} = req.params;

    //Gettin the latitude and longitude from geocoder with zipcode
    const loc = await geoCoder.geocode(zipcode);
    const latitude = loc[0].latitude;
    const longitude = loc[0].longitude;

    //distance should be in miles and the radius will be in terms of radius of earth
    const radius = distance / 3963;

    const jobs = await Job.find({
        //geoWithin is mongoDB operator
        location : {$geoWithin : {$centerSphere : [[longitude, latitude], radius]}}
    });

    res.status(200).json({
        success : true,
        results : jobs.length,
        data : jobs
    });
}

//Get statistics about properties by specifying a topic(title)
// /api/v1/jobs/stats/:topic
exports.jobStats = async (req, res, next) => {
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
        return res.status(200).json({
            success : false,
            message : `No stats found for - ${req.params.topic}`
        });
    }

    res.status(200).json({
        success : true,
        topic : `${req.params.topic}`,
        data : stats
    });
}