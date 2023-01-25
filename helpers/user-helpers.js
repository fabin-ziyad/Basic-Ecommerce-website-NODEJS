var db = require("../config/connection");
var collection = require("../config/collection");
var bcrypt = require("bcrypt");
var objectid = require("mongodb").ObjectId;
const Razorpay = require("razorpay");
var instance = new Razorpay({
  key_id: "rzp_test_LDqSacjImOR91e",
  key_secret: "EU8ZWuodmrS9EcGkyNuVAbOv",
});
module.exports = {
  doSignup: (signupData) => {
    return new Promise(async (resolve, reject) => {
      // console.log("hello");
      if (signupData.Password)
        signupData.originalPassword = signupData.Password;
      signupData.Password = await bcrypt.hash(signupData.Password, 10);
      db.get()
        .collection(collection.USER_DATA)
        .insertOne(signupData)
        .then((usersdata) => {
          resolve(usersdata);
        })
        .catch((err) => {
          reject(err);
        });
    });
  },
  Allusers: () => {
    return new Promise(async (resolve, reject) => {
      let Alluserdata = await db
        .get()
        .collection(collection.USER_DATA)
        .find()
        .toArray()
        .then((results) => {
          resolve(results);
        });
    });
  },
  doLogin: (loginData) => {
    return new Promise(async (resolve, reject) => {
      let loginStatus = false;
      let response = {};
      let user = await db
        .get()
        .collection(collection.USER_DATA)
        .findOne({ Email: loginData.Email });
      if (user) {
        bcrypt.compare(loginData.Password, user.Password).then((status) => {
          //  console.log(user);
          // console.log(status);
          if (status) {
            console.log("Logged In");
            response.user = user;
            response.status = true;
            resolve(response);
          } else {
            console.log("error");
            // alert("User doesnt Matching...")
            resolve({ status: false });
          }
        });
      } else {
        console.log("error in conection");
        // alert("User doesnt exists....")
        resolve({ status: false });
      }
    });
  },
  AddtoCart: (ProductId, UserId) => {
    let productObject = {
      item: objectid(ProductId),
      quantity: 1,
    };
    return new Promise(async (resolve, reject) => {
      let UserCart = await db
        .get()
        .collection(collection.CART_COLLECTION)
        .findOne({ user: objectid(UserId) });
      if (UserCart) {
        let ProductExist = UserCart.products.findIndex(
          (product) => product.item == ProductId
        );
        if (ProductExist != -1) {
          db.get()
            .collection(collection.CART_COLLECTION)
            .updateOne(
              { user: objectid(UserId), "products.item": objectid(ProductId) },
              {
                $inc: { "products.$.quantity": 1 },
              }
            )
            .then(() => {
              resolve();
            });
        } else {
          db.get()
            .collection(collection.CART_COLLECTION)
            .updateOne(
              { user: objectid(UserId) },
              {
                $push: { products: productObject },
              }
            )
            .then((responses) => {
              resolve();
            });
        }
      } else {
        let CartObj = {
          user: objectid(UserId),
          products: [productObject],
        };
        db.get()
          .collection(collection.CART_COLLECTION)
          .insertOne(CartObj)
          .then((response) => {
            resolve(response);
          });
      }
    });
  },
  GetcartItmes: (UserId) => {
    return new Promise(async (resolve, reject) => {
      let CartItems = await db
        .get()
        .collection(collection.CART_COLLECTION)
        .aggregate([
          {
            $match: { user: objectid(UserId) },
          },
          {
            $unwind: "$products",
          },
          {
            $project: {
              item: "$products.item",
              quantity: "$products.quantity",
            },
          },
          {
            $lookup: {
              from: collection.PRODUCT_COLLECTION,
              localField: "item",
              foreignField: "_id",
              as: "productslists",
            },
          },
          {
            $project: {
              item: 1,
              quantity: 1,
              products: { $arrayElemAt: ["$productslists", 0] },
            },
          },
          {
            $project: {
              item: 1,
              quantity: 1,
              products: 1,
              total: {
                $sum: {
                  $multiply: ["$quantity", { $toInt: "$products.price" }],
                },
              },
            },
          },
        ])
        .toArray();
      resolve(CartItems);
    });
  },
  getCartCount: (UserId) => {
    return new Promise(async (resolve, reject) => {
      let count = 0;
      let Cart = await db
        .get()
        .collection(collection.CART_COLLECTION)
        .findOne({ user: objectid(UserId) });
      if (Cart) {
        count = Cart.products.length;
      }
      resolve(count);
    });
  },
  changeProductQuantity: (details) => {
    details.counts = parseInt(details.counts);
    details.quantities = parseInt(details.quantities);
    return new Promise((resolve, reject) => {
      if (details.counts == -1 && details.quantities == 1) {
        db.get()
          .collection(collection.CART_COLLECTION)
          .updateOne(
            { _id: objectid(details.cart) },
            {
              $pull: { products: { item: objectid(details.product) } },
            }
          )
          .then((response) => {
            resolve({ removeProduct: true });
          });
      } else {
        db.get()
          .collection(collection.CART_COLLECTION)
          .updateOne(
            {
              _id: objectid(details.cart),
              "products.item": objectid(details.product),
            },
            {
              $inc: { "products.$.quantity": details.counts },
            }
          )
          .then((response) => {
            resolve({ status: true });
          });
      }
    });
  },
  productRemove: (removedetails) => {
    console.log(removedetails);
    return new Promise((resolve, reject) => {
      db.get()
        .collection(collection.CART_COLLECTION)
        .updateOne(
          { _id: objectid(removedetails.cart) },
          {
            $pull: { products: { item: objectid(removedetails.product) } },
          }
        )
        .then((response) => {
          resolve({ removeProduct: true });
        });
    });
  },
  getTotalAmount: (userdId) => {
    return new Promise(async (resolve, reject) => {
      let totalprice = await db
        .get()
        .collection(collection.CART_COLLECTION)
        .aggregate([
          {
            $match: { user: objectid(userdId) },
          },
          {
            $unwind: "$products",
          },
          {
            $project: {
              item: "$products.item",
              quantity: "$products.quantity",
            },
          },
          {
            $lookup: {
              from: collection.PRODUCT_COLLECTION,
              localField: "item",
              foreignField: "_id",
              as: "productslists",
            },
          },

          {
            $project: {
              item: 1,
              quantity: 1,
              products: { $arrayElemAt: ["$productslists", 0] },
            },
          },

          {
            $group: {
              _id: null,
              total: {
                $sum: {
                  $multiply: ["$quantity", { $toInt: "$products.price" }],
                },
              },
            },
          },
        ])
        .toArray();
      resolve(totalprice[0].total);
    });
  },
  getCartProductList: (userId) => {
    return new Promise(async (resolve, reject) => {
      let carts = await db
        .get()
        .collection(collection.CART_COLLECTION)
        .findOne({ user: objectid(userId) });
      if (carts == null) {
        reject();
      } else {
        resolve(carts.products);
      }
    });
  },
  placeOrder: (order, products, total) => {
    return new Promise((resolve, reject) => {
      let date_ob = new Date();

      // current date
      // adjust 0 before single digit date
      let date = ("0" + date_ob.getDate()).slice(-2);

      // current month
      let month = ("0" + (date_ob.getMonth() + 1)).slice(-2);

      // current year
      let year = date_ob.getFullYear();

      // current hours
      let hours = date_ob.getHours();
      let hr = hours >= 12 ? "Pm" : "Am";
      // current minutes
      let minutes = date_ob.getMinutes();
      //time calculate
      let dateRes =
        "Date: " +
        year +
        "-" +
        month +
        "-" +
        date +
        "\n" +
        "Time: " +
        hours +
        ":" +
        minutes +
        " " +
        hr;

      let status = order.Payment === "COD" ? "placed" : "pending";
      let orderObject = {
        deliveryDetails: {
          firstname: order.firstName,
          lastname: order.lastName,
          email: order.email,
          address: order.address,
          zip: order.zip,
          state: order.state,
          country: order.country,
          Mobile: order.mobile,
        },
        date: dateRes,
        userId: objectid(order.userId),
        PaymentMethod: order.Payment,
        products: products,
        totalAmout: total,
        status: status,
      };
      db.get()
        .collection(collection.ORDER_COLLECTION)
        .insertOne(orderObject)
        .then((response) => {
          let result = JSON.stringify(objectid(response.insertedId));
          result = result.replace(/^"(.*)"$/, "$1");
          console.log("responses", result);
          resolve(result);
        });
    });
  },

  getUserOrders: (userId) => {
    console.log("userid: ", userId);
    return new Promise(async (resolve, reject) => {
      let Orders = await db
        .get()
        .collection(collection.ORDER_COLLECTION)
        .find({ userId: objectid(userId) })
        .toArray();
      resolve(Orders);
    });
  },

  getOrderProducts: (orderId) => {
    return new Promise(async (resolve, reject) => {
      let OrderItems = await db
        .get()
        .collection(collection.ORDER_COLLECTION)
        .aggregate([
          {
            $match: { _id: objectid(orderId) },
          },
          {
            $unwind: "$products",
          },
          {
            $project: {
              item: "$products.item",
              quantity: "$products.quantity",
            },
          },
          {
            $lookup: {
              from: collection.PRODUCT_COLLECTION,
              localField: "item",
              foreignField: "_id",
              as: "productslists",
            },
          },
          {
            $project: {
              item: 1,
              quantity: 1,
              products: { $arrayElemAt: ["$productslists", 0] },
            },
          },
          {
            $project: {
              item: 1,
              quantity: 1,
              products: 1,
              total: {
                $sum: {
                  $multiply: ["$quantity", { $toInt: "$products.price" }],
                },
              },
            },
          },
        ])
        .toArray();
      resolve(OrderItems);
    });
  },

  generateRazorpay: (orderId, totalPrice) => {
    return new Promise((resolve, reject) => {
      var options = {
        amount: totalPrice * 100, // amount in the smallest currency unit
        currency: "INR",
        receipt: orderId,
      };
      console.log(orderId, "is here");
      instance.orders.create(options, function (err, order) {
        console.log("new order", order);
        resolve(order);
      });
    });
  },

  verifyPayment: (details) => {
    console.log("$$$$$$$", details["order[receipt]"]);
    return new Promise((resolve, reject) => {
      const crypto = require("crypto");
      let hmac = crypto.createHmac("sha256", "EU8ZWuodmrS9EcGkyNuVAbOv");
      hmac.update(
        details["Payment[razorpay_order_id]"] +
          "|" +
          details["Payment[razorpay_payment_id]"]
      );
      hmac = hmac.digest("hex");
      console.log(hmac);
      if (hmac == details["Payment[razorpay_signature]"]) {
        resolve();
      } else {
        reject();
      }
    });
  },

  changePaymentStatus: (orderId) => {
    return new Promise((resolve, reject) => {
      db.get()
        .collection(collection.ORDER_COLLECTION)
        .updateOne(
          { _id: objectid(orderId) },
          {
            $set: {
              status: "placed",
            },
          }
        )
        .then(() => {
          resolve();
        });
    });
  },

  removefromCart: (OrderId) => {
    return new Promise(async (resolve, reject) => {
      console.log("##order id from 437", OrderId);
      let orderdetail = await db
        .get()
        .collection(collection.ORDER_COLLECTION)
        .findOne({ _id: objectid(OrderId) });
      console.log("##440", orderdetail.userId);
      let UserID = orderdetail.userId;
      db.get()
        .collection(collection.CART_COLLECTION)
        .deleteOne({ user: objectid(UserID) })
        .then((response) => {
          resolve(response);
        });
    });
  },
};
