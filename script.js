document.addEventListener('DOMContentLoaded', () => {
    // --- Datos Iniciales ---
    let cashBalance = 10000; // Saldo inicial en USD
    let portfolio = {}; // Objeto para guardar las criptomonedas del usuario
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

    // Modal elements
    const transactionModal = document.getElementById('transactionModal');
    const closeButton = document.querySelector('.close-button');
    const modalTitle = document.getElementById('modalTitle');
    const modalPrice = document.getElementById('modalPrice');
    const quantityInput = document.getElementById('quantityInput');
    const transactionCostEl = document.getElementById('transactionCost');
    const confirmTransactionBtn = document.getElementById('confirmTransactionBtn');
    const errorMessage = document.getElementById('errorMessage');

    let currentCryptoSymbol = null; // Criptomoneda seleccionada en el modal
    let currentOperationType = null; // 'buy' o 'sell'

    // --- Funciones de Actualización de UI ---

    function formatCurrency(value) {
        return `$ ${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }

    function updateBalances() {
        cashBalanceEl.textContent = formatCurrency(cashBalance);

        let totalPortfolioValue = 0;
        for (const symbol in portfolio) {
            if (portfolio[symbol] > 0) {
                totalPortfolioValue += portfolio[symbol] * cryptoData[symbol];
            }
        }
        portfolioValueEl.textContent = formatCurrency(totalPortfolioValue);
    }

    function renderCryptoCards() {
        cryptoCardsContainer.innerHTML = ''; // Limpiar antes de renderizar
        for (const symbol in cryptoData) {
            const card = document.createElement('div');
            card.classList.add('crypto-card');
            card.innerHTML = `
                <h4>${symbol}</h4>
                <p class="price">$ ${cryptoData[symbol].toLocaleString()}</p>
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
                    <p class="holdings-info">Valor Actual: <strong>${formatCurrency(currentValue)}</strong></p>
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

    // --- Funciones del Modal ---

    function openModal(symbol, type) {
        currentCryptoSymbol = symbol;
        currentOperationType = type;
        const price = cryptoData[symbol];

        modalTitle.textContent = `${type === 'buy' ? 'Comprar' : 'Vender'} ${symbol}`;
        modalPrice.textContent = `$ ${price.toLocaleString()}`;
        confirmTransactionBtn.textContent = type === 'buy' ? 'Confirmar Compra' : 'Confirmar Venta';
        confirmTransactionBtn.classList.remove('buy', 'sell'); // Clear previous classes
        confirmTransactionBtn.classList.add(type); // Add new class for styling
        quantityInput.value = ''; // Reset input
        transactionCostEl.textContent = `Costo/Ganancia Estimada: $ 0.00`;
        errorMessage.textContent = ''; // Clear error message

        transactionModal.style.display = 'flex'; // Show modal
    }

    function closeModal() {
        transactionModal.style.display = 'none';
    }

    function calculateCostOrGain() {
        const quantity = parseFloat(quantityInput.value);
        if (isNaN(quantity) || quantity <= 0) {
            transactionCostEl.textContent = `Costo/Ganancia Estimada: $ 0.00`;
            return;
        }
        const price = cryptoData[currentCryptoSymbol];
        const estimatedAmount = quantity * price;

        if (currentOperationType === 'buy') {
            transactionCostEl.textContent = `Costo Estimado: ${formatCurrency(estimatedAmount)}`;
        } else { // sell
            transactionCostEl.textContent = `Ganancia Estimada: ${formatCurrency(estimatedAmount)}`;
        }
    }

    function confirmTransaction() {
        const quantity = parseFloat(quantityInput.value);
        const price = cryptoData[currentCryptoSymbol];
        const cost = quantity * price;

        errorMessage.textContent = ''; // Limpiar mensaje de error

        if (isNaN(quantity) || quantity <= 0) {
            errorMessage.textContent = 'Por favor, ingresa una cantidad válida.';
            return;
        }

        if (currentOperationType === 'buy') {
            if (cashBalance >= cost) {
                cashBalance -= cost;
                portfolio[currentCryptoSymbol] = (portfolio[currentCryptoSymbol] || 0) + quantity;
                updateBalances();
                renderMyHoldings();
                closeModal();
            } else {
                errorMessage.textContent = 'Fondos insuficientes para esta compra.';
            }
        } else { // sell
            if (portfolio[currentCryptoSymbol] >= quantity) {
                cashBalance += cost;
                portfolio[currentCryptoSymbol] -= quantity;
                if (portfolio[currentCryptoSymbol] < 0.00000001) { // Eliminar si la cantidad es insignificante
                    delete portfolio[currentCryptoSymbol];
                }
                updateBalances();
                renderMyHoldings();
                closeModal();
            } else {
                errorMessage.textContent = `No tienes suficientes ${currentCryptoSymbol} para vender.`;
            }
        }
    }

    // --- Manejo de Eventos ---

    // Event listener para los botones de comprar/vender en las tarjetas
    cryptoCardsContainer.addEventListener('click', (event) => {
        if (event.target.classList.contains('buy-btn')) {
            openModal(event.target.dataset.symbol, 'buy');
        } else if (event.target.classList.contains('sell-btn')) {
            openModal(event.target.dataset.symbol, 'sell');
        }
    });

    myHoldingsContainer.addEventListener('click', (event) => {
        if (event.target.classList.contains('buy-btn')) {
            openModal(event.target.dataset.symbol, 'buy');
        } else if (event.target.classList.contains('sell-btn')) {
            openModal(event.target.dataset.symbol, 'sell');
        }
    });

    // Event listeners para el modal
    closeButton.addEventListener('click', closeModal);
    window.addEventListener('click', (event) => {
        if (event.target === transactionModal) {
            closeModal();
        }
    });
    quantityInput.addEventListener('input', calculateCostOrGain);
    confirmTransactionBtn.addEventListener('click', confirmTransaction);


    // --- Simulación de Precios (muy básica) ---
    function simulatePriceFluctuation() {
        for (const symbol in cryptoData) {
            const currentPrice = cryptoData[symbol];
            const change = (Math.random() * 2 * priceFluctuation - priceFluctuation) * currentPrice; // +/- fluctuation
            cryptoData[symbol] = Math.max(0.01, currentPrice + change); // Ensure price doesn't go below zero
        }
        renderCryptoCards(); // Vuelve a renderizar las tarjetas para mostrar los nuevos precios
        renderMyHoldings(); // Actualiza holdings también
        updateBalances(); // Actualiza el valor del portafolio
    }

    // Actualizar precios cada 5 segundos
    setInterval(simulatePriceFluctuation, 5000);

    // --- Inicialización ---
    updateBalances();
    renderCryptoCards();
    renderMyHoldings();
});