/*
 * TradeSim Application Controller
 * Pro Chart Engine
 *
 * Connects:
 * Market Engine
 * Chart Engine
 * Trading Engine
 * UI
 */

(function () {

    "use strict";

    const TS = window.TradeSimApp = {

        currentPage: "home",

        currentSymbol: null,

        currentInterval: "1m",

        filter: "ALL",

        searchText: "",


        /*
         * Start application
         */

        init: function () {

            this.registerAssets();

            this.bindEvents();

            this.renderAll();

            this.startMarket();

        },


        /*
         * Register market instruments
         */

        registerAssets: function () {

            if (!window.TradeSimMarket) {

                console.error(
                    "TradeSimMarket not loaded."
                );

                return;

            }

            const assets = [

                {
                    symbol: "RELIANCE",
                    name: "Reliance Industries",
                    type: "STOCK",
                    price: 1450.50,
                    change: 1.24
                },

                {
                    symbol: "TCS",
                    name: "Tata Consultancy Services",
                    type: "STOCK",
                    price: 3245.20,
                    change: 0.82
                },

                {
                    symbol: "INFY",
                    name: "Infosys",
                    type: "STOCK",
                    price: 1542.30,
                    change: -0.45
                },

                {
                    symbol: "HDFCBANK",
                    name: "HDFC Bank",
                    type: "STOCK",
                    price: 1710.40,
                    change: 0.64
                },

                {
                    symbol: "ICICIBANK",
                    name: "ICICI Bank",
                    type: "STOCK",
                    price: 1315.80,
                    change: 1.05
                },

                {
                    symbol: "SBIN",
                    name: "State Bank of India",
                    type: "STOCK",
                    price: 825.40,
                    change: -0.32
                },

                {
                    symbol: "ITC",
                    name: "ITC Limited",
                    type: "STOCK",
                    price: 418.75,
                    change: 0.38
                },

                {
                    symbol: "BHARTIARTL",
                    name: "Bharti Airtel",
                    type: "STOCK",
                    price: 1865.10,
                    change: 1.62
                },

                {
                    symbol: "BTC",
                    name: "Bitcoin",
                    type: "CRYPTO",
                    price: 10450000,
                    change: 1.15
                },

                {
                    symbol: "ETH",
                    name: "Ethereum",
                    type: "CRYPTO",
                    price: 395000,
                    change: 0.72
                },

                {
                    symbol: "SOL",
                    name: "Solana",
                    type: "CRYPTO",
                    price: 18500,
                    change: -1.20
                },

                {
                    symbol: "BNB",
                    name: "BNB",
                    type: "CRYPTO",
                    price: 87000,
                    change: 0.55
                }

            ];

            TradeSimMarket.registerAssets(
                assets
            );

        },


        /*
         * Bind UI events
         */

        bindEvents: function () {

            const search =
                document.getElementById(
                    "searchBox"
                );

            if (search) {

                search.addEventListener(
                    "input",
                    () => {

                        this.searchText =
                            search.value
                                .trim()
                                .toUpperCase();

                        this.renderMarkets();

                    }
                );

            }


            /*
             * Listen for market ticks
             */

            if (
                window.TradeSimMarket &&
                typeof TradeSimMarket.on ===
                "function"
            ) {

                TradeSimMarket.on(
                    event => {

                        if (
                            event.type ===
                            "tick"
                        ) {

                            this.onMarketTick(
                                event
                            );

                        }

                    }
                );

            }


            /*
             * Trading callback
             */

            if (
                window.TradeSimTrading
            ) {

                TradeSimTrading.onTrade =
                    event => {

                        this.onTrade(
                            event
                        );

                    };

            }

        },


        /*
         * Start simulated market
         */

        startMarket: function () {

            if (
                window.TradeSimMarket
            ) {

                TradeSimMarket.start();

            }

        },


        /*
         * Market tick handler
         */

        onMarketTick: function (
            event
        ) {

            this.renderMarketPrices();

            this.renderPortfolio();

            this.updateChartHeader();

        },


        /*
         * Trade executed
         */

        onTrade: function (
            event
        ) {

            this.renderAll();

            if (
                event &&
                event.order
            ) {

                this.showTradeMessage(
                    event.order
                );

            }

        },


        /*
         * Navigation
         */

        showPage: function (
            page,
            button
        ) {

            document
                .querySelectorAll(
                    ".page"
                )
                .forEach(
                    p =>
                        p.classList
                            .remove(
                                "active"
                            )
                );


            const target =
                document.getElementById(
                    page
                );


            if (!target) {

                console.warn(
                    "Page not found:",
                    page
                );

                return;

            }


            target.classList.add(
                "active"
            );


            document
                .querySelectorAll(
                    ".nav-btn"
                )
                .forEach(
                    b =>
                        b.classList
                            .remove(
                                "active"
                            )
                );


            if (button) {

                button.classList.add(
                    "active"
                );

            }


            this.currentPage =
                page;


            if (
                page === "chartPage" &&
                this.currentSymbol
            ) {

                this.openChart(
                    this.currentSymbol
                );

            }


            this.renderAll();

        },


        /*
         * Open chart
         */

        openChart: function (
            symbol
        ) {

            const asset =
                TradeSimMarket.getAsset(
                    symbol
                );


            if (!asset) {

                alert(
                    "Instrument not found."
                );

                return;

            }


            this.currentSymbol =
                symbol;


            const symbolEl =
                document.getElementById(
                    "chartSymbol"
                );


            const nameEl =
                document.getElementById(
                    "chartName"
                );


            const metaEl =
                document.getElementById(
                    "chartMeta"
                );


            if (symbolEl)
                symbolEl.textContent =
                    symbol;


            if (nameEl)
                nameEl.textContent =
                    asset.name;


            if (metaEl)
                metaEl.textContent =
                    asset.type +
                    " • Paper Market";


            this.showChartPage();


            setTimeout(
                () => {

                    if (
                        window.TradeSimChart
                    ) {

                        TradeSimChart.open(
                            symbol,
                            this.currentInterval
                        );

                    }

                    this.updateChartHeader();

                },
                80
            );

        },


        /*
         * Show chart page without
         * requiring a navigation button
         */

        showChartPage: function () {

            document
                .querySelectorAll(
                    ".page"
                )
                .forEach(
                    p =>
                        p.classList
                            .remove(
                                "active"
                            )
                );


            const page =
                document.getElementById(
                    "chartPage"
                );


            if (page) {

                page.classList.add(
                    "active"
                );

            }


            document
                .querySelectorAll(
                    ".nav-btn"
                )
                .forEach(
                    b =>
                        b.classList
                            .remove(
                                "active"
                            )
                );


            this.currentPage =
                "chartPage";

        },


        /*
         * Change chart timeframe
         */

        setChartInterval: function (
            interval,
            button
        ) {

            this.currentInterval =
                interval;


            document
                .querySelectorAll(
                    ".chart-tools button"
                )
                .forEach(
                    b =>
                        b.classList
                            .remove(
                                "active"
                            )
                );


            if (button) {

                button.classList.add(
                    "active"
                );

            }


            if (
                window.TradeSimChart &&
                this.currentSymbol
            ) {

                TradeSimChart.setInterval(
                    interval
                );

            }

        },


        /*
         * Open BUY / SELL panel
         */

        openTrade: function (
            symbol,
            side
        ) {

            const asset =
                TradeSimMarket.getAsset(
                    symbol
                );


            if (!asset) {

                alert(
                    "Instrument not found."
                );

                return;

            }


            this.currentSymbol =
                symbol;


            const modal =
                document.getElementById(
                    "tradeModal"
                );


            if (!modal) {

                /*
                 * Compatibility with a UI
                 * that does not use a modal.
                 */

                this.quickTrade(
                    symbol,
                    side
                );

                return;

            }


            const title =
                document.getElementById(
                    "tradeTitle"
                );


            const price =
                document.getElementById(
                    "tradePrice"
                );


            const quantity =
                document.getElementById(
                    "tradeQty"
                );


            const stop =
                document.getElementById(
                    "stopLoss"
                );


            const target =
                document.getElementById(
                    "targetPrice"
                );


            const execute =
                document.getElementById(
                    "executeTrade"
                );


            if (title) {

                title.textContent =
                    side +
                    " " +
                    symbol;

            }


            if (price) {

                price.textContent =
                    "Current price: " +
                    this.money(
                        asset.price
                    );

            }


            if (quantity)
                quantity.value = "";


            if (stop)
                stop.value = "";


            if (target)
                target.value = "";


            if (execute) {

                execute.onclick =
                    () => {

                        this.executeTrade(
                            symbol,
                            side
                        );

                    };

            }


            modal.classList.add(
                "show"
            );

        },


        /*
         * Execute BUY / SELL
         */

        executeTrade: function (
            symbol,
            side
        ) {

            const quantity =
                Number(
                    document.getElementById(
                        "tradeQty"
                    )?.value
                );


            const stopLoss =
                Number(
                    document.getElementById(
                        "stopLoss"
                    )?.value
                );


            const target =
                Number(
                    document.getElementById(
                        "targetPrice"
                    )?.value
                );


            if (
                !Number.isFinite(
                    quantity
                ) ||
                quantity <= 0
            ) {

                alert(
                    "Please enter a valid quantity."
                );

                return;

            }


            const options = {

                stopLoss:
                    Number.isFinite(
                        stopLoss
                    )
                        ? stopLoss
                        : null,

                target:
                    Number.isFinite(
                        target
                    )
                        ? target
                        : null

            };


            let result;


            if (side === "BUY") {

                result =
                    TradeSimTrading.buy(
                        symbol,
                        quantity,
                        options
                    );

            } else {

                result =
                    TradeSimTrading.sell(
                        symbol,
                        quantity,
                        options
                    );

            }


            /*
             * Risk confirmation
             */

            if (
                result &&
                result.requiresConfirmation
            ) {

                const proceed =
                    confirm(
                        "⚠️ RISK WARNING\n\n" +
                        result.message +
                        "\n\nOrder value: " +
                        this.money(
                            result.orderValue
                        ) +
                        "\n\nContinue with this paper trade?"
                    );


                if (!proceed) {

                    return;

                }


                options.skipRiskWarning =
                    true;


                if (side === "BUY") {

                    result =
                        TradeSimTrading.buy(
                            symbol,
                            quantity,
                            options
                        );

                } else {

                    result =
                        TradeSimTrading.sell(
                            symbol,
                            quantity,
                            options
                        );

                }

            }


            if (
                !result ||
                !result.success
            ) {

                alert(
                    "❌ " +
                    (
                        result?.message ||
                        "Trade could not be executed."
                    )
                );

                return;

            }


            this.closeTrade();


            this.renderAll();


            /*
             * Make marker visible immediately.
             */

            if (
                window.TradeSimChart &&
                result.order
            ) {

                TradeSimChart.addTradeMarker(
                    result.order
                );

            }

        },


        /*
         * Quick trade fallback
         */

        quickTrade: function (
            symbol,
            side
        ) {

            const quantity =
                Number(
                    prompt(
                        side +
                        " " +
                        symbol +
                        "\n\nEnter quantity:"
                    )
                );


            if (
                !Number.isFinite(
                    quantity
                ) ||
                quantity <= 0
            ) {

                return;

            }


            const result =
                side === "BUY"

                    ? TradeSimTrading.buy(
                        symbol,
                        quantity
                    )

                    : TradeSimTrading.sell(
                        symbol,
                        quantity
                    );


            if (
                !result.success
            ) {

                alert(
                    "❌ " +
                    result.message
                );

                return;

            }


            alert(
                "✅ Paper trade executed\n\n" +
                side +
                " " +
                symbol +
                "\nQuantity: " +
                quantity +
                "\nPrice: " +
                this.money(
                    result.order.price
                )
            );

        },


        /*
         * Close trade modal
         */

        closeTrade: function () {

            const modal =
                document.getElementById(
                    "tradeModal"
                );


            if (modal) {

                modal.classList.remove(
                    "show"
                );

            }

        },


        /*
         * Render everything
         */

        renderAll: function () {

            this.renderHome();

            this.renderMarkets();

            this.renderPortfolio();

            this.renderOrders();

            this.renderCoach();

            this.renderMarketPrices();

        },


        /*
         * HOME
         */

        renderHome: function () {

            const trading =
                TradeSimTrading;


            if (!trading) {
                return;
            }


            const value =
                trading.getPortfolioValue();


            const pnl =
                trading.getTotalPnl();


            this.setText(
                "portfolioValue",
                this.money(value)
            );


            this.setText(
                "cashValue",
                this.money(
                    trading.getCash()
                )
            );


            this.setText(
                "homePnl",
                this.money(pnl)
            );


            this.setText(
                "tradeCount",
                trading
                    .getState()
                    .orders
                    .length
            );


            const pnlElement =
                document.getElementById(
                    "totalPnl"
                );


            if (pnlElement) {

                pnlElement.textContent =
                    (pnl >= 0 ? "+" : "") +
                    this.money(pnl) +
                    " (" +
                    (
                        pnl /
                        1000000 *
                        100
                    ).toFixed(2) +
                    "%)";


                pnlElement.className =
                    pnl >= 0
                        ? "pnl"
                        : "loss";

            }


            const watchlist =
                document.getElementById(
                    "watchlist"
                );


            if (watchlist) {

                watchlist.innerHTML =
                    Object.values(
                        TradeSimMarket.assets
                    )
                    .slice(0,5)
                    .map(
                        a =>
                            this.assetHTML(a)
                    )
                    .join("");

            }

        },


        /*
         * MARKETS
         */

        renderMarkets: function () {

            const box =
                document.getElementById(
                    "marketList"
                );


            if (!box) {
                return;
            }


            let list =
                Object.values(
                    TradeSimMarket.assets
                );


            if (this.searchText) {

                list =
                    list.filter(
                        a =>

                            a.symbol
                                .toUpperCase()
                                .includes(
                                    this.searchText
                                ) ||

                            a.name
                                .toUpperCase()
                                .includes(
                                    this.searchText
                                )
                    );

            }


            if (
                this.filter ===
                "STOCK"
            ) {

                list =
                    list.filter(
                        a =>
                            a.type ===
                            "STOCK"
                    );

            }


            if (
                this.filter ===
                "CRYPTO"
            ) {

                list =
                    list.filter(
                        a =>
                            a.type ===
                            "CRYPTO"
                    );

            }


            if (
                this.filter ===
                "GAINERS"
            ) {

                list =
                    list
                    .filter(
                        a =>
                            a.change > 0
                    )
                    .sort(
                        (a,b) =>
                            b.change -
                            a.change
                    );

            }


            if (
                this.filter ===
                "LOSERS"
            ) {

                list =
                    list
                    .filter(
                        a =>
                            a.change < 0
                    )
                    .sort(
                        (a,b) =>
                            a.change -
                            b.change
                    );

            }


            if (!list.length) {

                box.innerHTML =
                    '<div class="empty">' +
                    'No instruments found.' +
                    '</div>';

                return;

            }


            box.innerHTML =
                list
                    .map(
                        a =>
                            this.assetHTML(a)
                    )
                    .join("");

        },


        /*
         * Asset card
         */

        assetHTML: function (
            asset
        ) {

            const positive =
                asset.change >= 0;


            return `

            <div class="asset">

                <div class="asset-top">

                    <div>

                        <div class="symbol">
                            ${asset.symbol}
                        </div>

                        <div class="asset-name">
                            ${asset.name}
                            •
                            ${asset.type}
                        </div>

                    </div>

                    <div class="price">

                        <div class="price-value">
                            ${this.money(asset.price)}
                        </div>

                        <div class="change ${
                            positive
                                ? "pnl"
                                : "loss"
                        }">

                            ${
                                positive
                                    ? "+"
                                    : ""
                            }${asset.change.toFixed(2)}%

                        </div>

                    </div>

                </div>

                <div class="trade-buttons">

                    <button
                        class="chart-btn"
                        onclick="
                            TradeSimApp.openChart(
                                '${asset.symbol}'
                            )
                        "
                    >
                        📈 Chart
                    </button>

                    <button
                        class="buy"
                        onclick="
                            TradeSimApp.openTrade(
                                '${asset.symbol}',
                                'BUY'
                            )
                        "
                    >
                        BUY
                    </button>

                    <button
                        class="sell"
                        onclick="
                            TradeSimApp.openTrade(
                                '${asset.symbol}',
                                'SELL'
                            )
                        "
                    >
                        SELL
                    </button>

                </div>

            </div>

            `;

        },


        /*
         * Update prices without
         * rebuilding complete market list
         */

        renderMarketPrices: function () {

            /*
             * Full render keeps the UI
             * synchronized and is acceptable
             * for the current simulator size.
             */

            if (
                this.currentPage ===
                "markets"
            ) {

                this.renderMarkets();

            }

        },


        /*
         * PORTFOLIO
         */

        renderPortfolio: function () {

            const box =
                document.getElementById(
                    "positions"
                );


            if (!box) {
                return;
            }


            const positions =
                TradeSimTrading
                    .getPositions();


            const symbols =
                Object.keys(
                    positions
                );


            if (!symbols.length) {

                box.innerHTML =
                    '<div class="empty">' +
                    'No open positions yet.' +
                    '<br><br>' +
                    'Go to Markets and place a paper trade.' +
                    '</div>';

                return;

            }


            box.innerHTML =
                symbols.map(
                    symbol => {

                        const position =
                            positions[
                                symbol
                            ];


                        const asset =
                            TradeSimMarket
                                .getAsset(
                                    symbol
                                );


                        if (!asset) {
                            return "";
                        }


                        const currentValue =
                            position.quantity *
                            asset.price;


                        const invested =
                            position.quantity *
                            position.averagePrice;


                        const pnl =
                            currentValue -
                            invested;


                        return `

                        <div class="card">

                            <div class="row">

                                <div>

                                    <div class="symbol">
                                        ${symbol}
                                    </div>

                                    <div class="asset-name">
                                        ${asset.name}
                                    </div>

                                </div>

                                <div class="${
                                    pnl >= 0
                                        ? "pnl"
                                        : "loss"
                                }">

                                    ${this.money(pnl)}

                                </div>

                            </div>

                            <br>

                            <div class="small">

                                Quantity:
                                ${position.quantity}
                                <br>

                                Average:
                                ${this.money(
                                    position.averagePrice
                                )}
                                <br>

                                Current:
                                ${this.money(
                                    asset.price
                                )}
                                <br>

                                Market value:
                                ${this.money(
                                    currentValue
                                )}

                            </div>

                            <br>

                            <div class="trade-buttons">

                                <button
                                    class="sell"
                                    onclick="
                                        TradeSimApp.openTrade(
                                            '${symbol}',
                                            'SELL'
                                        )
                                    "
                                >
                                    SELL
                                </button>

                                <button
                                    class="chart-btn"
                                    onclick="
                                        TradeSimApp.openChart(
                                            '${symbol}'
                                        )
                                    "
                                >
                                    📈 CHART
                                </button>

                            </div>

                        </div>

                        `;

                    }
                ).join("");

        },


        /*
         * ORDERS
         */

        renderOrders: function () {

            const box =
                document.getElementById(
                    "orderHistory"
                );


            if (!box) {
                return;
            }


            const orders =
                TradeSimTrading
                    .getState()
                    .orders;


            if (!orders.length) {

                box.innerHTML =
                    '<div class="empty">' +
                    'No orders yet.' +
                    '</div>';

                return;

            }


            box.innerHTML =
                orders.map(
                    order => `

                    <div class="order">

                        <div class="row">

                            <div>

                                <b>
                                    ${order.side}
                                    ${order.symbol}
                                </b>

                                <div class="small">
                                    ${new Date(
                                        order.date
                                    ).toLocaleString()}
                                </div>

                            </div>

                            <div class="${
                                order.side ===
                                "BUY"
                                    ? "pnl"
                                    : "loss"
                            }">

                                ${order.side}

                            </div>

                        </div>

                        <br>

                        <div class="small">

                            Quantity:
                            ${order.quantity}
                            <br>

                            Execution price:
                            ${this.money(
                                order.price
                            )}
                            <br>

                            Order value:
                            ${this.money(
                                order.value
                            )}

                            ${
                                order.stopLoss !== null
                                    ? "<br>Stop-loss: " +
                                      this.money(
                                          order.stopLoss
                                      )
                                    : ""
                            }

                            ${
                                order.target !== null
                                    ? "<br>Target: " +
                                      this.money(
                                          order.target
                                      )
                                    : ""
                            }

                        </div>

                    </div>

                    `
                ).join("");

        },


        /*
         * COACH
         */

        renderCoach: function () {

            const box =
                document.getElementById(
                    "coachMessage"
                );


            if (!box) {
                return;
            }


            const trading =
                TradeSimTrading;


            const orders =
                trading
                    .getState()
                    .orders;


            const positions =
                trading
                    .getPositions();


            let message;


            if (!orders.length) {

                message =
                    "👋 No trades yet. " +
                    "Before entering your first position, " +
                    "decide your risk and exit plan.";

            } else {

                const value =
                    trading
                        .getPortfolioValue();


                const exposure =
                    Object.keys(
                        positions
                    ).reduce(
                        (total,symbol) => {

                            const p =
                                positions[
                                    symbol
                                ];


                            const price =
                                TradeSimMarket
                                    .getPrice(
                                        symbol
                                    );


                            return total +
                                p.quantity *
                                price;

                        },
                        0
                    );


                const percentage =
                    exposure /
                    1000000 *
                    100;


                if (
                    percentage >
                    50
                ) {

                    message =
                        "⚠️ High exposure detected. " +
                        "More than half of your starting capital " +
                        "is currently exposed to open positions.";

                } else if (
                    value <
                    1000000
                ) {

                    message =
                        "📉 Your simulated account is below " +
                        "the starting balance. Review losing trades " +
                        "and position sizing.";

                } else {

                    message =
                        "📊 Keep focusing on consistency, " +
                        "position sizing and predefined exits.";

                }

            }


            box.textContent =
                message;

        },


        /*
         * Chart header
         */

        updateChartHeader:
            function () {

                if (!this.currentSymbol) {
                    return;
                }


                const asset =
                    TradeSimMarket
                        .getAsset(
                            this.currentSymbol
                        );


                if (!asset) {
                    return;
                }


                this.setText(
                    "chartPrice",
                    this.money(
                        asset.price
                    )
                );


                const change =
                    document.getElementById(
                        "chartChange"
                    );


                if (change) {

                    change.textContent =
                        (
                            asset.change >=
                            0
                                ? "+"
                                : ""
                        ) +
                        asset.change.toFixed(
                            2
                        ) +
                        "%";


                    change.className =
                        asset.change >= 0
                            ? "pnl"
                            : "loss";

                }

            },


        /*
         * Show trade confirmation
         */

        showTradeMessage:
            function (order) {

                console.log(
                    "TradeSim trade executed:",
                    order
                );

            },


        /*
         * Utility
         */

        setText: function (
            id,
            value
        ) {

            const el =
                document.getElementById(
                    id
                );


            if (el) {

                el.textContent =
                    value;

            }

        },


        money: function (
            number
        ) {

            return "₹" +
                Number(
                    number
                ).toLocaleString(
                    "en-IN",
                    {
                        maximumFractionDigits:
                            2
                    }
                );

        }

    };


    /*
     * Make functions available
     * globally for HTML buttons.
     */

    window.showPage =
        function (
            page,
            button
        ) {

            TradeSimApp.showPage(
                page,
                button
            );

        };


    window.openChart =
        function (
            symbol
        ) {

            TradeSimApp.openChart(
                symbol
            );

        };


    window.openTrade =
        function (
            symbol,
            side
        ) {

            TradeSimApp.openTrade(
                symbol,
                side
            );

        };


    window.closeTrade =
        function () {

            TradeSimApp.closeTrade();

        };


    window.setChartInterval =
        function (
            interval,
            button
        ) {

            TradeSimApp.setChartInterval(
                interval,
                button
            );

        };


    /*
     * Start after DOM is ready.
     */

    if (
        document.readyState ===
        "loading"
    ) {

        document.addEventListener(
            "DOMContentLoaded",
            function () {

                TradeSimApp.init();

            }
        );

    } else {

        TradeSimApp.init();

    }

})();
