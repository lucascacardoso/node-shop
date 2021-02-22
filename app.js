const path = require('path');
const fs = require('fs');
const https = require('https');

const express = require('express');
const bodyParser = require('body-parser');
const session = require('express-session');
const MongoDBStore = require('connect-mongodb-session')(session);
const csrf = require('csurf');
const flash = require('connect-flash');
const multer = require('multer');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');


const MONGODB_URI = `mongodb+srv://${process.env.MONGO_USER}:${process.env.MONGO_PASSWORD}@cluster0.ohufw.mongodb.net/${process.env.MONGO_DATABASE}`;

const app = express();

const store = new MongoDBStore({
  uri: MONGODB_URI,
  collection: 'sessions'
});
const csrfProtection = csrf();

// const privateKey = fs.readFileSync('server.key');
// const certificate = fs.readFileSync('server.cert');

const fileStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'images');
  },
  filename: (req, file, cb) => {
    cb(null, new Date().toISOString().replace(/:/g, '-') + '-' + file.originalname);
  }
});

const fileFilter = (req, file, cb) => {
  if (file.mimetype === 'image/png' || file.mimetype === 'image/jpg' || file.mimetype === 'image/jpeg') {
    cb(null, true);
  } else {
    cb(null, false);
  }
};

//Configurando Express para trabalhar com Pug
app.set('view engine', 'pug');
app.set('views', 'views');

//importação das rotas
const adminRoutes = require('./routes/admin');
const shopRoutes = require('./routes/shop');
const authRoutes = require('./routes/auth');

const errorController = require('./controllers/404');

// importação do mongoDB
const mongoose = require('mongoose');

const User = require('./model/user');

const accessLogStream = fs.createWriteStream(
  path.join(__dirname, 'access.log'),
  { flags: 'a' }
);

// início da cadeia de middleware
// faz o next() por padrão
app.use(helmet());
app.use(compression());
app.use(morgan('combined', { stream: accessLogStream }));

app.use(bodyParser.urlencoded({extended: false}));

app.use(multer({ storage: fileStorage, fileFilter: fileFilter }).single('image'));

app.use(express.static(path.join(__dirname, 'public')));
app.use('/images', express.static(path.join(__dirname, 'images')));

//configurando Sessions
app.use(
  session({ secret: 'my secret', resave: false, saveUninitialized: false, store: store })
);

//habilitando proteção CSRF
app.use(csrfProtection);

//habilitando mensagens de erro
app.use(flash());

//passando variáveis para TODAS as views renderizadas
app.use((req, res, next) => {
  res.locals.isAuthenticated = req.session.isLoggedIn;
  res.locals.csrfToken = req.csrfToken();
  next();
});

// expondo o usuário para as requisições
app.use((req, res, next) => {
  if (!req.session.user) {
    return next();
  }
  User.findById(req.session.user._id)
    .then(user => {
      if (!user) {
        return next();
      }
      req.user = user;
      next();
    })
    .catch(err => {
      next(new Error(err));
    })
});

app.use('/admin', adminRoutes);
app.use(shopRoutes);
app.use(authRoutes);

//página de erro
app.use(errorController.getError);

//tratamento de erro do ExpressJS
app.use((error, req, res, next) => {
  console.log(error);
  res
    .status(500)
    .render('500', {
      pageTitle: 'Error!', 
      path: '/500'
    });
});

mongoose
  .connect(
    MONGODB_URI
  )  
  .then(result => {      
    console.log("Connected!");
    // https
    //   .createServer({ key: privateKey, cert: certificate }, app)
    //   .listen(process.env.PORT || 3000);
    app.listen(process.env.PORT || 3000);
  })
  .catch(err => {
    console.log(err);
  });
