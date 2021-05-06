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
    jobStats,
    applyJob
} = require('../controllers/jobsController');

//Import the safety methods
const { 
    isUserAuthenticated,
    authorizeRoles
} = require('../middlewares/authentication');

// /api/v1/jobs
router.route('/')
    .get(getJobs);

// /api/v1/jobs/stats/:topic
router.route('/stats/:topic')
    .get(jobStats);

// /api/v1/jobs/:id/:slug
router.route('/:id/:slug')
    .get(getJob);

// /api/v1/jobs/:id
router.route('/:id')
    .put(isUserAuthenticated, authorizeRoles('employer', 'admin'), updateJob)
    .delete(isUserAuthenticated, authorizeRoles('employer', 'admin'), deleteJob);

// /api/v1/jobs/:zipcode/:distance
router.route('/:zipcode/:distance')
    .get(getJobsInRadius);

// /api/v1/jobs/new
router.route('/new')
    .post(isUserAuthenticated, authorizeRoles('employer', 'admin'), newJob);

// /api/v1/jobs/:id/apply
router.route('/:id/apply').put(isUserAuthenticated, authorizeRoles('user'), applyJob);
 
module.exports = router;