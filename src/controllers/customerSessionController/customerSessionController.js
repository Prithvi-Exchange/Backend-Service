// src/controllers/customerSession/customerSessionController.js
const CustomerSession = require('../../models/CustomerSession/CustomerSession');
const CustomerEvent = require('../../models/CustomerEvent/CustomerEvent');
const ForexRequest = require('../../models/currencyRequest/ForexRequest');
const { successResponse, errorResponse } = require('../../middleware/response/responseFormatter');
const { getPaginationParams, createPaginationMetadata } = require('../../middleware/response/pagination');
const { Op } = require('sequelize');
const { sequelize } = require('../../config/database'); // ✅ FIXED: Added missing import

/**
 * Get detailed session information including all events
 */
const getSessionById = async (req, res) => {
  try {
    const { sessionId } = req.params;

    const session = await CustomerSession.findOne({
      where: { sessionId },
      include: [
        {
          model: CustomerEvent,
          as: 'events',
          order: [['timestamp', 'ASC']]
        }, 
        {
          model: ForexRequest,
          as: 'forexRequest',
          attributes: ['id', 'currency', 'currencyAmount', 'status', 'createdAt']
        }
      ]
    });

    if (!session) {
      return errorResponse(res, 'Session not found', 404);
    }

    return successResponse(
      res,
      session,
      'Session details fetched successfully',
      200
    );
  } catch (error) {
    console.error('Error fetching session:', error);
    return errorResponse(res, error.message, 500);
  }
};

/**
 * Get all sessions for a specific user
 */
const getUserSessions = async (req, res) => {
  try {
    const { userId } = req.params;
    const { page, limit, offset } = getPaginationParams(req);

    const { count, rows } = await CustomerSession.findAndCountAll({
      where: { userId },
      include: [
        {
          model: ForexRequest,
          as: 'forexRequest',
          attributes: ['id', 'currency', 'status']
        }
      ],
      order: [['startedAt', 'DESC']],
      limit,
      offset
    });

    const metadata = createPaginationMetadata(page, limit, count, rows);

    return successResponse(
      res,
      rows,
      'User sessions fetched successfully',
      200,
      metadata
    );
  } catch (error) {
    console.error('Error fetching user sessions:', error);
    return errorResponse(res, error.message, 500);
  }
};

/**
 * Get conversion rate analytics
 */
const getSessionAnalytics = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    const whereClause = {};
    if (startDate && endDate) {
      whereClause.startedAt = {
        [Op.between]: [new Date(startDate), new Date(endDate)]
      };
    }

    const totalSessions = await CustomerSession.count({ where: whereClause });
    const completedSessions = await CustomerSession.count({
      where: { ...whereClause, orderCompleted: true }
    });
    const abandonedSessions = await CustomerSession.count({
      where: { ...whereClause, status: 'abandoned' }
    });

    const conversionRate = totalSessions > 0 ? (completedSessions / totalSessions) * 100 : 0;
    const abandonmentRate = totalSessions > 0 ? (abandonedSessions / totalSessions) * 100 : 0;

    // ✅ FIXED: Properly handle the average calculations
    const averagePageViewsResult = await CustomerSession.findOne({
      where: whereClause,
      attributes: [[sequelize.fn('AVG', sequelize.col('pageViews')), 'avgPageViews']],
      raw: true
    });

    const averageSessionDurationResult = await CustomerSession.findOne({
      where: { ...whereClause, duration: { [Op.not]: null } },
      attributes: [[sequelize.fn('AVG', sequelize.col('duration')), 'avgDuration']],
      raw: true
    });

    const analytics = {
      totalSessions,
      completedSessions,
      abandonedSessions,
      conversionRate: Math.round(conversionRate * 100) / 100,
      abandonmentRate: Math.round(abandonmentRate * 100) / 100,
      averagePageViews: Math.round(averagePageViewsResult?.avgPageViews || 0),
      averageSessionDuration: Math.round(averageSessionDurationResult?.avgDuration || 0)
    };

    return successResponse(
      res,
      analytics,
      'Session analytics fetched successfully',
      200
    );
  } catch (error) {
    console.error('Error fetching session analytics:', error);
    return errorResponse(res, error.message, 500);
  }
};

/**
 * Get abandoned sessions with reasons
 */
const getAbandonedSessions = async (req, res) => {
  try {
    const { page, limit, offset } = getPaginationParams(req);
    const { reason } = req.query;

    const whereClause = { status: 'abandoned' };
    if (reason) {
      whereClause['$sessionData.abandonmentReason$'] = reason;
    }

    const { count, rows } = await CustomerSession.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: CustomerEvent,
          as: 'events',
          where: { eventType: 'form_abandoned' },
          required: false
        }
      ],
      order: [['endedAt', 'DESC']],
      limit,
      offset
    });

    const metadata = createPaginationMetadata(page, limit, count, rows);

    return successResponse(
      res,
      rows,
      'Abandoned sessions fetched successfully',
      200,
      metadata
    );
  } catch (error) {
    console.error('Error fetching abandoned sessions:', error);
    return errorResponse(res, error.message, 500);
  }
};

module.exports = {
  getSessionById,
  getUserSessions,
  getSessionAnalytics,
  getAbandonedSessions
};