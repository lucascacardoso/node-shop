const express = require('express');
const { check, body } = require('express-validator/check');
const User = require('../model/user');

const authController = require('../controllers/auth');

const router = express.Router();

router.get('/login', authController.getLogin);

router.get('/signup', authController.getSignup);

router.post(
  '/login',
  [
    body('email', 'Please enter a valid email.')
      .isEmail(),
    body('password', 'Please enter a password with at least 5 characters.')  
      .isLength({ min: 5 })
      .trim()      
  ],
  authController.postLogin
);

router.post(
  '/signup',
  [
    check('email')    
      .isEmail()
      .withMessage('Please enter a valid email.')
      .custom((value) => {
        return User.findOne({ email: value })
          .then(userDoc => {
            if (userDoc) {
              return Promise.reject('Email already exists!');
            }
          })
      }),
    body('password', 'Please enter a password with at least 5 characters.')
      .isLength({ min: 5 })
      .trim(),
    body('confirmPassword')
      .trim()
      .custom((value, { req }) => {
        if (value !== req.body.password) {
          throw new Error('Passwords do not match!');
        }
        return true;
      })  
  ],
  authController.postSignup
);

router.post('/logout', authController.postLogout);

router.get('/reset', authController.getReset);

router.post('/reset', authController.postReset);

router.get('/reset/:token', authController.getNewPassword);

router.post('/new-password', authController.postNewPassword);

module.exports = router;