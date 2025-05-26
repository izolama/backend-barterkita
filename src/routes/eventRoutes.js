const express = require('express');
const router = express.Router();
const eventController = require('../controllers/eventController');
const { authenticateUser } = require('../middleware/authMiddleware');

// Public routes
router.get('/', eventController.listEvents);
router.get('/:eventId', eventController.getEventById);

// Protected routes
router.use(authenticateUser); // Apply authentication to all routes below

router.post('/', eventController.createEvent);
router.put('/:eventId', eventController.updateEvent);
router.post('/:eventId/join', eventController.joinEvent);
router.post('/:eventId/leave', eventController.leaveEvent);

// Additional event-related routes
router.post('/:eventId/comment', async (req, res) => {
  try {
    const { eventId } = req.params;
    const { content } = req.body;
    const userId = req.user.uid;

    // Get user data for the comment
    const userDoc = await db.collection('users').doc(userId).get();
    const userData = userDoc.data();

    const comment = {
      userId,
      displayName: userData.displayName,
      photoURL: userData.photoURL,
      content,
      createdAt: new Date().toISOString()
    };

    await db.collection('events').doc(eventId).update({
      comments: db.FieldValue.arrayUnion(comment)
    });

    res.status(201).json({
      message: 'Comment added successfully',
      comment
    });
  } catch (error) {
    res.status(400).json({
      error: {
        message: 'Failed to add comment',
        details: error.message
      }
    });
  }
});

router.post('/:eventId/rating', async (req, res) => {
  try {
    const { eventId } = req.params;
    const { rating, feedback } = req.body;
    const userId = req.user.uid;

    // Validate rating
    if (rating < 1 || rating > 5) {
      return res.status(400).json({
        error: {
          message: 'Rating must be between 1 and 5'
        }
      });
    }

    const eventRef = db.collection('events').doc(eventId);
    const eventDoc = await eventRef.get();

    if (!eventDoc.exists) {
      return res.status(404).json({
        error: {
          message: 'Event not found'
        }
      });
    }

    const event = eventDoc.data();

    // Check if user participated in the event
    if (!event.participants.includes(userId)) {
      return res.status(403).json({
        error: {
          message: 'Only participants can rate the event'
        }
      });
    }

    // Add or update rating
    const ratingData = {
      userId,
      rating,
      feedback,
      createdAt: new Date().toISOString()
    };

    await eventRef.update({
      ratings: db.FieldValue.arrayUnion(ratingData)
    });

    // Calculate and update average rating
    const ratings = [...(event.ratings || []), ratingData];
    const averageRating = ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length;

    await eventRef.update({
      averageRating: Math.round(averageRating * 10) / 10
    });

    res.status(200).json({
      message: 'Rating submitted successfully',
      averageRating
    });
  } catch (error) {
    res.status(400).json({
      error: {
        message: 'Failed to submit rating',
        details: error.message
      }
    });
  }
});

// Get user's event history
router.get('/history/user', async (req, res) => {
  try {
    const userId = req.user.uid;
    
    const eventsSnapshot = await db.collection('events')
      .where('participants', 'array-contains', userId)
      .orderBy('date', 'desc')
      .get();

    const events = eventsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    res.status(200).json({ events });
  } catch (error) {
    res.status(400).json({
      error: {
        message: 'Failed to get event history',
        details: error.message
      }
    });
  }
});

// Get upcoming events for user's community
router.get('/community/upcoming', async (req, res) => {
  try {
    const userId = req.user.uid;
    
    // Get user's community code
    const userDoc = await db.collection('users').doc(userId).get();
    const { communityCode } = userDoc.data();

    if (!communityCode) {
      return res.status(400).json({
        error: {
          message: 'User is not part of a community'
        }
      });
    }

    const now = new Date().toISOString();
    const eventsSnapshot = await db.collection('events')
      .where('communityCode', '==', communityCode)
      .where('date', '>=', now)
      .where('status', '==', 'upcoming')
      .orderBy('date', 'asc')
      .get();

    const events = eventsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    res.status(200).json({ events });
  } catch (error) {
    res.status(400).json({
      error: {
        message: 'Failed to get upcoming community events',
        details: error.message
      }
    });
  }
});

module.exports = router;
