const express = require('express');
const router = express.Router();
const badgeController = require('../controllers/badgeController');
const { authenticateUser, isAdmin } = require('../middleware/authMiddleware');

// Public routes
router.get('/', badgeController.listBadges);
router.get('/:badgeId', badgeController.getBadgeById);

// Protected routes
router.use(authenticateUser);

router.get('/progress/:userId', badgeController.checkBadgeProgress);

// Admin routes
router.use(isAdmin);

router.post('/', badgeController.createBadge);
router.post('/:badgeId/award/:userId', badgeController.awardBadge);

// Additional badge management routes
router.put('/:badgeId', async (req, res) => {
  try {
    const { badgeId } = req.params;
    const updates = req.body;

    // Validate updates
    const validationErrors = Badge.validate({ ...updates });
    if (validationErrors.length > 0) {
      return res.status(400).json({
        error: {
          message: 'Invalid badge data',
          details: validationErrors
        }
      });
    }

    // Update badge
    await db.collection('badges').doc(badgeId).update({
      ...updates,
      updatedAt: new Date().toISOString()
    });

    const updatedDoc = await db.collection('badges').doc(badgeId).get();
    const updatedBadge = Badge.fromFirestore(updatedDoc.data(), updatedDoc.id);

    res.status(200).json({
      message: 'Badge updated successfully',
      badge: updatedBadge
    });
  } catch (error) {
    res.status(400).json({
      error: {
        message: 'Failed to update badge',
        details: error.message
      }
    });
  }
});

router.delete('/:badgeId', async (req, res) => {
  try {
    const { badgeId } = req.params;

    // Instead of deleting, mark as inactive
    await db.collection('badges').doc(badgeId).update({
      isActive: false,
      updatedAt: new Date().toISOString()
    });

    res.status(200).json({
      message: 'Badge deactivated successfully'
    });
  } catch (error) {
    res.status(400).json({
      error: {
        message: 'Failed to deactivate badge',
        details: error.message
      }
    });
  }
});

// Get users who earned a specific badge
router.get('/:badgeId/users', async (req, res) => {
  try {
    const { badgeId } = req.params;
    
    const usersSnapshot = await db.collection('users')
      .where('badges', 'array-contains', badgeId)
      .get();

    const users = usersSnapshot.docs.map(doc => ({
      id: doc.id,
      displayName: doc.data().displayName,
      photoURL: doc.data().photoURL,
      earnedAt: doc.data().badges[badgeId]
    }));

    res.status(200).json({ users });
  } catch (error) {
    res.status(400).json({
      error: {
        message: 'Failed to get badge users',
        details: error.message
      }
    });
  }
});

// Get badge statistics
router.get('/:badgeId/stats', async (req, res) => {
  try {
    const { badgeId } = req.params;

    const usersSnapshot = await db.collection('users')
      .where('badges', 'array-contains', badgeId)
      .get();

    const totalUsers = await db.collection('users').get();
    
    const stats = {
      totalEarned: usersSnapshot.size,
      percentageEarned: (usersSnapshot.size / totalUsers.size) * 100,
      rarity: 'common' // Default value
    };

    // Calculate rarity based on percentage earned
    if (stats.percentageEarned <= 1) {
      stats.rarity = 'legendary';
    } else if (stats.percentageEarned <= 5) {
      stats.rarity = 'rare';
    } else if (stats.percentageEarned <= 15) {
      stats.rarity = 'uncommon';
    }

    res.status(200).json({ stats });
  } catch (error) {
    res.status(400).json({
      error: {
        message: 'Failed to get badge statistics',
        details: error.message
      }
    });
  }
});

module.exports = router;
