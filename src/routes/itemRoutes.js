const express = require('express');
const router = express.Router();
const itemController = require('../controllers/itemController');
const { authenticateUser } = require('../middleware/authMiddleware');

// Public routes
router.get('/search', itemController.searchItems);
router.get('/:itemId', itemController.getItemById);

// Protected routes
router.use(authenticateUser); // Apply authentication to all routes below

router.post('/', itemController.createItem);
router.put('/:itemId', itemController.updateItem);
router.delete('/:itemId', itemController.deleteItem);

// Trade-related routes
router.post('/:itemId/trade-request', async (req, res) => {
  try {
    const { itemId } = req.params;
    const { offeredItemId, message } = req.body;
    const userId = req.user.uid;

    // Create trade request
    const tradeRequest = {
      requesterId: userId,
      requestedItemId: itemId,
      offeredItemId,
      message,
      status: 'pending',
      createdAt: new Date().toISOString()
    };

    const tradeRef = await db.collection('trades').add(tradeRequest);

    res.status(201).json({
      message: 'Trade request sent successfully',
      tradeId: tradeRef.id
    });
  } catch (error) {
    res.status(400).json({
      error: {
        message: 'Failed to send trade request',
        details: error.message
      }
    });
  }
});

router.post('/:itemId/trade-response', async (req, res) => {
  try {
    const { itemId } = req.params;
    const { tradeId, accepted } = req.body;
    const userId = req.user.uid;

    const tradeRef = db.collection('trades').doc(tradeId);
    const tradeDoc = await tradeRef.get();

    if (!tradeDoc.exists) {
      return res.status(404).json({
        error: {
          message: 'Trade request not found'
        }
      });
    }

    const trade = tradeDoc.data();

    // Verify item owner
    const itemDoc = await db.collection('items').doc(itemId).get();
    if (!itemDoc.exists || itemDoc.data().userId !== userId) {
      return res.status(403).json({
        error: {
          message: 'Not authorized to respond to this trade'
        }
      });
    }

    // Update trade status
    await tradeRef.update({
      status: accepted ? 'accepted' : 'rejected',
      respondedAt: new Date().toISOString()
    });

    if (accepted) {
      // Update items status
      await db.collection('items').doc(itemId).update({ status: 'traded' });
      await db.collection('items').doc(trade.offeredItemId).update({ status: 'traded' });

      // Award points to both users
      const pointsAwarded = PointCalculator.calculateTradePoints(trade);
      await db.collection('users').doc(userId).update({
        points: db.FieldValue.increment(pointsAwarded)
      });
      await db.collection('users').doc(trade.requesterId).update({
        points: db.FieldValue.increment(pointsAwarded)
      });
    }

    res.status(200).json({
      message: `Trade ${accepted ? 'accepted' : 'rejected'} successfully`
    });
  } catch (error) {
    res.status(400).json({
      error: {
        message: 'Failed to respond to trade request',
        details: error.message
      }
    });
  }
});

// Get user's trade history
router.get('/trades/history', async (req, res) => {
  try {
    const userId = req.user.uid;
    const tradesSnapshot = await db.collection('trades')
      .where('requesterId', '==', userId)
      .orderBy('createdAt', 'desc')
      .get();

    const trades = [];
    for (const doc of tradesSnapshot.docs) {
      const trade = doc.data();
      
      // Get items details
      const [requestedItem, offeredItem] = await Promise.all([
        db.collection('items').doc(trade.requestedItemId).get(),
        db.collection('items').doc(trade.offeredItemId).get()
      ]);

      trades.push({
        id: doc.id,
        ...trade,
        requestedItem: requestedItem.data(),
        offeredItem: offeredItem.data()
      });
    }

    res.status(200).json({ trades });
  } catch (error) {
    res.status(400).json({
      error: {
        message: 'Failed to get trade history',
        details: error.message
      }
    });
  }
});

module.exports = router;
