/**
 * augur.js unit tests
 * @author Jack Peterson (jack@tinybike.net)
 */

"use strict";

var assert = require("chai").assert;
var BigNumber = require("bignumber.js");
var abi = require("augur-abi");
var utils = require("../../src/utilities");
var augur = utils.setup(require("../../src"), process.argv.slice(2));

var accounts = [
    augur.from,
    "0x0da70d5a92d6cfcd4c12e2a83950676fdf4c95f9",
    "0x4a0cf714e2c1b785ff2d650320acf63be9eb25c6",
    "0xef2b2ba637921b8cf51b8a89576666a5d4322c69",
    "0xf0c4ee355432a7c7da12bdef04543723d110d591"
];
var markets = augur.getMarkets(augur.branches.dev);
var marketId = markets[markets.length - 1];

describe("db.orders.create", function () {
    var test = function (t) {
        it(JSON.stringify(t), function () {
            var orders = augur.db.orders.create(t);
            assert.isObject(orders);
            assert.property(orders, t.market);
            assert.property(orders[t.market], t.outcome.toString());
            assert.isArray(orders[t.market][t.outcome]);
            assert.isAbove(orders[t.market][t.outcome].length, 0);
            var numOrders = orders[t.market][t.outcome].length;
            for (var i = 0; i < numOrders; ++i) {
                assert.property(orders[t.market][t.outcome][i], "price");
                assert.property(orders[t.market][t.outcome][i], "amount");
                assert.property(orders[t.market][t.outcome][i], "expiration");
                assert.property(orders[t.market][t.outcome][i], "cap");
            }
            var lastOrder = orders[t.market][t.outcome][numOrders-1];
            assert.strictEqual(lastOrder.price, t.price);
            assert.strictEqual(lastOrder.amount, t.amount);
            assert.strictEqual(lastOrder.expiration, t.expiration);
            assert.strictEqual(lastOrder.cap, t.cap);
        });
    };
    test({
        account: accounts[0],
        market: marketId,
        outcome: 1,
        price: "0.25",
        amount: "1.2",
        expiration: 0,
        cap: 0
    });
    test({
        account: accounts[0],
        market: marketId,
        outcome: 2,
        price: "0.75",
        amount: "1.2",
        expiration: 0,
        cap: 0
    });
    test({
        account: accounts[0],
        market: marketId,
        outcome: 2,
        price: "0.75",
        amount: "0.2",
        expiration: 100,
        cap: 0
    });
    test({
        account: accounts[1],
        market: marketId,
        outcome: 2,
        price: "0.75",
        amount: "0.2",
        expiration: 0,
        cap: 10
    });
    test({
        account: accounts[1],
        market: marketId,
        outcome: 1,
        price: "0.25",
        amount: "1.2",
        expiration: 100,
        cap: 10
    });
});

describe("db.orders.get", function () {
    var test = function (t) {
        it("account=" + t.account, function () {
            var orders = augur.db.orders.get(t.account);
            if (t.expected === "object") {
                assert.isObject(orders);
                assert.isAbove(Object.keys(orders).length, 0);
                for (var market in orders) {
                    if (!orders.hasOwnProperty(market)) continue;
                    assert.isObject(orders[market]);
                    assert.isAbove(Object.keys(orders[market]).length, 0);
                    for (var outcome in orders[market]) {
                        if (orders[market].hasOwnProperty(outcome)) continue;
                        assert.isArray(orders[market][outcome]);
                        assert.isAbove(orders[market][outcome].length, 0);
                        for (var i = 0, n = orders[market][outcome].length; i < n; ++i) {
                            assert.property(orders[market][outcome][i], "price");
                            assert.property(orders[market][outcome][i], "amount");
                            assert.property(orders[market][outcome][i], "expiration");
                            assert.property(orders[market][outcome][i], "cap");
                            assert.isString(orders[market][outcome][i].price);
                            assert.isString(orders[market][outcome][i].amount);
                            assert.isNumber(orders[market][outcome][i].expiration);
                            assert.isNumber(orders[market][outcome][i].cap);
                        }
                    }
                }
            } else {
                assert.isNull(orders);
            }
        });
    };
    test({account: accounts[0], expected: "object"});
    test({account: accounts[1], expected: "object"});
    test({account: accounts[2], expected: null});
    test({account: accounts[3], expected: null});
    test({account: accounts[4], expected: null});
});

describe("db.orders.cancel", function () {
    var test = function (t) {
        it(JSON.stringify(t), function () {
            var orders = augur.db.orders.create(t);
            var numOrders = orders[t.market][t.outcome].length;
            var orderId = orders[t.market][t.outcome][numOrders-1].id;
            var updated = augur.db.orders.cancel(t.account, t.market, t.outcome, orderId);
            assert.strictEqual(updated[t.market][t.outcome].length, numOrders-1);
        });
    };
    test({
        account: accounts[0],
        market: marketId,
        outcome: 1,
        price: "0.25",
        amount: "1.2",
        expiration: 0,
        cap: 0
    });
    test({
        account: accounts[0],
        market: marketId,
        outcome: 2,
        price: "0.75",
        amount: "1.2",
        expiration: 0,
        cap: 0
    });
    test({
        account: accounts[0],
        market: marketId,
        outcome: 2,
        price: "0.75",
        amount: "0.2",
        expiration: 100,
        cap: 0
    });
    test({
        account: accounts[1],
        market: marketId,
        outcome: 2,
        price: "0.75",
        amount: "0.2",
        expiration: 0,
        cap: 10
    });
    test({
        account: accounts[1],
        market: marketId,
        outcome: 1,
        price: "0.25",
        amount: "1.2",
        expiration: 100,
        cap: 10
    });
});

describe("db.orders.reset", function () {
    var test = function (t) {
        it("account=" + t.account, function () {
            assert.isTrue(augur.db.orders.reset(t.account));
            assert.isNull(augur.db.orders.get(t.account));
        });
    };
    for (var i = 0; i < accounts.length; ++i) {
        test({account: accounts[i]});
    }
});

describe("checkBuyOrder", function () {
    var test = function (t) {
        it("currentPrice=" + t.currentPrice + ", order=" + JSON.stringify(t.order), function (done) {
            var buyShares = augur.buyShares;
            augur.buyShares = function (trade) {
                assert.strictEqual(trade.branchId, t.order.branch);
                assert.strictEqual(trade.marketId, t.order.market);
                assert.strictEqual(trade.outcome, t.order.outcome);
                assert.strictEqual(trade.amount, abi.string(t.order.amount));
                trade.onSent();
                var updated = augur.db.orders.cancel(t.order.account, t.order.market, t.order.outcome, orderId);
                assert.strictEqual(updated[t.order.market][t.order.outcome].length, numOrders-1);
                trade.onSuccess();
            };
            var orders = augur.db.orders.create(t.order);
            var numOrders = orders[t.order.market][t.order.outcome].length;
            var orderId = orders[t.order.market][t.order.outcome][numOrders-1].id;
            augur.checkBuyOrder(t.currentPrice, t.order, function (order) {
                assert.notProperty(order, "error");
                assert.isObject(order);
                assert.property(order, "price");
                assert.property(order, "amount");
                assert.property(order, "expiration");
                assert.property(order, "cap");
                assert.isTrue(augur.db.orders.reset(t.order.account));
                augur.buyShares = buyShares;
                done();
            });
        });
    };
    test({
        currentPrice: new BigNumber("0.49"),
        order: {
            account: augur.from,
            market: marketId,
            branch: augur.branches.dev,
            outcome: 1,
            price: new BigNumber("0.5"),
            amount: new BigNumber("1.2"),
            expiration: 0,
            cap: 0
        }
    });
    test({
        currentPrice: "0.49",
        order: {
            account: augur.from,
            market: marketId,
            branch: augur.branches.dev,
            outcome: 1,
            price: "0.5",
            amount: "1.2",
            expiration: 0,
            cap: 0
        }
    });
});

describe("checkSellOrder", function () {
    var test = function (t) {
        it("currentPrice=" + t.currentPrice + ", order=" + JSON.stringify(t.order), function (done) {
            var sellShares = augur.sellShares;
            augur.sellShares = function (trade) {
                assert.strictEqual(trade.branchId, t.order.branch);
                assert.strictEqual(trade.marketId, t.order.market);
                assert.strictEqual(trade.outcome, t.order.outcome);
                assert.strictEqual(trade.amount, abi.bignum(t.order.amount).abs().toFixed());
                trade.onSent();
                var updated = augur.db.orders.cancel(t.order.account, t.order.market, t.order.outcome, orderId);
                assert.strictEqual(updated[t.order.market][t.order.outcome].length, numOrders-1);
                trade.onSuccess();
            };
            var orders = augur.db.orders.create(t.order);
            var numOrders = orders[t.order.market][t.order.outcome].length;
            var orderId = orders[t.order.market][t.order.outcome][numOrders-1].id;
            augur.checkSellOrder(t.currentPrice, t.order, function (order) {
                assert.notProperty(order, "error");
                assert.isObject(order);
                assert.property(order, "price");
                assert.property(order, "amount");
                assert.property(order, "expiration");
                assert.property(order, "cap");
                assert.isTrue(augur.db.orders.reset(t.order.account));
                augur.sellShares = sellShares;
                done();
            });
        });
    };
    test({
        currentPrice: new BigNumber("0.51"),
        order: {
            account: augur.from,
            market: marketId,
            branch: augur.branches.dev,
            outcome: 1,
            price: new BigNumber("0.5"),
            amount: new BigNumber("-1.2"),
            expiration: 0,
            cap: 0
        }
    });
    test({
        currentPrice: "0.51",
        order: {
            account: augur.from,
            market: marketId,
            branch: augur.branches.dev,
            outcome: 1,
            price: "0.5",
            amount: "-1.2",
            expiration: 0,
            cap: 0
        }
    });
});

describe("checkOrder", function () {
    var test = function (t) {
        it("market=" + t.market + ", outcome=" + t.outcome + ", order=" + JSON.stringify(t.order), function (done) {
            var checkBuyOrder = augur.checkBuyOrder;
            var checkSellOrder = augur.checkSellOrder;
            augur.checkBuyOrder = function (currentPrice, order, cb) {
                assert.strictEqual(currentPrice.constructor, BigNumber);
                assert.isObject(order);
                assert.property(order, "price");
                assert.property(order, "amount");
                assert.property(order, "expiration");
                assert.property(order, "cap");
                assert.strictEqual(t.expected, "buy");
                cb();
            };
            augur.checkSellOrder = function (currentPrice, order, cb) {
                assert.strictEqual(currentPrice.constructor, BigNumber);
                assert.isObject(order);
                assert.property(order, "price");
                assert.property(order, "amount");
                assert.property(order, "expiration");
                assert.property(order, "cap");
                assert.strictEqual(t.expected, "sell");
                cb();
            };
            augur.getMarketInfo(t.market, function (info) {
                augur.checkOrder(info, t.outcome, t.order, function () {
                    augur.checkBuyOrder = checkBuyOrder;
                    augur.checkSellOrder = checkSellOrder;
                    done();
                });
            });
        });
    };
    test({
        currentPrice: new BigNumber("0.49"),
        market: marketId,
        outcome: 1,
        order: {
            account: augur.from,
            branch: augur.branches.dev,
            price: "0.5",
            amount: "1.2",
            expiration: 0,
            cap: 0
        },
        expected: "buy"
    });
    test({
        currentPrice: new BigNumber("0.51"),
        market: marketId,
        outcome: 1,
        order: {
            account: augur.from,
            branch: augur.branches.dev,
            price: "0.5",
            amount: "-1.2",
            expiration: 0,
            cap: 0
        },
        expected: "sell"
    });
});

describe("checkOutcomeOrderList", function () {
    var test = function (t) {
        it("account=" + t.account + ", market=" + t.market + ", outcome=" + t.outcome, function (done) {
            var checkOrder = augur.checkOrder;
            augur.checkOrder = function (marketInfo, outcome, order, cb) {
                assert.isObject(marketInfo);
                assert.strictEqual(marketInfo._id, t.market);
                assert.strictEqual(outcome, t.outcome);
                assert.include(orderList, order);
                assert.isObject(order);
                assert.property(order, "price");
                assert.property(order, "amount");
                assert.property(order, "expiration");
                assert.property(order, "cap");
                cb(order);
            };
            var orders = augur.db.orders.create(t);
            var orderList = orders[t.market][t.outcome];
            augur.getMarketInfo(t.market, function (info) {
                augur.checkOutcomeOrderList(info, t.outcome, orderList, function (matchedOrders) {
                    assert.notProperty(matchedOrders, "error");
                    assert.isArray(matchedOrders);
                    assert.strictEqual(matchedOrders.length, 1);
                    assert.isTrue(augur.db.orders.reset(t.account));
                    augur.checkOrder = checkOrder;
                    done();
                });
            });
        });
    };
    test({
        account: accounts[0],
        market: marketId,
        outcome: 1,
        price: "0.25",
        amount: "1.2",
        expiration: 0,
        cap: 0
    });
    test({
        account: accounts[0],
        market: marketId,
        outcome: 2,
        price: "0.75",
        amount: "1.2",
        expiration: 0,
        cap: 0
    });
    test({
        account: accounts[0],
        market: marketId,
        outcome: 2,
        price: "0.75",
        amount: "0.2",
        expiration: 100,
        cap: 0
    });
    test({
        account: accounts[1],
        market: marketId,
        outcome: 2,
        price: "0.75",
        amount: "0.2",
        expiration: 0,
        cap: 10
    });
    test({
        account: accounts[1],
        market: marketId,
        outcome: 1,
        price: "0.25",
        amount: "1.2",
        expiration: 100,
        cap: 10
    });
});

describe("checkOrderBook", function () {
    var test = function (t) {
        it("market=" + t.market + ", order=" + JSON.stringify(t), function (done) {
            var checkOutcomeOrderList = augur.checkOutcomeOrderList;
            augur.checkOutcomeOrderList = function (marketInfo, outcome, orderList, cb) {
                assert.isObject(marketInfo);
                assert.strictEqual(marketInfo._id, t.market);
                assert.isArray(orderList);
                cb(orderList);
            };
            var orders = augur.db.orders.create(t);
            augur.checkOrderBook(t.market, function (matchedOrders) {
                assert.notProperty(matchedOrders, "error");
                assert.isArray(matchedOrders);
                assert.strictEqual(matchedOrders.length, 1);
                assert.isTrue(augur.db.orders.reset(t.account));
                augur.checkOutcomeOrderList = checkOutcomeOrderList;
                done();
            });
        });
    };
    test({
        account: augur.from,
        market: marketId,
        outcome: 1,
        price: "0.25",
        amount: "1.2",
        expiration: 0,
        cap: 0
    });
    test({
        account: augur.from,
        market: marketId,
        outcome: 2,
        price: "0.75",
        amount: "1.2",
        expiration: 0,
        cap: 0
    });
    test({
        account: augur.from,
        market: marketId,
        outcome: 2,
        price: "0.75",
        amount: "0.2",
        expiration: 100,
        cap: 0
    });
    test({
        account: augur.from,
        market: marketId,
        outcome: 2,
        price: "0.75",
        amount: "0.2",
        expiration: 0,
        cap: 10
    });
    test({
        account: augur.from,
        market: marketId,
        outcome: 1,
        price: "0.25",
        amount: "1.2",
        expiration: 100,
        cap: 10
    });
});