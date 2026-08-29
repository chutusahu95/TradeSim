/*
 * TradeSim Trading Engine
 * Pro Chart Engine - Stage 1
 *
 * Handles:
 * - Virtual cash
 * - BUY / SELL
 * - Position management
 * - Average entry price
 * - Realized P/L
 * - Unrealized P/L
 * - Stop-loss
 * - Target
 * - Trade history
 * - Order history
 * - BUY / SELL chart markers
 * - Risk calculations
 *
 * PAPER TRADING ONLY
 */

(function () {

    "use strict";


    const STARTING_CASH = 1000000;


    /*
     * Persistent state
     */

    let state = loadState();


    function loadState() {

        try {

            const saved =
                localStorage.getItem(
                    "tradesim_state"
                );

            if (saved) {

                const parsed =
                    JSON.parse(saved);

                return {

                    cash:
                        Number(parsed.cash) ||
                        STARTING_CASH,

                    positions:
                        parsed.positions ||
                        {},

                    orders:
                        Array.isArray(
                            parsed.orders
                        )
                            ? parsed.orders
                            : [],

                    trades:
                        Array.isArray(
                            parsed.trades
                        )
                            ? parsed.trades
                            : [],

                    realizedPnl:
                        Number(
                            parsed.realizedPnl
                        ) || 0

                };

            }

        } catch (error) {

            console.error(
                "TradeSim state load error:",
                error
            );

        }


        return {

            cash: STARTING_CASH,

            positions: {},

            orders: [],

            trades: [],

            realizedPnl: 0

        };

    }


    function saveState() {

        localStorage.setItem(

            "tradesim_state",

            JSON.stringify(state)

        );

        /*
         * Expose the same state to
         * chart-engine.js.
         */

        window.TradeSimState = state;

    }


    saveState();


    window.TradeSimTrading = {


        /*
         * Get complete state.
         */

        getState: function () {

            return state;

        },


        /*
         * Current virtual cash.
         */

        getCash: function () {

            return state.cash;

        },


        /*
         * Current positions.
         */

        getPositions: function () {

            return state.positions;

        },


        /*
         * Get one position.
         */

        getPosition: function (
            symbol
        ) {

            return state.positions[
                symbol
            ] || null;

        },


        /*
         * Get current market price.
         */

        getPrice: function (
            symbol
        ) {

            if (
                window.TradeSimMarket
            ) {

                return TradeSimMarket
                    .getPrice(symbol);

            }

            return null;

        },


        /*
         * Calculate order value.
         */

        calculateOrderValue:
            function (
                symbol,
                quantity
            ) {

                const price =
                    this.getPrice(symbol);

                if (
                    !Number.isFinite(price) ||
                    !Number.isFinite(quantity)
                ) {

                    return 0;

                }

                return price * quantity;

            },


        /*
         * Calculate position risk.
         */

        calculateRisk:
            function (
                symbol,
                quantity,
                stopLoss
            ) {

                const price =
                    this.getPrice(symbol);

                if (
                    !Number.isFinite(price) ||
                    !Number.isFinite(quantity)
                ) {

                    return {

                        amount: 0,

                        percent: 0

                    };

                }


                if (
                    !Number.isFinite(stopLoss) ||
                    stopLoss <= 0
                ) {

                    return {

                        amount: 0,

                        percent: 0

                    };

                }


                const riskPerUnit =
                    Math.abs(
                        price - stopLoss
                    );


                const riskAmount =
                    riskPerUnit *
                    quantity;


                return {

                    amount:
                        riskAmount,

                    percent:
                        (
                            riskAmount /
                            STARTING_CASH
                        ) * 100

                };

            },


        /*
         * Risk assessment.
         */

        assessRisk:
            function (
                symbol,
                quantity,
                stopLoss,
                target
            ) {

                const price =
                    this.getPrice(symbol);

                const orderValue =
                    this.calculateOrderValue(
                        symbol,
                        quantity
                    );


                const warnings = [];


                if (
                    orderValue >
                    STARTING_CASH * 0.25
                ) {

                    warnings.push(
                        "Position is larger than 25% of starting capital."
                    );

                }


                if (
                    Number.isFinite(
                        stopLoss
                    )
                ) {

                    if (
                        stopLoss >= price
                    ) {

                        warnings.push(
                            "For a BUY, stop-loss should normally be below the entry price."
                        );

                    }

                }


                if (
                    Number.isFinite(target)
                ) {

                    if (
                        target <= price
                    ) {

                        warnings.push(
                            "For a BUY, target should normally be above the entry price."
                        );

                    }

                }


                if (
                    Number.isFinite(
                        stopLoss
                    ) &&
                    Number.isFinite(
                        target
                    )
                ) {

                    const risk =
                        Math.abs(
                            price -
                            stopLoss
                        );

                    const reward =
                        Math.abs(
                            target -
                            price
                        );


                    if (risk > 0) {

                        const ratio =
                            reward /
                            risk;


                        if (ratio < 1) {

                            warnings.push(
                                "Risk/reward ratio is below 1:1."
                            );

                        }

                    }

                }


                return {

                    orderValue:
                        orderValue,

                    accountPercent:
                        (
                            orderValue /
                            STARTING_CASH
                        ) * 100,

                    warnings:
                        warnings

                };

            },


        /*
         * BUY.
         */

        buy: function (
            symbol,
            quantity,
            options
        ) {

            options =
                options || {};


            return this.execute(
                "BUY",
                symbol,
                quantity,
                options
            );

        },


        /*
         * SELL.
         */

        sell: function (
            symbol,
            quantity,
            options
        ) {

            options =
                options || {};


            return this.execute(
                "SELL",
                symbol,
                quantity,
                options
            );

        },


        /*
         * Main order execution.
         */

        execute: function (
            side,
            symbol,
            quantity,
            options
        ) {

            options =
                options || {};


            side =
                String(side)
                    .toUpperCase();


            symbol =
                String(symbol)
                    .toUpperCase();


            quantity =
                Number(quantity);


            if (
                side !== "BUY" &&
                side !== "SELL"
            ) {

                return {

                    success: false,

                    message:
                        "Invalid order side."

                };

            }


            if (
                !Number.isFinite(quantity) ||
                quantity <= 0
            ) {

                return {

                    success: false,

                    message:
                        "Enter a valid quantity."

                };

            }


            /*
             * IMPORTANT:
             * Get price from the same
             * market engine used by chart.
             */

            const price =
                this.getPrice(symbol);


            if (
                !Number.isFinite(price) ||
                price <= 0
            ) {

                return {

                    success: false,

                    message:
                        "Market price is unavailable."

                };

            }


            const value =
                price * quantity;


            const timestamp =
                Math.floor(
                    Date.now() / 1000
                );


            /*
             * BUY
             */

            if (side === "BUY") {

                if (
                    value > state.cash
                ) {

                    return {

                        success: false,

                        message:
                            "Insufficient virtual cash.",

                        required:
                            value,

                        available:
                            state.cash

                    };

                }


                /*
                 * Risk warning.
                 */

                const risk =
                    this.assessRisk(

                        symbol,

                        quantity,

                        Number(
                            options.stopLoss
                        ),

                        Number(
                            options.target
                        )

                    );


                if (
                    risk.warnings.length > 0 &&
                    options.skipRiskWarning !== true
                ) {

                    /*
                     * Return warning rather than
                     * silently executing.
                     */

                    return {

                        success: false,

                        requiresConfirmation:
                            true,

                        message:
                            risk.warnings.join(
                                "\n"
                            ),

                        warnings:
                            risk.warnings,

                        orderValue:
                            value

                    };

                }


                state.cash -= value;


                /*
                 * Create or update position.
                 */

                if (
                    !state.positions[symbol]
                ) {

                    state.positions[symbol] = {

                        symbol:
                            symbol,

                        quantity:
                            0,

                        averagePrice:
                            0,

                        invested:
                            0,

                        stopLoss:
                            Number.isFinite(
                                Number(
                                    options.stopLoss
                                )
                            )
                                ? Number(
                                    options.stopLoss
                                )
                                : null,

                        target:
                            Number.isFinite(
                                Number(
                                    options.target
                                )
                            )
                                ? Number(
                                    options.target
                                )
                                : null

                    };

                }


                const position =
                    state.positions[symbol];


                const oldQuantity =
                    Number(
                        position.quantity
                    ) || 0;


                const oldAverage =
                    Number(
                        position.averagePrice
                    ) || 0;


                const newQuantity =
                    oldQuantity +
                    quantity;


                const newAverage =

                    (
                        oldAverage *
                        oldQuantity +

                        price *
                        quantity

                    ) /

                    newQuantity;


                position.quantity =
                    newQuantity;


                position.averagePrice =
                    newAverage;


                position.invested =
                    newQuantity *
                    newAverage;


                if (
                    Number.isFinite(
                        Number(
                            options.stopLoss
                        )
                    )
                ) {

                    position.stopLoss =
                        Number(
                            options.stopLoss
                        );

                }


                if (
                    Number.isFinite(
                        Number(
                            options.target
                        )
                    )
                ) {

                    position.target =
                        Number(
                            options.target
                        );

                }

            }


            /*
             * SELL
             */

            if (side === "SELL") {

                const position =
                    state.positions[symbol];


                if (!position) {

                    return {

                        success: false,

                        message:
                            "You do not own this instrument."

                    };

                }


                const owned =
                    Number(
                        position.quantity
                    ) || 0;


                if (
                    quantity >
                    owned + 0.000000001
                ) {

                    return {

                        success: false,

                        message:
                            "You cannot sell more than your current holding.",

                        owned:
                            owned,

                        requested:
                            quantity

                    };

                }


                /*
                 * Realized P/L.
                 */

                const average =
                    Number(
                        position.averagePrice
                    );


                const realized =
                    (
                        price -
                        average
                    ) * quantity;


                state.realizedPnl +=
                    realized;


                state.cash += value;


                const remaining =
                    owned -
                    quantity;


                if (
                    remaining <=
                    0.000000001
                ) {

                    delete state.positions[
                        symbol
                    ];

                } else {

                    position.quantity =
                        remaining;

                    position.invested =
                        remaining *
                        position.averagePrice;

                }

            }


            /*
             * Create permanent order record.
             */

            const order = {

                id:
                    "TS-" +
                    Date.now() +
                    "-" +
                    Math.floor(
                        Math.random() *
                        10000
                    ),

                symbol:
                    symbol,

                side:
                    side,

                type:
                    "MARKET",

                quantity:
                    quantity,

                price:
                    price,

                value:
                    value,

                stopLoss:
                    Number.isFinite(
                        Number(
                            options.stopLoss
                        )
                    )
                        ? Number(
                            options.stopLoss
                        )
                        : null,

                target:
                    Number.isFinite(
                        Number(
                            options.target
                        )
                    )
                        ? Number(
                            options.target
                        )
                        : null,

                timestamp:
                    timestamp,

                date:
                    new Date()
                        .toISOString(),

                status:
                    "FILLED"

            };


            /*
             * Save order.
             */

            state.orders.unshift(
                order
            );


            /*
             * Keep completed trades
             * separately.
             */

            state.trades.push({

                id:
                    order.id,

                symbol:
                    symbol,

                side:
                    side,

                quantity:
                    quantity,

                price:
                    price,

                value:
                    value,

                timestamp:
                    timestamp,

                realizedPnl:
                    side === "SELL"
                        ? (
                            price -
                            (
                                state
                                    .positions[
                                        symbol
                                    ]?.averagePrice ||
                                price
                            )
                        ) * quantity
                        : 0

            });


            saveState();


            /*
             * Notify application.
             */

            const event = {

                type:
                    "TRADE_EXECUTED",

                order:
                    order,

                state:
                    state

            };


            if (
                typeof window
                    .TradeSimTrading
                    .onTrade ===
                "function"
            ) {

                try {

                    window
                        .TradeSimTrading
                        .onTrade(event);

                } catch (error) {

                    console.error(
                        error
                    );

                }

            }


            /*
             * Notify chart.
             */

            if (
                window.TradeSimChart &&
                typeof
                    TradeSimChart
                        .addTradeMarker ===
                    "function"
            ) {

                try {

                    TradeSimChart
                        .addTradeMarker(
                            order
                        );

                } catch (error) {

                    console.error(
                        "Chart marker error:",
                        error
                    );

                }

            }


            return {

                success: true,

                order:
                    order,

                cash:
                    state.cash,

                position:
                    state.positions[
                        symbol
                    ] || null,

                realizedPnl:
                    state.realizedPnl

            };

        },


        /*
         * Cancel open order.
         *
         * Market orders are immediately filled,
         * so this is mainly prepared for
         * future LIMIT/STOP orders.
         */

        cancelOrder: function (
            orderId
        ) {

            const order =
                state.orders.find(
                    o =>
                        o.id ===
                        orderId
                );


            if (!order) {

                return {

                    success: false,

                    message:
                        "Order not found."

                };

            }


            if (
                order.status !==
                "OPEN"
            ) {

                return {

                    success: false,

                    message:
                        "Only open orders can be cancelled."

                };

            }


            order.status =
                "CANCELLED";


            saveState();


            return {

                success: true,

                order:
                    order

            };

        },


        /*
         * Portfolio value.
         */

        getPortfolioValue:
            function () {

                let value =
                    state.cash;


                Object.keys(
                    state.positions
                ).forEach(symbol => {

                    const position =
                        state.positions[
                            symbol
                        ];


                    const price =
                        this.getPrice(
                            symbol
                        );


                    if (
                        Number.isFinite(
                            price
                        )
                    ) {

                        value +=
                            position.quantity *
                            price;

                    }

                });


                return value;

            },


        /*
         * Total unrealized P/L.
         */

        getUnrealizedPnl:
            function () {

                let pnl = 0;


                Object.keys(
                    state.positions
                ).forEach(symbol => {

                    const position =
                        state.positions[
                            symbol
                        ];


                    const price =
                        this.getPrice(
                            symbol
                        );


                    if (
                        Number.isFinite(
                            price
                        )
                    ) {

                        pnl +=

                            (
                                price -
                                position.averagePrice
                            ) *

                            position.quantity;

                    }

                });


                return pnl;

            },


        /*
         * Total P/L.
         */

        getTotalPnl:
            function () {

                return (

                    state.realizedPnl +

                    this.getUnrealizedPnl()

                );

            },


        /*
         * Return orders for a symbol.
         */

        getOrders:
            function (
                symbol
            ) {

                if (!symbol) {

                    return state.orders;

                }


                return state.orders.filter(

                    order =>
                        order.symbol ===
                        symbol

                );

            },


        /*
         * Return trade history.
         */

        getTrades:
            function () {

                return state.trades;

            },


        /*
         * Clear account.
         *
         * Useful during testing.
         */

        resetAccount:
            function () {

                state = {

                    cash:
                        STARTING_CASH,

                    positions: {},

                    orders: [],

                    trades: [],

                    realizedPnl:
                        0

                };


                saveState();


                return state;

            }

    };


    /*
     * Global compatibility object.
     */

    window.TradeSimState =
        state;


})();
