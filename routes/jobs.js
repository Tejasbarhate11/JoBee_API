const express = require('express');
const router = express.Router();

//Importing jobs controller methods
const { 
    getJobs, 
    getJob,
    newJob, 
    getJobsInRadius,
    updateJob,
    deleteJob,
    jobStats
} = require('../controllers/jobsController');

router.route('/')
    .get(getJobs);

router.route('/stats/:topic')
    .get(jobStats);

router.route('/:id/:slug')
    .get(getJob);

router.route('/:id')
    .put(updateJob)
    .delete(deleteJob);

router.route('/:zipcode/:distance')
    .get(getJobsInRadius);

router.route('/new')
    .post(newJob);

 
module.exports = router;