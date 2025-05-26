class PointCalculator {
    // Point values for different actions
    static POINT_VALUES = {
      ITEM_LISTED: 5,
      SUCCESSFUL_TRADE: 20,
      EVENT_CREATED: 15,
      EVENT_ATTENDED: 10,
      COMMUNITY_JOINED: 25,
      BADGE_EARNED: 0, // Points defined per badge
      PROFILE_COMPLETED: 10,
      ITEM_REVIEWED: 5,
      TRADE_REVIEWED: 10
    };
  
    // Calculate points for listing an item
    static calculateItemListingPoints(item) {
      let points = this.POINT_VALUES.ITEM_LISTED;
      
      // Bonus points for complete listings
      if (item.images && item.images.length > 0) points += 2;
      if (item.description && item.description.length > 100) points += 3;
      if (item.preferredItems && item.preferredItems.length > 0) points += 2;
      
      return points;
    }
  
    // Calculate points for successful trade
    static calculateTradePoints(trade) {
      let points = this.POINT_VALUES.SUCCESSFUL_TRADE;
      
      // Bonus points for quick response and completion
      if (trade.responseTime < 24) points += 5; // Response within 24 hours
      if (trade.completionTime < 72) points += 5; // Completion within 3 days
      
      return points;
    }
  
    // Calculate points for event participation
    static calculateEventPoints(event, isOrganizer) {
      if (isOrganizer) {
        return this.POINT_VALUES.EVENT_CREATED;
      }
      return this.POINT_VALUES.EVENT_ATTENDED;
    }
  
    // Calculate points for community engagement
    static calculateCommunityPoints(action) {
      switch (action) {
        case 'join':
          return this.POINT_VALUES.COMMUNITY_JOINED;
        case 'profile_complete':
          return this.POINT_VALUES.PROFILE_COMPLETED;
        default:
          return 0;
      }
    }
  
    // Calculate points for reviews
    static calculateReviewPoints(reviewType) {
      switch (reviewType) {
        case 'item':
          return this.POINT_VALUES.ITEM_REVIEWED;
        case 'trade':
          return this.POINT_VALUES.TRADE_REVIEWED;
        default:
          return 0;
      }
    }
  
    // Calculate badge points
    static calculateBadgePoints(badge) {
      return badge.pointValue || 0;
    }
  
    // Calculate level based on total points
    static calculateLevel(totalPoints) {
      const levels = [
        { level: 1, minPoints: 0 },
        { level: 2, minPoints: 100 },
        { level: 3, minPoints: 250 },
        { level: 4, minPoints: 500 },
        { level: 5, minPoints: 1000 },
        { level: 6, minPoints: 2000 },
        { level: 7, minPoints: 3500 },
        { level: 8, minPoints: 5000 },
        { level: 9, minPoints: 7500 },
        { level: 10, minPoints: 10000 }
      ];
  
      for (let i = levels.length - 1; i >= 0; i--) {
        if (totalPoints >= levels[i].minPoints) {
          return {
            currentLevel: levels[i].level,
            nextLevelPoints: i < levels.length - 1 ? levels[i + 1].minPoints : null,
            pointsToNextLevel: i < levels.length - 1 ? levels[i + 1].minPoints - totalPoints : 0
          };
        }
      }
  
      return {
        currentLevel: 1,
        nextLevelPoints: levels[1].minPoints,
        pointsToNextLevel: levels[1].minPoints
      };
    }
  
    // Check if user deserves any badges based on points
    static checkPointBasedBadges(totalPoints) {
      const pointBadges = [
        { id: 'novice_trader', name: 'Novice Trader', minPoints: 100 },
        { id: 'intermediate_trader', name: 'Intermediate Trader', minPoints: 500 },
        { id: 'expert_trader', name: 'Expert Trader', minPoints: 1000 },
        { id: 'master_trader', name: 'Master Trader', minPoints: 5000 },
        { id: 'legendary_trader', name: 'Legendary Trader', minPoints: 10000 }
      ];
  
      return pointBadges.filter(badge => totalPoints >= badge.minPoints);
    }
  
    // Get user ranking based on points
    static getUserRanking(userPoints, allUsersPoints) {
      const sortedPoints = allUsersPoints.sort((a, b) => b - a);
      const rank = sortedPoints.indexOf(userPoints) + 1;
      const totalUsers = sortedPoints.length;
      
      return {
        rank,
        percentile: Math.round((1 - (rank / totalUsers)) * 100),
        totalUsers
      };
    }
  }
  
  module.exports = PointCalculator;
  