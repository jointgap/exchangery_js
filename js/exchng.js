(function() {
	function Exchng(marketId, eventHandler) {
		this.marketId = marketId;
		this.eventHandler = eventHandler;
		this.products = {};
		this._fetching = false;
	}
	Exchng.prototype.fetchData = function() {
		this._fetching = true;
		var exchng = this;
		$.get('ts/market_snapshot', {
			'key': 'A8b04F3',
			'market_id': this.marketId,
			'_r': new Date().getTime()
		}, function(data, textStatus) {
			if(textStatus == 'success') {
				var snapshot = data['snapshot'];
				var market = snapshot['market'];
				var products = {};
				$.each(snapshot['products'], function() {
					products[this['id']] = {
						'id': this['id'],
						'symbol': this['symbol'],
						'orders': {
							'offers': [],
							'bids': []
						}
					};
				});
				$.each(snapshot['orders'], function() {
					products[this['product_id']]['orders'][this['side'] + 's'].push({
						'id': this['id'],
						'price': this['price'],
						'quantity': this['quantity']
					});
				});
				exchng.products = {};
				$.each(products, function(k) {
					exchng.products[k] = new Exchng.Product(this['id'], this['symbol'], this['orders']);
				});
				exchng.eventHandler({
					'name': 'fetch-complete'
				});
			}
			exchng._fetching = false;
		}, 'json');
	};
	Exchng.prototype.beginPoll = function(callback) {
	    var exchgn = this;
	    var poll = function () {
		if (!exchng._fetching) {
		    exchng._fetching = true;
		    $.ajax({
			//url: '/market_update.json?'+(new Date()).getTime(),
			url: 'ts/market_update', 
			dataType: 'json',
			success: function(data) {
			    exchng._fetching = false;
			    callback(data);
			},
			error: function (error) {
			    exchng._fetching = false;
			    log("error polling", error.statusText);
			}
		    });
		}
	    }
	    
	    setInterval(poll, 10000);
	};
    Exchng.prototype.removeOrder = function (target_id) {
	var exchng = this;
	// TODO this walk isn't the prettiest thing out there
	// might also turn out to be slow when the market is big
	// should probably maintain some sort of order_id hashmap
	$.each(exchng.products, function (i, product) {
	    $.each(product.orders, function (side, orders) {
		$.each(product.orders[side], function (i, order) {
		    if (order.id == target_id) {
			product.orders[side].splice(i, 1);
		    }
		});
	    });
	});
    };
	Exchng.Product = function(id, symbol, orders) {
		var product = this;
		this['id'] = id;
		this['symbol'] = symbol;
		this['orders'] = {
			'offers': orders['offers'].slice(0),
			'bids': orders['bids'].slice(0)
		};
		this.sortOrders();
	};
	Exchng.Product.prototype.addOrder = function(order) {
		var orders = this['orders'];
	        var side = order['side'];
	        if (side == 'buy') {
		    side = 'bid';
  	        }else if (side == 'sell') {
		    side = 'offer';
	        }
	    
		orders[side + 's'].push({
						'id': order['id'],
						'price': order['price'],
						'quantity': order['quantity']
					});
	};
	Exchng.Product.prototype.sortOrders = function() {
		var orders = this['orders'];
		var product = this;
		orders['offers'].sort(function(a, b) {
			return a['price'] < b['price'];
		});
		orders['bids'].sort(function(a, b) {
			return a['price'] < b['price'];
		});
		this['details'] = [];
		$.each(orders['offers'], function() {
			if(product['details'].length == 0 || product['details'][product['details'].length - 1]['offer'] != this['price']) {
				product['details'].push({
					'offer': this['price'],
					'offer_quantity': this['quantity']
				});
			} else {
				product['details'][product['details'].length - 1]['offer_quantity'] += this['quantity'];
			}
		});
		$.each(orders['bids'], function() {
			if(product['details'].length == 0) {
				product['details'].push({
					'bid': this['price'],
					'bid_quantity': this['quantity']
				});
				product['details'][product['details'].length - 1]['best'] = true;
			} else if('bid' in product['details'][product['details'].length - 1]) {
				if(product['details'][product['details'].length - 1]['bid'] != this['price']) {
					product['details'].push({
						'bid': this['price'],
						'bid_quantity': this['quantity']
					});
				} else {
					product['details'][product['details'].length - 1]['bid_quantity'] += this['quantity'];
				}
			} else {
				product['details'][product['details'].length - 1]['best'] = true;
				product['details'][product['details'].length - 1]['bid'] = this['price'];
				product['details'][product['details'].length - 1]['bid_quantity'] = this['quantity'];
			}
		});
	};
	window['Exchng'] = Exchng;
})();
