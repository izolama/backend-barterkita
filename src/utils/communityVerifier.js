const { db } = require('../config/firebase');

class CommunityVerifier {
  constructor() {
    this.communitiesRef = db.collection('communities');
  }

  // Generate a new community code
  static generateCommunityCode() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }

  // Verify if a community code is valid
  async verifyCode(code) {
    try {
      const communityDoc = await this.communitiesRef
        .where('code', '==', code)
        .where('isActive', '==', true)
        .get();

      if (communityDoc.empty) {
        return {
          isValid: false,
          message: 'Invalid or expired community code'
        };
      }

      const communityData = communityDoc.docs[0].data();
      return {
        isValid: true,
        communityId: communityDoc.docs[0].id,
        communityName: communityData.name,
        message: 'Community code verified successfully'
      };
    } catch (error) {
      console.error('Error verifying community code:', error);
      throw new Error('Failed to verify community code');
    }
  }

  // Register a new community
  async registerCommunity(data) {
    try {
      const code = CommunityVerifier.generateCommunityCode();
      const communityData = {
        name: data.name,
        code,
        location: data.location,
        adminId: data.adminId,
        members: [data.adminId],
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      const docRef = await this.communitiesRef.add(communityData);
      return {
        id: docRef.id,
        ...communityData
      };
    } catch (error) {
      console.error('Error registering community:', error);
      throw new Error('Failed to register community');
    }
  }

  // Add member to community
  async addMember(communityId, userId) {
    try {
      const communityRef = this.communitiesRef.doc(communityId);
      await communityRef.update({
        members: db.FieldValue.arrayUnion(userId),
        updatedAt: new Date().toISOString()
      });
      return true;
    } catch (error) {
      console.error('Error adding member to community:', error);
      throw new Error('Failed to add member to community');
    }
  }

  // Remove member from community
  async removeMember(communityId, userId) {
    try {
      const communityRef = this.communitiesRef.doc(communityId);
      await communityRef.update({
        members: db.FieldValue.arrayRemove(userId),
        updatedAt: new Date().toISOString()
      });
      return true;
    } catch (error) {
      console.error('Error removing member from community:', error);
      throw new Error('Failed to remove member from community');
    }
  }

  // Get community details
  async getCommunityDetails(communityId) {
    try {
      const communityDoc = await this.communitiesRef.doc(communityId).get();
      if (!communityDoc.exists) {
        throw new Error('Community not found');
      }
      return {
        id: communityDoc.id,
        ...communityDoc.data()
      };
    } catch (error) {
      console.error('Error getting community details:', error);
      throw new Error('Failed to get community details');
    }
  }
}

module.exports = new CommunityVerifier();
