class User {
    constructor(data) {
      this.uid = data.uid;
      this.email = data.email;
      this.displayName = data.displayName;
      this.phoneNumber = data.phoneNumber;
      this.photoURL = data.photoURL;
      this.location = data.location || null; // { lat: number, lng: number }
      this.communityCode = data.communityCode || null;
      this.isVerified = data.isVerified || false;
      this.points = data.points || 0;
      this.badges = data.badges || [];
      this.createdAt = data.createdAt || new Date().toISOString();
      this.updatedAt = new Date().toISOString();
    }
  
    // Validate user data
    static validate(data) {
      const errors = [];
  
      if (!data.email || !data.email.includes('@')) {
        errors.push('Valid email is required');
      }
  
      if (data.phoneNumber && !/^\+?[\d\s-]{10,}$/.test(data.phoneNumber)) {
        errors.push('Invalid phone number format');
      }
  
      if (data.location) {
        if (!data.location.lat || !data.location.lng) {
          errors.push('Location must include latitude and longitude');
        }
        if (data.location.lat < -90 || data.location.lat > 90) {
          errors.push('Invalid latitude value');
        }
        if (data.location.lng < -180 || data.location.lng > 180) {
          errors.push('Invalid longitude value');
        }
      }
  
      return errors;
    }
  
    // Convert to Firestore data
    toFirestore() {
      return {
        uid: this.uid,
        email: this.email,
        displayName: this.displayName,
        phoneNumber: this.phoneNumber,
        photoURL: this.photoURL,
        location: this.location,
        communityCode: this.communityCode,
        isVerified: this.isVerified,
        points: this.points,
        badges: this.badges,
        createdAt: this.createdAt,
        updatedAt: this.updatedAt
      };
    }
  
    // Create from Firestore data
    static fromFirestore(data, id) {
      return new User({
        uid: id,
        ...data
      });
    }
  }
  
  module.exports = User;
  