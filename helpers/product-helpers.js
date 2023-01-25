var db = require('../config/connection')
var collection = require('../config/collection')
var objectid=require('mongodb').ObjectId
module.exports = {
    addProduct: (products, callback) => {
        //console.log(products);
        db.get().collection('Products').insertOne(products).then((data) => {
            callback(data.insertedId.toString())
        })
    },
    getAllProducts: () => {
        return new Promise(async(resolve, reject) => {
            let productlist = await db.get().collection(collection.PRODUCT_COLLECTION).find().toArray()
            // console.log(productlist);
            resolve(productlist)
           
        })
    },
    deleteProducts: (ProductId) => {
        // console.log("productid",ProductId);
        return new Promise((resolve, reject) => {
            db.get().collection(collection.PRODUCT_COLLECTION).deleteOne({ _id: objectid(ProductId) }).then((response) => {
                resolve(response)
            })
        })
    },
    GetProductDetails: (ProductId) => {
        return new Promise((resolve, reject) => {
            db.get().collection(collection.PRODUCT_COLLECTION).findOne({ _id: objectid(ProductId) }).then((product) => {
                resolve(product)
            })
        })
    },
    UpdateProduct: (ProductId, ProductDetails) => {
        return new Promise((resolve, reject) => {
            db.get().collection(collection.PRODUCT_COLLECTION).updateOne({ _id: objectid(ProductId) }, {
                $set: {
                    name: ProductDetails.name,
                    varient: ProductDetails.varient,
                    category: ProductDetails.category,
                    price:ProductDetails.price
            }
            }).then((response) => {
                resolve()
            })
        })
    },
    
}