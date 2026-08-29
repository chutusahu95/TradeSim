/*
 * TradeSim Pro Chart Engine
 * Stage 1
 *
 * Requires:
 * - Lightweight Charts
 * - market-engine.js
 *
 * Responsibilities:
 * - Candlestick chart
 * - Volume
 * - Timeframes
 * - Live candle updates
 * - Zoom / pan
 * - Crosshair
 * - Current price
 * - BUY / SELL markers
 * - Entry / SL / Target lines
 */

(function () {

    "use strict";

    window.TradeSimChart = {

        chart: null,

        candleSeries: null,

        volumeSeries: null,

        currentSymbol: null,

        currentInterval: "1m",

        containerId: "chart",

        markers: [],

        priceLines: [],

        initialized: false,


        init: function (containerId) {

            containerId =
                containerId || this.containerId;

            const container =
                document.getElementById(containerId);

            if (!container) {

                console.error(
                    "TradeSim Chart: container not found"
                );

                return false;
            }

            if (
                typeof LightweightCharts ===
                "undefined"
            ) {

                container.innerHTML =
                    '<div style="padding:30px;text-align:center;color:#ff5964">' +
                    '⚠️ Chart library could not be loaded.<br><br>' +
                    'Check your internet connection or bundle the chart library locally.' +
                    '</div>';

                return false;
            }


            if (this.chart) {

                try {
                    this.chart.remove();
                } catch (e) {}

                this.chart = null;
                this.candleSeries = null;
                this.volumeSeries = null;

            }


            container.innerHTML = "";


            this.chart =
                LightweightCharts.createChart(
                    container,
                    {

                        width:
                            container.clientWidth,

                        height: 420,

                        layout: {

                            background: {
                                color: "#08111f"
                            },

                            textColor: "#91a3bc"

                        },

                        grid: {

                            vertLines: {
                                color: "#17263b"
                            },

                            horzLines: {
                                color: "#17263b"
                            }

                        },

                        crosshair: {

                            mode:
                                LightweightCharts
                                .CrosshairMode
                                .Normal

                        },

                        rightPriceScale: {

                            borderColor:
                                "#24344d",

                            scaleMargins: {

                                top: 0.05,

                                bottom: 0.30

                            }

                        },

                        timeScale: {

                            borderColor:
                                "#24344d",

                            timeVisible: true,

                            secondsVisible: false,

                            rightOffset: 5

                        }

                    }
                );


            this.candleSeries =
                this.chart.addCandlestickSeries({

                    upColor: "#35d07f",

                    downColor: "#ff5964",

                    borderUpColor: "#35d07f",

                    borderDownColor: "#ff5964",

                    wickUpColor: "#35d07f",

                    wickDownColor: "#ff5964"

                });


            this.volumeSeries =
                this.chart.addHistogramSeries({

                    priceFormat: {
                        type: "volume"
                    },

                    priceScaleId: "",

                    scaleMargins: {

                        top: 0.75,

                        bottom: 0

                    }

                });


            this.initialized = true;


            window.addEventListener(
                "resize",
                () => this.resize()
            );


            return true;

        },


        resize: function () {

            if (!this.chart) {
                return;
            }

            const container =
                document.getElementById(
                    this.containerId
                );

            if (!container) {
                return;
            }

            this.chart.applyOptions({

                width:
                    container.clientWidth

            });

        },


        open: function (
            symbol,
            interval
        ) {

            this.currentSymbol = symbol;

            this.currentInterval =
                interval ||
                this.currentInterval ||
                "1m";


            if (!this.initialized) {

                if (!this.init(
                    this.containerId
                )) {

                    return false;

                }

            }


            this.clearLines();


            this.loadData();


            return true;

        },


        loadData: function () {

            if (!this.currentSymbol) {
                return;
            }

            if (!this.candleSeries) {
                return;
            }


            const candles =
                TradeSimMarket.getCandles(

                    this.currentSymbol,

                    this.currentInterval

                );


            const volume =
                TradeSimMarket.getVolume(

                    this.currentSymbol,

                    this.currentInterval

                );


            if (!candles.length) {

                console.warn(
                    "TradeSim: no candle data"
                );

                return;

            }


            this.candleSeries.setData(
                candles
            );


            const volumeData =
                volume.map(v => {

                    const candle =
                        candles.find(
                            c => c.time === v.time
                        );

                    return {

                        time: v.time,

                        value: v.value,

                        color:
                            candle &&
                            candle.close >=
                            candle.open
                            ? "#35d07f"
                            : "#ff5964"

                    };

                });


            this.volumeSeries.setData(
                volumeData
            );


            this.chart
                .timeScale()
                .fitContent();


            this.updateMarkers();

        },


        update: function (event) {

            if (!event) {
                return;
            }

            if (
                event.symbol !==
                this.currentSymbol
            ) {

                return;

            }


            if (
                !this.candleSeries ||
                !this.volumeSeries
            ) {

                return;

            }


            const candles =
                TradeSimMarket.getCandles(

                    this.currentSymbol,

                    this.currentInterval

                );


            const volume =
                TradeSimMarket.getVolume(

                    this.currentSymbol,

                    this.currentInterval

                );


            if (!candles.length) {
                return;
            }


            const candle =
                candles[candles.length - 1];


            const vol =
                volume[volume.length - 1];


            this.candleSeries.update(
                candle
            );


            if (vol) {

                this.volumeSeries.update({

                    time: vol.time,

                    value: vol.value,

                    color:
                        candle.close >=
                        candle.open
                        ? "#35d07f"
                        : "#ff5964"

                });

            }


            this.updateMarkers();

        },


        setInterval: function (
            interval
        ) {

            if (
                !TradeSimMarket
                    .intervals[interval]
            ) {

                return false;

            }


            this.currentInterval =
                interval;


            TradeSimMarket
                .setInterval(interval);


            this.loadData();


            return true;

        },


        updateMarkers: function () {

            if (
                !this.currentSymbol ||
                !this.candleSeries
            ) {

                return;

            }


            const state =
                window.TradeSimState ||
                null;


            if (!state) {
                return;
            }


            const orders =
                state.orders || [];


            const markers=[];


            orders
                .filter(
                    order =>
                        order.symbol ===
                        this.currentSymbol
                )
                .forEach(order => {

                    const timestamp =
                        Math.floor(
                            new Date(
                                order.time
                            ).getTime() /
                            1000
                        );


                    const candle =
                        TradeSimMarket
                            .getExecutionCandle(

                                order.symbol,

                                timestamp,

                                this.currentInterval

                            );


                    if (!candle) {
                        return;
                    }


                    markers.push({

                        time: candle.time,

                        position:
                            order.type ===
                            "BUY"
                            ? "belowBar"
                            : "aboveBar",

                        color:
                            order.type ===
                            "BUY"
                            ? "#35d07f"
                            : "#ff5964",

                        shape:
                            order.type ===
                            "BUY"
                            ? "arrowUp"
                            : "arrowDown",

                        text:
                            order.type +
                            " " +
                            order.qty

                    });

                });


            markers.sort(
                (a,b) =>
                    a.time-b.time
            );


            try {

                this.candleSeries
                    .setMarkers(markers);

            } catch (error) {

                console.error(
                    "TradeSim marker error:",
                    error
                );

            }

        },


        addTradeMarker: function (
            order
        ) {

            if (!order) {
                return;
            }


            if (
                order.symbol !==
                this.currentSymbol
            ) {

                return;
            }


            this.updateMarkers();


            this.addOrderLines(order);

        },


        addOrderLines: function (
            order
        ) {

            if (!this.candleSeries) {
                return;
            }


            this.clearLines();


            const color =
                order.type === "BUY"
                ? "#35d07f"
                : "#ff5964";


            try {

                const line =
                    this.candleSeries
                        .createPriceLine({

                            price:
                                order.price,

                            color:
                                color,

                            lineWidth: 1,

                            lineStyle:
                                LightweightCharts
                                    .LineStyle
                                    .Dashed,

                            axisLabelVisible:
                                true,

                            title:
                                order.type +
                                " " +
                                order.symbol

                        });


                this.priceLines.push(
                    line
                );


                if (
                    Number.isFinite(
                        order.stopLoss
                    )
                ) {

                    const sl =
                        this.candleSeries
                            .createPriceLine({

                                price:
                                    order.stopLoss,

                                color:
                                    "#ff5964",

                                lineWidth: 1,

                                lineStyle:
                                    LightweightCharts
                                        .LineStyle
                                        .Dotted,

                                axisLabelVisible:
                                    true,

                                title:
                                    "SL"

                            });


                    this.priceLines.push(
                        sl
                    );

                }


                if (
                    Number.isFinite(
                        order.target
                    )
                ) {

                    const target =
                        this.candleSeries
                            .createPriceLine({

                                price:
                                    order.target,

                                color:
                                    "#35d07f",

                                lineWidth: 1,

                                lineStyle:
                                    LightweightCharts
                                        .LineStyle
                                        .Dotted,

                                axisLabelVisible:
                                    true,

                                title:
                                    "TARGET"

                            });


                    this.priceLines.push(
                        target
                    );

                }

            } catch (error) {

                console.error(
                    "TradeSim price line error:",
                    error
                );

            }

        },


        clearLines: function () {

            if (!this.candleSeries) {
                return;
            }


            this.priceLines.forEach(
                line => {

                    try {

                        this.candleSeries
                            .removePriceLine(
                                line
                            );

                    } catch (e) {}

                }
            );


            this.priceLines=[];

        },


        setCurrentPriceLine:
            function () {

                if (
                    !this.candleSeries ||
                    !this.currentSymbol
                ) {

                    return;

                }


                const price =
                    TradeSimMarket
                        .getPrice(
                            this.currentSymbol
                        );


                if (
                    !Number.isFinite(price)
                ) {

                    return;

                }


                this.clearLines();


                try {

                    const line =
                        this.candleSeries
                            .createPriceLine({

                                price: price,

                                color:
                                    "#258cff",

                                lineWidth: 1,

                                lineStyle:
                                    LightweightCharts
                                        .LineStyle
                                        .Solid,

                                axisLabelVisible:
                                    true,

                                title:
                                    "PRICE"

                            });


                    this.priceLines.push(
                        line
                    );

                } catch (e) {}

            },


        fit: function () {

            if (this.chart) {

                this.chart
                    .timeScale()
                    .fitContent();

            }

        },


        zoomIn: function () {

            if (!this.chart) {
                return;
            }

            this.chart
                .timeScale()
                .scrollToPosition(
                    5,
                    false
                );

        },


        destroy: function () {

            this.clearLines();

            if (this.chart) {

                try {
                    this.chart.remove();
                } catch (e) {}

            }

            this.chart=null;

            this.candleSeries=null;

            this.volumeSeries=null;

            this.initialized=false;

        }

    };


    /*
     * Connect market engine to chart.
     */

    if (
        window.TradeSimMarket &&
        typeof TradeSimMarket.on ===
        "function"
    ) {

        TradeSimMarket.on(
            function (event) {

                if (
                    event.type === "tick"
                ) {

                    TradeSimChart.update(
                        event
                    );

                }

                if (
                    event.type === "interval"
                ) {

                    if (
                        TradeSimChart
                            .currentSymbol
                    ) {

                        TradeSimChart
                            .loadData();

                    }

                }

            }
        );

    }

})();
