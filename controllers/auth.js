const User = require('../model/user');
const bcryptjs = require('bcryptjs');
const nodemailer = require('nodemailer');
const mailgunTransport = require('nodemailer-mailgun-transport');
const crypto = require('crypto');
const { validationResult } = require('express-validator/check');

const transporter = nodemailer.createTransport(mailgunTransport({
  auth: {
    api_key: `${process.env.MAILGUN_KEY}`,
    domain: `${process.env.MAILGUN_DOMAIN}`
  }
}));

exports.getLogin = (req, res, next) => { 
  let message = req.flash('error');
  if (message.length > 0) {
    message = message[0];
  } else {
    message = null;
  }

  res.render('auth/login', {
      pageTitle: 'Login',
      path: '/login',
      errorMessage: message,
      oldInputs: {
        email: '',
        password: ''
      },
      validationErrors: []
  });         
};

exports.getSignup = (req, res, next) => { 
  let message = req.flash('error');
  if (message.length > 0) {
    message = message[0];
  } else {
    message = null;
  }

  res.render('auth/signup', {
      pageTitle: 'Sign Up',
      path: '/signup',
      isAuthenticated: false,
      errorMessage: message,
      oldInputs: {
        email: '',
        password: '',
        confirmPassword: ''
      },
      validationErrors: []
  });         
};

exports.postLogin = (req, res, next) => {
  const email = req.body.email;
  const password = req.body.password;
  
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res
      .status(422)
      .render('auth/login', {
        pageTitle: 'Login',
        path: '/login',
        errorMessage: errors.array()[0].msg,
        oldInputs: {
          email: email,
          password: password
        },
        validationErrors: errors.array()
    });
  }
  
  User.findOne({ email: email })
    .then(user => {
      if (!user) {
        return res
          .status(422)
          .render('auth/login', {
            pageTitle: 'Login',
            path: '/login',
            errorMessage: 'Invalid email or password.',
            oldInputs: {
              email: email,
              password: password
            },
            validationErrors: []
        });
      }

      bcryptjs
        .compare(password, user.password)
        .then(doMatch => {
          if (doMatch) {
            req.session.isLoggedIn = true;
            req.session.user = user;
            return req.session.save(err => {
              console.log(err)
              res.redirect('/');     
            })
          }

          return res
            .status(422)
            .render('auth/login', {
              pageTitle: 'Login',
              path: '/login',
              errorMessage: 'Invalid email or password.',
              oldInputs: {
                email: email,
                password: password
              },
              validationErrors: []
          });
        })
        .catch(err => {
          console.log(err);
        })      
    })
    .catch(err => {
      console.log(err);
    });
};

exports.postSignup = (req, res, next) => {
  const email = req.body.email;
  const password = req.body.password;
  const confirmPassword = req.body.confirmPassword;

  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res
      .status(422)
      .render('auth/signup', {
        pageTitle: 'Sign Up',
        path: '/signup',
        isAuthenticated: false,
        errorMessage: errors.array()[0].msg,
        oldInputs: {
          email: email,
          password: password,
          confirmPassword: confirmPassword
        },
        validationErrors: errors.array()
      });
  }

  bcryptjs
    .hash(password, 12)
    .then(hashedPasswords => {
      const user = new User({
        email: email,
        password: hashedPasswords,
        cart: { items: [] }
      });
      return user.save();
    })
    .then(result => {
      res.redirect('/login');
      return transporter.sendMail({
        to: email,
        from: 'shop@node-udemy.com',
        subject: 'Signup succeeded!',
        html: '<h1>You successfully signed up!</h1>'
      });
    })
    .catch(err => {
      const error = new Error(err);
      error.httpStatusCode = 500;
      return next(error);
    });   
};

exports.postLogout = (req, res, next) => { 
  req.session.destroy(err => {
    console.log(err);
    res.redirect('/');
  });
};

exports.getReset = (req, res, next) => { 
  let message = req.flash('error');
  if (message.length > 0) {
    message = message[0];
  } else {
    message = null;
  }

  res.render('auth/reset', {
      pageTitle: 'Reset Password',
      path: '/reset',
      errorMessage: message
  });         
};

exports.postReset = (req, res, next) => {
  const email = req.body.email;

  crypto.randomBytes(32, (err, buffer) => {
    if (err) {
      console.log(err);
      return res.redirect('/reset');
    }

    const token = buffer.toString('hex');
    User.findOne({ email: email })
      .then(user => {
        if (!user) {
          req.flash('error', 'No account with that email found.');
          return res.redirect('/reset');
        }

        user.resetToken = token;
        user.resetTokenExpiration = Date.now() + 3600000;
        return user.save();
      })
      .then(result => {
        res.redirect('/');
        return transporter.sendMail({
          to: email,
          from: 'shop@node-udemy.com',
          subject: 'Password reset',
          html: `
            <p>You requested a password reset</p>
            <p>Click this <a href="http://localhost:3000/reset/${token}">link</a> to set a new password.</p>
          `
        });
      })
      .catch(err => {
        const error = new Error(err);
        error.httpStatusCode = 500;
        return next(error);
      });
  });
}

exports.getNewPassword = (req, res, next) => {
  const token = req.params.token;

  User.findOne({ resetToken: token, resetTokenExpiration: { $gt: Date.now() } })
    .then(user => {
      let message = req.flash('error');
      if (message.length > 0) {
        message = message[0];
      } else {
        message = null;
      }
    
      res.render('auth/new-password', {
          pageTitle: 'New Password',
          path: '/new-password',
          errorMessage: message,
          userId: user._id.toString(),
          passwordToken: token
      });         
    })
    .catch(err => {
      const error = new Error(err);
      error.httpStatusCode = 500;
      return next(error);
    });
}

exports.postNewPassword = (req, res, next) => {
  const newPassword = req.body.password;
  const userId = req.body.userId;
  const passwordToken = req.body.passwordToken;

  User.findOne({
    resetToken: passwordToken,
    resetTokenExpiration: { $gt: Date.now() },
    _id: userId
  })
    .then(user => {
      return bcryptjs
        .hash(newPassword, 12)
        .then(hashedPassword => {
          user.password = hashedPassword;
          user.resetToken = undefined;
          user.resetTokenExpiration = undefined;
          return user.save();
        })              
    })
    .then(result => {
      res.redirect('/login');
    })
    .catch(err => {
      const error = new Error(err);
      error.httpStatusCode = 500;
      return next(error);
    })
}