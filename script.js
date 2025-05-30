document.addEventListener('DOMContentLoaded', () => {
    // --- Datos Iniciales y Configuración ---
    let cashBalance = 10000; // Saldo inicial en USD
    let portfolio = {}; // Objeto para guardar las criptomonedas del usuario
    const COP_TO_USD_RATE = 3900; // Tasa de cambio simulada: 1 USD = 3900 COP

    const initialCryptoPrices = {
        BTC: 60000, // Bitcoin
        ETH: 3000,  // Ethereum
        SOL: 150,   // Solana
        XRP: 0.5,   // Ripple
        ADA: 0.45   // Cardano
    };

    let cryptoData = { ...initialCryptoPrices }; // Copia para manipular los precios
    const priceFluctuation = 0.01; // +/- 1% de fluctuación simulada

    // --- Elementos del DOM ---
    const cashBalanceEl = document.getElementById('cashBalance');
    const portfolioValueEl = document.getElementById('portfolioValue');
    const cryptoCardsContainer = document.getElementById('cryptoCardsContainer');
    const myHoldingsContainer = document.getElementById('myHoldingsContainer');
    const noHoldingsMessage = document.getElementById('noHoldingsMessage');

    // Modal de Compra/Venta
    const transactionModal = document.getElementById('transactionModal');
    const closeButton = document.querySelector('.modal .close-button'); // Asegurarse de seleccionar el del primer modal
    const modalTitle = document.getElementById('modalTitle');
    const modalPrice = document.getElementById('modalPrice');
    const quantityInput = document.getElementById('quantityInput');
    const transactionCostEl = document.getElementById('transactionCost');
    const confirmTransactionBtn = document.getElementById('confirmTransactionBtn');
    const errorMessage = document.getElementById('errorMessage');

    // Modal de Depósito PSE
    const openPseDepositModalBtn = document.getElementById('openPseDepositModal');
    const pseDepositModal = document.getElementById('pseDepositModal');
    const closePseDepositModalBtn = document.getElementById('closePseDepositModal');
    const copAmountInput = document.getElementById('copAmountInput');
    const depositCryptoSelect = document.getElementById('depositCryptoSelect');
    const estimatedCryptoReceiveEl = document.getElementById('estimatedCryptoReceive');
    const confirmPseDepositBtn = document.getElementById('confirmPseDepositBtn');
    const depositErrorMessage = document.getElementById('depositErrorMessage');

    let currentCryptoSymbol = null; // Criptomoneda seleccionada en el modal de transacción
    let currentOperationType = null; // 'buy' o 'sell'

    // --- Funciones de Utilidad ---

    function formatCurrencyUSD(value) {
        return `$ ${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }

    function formatCurrencyCOP(value) {
        return `$ ${value.toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`; // Formato COP
    }

    // --- Funciones de Actualización de UI ---

    function updateBalances() {
        cashBalanceEl.textContent = formatCurrencyUSD(cashBalance);

        let totalPortfolioValue = 0;
        for (const symbol in portfolio) {
            if (portfolio[symbol] > 0) {
                totalPortfolioValue += portfolio[symbol] * cryptoData[symbol];
            }
        }
        portfolioValueEl.textContent = formatCurrencyUSD(totalPortfolioValue);
    }

    function renderCryptoCards() {
        cryptoCardsContainer.innerHTML = '';
        for (const symbol in cryptoData) {
            const card = document.createElement('div');
            card.classList.add('crypto-card');
            card.innerHTML = `
                <h4>${symbol}</h4>
                <p class="price">${formatCurrencyUSD(cryptoData[symbol])}</p>
                <div class="actions">
                    <button class="buy-btn" data-symbol="${symbol}">Comprar</button>
                    <button class="sell-btn" data-symbol="${symbol}">Vender</button>
                </div>
            `;
            cryptoCardsContainer.appendChild(card);
        }
    }

    function renderMyHoldings() {
        myHoldingsContainer.innerHTML = '';
        let hasHoldings = false;
        for (const symbol in portfolio) {
            if (portfolio[symbol] > 0) {
                hasHoldings = true;
                const card = document.createElement('div');
                card.classList.add('crypto-card');
                const currentValue = portfolio[symbol] * cryptoData[symbol];
                card.innerHTML = `
                    <h4>${symbol}</h4>
                    <p class="holdings-info">Tienes: <strong>${portfolio[symbol].toFixed(6)}</strong> ${symbol}</p>
                    <p class="holdings-info">Valor Actual: <strong>${formatCurrencyUSD(currentValue)}</strong></p>
                    <div class="actions">
                        <button class="buy-btn" data-symbol="${symbol}">Comprar Más</button>
                        <button class="sell-btn" data-symbol="${symbol}">Vender</button>
                    </div>
                `;
                myHoldingsContainer.appendChild(card);
            }
        }
        if (!hasHoldings) {
            myHoldingsContainer.appendChild(noHoldingsMessage);
            noHoldingsMessage.style.display = 'block';
        } else {
            noHoldingsMessage.style.display = 'none';
        }
    }

    function populateDepositCryptoSelect() {
        depositCryptoSelect.innerHTML = '';
        for (const symbol in cryptoData) {
            const option = document.createElement('option');
            option.value = symbol;
            option.textContent = symbol;
            depositCryptoSelect.appendChild(option);
        }
    }

    // --- Funciones del Modal de Transacción (Compra/Venta) ---

    function openTransactionModal(symbol, type) {
        currentCryptoSymbol = symbol;
        currentOperationType = type;
        const price = cryptoData[symbol];

        modalTitle.textContent = `${type === 'buy' ? 'Comprar' : 'Vender'} ${symbol}`;
        modalPrice.textContent = `${formatCurrencyUSD(price)}`;
        confirmTransactionBtn.textContent = type === 'buy' ? 'Confirmar Compra' : 'Confirmar Venta';
        confirmTransactionBtn.classList.remove('buy', 'sell');
        confirmTransactionBtn.classList.add(type);
        quantityInput.value = '';
        transactionCostEl.textContent = `Costo/Ganancia Estimada: ${formatCurrencyUSD(0)}`;
        errorMessage.textContent = '';

        transactionModal.style.display = 'flex';
    }

    function closeTransactionModal() {
        transactionModal.style.display = 'none';
    }

    function calculateTransactionCostOrGain() {
        const quantity = parseFloat(quantityInput.value);
        if (isNaN(quantity) || quantity <= 0) {
            transactionCostEl.textContent = `Costo/Ganancia Estimada: ${formatCurrencyUSD(0)}`;
            return;
        }
        const price = cryptoData[currentCryptoSymbol];
        const estimatedAmount = quantity * price;

        if (currentOperationType === 'buy') {
            transactionCostEl.textContent = `Costo Estimado: ${formatCurrencyUSD(estimatedAmount)}`;
        } else { // sell
            transactionCostEl.textContent = `Ganancia Estimada: ${formatCurrencyUSD(estimatedAmount)}`;
        }
    }

    function confirmTransaction() {
        const quantity = parseFloat(quantityInput.value);
        const price = cryptoData[currentCryptoSymbol];
        const amountUSD = quantity * price;

        errorMessage.textContent = '';

        if (isNaN(quantity) || quantity <= 0) {
            errorMessage.textContent = 'Por favor, ingresa una cantidad válida.';
            return;
        }

        if (currentOperationType === 'buy') {
            if (cashBalance >= amountUSD) {
                cashBalance -= amountUSD;
                portfolio[currentCryptoSymbol] = (portfolio[currentCryptoSymbol] || 0) + quantity;
                updateBalances();
                renderMyHoldings();
                closeTransactionModal();
            } else {
                errorMessage.textContent = 'Fondos insuficientes para esta compra.';
            }
        } else { // sell
            if ((portfolio[currentCryptoSymbol] || 0) >= quantity) {
                cashBalance += amountUSD;
                portfolio[currentCryptoSymbol] -= quantity;
                if (portfolio[currentCryptoSymbol] < 0.00000001) { // Eliminar si la cantidad es insignificante
                    delete portfolio[currentCryptoSymbol];
                }
                updateBalances();
                renderMyHoldings();
                closeTransactionModal();
            } else {
                errorMessage.textContent = `No tienes suficientes ${currentCryptoSymbol} para vender.`;
            }
        }
    }

    // --- Funciones del Modal de Depósito PSE ---

    function openPseDepositModal() {
        populateDepositCryptoSelect();
        copAmountInput.value = '';
        estimatedCryptoReceiveEl.textContent = `0.00`;
        depositErrorMessage.textContent = '';
        pseDepositModal.style.display = 'flex';
    }

    function closePseDepositModal() {
        pseDepositModal.style.display = 'none';
    }

    function calculateEstimatedCryptoReceive() {
        const copAmount = parseFloat(copAmountInput.value);
        const selectedCrypto = depositCryptoSelect.value;
        const cryptoPriceUSD = cryptoData[selectedCrypto];

        if (isNaN(copAmount) || copAmount <= 0 || !selectedCrypto || !cryptoPriceUSD) {
            estimatedCryptoReceiveEl.textContent = `0.00`;
            return;
        }

        const usdAmount = copAmount / COP_TO_USD_RATE;
        const cryptoAmount = usdAmount / cryptoPriceUSD;
        estimatedCryptoReceiveEl.textContent = `${cryptoAmount.toFixed(6)} ${selectedCrypto}`;
    }

    function confirmPseDeposit() {
        const copAmount = parseFloat(copAmountInput.value);
        const selectedCrypto = depositCryptoSelect.value;
        const cryptoPriceUSD = cryptoData[selectedCrypto];

        depositErrorMessage.textContent = '';

        if (isNaN(copAmount) || copAmount <= 0) {
            depositErrorMessage.textContent = 'Por favor, ingresa un monto válido en COP.';
            return;
        }

        if (!selectedCrypto || !cryptoPriceUSD) {
            depositErrorMessage.textContent = 'Por favor, selecciona una criptomoneda.';
            return;
        }

        const usdAmount = copAmount / COP_TO_USD_RATE;
        const cryptoAmount = usdAmount / cryptoPriceUSD;

        cashBalance += usdAmount; // Se deposita en USD a la cuenta
        portfolio[selectedCrypto] = (portfolio[selectedCrypto] || 0) + cryptoAmount; // Se invierte en la cripto
        
        updateBalances();
        renderMyHoldings();
        closePseDepositModal();
    }

    // --- Manejo de Eventos ---

    // Event listener para los botones de comprar/vender en las tarjetas
    cryptoCardsContainer.addEventListener('click', (event) => {
        if (event.target.classList.contains('buy-btn')) {
            openTransactionModal(event.target.dataset.symbol, 'buy');
        } else if (event.target.classList.contains('sell-btn')) {
            openTransactionModal(event.target.dataset.symbol, 'sell');
        }
    });

    myHoldingsContainer.addEventListener('click', (event) => {
        if (event.target.classList.contains('buy-btn')) {
            openTransactionModal(event.target.dataset.symbol, 'buy');
        } else if (event.target.classList.contains('sell-btn')) {
            openTransactionModal(event.target.dataset.symbol, 'sell');
        }
    });

    // Event listeners para el modal de Compra/Venta
    closeButton.addEventListener('click', closeTransactionModal);
    transactionModal.addEventListener('click', (event) => { // Cierra modal si se clica fuera
        if (event.target === transactionModal) {
            closeTransactionModal();
        }
    });
    quantityInput.addEventListener('input', calculateTransactionCostOrGain);
    confirmTransactionBtn.addEventListener('click', confirmTransaction);

    // Event listeners para el modal de Depósito PSE
    openPseDepositModalBtn.addEventListener('click', openPseDepositModal);
    closePseDepositModalBtn.addEventListener('click', closePseDepositModal);
    pseDepositModal.addEventListener('click', (event) => { // Cierra modal si se clica fuera
        if (event.target === pseDepositModal) {
            closePseDepositModal();
        }
    });
    copAmountInput.addEventListener('input', calculateEstimatedCryptoReceive);
    depositCryptoSelect.addEventListener('change', calculateEstimatedCryptoReceive);
    confirmPseDepositBtn.addEventListener('click', confirmPseDeposit);


    // --- Simulación de Precios (muy básica) ---
    function simulatePriceFluctuation() {
        for (const symbol in cryptoData) {
            const currentPrice = cryptoData[symbol];
            // Fluctuation: +/- 1% a 0.01%
            const changePercentage = (Math.random() * 2 * priceFluctuation - priceFluctuation);
            const change = changePercentage * currentPrice;
            cryptoData[symbol] = Math.max(0.01, currentPrice + change); // Asegura que el precio no baje de 0.01
        }
        renderCryptoCards();
        renderMyHoldings();
        updateBalances();
        // Si el modal de depósito está abierto, recalcular la estimación
        if (pseDepositModal.style.display === 'flex') {
            calculateEstimatedCryptoReceive();
        }
    }

    // Actualizar precios cada 5 segundos
    setInterval(simulatePriceFluctuation, 5000);

    // --- Inicialización ---
    updateBalances();
    renderCryptoCards();
    renderMyHoldings();
    populateDepositCryptoSelect(); // Llenar el select de criptos al inicio
});
