var express = require("express");
const productHelpers = require("../helpers/product-helpers");
const userHelpers = require("../helpers/user-helpers");
const adminHelpers= require("../helpers/admin-helpers");
var router = express.Router();
var bcrypt = require("bcrypt");


/* GET users listing. */

let verifyLogin = (req, res, next) => {
  if (req.session.adminLoggedIn) {
    next();
  } else {
    res.redirect("/admin/admin-login");
  }
};

router.get("/",verifyLogin, async function (req, res, next) {
  let pass = 'admin@2022'
  pass = await bcrypt.hash(pass, 10);
  console.log(pass);
    productHelpers.getAllProducts().then((products) => {
      res.render("admin/view-products", { admin: true, products });
    });
});

// Login 
router.post("/admin-login", (req, res) => {
  adminHelpers.doLogin(req.body).then((response) => {
    if (response.status) {
      req.session.admin = response.admin;
      req.session.adminLoggedIn = true;
      // console.log("done");
      res.redirect("/admin");
    } else {
      req.session.adminLoginError = "Invalid username or Password";
      res.redirect("/admin/admin-login");
    }
  });
});

//logout section
router.get("/admin-logout", (req, res) => {
  req.session.admin = null;
  req.session.adminLoggedIn = false;
  res.redirect("/admin");
});

router.get("/admin-login", (req, res) => {
  if (req.session.admin) {
    //if user inside the session then redirect to home
    res.redirect("/admin");
  } else {
    res.render("admin/admin-login", { loginerror: req.session.adminLoginError ,admin:true}); //error message passing with same page
    req.session.adminLoginError = false;
  }
});
///////////////////////////////////////////////////////////////////////////////////////////////////////////////
//ADD PRODUCT

router.get("/add-product",verifyLogin,  (req, res) => {
  res.render("admin/add-product", { admin: true });
});
router.post("/add-product", (req, res) => {
  productHelpers.addProduct(req.body, (id) => {
    let productImages = req.files.image;
    productImages.mv("./public/product-images/" + id + ".jpg", (err, done) => {
      if (!err) {
        res.render("admin/add-product",{admin:true});
      } else {
        console.log(err);
        res.send(err)
      }
    });
  });
});

///////////////////////////////////////////////////////////////////////////////////////////////////////////////
//DELETE PRODUCTS

router.get("/delete-product/:id",verifyLogin,  (req, res) => {
  let ProductId = req.params.id;
  productHelpers.deleteProducts(ProductId).then((response) => {
    res.redirect("/admin");
  });
});

///////////////////////////////////////////////////////////////////////////////////////////////////////////////
//EDIT PRODUCTS

router.get("/edit-product",verifyLogin,  async (req, res) => {
  let EditProductId = await productHelpers.GetProductDetails(req.query.id);
  res.render("admin/edit-product", {admin:true, editproduct: EditProductId });
});

router.post("/edit-product/:id", (req, res) => {
  console.log(req.params.id);
  productHelpers.UpdateProduct(req.params.id, req.body).then(() => {
    res.redirect("/admin");
    if (req.files.image) {
      let productImages = req.files.image;
      productImages.mv("./public/product-images/" + req.params.id + ".jpg");
    }
  });
});

///////////////////////////////////////////////////////////////////////////////////////////////////////////////


router.get("/userdata",verifyLogin,  (req, res) => {
  userHelpers.Allusers().then((responses) => {
    res.render("admin/usersdata", { admin: true, responses })
    // console.log(responses);
  })
})

///////////////////////////////////////////////////////////////////////////////////////////////////////////////


module.exports = router;
