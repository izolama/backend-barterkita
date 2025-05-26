const { db } = require('../config/firebase');
const Badge = require('../models/Badge');
const PointCalculator = require('../utils/pointCalculator');

class BadgeController {
  // Create new badge (admin only)
  async createBadge(req, res) {
    try {
      const badgeData = req.body;

      // Validate badge data
      const validationErrors = Badge.validate(badgeData);
      if (validationErrors.length > 0) {
        return res.status(400).json({
          error: {
            message: 'Invalid badge data',
            details: validationErrors
          }
        });
      }

      // Create badge document
      const badge = new Badge(badgeData);
      const badgeRef = await db.collection('badges').add(badge.toFirestore());

      res.status(201).json({
        message: 'Badge created successfully',
        badge: {
          id: badgeRef.id,
          ...badge
        }
      });
    } catch (error) {
      console.error('Create badge error:', error);
      res.status(400).json({
        error: {
          message: 'Failed to create badge',
          details: error.message
        }
      });
    }
  }

  // Get badge by ID
  async getBadgeById(req, res) {
    try {
      const { badgeId } = req.params;
      const badgeDoc = await db.collection('badges').doc(badgeId).get();

      if (!badgeDoc.exists) {
        return res.status(404).json({
          error: {
            message: 'Badge not found'
          }
        });
      }

      const badge = Badge.fromFirestore(badgeDoc.data(), badgeDoc.id);

      res.status(200).json({ badge });
    } catch (error) {
      console.error('Get badge error:', error);
      res.status(400).json({
        error: {
          message: 'Failed to get badge',
          details: error.message
        }
      });
    }
  }

  // List all badges
  async listBadges(req, res) {
    try {
      const { type, rarity } = req.query;

      let badgesRef = db.collection('badges')
        .where('isActive', '==', true);

      if (type) {
        badgesRef = badgesRef.where('type', '==', type);
      }

      if (rarity) {
        badgesRef = badgesRef.where('rarity', '==', rarity);
      }

      const badgesSnapshot = await badgesRef.get();
      const badges = badgesSnapshot.docs.map(doc => 
        Badge.fromFirestore(doc.data(), doc.id)
      );

      res.status(200).json({ badges });
    } catch (error) {
      console.error('List badges error:', error);
      res.status(400).json({
        error: {
          message: 'Failed to list badges',
          details: error.message
        }
      });
    }
  }

  // Award badge to user
  async awardBadge(req, res) {
    try {
      const { userId, badgeId } = req.params;

      // Check if badge exists
      const badgeDoc = await db.collection('badges').doc(badgeId).get();
      if (!badgeDoc.exists) {
        return res.status(404).json({
          error: {
            message: 'Badge not found'
          }
        });
      }

      const badge = Badge.fromFirestore(badgeDoc.data(), badgeDoc.id);

      // Check if user exists
      const userRef = db.collection('users').doc(userId);
      const userDoc = await userRef.get();
      if (!userDoc.exists) {
        return res.status(404).json({
          error: {
            message: 'User not found'
          }
        });
      }

      const userData = userDoc.data();

      // Check if user already has the badge
      if (userData.badges && userData.badges.includes(badgeId)) {
        return res.status(400).json({
          error: {
            message: 'User already has this badge'
          }
        });
      }

      // Award badge and points
      const pointsAwarded = PointCalculator.calculateBadgePoints(badge);
      await userRef.update({
        badges: db.FieldValue.arrayUnion(badgeId),
        points: db.FieldValue.increment(pointsAwarded),
        updatedAt: new Date().toISOString()
      });

      res.status(200).json({
        message: 'Badge awarded successfully',
        pointsAwarded
      });
    } catch (error) {
      console.error('Award badge error:', error);
      res.status(400).json({
        error: {
          message: 'Failed to award badge',
          details: error.message
        }
      });
    }
  }

  // Check user's badge progress
  async checkBadgeProgress(req, res) {
    try {
      const { userId } = req.params;

      // Get user data
      const userDoc = await db.collection('users').doc(userId).get();
      if (!userDoc.exists) {
        return res.status(404).json({
          error: {
            message: 'User not found'
          }
        });
      }

      const userData = userDoc.data();

      // Get all active badges
      const badgesSnapshot = await db.collection('badges')
        .where('isActive', '==', true)
        .get();

      const progress = [];

      // Calculate progress for each badge
      for (const doc of badgesSnapshot.docs) {
        const badge = Badge.fromFirestore(doc.data(), doc.id);
        const hasEarned = userData.badges && userData.badges.includes(doc.id);
        
        let progressData = {
          badge,
          earned: hasEarned,
          progress: hasEarned ? 100 : 0
        };

        if (!hasEarned) {
          // Calculate progress based on badge type
          switch (badge.type) {
            case 'achievement':
              progressData.progress = this.calculateAchievementProgress(badge, userData);
              break;
            case 'participation':
              progressData.progress = this.calculateParticipationProgress(badge, userData);
              break;
            case 'community':
              progressData.progress = this.calculateCommunityProgress(badge, userData);
              break;
          }
        }

        progress.push(progressData);
      }

      res.status(200).json({ progress });
    } catch (error) {
      console.error('Check badge progress error:', error);
      res.status(400).json({
        error: {
          message: 'Failed to check badge progress',
          details: error.message
        }
      });
    }
  }

  // Helper methods for calculating progress
  calculateAchievementProgress(badge, userData) {
    const { required } = badge.criteria;
    const current = userData.stats || {};
    
    let totalProgress = 0;
    let requirements = 0;

    for (const [key, value] of Object.entries(required)) {
      requirements++;
      if (current[key]) {
        totalProgress += Math.min((current[key] / value) * 100, 100);
      }
    }

    return Math.round(totalProgress / requirements);
  }

  calculateParticipationProgress(badge, userData) {
    const eventsAttended = userData.eventsAttended || 0;
    const required = badge.criteria.eventsRequired;
    return Math.min(Math.round((eventsAttended / required) * 100), 100);
  }

  calculateCommunityProgress(badge, userData) {
    const contributions = userData.communityContributions || 0;
    const required = badge.criteria.contributionsRequired;
    return Math.min(Math.round((contributions / required) * 100), 100);
  }
}

module.exports = new BadgeController();
