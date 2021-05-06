const express = require('express');
const router = express.Router();

//Import the controller methods
const { 
    registerUser, 
    loginUser,
    forgotPassword,
    resetPassword,
    logoutUser
} = require('../controllers/authController');

//Import the safety methods
const { 
    isUserAuthenticated
} = require('../middlewares/authentication');

// /api/v1/register
router.route('/register').post(registerUser);

// /api/v1/login
router.route('/login').post(loginUser);

// /api/v1/logout
router.route('/logout').get(isUserAuthenticated, logoutUser);

// /api/v1/password/reset
router.route('/password/reset').post(isUserAuthenticated, forgotPassword);

// /api/v1/password/reset/:token
router.route('/password/reset/:token').put(resetPassword);


module.exports = router;