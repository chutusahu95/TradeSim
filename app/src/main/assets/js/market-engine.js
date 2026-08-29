/*
 * TradeSim Pro Market Engine
 * Stage 1
 *
 * Purpose:
 * - Maintains one source of simulated market prices.
 * - Generates synchronized OHLC candles.
 * - Generates synchronized volume.
 * - Supports multiple timeframes.
 * - Provides candle timestamps for BUY/SELL markers.
 *
 * No real money or broker connection is used.
 */

(function () {

    "use strict";

    window.TradeSimMarket = {

        assets: {},

        intervals: {
            "1m": 60,
            "5m": 300,
            "15m": 900,
            "30m": 1800,
            "1H": 3600,
            "4H": 14400,
            "1D": 86400,
            "1W": 604800
        },

        selectedInterval: "1m",

        maxCandles: 500,

        listeners: [],

        running: false,

        timer: null,


        /*
         * Initialize an asset.
         */

        registerAsset: function (asset) {

            if (!asset || !asset.symbol) {
                return;
            }

            const symbol = asset.symbol;

            this.assets[symbol] = {

                symbol: symbol,

                name: asset.name || symbol,

                type: asset.type || "STOCK",

                price: Number(asset.price) || 100,

                change: Number(asset.change) || 0,

                candles: {},

                volume: {},

                lastTick: null

            };

            this.ensureTimeframe(symbol, this.selectedInterval);

        },


        /*
         * Register many assets.
         */

        registerAssets: function (assets) {

            if (!Array.isArray(assets)) {
                return;
            }

            assets.forEach(asset => {

                this.registerAsset(asset);

            });

        },


        /*
         * Set active chart timeframe.
         */

        setInterval: function (interval) {

            if (!this.intervals[interval]) {
                return false;
            }

            this.selectedInterval = interval;

            Object.keys(this.assets).forEach(symbol => {

                this.ensureTimeframe(
                    symbol,
                    interval
                );

            });

            this.emit({

                type: "interval",

                interval: interval

            });

            return true;
        },


        /*
         * Get seconds for timeframe.
         */

        getIntervalSeconds: function (interval) {

            return this.intervals[interval] ||
                   this.intervals["1m"];

        },


        /*
         * Convert current time into candle bucket.
         */

        candleTime: function (timestamp, interval) {

            const seconds =
                this.getIntervalSeconds(interval);

            return Math.floor(
                timestamp / seconds
            ) * seconds;

        },


        /*
         * Create initial historical candles.
         */

        ensureTimeframe: function (symbol, interval) {

            const asset = this.assets[symbol];

            if (!asset) {
                return;
            }

            if (!asset.candles[interval]) {

                asset.candles[interval] = [];

            }

            if (!asset.volume[interval]) {

                asset.volume[interval] = [];

            }

            const candles =
                asset.candles[interval];

            const volumes =
                asset.volume[interval];

            if (candles.length > 0) {
                return;
            }

            const seconds =
                this.getIntervalSeconds(interval);

            const now =
                Math.floor(Date.now() / 1000);

            let price = asset.price;

            const count = 150;

            for (let i = count; i > 0; i--) {

                const time =
                    this.candleTime(
                        now - i * seconds,
                        interval
                    );

                const volatility =
                    0.006;

                const open = price;

                const movement =
                    (Math.random() - 0.5) *
                    volatility;

                const close =
                    open * (1 + movement);

                const high =
                    Math.max(open, close) *
                    (1 + Math.random() * 0.004);

                const low =
                    Math.min(open, close) *
                    (1 - Math.random() * 0.004);

                const volume =
                    Math.round(
                        500 +
                        Math.random() * 5000
                    );

                candles.push({

                    time: time,

                    open: open,

                    high: high,

                    low: low,

                    close: close

                });

                volumes.push({

                    time: time,

                    value: volume

                });

                price = close;

            }

            /*
             * Make the final historical candle
             * connect to the actual current price.
             */

            if (candles.length > 0) {

                const last =
                    candles[candles.length - 1];

                const adjustment =
                    asset.price / last.close;

                last.close =
                    asset.price;

                last.high =
                    Math.max(
                        last.high,
                        asset.price
                    );

                last.low =
                    Math.min(
                        last.low,
                        asset.price
                    );

                /*
                 * Keep OHLC internally sensible.
                 */

                last.open *= adjustment;

                last.high *= adjustment;

                last.low *= adjustment;

            }

        },


        /*
         * Get candles for chart.
         */

        getCandles: function (
            symbol,
            interval
        ) {

            interval =
                interval ||
                this.selectedInterval;

            this.ensureTimeframe(
                symbol,
                interval
            );

            const asset =
                this.assets[symbol];

            if (!asset) {
                return [];
            }

            return asset.candles[interval]
                .slice(-this.maxCandles)
                .map(candle => ({

                    time: candle.time,

                    open: candle.open,

                    high: candle.high,

                    low: candle.low,

                    close: candle.close

                }));

        },


        /*
         * Get volume.
         */

        getVolume: function (
            symbol,
            interval
        ) {

            interval =
                interval ||
                this.selectedInterval;

            this.ensureTimeframe(
                symbol,
                interval
            );

            const asset =
                this.assets[symbol];

            if (!asset) {
                return [];
            }

            return asset.volume[interval]
                .slice(-this.maxCandles)
                .map(v => ({

                    time: v.time,

                    value: v.value

                }));

        },


        /*
         * Generate a market tick.
         */

        tick: function (symbol) {

            const asset =
                this.assets[symbol];

            if (!asset) {
                return null;
            }

            const previous =
                asset.price;

            /*
             * Small simulated movement.
             */

            const movement =
                (Math.random() - 0.5) *
                0.004;

            let newPrice =
                previous *
                (1 + movement);

            if (!Number.isFinite(newPrice) ||
                newPrice <= 0) {

                newPrice = previous;

            }

            asset.price =
                newPrice;

            asset.change =
                ((newPrice - previous) /
                previous) * 100;

            const now =
                Math.floor(Date.now() / 1000);

            asset.lastTick = now;

            /*
             * Update EVERY timeframe.
             */

            Object.keys(this.intervals)
                .forEach(interval => {

                    this.updateCandle(
                        asset,
                        interval,
                        now,
                        newPrice
                    );

                });

            const event = {

                type: "tick",

                symbol: symbol,

                price: newPrice,

                timestamp: now,

                change: asset.change

            };

            this.emit(event);

            return event;

        },


        /*
         * Update candle from the same price tick.
         */

        updateCandle: function (
            asset,
            interval,
            timestamp,
            price
        ) {

            this.ensureTimeframe(
                asset.symbol,
                interval
            );

            const candles =
                asset.candles[interval];

            const volumes =
                asset.volume[interval];

            const candleTime =
                this.candleTime(
                    timestamp,
                    interval
                );

            let candle =
                candles[candles.length - 1];

            let volume =
                volumes[volumes.length - 1];


            /*
             * New candle.
             */

            if (!candle ||
                candle.time !== candleTime) {

                candle = {

                    time: candleTime,

                    open: price,

                    high: price,

                    low: price,

                    close: price

                };

                volume = {

                    time: candleTime,

                    value: 0

                };

                candles.push(candle);

                volumes.push(volume);

                /*
                 * Keep memory bounded.
                 */

                while (
                    candles.length >
                    this.maxCandles
                ) {

                    candles.shift();

                }

                while (
                    volumes.length >
                    this.maxCandles
                ) {

                    volumes.shift();

                }

            } else {

                /*
                 * Update existing candle.
                 */

                candle.high =
                    Math.max(
                        candle.high,
                        price
                    );

                candle.low =
                    Math.min(
                        candle.low,
                        price
                    );

                candle.close =
                    price;

            }

            /*
             * Volume follows the same candle.
             */

            volume.value +=
                Math.round(
                    50 +
                    Math.random() * 250
                );

        },


        /*
         * Start market simulation.
         */

        start: function () {

            if (this.running) {
                return;
            }

            this.running = true;

            this.timer =
                setInterval(() => {

                    Object.keys(
                        this.assets
                    ).forEach(symbol => {

                        this.tick(symbol);

                    });

                }, 1000);

        },


        /*
         * Stop simulation.
         */

        stop: function () {

            if (this.timer) {

                clearInterval(
                    this.timer
                );

                this.timer = null;

            }

            this.running = false;

        },


        /*
         * Subscribe to market events.
         */

        on: function (callback) {

            if (
                typeof callback !==
                "function"
            ) {

                return function () {};

            }

            this.listeners.push(callback);

            return () => {

                const index =
                    this.listeners.indexOf(
                        callback
                    );

                if (index >= 0) {

                    this.listeners.splice(
                        index,
                        1
                    );

                }

            };

        },


        /*
         * Send event to listeners.
         */

        emit: function (event) {

            this.listeners
                .slice()
                .forEach(callback => {

                    try {

                        callback(event);

                    } catch (error) {

                        console.error(
                            "TradeSim market listener error:",
                            error
                        );

                    }

                });

        },


        /*
         * Return current price.
         */

        getPrice: function (symbol) {

            const asset =
                this.assets[symbol];

            return asset
                ? asset.price
                : null;

        },


        /*
         * Return complete asset.
         */

        getAsset: function (symbol) {

            return this.assets[symbol] ||
                   null;

        },


        /*
         * Find candle containing execution time.
         *
         * This is used by BUY/SELL markers.
         */

        getExecutionCandle: function (
            symbol,
            timestamp,
            interval
        ) {

            interval =
                interval ||
                this.selectedInterval;

            const asset =
                this.assets[symbol];

            if (!asset) {
                return null;
            }

            this.ensureTimeframe(
                symbol,
                interval
            );

            const time =
                this.candleTime(
                    timestamp,
                    interval
                );

            const candles =
                asset.candles[interval];

            for (
                let i = candles.length - 1;
                i >= 0;
                i--
            ) {

                if (
                    candles[i].time ===
                    time
                ) {

                    return candles[i];

                }

            }

            return null;

        }

    };

})();
