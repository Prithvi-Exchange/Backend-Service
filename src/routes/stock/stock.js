const express = require('express');
const router = express.Router();
const { authenticate } = require('../../middleware/auth/auth');
const { requireAdmin } = require('../../middleware/auth/adminAuth');
const {
  validateStock,
  getStockLevels,
  updateStock,
  getStockAlerts
} = require('../../controllers/stock/stockController');

/**
 * @swagger
 * tags:
 *   name: Stocks
 *   description: Stock inventory management and validation
 */

/**
 * @swagger
 * /stock/validate:
 *   post:
 *     summary: Validate stock availability for currency transactions
 *     description: |
 *       Check if sufficient stock is available for a currency exchange transaction.
 *       - Validates against MarkupFee records (single source of truth)
 *       - Maps product types to transaction types automatically
 *       - Returns detailed availability information
 *       - Used before processing any currency exchange order
 *     tags: [Stocks]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - currencyCode
 *               - cityCode
 *               - amount
 *               - product
 *             properties:
 *               currencyCode:
 *                 type: string
 *                 example: "USD"
 *                 description: "3-letter currency code (ISO 4217)"
 *                 minLength: 3
 *                 maxLength: 3
 *               cityCode:
 *                 type: string
 *                 example: "DEL"
 *                 description: "3-letter city/branch code"
 *                 minLength: 3
 *                 maxLength: 3
 *               amount:
 *                 type: number
 *                 format: float
 *                 example: 1000.50
 *                 description: "Requested amount for transaction"
 *                 minimum: 0.01
 *               product:
 *                 type: string
 *                 enum: ["Forex Card", "Cash", "Traveler Cheque", "Wire Transfer", "Sell Cash", "Sell Card"]
 *                 example: "Forex Card"
 *                 description: "Type of financial product/service"
 *     responses:
 *       200:
 *         description: Stock validation completed successfully
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
 *                   example: "Stock validation completed"
 *                 data:
 *                   type: object
 *                   properties:
 *                     currencyCode:
 *                       type: string
 *                       example: "USD"
 *                       description: "Validated currency code"
 *                     cityCode:
 *                       type: string
 *                       example: "DEL"
 *                       description: "Validated city/branch code"
 *                     product:
 *                       type: string
 *                       example: "Forex Card"
 *                       description: "Requested product type"
 *                     transactionType:
 *                       type: string
 *                       example: "CARD"
 *                       description: "Mapped transaction type for internal processing"
 *                     requestedAmount:
 *                       type: number
 *                       example: 1000.50
 *                       description: "Amount requested by user"
 *                     availableAmount:
 *                       type: number
 *                       example: 5000.75
 *                       description: "Current available stock quantity"
 *                     isAvailable:
 *                       type: boolean
 *                       example: true
 *                       description: "Whether requested amount is available"
 *                     sufficient:
 *                       type: boolean
 *                       example: true
 *                       description: "Synonym for isAvailable"
 *                     currencyDescription:
 *                       type: string
 *                       example: "US DOLLAR"
 *                       description: "Full currency name/description"
 *                     markupType:
 *                       type: string
 *                       example: "PERCENTAGE"
 *                       description: "Type of markup calculation"
 *                     gstPercentage:
 *                       type: number
 *                       example: 18.0
 *                       description: "Applicable GST percentage"
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *                   example: "2023-10-25T10:30:45.000Z"
 *       400:
 *         description: Missing required parameters or invalid input
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Unauthorized - Invalid or missing authentication token
 *       404:
 *         description: Stock configuration not found for the specified parameters
 *       500:
 *         description: Internal server error
 */
router.post('/validate', authenticate, validateStock);

/**
 * @swagger
 * /stock/levels:
 *   get:
 *     summary: Get stock levels with filtering and pagination (Admin only)
 *     description: |
 *       Retrieve paginated list of all stock levels with optional filtering.
 *       - Requires admin privileges
 *       - Returns stock information from MarkupFee records
 *       - Supports filtering by currency, city, and transaction type
 *       - Includes pagination metadata
 *     tags: [Stocks]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: currencyCode
 *         in: query
 *         description: Filter by 3-letter currency code (e.g., USD, EUR, GBP)
 *         required: false
 *         schema:
 *           type: string
 *           example: "USD"
 *           minLength: 3
 *           maxLength: 3
 *       - name: cityCode
 *         in: query
 *         description: Filter by 3-letter city/branch code (e.g., DEL, BOM, BLR)
 *         required: false
 *         schema:
 *           type: string
 *           example: "DEL"
 *           minLength: 3
 *           maxLength: 3
 *       - name: transaction_type
 *         in: query
 *         description: Filter by transaction type (e.g., CASH, CARD, TT, SELLCASH, SELLCARD)
 *         required: false
 *         schema:
 *           type: string
 *           example: "CARD"
 *       - name: pageNumber
 *         in: query
 *         description: "Page number for pagination (default: 1, minimum: 1)"
 *         required: false
 *         schema:
 *           type: integer
 *           example: 1
 *           minimum: 1
 *       - name: pageSize
 *         in: query
 *         description: "Number of items per page (default: 10, maximum: 100)"
 *         required: false
 *         schema:
 *           type: integer
 *           example: 10
 *           minimum: 1
 *           maximum: 100
 *     responses:
 *       200:
 *         description: Stock levels retrieved successfully
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
 *                   example: "Stock levels fetched successfully"
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                         example: 1
 *                         description: "Unique stock record identifier"
 *                       currency_code:
 *                         type: string
 *                         example: "USD"
 *                         description: "3-letter currency code"
 *                       curr_des:
 *                         type: string
 *                         example: "US DOLLAR"
 *                         description: "Currency description"
 *                       city_code:
 *                         type: string
 *                         example: "DEL"
 *                         description: "City/branch code"
 *                       transaction_type:
 *                         type: string
 *                         example: "CARD"
 *                         description: "Transaction type"
 *                       quantity:
 *                         type: number
 *                         example: 5000.7500
 *                         description: "Available stock quantity (4 decimal precision)"
 *                       markup_type:
 *                         type: string
 *                         example: "PERCENTAGE"
 *                         description: "Markup calculation type"
 *                       gst_percentage:
 *                         type: number
 *                         example: 18.0
 *                         description: "GST percentage"
 *                       isActive:
 *                         type: boolean
 *                         example: true
 *                         description: "Stock record active status"
 *                 metadata:
 *                   type: object
 *                   properties:
 *                     pagination:
 *                       type: object
 *                       properties:
 *                         currentPage:
 *                           type: integer
 *                           example: 1
 *                         pageSize:
 *                           type: integer
 *                           example: 10
 *                         totalItems:
 *                           type: integer
 *                           example: 150
 *                         totalPages:
 *                           type: integer
 *                           example: 15
 *                         hasNextPage:
 *                           type: boolean
 *                           example: true
 *                         hasPreviousPage:
 *                           type: boolean
 *                           example: false
 *                         nextPage:
 *                           type: integer
 *                           example: 2
 *                         previousPage:
 *                           type: integer
 *                           example: null
 *                     count:
 *                       type: integer
 *                       example: 10
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *                   example: "2023-10-25T10:30:45.000Z"
 *       401:
 *         description: Unauthorized - Invalid or missing authentication token
 *       403:
 *         description: Forbidden - Admin privileges required
 *       500:
 *         description: Internal server error
 */
router.get('/levels', authenticate, requireAdmin, getStockLevels);

/**
 * @swagger
 * /stock/{id}:
 *   put:
 *     summary: Update stock quantity (Admin only)
 *     description: |
 *       Update stock quantity for a specific currency/city/transaction type combination.
 *       - Requires admin privileges
 *       - Supports three operations: add, subtract, or set quantity
 *       - Maintains 4 decimal precision for currency amounts
 *       - Prevents negative stock quantities
 *     tags: [Stocks]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         description: Stock record ID to update
 *         required: true
 *         schema:
 *           type: integer
 *           example: 1
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - quantity
 *             properties:
 *               quantity:
 *                 type: number
 *                 format: float
 *                 example: 1000.50
 *                 description: "Quantity value for the operation"
 *                 minimum: 0
 *               operation:
 *                 type: string
 *                 enum: ["add", "subtract", "set"]
 *                 example: "add"
 *                 description: |
 *                   Operation to perform:
 *                   - add: Add quantity to current stock
 *                   - subtract: Subtract quantity from current stock
 *                   - set: Set stock to exact quantity (default)
 *                 default: "set"
 *     responses:
 *       200:
 *         description: Stock updated successfully
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
 *                   example: "Stock updated successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                       example: 1
 *                     currency_code:
 *                       type: string
 *                       example: "USD"
 *                     curr_des:
 *                       type: string
 *                       example: "US DOLLAR"
 *                     city_code:
 *                       type: string
 *                       example: "DEL"
 *                     transaction_type:
 *                       type: string
 *                       example: "CARD"
 *                     previousQuantity:
 *                       type: number
 *                       example: 5000.7500
 *                       description: "Stock quantity before update"
 *                     newQuantity:
 *                       type: number
 *                       example: 6000.2500
 *                       description: "Stock quantity after update"
 *                     quantityChange:
 *                       type: number
 *                       example: 1000.50
 *                       description: "Absolute change in quantity (null for set operation)"
 *                     operation:
 *                       type: string
 *                       example: "add"
 *                     updatedAt:
 *                       type: string
 *                       format: date-time
 *                       example: "2023-10-25T10:35:22.000Z"
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *                   example: "2023-10-25T10:35:22.000Z"
 *       400:
 *         description: |
 *           Invalid operation parameters:
 *           - Cannot subtract more than available quantity
 *           - Stock quantity cannot be negative
 *           - Invalid quantity value
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Unauthorized - Invalid or missing authentication token
 *       403:
 *         description: Forbidden - Admin privileges required
 *       404:
 *         description: Stock record not found
 *       500:
 *         description: Internal server error
 */
router.put('/:id', authenticate, requireAdmin, updateStock);

/**
 * @swagger
 * /stock/alerts:
 *   get:
 *     summary: Get low stock alerts (Admin only)
 *     description: |
 *       Retrieve stocks below specified threshold for monitoring and replenishment.
 *       - Requires admin privileges
 *       - Configurable threshold parameter
 *       - Sorted by lowest stock first
 *       - Includes pagination metadata
 *     tags: [Stocks]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: threshold
 *         in: query
 *         description: |
 *           Stock threshold for alerts (default: 1000)
 *           Stocks with quantity less than threshold will be returned
 *         required: false
 *         schema:
 *           type: number
 *           format: float
 *           example: 500.0
 *           minimum: 0
 *       - name: pageNumber
 *         in: query
 *         description: "Page number for pagination (default: 1, minimum: 1)"
 *         required: false
 *         schema:
 *           type: integer
 *           example: 1
 *           minimum: 1
 *       - name: pageSize
 *         in: query
 *         description: "Number of items per page (default: 10, maximum: 100)"
 *         required: false
 *         schema:
 *           type: integer
 *           example: 10
 *           minimum: 1
 *           maximum: 100
 *     responses:
 *       200:
 *         description: Low stock alerts retrieved successfully
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
 *                   example: "Low stock alerts fetched successfully"
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                         example: 1
 *                       currency_code:
 *                         type: string
 *                         example: "USD"
 *                       curr_des:
 *                         type: string
 *                         example: "US DOLLAR"
 *                       city_code:
 *                         type: string
 *                         example: "DEL"
 *                       transaction_type:
 *                         type: string
 *                         example: "CARD"
 *                       quantity:
 *                         type: number
 *                         example: 450.2500
 *                         description: "Current stock quantity (below threshold)"
 *                       markup_type:
 *                         type: string
 *                         example: "PERCENTAGE"
 *                 metadata:
 *                   type: object
 *                   properties:
 *                     pagination:
 *                       type: object
 *                       properties:
 *                         currentPage:
 *                           type: integer
 *                           example: 1
 *                         pageSize:
 *                           type: integer
 *                           example: 10
 *                         totalItems:
 *                           type: integer
 *                           example: 25
 *                         totalPages:
 *                           type: integer
 *                           example: 3
 *                         hasNextPage:
 *                           type: boolean
 *                           example: true
 *                         hasPreviousPage:
 *                           type: boolean
 *                           example: false
 *                         nextPage:
 *                           type: integer
 *                           example: 2
 *                         previousPage:
 *                           type: integer
 *                           example: null
 *                     count:
 *                       type: integer
 *                       example: 10
 *                     threshold:
 *                       type: number
 *                       example: 500.0
 *                       description: "Threshold used for filtering low stocks"
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *                   example: "2023-10-25T10:30:45.000Z"
 *       401:
 *         description: Unauthorized - Invalid or missing authentication token
 *       403:
 *         description: Forbidden - Admin privileges required
 *       500:
 *         description: Internal server error
 */
router.get('/alerts', authenticate, requireAdmin, getStockAlerts);

module.exports = router;