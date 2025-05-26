const { db } = require('../config/firebase');
const User = require('../models/User');
const PointCalculator = require('../utils/pointCalculator');
const communityVerifier = require('../utils/communityVerifier');

class UserController {
  // Get user by ID
  async getUserById(req, res) {
    try {
      const { userId } = req.params;
      const userDoc = await db.collection('users').doc(userId).get();

      if (!userDoc.exists) {
        return res.status(404).json({
          error: {
            message: 'User not found'
          }
        });
      }

      const userData = User.fromFirestore(userDoc.data(), userDoc.id);
      
      // Get user's items
      const itemsSnapshot = await db.collection('items')
        .where('userId', '==', userId)
        .where('status', '==', 'available')
        .get();

      const items = itemsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      // Get user's badges
      const userBadges = await this.getUserBadges(userId);

      res.status(200).json({
        user: userData,
        items,
        badges: userBadges
      });
    } catch (error) {
      console.error('Get user error:', error);
      res.status(400).json({
        error: {
          message: 'Failed to get user',
          details: error.message
        }
      });
    }
  }

  // Get user's badges
  async getUserBadges(userId) {
    try {
      const userDoc = await db.collection('users').doc(userId).get();
      const userData = userDoc.data();

      if (!userData.badges || userData.badges.length === 0) {
        return [];
      }

      const badgesSnapshot = await db.collection('badges')
        .where('id', 'in', userData.badges)
        .get();

      return badgesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error('Get user badges error:', error);
      throw error;
    }
  }

  // Update user points
  async updateUserPoints(req, res) {
    try {
      const { userId } = req.params;
      const { action, details } = req.body;

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
      let pointsToAdd = 0;

      // Calculate points based on action
      switch (action) {
        case 'item_listed':
          pointsToAdd = PointCalculator.calculateItemListingPoints(details);
          break;
        case 'trade_completed':
          pointsToAdd = PointCalculator.calculateTradePoints(details);
          break;
        case 'event_participation':
          pointsToAdd = PointCalculator.calculateEventPoints(details, details.isOrganizer);
          break;
        case 'community_action':
          pointsToAdd = PointCalculator.calculateCommunityPoints(details.type);
          break;
        default:
          return res.status(400).json({
            error: {
              message: 'Invalid action type'
            }
          });
      }

      // Update user points
      const newTotalPoints = userData.points + pointsToAdd;
      await userRef.update({
        points: newTotalPoints,
        updatedAt: new Date().toISOString()
      });

      // Check for new badges based on points
      const newBadges = PointCalculator.checkPointBasedBadges(newTotalPoints);
      if (newBadges.length > 0) {
        await userRef.update({
          badges: [...(userData.badges || []), ...newBadges.map(b => b.id)]
        });
      }

      res.status(200).json({
        message: 'Points updated successfully',
        pointsAdded: pointsToAdd,
        newTotal: newTotalPoints,
        newBadges
      });
    } catch (error) {
      console.error('Update points error:', error);
      res.status(400).json({
        error: {
          message: 'Failed to update points',
          details: error.message
        }
      });
    }
  }

  // Verify user's community code
  async verifyCommunityCode(req, res) {
    try {
      const { userId } = req.params;
      const { communityCode } = req.body;

      const verification = await communityVerifier.verifyCode(communityCode);
      
      if (!verification.isValid) {
        return res.status(400).json({
          error: {
            message: verification.message
          }
        });
      }

      // Update user's community code
      const userRef = db.collection('users').doc(userId);
      await userRef.update({
        communityCode,
        isVerified: true,
        updatedAt: new Date().toISOString()
      });

      // Add user to community members
      await communityVerifier.addMember(verification.communityId, userId);

      // Award points for joining community
      const pointsAwarded = PointCalculator.calculateCommunityPoints('join');
      await this.updateUserPoints(userId, pointsAwarded);

      res.status(200).json({
        message: 'Community code verified successfully',
        community: {
          id: verification.communityId,
          name: verification.communityName
        },
        pointsAwarded
      });
    } catch (error) {
      console.error('Verify community code error:', error);
      res.status(400).json({
        error: {
          message: 'Failed to verify community code',
          details: error.message
        }
      });
    }
  }
}

module.exports = new UserController();
