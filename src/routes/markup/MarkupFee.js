const express = require('express');
const router = express.Router();
const { authenticate } = require('../../middleware/auth/auth');
const { requireAdmin } = require('../../middleware/auth/adminAuth');

const { 
  createMarkupFee, 
  bulkCreateMarkupFees, 
  getMarkupFees, 
  updateMarkupFee, 
  deleteMarkupFee, 
  ensureCityCode 
} = require('../../controllers/markup/MarkupFeeController');

/**
 * @swagger
 * tags:
 *   name: Markup Fees
 *   description: Currency markup fee configuration and management
 */

/**
 * @swagger
 * /markup-fees:
 *   post:
 *     summary: Create a new markup fee configuration
 *     description: |
 *       Create a new currency markup fee configuration for specific city and transaction type.
 *       - Defines pricing, GST, and stock levels for currency transactions
 *       - Serves as single source of truth for both pricing and inventory
 *       - Unique constraint: currency_code + city_code + transaction_type + markup_type
 *       - Order must be unique within same city for proper display sequencing
 *     tags: [Markup Fees]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - currency_code
 *               - curr_des
 *               - city_code
 *               - transaction_type
 *               - markup_type
 *               - markup_value
 *             properties:
 *               currency_code:
 *                 type: string
 *                 example: "USD"
 *                 description: "3-letter ISO currency code (automatically converted to uppercase)"
 *                 minLength: 3
 *                 maxLength: 3
 *               curr_des:
 *                 type: string
 *                 example: "US DOLLAR"
 *                 description: "Full currency description/name"
 *                 maxLength: 100
 *               order:
 *                 type: integer
 *                 example: 1
 *                 description: "Display order within city (must be unique per city)"
 *                 minimum: 0
 *                 default: 0
 *               image:
 *                 type: string
 *                 example: "usd-flag.png"
 *                 description: "Currency flag/image filename"
 *                 nullable: true
 *               city_code:
 *                 type: string
 *                 example: "DEL"
 *                 description: "3-letter city/branch code"
 *                 minLength: 3
 *                 maxLength: 3
 *               transaction_type:
 *                 type: string
 *                 example: "CASH"
 *                 description: "Transaction type (CASH, CARD, TT, SELLCASH, SELLCARD)"
 *                 enum: ["CASH", "CARD", "TT", "SELLCASH", "SELLCARD"]
 *               markup_type:
 *                 type: string
 *                 example: "PERCENTAGE"
 *                 description: "Markup calculation type"
 *                 enum: ["PERCENTAGE", "FIXED"]
 *               markup_value:
 *                 type: number
 *                 format: float
 *                 example: 2.5000
 *                 description: "Markup value (4 decimal precision)"
 *                 minimum: 0
 *               markup_value_sell:
 *                 type: number
 *                 format: float
 *                 example: 1.7500
 *                 description: "Sell markup value (4 decimal precision, optional)"
 *                 minimum: 0
 *                 nullable: true
 *               gst_percentage:
 *                 type: number
 *                 format: float
 *                 example: 18.00
 *                 description: "GST percentage (2 decimal precision)"
 *                 minimum: 0
 *                 maximum: 100
 *                 default: 18.00
 *               isActive:
 *                 type: boolean
 *                 example: true
 *                 description: "Whether this markup fee configuration is active"
 *                 default: true
 *               quantity:
 *                 type: number
 *                 format: float
 *                 example: 10000.0000
 *                 description: "Available stock quantity (4 decimal precision, single source of truth for inventory)"
 *                 minimum: 0
 *                 default: 0.0000
 *     responses:
 *       201:
 *         description: Markup fee created successfully
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
 *                   example: 201
 *                 message:
 *                   type: string
 *                   example: "Markup fee created successfully"
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
 *                     order:
 *                       type: integer
 *                       example: 1
 *                     image:
 *                       type: string
 *                       example: "usd-flag.png"
 *                     city_code:
 *                       type: string
 *                       example: "DEL"
 *                     transaction_type:
 *                       type: string
 *                       example: "CASH"
 *                     markup_type:
 *                       type: string
 *                       example: "PERCENTAGE"
 *                     markup_value:
 *                       type: string
 *                       example: "2.5000"
 *                     markup_value_sell:
 *                       type: string
 *                       example: "1.7500"
 *                     gst_percentage:
 *                       type: string
 *                       example: "18.00"
 *                     quantity:
 *                       type: string
 *                       example: "10000.0000"
 *                     isActive:
 *                       type: boolean
 *                       example: true
 *                     createdAt:
 *                       type: string
 *                       format: date-time
 *                     updatedAt:
 *                       type: string
 *                       format: date-time
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *       400:
 *         description: Missing required fields or validation error
 *       409:
 *         description: |
 *           Conflict - Duplicate entry:
 *           - Markup fee already exists for same currency, city, transaction type and markup type
 *           - Order already exists in the same city
 *       500:
 *         description: Internal server error
 */
router.post('/', authenticate, requireAdmin, createMarkupFee);

/**
 * @swagger
 * /markup-fees/bulk:
 *   post:
 *     summary: Bulk create multiple markup fees
 *     description: |
 *       Create multiple markup fee configurations in a single operation.
 *       - Validates each fee for duplicates before creation
 *       - Normalizes currency codes to uppercase
 *       - Applies consistent decimal formatting
 *       - Returns count of successfully created fees
 *     tags: [Markup Fees]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - fees
 *             properties:
 *               fees:
 *                 type: array
 *                 description: "Array of markup fee objects to create"
 *                 minItems: 1
 *                 items:
 *                   type: object
 *                   required:
 *                     - currency_code
 *                     - curr_des
 *                     - city_code
 *                     - transaction_type
 *                     - markup_type
 *                     - markup_value
 *                   properties:
 *                     currency_code:
 *                       type: string
 *                       example: "EUR"
 *                     curr_des:
 *                       type: string
 *                       example: "EURO"
 *                     order:
 *                       type: integer
 *                       example: 2
 *                     image:
 *                       type: string
 *                       example: "eur-flag.png"
 *                     city_code:
 *                       type: string
 *                       example: "DEL"
 *                     transaction_type:
 *                       type: string
 *                       example: "CARD"
 *                     markup_type:
 *                       type: string
 *                       example: "PERCENTAGE"
 *                     markup_value:
 *                       type: number
 *                       example: 2.2500
 *                     markup_value_sell:
 *                       type: number
 *                       example: 1.5000
 *                     gst_percentage:
 *                       type: number
 *                       example: 18.00
 *                     isActive:
 *                       type: boolean
 *                       example: true
 *                     quantity:
 *                       type: number
 *                       example: 5000.0000
 *     responses:
 *       201:
 *         description: Markup fees created successfully
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
 *                   example: 201
 *                 message:
 *                   type: string
 *                   example: "Markup fees created successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     fees:
 *                       type: array
 *                       items:
 *                         type: object
 *                     count:
 *                       type: integer
 *                       example: 5
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *       400:
 *         description: Invalid fees array format
 *       409:
 *         description: Duplicate markup fee or order conflict
 *       500:
 *         description: Internal server error
 */
router.post('/bulk', authenticate, requireAdmin, bulkCreateMarkupFees);

/**
 * @swagger
 * /markup-fees:
 *   get:
 *     summary: Get markup fees with filtering and pagination
 *     description: |
 *       Retrieve paginated list of markup fees with optional filtering.
 *       - city_code query parameter is REQUIRED for all requests
 *       - Supports filtering by currency, transaction type, markup type, and status
 *       - Results ordered by display order then currency code
 *       - Returns both pricing and stock information
 *     tags: [Markup Fees]
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
 *       - name: currency_code
 *         in: query
 *         description: "Filter by 3-letter currency code"
 *         required: false
 *         schema:
 *           type: string
 *           example: "USD"
 *       - name: transaction_type
 *         in: query
 *         description: "Filter by transaction type"
 *         required: false
 *         schema:
 *           type: string
 *           example: "CASH"
 *           enum: ["CASH", "CARD", "TT", "SELLCASH", "SELLCARD"]
 *       - name: markup_type
 *         in: query
 *         description: "Filter by markup type"
 *         required: false
 *         schema:
 *           type: string
 *           example: "PERCENTAGE"
 *           enum: ["PERCENTAGE", "FIXED"]
 *       - name: gst_percentage
 *         in: query
 *         description: "Filter by GST percentage"
 *         required: false
 *         schema:
 *           type: number
 *           example: 18.00
 *       - name: isActive
 *         in: query
 *         description: "Filter by active status"
 *         required: false
 *         schema:
 *           type: boolean
 *           example: true
 *       - name: pageNumber
 *         in: query
 *         description: "Page number for pagination (default: 1)"
 *         required: false
 *         schema:
 *           type: integer
 *           example: 1
 *           minimum: 1
 *       - name: pageSize
 *         in: query
 *         description: "Items per page (default: 10, max: 100)"
 *         required: false
 *         schema:
 *           type: integer
 *           example: 10
 *           minimum: 1
 *           maximum: 100
 *     responses:
 *       200:
 *         description: Markup fees retrieved successfully
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
 *                   example: "Markup fees fetched successfully"
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
 *                       order:
 *                         type: integer
 *                         example: 1
 *                       image:
 *                         type: string
 *                         example: "usd-flag.png"
 *                       city_code:
 *                         type: string
 *                         example: "DEL"
 *                       transaction_type:
 *                         type: string
 *                         example: "CASH"
 *                       markup_type:
 *                         type: string
 *                         example: "PERCENTAGE"
 *                       markup_value:
 *                         type: string
 *                         example: "2.5000"
 *                       markup_value_sell:
 *                         type: string
 *                         example: "1.7500"
 *                       gst_percentage:
 *                         type: string
 *                         example: "18.00"
 *                       quantity:
 *                         type: string
 *                         example: "10000.0000"
 *                       isActive:
 *                         type: boolean
 *                         example: true
 *                       createdAt:
 *                         type: string
 *                         format: date-time
 *                       updatedAt:
 *                         type: string
 *                         format: date-time
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
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *       400:
 *         description: city_code parameter is required
 *       500:
 *         description: Internal server error
 */
router.get('/', ensureCityCode, getMarkupFees);

/**
 * @swagger
 * /markup-fees/{id}:
 *   put:
 *     summary: Update an existing markup fee
 *     description: |
 *       Update a specific markup fee configuration by ID.
 *       - Validates for duplicate order conflicts
 *       - Maintains decimal precision for numeric fields
 *       - Updates stock quantity (single source of truth)
 *       - Partial updates supported - only provided fields are updated
 *     tags: [Markup Fees]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         description: "Markup fee record ID"
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
 *             properties:
 *               currency_code:
 *                 type: string
 *                 example: "USD"
 *                 description: "3-letter currency code (converted to uppercase)"
 *               curr_des:
 *                 type: string
 *                 example: "US DOLLAR"
 *                 description: "Currency description"
 *               order:
 *                 type: integer
 *                 example: 2
 *                 description: "Display order (validated for uniqueness in city)"
 *               image:
 *                 type: string
 *                 example: "usd-flag-v2.png"
 *                 description: "Updated currency image"
 *               city_code:
 *                 type: string
 *                 example: "BOM"
 *                 description: "City/branch code"
 *               transaction_type:
 *                 type: string
 *                 example: "CARD"
 *                 description: "Transaction type"
 *               markup_type:
 *                 type: string
 *                 example: "FIXED"
 *                 description: "Markup calculation type"
 *               markup_value:
 *                 type: number
 *                 example: 3.0000
 *                 description: "Markup value (4 decimal precision)"
 *               markup_value_sell:
 *                 type: number
 *                 example: 2.0000
 *                 description: "Sell markup value (4 decimal precision)"
 *               gst_percentage:
 *                 type: number
 *                 example: 18.00
 *                 description: "GST percentage (2 decimal precision)"
 *               isActive:
 *                 type: boolean
 *                 example: false
 *                 description: "Active status"
 *               quantity:
 *                 type: number
 *                 example: 7500.5000
 *                 description: "Stock quantity (4 decimal precision, updates inventory)"
 *     responses:
 *       200:
 *         description: Markup fee updated successfully
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
 *                   example: "Markup fee updated successfully"
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
 *                     order:
 *                       type: integer
 *                       example: 2
 *                     image:
 *                       type: string
 *                       example: "usd-flag-v2.png"
 *                     city_code:
 *                       type: string
 *                       example: "BOM"
 *                     transaction_type:
 *                       type: string
 *                       example: "CARD"
 *                     markup_type:
 *                       type: string
 *                       example: "FIXED"
 *                     markup_value:
 *                       type: string
 *                       example: "3.0000"
 *                     markup_value_sell:
 *                       type: string
 *                       example: "2.0000"
 *                     gst_percentage:
 *                       type: string
 *                       example: "18.00"
 *                     quantity:
 *                       type: string
 *                       example: "7500.5000"
 *                     isActive:
 *                       type: boolean
 *                       example: false
 *                     updatedAt:
 *                       type: string
 *                       format: date-time
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *       404:
 *         description: Markup fee not found
 *       409:
 *         description: Order conflict in the target city
 *       500:
 *         description: Internal server error
 */
router.put('/:id', authenticate, requireAdmin, updateMarkupFee);

/**
 * @swagger
 * /markup-fees/{id}:
 *   delete:
 *     summary: Delete a markup fee configuration
 *     description: |
 *       Permanently delete a markup fee configuration by ID.
 *       - Irreversible operation
 *       - Also removes associated stock/inventory record
 *       - Use with caution as it affects pricing and inventory
 *     tags: [Markup Fees]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         description: "Markup fee record ID to delete"
 *         required: true
 *         schema:
 *           type: integer
 *           example: 1
 *     responses:
 *       200:
 *         description: Markup fee deleted successfully
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
 *                   example: "Markup fee deleted successfully"
 *                 data:
 *                   type: null
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *       404:
 *         description: Markup fee not found
 *       500:
 *         description: Internal server error
 */
router.delete('/:id', authenticate, requireAdmin, deleteMarkupFee);

module.exports = router;