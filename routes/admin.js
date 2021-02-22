const express = require('express');
const { body } = require('express-validator/check');

const adminController = require('../controllers/admin');
const isAuth = require('../middleware/is-auth');

const router = express.Router();

router.get('/add-product', isAuth, adminController.getAddProduct);

router.post(
  '/add-product',
  [
    body('title', 'Please enter a string with at least 3 characters.')
      .isString()
      .isLength({ min: 3 })
      .trim(),
    body('price', 'Please enter a valid price.').isCurrency(),
    body('description', 'Please enter a string within 400 characters length.')
      .isString()
      .isLength({ min: 3, max: 400 })
      .trim()
  ],
  isAuth,
  adminController.postAddProduct
);

router.post(
  '/edit-product',
  [
    body('title', 'Please enter a string with at least 3 characters.')
      .isString()
      .isLength({ min: 3 })
      .trim(),
    body('price', 'Please enter a valid price.').isCurrency(),
    body('description', 'Please enter a string within 400 characters length.')
      .isString()
      .isLength({ min: 3, max: 400 })
      .trim()
  ],
  isAuth,
  adminController.postEditProduct
);

router.get('/edit-product/:productId', isAuth, adminController.getEditProduct);

router.get('/products', isAuth, adminController.getProducts);

router.delete('/product/:productId', isAuth, adminController.deleteProduct)

module.exports = router;