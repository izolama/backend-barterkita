const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { authenticateUser, isAdmin } = require('../middleware/authMiddleware');

// Protected routes
router.get('/:userId', authenticateUser, userController.getUserById);
router.post('/:userId/points', authenticateUser, userController.updateUserPoints);
router.post('/:userId/verify-community', authenticateUser, userController.verifyCommunityCode);

// Admin routes
router.get('/list/all', authenticateUser, isAdmin, async (req, res) => {
  try {
    const usersSnapshot = await db.collection('users').get();
    const users = usersSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    res.status(200).json({ users });
  } catch (error) {
    res.status(400).json({
      error: {
        message: 'Failed to list users',
        details: error.message
      }
    });
  }
});

module.exports = router;
