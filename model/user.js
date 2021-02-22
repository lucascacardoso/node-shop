const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const userSchema = new Schema({  
  email: {
    type: String,
    required: true
  },
  password: {
    type: String,
    required: true
  },
  resetToken: {
    type: String
  },
  resetTokenExpiration: {
    type: Date
  },
  cart: {
    items: [{
      prodId: {type: Schema.Types.ObjectId, ref: 'Product', required: true},
      quantity: {type: Number, required: true}
    }]
  }
});

userSchema.methods.addToCart = function(product) {
  // check if product already in cart
    const cartProductIndex = this.cart.items.findIndex(cp => {
      return cp.prodId.toString() === product._id.toString();
    });

    const updatedCartItems = [...this.cart.items];

    if (cartProductIndex >= 0) {
      updatedCartItems[cartProductIndex].quantity = this.cart.items[cartProductIndex].quantity + 1;
    } else {
      updatedCartItems.push({
        prodId: product._id,
        quantity: 1
      });
    }

    const updatedCart = {items: updatedCartItems};
    this.cart = updatedCart;
    return this.save();
};

userSchema.methods.deleteItemFromCart = function(productId) {
  const updatedCartItems = this.cart.items.filter(item => {
    return item.prodId.toString() !== productId.toString();
  });
  this.cart.items = updatedCartItems;
  return this.save();
}

userSchema.methods.clearCart = function() {
  this.cart = { items: [] };
  return this.save();
}

module.exports = mongoose.model('User', userSchema);

// const mongodb = require('mongodb');
// const getDb = require('../util/database').getDb;

// class User {
//   constructor(email, username, cart, id) {
//     this.email = email;
//     this.username = username;
//     this.cart = cart; // { items: [] }
//     this._id = id;
//   }

//   save() {
//     const db = getDb();
//     return db.collection('users').insertOne(this);
//   }

//   static findByid(userId) {
//     const db = getDb();
//     return db.collection('users').find({ _id: new mongodb.ObjectID(userId) }).next();
//   }

//   addToCart(product) {
//     // check if product already in cart
//     const cartProductIndex = this.cart.items.findIndex(cp => {
//       return cp.prodId.toString() === product._id.toString();
//     });

//     const updatedCartItems = [...this.cart.items];

//     if (cartProductIndex >= 0) {
//       updatedCartItems[cartProductIndex].quantity = this.cart.items[cartProductIndex].quantity + 1;
//     } else {
//       updatedCartItems.push({
//         prodId: new mongodb.ObjectID(product._id),
//         quantity: 1
//       });
//     }

//     const updatedCart = {items: updatedCartItems};
//     const db = getDb();
//     return db.collection('users').updateOne(
//       { _id: new mongodb.ObjectID(this._id) }, 
//       { $set: {cart: updatedCart} }
//     );
//   }

//   getCart() {
//     const productIds = this.cart.items.map(item => {
//       return item.prodId;
//     });

//     const db = getDb();
//     return db
//       .collection('products')
//       .find({ _id: {$in: productIds} })
//       .toArray()
//       .then(products => {
//         return products.map(product => {
//           return {
//             ...product,
//             quantity: this.cart.items.find(item => {
//               return item.prodId.toString() === product._id.toString();
//             }).quantity
//           };
//         });
//       });
//   }

//   deleteItemFromCart(productId) {
//     const updatedCartItems = this.cart.items.filter(item => {
//       return item.prodId.toString() !== productId.toString();
//     });

//     const updatedCart = {items: updatedCartItems};
//     const db = getDb();
//     return db.collection('users').updateOne(
//       { _id: new mongodb.ObjectID(this._id) }, 
//       { $set: {cart: updatedCart} }
//     );
//   }

//   addOrder() {
//     let totalPrice = 0;
//     const db = getDb();

//     return this.getCart()
//       .then(products => {
//         products.forEach(product => {
//           totalPrice = totalPrice + (product.quantity * product.price);
//         });
        
//         const order = {
//           items: products,
//           totalPrice: totalPrice,
//           user: {
//             _id: new mongodb.ObjectID(this._id),
//             name: this.username
//           }
//         };
//         return db.collection('orders').insertOne(order)
//       })
//       .then(result => {        
//         this.cart = { items: [] };
//         return db
//           .collection('users')
//           .updateOne(
//             { _id: new mongodb.ObjectID(this._id) }, 
//             { $set: {cart: { items: [] } } }
//           );
//       });
//   }

//   getOrders() {
//     const db = getDb();
//     return db
//       .collection('orders')
//       .find( { 'user._id': new mongodb.ObjectID(this._id)} )
//       .toArray();
//   }
// }

// module.exports = User;