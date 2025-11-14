const express = require('express');
const router = express.Router();
const {
  createForexRequest,
  getAllForexRequests,
  getForexRequestById,
  updateForexRequest,
  deleteForexRequest,
  updateStatus,
  getUserForexRequests,
  trackFormAbandonment,
  trackFormProgress
} = require('../../controllers/forexController/forexController');
const { 
  validateForexRequest, 
  validateRequiredDocuments, 
  handleValidationErrors 
} = require('../../middleware/currencyRequest/currencyRequestValidation');
const { authenticate } = require('../../middleware/auth/auth');
const { requireAdmin } = require('../../middleware/auth/adminAuth');

/**
 * @swagger
 * tags:
 *   name: Forex Requests
 *   description: Foreign exchange currency request management for Buy and Sell orders
 */

/**
 * @swagger
 * /forex:
 *   post:
 *     summary: Create a new Forex Request (Buy/Sell)
 *     description: |
 *       Create a new foreign exchange currency request with comprehensive validation.
 *       - Supports both Buy (travel) and Sell (currency exchange) orders
 *       - Validates stock availability from MarkupFee records
 *       - Tracks user session and form progress
 *       - Supports single order or multiple order details
 *       - Automatically deducts stock when request is approved
 *     tags: [Forex Requests]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - orderType
 *               - travelerName
 *               - phoneNumber
 *               - email
 *               - panNumber
 *               - indianResident
 *               - deliveryAddress
 *               - pincode
 *               - city
 *               - state
 *             properties:
 *               orderType:
 *                 type: string
 *                 enum: [Buy, Sell]
 *                 example: "Buy"
 *                 description: "Type of forex order - Buy (purchase) or Sell (exchange)"
 *               orderDetails:
 *                 type: array
 *                 description: "Array of order items (alternative to single order fields)"
 *                 items:
 *                   type: object
 *                   required:
 *                     - orderType
 *                     - currency
 *                     - product
 *                     - currencyAmount
 *                     - amountInINR
 *                   properties:
 *                     orderType:
 *                       type: string
 *                       enum: [Buy, Sell]
 *                       example: "Buy"
 *                     currency:
 *                       type: string
 *                       example: "USD"
 *                       description: "3-letter currency code"
 *                     product:
 *                       type: string
 *                       example: "Forex Card"
 *                       description: "Product type (Forex Card, Cash, Traveler Cheque, Wire Transfer, Sell Cash, Sell Card)"
 *                     currencyAmount:
 *                       type: number
 *                       example: 1000.50
 *                       description: "Amount in foreign currency"
 *                     amountInINR:
 *                       type: number
 *                       example: 83250.75
 *                       description: "Equivalent amount in INR"
 *               # Single Order Fields (Backward Compatibility)
 *               currency:
 *                 type: string
 *                 example: "USD"
 *                 description: "Currency code (required if not using orderDetails)"
 *               product:
 *                 type: string
 *                 example: "Forex Card"
 *                 description: "Product type (required if not using orderDetails)"
 *               currencyAmount:
 *                 type: number
 *                 example: 1000.50
 *                 description: "Currency amount (required if not using orderDetails)"
 *               amountInINR:
 *                 type: number
 *                 example: 83250.75
 *                 description: "INR amount (required if not using orderDetails)"
 *               # Common Fields
 *               travelerName:
 *                 type: string
 *                 example: "Rajesh Kumar"
 *                 description: "Full name of traveler/requester"
 *               phoneNumber:
 *                 type: string
 *                 example: "+919876543210"
 *                 description: "Contact phone number"
 *               email:
 *                 type: string
 *                 format: email
 *                 example: "rajesh.kumar@example.com"
 *                 description: "Email address"
 *               panNumber:
 *                 type: string
 *                 example: "ABCDE1234F"
 *                 description: "10-character PAN number"
 *               indianResident:
 *                 type: boolean
 *                 example: true
 *                 description: "Indian residency status"
 *               deliveryAddress:
 *                 type: string
 *                 example: "123 Main Street, Connaught Place"
 *                 description: "Complete delivery address"
 *               pincode:
 *                 type: string
 *                 example: "110001"
 *                 description: "6-digit Indian pincode"
 *               city:
 *                 type: string
 *                 example: "New Delhi"
 *                 description: "City name"
 *               state:
 *                 type: string
 *                 example: "Delhi"
 *                 description: "State name"
 *               # Buy Order Specific Fields
 *               travelingCountries:
 *                 type: array
 *                 description: "Required for Buy orders only"
 *                 items:
 *                   type: string
 *                   example: "United States"
 *               startDate:
 *                 type: string
 *                 format: date
 *                 example: "2024-03-15"
 *                 description: "Travel start date (Buy orders only)"
 *               endDate:
 *                 type: string
 *                 format: date
 *                 example: "2024-03-30"
 *                 description: "Travel end date (Buy orders only)"
 *               purpose:
 *                 type: string
 *                 enum: ["Leisure/Holiday/Personal Visit", "Business Visit", "Education", "Medical Treatment", "Emigration", "Employment"]
 *                 example: "Leisure/Holiday/Personal Visit"
 *                 description: "Travel purpose (Buy orders only)"
 *               # Business Visit Fields
 *               businessReason:
 *                 type: string
 *                 example: "Client meeting and project discussion"
 *                 description: "Required for Business Visit purpose"
 *               businessName:
 *                 type: string
 *                 example: "Tech Solutions Pvt Ltd"
 *                 description: "Required for Business Visit purpose"
 *               businessType:
 *                 type: string
 *                 example: "IT Services"
 *                 description: "Required for Business Visit purpose"
 *               # Document URLs (All optional during creation, validated based on purpose)
 *               panCardImage:
 *                 type: string
 *                 format: uri
 *                 example: "https://example.com/documents/pan.jpg"
 *                 description: "PAN card document URL"
 *               passportFrontImage:
 *                 type: string
 *                 format: uri
 *                 example: "https://example.com/documents/passport-front.jpg"
 *                 description: "Passport front page URL"
 *               passportBackImage:
 *                 type: string
 *                 format: uri
 *                 example: "https://example.com/documents/passport-back.jpg"
 *                 description: "Passport back page URL"
 *               airTicket:
 *                 type: string
 *                 format: uri
 *                 example: "https://example.com/documents/air-ticket.pdf"
 *                 description: "Air ticket document URL"
 *               visaImage:
 *                 type: string
 *                 format: uri
 *                 example: "https://example.com/documents/visa.jpg"
 *                 description: "Visa document URL"
 *               collegeLetter:
 *                 type: string
 *                 format: uri
 *                 example: "https://example.com/documents/college-letter.pdf"
 *                 description: "College admission letter (Education purpose)"
 *               medicalCertificate:
 *                 type: string
 *                 format: uri
 *                 example: "https://example.com/documents/medical-certificate.pdf"
 *                 description: "Medical certificate (Medical Treatment purpose)"
 *               emigrationCertificate:
 *                 type: string
 *                 format: uri
 *                 example: "https://example.com/documents/emigration-certificate.pdf"
 *                 description: "Emigration certificate (Emigration purpose)"
 *               employmentCertificate:
 *                 type: string
 *                 format: uri
 *                 example: "https://example.com/documents/employment-certificate.pdf"
 *                 description: "Employment certificate (Employment purpose)"
 *               cancelledCheque:
 *                 type: string
 *                 format: uri
 *                 example: "https://example.com/documents/cancelled-cheque.jpg"
 *                 description: "Cancelled cheque (Business Visit purpose)"
 *               companyAddressProof:
 *                 type: string
 *                 format: uri
 *                 example: "https://example.com/documents/company-address-proof.pdf"
 *                 description: "Company address proof (Business Visit purpose)"
 *               signatoriesList:
 *                 type: string
 *                 format: uri
 *                 example: "https://example.com/documents/signatories-list.pdf"
 *                 description: "Signatories list (Business Visit purpose)"
 *     responses:
 *       201:
 *         description: Forex request created successfully
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
 *                   example: "Forex request created successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                       example: 1
 *                     orderType:
 *                       type: string
 *                       example: "Buy"
 *                     orderDetails:
 *                       type: array
 *                       items:
 *                         type: object
 *                     travelerName:
 *                       type: string
 *                       example: "Rajesh Kumar"
 *                     phoneNumber:
 *                       type: string
 *                       example: "+919876543210"
 *                     email:
 *                       type: string
 *                       example: "rajesh.kumar@example.com"
 *                     panNumber:
 *                       type: string
 *                       example: "ABCDE1234F"
 *                     city:
 *                       type: string
 *                       example: "New Delhi"
 *                     status:
 *                       type: string
 *                       example: "Pending"
 *                     orderSummary:
 *                       type: object
 *                       description: "Enhanced order summary with totals"
 *                     totalCurrencyAmount:
 *                       type: number
 *                       example: 1000.50
 *                     totalAmountInINR:
 *                       type: number
 *                       example: 83250.75
 *                     createdAt:
 *                       type: string
 *                       format: date-time
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *       400:
 *         description: |
 *           Validation error:
 *           - Missing required fields
 *           - Invalid document URLs
 *           - Travel date validation failed
 *           - Stock validation failed
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ValidationError'
 *       401:
 *         description: Unauthorized - Invalid or missing authentication token
 *       500:
 *         description: Internal server error
 */
router.post(
  '/', 
  authenticate, 
  validateForexRequest,
  validateRequiredDocuments,
  handleValidationErrors, 
  createForexRequest
);

/**
 * @swagger
 * /forex:
 *   get:
 *     summary: Get all Forex Requests (Admin only)
 *     description: |
 *       Retrieve paginated list of all forex requests with advanced filtering.
 *       - Requires admin privileges
 *       - Supports filtering by city, email, phone, name, status, user ID, purpose, and order type
 *       - Returns enhanced order summaries with totals
 *       - Includes both single and multiple order requests
 *     tags: [Forex Requests]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: city
 *         in: query
 *         description: "Filter by city name (case-insensitive partial match)"
 *         required: false
 *         schema:
 *           type: string
 *           example: "Delhi"
 *       - name: email
 *         in: query
 *         description: "Filter by email (case-insensitive partial match)"
 *         required: false
 *         schema:
 *           type: string
 *           example: "rajesh.kumar@example.com"
 *       - name: phoneNumber
 *         in: query
 *         description: "Filter by phone number (case-insensitive partial match)"
 *         required: false
 *         schema:
 *           type: string
 *           example: "+919876543210"
 *       - name: travelerName
 *         in: query
 *         description: "Filter by traveler name (case-insensitive partial match)"
 *         required: false
 *         schema:
 *           type: string
 *           example: "Rajesh Kumar"
 *       - name: status
 *         in: query
 *         description: "Filter by request status"
 *         required: false
 *         schema:
 *           type: string
 *           enum: [Pending, Approved, Rejected, Documents Requested]
 *           example: "Pending"
 *       - name: userId
 *         in: query
 *         description: "Filter by user ID"
 *         required: false
 *         schema:
 *           type: string
 *           example: "user_123456"
 *       - name: purpose
 *         in: query
 *         description: "Filter by travel purpose (Buy orders)"
 *         required: false
 *         schema:
 *           type: string
 *           enum: ["Leisure/Holiday/Personal Visit", "Business Visit", "Education", "Medical Treatment", "Emigration", "Employment"]
 *       - name: orderType
 *         in: query
 *         description: "Filter by order type"
 *         required: false
 *         schema:
 *           type: string
 *           enum: [Buy, Sell]
 *           example: "Buy"
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
 *         description: Forex requests retrieved successfully
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
 *                   example: "Forex requests fetched successfully"
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                         example: 1
 *                       orderType:
 *                         type: string
 *                         example: "Buy"
 *                       travelerName:
 *                         type: string
 *                         example: "Rajesh Kumar"
 *                       phoneNumber:
 *                         type: string
 *                         example: "+919876543210"
 *                       email:
 *                         type: string
 *                         example: "rajesh.kumar@example.com"
 *                       city:
 *                         type: string
 *                         example: "New Delhi"
 *                       status:
 *                         type: string
 *                         example: "Pending"
 *                       purpose:
 *                         type: string
 *                         example: "Leisure/Holiday/Personal Visit"
 *                       orderSummary:
 *                         type: object
 *                         properties:
 *                           orderCount:
 *                             type: integer
 *                             example: 1
 *                           currencies:
 *                             type: array
 *                             items:
 *                               type: string
 *                           totalCurrencyAmount:
 *                             type: number
 *                             example: 1000.50
 *                           totalAmountInINR:
 *                             type: number
 *                             example: 83250.75
 *                       totalCurrencyAmount:
 *                         type: number
 *                         example: 1000.50
 *                       totalAmountInINR:
 *                         type: number
 *                         example: 83250.75
 *                       createdAt:
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
 *                     count:
 *                       type: integer
 *                       example: 10
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *       401:
 *         description: Unauthorized - Invalid or missing authentication token
 *       403:
 *         description: Forbidden - Admin privileges required
 *       500:
 *         description: Internal server error
 */
router.get('/', authenticate, requireAdmin, getAllForexRequests);

/**
 * @swagger
 * /forex/user/my-requests:
 *   get:
 *     summary: Get authenticated user's Forex Requests
 *     description: |
 *       Retrieve paginated list of forex requests for the authenticated user.
 *       - Returns both Buy and Sell orders
 *       - Includes enhanced order summaries with totals
 *       - Supports filtering by status and purpose
 *     tags: [Forex Requests]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: status
 *         in: query
 *         description: "Filter by request status"
 *         required: false
 *         schema:
 *           type: string
 *           enum: [Pending, Approved, Rejected, Documents Requested]
 *           example: "Pending"
 *       - name: purpose
 *         in: query
 *         description: "Filter by travel purpose"
 *         required: false
 *         schema:
 *           type: string
 *           enum: ["Leisure/Holiday/Personal Visit", "Business Visit", "Education", "Medical Treatment", "Emigration", "Employment"]
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
 *         description: User's forex requests retrieved successfully
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
 *                   example: "Forex requests fetched successfully"
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/ForexRequest'
 *                 metadata:
 *                   type: object
 *                   properties:
 *                     pagination:
 *                       type: object
 *                     count:
 *                       type: integer
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *       401:
 *         description: Unauthorized - Invalid or missing authentication token
 *       500:
 *         description: Internal server error
 */
router.get('/user/my-requests', authenticate, getUserForexRequests);

/**
 * @swagger
 * /forex/{id}:
 *   get:
 *     summary: Get a single Forex Request by ID (Admin only)
 *     description: |
 *       Retrieve detailed information about a specific forex request.
 *       - Requires admin privileges
 *       - Returns complete request data with enhanced order summary
 *       - Includes all document URLs and order details
 *     tags: [Forex Requests]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         description: "Forex request ID"
 *         required: true
 *         schema:
 *           type: integer
 *           example: 1
 *     responses:
 *       200:
 *         description: Forex request retrieved successfully
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
 *                   example: "Forex request fetched successfully"
 *                 data:
 *                   $ref: '#/components/schemas/ForexRequest'
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *       401:
 *         description: Unauthorized - Invalid or missing authentication token
 *       403:
 *         description: Forbidden - Admin privileges required
 *       404:
 *         description: Forex request not found
 *       500:
 *         description: Internal server error
 */
router.get('/:id', authenticate, requireAdmin, getForexRequestById);

/**
 * @swagger
 * /forex/{id}:
 *   put:
 *     summary: Update a Forex Request (Admin only)
 *     description: |
 *       Update an existing forex request.
 *       - Requires admin privileges
 *       - Supports partial updates
 *       - Returns updated request with enhanced order summary
 *     tags: [Forex Requests]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         description: "Forex request ID"
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
 *               travelerName:
 *                 type: string
 *                 example: "Rajesh Kumar Updated"
 *               phoneNumber:
 *                 type: string
 *                 example: "+919876543211"
 *               email:
 *                 type: string
 *                 example: "rajesh.updated@example.com"
 *               deliveryAddress:
 *                 type: string
 *                 example: "456 Updated Street, Connaught Place"
 *               # Any other field from the create request can be updated
 *     responses:
 *       200:
 *         description: Forex request updated successfully
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
 *                   example: "Forex request updated successfully"
 *                 data:
 *                   $ref: '#/components/schemas/ForexRequest'
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *       401:
 *         description: Unauthorized - Invalid or missing authentication token
 *       403:
 *         description: Forbidden - Admin privileges required
 *       404:
 *         description: Forex request not found
 *       500:
 *         description: Internal server error
 */
router.put('/:id', authenticate, requireAdmin, updateForexRequest);

/**
 * @swagger
 * /forex/{id}:
 *   delete:
 *     summary: Delete a Forex Request (Admin only)
 *     description: |
 *       Permanently delete a forex request.
 *       - Requires admin privileges
 *       - Irreversible operation
 *       - Use with caution
 *     tags: [Forex Requests]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         description: "Forex request ID to delete"
 *         required: true
 *         schema:
 *           type: integer
 *           example: 1
 *     responses:
 *       200:
 *         description: Forex request deleted successfully
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
 *                   example: "Forex request deleted successfully"
 *                 data:
 *                   type: null
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *       401:
 *         description: Unauthorized - Invalid or missing authentication token
 *       403:
 *         description: Forbidden - Admin privileges required
 *       404:
 *         description: Forex request not found
 *       500:
 *         description: Internal server error
 */
router.delete('/:id', authenticate, requireAdmin, deleteForexRequest);

/**
 * @swagger
 * /forex/{id}/status:
 *   patch:
 *     summary: Update status of a Forex Request (Admin only)
 *     description: |
 *       Update the status of a forex request with business logic validation.
 *       - Approved: Validates required documents and deducts stock
 *       - Rejected: Requires rejection reason
 *       - Documents Requested: Marks for additional documentation
 *       - Automatically manages stock inventory
 *     tags: [Forex Requests]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         description: "Forex request ID"
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
 *               - status
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [Pending, Approved, Rejected, Documents Requested]
 *                 example: "Approved"
 *                 description: "New status for the request"
 *               rejectionReason:
 *                 type: string
 *                 example: "Incomplete documentation"
 *                 description: "Required when status is Rejected"
 *     responses:
 *       200:
 *         description: Status updated successfully
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
 *                   example: "Request approved successfully and stock deducted"
 *                 data:
 *                   type: object
 *                   properties:
 *                     request:
 *                       $ref: '#/components/schemas/ForexRequest'
 *                     stockDeduction:
 *                       type: array
 *                       description: "Stock deduction results for each order"
 *                       items:
 *                         type: object
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *       400:
 *         description: |
 *           Status update validation failed:
 *           - Missing required documents for approval
 *           - Missing rejection reason
 *           - Stock deduction failed
 *           - Invalid status value
 *       401:
 *         description: Unauthorized - Invalid or missing authentication token
 *       403:
 *         description: Forbidden - Admin privileges required
 *       404:
 *         description: Forex request not found
 *       500:
 *         description: Internal server error
 */
router.patch('/:id/status', authenticate, requireAdmin, updateStatus);

/**
 * @swagger
 * /forex/track-abandonment:
 *   post:
 *     summary: Track forex form abandonment
 *     description: |
 *       Track when users abandon the forex request form.
 *       - Used for analytics and user behavior tracking
 *       - Requires session ID for correlation
 *       - Public endpoint (no authentication required)
 *     tags: [Forex Requests]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - sessionId
 *             properties:
 *               sessionId:
 *                 type: string
 *                 example: "sess_1234567890_abc123"
 *                 description: "User session identifier"
 *               formData:
 *                 type: object
 *                 description: "Partial form data collected before abandonment"
 *               progress:
 *                 type: number
 *                 example: 50
 *                 description: "Form completion percentage"
 *               reason:
 *                 type: string
 *                 example: "user_navigation"
 *                 description: "Reason for abandonment"
 *               timeSpent:
 *                 type: number
 *                 example: 120
 *                 description: "Time spent on form in seconds"
 *     responses:
 *       200:
 *         description: Form abandonment tracked successfully
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
 *                   example: "Form abandonment tracked successfully"
 *                 data:
 *                   type: null
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *       400:
 *         description: Session ID is required
 *       500:
 *         description: Internal server error
 */
router.post('/track-abandonment', trackFormAbandonment);

/**
 * @swagger
 * /forex/track-progress:
 *   post:
 *     summary: Track forex form filling progress
 *     description: |
 *       Track user progress while filling the forex request form.
 *       - Used for analytics and user experience optimization
 *       - Requires session ID for correlation
 *       - Public endpoint (no authentication required)
 *     tags: [Forex Requests]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - sessionId
 *               - step
 *               - progress
 *             properties:
 *               sessionId:
 *                 type: string
 *                 example: "sess_1234567890_abc123"
 *                 description: "User session identifier"
 *               step:
 *                 type: string
 *                 example: "personal_details"
 *                 description: "Current form step"
 *               progress:
 *                 type: number
 *                 example: 25
 *                 description: "Overall form completion percentage"
 *               formData:
 *                 type: object
 *                 description: "Current form data"
 *     responses:
 *       200:
 *         description: Form progress tracked successfully
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
 *                   example: "Form progress tracked successfully"
 *                 data:
 *                   type: null
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *       400:
 *         description: Session ID, step, and progress are required
 *       500:
 *         description: Internal server error
 */
router.post('/track-progress', trackFormProgress);

module.exports = router;