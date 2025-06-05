// currencyService.js
let currencyRates = { GHS: 1 };
let lastRateTimestamp = null;

export async function fetchCurrencyRates(base = 'GHS') {
    try {
        const res = await fetch(`/api/fx-rates?base=${base}`);
        const data = await res.json();
        // If using exchangerate-api.com, the rates are in data.conversion_rates
        currencyRates = data.conversion_rates || data.rates || data; // fallback for other APIs
        lastRateTimestamp = new Date();
        return currencyRates;
    } catch (e) {
        // fallback: keep old rates, warn user
        return currencyRates;
    }
}

export function convertAmount(amount, from, to) {
    if (!currencyRates[from] || !currencyRates[to]) return amount;
    return amount / currencyRates[from] * currencyRates[to];
}

export function getLastRateTimestamp() {
    return lastRateTimestamp;
}