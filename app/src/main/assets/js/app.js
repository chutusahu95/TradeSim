/* TradeSim TradingView-style application controller
 * Paper trading only. Uses the existing Market, Trading and Chart engines.
 */
(function () {
  "use strict";

  const STARTING_CASH = 1000000;
  const App = {
    currentPage: "home",
    currentSymbol: "RELIANCE",
    currentInterval: "1m",
    filter: "ALL",
    searchText: "",
    initialized: false,

    assets: [
      ["RELIANCE", "Reliance Industries", "STOCK", 1450.50, 1.24],
      ["TCS", "Tata Consultancy Services", "STOCK", 3245.20, 0.82],
      ["INFY", "Infosys", "STOCK", 1542.30, -0.45],
      ["HDFCBANK", "HDFC Bank", "STOCK", 1710.40, 0.64],
      ["ICICIBANK", "ICICI Bank", "STOCK", 1315.80, 1.05],
      ["SBIN", "State Bank of India", "STOCK", 825.40, -0.32],
      ["ITC", "ITC Limited", "STOCK", 418.75, 0.38],
      ["BHARTIARTL", "Bharti Airtel", "STOCK", 1865.10, 1.62],
      ["BTC", "Bitcoin", "CRYPTO", 10450000, 1.15],
      ["ETH", "Ethereum", "CRYPTO", 395000, 0.72],
      ["SOL", "Solana", "CRYPTO", 18500, -1.20],
      ["BNB", "BNB", "CRYPTO", 87000, 0.55]
    ],

    init() {
      if (this.initialized) return;
      this.initialized = true;
      this.registerAssets();
      this.installStyle();
      this.patchChartControls();
      this.bindEvents();
      this.renderAll();
      this.startMarket();
      setTimeout(() => this.openChart(this.currentSymbol), 120);
    },

    registerAssets() {
      if (!window.TradeSimMarket) return;
      TradeSimMarket.registerAssets(this.assets.map(a => ({
        symbol: a[0], name: a[1], type: a[2], price: a[3], change: a[4]
      })));
    },

    startMarket() {
      if (window.TradeSimMarket && !TradeSimMarket.running) TradeSimMarket.start();
    },

    installStyle() {
      if (document.getElementById("tradesim-tv-style")) return;
      const s = document.createElement("style");
      s.id = "tradesim-tv-style";
      s.textContent = `
        :root{--ts-bg:#0b0e11;--ts-panel:#13171c;--ts-panel2:#1a1f26;--ts-border:#2a3038;--ts-text:#d9dee7;--ts-muted:#8c96a5;--ts-blue:#2962ff;--ts-green:#26a69a;--ts-red:#ef5350}
        html,body{background:var(--ts-bg)!important;color:var(--ts-text)!important;font-family:Inter,Arial,sans-serif!important}
        .app{max-width:1100px;background:var(--ts-bg);padding-bottom:70px}
        .header{background:#0b0e11!important;border-color:var(--ts-border)!important;padding:9px 14px!important}
        .brand h1{font-size:20px!important}.brand span{color:#fff!important}.status{font-size:9px!important;color:#26a69a!important}
        .content{padding:10px!important}.title{font-size:20px!important;margin-bottom:10px!important}
        .page{background:var(--ts-bg)}
        .asset,.card,.order,.chart-header,.coach{background:var(--ts-panel)!important;border-color:var(--ts-border)!important;border-radius:6px!important}
        .balance-card{border-radius:7px!important;background:linear-gradient(135deg,#151a21,#10231f)!important}
        .filters,.chart-toolbar{scrollbar-width:none}.filters::-webkit-scrollbar,.chart-toolbar::-webkit-scrollbar{display:none}
        .filter,.chart-toolbar button{background:var(--ts-panel)!important;border-color:var(--ts-border)!important;color:var(--ts-muted)!important;border-radius:4px!important}
        .filter.active,.chart-toolbar button.active{background:var(--ts-blue)!important;color:#fff!important;border-color:var(--ts-blue)!important}
        .chart-wrap{border:1px solid var(--ts-border)!important;border-radius:4px!important;background:#0b0e11!important;margin:0!important}
        #chart{height:520px!important;min-height:420px!important}
        .chart-header{margin-bottom:6px!important;padding:9px 12px!important}
        .chart-symbol{font-size:18px!important}.chart-name{color:var(--ts-muted)!important}
        .chart-actions{position:sticky;bottom:8px;z-index:30;margin:8px 0!important}
        .chart-actions button{border-radius:4px!important;padding:12px!important}
        .buy{background:var(--ts-green)!important}.sell{background:var(--ts-red)!important}.chart-btn,.primary{background:var(--ts-blue)!important}
        .trade-buttons{gap:5px}.trade-buttons button{border-radius:4px!important}
        .bottom-nav{max-width:1100px;height:58px;background:#0b0e11!important;border-color:var(--ts-border)!important}
        .nav-btn{font-size:9px!important}.nav-icon{font-size:17px!important}
        #ts-tv-symbolbar{display:flex;align-items:center;gap:8px;overflow-x:auto;white-space:nowrap;background:#0b0e11;border-bottom:1px solid var(--ts-border);padding:7px 10px;margin:-10px -10px 8px}
        #ts-tv-symbolbar button{background:transparent;border:0;color:var(--ts-muted);padding:7px 9px;border-radius:4px;font-weight:600}
        #ts-tv-symbolbar button.active{background:#1d2530;color:#fff}
        #ts-chart-tools-extra{display:flex;gap:5px;margin:0 0 6px;overflow:auto}
        #ts-chart-tools-extra button{background:var(--ts-panel);color:var(--ts-muted);border:1px solid var(--ts-border);border-radius:4px;padding:6px 9px;white-space:nowrap}
        #ts-account-strip{display:grid;grid-template-columns:repeat(4,1fr);gap:6px;margin:7px 0}
        #ts-account-strip>div{background:var(--ts-panel);border:1px solid var(--ts-border);padding:8px;border-radius:4px;min-width:0}
        #ts-account-strip b{display:block;font-size:12px}.ts-k{font-size:9px;color:var(--ts-muted);display:block;margin-bottom:3px}
        #ts-position-bar{margin-top:8px;padding:9px;background:#11161c;border:1px solid var(--ts-border);border-radius:4px;font-size:12px}
        @media(max-width:650px){#ts-account-strip{grid-template-columns:1fr 1fr}#chart{height:430px!important;min-height:360px!important}.app{max-width:100%}}
      `;
      document.head.appendChild(s);
    },

    patchChartControls() {
      if (!window.TradeSimChart) return;
      TradeSimChart.activateTimeframe = function (interval) {
        document.querySelectorAll(".chart-toolbar button").forEach(b => {
          b.classList.toggle("active", b.dataset.interval === interval || b.textContent.trim() === interval);
        });
      };
      const toolbar = document.querySelector(".chart-toolbar");
      if (!toolbar || document.getElementById("ts-chart-tools-extra")) return;
      toolbar.querySelectorAll("button").forEach((b, i) => {
        const labels = ["1m","5m","15m","30m","1H","4H","1D","1W"];
        b.dataset.interval = labels[i] || b.textContent.trim();
      });
      const extra = document.createElement("div");
      extra.id = "ts-chart-tools-extra";
      extra.innerHTML = '<button id="tsFit">⛶ Fit</button><button id="tsLive">◉ Live</button><button id="tsClear">↺ Reset</button>';
      toolbar.parentNode.insertBefore(extra, toolbar.nextSibling);
      document.getElementById("tsFit").onclick = () => TradeSimChart.chart && TradeSimChart.chart.timeScale().fitContent();
      document.getElementById("tsLive").onclick = () => TradeSimChart.chart && TradeSimChart.chart.timeScale().scrollToRealTime();
      document.getElementById("tsClear").onclick = () => { if(TradeSimChart.chart) TradeSimChart.chart.timeScale().fitContent(); };
    },

    bindEvents() {
      const search = document.getElementById("searchBox");
      if (search) search.addEventListener("input", () => { this.searchText = search.value.trim().toUpperCase(); this.renderMarkets(); });
      if (window.TradeSimMarket) TradeSimMarket.on(e => {
        if (e.type === "tick") {
          this.renderMarketPrices();
          this.renderPortfolio();
          this.updateChartHeader();
          if (window.TradeSimChart) TradeSimChart.update(e);
        }
      });
      if (window.TradeSimTrading) TradeSimTrading.onTrade = e => { this.renderAll(); if (e.order && window.TradeSimChart) TradeSimChart.addTradeMarker(e.order); };
    },

    showPage(page, button) {
      document.querySelectorAll(".page").forEach(p => p.classList.toggle("active", p.id === page));
      document.querySelectorAll(".nav-btn").forEach(b => b.classList.remove("active"));
      if (button) button.classList.add("active");
      this.currentPage = page;
      if (page === "chartPage") setTimeout(() => this.openChart(this.currentSymbol), 50);
      this.renderAll();
    },

    openChart(symbol) {
      const asset = TradeSimMarket && TradeSimMarket.getAsset(symbol);
      if (!asset) return;
      this.currentSymbol = symbol;
      const a = ["chartSymbol","chartName","chartMeta"];
      this.setText(a[0], symbol); this.setText(a[1], asset.name); this.setText(a[2], `${asset.type} • PAPER TRADING`);
      this.showChartPage();
      setTimeout(() => {
        if (window.TradeSimChart) {
          TradeSimChart.open(symbol, this.currentInterval);
          TradeSimChart.activateTimeframe(this.currentInterval);
          this.addChartExtras();
        }
        this.updateChartHeader();
      }, 60);
    },

    showChartPage() {
      document.querySelectorAll(".page").forEach(p => p.classList.remove("active"));
      const page = document.getElementById("chartPage"); if (page) page.classList.add("active");
      this.currentPage = "chartPage";
    },

    setChartInterval(interval, button) {
      if (!TradeSimMarket.intervals[interval]) return;
      this.currentInterval = interval;
      document.querySelectorAll(".chart-toolbar button").forEach(b => b.classList.remove("active"));
      if (button) button.classList.add("active");
      if (window.TradeSimChart) TradeSimChart.setInterval(interval);
    },

    addChartExtras() {
      if (document.getElementById("ts-tv-symbolbar")) return;
      const header = document.querySelector("#chartPage .chart-header");
      if (!header) return;
      const bar = document.createElement("div"); bar.id = "ts-tv-symbolbar";
      const symbols = Object.values(TradeSimMarket.assets).slice(0,8);
      symbols.forEach(a => { const b=document.createElement("button"); b.textContent=a.symbol; b.className=a.symbol===this.currentSymbol?"active":""; b.onclick=()=>this.openChart(a.symbol); bar.appendChild(b); });
      header.parentNode.insertBefore(bar, header);
      this.addAccountStrip();
    },

    addAccountStrip() {
      if (document.getElementById("ts-account-strip")) return;
      const chart = document.getElementById("chart"); if (!chart) return;
      const strip = document.createElement("div"); strip.id="ts-account-strip";
      strip.innerHTML='<div><span class="ts-k">EQUITY</span><b id="tsEq">₹0</b></div><div><span class="ts-k">CASH</span><b id="tsCash">₹0</b></div><div><span class="ts-k">OPEN P/L</span><b id="tsOpen">₹0</b></div><div><span class="ts-k">POSITIONS</span><b id="tsPos">0</b></div>';
      chart.parentNode.insertBefore(strip, chart);
    },

    openTrade(symbol, side) {
      const asset = TradeSimMarket.getAsset(symbol); if (!asset) return;
      this.currentSymbol = symbol;
      const modal=document.getElementById("tradeModal");
      if (!modal) return this.quickTrade(symbol,side);
      this.setText("tradeTitle", `${side} ${symbol}`);
      this.setText("tradePrice", `Market price: ${this.money(asset.price)}`);
      const q=document.getElementById("tradeQty"), sl=document.getElementById("stopLoss"), tp=document.getElementById("targetPrice");
      if(q) q.value=""; if(sl) sl.value=""; if(tp) tp.value="";
      const exec=document.getElementById("executeTrade"); if(exec) exec.onclick=()=>this.executeTrade(symbol,side);
      modal.classList.add("show");
    },

    executeTrade(symbol,side) {
      const q=Number(document.getElementById("tradeQty")?.value), sl=Number(document.getElementById("stopLoss")?.value), tp=Number(document.getElementById("targetPrice")?.value);
      if(!Number.isFinite(q)||q<=0){alert("Enter a valid quantity.");return;}
      const options={stopLoss:Number.isFinite(sl)&&sl>0?sl:null,target:Number.isFinite(tp)&&tp>0?tp:null};
      let result=side==="BUY"?TradeSimTrading.buy(symbol,q,options):TradeSimTrading.sell(symbol,q,options);
      if(result?.requiresConfirmation){if(!confirm("Risk warning:\n\n"+result.message+"\n\nOrder value: "+this.money(result.orderValue)+"\n\nContinue?"))return;options.skipRiskWarning=true;result=side==="BUY"?TradeSimTrading.buy(symbol,q,options):TradeSimTrading.sell(symbol,q,options);}
      if(!result?.success){alert(result?.message||"Order rejected.");return;}
      this.closeTrade(); this.renderAll(); if(window.TradeSimChart&&result.order)TradeSimChart.addTradeMarker(result.order);
    },

    quickTrade(symbol,side){
      const q=Number(prompt(`${side} ${symbol}\nEnter quantity:`)); if(!Number.isFinite(q)||q<=0)return;
      const r=side==="BUY"?TradeSimTrading.buy(symbol,q):TradeSimTrading.sell(symbol,q); if(!r.success)alert(r.message);
    },

    closeTrade(){document.getElementById("tradeModal")?.classList.remove("show");},

    setFilter(filter,button){this.filter=filter;document.querySelectorAll(".filter").forEach(b=>b.classList.remove("active"));if(button)button.classList.add("active");this.renderMarkets();},

    renderAll(){this.renderHome();this.renderMarkets();this.renderPortfolio();this.renderOrders();this.renderCoach();this.renderMarketPrices();this.updateAccountStrip();},

    renderHome(){
      if(!window.TradeSimTrading)return;
      const t=TradeSimTrading, value=t.getPortfolioValue(), pnl=t.getTotalPnl();
      this.setText("portfolioValue",this.money(value));this.setText("cashValue",this.money(t.getCash()));this.setText("homePnl",this.money(pnl));this.setText("tradeCount",t.getState().orders.length);
      const pct=(pnl/STARTING_CASH*100).toFixed(2), el=document.getElementById("totalPnl");if(el){el.textContent=(pnl>=0?"+":"")+this.money(pnl)+` (${pct}%)`;el.className=pnl>=0?"pnl":"loss";}
      const wl=document.getElementById("watchlist");if(wl)wl.innerHTML=Object.values(TradeSimMarket.assets).slice(0,6).map(a=>this.assetHTML(a)).join("");
    },

    renderMarkets(){
      const box=document.getElementById("marketList");if(!box||!window.TradeSimMarket)return;
      let list=Object.values(TradeSimMarket.assets).filter(a=>!this.searchText||a.symbol.includes(this.searchText)||a.name.toUpperCase().includes(this.searchText));
      if(this.filter==="STOCK")list=list.filter(a=>a.type==="STOCK");if(this.filter==="CRYPTO")list=list.filter(a=>a.type==="CRYPTO");
      if(this.filter==="GAINERS")list=list.filter(a=>a.change>0).sort((a,b)=>b.change-a.change);if(this.filter==="LOSERS")list=list.filter(a=>a.change<0).sort((a,b)=>a.change-b.change);
      box.innerHTML=list.length?list.map(a=>this.assetHTML(a)).join(""):"<div class=\"empty\">No instruments found.</div>";
    },

    assetHTML(a){
      const up=a.change>=0;return `<div class="asset"><div class="asset-top"><div><div class="symbol">${a.symbol}</div><div class="asset-name">${a.name} • ${a.type}</div></div><div class="price"><div class="price-value">${this.money(a.price)}</div><div class="change ${up?"pnl":"loss"}">${up?"+":""}${a.change.toFixed(2)}%</div></div></div><div class="trade-buttons"><button class="chart-btn" onclick="TradeSimApp.openChart('${a.symbol}')">CHART</button><button class="buy" onclick="TradeSimApp.openTrade('${a.symbol}','BUY')">BUY</button><button class="sell" onclick="TradeSimApp.openTrade('${a.symbol}','SELL')">SELL</button></div></div>`;
    },

    renderPortfolio(){
      const box=document.getElementById("positions");if(!box||!window.TradeSimTrading)return;const pos=TradeSimTrading.getPositions();const keys=Object.keys(pos);
      if(!keys.length){box.innerHTML='<div class="empty">No open positions.<br><br>Open a paper trade from Markets.</div>';return;}
      box.innerHTML=keys.map(s=>{const p=pos[s],a=TradeSimMarket.getAsset(s),v=p.quantity*a.price,inv=p.quantity*p.averagePrice,pnl=v-inv;return `<div class="card"><div class="row"><div><div class="symbol">${s}</div><div class="asset-name">${a.name}</div></div><b class="${pnl>=0?"pnl":"loss"}">${this.money(pnl)}</b></div><div class="small">Qty: ${p.quantity}<br>Avg: ${this.money(p.averagePrice)}<br>Last: ${this.money(a.price)}<br>Value: ${this.money(v)}</div><div class="trade-buttons"><button class="sell" onclick="TradeSimApp.openTrade('${s}','SELL')">SELL</button><button class="chart-btn" onclick="TradeSimApp.openChart('${s}')">CHART</button></div></div>`;}).join("");
    },

    renderOrders(){
      const box=document.getElementById("orderHistory");if(!box||!window.TradeSimTrading)return;const orders=TradeSimTrading.getState().orders;if(!orders.length){box.innerHTML='<div class="empty">No orders yet.</div>';return;}
      box.innerHTML=orders.map(o=>`<div class="order"><div class="row"><b>${o.side} ${o.symbol}</b><span class="${o.side==="BUY"?"pnl":"loss"}">${o.status||"FILLED"}</span></div><div class="small">${new Date(o.date).toLocaleString()}<br>Qty: ${o.quantity} • Price: ${this.money(o.price)}<br>Value: ${this.money(o.value)}${o.stopLoss!=null?"<br>SL: "+this.money(o.stopLoss):""}${o.target!=null?"<br>Target: "+this.money(o.target):""}</div></div>`).join("");
    },

    renderCoach(){const box=document.getElementById("coachMessage");if(!box||!window.TradeSimTrading)return;const t=TradeSimTrading,orders=t.getState().orders,pos=t.getPositions();if(!orders.length){box.textContent="No trades yet. Build a plan, define risk and use the paper account to test it.";return;}const exposure=Object.keys(pos).reduce((x,s)=>x+pos[s].quantity*TradeSimMarket.getPrice(s),0);box.textContent=exposure>STARTING_CASH*.5?"High exposure: more than 50% of starting capital is deployed.":t.getTotalPnl()<0?"The simulated account is below start. Review sizing and exits.":"Good discipline: keep position sizing and predefined exits consistent.";},

    renderMarketPrices(){if(this.currentPage==="markets")this.renderMarkets();},

    updateChartHeader(){const a=TradeSimMarket&&TradeSimMarket.getAsset(this.currentSymbol);if(!a)return;this.setText("chartPrice",this.money(a.price));const c=document.getElementById("chartChange");if(c){c.textContent=(a.change>=0?"+":"")+a.change.toFixed(2)+"%";c.className=a.change>=0?"pnl":"loss";}this.updateAccountStrip();},

    updateAccountStrip(){const s=document.getElementById("ts-account-strip");if(!s||!window.TradeSimTrading)return;const t=TradeSimTrading,pos=t.getPositions();let open=0;Object.keys(pos).forEach(k=>open+=(pos[k].quantity*TradeSimMarket.getPrice(k))-(pos[k].quantity*pos[k].averagePrice));this.setText("tsEq",this.money(t.getPortfolioValue()));this.setText("tsCash",this.money(t.getCash()));this.setText("tsOpen",this.money(open));this.setText("tsPos",Object.keys(pos).length);},

    setText(id,v){const e=document.getElementById(id);if(e)e.textContent=v;},
    money(n){return "₹"+Number(n||0).toLocaleString("en-IN",{maximumFractionDigits:2});}
  };

  window.TradeSimApp=App;
  window.showPage=(p,b)=>App.showPage(p,b);
  window.openChart=s=>App.openChart(s);
  window.openTrade=(s,side)=>App.openTrade(s,side);
  window.closeTrade=()=>App.closeTrade();
  window.setChartInterval=(i,b)=>App.setChartInterval(i,b);

  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",()=>App.init());else App.init();
})();
