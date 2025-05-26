class Badge {
    constructor(data) {
      this.id = data.id;
      this.name = data.name;
      this.description = data.description;
      this.icon = data.icon; // URL to badge icon
      this.type = data.type; // 'achievement', 'participation', 'community', 'special'
      this.criteria = data.criteria; // Requirements to earn the badge
      this.pointValue = data.pointValue || 0; // Points awarded for earning the badge
      this.rarity = data.rarity || 'common'; // common, uncommon, rare, legendary
      this.isActive = data.isActive !== undefined ? data.isActive : true;
      this.createdAt = data.createdAt || new Date().toISOString();
      this.updatedAt = new Date().toISOString();
    }
  
    // Validate badge data
    static validate(data) {
      const errors = [];
      const badgeTypes = ['achievement', 'participation', 'community', 'special'];
      const rarityLevels = ['common', 'uncommon', 'rare', 'legendary'];
  
      if (!data.name || data.name.trim().length < 3) {
        errors.push('Name must be at least 3 characters long');
      }
  
      if (!data.description || data.description.trim().length < 10) {
        errors.push('Description must be at least 10 characters long');
      }
  
      if (!data.icon || !data.icon.startsWith('http')) {
        errors.push('Valid icon URL is required');
      }
  
      if (!badgeTypes.includes(data.type)) {
        errors.push('Invalid badge type');
      }
  
      if (!data.criteria || Object.keys(data.criteria).length === 0) {
        errors.push('Badge criteria are required');
      }
  
      if (typeof data.pointValue !== 'number' || data.pointValue < 0) {
        errors.push('Point value must be a non-negative number');
      }
  
      if (!rarityLevels.includes(data.rarity)) {
        errors.push('Invalid rarity level');
      }
  
      return errors;
    }
  
    // Convert to Firestore data
    toFirestore() {
      return {
        name: this.name,
        description: this.description,
        icon: this.icon,
        type: this.type,
        criteria: this.criteria,
        pointValue: this.pointValue,
        rarity: this.rarity,
        isActive: this.isActive,
        createdAt: this.createdAt,
        updatedAt: this.updatedAt
      };
    }
  
    // Create from Firestore data
    static fromFirestore(data, id) {
      return new Badge({
        id,
        ...data
      });
    }
  
    // Check if user meets badge criteria
    checkCriteria(userStats) {
      switch (this.type) {
        case 'achievement':
          return this.checkAchievementCriteria(userStats);
        case 'participation':
          return this.checkParticipationCriteria(userStats);
        case 'community':
          return this.checkCommunityCriteria(userStats);
        case 'special':
          return this.checkSpecialCriteria(userStats);
        default:
          return false;
      }
    }
  
    // Helper methods for criteria checking
    checkAchievementCriteria(userStats) {
      const { required, current } = this.criteria;
      return Object.keys(required).every(key => 
        current[key] >= required[key]
      );
    }
  
    checkParticipationCriteria(userStats) {
      return userStats.eventsAttended >= this.criteria.eventsRequired;
    }
  
    checkCommunityCriteria(userStats) {
      return userStats.communityContributions >= this.criteria.contributionsRequired;
    }
  
    checkSpecialCriteria(userStats) {
      // Special badges might have custom criteria
      return this.criteria.customCheck(userStats);
    }
  }
  
  module.exports = Badge;
  