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

/* Positions / Trades UI */
const positionsPanel = document.getElementById('positionsPanel');
const positionsToggleBtn = document.getElementById('positionsToggleBtn');
const positionsList = document.getElementById('positionsList');
const closedTradesList = document.getElementById('closedTradesList');

/* Order Modal */
const orderModalOverlay = document.getElementById('orderModalOverlay');
const orderModalTitle = document.getElementById('orderModalTitle');
const orderConfirmBtn = document.getElementById('orderConfirmBtn');
const orderCancelBtn = document.getElementById('orderCancelBtn');

const buyOrderSection = document.getElementById('buyOrderSection');
const sellOrderSection = document.getElementById('sellOrderSection');

/* Buy Elements */
const buyBtn = document.getElementById('buyBtn');
const usdSlider = document.getElementById('usdSlider');
const usdValueLabel = document.getElementById('usdValueLabel');
const calculatedBtcLabel = document.getElementById('calculatedBtcLabel');

/* Sell Elements */
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
    const { 
      market_cap_calc,
      market_cap_diluted_calc,
      total_shares_outstanding
    } = dataA;

    // Calculate Price
    if (market_cap_calc && total_shares_outstanding) {
      currentBtcPrice = market_cap_calc / total_shares_outstanding;
    } else {
      currentBtcPrice = 0;
    }

    btcPriceEl.textContent = currentBtcPrice > 0
      ? `$${currentBtcPrice.toFixed(2)}`
      : "N/A";

    // Market Cap
    if (market_cap_calc) {
      if (market_cap_calc >= 1e9) {
        let capVal = (market_cap_calc / 1e9).toFixed(2);
        mktCapEl.textContent = `$${capVal}B`;
      } else {
        mktCapEl.textContent = `$${(market_cap_calc/1e6).toFixed(2)}M`;
      }
    } else {
      mktCapEl.textContent = "N/A";
    }

    // Diluted Cap
    if (market_cap_diluted_calc) {
      if (market_cap_diluted_calc >= 1e9) {
        let dcapVal = (market_cap_diluted_calc / 1e9).toFixed(2);
        mktCapDilutedEl.textContent = `$${dcapVal}B`;
      } else {
        mktCapDilutedEl.textContent = `$${(market_cap_diluted_calc/1e6).toFixed(2)}M`;
      }
    } else {
      mktCapDilutedEl.textContent = "N/A";
    }

    // 2) Performance: Perf.W, Perf.1M, Perf.Y
    const respB = await fetch(endpointB);
    const dataB = await respB.json();
    const {
      ["Perf.W"]: perfW,
      ["Perf.1M"]: perfM,
      ["Perf.Y"]: perfY
    } = dataB;

    // Update 1W
    if (typeof perfW === 'number') {
      // Example: perfW = -3.56 => display "-3.56%"
      perf1WEl.textContent = (perfW > 0 ? `+${perfW.toFixed(2)}%` : `${perfW.toFixed(2)}%`);
      if (perfW > 0) {
        perf1WEl.classList.add('ds-change-perc-pos');
        perf1WEl.classList.remove('ds-change-perc-neg');
      } else {
        perf1WEl.classList.add('ds-change-perc-neg');
        perf1WEl.classList.remove('ds-change-perc-pos');
      }
    }
    // Update 1M
    if (typeof perfM === 'number') {
      perf1MEl.textContent = (perfM > 0 ? `+${perfM.toFixed(2)}%` : `${perfM.toFixed(2)}%`);
      if (perfM > 0) {
        perf1MEl.classList.add('ds-change-perc-pos');
        perf1MEl.classList.remove('ds-change-perc-neg');
      } else {
        perf1MEl.classList.add('ds-change-perc-neg');
        perf1MEl.classList.remove('ds-change-perc-pos');
      }
    }
    // Update 1Y
    if (typeof perfY === 'number') {
      perf1YEl.textContent = (perfY > 0 ? `+${perfY.toFixed(2)}%` : `${perfY.toFixed(2)}%`);
      if (perfY > 0) {
        perf1YEl.classList.add('ds-change-perc-pos');
        perf1YEl.classList.remove('ds-change-perc-neg');
      } else {
        perf1YEl.classList.add('ds-change-perc-neg');
        perf1YEl.classList.remove('ds-change-perc-pos');
      }
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

/* ========== PnL CALCULATION ========== */
function recalcPositionPnL() {
  openPositions.forEach(pos => {
    // PnL for a long: (current - entry) * size
    const costBasis = pos.entryPrice * pos.size;
    pos.unrealizedPnl = (currentBtcPrice - pos.entryPrice) * pos.size;
    pos.pnlPercent = costBasis > 0
      ? (pos.unrealizedPnl / costBasis) * 100
      : 0;
  });
  renderPositions();
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

  // Slider max = user wallet
  usdSlider.max = userWallet.toString();
  usdSlider.value = "1000";
  usdValueLabel.textContent = `$1000`;
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

/* BUY ORDER */
usdSlider.addEventListener('input', () => {
  usdValueLabel.textContent = `$${usdSlider.value}`;
  recalcBuyBtc();
});
function recalcBuyBtc() {
  const usdVal = parseFloat(usdSlider.value) || 0;
  if (!currentBtcPrice || currentBtcPrice <= 0) {
    calculatedBtcLabel.textContent = "Err Price";
    return;
  }
  const btcQty = usdVal / currentBtcPrice;
  calculatedBtcLabel.textContent = btcQty.toFixed(4) + " BTC";
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
  // Deduct from wallet
  userWallet -= usdVal;
  updateWalletDisplay();

  const sizeBtc = usdVal / currentBtcPrice;
  const newPos = {
    id: positionIdCounter++,
    side: 'LONG',
    size: sizeBtc,
    entryPrice: currentBtcPrice,
    unrealizedPnl: 0,
    pnlPercent: 0
  };
  openPositions.push(newPos);
  renderPositions();
  saveToLocalStorage();
}

/* SELL ORDER */
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
  const amountClose = pos.size * fraction; 
  const closePrice = currentBtcPrice;
  // Realized PnL for fraction
  const partialPnL = (closePrice - pos.entryPrice) * amountClose;
  // Add to wallet
  const usdGain = closePrice * amountClose;
  userWallet += usdGain;
  updateWalletDisplay();

  pos.size -= amountClose;
  if (pos.size <= 0.00001) {
    // fully closed => push to closedTrades
    const finalPnL = (closePrice - pos.entryPrice) * (pos.size + amountClose);
    closedTrades.push({
      id: pos.id,
      side: pos.side,
      entryPrice: pos.entryPrice,
      closePrice,
      size: pos.size + amountClose,
      realizedPnL: finalPnL
    });
    openPositions.splice(idx, 1);
  }
  renderPositions();
  renderClosedTrades();
  saveToLocalStorage();
}

/* Quick partial close from positions panel */
function partialClose(posId, pct) {
  const idx = openPositions.findIndex(p => p.id === posId);
  if (idx === -1) return;
  const pos = openPositions[idx];
  const fraction = pct / 100;
  const amountClose = pos.size * fraction;
  const closePrice = currentBtcPrice;
  // Realized PnL
  const partialPnL = (closePrice - pos.entryPrice) * amountClose;
  // Add to wallet
  const usdGain = closePrice * amountClose;
  userWallet += usdGain;
  updateWalletDisplay();

  pos.size -= amountClose;
  if (pos.size <= 0.00001) {
    // fully closed
    const finalPnL = (closePrice - pos.entryPrice) * (pos.size + amountClose);
    closedTrades.push({
      id: pos.id,
      side: pos.side,
      entryPrice: pos.entryPrice,
      closePrice,
      size: pos.size + amountClose,
      realizedPnL: finalPnL
    });
    openPositions.splice(idx, 1);
  }
  renderPositions();
  renderClosedTrades();
  saveToLocalStorage();
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
          #${pos.id} - ${pos.side}<br>
          Size: ${pos.size.toFixed(4)} BTC<br>
          Entry: $${pos.entryPrice.toFixed(2)}<br>
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
