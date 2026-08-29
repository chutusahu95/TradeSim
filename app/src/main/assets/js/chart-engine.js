/*
 * TradeSim Pro Chart Engine
 * Stage 2
 *
 * Features:
 * - Working candlesticks
 * - Live candle updates
 * - Volume
 * - Single active timeframe
 * - Zoom / pan
 * - Crosshair
 * - BUY / SELL markers
 * - Entry / SL / Target lines
 * - SMA
 * - EMA
 * - Bollinger Bands
 * - VWAP
 * - Supertrend
 * - RSI
 * - MACD
 * - Indicator settings
 */

(function () {

    "use strict";

    const TS = {

        chart: null,
        candleSeries: null,
        volumeSeries: null,

        currentSymbol: null,
        currentInterval: "1m",

        containerId: "chart",

        initialized: false,

        markers: [],
        priceLines: [],

        indicatorSeries: {},

        settings: {

            sma20: true,
            sma50: false,

            ema9: false,
            ema21: true,

            bollinger: false,

            vwap: false,

            supertrend: false,

            rsi: false,

            macd: false,

            rsiPeriod: 14,

            emaFast: 9,
            emaSlow: 21,

            smaFast: 20,
            smaSlow: 50,

            bollingerPeriod: 20,
            bollingerMultiplier: 2,

            supertrendPeriod: 10,
            supertrendMultiplier: 3
        },

        lastCandles: [],
        lastVolume: [],

        markerTimer: null,

        /* =====================================================
         * INITIALIZE
         * ===================================================== */

        init: function (containerId) {

            this.containerId =
                containerId ||
                this.containerId;

            const container =
                document.getElementById(
                    this.containerId
                );

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
                    '<div style="' +
                    'padding:30px;' +
                    'text-align:center;' +
                    'color:#ff5964;' +
                    'font-size:15px">' +

                    '⚠️ Chart library not loaded.' +

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

            /* -------------------------------------------------
             * CREATE CHART
             * ------------------------------------------------- */

            this.chart =
                LightweightCharts.createChart(
                    container,
                    {

                        width:
                            container.clientWidth,

                        height: 430,

                        layout: {

                            background: {
                                color: "#08111f"
                            },

                            textColor: "#9aaac0"
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

            /* -------------------------------------------------
             * CANDLE SERIES
             * ------------------------------------------------- */

            try {

                if (
                    LightweightCharts.CandlestickSeries &&
                    this.chart.addSeries
                ) {

                    this.candleSeries =
                        this.chart.addSeries(
                            LightweightCharts.CandlestickSeries,
                            {

                                upColor: "#35d07f",

                                downColor: "#ff5964",

                                borderUpColor:
                                    "#35d07f",

                                borderDownColor:
                                    "#ff5964",

                                wickUpColor:
                                    "#35d07f",

                                wickDownColor:
                                    "#ff5964"
                            }
                        );

                } else {

                    this.candleSeries =
                        this.chart.addCandlestickSeries({

                            upColor: "#35d07f",

                            downColor: "#ff5964",

                            borderUpColor:
                                "#35d07f",

                            borderDownColor:
                                "#ff5964",

                            wickUpColor:
                                "#35d07f",

                            wickDownColor:
                                "#ff5964"
                        });
                }

            } catch (error) {

                console.error(
                    "Candlestick creation failed",
                    error
                );

                return false;
            }

            /* -------------------------------------------------
             * VOLUME
             * ------------------------------------------------- */

            try {

                if (
                    LightweightCharts.HistogramSeries &&
                    this.chart.addSeries
                ) {

                    this.volumeSeries =
                        this.chart.addSeries(
                            LightweightCharts.HistogramSeries,
                            {

                                priceFormat: {
                                    type: "volume"
                                },

                                priceScaleId:
                                    "volume",

                                lastValueVisible:
                                    false,

                                priceLineVisible:
                                    false
                            }
                        );

                } else {

                    this.volumeSeries =
                        this.chart.addHistogramSeries({

                            priceFormat: {
                                type: "volume"
                            },

                            priceScaleId:
                                "volume"
                        });
                }

                if (
                    this.volumeSeries &&
                    this.volumeSeries.priceScale
                ) {

                    this.volumeSeries
                        .priceScale()
                        .applyOptions({

                            scaleMargins: {

                                top: 0.78,

                                bottom: 0
                            }
                        });
                }

            } catch (error) {

                console.warn(
                    "Volume series unavailable",
                    error
                );
            }

            this.initialized = true;

            this.createIndicatorPanel();

            window.addEventListener(
                "resize",
                () => this.resize()
            );

            return true;
        },

        /* =====================================================
         * RESIZE
         * ===================================================== */

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

        /* =====================================================
         * OPEN SYMBOL
         * ===================================================== */

        open: function (
            symbol,
            interval
        ) {

            this.currentSymbol =
                symbol;

            this.currentInterval =
                interval ||
                this.currentInterval ||
                "1m";

            if (!this.initialized) {

                if (
                    !this.init(
                        this.containerId
                    )
                ) {

                    return false;
                }
            }

            this.clearPriceLines();

            this.loadData();

            this.activateTimeframe(
                this.currentInterval
            );

            return true;
        },

        /* =====================================================
         * LOAD DATA
         * ===================================================== */

        loadData: function () {

            if (
                !this.currentSymbol ||
                !this.candleSeries ||
                !window.TradeSimMarket
            ) {

                return;
            }

            const candles =
                TradeSimMarket.getCandles(
                    this.currentSymbol,
                    this.currentInterval
                ) || [];

            const volume =
                TradeSimMarket.getVolume(
                    this.currentSymbol,
                    this.currentInterval
                ) || [];

            if (!candles.length) {

                console.warn(
                    "TradeSim: no candles",
                    this.currentSymbol,
                    this.currentInterval
                );

                return;
            }

            this.lastCandles =
                candles;

            this.lastVolume =
                volume;

            /* -------------------------------------------------
             * CANDLES
             * ------------------------------------------------- */

            this.candleSeries.setData(
                candles
            );

            /* -------------------------------------------------
             * VOLUME
             * ------------------------------------------------- */

            if (this.volumeSeries) {

                const volumeMap = {};

                volume.forEach(
                    item => {

                        volumeMap[
                            item.time
                        ] =
                            item.value;
                    }
                );

                const volumeData =
                    candles.map(
                        candle => {

                            return {

                                time:
                                    candle.time,

                                value:
                                    volumeMap[
                                        candle.time
                                    ] || 0,

                                color:
                                    candle.close >=
                                    candle.open

                                    ? "#35d07f"

                                    : "#ff5964"
                            };
                        }
                    );

                this.volumeSeries
                    .setData(
                        volumeData
                    );
            }

            /* -------------------------------------------------
             * FIT CHART
             * ------------------------------------------------- */

            this.chart
                .timeScale()
                .fitContent();

            /* -------------------------------------------------
             * INDICATORS
             * ------------------------------------------------- */

            this.renderIndicators();

            /* -------------------------------------------------
             * ORDERS
             * ------------------------------------------------- */

            this.updateMarkers();
        },

        /* =====================================================
         * LIVE UPDATE
         * ===================================================== */

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
                !window.TradeSimMarket
            ) {

                return;
            }

            const candles =
                TradeSimMarket.getCandles(
                    this.currentSymbol,
                    this.currentInterval
                ) || [];

            const volume =
                TradeSimMarket.getVolume(
                    this.currentSymbol,
                    this.currentInterval
                ) || [];

            if (!candles.length) {
                return;
            }

            this.lastCandles =
                candles;

            this.lastVolume =
                volume;

            const last =
                candles[
                    candles.length - 1
                ];

            /* -------------------------------------------------
             * UPDATE CURRENT CANDLE
             * ------------------------------------------------- */

            this.candleSeries.update(
                last
            );

            /* -------------------------------------------------
             * UPDATE VOLUME
             * ------------------------------------------------- */

            if (
                this.volumeSeries &&
                volume.length
            ) {

                const v =
                    volume[
                        volume.length - 1
                    ];

                this.volumeSeries.update({

                    time:
                        v.time,

                    value:
                        v.value,

                    color:
                        last.close >=
                        last.open

                        ? "#35d07f"

                        : "#ff5964"
                });
            }

            /* -------------------------------------------------
             * INDICATORS MOVE WITH PRICE
             * ------------------------------------------------- */

            this.renderIndicators();

            /* -------------------------------------------------
             * TRADE MARKERS
             * ------------------------------------------------- */

            this.updateMarkers();
        },

        /* =====================================================
         * TIMEFRAME
         * ===================================================== */

        setInterval: function (
            interval
        ) {

            if (
                !window.TradeSimMarket
            ) {

                return false;
            }

            if (
                !TradeSimMarket.intervals[
                    interval
                ]
            ) {

                return false;
            }

            this.currentInterval =
                interval;

            TradeSimMarket.setInterval(
                interval
            );

            this.activateTimeframe(
                interval
            );

            this.loadData();

            return true;
        },

        /* =====================================================
         * ONLY ONE TIMEFRAME ACTIVE
         * ===================================================== */

        activateTimeframe: function (
            interval
        ) {

            const buttons =
                document.querySelectorAll(
                    ".chart-tools button"
                );

            buttons.forEach(
                button => {

                    const buttonInterval =
                        button.dataset.interval ||
                        button.getAttribute(
                            "data-timeframe"
                        ) ||
                        button.textContent
                            .trim();

                    button.classList.remove(
                        "active"
                    );

                    button.style.opacity =
                        "0.65";

                    if (
                        buttonInterval ===
                        interval
                    ) {

                        button.classList.add(
                            "active"
                        );

                        button.style.opacity =
                            "1";
                    }
                }
            );
        },

        /* =====================================================
         * INDICATOR PANEL
         * ===================================================== */

        createIndicatorPanel:
            function () {

                const old =
                    document.getElementById(
                        "tsIndicatorPanel"
                    );

                if (old) {
                    old.remove();
                }

                const chart =
                    document.getElementById(
                        this.containerId
                    );

                if (!chart) {
                    return;
                }

                const panel =
                    document.createElement(
                        "div"
                    );

                panel.id =
                    "tsIndicatorPanel";

                panel.style.cssText =
                    "display:flex;" +
                    "gap:6px;" +
                    "padding:8px 0;" +
                    "overflow-x:auto;" +
                    "flex-wrap:wrap;";

                const title =
                    document.createElement(
                        "span"
                    );

                title.textContent =
                    "ƒx Indicators";

                title.style.cssText =
                    "background:#258cff;" +
                    "color:#fff;" +
                    "padding:8px 10px;" +
                    "border-radius:8px;" +
                    "font-weight:bold;";

                panel.appendChild(
                    title
                );

                const indicators = [

                    ["sma20", "SMA 20"],

                    ["sma50", "SMA 50"],

                    ["ema9", "EMA 9"],

                    ["ema21", "EMA 21"],

                    ["bollinger", "BB"],

                    ["vwap", "VWAP"],

                    ["supertrend", "Supertrend"],

                    ["rsi", "RSI"],

                    ["macd", "MACD"]
                ];

                indicators.forEach(
                    item => {

                        const key =
                            item[0];

                        const text =
                            item[1];

                        const button =
                            document.createElement(
                                "button"
                            );

                        button.textContent =
                            text;

                        button.dataset.indicator =
                            key;

                        button.style.cssText =
                            "border:1px solid #2b3d58;" +
                            "background:#111d30;" +
                            "color:#9aaac0;" +
                            "padding:8px 10px;" +
                            "border-radius:8px;" +
                            "white-space:nowrap;";

                        if (
                            this.settings[
                                key
                            ]
                        ) {

                            button.style.background =
                                "#258cff";

                            button.style.color =
                                "#fff";
                        }

                        button.onclick =
                            () => {

                                this.settings[
                                    key
                                ] =
                                    !this.settings[
                                        key
                                    ];

                                button.style.background =
                                    this.settings[
                                        key
                                    ]

                                    ? "#258cff"

                                    : "#111d30";

                                button.style.color =
                                    this.settings[
                                        key
                                    ]

                                    ? "#fff"

                                    : "#9aaac0";

                                this.renderIndicators();
                            };

                        panel.appendChild(
                            button
                        );
                    }
                );

                /* SETTINGS BUTTON */

                const settings =
                    document.createElement(
                        "button"
                    );

                settings.textContent =
                    "⚙ Settings";

                settings.style.cssText =
                    "border:1px solid #35d07f;" +
                    "background:#10261e;" +
                    "color:#35d07f;" +
                    "padding:8px 10px;" +
                    "border-radius:8px;" +
                    "white-space:nowrap;";

                settings.onclick =
                    () => {

                        this.openIndicatorSettings();
                    };

                panel.appendChild(
                    settings
                );

                chart.parentElement.insertBefore(
                    panel,
                    chart
                );
            },

        /* =====================================================
         * INDICATOR SETTINGS
         * ===================================================== */

        openIndicatorSettings:
            function () {

                let modal =
                    document.getElementById(
                        "tsIndicatorSettings"
                    );

                if (modal) {

                    modal.remove();

                    return;
                }

                modal =
                    document.createElement(
                        "div"
                    );

                modal.id =
                    "tsIndicatorSettings";

                modal.style.cssText =
                    "background:#0e1929;" +
                    "border:1px solid #2b3d58;" +
                    "border-radius:12px;" +
                    "padding:14px;" +
                    "margin:8px 0;" +
                    "color:#fff;";

                modal.innerHTML =

                    "<b style='font-size:16px'>Indicator Settings</b>" +

                    "<div style='margin-top:12px'>" +

                    this.settingInput(
                        "RSI Period",
                        "rsiPeriod",
                        this.settings.rsiPeriod
                    ) +

                    this.settingInput(
                        "EMA Fast",
                        "emaFast",
                        this.settings.emaFast
                    ) +

                    this.settingInput(
                        "EMA Slow",
                        "emaSlow",
                        this.settings.emaSlow
                    ) +

                    this.settingInput(
                        "SMA Fast",
                        "smaFast",
                        this.settings.smaFast
                    ) +

                    this.settingInput(
                        "SMA Slow",
                        "smaSlow",
                        this.settings.smaSlow
                    ) +

                    this.settingInput(
                        "BB Period",
                        "bollingerPeriod",
                        this.settings.bollingerPeriod
                    ) +

                    this.settingInput(
                        "BB Multiplier",
                        "bollingerMultiplier",
                        this.settings.bollingerMultiplier
                    ) +

                    this.settingInput(
                        "Supertrend Period",
                        "supertrendPeriod",
                        this.settings.supertrendPeriod
                    ) +

                    this.settingInput(
                        "Supertrend Multiplier",
                        "supertrendMultiplier",
                        this.settings.supertrendMultiplier
                    ) +

                    "</div>" +

                    "<button id='tsApplyIndicatorSettings' " +

                    "style='margin-top:10px;" +
                    "background:#35d07f;" +
                    "border:0;" +
                    "padding:10px 15px;" +
                    "border-radius:8px;" +
                    "font-weight:bold'>" +

                    "Apply Settings" +

                    "</button>";

                const panel =
                    document.getElementById(
                        "tsIndicatorPanel"
                    );

                if (panel) {

                    panel.after(
                        modal
                    );
                }

                const apply =
                    document.getElementById(
                        "tsApplyIndicatorSettings"
                    );

                if (apply) {

                    apply.onclick =
                        () => {

                            const fields =
                                modal.querySelectorAll(
                                    "input"
                                );

                            fields.forEach(
                                field => {

                                    const key =
                                        field.dataset.key;

                                    let value =
                                        parseFloat(
                                            field.value
                                        );

                                    if (
                                        !Number.isFinite(
                                            value
                                        )
                                    ) {

                                        return;
                                    }

                                    this.settings[
                                        key
                                    ] =
                                        value;
                                }
                            );

                            modal.remove();

                            this.renderIndicators();
                        };
                }
            },

        /* =====================================================
         * SETTING INPUT
         * ===================================================== */

        settingInput:
            function (
                label,
                key,
                value
            ) {

                return (

                    "<label style='" +
                    "display:flex;" +
                    "justify-content:space-between;" +
                    "gap:10px;" +
                    "margin-top:8px;" +
                    "align-items:center'>" +

                    label +

                    "<input " +
                    "type='number' " +
                    "step='0.1' " +
                    "value='" +
                    value +
                    "' " +
                    "data-key='" +
                    key +
                    "' " +

                    "style='" +
                    "width:90px;" +
                    "background:#08111f;" +
                    "border:1px solid #2b3d58;" +
                    "color:#fff;" +
                    "padding:7px;" +
                    "border-radius:6px'>" +

                    "</label>"
                );
            },

        /* =====================================================
         * MOVING AVERAGE
         * ===================================================== */

        sma: function (
            candles,
            period
        ) {

            const output = [];

            if (
                period <= 0
            ) {

                return output;
            }

            for (
                let i = period - 1;
                i < candles.length;
                i++
            ) {

                let sum = 0;

                for (
                    let j =
                        i - period + 1;
                    j <= i;
                    j++
                ) {

                    sum +=
                        candles[j].close;
                }

                output.push({

                    time:
                        candles[i].time,

                    value:
                        sum / period
                });
            }

            return output;
        },

        /* =====================================================
         * EMA
         * ===================================================== */

        ema: function (
            candles,
            period
        ) {

            const output = [];

            if (
                period <= 0 ||
                candles.length < period
            ) {

                return output;
            }

            const multiplier =
                2 /
                (period + 1);

            let emaValue = 0;

            for (
                let i = 0;
                i < period;
                i++
            ) {

                emaValue +=
                    candles[i].close;
            }

            emaValue /=
                period;

            output.push({

                time:
                    candles[
                        period - 1
                    ].time,

                value:
                    emaValue
            });

            for (
                let i = period;
                i < candles.length;
                i++
            ) {

                emaValue =
                    (
                        candles[i].close -
                        emaValue
                    ) *
                    multiplier +
                    emaValue;

                output.push({

                    time:
                        candles[i].time,

                    value:
                        emaValue
                });
            }

            return output;
        },

        /* =====================================================
         * BOLLINGER
         * ===================================================== */

        bollinger:
            function (
                candles,
                period,
                multiplier
            ) {

                const upper = [];
                const middle = [];
                const lower = [];

                for (
                    let i =
                        period - 1;
                    i < candles.length;
                    i++
                ) {

                    const values = [];

                    for (
                        let j =
                            i - period + 1;
                        j <= i;
                        j++
                    ) {

                        values.push(
                            candles[j].close
                        );
                    }

                    const mean =
                        values.reduce(
                            (a, b) =>
                                a + b,
                            0
                        ) /
                        period;

                    let variance = 0;

                    values.forEach(
                        value => {

                            variance +=
                                Math.pow(
                                    value -
                                    mean,
                                    2
                                );
                        }
                    );

                    const deviation =
                        Math.sqrt(
                            variance /
                            period
                        );

                    upper.push({

                        time:
                            candles[i].time,

                        value:
                            mean +
                            deviation *
                            multiplier
                    });

                    middle.push({

                        time:
                            candles[i].time,

                        value:
                            mean
                    });

                    lower.push({

                        time:
                            candles[i].time,

                        value:
                            mean -
                            deviation *
                            multiplier
                    });
                }

                return {

                    upper,
                    middle,
                    lower
                };
            },

        /* =====================================================
         * VWAP
         * ===================================================== */

        vwap: function (
            candles,
            volume
        ) {

            const result = [];

            let cumulativePV = 0;
            let cumulativeVolume = 0;

            const volumeMap = {};

            volume.forEach(
                item => {

                    volumeMap[
                        item.time
                    ] =
                        Number(
                            item.value
                        ) || 0;
                }
            );

            candles.forEach(
                candle => {

                    const v =
                        volumeMap[
                            candle.time
                        ] || 0;

                    const typical =
                        (
                            candle.high +
                            candle.low +
                            candle.close
                        ) / 3;

                    cumulativePV +=
                        typical * v;

                    cumulativeVolume +=
                        v;

                    if (
                        cumulativeVolume >
                        0
                    ) {

                        result.push({

                            time:
                                candle.time,

                            value:
                                cumulativePV /
                                cumulativeVolume
                        });
                    }
                }
            );

            return result;
        },

        /* =====================================================
         * RSI
         * ===================================================== */

        rsi: function (
            candles,
            period
        ) {

            const result = [];

            if (
                candles.length <= period
            ) {

                return result;
            }

            let gain = 0;
            let loss = 0;

            for (
                let i = 1;
                i <= period;
                i++
            ) {

                const change =
                    candles[i].close -
                    candles[i - 1].close;

                if (change >= 0) {

                    gain += change;

                } else {

                    loss -= change;
                }
            }

            let averageGain =
                gain / period;

            let averageLoss =
                loss / period;

            for (
                let i = period + 1;
                i < candles.length;
                i++
            ) {

                const change =
                    candles[i].close -
                    candles[i - 1].close;

                const currentGain =
                    Math.max(
                        change,
                        0
                    );

                const currentLoss =
                    Math.max(
                        -change,
                        0
                    );

                averageGain =
                    (
                        averageGain *
                        (period - 1) +
                        currentGain
                    ) /
                    period;

                averageLoss =
                    (
                        averageLoss *
                        (period - 1) +
                        currentLoss
                    ) /
                    period;

                const rs =
                    averageGain /
                    (
                        averageLoss ||
                        0.000001
                    );

                const rsi =
                    100 -
                    (
                        100 /
                        (1 + rs)
                    );

                result.push({

                    time:
                        candles[i].time,

                    value:
                        rsi
                });
            }

            return result;
        },

        /* =====================================================
         * SUPERTREND
         * ===================================================== */

        supertrend:
            function (
                candles,
                period,
                multiplier
            ) {

                const result = [];

                if (
                    candles.length <
                    period + 1
                ) {

                    return result;
                }

                let previousClose =
                    candles[0].close;

                const ranges = [];

                for (
                    let i = 0;
                    i < candles.length;
                    i++
                ) {

                    const candle =
                        candles[i];

                    const tr =
                        i === 0

                        ? candle.high -
                          candle.low

                        : Math.max(

                            candle.high -
                            candle.low,

                            Math.abs(
                                candle.high -
                                previousClose
                            ),

                            Math.abs(
                                candle.low -
                                previousClose
                            )
                        );

                    ranges.push(tr);

                    previousClose =
                        candle.close;

                    if (
                        i <
                        period - 1
                    ) {

                        continue;
                    }

                    const recent =
                        ranges.slice(
                            i - period + 1,
                            i + 1
                        );

                    const atr =
                        recent.reduce(
                            (a, b) =>
                                a + b,
                            0
                        ) /
                        period;

                    const midpoint =
                        (
                            candle.high +
                            candle.low
                        ) / 2;

                    const upper =
                        midpoint +
                        multiplier *
                        atr;

                    const lower =
                        midpoint -
                        multiplier *
                        atr;

                    const value =
                        candle.close >=
                        midpoint

                        ? lower

                        : upper;

                    result.push({

                        time:
                            candle.time,

                        value:
                            value
                    });
                }

                return result;
            },

        /* =====================================================
         * DRAW LINE
         * ===================================================== */

        drawLine:
            function (
                key,
                data,
                color,
                title
            ) {

                if (
                    !this.chart ||
                    !data ||
                    !data.length
                ) {

                    return;
                }

                let series =
                    this.indicatorSeries[
                        key
                    ];

                try {

                    if (!series) {

                        if (
                            LightweightCharts.LineSeries &&
                            this.chart.addSeries
                        ) {

                            series =
                                this.chart.addSeries(
                                    LightweightCharts.LineSeries,
                                    {

                                        color:
                                            color,

                                        lineWidth:
                                            2,

                                        title:
                                            title,

                                        priceLineVisible:
                                            false,

                                        lastValueVisible:
                                            false
                                    }
                                );

                        } else {

                            series =
                                this.chart.addLineSeries({

                                    color:
                                        color,

                                    lineWidth:
                                        2,

                                    title:
                                        title,

                                    priceLineVisible:
                                        false,

                                    lastValueVisible:
                                        false
                                });
                        }

                        this.indicatorSeries[
                            key
                        ] =
                            series;
                    }

                    series.setData(
                        data
                    );

                } catch (error) {

                    console.warn(
                        "Indicator error:",
                        key,
                        error
                    );
                }
            },

        /* =====================================================
         * REMOVE LINE
         * ===================================================== */

        removeLine:
            function (key) {

                const series =
                    this.indicatorSeries[
                        key
                    ];

                if (
                    series &&
                    this.chart
                ) {

                    try {

                        this.chart.removeSeries(
                            series
                        );

                    } catch (e) {}
                }

                delete this.indicatorSeries[
                    key
                ];
            },

        /* =====================================================
         * RENDER INDICATORS
         * ===================================================== */

        renderIndicators:
            function () {

                const candles =
                    this.lastCandles || [];

                if (!candles.length) {
                    return;
                }

                /* SMA 20 */

                if (
                    this.settings.sma20
                ) {

                    this.drawLine(
                        "sma20",

                        this.sma(
                            candles,
                            Math.max(
                                1,
                                Math.round(
                                    this.settings.smaFast
                                )
                            )
                        ),

                        "#4da3ff",

                        "SMA"
                    );

                } else {

                    this.removeLine(
                        "sma20"
                    );
                }

                /* SMA 50 */

                if (
                    this.settings.sma50
                ) {

                    this.drawLine(
                        "sma50",

                        this.sma(
                            candles,
                            Math.max(
                                1,
                                Math.round(
                                    this.settings.smaSlow
                                )
                            )
                        ),

                        "#a77bff",

                        "SMA"
                    );

                } else {

                    this.removeLine(
                        "sma50"
                    );
                }

                /* EMA 9 */

                if (
                    this.settings.ema9
                ) {

                    this.drawLine(
                        "ema9",

                        this.ema(
                            candles,
                            Math.max(
                                1,
                                Math.round(
                                    this.settings.emaFast
                                )
                            )
                        ),

                        "#ff9f43",

                        "EMA"
                    );

                } else {

                    this.removeLine(
                        "ema9"
                    );
                }

                /* EMA 21 */

                if (
                    this.settings.ema21
                ) {

                    this.drawLine(
                        "ema21",

                        this.ema(
                            candles,
                            Math.max(
                                1,
                                Math.round(
                                    this.settings.emaSlow
                                )
                            )
                        ),

                        "#35d07f",

                        "EMA"
                    );

                } else {

                    this.removeLine(
                        "ema21"
                    );
                }

                /* BOLLINGER */

                if (
                    this.settings.bollinger
                ) {

                    const bb =
                        this.bollinger(
                            candles,

                            Math.max(
                                1,
                                Math.round(
                                    this.settings
                                        .bollingerPeriod
                                )
                            ),

                            Number(
                                this.settings
                                    .bollingerMultiplier
                            )
                        );

                    this.drawLine(
                        "bbUpper",
                        bb.upper,
                        "#9b7cff",
                        "BB Upper"
                    );

                    this.drawLine(
                        "bbMiddle",
                        bb.middle,
                        "#777777",
                        "BB Middle"
                    );

                    this.drawLine(
                        "bbLower",
                        bb.lower,
                        "#9b7cff",
                        "BB Lower"
                    );

                } else {

                    this.removeLine(
                        "bbUpper"
                    );

                    this.removeLine(
                        "bbMiddle"
                    );

                    this.removeLine(
                        "bbLower"
                    );
                }

                /* VWAP */

                if (
                    this.settings.vwap
                ) {

                    this.drawLine(
                        "vwap",

                        this.vwap(
                            candles,
                            this.lastVolume
                        ),

                        "#e6c34a",

                        "VWAP"
                    );

                } else {

                    this.removeLine(
                        "vwap"
                    );
                }

                /* SUPERTREND */

                if (
                    this.settings.supertrend
                ) {

                    this.drawLine(
                        "supertrend",

                        this.supertrend(
                            candles,

                            Math.max(
                                1,
                                Math.round(
                                    this.settings
                                        .supertrendPeriod
                                )
                            ),

                            Number(
                                this.settings
                                    .supertrendMultiplier
                            )
                        ),

                        "#ffb000",

                        "Supertrend"
                    );

                } else {

                    this.removeLine(
                        "supertrend"
                    );
                }

                /* RSI */

                if (
                    this.settings.rsi
                ) {

                    this.drawLine(
                        "rsi",

                        this.rsi(
                            candles,

                            Math.max(
                                2,
                                Math.round(
                                    this.settings
                                        .rsiPeriod
                                )
                            )
                        ),

                        "#ff59c7",

                        "RSI"
                    );

                } else {

                    this.removeLine(
                        "rsi"
                    );
                }
            },

        /* =====================================================
         * BUY / SELL MARKERS
         * ===================================================== */

        updateMarkers:
            function () {

                if (
                    !this.candleSeries ||
                    !window.TradeSimState
                ) {

                    return;
                }

                const orders =
                    TradeSimState.orders ||
                    [];

                const markers = [];

                orders
                    .filter(
                        order =>
                            order.symbol ===
                            this.currentSymbol
                    )
                    .forEach(
                        order => {

                            const raw =
                                order.time ||
                                order.timestamp ||
                                order.createdAt ||
                                Date.now();

                            let timestamp;

                            if (
                                typeof raw ===
                                "number"
                            ) {

                                timestamp =
                                    raw > 1000000000000

                                    ? raw / 1000

                                    : raw;

                            } else {

                                timestamp =
                                    Math.floor(
                                        new Date(
                                            raw
                                        ).getTime() /
                                        1000
                                    );
                            }

                            const executionCandle =
                                this.getExecutionCandle(
                                    timestamp
                                );

                            if (
                                !executionCandle
                            ) {

                                return;
                            }

                            const buy =
                                order.type ===
                                "BUY";

                            markers.push({

                                time:
                                    executionCandle.time,

                                position:
                                    buy
                                    ? "belowBar"
                                    : "aboveBar",

                                color:
                                    buy
                                    ? "#35d07f"
                                    : "#ff5964",

                                shape:
                                    buy
                                    ? "arrowUp"
                                    : "arrowDown",

                                text:
                                    buy
                                    ? "BUY"
                                    : "SELL"
                            });
                        }
                    );

                markers.sort(
                    (a, b) =>
                        a.time -
                        b.time
                );

                try {

                    if (
                        LightweightCharts
                            .createSeriesMarkers
                    ) {

                        if (
                            !this.markerObject
                        ) {

                            this.markerObject =
                                LightweightCharts
                                    .createSeriesMarkers(
                                        this.candleSeries,
                                        markers
                                    );

                        } else {

                            this.markerObject
                                .setMarkers(
                                    markers
                                );
                        }

                    } else if (
                        this.candleSeries
                            .setMarkers
                    ) {

                        this.candleSeries
                            .setMarkers(
                                markers
                            );
                    }

                } catch (error) {

                    console.warn(
                        "Marker error",
                        error
                    );
                }
            },

        /* =====================================================
         * FIND EXECUTION CANDLE
         * ===================================================== */

        getExecutionCandle:
            function (timestamp) {

                const candles =
                    this.lastCandles ||
                    [];

                if (!candles.length) {
                    return null;
                }

                let closest =
                    candles[0];

                let difference =
                    Math.abs(
                        candles[0].time -
                        timestamp
                    );

                candles.forEach(
                    candle => {

                        const d =
                            Math.abs(
                                candle.time -
                                timestamp
                            );

                        if (
                            d <
                            difference
                        ) {

                            difference =
                                d;

                            closest =
                                candle;
                        }
                    }
                );

                return closest;
            },

        /* =====================================================
         * PRICE LINES
         * ===================================================== */

        addTradeLines:
            function (order) {

                if (
                    !this.candleSeries ||
                    !order
                ) {

                    return;
                }

                this.clearPriceLines();

                const buy =
                    order.type ===
                    "BUY";

                const mainColor =
                    buy
                    ? "#35d07f"
                    : "#ff5964";

                this.createPriceLine(
                    order.price,
                    order.type +
                    " " +
                    order.symbol,
                    mainColor
                );

                if (
                    Number.isFinite(
                        Number(
                            order.stopLoss
                        )
                    )
                ) {

                    this.createPriceLine(
                        order.stopLoss,
                        "SL",
                        "#ff5964"
                    );
                }

                if (
                    Number.isFinite(
                        Number(
                            order.target
                        )
                    )
                ) {

                    this.createPriceLine(
                        order.target,
                        "TARGET",
                        "#35d07f"
                    );
                }
            },

        createPriceLine:
            function (
                price,
                title,
                color
            ) {

                try {

                    if (
                        !Number.isFinite(
                            Number(price)
                        )
                    ) {

                        return;
                    }

                    const line =
                        this.candleSeries
                            .createPriceLine({

                                price:
                                    Number(price),

                                color:
                                    color,

                                lineWidth:
                                    1,

                                lineStyle:
                                    LightweightCharts
                                        .LineStyle
                                        ? LightweightCharts
                                            .LineStyle
                                            .Dashed
                                        : 2,

                                axisLabelVisible:
                                    true,

                                title:
                                    title
                            });

                    this.priceLines.push(
                        line
                    );

                } catch (error) {

                    console.warn(
                        "Price line error",
                        error
                    );
                }
            },

        clearPriceLines:
            function () {

                if (
                    !this.candleSeries
                ) {

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

                this.priceLines = [];
            },

        /* =====================================================
         * FIT CONTENT
         * ===================================================== */

        fit: function () {

            if (
                this.chart
            ) {

                this.chart
                    .timeScale()
                    .fitContent();
            }
        },

        /* =====================================================
         * DESTROY
         * ===================================================== */

        destroy: function () {

            this.clearPriceLines();

            if (this.chart) {

                try {

                    this.chart.remove();

                } catch (e) {}
            }

            this.chart = null;

            this.candleSeries =
                null;

            this.volumeSeries =
                null;

            this.initialized =
                false;

            this.indicatorSeries =
                {};
        }
    };

    /* =========================================================
     * GLOBAL OBJECT
     * ========================================================= */

    window.TradeSimChart =
        TS;

    /* =========================================================
     * MARKET CONNECTION
     * ========================================================= */

    if (
        window.TradeSimMarket &&
        typeof TradeSimMarket.on ===
        "function"
    ) {

        TradeSimMarket.on(
            function (event) {

                if (
                    event.type ===
                    "tick"
                ) {

                    TS.update(
                        event
                    );
                }

                if (
                    event.type ===
                    "interval"
                ) {

                    if (
                        TS.currentSymbol
                    ) {

                        TS.loadData();
                    }
                }
            }
        );
    }

})();
