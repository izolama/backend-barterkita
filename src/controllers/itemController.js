const { db } = require('../config/firebase');
const Item = require('../models/Item');
const PointCalculator = require('../utils/pointCalculator');

class ItemController {
  // Create new item
  async createItem(req, res) {
    try {
      const userId = req.user.uid;
      const itemData = {
        ...req.body,
        userId,
        status: 'available'
      };

      // Validate item data
      const validationErrors = Item.validate(itemData);
      if (validationErrors.length > 0) {
        return res.status(400).json({
          error: {
            message: 'Invalid item data',
            details: validationErrors
          }
        });
      }

      // Create item document
      const item = new Item(itemData);
      const itemRef = await db.collection('items').add(item.toFirestore());

      // Award points for listing item
      const pointsAwarded = PointCalculator.calculateItemListingPoints(item);
      await db.collection('users').doc(userId).update({
        points: db.FieldValue.increment(pointsAwarded)
      });

      res.status(201).json({
        message: 'Item created successfully',
        item: {
          id: itemRef.id,
          ...item
        },
        pointsAwarded
      });
    } catch (error) {
      console.error('Create item error:', error);
      res.status(400).json({
        error: {
          message: 'Failed to create item',
          details: error.message
        }
      });
    }
  }

  // Get item by ID
  async getItemById(req, res) {
    try {
      const { itemId } = req.params;
      const itemDoc = await db.collection('items').doc(itemId).get();

      if (!itemDoc.exists) {
        return res.status(404).json({
          error: {
            message: 'Item not found'
          }
        });
      }

      const item = Item.fromFirestore(itemDoc.data(), itemDoc.id);

      // Get owner details
      const ownerDoc = await db.collection('users').doc(item.userId).get();
      const ownerData = ownerDoc.data();

      res.status(200).json({
        item,
        owner: {
          id: ownerDoc.id,
          displayName: ownerData.displayName,
          photoURL: ownerData.photoURL,
          rating: ownerData.rating
        }
      });
    } catch (error) {
      console.error('Get item error:', error);
      res.status(400).json({
        error: {
          message: 'Failed to get item',
          details: error.message
        }
      });
    }
  }

  // Update item
  async updateItem(req, res) {
    try {
      const { itemId } = req.params;
      const userId = req.user.uid;
      const updates = req.body;

      // Check if item exists and belongs to user
      const itemDoc = await db.collection('items').doc(itemId).get();
      if (!itemDoc.exists) {
        return res.status(404).json({
          error: {
            message: 'Item not found'
          }
        });
      }

      const item = Item.fromFirestore(itemDoc.data(), itemDoc.id);
      if (item.userId !== userId) {
        return res.status(403).json({
          error: {
            message: 'Not authorized to update this item'
          }
        });
      }

      // Validate updates
      const validationErrors = Item.validate({ ...item, ...updates });
      if (validationErrors.length > 0) {
        return res.status(400).json({
          error: {
            message: 'Invalid item data',
            details: validationErrors
          }
        });
      }

      // Update item
      await db.collection('items').doc(itemId).update({
        ...updates,
        updatedAt: new Date().toISOString()
      });

      const updatedDoc = await db.collection('items').doc(itemId).get();
      const updatedItem = Item.fromFirestore(updatedDoc.data(), updatedDoc.id);

      res.status(200).json({
        message: 'Item updated successfully',
        item: updatedItem
      });
    } catch (error) {
      console.error('Update item error:', error);
      res.status(400).json({
        error: {
          message: 'Failed to update item',
          details: error.message
        }
      });
    }
  }

  // Delete item
  async deleteItem(req, res) {
    try {
      const { itemId } = req.params;
      const userId = req.user.uid;

      // Check if item exists and belongs to user
      const itemDoc = await db.collection('items').doc(itemId).get();
      if (!itemDoc.exists) {
        return res.status(404).json({
          error: {
            message: 'Item not found'
          }
        });
      }

      const item = itemDoc.data();
      if (item.userId !== userId) {
        return res.status(403).json({
          error: {
            message: 'Not authorized to delete this item'
          }
        });
      }

      // Delete item
      await db.collection('items').doc(itemId).delete();

      res.status(200).json({
        message: 'Item deleted successfully'
      });
    } catch (error) {
      console.error('Delete item error:', error);
      res.status(400).json({
        error: {
          message: 'Failed to delete item',
          details: error.message
        }
      });
    }
  }

  // Search items
  async searchItems(req, res) {
    try {
      const {
        query,
        category,
        condition,
        location,
        radius,
        limit = 10,
        lastItemId
      } = req.query;

      let itemsRef = db.collection('items')
        .where('status', '==', 'available');

      // Apply filters
      if (category) {
        itemsRef = itemsRef.where('category', '==', category);
      }

      if (condition) {
        itemsRef = itemsRef.where('condition', '==', condition);
      }

      // Get items
      let itemsSnapshot;
      if (lastItemId) {
        const lastDoc = await db.collection('items').doc(lastItemId).get();
        itemsSnapshot = await itemsRef
          .orderBy('createdAt', 'desc')
          .startAfter(lastDoc)
          .limit(parseInt(limit))
          .get();
      } else {
        itemsSnapshot = await itemsRef
          .orderBy('createdAt', 'desc')
          .limit(parseInt(limit))
          .get();
      }

      const items = [];
      for (const doc of itemsSnapshot.docs) {
        const item = Item.fromFirestore(doc.data(), doc.id);

        // Filter by location if provided
        if (location && radius) {
          const distance = this.calculateDistance(
            location.lat,
            location.lng,
            item.location.lat,
            item.location.lng
          );
          if (distance <= radius) {
            items.push(item);
          }
        } else {
          items.push(item);
        }
      }

      res.status(200).json({
        items,
        lastItemId: items.length > 0 ? items[items.length - 1].id : null,
        hasMore: items.length === parseInt(limit)
      });
    } catch (error) {
      console.error('Search items error:', error);
      res.status(400).json({
        error: {
          message: 'Failed to search items',
          details: error.message
        }
      });
    }
  }

  // Helper method to calculate distance between two points
  calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Earth's radius in km
    const dLat = this.toRad(lat2 - lat1);
    const dLon = this.toRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRad(lat1)) * Math.cos(this.toRad(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  toRad(value) {
    return (value * Math.PI) / 180;
  }
}

module.exports = new ItemController();
