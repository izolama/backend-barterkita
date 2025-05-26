const { auth, db } = require('../config/firebase');
const User = require('../models/User');
const PointCalculator = require('../utils/pointCalculator');

class AuthController {
  // Register new user
  async register(req, res) {
    try {
      const { email, password, displayName, phoneNumber } = req.body;

      // Create user in Firebase Auth
      const userRecord = await auth.createUser({
        email,
        password,
        displayName,
        phoneNumber
      });

      // Create user document in Firestore
      const userData = new User({
        uid: userRecord.uid,
        email: userRecord.email,
        displayName: userRecord.displayName,
        phoneNumber: userRecord.phoneNumber,
        photoURL: userRecord.photoURL,
        points: PointCalculator.POINT_VALUES.PROFILE_COMPLETED // Initial points for registration
      });

      await db.collection('users').doc(userRecord.uid).set(userData.toFirestore());

      // Create custom token for frontend
      const token = await auth.createCustomToken(userRecord.uid);

      res.status(201).json({
        message: 'User registered successfully',
        token,
        user: userData
      });
    } catch (error) {
      console.error('Registration error:', error);
      res.status(400).json({
        error: {
          message: 'Failed to register user',
          details: error.message
        }
      });
    }
  }

  // Login user
  async login(req, res) {
    try {
      const { email, password } = req.body;

      // Verify user credentials
      const userRecord = await auth.getUserByEmail(email);
      
      // Get user data from Firestore
      const userDoc = await db.collection('users').doc(userRecord.uid).get();
      
      if (!userDoc.exists) {
        throw new Error('User data not found');
      }

      const userData = User.fromFirestore(userDoc.data(), userDoc.id);

      // Create custom token
      const token = await auth.createCustomToken(userRecord.uid);

      res.status(200).json({
        message: 'Login successful',
        token,
        user: userData
      });
    } catch (error) {
      console.error('Login error:', error);
      res.status(401).json({
        error: {
          message: 'Invalid credentials',
          details: error.message
        }
      });
    }
  }

  // Get current user profile
  async getProfile(req, res) {
    try {
      const userId = req.user.uid;
      const userDoc = await db.collection('users').doc(userId).get();

      if (!userDoc.exists) {
        throw new Error('User profile not found');
      }

      const userData = User.fromFirestore(userDoc.data(), userDoc.id);

      // Calculate user level and ranking
      const userLevel = PointCalculator.calculateLevel(userData.points);

      // Get all users points for ranking
      const usersSnapshot = await db.collection('users').get();
      const allUsersPoints = usersSnapshot.docs.map(doc => doc.data().points);
      const userRanking = PointCalculator.getUserRanking(userData.points, allUsersPoints);

      res.status(200).json({
        user: userData,
        level: userLevel,
        ranking: userRanking
      });
    } catch (error) {
      console.error('Get profile error:', error);
      res.status(400).json({
        error: {
          message: 'Failed to get user profile',
          details: error.message
        }
      });
    }
  }

  // Update user profile
  async updateProfile(req, res) {
    try {
      const userId = req.user.uid;
      const updates = req.body;

      // Validate updates
      const validationErrors = User.validate(updates);
      if (validationErrors.length > 0) {
        return res.status(400).json({
          error: {
            message: 'Invalid profile data',
            details: validationErrors
          }
        });
      }

      // Update auth profile if needed
      if (updates.displayName || updates.photoURL) {
        await auth.updateUser(userId, {
          displayName: updates.displayName,
          photoURL: updates.photoURL
        });
      }

      // Update Firestore document
      const userRef = db.collection('users').doc(userId);
      await userRef.update({
        ...updates,
        updatedAt: new Date().toISOString()
      });

      // Get updated user data
      const updatedDoc = await userRef.get();
      const userData = User.fromFirestore(updatedDoc.data(), updatedDoc.id);

      res.status(200).json({
        message: 'Profile updated successfully',
        user: userData
      });
    } catch (error) {
      console.error('Update profile error:', error);
      res.status(400).json({
        error: {
          message: 'Failed to update profile',
          details: error.message
        }
      });
    }
  }

  // Reset password
  async resetPassword(req, res) {
    try {
      const { email } = req.body;
      await auth.generatePasswordResetLink(email);

      res.status(200).json({
        message: 'Password reset link sent successfully'
      });
    } catch (error) {
      console.error('Password reset error:', error);
      res.status(400).json({
        error: {
          message: 'Failed to send password reset link',
          details: error.message
        }
      });
    }
  }
}

module.exports = new AuthController();
