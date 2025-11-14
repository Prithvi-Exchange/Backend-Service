const axios = require('axios');
require("dotenv").config();

// Import models
const { Currency } = require('../../models/currency/Currency');
const { MarkupFee } = require('../../models/markup/MarkupFee');

// Import utilities
const { successResponse, errorResponse } = require('../../middleware/response/responseFormatter');

/**
 * Validate required environment variables on application startup
 * @throws {Error} If required environment variables are missing
 */
function validateEnvironment() {
  const requiredEnvVars = ['FCSAPI_KEY', 'FCSAPI_BASE'];
  const missing = requiredEnvVars.filter(varName => !process.env[varName]);
  
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
  
  console.log('Currency API environment variables validated successfully');
}

// Validate environment on module load
validateEnvironment();

/**
 * Fetch live currency rates from FCSAPI
 * @param {string} currencyPairs - Comma-separated currency pairs (e.g., 'USD/INR,EUR/INR')
 * @returns {Object} Live currency rates object
 * @throws {Error} If API request fails or returns invalid data
 */
async function fetchLiveRates(currencyPairs = null) {
  const apiKey = process.env.FCSAPI_KEY;
  const baseUrl = process.env.FCSAPI_BASE;
  const defaultPairs = process.env.DEFAULT_CURRENCY_PAIRS || 'USD/INR,EUR/INR,GBP/INR';
  const pairsToFetch = currencyPairs || defaultPairs;
  
  if (!apiKey) {
    throw new Error('FCSAPI_KEY is not configured in environment variables');
  }
  
  const url = `${baseUrl}?symbol=${pairsToFetch}&access_key=${apiKey}`;
  
  try {
    const response = await axios.get(url);
    
    if (!response.data || !response.data.response) {
      throw new Error('Invalid response format from FCSAPI');
    }
    
    const data = response.data.response;
    const rates = {};
    
    // Process each currency pair from API response
    data.forEach(item => {
      if (item && item.s && item.c) {
        const currency = item.s.split('/')[0]; // Extract base currency (USD, EUR, etc.)
        rates[currency] = parseFloat(item.c);  // Convert rate to float
      }
    });
    
    return rates;
  } catch (error) {
    console.error('Error fetching live rates from FCSAPI:', error.message);
    throw new Error(`Failed to fetch live rates: ${error.message}`);
  }
}

/**
 * Fetch markup fees for a specific city
 * @param {string} city_code - City code (e.g., 'DEL', 'BOM')
 * @returns {Object} Markup fees organized by currency and transaction type
 */
async function fetchMarkupFees(city_code) {
  const fees = await MarkupFee.findAll({ 
    where: { 
      city_code: city_code.toUpperCase(), 
      isActive: true 
    } 
  });
  
  // Organize fees by currency code and transaction type for easy access
  const feeMap = {};
  fees.forEach(fee => {
    if (!feeMap[fee.currency_code]) {
      feeMap[fee.currency_code] = {};
    }
    feeMap[fee.currency_code][fee.transaction_type] = fee;
  });
  
  return feeMap;
}

/**
 * Calculate final rate by applying markup and GST to live rate
 * @param {number} liveRate - Base live rate from API
 * @param {Object} markup - Markup fee configuration object
 * @param {boolean} isSell - Whether this is a sell transaction
 * @returns {number} Final calculated rate
 */
function calculateRate(liveRate, markup, isSell = false) {
  if (!markup) {
    console.warn(`No markup found for rate calculation. Live rate: ${liveRate}`);
    return null;
  }
  
  let finalRate = liveRate;
  let markupValue = markup.markup_value;
  
  // Use sell-specific markup if available and this is a sell transaction
  if (isSell && markup.markup_value_sell !== null && markup.markup_value_sell !== undefined) {
    markupValue = markup.markup_value_sell;
  }
  
  // Apply markup based on type (paisa or percentage)
  if (markup.markup_type === 'paisa') {
    // Fixed amount markup
    finalRate += parseFloat(markupValue);
  } else if (markup.markup_type === 'percentage') {
    // Percentage-based markup
    finalRate += liveRate * parseFloat(markupValue) / 100;
  }
  
  // Add GST to the final rate
  finalRate += finalRate * parseFloat(markup.gst_percentage) / 100;
  
  // Return rate rounded to 4 decimal places
  return parseFloat(finalRate.toFixed(4));
}

/**
 * Get currency rates with markup applied
 * @route GET /api/currency/rates
 * @access Public
 */
async function getCurrencyRates(req, res) {
  const { city_code, currency_pairs } = req.query;
  
  // Validate required parameter
  if (!city_code) {
    return errorResponse(res, 'city_code is required', 400);
  }

  try {
    // Fetch live rates from external API
    const liveRates = await fetchLiveRates(currency_pairs);
    // Fetch markup fees from database
    const markupFees = await fetchMarkupFees(city_code);

    const result = {};
    
    // Process each currency
    for (let [currency, liveRate] of Object.entries(liveRates)) {
      const fees = markupFees[currency] || {};
      
      // Get specific markup fees for different transaction types
      const cashFee = fees['CASH'] || {};
      const cardFee = fees['CARD'] || {};
      const ttFee = fees['TT'] || {};
      const sellCashFee = fees['SELLCASH'] || {};
      const sellCardFee = fees['SELLCARD'] || {};
      
      // Calculate rates for all transaction types
      const currencyData = {
        // Buy rates
        bpc: calculateRate(liveRate, cardFee),      // Prepaid Card (CARD)
        btt: calculateRate(liveRate, ttFee),        // Wire Transfer (TT)
        bdd: calculateRate(liveRate, ttFee),        // Demand Draft (using TT)
        bcn: calculateRate(liveRate, cashFee),      // Cash (CASH)
        ncn_combo: calculateRate(liveRate, cardFee), // Cash + Card combo (CARD)
        
        // Sell rates
        scn: calculateRate(liveRate, sellCashFee, true), // Sell Cash (SELLCASH)
        spc: calculateRate(liveRate, sellCardFee, true), // Sell Card (SELLCARD)
        
        // Additional information
        live_rate: liveRate,
        currency_code: currency,
        city: city_code.toUpperCase(),
        timestamp: new Date().toISOString()
      };

      // Upsert to database for caching (without quantity field)
      await Currency.upsert({
        currency_code: currency,
        city: city_code.toUpperCase(),
        bpc: currencyData.bpc,
        btt: currencyData.btt,
        bdd: currencyData.bdd,
        bcn: currencyData.bcn,
        ncn_combo: currencyData.ncn_combo,
        scn: currencyData.scn,
        spc: currencyData.spc,
        isActive: true
      });

      result[currency] = currencyData;
    }

    // Prepare metadata for response
    const metadata = {
      city: city_code.toUpperCase(),
      total_currencies: Object.keys(result).length,
      source: 'FCSAPI',
      timestamp: new Date().toISOString()
    };

    return successResponse(res, result, 'Currency rates fetched successfully', 200, metadata);

  } catch (err) {
    console.error('Error in getCurrencyRates:', err);
    return errorResponse(res, err.message, 500);
  }
}

/**
 * Get detailed currency rates with markup breakdown
 * @route GET /api/currency/rates/detailed
 * @access Public
 */
async function getDetailedCurrencyRates(req, res) {
  const { city_code, currency_pairs } = req.query;
  
  if (!city_code) {
    return errorResponse(res, 'city_code is required', 400);
  }

  try {
    const liveRates = await fetchLiveRates(currency_pairs);
    const markupFees = await fetchMarkupFees(city_code);

    const result = {};
    
    for (let [currency, liveRate] of Object.entries(liveRates)) {
      const fees = markupFees[currency] || {};
      
      const detailedData = {
        currency_code: currency,
        city: city_code.toUpperCase(),
        
        // Live rate information
        live_rate: liveRate,
        
        // Markup information for all transaction types
        markup_details: {
          CASH: fees['CASH'] ? {
            markup_value: parseFloat(fees['CASH'].markup_value),
            markup_value_sell: fees['CASH'].markup_value_sell ? parseFloat(fees['CASH'].markup_value_sell) : null,
            markup_type: fees['CASH'].markup_type,
            gst_percentage: parseFloat(fees['CASH'].gst_percentage),
            quantity: parseFloat(fees['CASH'].quantity)  // Stock quantity from MarkupFee
          } : null,
          CARD: fees['CARD'] ? {
            markup_value: parseFloat(fees['CARD'].markup_value),
            markup_value_sell: fees['CARD'].markup_value_sell ? parseFloat(fees['CARD'].markup_value_sell) : null,
            markup_type: fees['CARD'].markup_type,
            gst_percentage: parseFloat(fees['CARD'].gst_percentage),
            quantity: parseFloat(fees['CARD'].quantity)  // Stock quantity from MarkupFee
          } : null,
          TT: fees['TT'] ? {
            markup_value: parseFloat(fees['TT'].markup_value),
            markup_value_sell: fees['TT'].markup_value_sell ? parseFloat(fees['TT'].markup_value_sell) : null,
            markup_type: fees['TT'].markup_type,
            gst_percentage: parseFloat(fees['TT'].gst_percentage),
            quantity: parseFloat(fees['TT'].quantity)  // Stock quantity from MarkupFee
          } : null,
          SELLCASH: fees['SELLCASH'] ? {
            markup_value: parseFloat(fees['SELLCASH'].markup_value),
            markup_value_sell: fees['SELLCASH'].markup_value_sell ? parseFloat(fees['SELLCASH'].markup_value_sell) : null,
            markup_type: fees['SELLCASH'].markup_type,
            gst_percentage: parseFloat(fees['SELLCASH'].gst_percentage),
            quantity: parseFloat(fees['SELLCASH'].quantity)  // Stock quantity from MarkupFee
          } : null,
          SELLCARD: fees['SELLCARD'] ? {
            markup_value: parseFloat(fees['SELLCARD'].markup_value),
            markup_value_sell: fees['SELLCARD'].markup_value_sell ? parseFloat(fees['SELLCARD'].markup_value_sell) : null,
            markup_type: fees['SELLCARD'].markup_type,
            gst_percentage: parseFloat(fees['SELLCARD'].gst_percentage),
            quantity: parseFloat(fees['SELLCARD'].quantity)  // Stock quantity from MarkupFee
          } : null
        },
        
        // Calculated rates
        calculated_rates: {
          buy: {
            bpc: calculateRate(liveRate, fees['CARD']),      // Prepaid Card (CARD)
            btt: calculateRate(liveRate, fees['TT']),        // Wire Transfer (TT)
            bdd: calculateRate(liveRate, fees['TT']),        // Demand Draft (TT)
            bcn: calculateRate(liveRate, fees['CASH']),      // Cash (CASH)
            ncn_combo: calculateRate(liveRate, fees['CARD']) // Cash + Card combo (CARD)
          },
          sell: {
            scn: calculateRate(liveRate, fees['SELLCASH'], true), // Sell Cash (SELLCASH)
            spc: calculateRate(liveRate, fees['SELLCARD'], true)  // Sell Card (SELLCARD)
          }
        },
        
        timestamp: new Date().toISOString()
      };

      result[currency] = detailedData;
    }

    const metadata = {
      city: city_code.toUpperCase(),
      total_currencies: Object.keys(result).length,
      has_markup: Object.values(result).some(curr => 
        curr.markup_details.CASH || curr.markup_details.CARD || curr.markup_details.TT ||
        curr.markup_details.SELLCASH || curr.markup_details.SELLCARD
      ),
      timestamp: new Date().toISOString()
    };

    return successResponse(res, result, 'Detailed currency rates fetched successfully', 200, metadata);

  } catch (err) {
    console.error('Error in getDetailedCurrencyRates:', err);
    return errorResponse(res, err.message, 500);
  }
}

/**
 * Update currency rates manually (Admin function)
 * @route POST /api/currency/rates/update
 * @access Private/Admin
 */
async function updateCurrencyRates(req, res) {
  const { city_code, currency_pairs } = req.body;
  
  if (!city_code) {
    return errorResponse(res, 'city_code is required', 400);
  }

  try {
    const liveRates = await fetchLiveRates(currency_pairs);
    const markupFees = await fetchMarkupFees(city_code);

    const updateResults = [];
    
    for (let [currency, liveRate] of Object.entries(liveRates)) {
      const fees = markupFees[currency] || {};
      const cashFee = fees['CASH'] || {};
      const cardFee = fees['CARD'] || {};
      const ttFee = fees['TT'] || {};
      const sellCashFee = fees['SELLCASH'] || {};
      const sellCardFee = fees['SELLCARD'] || {};
      
      const currencyData = {
        bpc: calculateRate(liveRate, cardFee),
        btt: calculateRate(liveRate, ttFee),
        bdd: calculateRate(liveRate, ttFee),
        bcn: calculateRate(liveRate, cashFee),
        ncn_combo: calculateRate(liveRate, cardFee),
        scn: calculateRate(liveRate, sellCashFee, true),
        spc: calculateRate(liveRate, sellCardFee, true),
      };

      // Update database (without quantity field)
      const [currencyRecord, created] = await Currency.upsert({
        currency_code: currency,
        city: city_code.toUpperCase(),
        ...currencyData,
        isActive: true
      });

      updateResults.push({
        currency,
        action: created ? 'created' : 'updated',
        rates: currencyData,
        live_rate: liveRate
      });
    }

    const responseData = {
      updated_currencies: updateResults.length,
      results: updateResults,
      city: city_code.toUpperCase(),
      timestamp: new Date().toISOString()
    };

    return successResponse(res, responseData, 'Currency rates updated successfully', 200);

  } catch (err) {
    console.error('Error in updateCurrencyRates:', err);
    return errorResponse(res, err.message, 500);
  }
}

/**
 * Get currency rates with fallback to database if live API fails
 * @route GET /api/currency/rates/fallback
 * @access Public
 */
async function getCurrencyRatesWithFallback(req, res) {
  const { city_code, currency_pairs } = req.query;
  
  if (!city_code) {
    return errorResponse(res, 'city_code is required', 400);
  }

  try {
    let liveRates;
    let source = 'live';
    
    try {
      // Try to get live rates first
      liveRates = await fetchLiveRates(currency_pairs);
    } catch (liveError) {
      console.warn('Failed to fetch live rates, falling back to database:', liveError.message);
      source = 'database';
      
      // Fallback to latest rates from database
      const currencies = await Currency.findAll({
        where: { 
          city: city_code.toUpperCase(),
          isActive: true 
        },
        order: [['updatedAt', 'DESC']]
      });
      
      liveRates = {};
      currencies.forEach(currency => {
        // Use average of buy rates as fallback live rate
        const buyRates = [currency.bpc, currency.btt, currency.bdd, currency.bcn, currency.ncn_combo].filter(Boolean);
        if (buyRates.length > 0) {
          const averageRate = buyRates.reduce((sum, rate) => sum + parseFloat(rate), 0) / buyRates.length;
          liveRates[currency.currency_code] = parseFloat(averageRate.toFixed(4));
        }
      });
    }

    const markupFees = await fetchMarkupFees(city_code);
    const result = {};

    for (let [currency, rate] of Object.entries(liveRates)) {
      const fees = markupFees[currency] || {};
      const cashFee = fees['CASH'] || {};
      const cardFee = fees['CARD'] || {};
      const ttFee = fees['TT'] || {};
      const sellCashFee = fees['SELLCASH'] || {};
      const sellCardFee = fees['SELLCARD'] || {};
      
      result[currency] = {
        bpc: calculateRate(rate, cardFee),
        btt: calculateRate(rate, ttFee),
        bdd: calculateRate(rate, ttFee),
        bcn: calculateRate(rate, cashFee),
        ncn_combo: calculateRate(rate, cardFee),
        scn: calculateRate(rate, sellCashFee, true),
        spc: calculateRate(rate, sellCardFee, true),
        live_rate: rate,
        currency_code: currency,
        city: city_code.toUpperCase(),
        source: source,
        timestamp: new Date().toISOString()
      };
    }

    const metadata = {
      city: city_code.toUpperCase(),
      total_currencies: Object.keys(result).length,
      source: source,
      timestamp: new Date().toISOString()
    };

    return successResponse(res, result, 'Currency rates fetched successfully', 200, metadata);

  } catch (err) {
    console.error('Error in getCurrencyRatesWithFallback:', err);
    return errorResponse(res, err.message, 500);
  }
}

module.exports = { 
  getCurrencyRates,
  getDetailedCurrencyRates,
  getCurrencyRatesWithFallback,
  updateCurrencyRates,
  fetchLiveRates,
  validateEnvironment
};