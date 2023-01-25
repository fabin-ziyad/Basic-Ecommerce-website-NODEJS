const { json } = require("express");
var express = require("express");
const session = require("express-session");
var router = express.Router();
const productHelpers = require("../helpers/product-helpers");
const userhelpers = require("../helpers/user-helpers");

/* GET home page. */
let verifyLogin = (req, res, next) => {
  if (req.session.userLoggedIn) {
    next();
  } else {
    res.redirect("/login");
  }
};

router.get("/", async function (req, res, next) {
  let user = req.session.user;
  let CartCount = null;
  if (req.session.user) {
    CartCount = await userhelpers.getCartCount(req.session.user._id);
  }
  productHelpers.getAllProducts().then((products) => {
    res.render("users/User-home", { admin: false, products, user, CartCount });
 });
});
router.get("/login", (req, res) => {
  if (req.session.user) {
    //if user inside the session then redirect to home
    res.redirect("/");
  } else {
    res.render("users/login", { loginerror: req.session.userLoginError }); //error message passing with same page
    req.session.userLoginError = false;
  }
});

router.post("/login", (req, res) => {
  userhelpers.doLogin(req.body).then((response) => {
    if (response.status) {
      req.session.user = response.user;
      req.session.userLoggedIn = true;
      res.redirect("/");
    } else {
      req.session.userLoginError = "Invalid username or Password";
      res.redirect("/login");
    }
  });
});

//signup section
router.get("/signup", (req, res) => {
  if (req.session.user) {
    res.redirect("/");
  } else {
    res.render("users/signup");
  }
});
router.post("/signup", (req, res) => {
  userhelpers
    .doSignup(req.body)
    .then((response) => {
      req.session.user = response.user;
      req.session.userLoggedIn = true;
      res.redirect("/login");
    })
    .catch((err) => {
      res.send(err);
    });
});

//logout section
router.get("/logout", (req, res) => {
  req.session.user = null;
  req.session.userLoggedIn = false;
  res.redirect("/");
});

//cart section
router.get("/cart",verifyLogin, async (req, res) => {
    let cartProduct = await userhelpers.GetcartItmes(req.session.user._id);
    let totalprice = 0;
    if (cartProduct.length > 0) {
      totalprice = await userhelpers.getTotalAmount(req.session.user._id);
    }
    res.render("users/cart", {
      cartProduct,
      userD: req.session.user._id,
      user: req.session.user,
      totalprice,
    });
});
router.get("/add-cart/:id",(req, res) => {
  console.log("api call");
  if (req.session.userLoggedIn) {
    userhelpers.AddtoCart(req.params.id, req.session.user._id).then(() => {
      res.json({ status: true });
    });
  } else {
    res.redirect('/login')
  }
 
});

router.post("/change-product-quantity",verifyLogin, (req, res, next) => {
  userhelpers.changeProductQuantity(req.body).then(async (response) => {
    response.totalprice = await userhelpers.getTotalAmount(req.body.user);
    res.json(response);
  });
});

router.post("/remove-cart-product",verifyLogin, (req, res) => {
  userhelpers.productRemove(req.body).then((response) => {
    res.json(response);
  });
});

router.get("/checkout",verifyLogin, async (req, res) => {
    let cartProduct = await userhelpers.GetcartItmes(req.session.user._id);
    CartCount = await userhelpers.getCartCount(req.session.user._id);
    let totalprice = 0;
    if (cartProduct.length > 0) {
      totalprice = await userhelpers.getTotalAmount(req.session.user._id);
    res.render("users/checkout", {
      user: req.session.user,
      cartProduct,
      CartCount,
      totalprice,
    });
  } else {
    res.redirect("/login");
  }
});

router.post("/checkout",verifyLogin, async (req, res) => {
  let cartProductlist = await userhelpers.getCartProductList(req.body.userId);
  let totalPrice = await userhelpers.getTotalAmount(req.body.userId);
  userhelpers.placeOrder(req.body, cartProductlist, totalPrice).then((orderId) => {
      if (req.body.Payment === "COD") {
        res.json({ codSuccess: true });
      } else {
        userhelpers.generateRazorpay(orderId, totalPrice).then((response) => {
          res.json(response);
        });
      }
    })
    .catch((err) => {
      console.log(err);
      res.redirect("/");
    });
});

router.get("/success",verifyLogin, (req, res) => {
  res.render("users/success", { user: req.session.user });
});

router.get("/orders", verifyLogin, async (req, res) => {
  
    let getOrders = await userhelpers.getUserOrders(req.session.user._id);
    getOrders = getOrders.reverse();
    res.render("users/orders", { getOrders,user:req.session.user });
});

router.get("/order-details/:id",verifyLogin, async (req, res) => {
  let products = await userhelpers.getOrderProducts(req.params.id);
  console.log("produts", products);
  res.render("users/order-details", { user: req.session.user, products });
});

router.post("/verify-payment",verifyLogin, (req, res) => {
  console.log("*#%$", req.body);
  userhelpers
    .verifyPayment(req.body)
    .then(() => {
      userhelpers.changePaymentStatus(req.body["order[receipt]"]).then(() => {
        userhelpers.removefromCart(req.body["order[receipt]"]).then(() => {
          console.log("success");
          res.json({ status: true });
        });
      });
    })
    .catch((err) => {
      console.log(err);
      res.json({ status: false, errMsg: "Payment failed" });
    });
});
module.exports = router;
