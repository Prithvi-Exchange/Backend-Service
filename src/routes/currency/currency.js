const express = require('express');
const router = express.Router();
const { 
  getCurrencyRates,
  getDetailedCurrencyRates,
  getCurrencyRatesWithFallback,
  updateCurrencyRates
} = require('../../controllers/currency/currencyController');
const { authenticate } = require('../../middleware/auth/auth');
const { requireAdmin } = require('../../middleware/auth/adminAuth');

/**
 * @swagger
 * tags:
 *   name: Currency
 *   description: Live currency exchange rates with markup calculations
 */

/**
 * @swagger
 * /currency/rates:
 *   get:
 *     summary: Get live currency rates with markup applied
 *     description: |
 *       Fetch real-time currency exchange rates from FCSAPI with Prithvi Exchange markup and GST applied.
 *       - Live rates sourced from FCSAPI with fallback mechanisms
 *       - Automatic markup and GST calculation based on city-specific configurations
 *       - Supports multiple transaction types (Cash, Card, Wire Transfer, etc.)
 *       - Rates cached in database for performance
 *       - Essential for forex pricing and calculations
 *     tags: [Currency]
 *     parameters:
 *       - name: city_code
 *         in: query
 *         description: |
 *           REQUIRED: 3-letter city/branch code
 *           - Determines markup rates and availability
 *           - Examples: DEL (Delhi), BOM (Mumbai), BLR (Bangalore)
 *         required: true
 *         schema:
 *           type: string
 *           example: "DEL"
 *           minLength: 3
 *           maxLength: 3
 *       - name: currency_pairs
 *         in: query
 *         description: |
 *           Optional: Comma-separated currency pairs to fetch
 *           - Format: BASE/QUOTE (e.g., USD/INR,EUR/INR)
 *           - Default: USD/INR,EUR/INR,GBP/INR
 *           - Supported pairs depend on FCSAPI availability
 *         required: false
 *         schema:
 *           type: string
 *           example: "USD/INR,EUR/INR,GBP/INR,AED/INR"
 *     responses:
 *       200:
 *         description: Currency rates retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 code:
 *                   type: integer
 *                   example: 200
 *                 message:
 *                   type: string
 *                   example: "Currency rates fetched successfully"
 *                 data:
 *                   type: object
 *                   additionalProperties:
 *                     type: object
 *                     properties:
 *                       bpc:
 *                         type: number
 *                         example: 83.4567
 *                         description: "Buy Prepaid Card rate (with markup + GST)"
 *                       btt:
 *                         type: number
 *                         example: 83.1234
 *                         description: "Buy Wire Transfer rate (with markup + GST)"
 *                       bdd:
 *                         type: number
 *                         example: 83.1234
 *                         description: "Buy Demand Draft rate (with markup + GST)"
 *                       bcn:
 *                         type: number
 *                         example: 83.7890
 *                         description: "Buy Cash rate (with markup + GST)"
 *                       ncn_combo:
 *                         type: number
 *                         example: 83.4567
 *                         description: "Cash + Card Combo rate (with markup + GST)"
 *                       scn:
 *                         type: number
 *                         example: 82.1234
 *                         description: "Sell Cash rate (with sell markup + GST)"
 *                       spc:
 *                         type: number
 *                         example: 82.4567
 *                         description: "Sell Prepaid Card rate (with sell markup + GST)"
 *                       live_rate:
 *                         type: number
 *                         example: 82.1234
 *                         description: "Base live rate from FCSAPI (without markup)"
 *                       currency_code:
 *                         type: string
 *                         example: "USD"
 *                         description: "3-letter currency code"
 *                       city:
 *                         type: string
 *                         example: "DEL"
 *                         description: "City code for which rates are calculated"
 *                       timestamp:
 *                         type: string
 *                         format: date-time
 *                         example: "2023-10-25T10:30:45.000Z"
 *                 metadata:
 *                   type: object
 *                   properties:
 *                     city:
 *                       type: string
 *                       example: "DEL"
 *                     total_currencies:
 *                       type: integer
 *                       example: 4
 *                     source:
 *                       type: string
 *                       example: "FCSAPI"
 *                     timestamp:
 *                       type: string
 *                       format: date-time
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *       400:
 *         description: city_code parameter is required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: |
 *           Internal server error or external API failure:
 *           - FCSAPI service unavailable
 *           - Database connection issues
 *           - Markup configuration errors
 */
router.get('/rates', getCurrencyRates);

/**
 * @swagger
 * /currency/rates/detailed:
 *   get:
 *     summary: Get detailed currency rates with markup breakdown
 *     description: |
 *       Fetch comprehensive currency rate information including live rates, markup details, and calculations.
 *       - Complete markup configuration breakdown
 *       - Stock quantity information from MarkupFee
 *       - Detailed rate calculations for audit purposes
 *       - All transaction types with individual markup values
 *       - Useful for debugging and financial analysis
 *     tags: [Currency]
 *     parameters:
 *       - name: city_code
 *         in: query
 *         description: "REQUIRED: 3-letter city/branch code"
 *         required: true
 *         schema:
 *           type: string
 *           example: "DEL"
 *           minLength: 3
 *           maxLength: 3
 *       - name: currency_pairs
 *         in: query
 *         description: "Optional currency pairs (default: USD/INR,EUR/INR,GBP/INR)"
 *         required: false
 *         schema:
 *           type: string
 *           example: "USD/INR,EUR/INR,GBP/INR"
 *     responses:
 *       200:
 *         description: Detailed currency rates retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 code:
 *                   type: integer
 *                   example: 200
 *                 message:
 *                   type: string
 *                   example: "Detailed currency rates fetched successfully"
 *                 data:
 *                   type: object
 *                   additionalProperties:
 *                     type: object
 *                     properties:
 *                       currency_code:
 *                         type: string
 *                         example: "USD"
 *                       city:
 *                         type: string
 *                         example: "DEL"
 *                       live_rate:
 *                         type: number
 *                         example: 82.1234
 *                         description: "Base live rate from FCSAPI"
 *                       markup_details:
 *                         type: object
 *                         properties:
 *                           CASH:
 *                             type: object
 *                             nullable: true
 *                             properties:
 *                               markup_value:
 *                                 type: number
 *                                 example: 1.5000
 *                                 description: "Markup value for cash transactions"
 *                               markup_value_sell:
 *                                 type: number
 *                                 example: 0.7500
 *                                 description: "Markup value for sell cash transactions"
 *                                 nullable: true
 *                               markup_type:
 *                                 type: string
 *                                 example: "percentage"
 *                                 enum: [percentage, paisa]
 *                                 description: "Type of markup calculation"
 *                               gst_percentage:
 *                                 type: number
 *                                 example: 18.00
 *                                 description: "GST percentage applied"
 *                               quantity:
 *                                 type: number
 *                                 example: 5000.7500
 *                                 description: "Available stock quantity"
 *                           CARD:
 *                             type: object
 *                             nullable: true
 *                             properties:
 *                               markup_value:
 *                                 type: number
 *                                 example: 2.0000
 *                               markup_value_sell:
 *                                 type: number
 *                                 example: 1.0000
 *                                 nullable: true
 *                               markup_type:
 *                                 type: string
 *                                 example: "percentage"
 *                               gst_percentage:
 *                                 type: number
 *                                 example: 18.00
 *                               quantity:
 *                                 type: number
 *                                 example: 10000.2500
 *                           TT:
 *                             type: object
 *                             nullable: true
 *                             properties:
 *                               markup_value:
 *                                 type: number
 *                                 example: 0.5000
 *                               markup_value_sell:
 *                                 type: number
 *                                 nullable: true
 *                               markup_type:
 *                                 type: string
 *                                 example: "paisa"
 *                               gst_percentage:
 *                                 type: number
 *                                 example: 18.00
 *                               quantity:
 *                                 type: number
 *                                 example: 0.0000
 *                           SELLCASH:
 *                             type: object
 *                             nullable: true
 *                             properties:
 *                               markup_value:
 *                                 type: number
 *                                 example: 0.7500
 *                               markup_value_sell:
 *                                 type: number
 *                                 nullable: true
 *                               markup_type:
 *                                 type: string
 *                                 example: "percentage"
 *                               gst_percentage:
 *                                 type: number
 *                                 example: 18.00
 *                               quantity:
 *                                 type: number
 *                                 example: 2500.5000
 *                           SELLCARD:
 *                             type: object
 *                             nullable: true
 *                             properties:
 *                               markup_value:
 *                                 type: number
 *                                 example: 1.0000
 *                               markup_value_sell:
 *                                 type: number
 *                                 nullable: true
 *                               markup_type:
 *                                 type: string
 *                                 example: "percentage"
 *                               gst_percentage:
 *                                 type: number
 *                                 example: 18.00
 *                               quantity:
 *                                 type: number
 *                                 example: 1500.7500
 *                       calculated_rates:
 *                         type: object
 *                         properties:
 *                           buy:
 *                             type: object
 *                             properties:
 *                               bpc:
 *                                 type: number
 *                                 example: 83.4567
 *                               btt:
 *                                 type: number
 *                                 example: 83.1234
 *                               bdd:
 *                                 type: number
 *                                 example: 83.1234
 *                               bcn:
 *                                 type: number
 *                                 example: 83.7890
 *                               ncn_combo:
 *                                 type: number
 *                                 example: 83.4567
 *                           sell:
 *                             type: object
 *                             properties:
 *                               scn:
 *                                 type: number
 *                                 example: 82.1234
 *                               spc:
 *                                 type: number
 *                                 example: 82.4567
 *                       timestamp:
 *                         type: string
 *                         format: date-time
 *                 metadata:
 *                   type: object
 *                   properties:
 *                     city:
 *                       type: string
 *                       example: "DEL"
 *                     total_currencies:
 *                       type: integer
 *                       example: 4
 *                     has_markup:
 *                       type: boolean
 *                       example: true
 *                       description: "Whether markup configurations exist for any currency"
 *                     timestamp:
 *                       type: string
 *                       format: date-time
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *       400:
 *         description: city_code parameter is required
 *       500:
 *         description: Internal server error
 */
router.get('/rates/detailed', getDetailedCurrencyRates);

/**
 * @swagger
 * /currency/rates/fallback:
 *   get:
 *     summary: Get currency rates with fallback to cached data
 *     description: |
 *       Fetch currency rates with robust fallback mechanism.
 *       - Primary: Live rates from FCSAPI
 *       - Fallback: Latest cached rates from database if API fails
 *       - Ensures service availability during external API outages
 *       - Automatic source tracking in response
 *       - Essential for high-availability applications
 *     tags: [Currency]
 *     parameters:
 *       - name: city_code
 *         in: query
 *         description: "REQUIRED: 3-letter city/branch code"
 *         required: true
 *         schema:
 *           type: string
 *           example: "DEL"
 *           minLength: 3
 *           maxLength: 3
 *       - name: currency_pairs
 *         in: query
 *         description: "Optional currency pairs"
 *         required: false
 *         schema:
 *           type: string
 *           example: "USD/INR,EUR/INR"
 *     responses:
 *       200:
 *         description: Currency rates retrieved successfully (live or fallback)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 code:
 *                   type: integer
 *                   example: 200
 *                 message:
 *                   type: string
 *                   example: "Currency rates fetched successfully"
 *                 data:
 *                   type: object
 *                   additionalProperties:
 *                     type: object
 *                     properties:
 *                       bpc:
 *                         type: number
 *                         example: 83.4567
 *                       btt:
 *                         type: number
 *                         example: 83.1234
 *                       bdd:
 *                         type: number
 *                         example: 83.1234
 *                       bcn:
 *                         type: number
 *                         example: 83.7890
 *                       ncn_combo:
 *                         type: number
 *                         example: 83.4567
 *                       scn:
 *                         type: number
 *                         example: 82.1234
 *                       spc:
 *                         type: number
 *                         example: 82.4567
 *                       live_rate:
 *                         type: number
 *                         example: 82.1234
 *                       currency_code:
 *                         type: string
 *                         example: "USD"
 *                       city:
 *                         type: string
 *                         example: "DEL"
 *                       source:
 *                         type: string
 *                         enum: [live, database]
 *                         example: "live"
 *                         description: "Data source - 'live' from API or 'database' from cache"
 *                       timestamp:
 *                         type: string
 *                         format: date-time
 *                 metadata:
 *                   type: object
 *                   properties:
 *                     city:
 *                       type: string
 *                       example: "DEL"
 *                     total_currencies:
 *                       type: integer
 *                       example: 4
 *                     source:
 *                       type: string
 *                       example: "live"
 *                     timestamp:
 *                       type: string
 *                       format: date-time
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *       400:
 *         description: city_code parameter is required
 *       500:
 *         description: Both live API and database fallback failed
 */
router.get('/rates/fallback', getCurrencyRatesWithFallback);

/**
 * @swagger
 * /currency/rates/update:
 *   post:
 *     summary: Manually update currency rates (Admin only)
 *     description: |
 *       Force update currency rates from external API and save to database.
 *       - Requires admin authentication
 *       - Fetches fresh rates from FCSAPI
 *       - Applies current markup configurations
 *       - Updates database cache
 *       - Returns detailed update results
 *       - Useful for manual rate refresh or testing
 *     tags: [Currency]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - city_code
 *             properties:
 *               city_code:
 *                 type: string
 *                 example: "DEL"
 *                 description: "REQUIRED: City code for which to update rates"
 *                 minLength: 3
 *                 maxLength: 3
 *               currency_pairs:
 *                 type: string
 *                 example: "USD/INR,EUR/INR,GBP/INR,AED/INR"
 *                 description: "Optional currency pairs to update"
 *     responses:
 *       200:
 *         description: Currency rates updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 code:
 *                   type: integer
 *                   example: 200
 *                 message:
 *                   type: string
 *                   example: "Currency rates updated successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     updated_currencies:
 *                       type: integer
 *                       example: 4
 *                       description: "Number of currencies successfully updated"
 *                     results:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           currency:
 *                             type: string
 *                             example: "USD"
 *                           action:
 *                             type: string
 *                             enum: [created, updated]
 *                             example: "updated"
 *                             description: "Whether record was created or updated"
 *                           rates:
 *                             type: object
 *                             properties:
 *                               bpc:
 *                                 type: number
 *                                 example: 83.4567
 *                               btt:
 *                                 type: number
 *                                 example: 83.1234
 *                               bdd:
 *                                 type: number
 *                                 example: 83.1234
 *                               bcn:
 *                                 type: number
 *                                 example: 83.7890
 *                               ncn_combo:
 *                                 type: number
 *                                 example: 83.4567
 *                               scn:
 *                                 type: number
 *                                 example: 82.1234
 *                               spc:
 *                                 type: number
 *                                 example: 82.4567
 *                           live_rate:
 *                             type: number
 *                             example: 82.1234
 *                     city:
 *                       type: string
 *                       example: "DEL"
 *                     timestamp:
 *                       type: string
 *                       format: date-time
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *       400:
 *         description: city_code is required in request body
 *       401:
 *         description: Unauthorized - Invalid or missing authentication token
 *       403:
 *         description: Forbidden - Admin privileges required
 *       500:
 *         description: Failed to update currency rates
 */
router.post('/rates/update', authenticate, requireAdmin, updateCurrencyRates);

module.exports = router;