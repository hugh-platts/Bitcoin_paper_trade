/* ========== USER WALLET & LOCALSTORAGE ========== */
let userWallet = 500000;

// We'll store open positions, closed trades in arrays
let openPositions = [];
let closedTrades = [];
let positionIdCounter = 1;

// Attempt to load from localStorage
function loadFromLocalStorage() {
  const savedWallet = localStorage.getItem('userWallet');
  if (savedWallet) {
    userWallet = parseFloat(savedWallet);
  }
  const savedPositions = localStorage.getItem('openPositions');
  if (savedPositions) {
    openPositions = JSON.parse(savedPositions);
  }
  const savedClosed = localStorage.getItem('closedTrades');
  if (savedClosed) {
    closedTrades = JSON.parse(savedClosed);
  }
  const savedCounter = localStorage.getItem('positionIdCounter');
  if (savedCounter) {
    positionIdCounter = parseInt(savedCounter, 10);
  }
}

function saveToLocalStorage() {
  localStorage.setItem('userWallet', userWallet.toString());
  localStorage.setItem('openPositions', JSON.stringify(openPositions));
  localStorage.setItem('closedTrades', JSON.stringify(closedTrades));
  localStorage.setItem('positionIdCounter', positionIdCounter.toString());
}

loadFromLocalStorage();

/* ========== DOM ELEMENTS ========== */
const walletEl = document.getElementById('walletEl');
const btcPriceEl = document.getElementById('btcPriceEl');
const mktCapEl = document.getElementById('mktCapEl');
const mktCapDilutedEl = document.getElementById('mktCapDilutedEl');

/* For 1W, 1M, 1Y stats */
const perf1WEl = document.getElementById('perf1WEl');
const perf1MEl = document.getElementById('perf1MEl');
const perf1YEl = document.getElementById('perf1YEl');

const positionsPanel = document.getElementById('positionsPanel');
const positionsToggleBtn = document.getElementById('positionsToggleBtn');
const positionsList = document.getElementById('positionsList');
const closedTradesList = document.getElementById('closedTradesList');

const orderModalOverlay = document.getElementById('orderModalOverlay');
const orderModalTitle = document.getElementById('orderModalTitle');
const orderConfirmBtn = document.getElementById('orderConfirmBtn');
const orderCancelBtn = document.getElementById('orderCancelBtn');

const buyOrderSection = document.getElementById('buyOrderSection');
const sellOrderSection = document.getElementById('sellOrderSection');

const buyBtn = document.getElementById('buyBtn');
const usdSlider = document.getElementById('usdSlider');
const usdValueLabel = document.getElementById('usdValueLabel');
const calculatedBtcLabel = document.getElementById('calculatedBtcLabel');

/* Leverage Elements */
const levSlider = document.getElementById('levSlider');
const levValueLabel = document.getElementById('levValueLabel');

const sellBtn = document.getElementById('sellBtn');
const sellPercentSlider = document.getElementById('sellPercentSlider');
const sellPercentLabel = document.getElementById('sellPercentLabel');

/* ========== INITIALIZE UI ========== */
function updateWalletDisplay() {
  walletEl.textContent = `$${userWallet.toLocaleString()}`;
}
updateWalletDisplay();

/* ========== FETCH BTC PRICE & PERFORMANCE ========== */
const endpointA = "https://scanner.tradingview.com/symbol?symbol=BITSTAMP%3ABTCUSD&fields=market_cap_calc%2Cmarket_cap_diluted_calc%2Ctotal_shares_outstanding%2Ctotal_value_traded%2C24h_vol_to_market_cap&no_404=true&label-product=right-details";
const endpointB = "https://scanner.tradingview.com/symbol?symbol=BITSTAMP%3ABTCUSD&fields=Perf.W%2CPerf.1M%2CPerf.Y&no_404=true&label-product=right-details";

let currentBtcPrice = 0;

async function fetchBtcData() {
  try {
    // 1) Market cap + price
    const respA = await fetch(endpointA);
    const dataA = await respA.json();
    const { market_cap_calc, market_cap_diluted_calc, total_shares_outstanding } = dataA;

    // Calculate Price
    if (market_cap_calc && total_shares_outstanding) {
      currentBtcPrice = market_cap_calc / total_shares_outstanding;
    } else {
      currentBtcPrice = 0;
    }

    // Update DOM
    btcPriceEl.textContent = currentBtcPrice > 0 ? `$${currentBtcPrice.toFixed(2)}` : "N/A";
    if (market_cap_calc) {
      if (market_cap_calc >= 1e9) {
        mktCapEl.textContent = `$${(market_cap_calc / 1e9).toFixed(2)}B`;
      } else {
        mktCapEl.textContent = `$${(market_cap_calc / 1e6).toFixed(2)}M`;
      }
    } else {
      mktCapEl.textContent = "N/A";
    }

    if (market_cap_diluted_calc) {
      if (market_cap_diluted_calc >= 1e9) {
        mktCapDilutedEl.textContent = `$${(market_cap_diluted_calc / 1e9).toFixed(2)}B`;
      } else {
        mktCapDilutedEl.textContent = `$${(market_cap_diluted_calc / 1e6).toFixed(2)}M`;
      }
    } else {
      mktCapDilutedEl.textContent = "N/A";
    }

    // 2) Performance
    const respB = await fetch(endpointB);
    const dataB = await respB.json();
    const { ["Perf.W"]: perfW, ["Perf.1M"]: perfM, ["Perf.Y"]: perfY } = dataB;

    if (typeof perfW === 'number') {
      perf1WEl.textContent = (perfW > 0 ? `+${perfW.toFixed(2)}%` : `${perfW.toFixed(2)}%`);
      perf1WEl.classList.toggle('ds-change-perc-pos', perfW > 0);
      perf1WEl.classList.toggle('ds-change-perc-neg', perfW <= 0);
    }
    if (typeof perfM === 'number') {
      perf1MEl.textContent = (perfM > 0 ? `+${perfM.toFixed(2)}%` : `${perfM.toFixed(2)}%`);
      perf1MEl.classList.toggle('ds-change-perc-pos', perfM > 0);
      perf1MEl.classList.toggle('ds-change-perc-neg', perfM <= 0);
    }
    if (typeof perfY === 'number') {
      perf1YEl.textContent = (perfY > 0 ? `+${perfY.toFixed(2)}%` : `${perfY.toFixed(2)}%`);
      perf1YEl.classList.toggle('ds-change-perc-pos', perfY > 0);
      perf1YEl.classList.toggle('ds-change-perc-neg', perfY <= 0);
    }

  } catch (err) {
    console.error("Error fetching data:", err);
    btcPriceEl.textContent = "Err";
    mktCapEl.textContent = "Err";
    mktCapDilutedEl.textContent = "Err";
  }
}

// Update price & PnL every 3s
setInterval(async () => {
  await fetchBtcData();
  recalcPositionPnL();
}, 3000);

// Immediate fetch on load
fetchBtcData();

/* ========== TOGGLE POSITIONS PANEL ========== */
positionsToggleBtn.addEventListener('click', () => {
  positionsPanel.style.display = positionsPanel.style.display === 'block'
    ? 'none'
    : 'block';
});

/* ========== PnL CALCULATION & LIQUIDATION CHECK ========== */
function recalcPositionPnL() {
  openPositions.forEach(pos => {
    // Unrealized PnL for a long
    pos.unrealizedPnl = (currentBtcPrice - pos.entryPrice) * pos.size;
    // PnL % based on margin
    pos.pnlPercent = pos.margin > 0 ? (pos.unrealizedPnl / pos.margin) * 100 : 0;

    // Liquidation check: if user lost >= margin, position is liquidated.
    if (pos.unrealizedPnl <= -pos.margin) {
      closedTrades.push({
        id: pos.id,
        side: pos.side,
        entryPrice: pos.entryPrice,
        closePrice: currentBtcPrice,
        size: pos.size,
        realizedPnL: -pos.margin
      });
      alert(`Position #${pos.id} liquidated! You lost your $${pos.margin} margin.`);
      openPositions = openPositions.filter(p => p.id !== pos.id);
    }
  });

  renderPositions();
  renderClosedTrades();
  saveToLocalStorage();
}

/* ========== BUY/SELL MODAL LOGIC ========== */
let currentOrderSide = null;
let currentSellPosId = null;

// Show BUY modal
buyBtn.addEventListener('click', () => {
  currentOrderSide = 'BUY';
  orderModalTitle.textContent = "Buy BTC";
  buyOrderSection.style.display = 'block';
  sellOrderSection.style.display = 'none';

  // Set sliders
  usdSlider.max = userWallet.toString();
  usdSlider.value = "1000";
  usdValueLabel.textContent = `$1000`;
  levSlider.value = "1";
  levValueLabel.textContent = "1x";

  recalcBuyBtc();
  orderModalOverlay.style.display = 'flex';
});

// Show SELL modal
sellBtn.addEventListener('click', () => {
  if (openPositions.length === 0) {
    alert("No open positions to sell.");
    return;
  }
  currentOrderSide = 'SELL';
  currentSellPosId = openPositions[openPositions.length - 1].id;
  orderModalTitle.textContent = "Sell BTC";
  buyOrderSection.style.display = 'none';
  sellOrderSection.style.display = 'block';
  orderModalOverlay.style.display = 'flex';
});

// Cancel
orderCancelBtn.addEventListener('click', () => {
  orderModalOverlay.style.display = 'none';
});

// Confirm
orderConfirmBtn.addEventListener('click', () => {
  if (currentOrderSide === 'BUY') {
    const usdVal = parseFloat(usdSlider.value) || 0;
    placeBuyOrder(usdVal);
  } else if (currentOrderSide === 'SELL') {
    const fraction = parseFloat(sellPercentSlider.value) / 100;
    placeSellOrder(fraction);
  }
  orderModalOverlay.style.display = 'none';
  saveToLocalStorage();
});

/* ========== BUY ORDER LOGIC WITH LEVERAGE ========== */
// Sliders
usdSlider.addEventListener('input', () => {
  usdValueLabel.textContent = `$${usdSlider.value}`;
  recalcBuyBtc();
});
levSlider.addEventListener('input', () => {
  levValueLabel.textContent = levSlider.value + 'x';
  recalcBuyBtc();
});

function recalcBuyBtc() {
  const usdVal = parseFloat(usdSlider.value) || 0;
  const lev = parseInt(levSlider.value) || 1;
  usdValueLabel.textContent = `$${usdVal}`;
  levValueLabel.textContent = lev + 'x';

  if (!currentBtcPrice || currentBtcPrice <= 0) {
    calculatedBtcLabel.textContent = "Err Price";
    return;
  }
  const notional = usdVal * lev;
  const sizeBtc = notional / currentBtcPrice;
  calculatedBtcLabel.textContent = sizeBtc.toFixed(4) + " BTC";
}

function placeBuyOrder(usdVal) {
  if (usdVal > userWallet) {
    alert("Not enough wallet balance.");
    return;
  }
  if (currentBtcPrice <= 0) {
    alert("BTC Price unavailable.");
    return;
  }

  const lev = parseInt(levSlider.value, 10) || 1;
  // Deduct margin from wallet
  userWallet -= usdVal;
  updateWalletDisplay();

  const notional = usdVal * lev;
  const sizeBtc = notional / currentBtcPrice;

  // Liquidation price for a long position
  let liqPrice = null;
  if (lev > 1) {
    liqPrice = currentBtcPrice * (1 - (1 / lev));
  }

  const newPos = {
    id: positionIdCounter++,
    side: 'LONG',
    margin: usdVal,       // user’s margin
    leverage: lev,
    notional: notional,   // margin * leverage
    size: sizeBtc,
    entryPrice: currentBtcPrice,
    unrealizedPnl: 0,
    pnlPercent: 0,
    liquidationPrice: liqPrice
  };

  openPositions.push(newPos);
  renderPositions();
  saveToLocalStorage();
}

/* ========== SELL ORDER LOGIC (FRACTIONAL CLOSE) ========== */
sellPercentSlider.addEventListener('input', () => {
  sellPercentLabel.textContent = sellPercentSlider.value + "%";
});

function placeSellOrder(fraction) {
  const idx = openPositions.findIndex(p => p.id === currentSellPosId);
  if (idx === -1) {
    alert("Position not found.");
    return;
  }
  const pos = openPositions[idx];

  // fraction of size to close
  const amountClose = pos.size * fraction;
  // fraction of margin to release
  const fractionMargin = pos.margin * fraction;

  // partial PnL for that fraction
  const closePrice = currentBtcPrice;
  const partialPnl = (closePrice - pos.entryPrice) * amountClose;

  // Return fractionMargin + partialPnl to user
  userWallet += (fractionMargin + partialPnl);
  updateWalletDisplay();

  // Reduce the position's size and margin
  pos.size -= amountClose;
  pos.margin -= fractionMargin;

  // If the entire position is closed (or nearly zero)
  if (pos.size <= 0.00001) {
    // Realize final PnL => For the fraction just closed + any leftover tiny fraction
    // But effectively we already added fractionMargin + partialPnl
    // We'll record it in the closed trades with the entire size
    const totalCloseSize = pos.size + amountClose;
    const finalPnL = partialPnl; // or partial + leftover, but leftover is negligible

    closedTrades.push({
      id: pos.id,
      side: pos.side,
      entryPrice: pos.entryPrice,
      closePrice,
      size: totalCloseSize,
      realizedPnL: finalPnL
    });
    // Remove the position
    openPositions.splice(idx, 1);
  }
  renderPositions();
  renderClosedTrades();
  saveToLocalStorage();
}

/* Quick partial close from positions panel => same logic as placeSellOrder but with fixed fraction. */
function partialClose(posId, pct) {
  const idx = openPositions.findIndex(p => p.id === posId);
  if (idx === -1) return;
  const fraction = pct / 100;
  currentSellPosId = posId; // so placeSellOrder can find it
  placeSellOrder(fraction);
}
window.partialClose = partialClose; // Expose globally

/* ========== RENDER FUNCTIONS ========== */
function renderPositions() {
  if (openPositions.length === 0) {
    positionsList.innerHTML = `<p>No open positions.</p>`;
    return;
  }
  let html = '';
  openPositions.forEach(pos => {
    const color = pos.unrealizedPnl >= 0 ? '#4caf50' : '#f44336';
    const pnlVal = pos.unrealizedPnl.toFixed(2);
    const pnlPct = pos.pnlPercent.toFixed(2) + '%';
    html += `
      <div style="margin-bottom:10px;">
        <p>
          #${pos.id} - ${pos.side} (x${pos.leverage})<br>
          Margin: $${pos.margin.toFixed(2)}<br>
          Size: ${pos.size.toFixed(4)} BTC<br>
          Entry: $${pos.entryPrice.toFixed(2)}<br>
          Liquidation: ${pos.liquidationPrice ? `$${pos.liquidationPrice.toFixed(2)}` : 'N/A'}<br>
          PnL: <span style="color:${color};">
            $${pnlVal} (${pnlPct})
          </span>
        </p>
        <div class="position-actions">
          <button onclick="partialClose(${pos.id}, 25)">Close 25%</button>
          <button onclick="partialClose(${pos.id}, 50)">Close 50%</button>
          <button onclick="partialClose(${pos.id}, 100)">Close 100%</button>
        </div>
      </div>
    `;
  });
  positionsList.innerHTML = html;
}

function renderClosedTrades() {
  if (closedTrades.length === 0) {
    closedTradesList.innerHTML = `<p>No closed trades.</p>`;
    return;
  }
  let html = '';
  closedTrades.forEach(trade => {
    const finalPnl = trade.realizedPnL.toFixed(2);
    const color = trade.realizedPnL >= 0 ? '#4caf50' : '#f44336';
    html += `
      <div style="margin-bottom:10px;">
        <p>
          #${trade.id} - ${trade.side}<br>
          Size: ${trade.size.toFixed(4)} BTC<br>
          Entry: $${trade.entryPrice.toFixed(2)}<br>
          Close: $${trade.closePrice.toFixed(2)}<br>
          PnL: <span style="color:${color};">$${finalPnl}</span>
        </p>
      </div>
    `;
  });
  closedTradesList.innerHTML = html;
}

/* ========== INITIAL RENDER ========== */
renderPositions();
renderClosedTrades();
