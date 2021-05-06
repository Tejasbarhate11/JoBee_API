//Routes related to users
const express = require('express');
const router = express.Router();

const {
    getUserProfile,
    updatePassword,
    updateUser,
    deleteUser,
    getAppliedJobs,
    getPublishedJobs,
    adminGetUsers,
    adminRemoveUser
} = require('../controllers/userController');

const {
    isUserAuthenticated,
    authorizeRoles
} = require('../middlewares/authentication');

//since we are using isUserAuthenticated in all routes we an use it as middleware
router.use(isUserAuthenticated);

// /api/v1/me
router.route('/me').get(getUserProfile);

// /api/v1/me/applied_jobs (user)
router.route('/me/applied_jobs').get(authorizeRoles('user'), getAppliedJobs);

// /api/v1/me/published_jobs (employer, admin)
router.route('/me/published_jobs').get(authorizeRoles('employer', 'admin'), getPublishedJobs);

// /api/v1/password/update
router.route('/password/update').put(updatePassword);

// /api/v1/me/update
router.route('/me/update').put(updateUser);

// /api/v1/me/delete
router.route('/me/delete').delete(deleteUser);


//Admin only routes
// /api/v1/admin/users
router.route('/admin/users').get(authorizeRoles('admin'), adminGetUsers);

// /api/v1/admin/users/:id
router.route('/admin/users/:id').get(authorizeRoles('admin'), adminRemoveUser);

module.exports = router;