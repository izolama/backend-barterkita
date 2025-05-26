const { db } = require('../config/firebase');
const Event = require('../models/Event');
const PointCalculator = require('../utils/pointCalculator');

class EventController {
  // Create new event
  async createEvent(req, res) {
    try {
      const organizerId = req.user.uid;
      const eventData = {
        ...req.body,
        organizer: organizerId,
        participants: [organizerId], // Organizer is automatically a participant
        status: 'upcoming'
      };

      // Validate event data
      const validationErrors = Event.validate(eventData);
      if (validationErrors.length > 0) {
        return res.status(400).json({
          error: {
            message: 'Invalid event data',
            details: validationErrors
          }
        });
      }

      // Create event document
      const event = new Event(eventData);
      const eventRef = await db.collection('events').add(event.toFirestore());

      // Award points for creating event
      const pointsAwarded = PointCalculator.calculateEventPoints(event, true);
      await db.collection('users').doc(organizerId).update({
        points: db.FieldValue.increment(pointsAwarded)
      });

      res.status(201).json({
        message: 'Event created successfully',
        event: {
          id: eventRef.id,
          ...event
        },
        pointsAwarded
      });
    } catch (error) {
      console.error('Create event error:', error);
      res.status(400).json({
        error: {
          message: 'Failed to create event',
          details: error.message
        }
      });
    }
  }

  // Get event by ID
  async getEventById(req, res) {
    try {
      const { eventId } = req.params;
      const eventDoc = await db.collection('events').doc(eventId).get();

      if (!eventDoc.exists) {
        return res.status(404).json({
          error: {
            message: 'Event not found'
          }
        });
      }

      const event = Event.fromFirestore(eventDoc.data(), eventDoc.id);

      // Get organizer details
      const organizerDoc = await db.collection('users').doc(event.organizer).get();
      const organizerData = organizerDoc.data();

      // Get participants details
      const participantsData = await Promise.all(
        event.participants.map(async (userId) => {
          const userDoc = await db.collection('users').doc(userId).get();
          const userData = userDoc.data();
          return {
            id: userDoc.id,
            displayName: userData.displayName,
            photoURL: userData.photoURL
          };
        })
      );

      res.status(200).json({
        event,
        organizer: {
          id: organizerDoc.id,
          displayName: organizerData.displayName,
          photoURL: organizerData.photoURL
        },
        participants: participantsData
      });
    } catch (error) {
      console.error('Get event error:', error);
      res.status(400).json({
        error: {
          message: 'Failed to get event',
          details: error.message
        }
      });
    }
  }

  // Update event
  async updateEvent(req, res) {
    try {
      const { eventId } = req.params;
      const userId = req.user.uid;
      const updates = req.body;

      // Check if event exists and user is organizer
      const eventDoc = await db.collection('events').doc(eventId).get();
      if (!eventDoc.exists) {
        return res.status(404).json({
          error: {
            message: 'Event not found'
          }
        });
      }

      const event = Event.fromFirestore(eventDoc.data(), eventDoc.id);
      if (event.organizer !== userId) {
        return res.status(403).json({
          error: {
            message: 'Not authorized to update this event'
          }
        });
      }

      // Validate updates
      const validationErrors = Event.validate({ ...event, ...updates });
      if (validationErrors.length > 0) {
        return res.status(400).json({
          error: {
            message: 'Invalid event data',
            details: validationErrors
          }
        });
      }

      // Update event
      await db.collection('events').doc(eventId).update({
        ...updates,
        updatedAt: new Date().toISOString()
      });

      const updatedDoc = await db.collection('events').doc(eventId).get();
      const updatedEvent = Event.fromFirestore(updatedDoc.data(), updatedDoc.id);

      res.status(200).json({
        message: 'Event updated successfully',
        event: updatedEvent
      });
    } catch (error) {
      console.error('Update event error:', error);
      res.status(400).json({
        error: {
          message: 'Failed to update event',
          details: error.message
        }
      });
    }
  }

  // Join event
  async joinEvent(req, res) {
    try {
      const { eventId } = req.params;
      const userId = req.user.uid;

      const eventRef = db.collection('events').doc(eventId);
      const eventDoc = await eventRef.get();

      if (!eventDoc.exists) {
        return res.status(404).json({
          error: {
            message: 'Event not found'
          }
        });
      }

      const event = Event.fromFirestore(eventDoc.data(), eventDoc.id);

      // Check if event is full
      if (event.isFull()) {
        return res.status(400).json({
          error: {
            message: 'Event is full'
          }
        });
      }

      // Check if user is already participating
      if (event.participants.includes(userId)) {
        return res.status(400).json({
          error: {
            message: 'Already participating in this event'
          }
        });
      }

      // Add user to participants
      await eventRef.update({
        participants: db.FieldValue.arrayUnion(userId),
        updatedAt: new Date().toISOString()
      });

      // Award points for joining event
      const pointsAwarded = PointCalculator.calculateEventPoints(event, false);
      await db.collection('users').doc(userId).update({
        points: db.FieldValue.increment(pointsAwarded)
      });

      res.status(200).json({
        message: 'Successfully joined event',
        pointsAwarded
      });
    } catch (error) {
      console.error('Join event error:', error);
      res.status(400).json({
        error: {
          message: 'Failed to join event',
          details: error.message
        }
      });
    }
  }

  // Leave event
  async leaveEvent(req, res) {
    try {
      const { eventId } = req.params;
      const userId = req.user.uid;

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

      // Check if user is participating
      if (!event.participants.includes(userId)) {
        return res.status(400).json({
          error: {
            message: 'Not participating in this event'
          }
        });
      }

      // Remove user from participants
      await eventRef.update({
        participants: db.FieldValue.arrayRemove(userId),
        updatedAt: new Date().toISOString()
      });

      res.status(200).json({
        message: 'Successfully left event'
      });
    } catch (error) {
      console.error('Leave event error:', error);
      res.status(400).json({
        error: {
          message: 'Failed to leave event',
          details: error.message
        }
      });
    }
  }

  // List events
  async listEvents(req, res) {
    try {
      const {
        communityCode,
        status,
        limit = 10,
        lastEventId
      } = req.query;

      let eventsRef = db.collection('events');

      // Apply filters
      if (communityCode) {
        eventsRef = eventsRef.where('communityCode', '==', communityCode);
      }

      if (status) {
        eventsRef = eventsRef.where('status', '==', status);
      }

      // Get events
      let eventsSnapshot;
      if (lastEventId) {
        const lastDoc = await db.collection('events').doc(lastEventId).get();
        eventsSnapshot = await eventsRef
          .orderBy('date', 'asc')
          .startAfter(lastDoc)
          .limit(parseInt(limit))
          .get();
      } else {
        eventsSnapshot = await eventsRef
          .orderBy('date', 'asc')
          .limit(parseInt(limit))
          .get();
      }

      const events = eventsSnapshot.docs.map(doc => 
        Event.fromFirestore(doc.data(), doc.id)
      );

      res.status(200).json({
        events,
        lastEventId: events.length > 0 ? events[events.length - 1].id : null,
        hasMore: events.length === parseInt(limit)
      });
    } catch (error) {
      console.error('List events error:', error);
      res.status(400).json({
        error: {
          message: 'Failed to list events',
          details: error.message
        }
      });
    }
  }
}

module.exports = new EventController();
