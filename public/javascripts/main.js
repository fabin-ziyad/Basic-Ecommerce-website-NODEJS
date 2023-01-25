function AddtoCart(productId) {
    $.ajax({
        url: '/add-cart/' + productId,
        method: 'get',
        success: (response) => {
            if (response.status) {
                let count = $('#cart-count').html()
                count = parseInt(count) + 1
                $('#cart-count').html(count)
                //for automatically update cart items lists
            }
        }
    })
}
