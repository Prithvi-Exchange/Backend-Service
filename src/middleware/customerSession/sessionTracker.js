// src/middleware/customerSession/sessionTracker.js
const { v4: uuidv4 } = require('uuid');
const CustomerSession = require('../../models/CustomerSession/CustomerSession');
const CustomerEvent = require('../../models/CustomerEvent/CustomerEvent');

/**
 * Middleware to track customer sessions and events
 * Generates session ID and attaches to all requests
 */
const sessionTracker = async (req, res, next) => {
  try {
    // Check for existing session ID in header, query, or body
    let sessionId = req.headers['x-session-id'] || req.query.sessionId || req.body.sessionId;
    
    // Generate new session ID if none exists
    if (!sessionId) {
      sessionId = `sess_${uuidv4()}_${Date.now()}`;
    }

    // Attach session ID to request object
    req.sessionId = sessionId;

    // Find or create session
    let session = await CustomerSession.findOne({ where: { sessionId } });
    
    if (!session) {
      // Create new session
      session = await CustomerSession.create({
        sessionId,
        ipAddress: req.ip || req.connection.remoteAddress,
        userAgent: req.get('User-Agent'),
        referrer: req.get('Referer'),
        landingPage: req.originalUrl,
        sessionData: {
          initialUrl: req.originalUrl,
          method: req.method
        }
      });

      // Track session start event
      await CustomerEvent.create({
        sessionId,
        eventType: 'session_start',
        eventName: 'Session Started',
        pageUrl: req.originalUrl,
        metadata: {
          ip: req.ip,
          userAgent: req.get('User-Agent'),
          referrer: req.get('Referer')
        }
      });
    } else {
      // Update page views for existing session
      await session.increment('pageViews');
    }

    // Track page view event for all requests
    if (req.method === 'GET' && !req.originalUrl.includes('/api/health')) {
      await CustomerEvent.create({
        sessionId,
        eventType: 'page_view',
        eventName: `Page View: ${req.originalUrl}`,
        pageUrl: req.originalUrl,
        metadata: {
          method: req.method,
          query: req.query
        }
      });
    }

    // Add session ID to response headers
    res.set('X-Session-ID', sessionId);

    next();
  } catch (error) {
    console.error('Session tracking error:', error);
    // Don't block request if session tracking fails
    next();
  }
};

/**
 * Utility function to track custom events
 */
const trackEvent = async (sessionId, eventData) => {
  try {
    const event = await CustomerEvent.create({
      sessionId,
      ...eventData
    });

    // Update session events count
    await CustomerSession.increment('eventsCount', { 
      where: { sessionId } 
    });

    return event;
  } catch (error) {
    console.error('Event tracking error:', error);
  }
};

/**
 * Utility to complete session (mark as completed with order)
 */
const completeSessionWithOrder = async (sessionId, forexRequestId) => {
  try {
    const session = await CustomerSession.findOne({ where: { sessionId } });
    if (session) {
      await session.update({
        status: 'completed',
        orderCompleted: true,
        forexRequestId,
        endedAt: new Date(),
        duration: Math.floor((new Date() - session.startedAt) / 1000)
      });

      await trackEvent(sessionId, {
        eventType: 'order_created',
        eventName: 'Forex Order Completed',
        forexRequestId,
        metadata: { status: 'completed' }
      });
    }
  } catch (error) {
    console.error('Session completion error:', error);
  }
};

/**
 * Utility to mark session as abandoned
 */
const markSessionAsAbandoned = async (sessionId, reason = 'user_navigation') => {
  try {
    const session = await CustomerSession.findOne({ where: { sessionId } });
    if (session && session.status === 'active') {
      await session.update({
        status: 'abandoned',
        endedAt: new Date(),
        duration: Math.floor((new Date() - session.startedAt) / 1000),
        sessionData: {
          ...session.sessionData,
          abandonmentReason: reason
        }
      });

      await trackEvent(sessionId, {
        eventType: 'session_end',
        eventName: 'Session Abandoned',
        metadata: { reason, status: 'abandoned' }
      });
    }
  } catch (error) {
    console.error('Session abandonment error:', error);
  }
};

module.exports = {
  sessionTracker,
  trackEvent,
  completeSessionWithOrder,
  markSessionAsAbandoned
};