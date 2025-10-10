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
    let sessionId = req.headers['x-session-id'] || req.query.sessionId || req.body?.sessionId;
    
    // Generate new session ID if none exists
    if (!sessionId) {
      sessionId = `sess_${uuidv4()}_${Date.now()}`;
    }

    // Attach session ID to request object FIRST - before any database operations
    req.sessionId = sessionId;

    // Find or create session with proper error handling
    let session = await CustomerSession.findOne({ where: { sessionId } });
    
    if (!session) {
      try {
        // Create new session with safe data access
        session = await CustomerSession.create({
          sessionId,
          ipAddress: req.ip || req.connection?.remoteAddress || 'unknown',
          userAgent: req.get('User-Agent') || 'unknown',
          referrer: req.get('Referer') || null,
          landingPage: req.originalUrl,
          sessionData: {
            initialUrl: req.originalUrl,
            method: req.method
          }
        });

        // Track session start event with error handling
        try {
          await CustomerEvent.create({
            sessionId,
            eventType: 'session_start',
            eventName: 'Session Started',
            pageUrl: req.originalUrl,
            metadata: {
              ip: req.ip || 'unknown',
              userAgent: req.get('User-Agent') || 'unknown',
              referrer: req.get('Referer') || null
            }
          });
        } catch (eventError) {
          console.error('Failed to create session start event:', eventError);
          // Don't fail the request if event creation fails
        }
      } catch (createError) {
        console.error('Failed to create session:', createError);
        // Continue with the request even if session creation fails
        // The sessionId is already set on req, so downstream code will work
        return next();
      }
    } else {
      // Update page views for existing session with error handling
      try {
        await session.increment('pageViews');
      } catch (incrementError) {
        console.error('Failed to increment page views:', incrementError);
      }
    }

    // Track page view event for all requests with error handling
    if (req.method === 'GET' && !req.originalUrl.includes('/api/health')) {
      try {
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
      } catch (pageViewError) {
        console.error('Failed to create page view event:', pageViewError);
      }
    }

    // Add session ID to response headers
    res.set('X-Session-ID', sessionId);

    next();
  } catch (error) {
    console.error('Session tracking error:', error);
    // Don't block request if session tracking fails
    // Ensure sessionId is still set on request for downstream middleware
    if (!req.sessionId) {
      req.sessionId = `sess_fallback_${Date.now()}`;
    }
    next();
  }
};

/**
 * Utility function to track custom events with better error handling
 */
const trackEvent = async (sessionId, eventData) => {
  try {
    if (!sessionId) {
      console.warn('Attempted to track event without sessionId');
      return null;
    }

    // Skip tracking for fallback sessions
    if (sessionId.startsWith('sess_fallback')) {
      console.log('Skipping event tracking for fallback session:', sessionId);
      return null;
    }

    const event = await CustomerEvent.create({
      sessionId,
      ...eventData,
      timestamp: eventData.timestamp || new Date()
    });

    // Update session events count with error handling
    try {
      await CustomerSession.increment('eventsCount', { 
        where: { sessionId } 
      });
    } catch (incrementError) {
      console.error('Failed to increment events count:', incrementError);
    }

    return event;
  } catch (error) {
    console.error('Event tracking error:', error);
    return null;
  }
};

/**
 * Utility to complete session (mark as completed with order)
 */
const completeSessionWithOrder = async (sessionId, forexRequestId) => {
  try {
    if (!sessionId) {
      console.warn('Attempted to complete session without sessionId');
      return;
    }

    // Skip for fallback sessions
    if (sessionId.startsWith('sess_fallback')) {
      console.log('Skipping session completion for fallback session:', sessionId);
      return;
    }

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
    if (!sessionId) {
      console.warn('Attempted to mark session as abandoned without sessionId');
      return;
    }

    // Skip for fallback sessions
    if (sessionId.startsWith('sess_fallback')) {
      console.log('Skipping session abandonment for fallback session:', sessionId);
      return;
    }

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