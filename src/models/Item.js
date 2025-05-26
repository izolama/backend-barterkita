class Item {
    constructor(data) {
      this.id = data.id;
      this.userId = data.userId;
      this.title = data.title;
      this.description = data.description;
      this.category = data.category;
      this.condition = data.condition; // new, like_new, good, fair, poor
      this.images = data.images || [];
      this.location = data.location; // { lat: number, lng: number }
      this.preferredItems = data.preferredItems || []; // What items they want in exchange
      this.status = data.status || 'available'; // available, pending, traded
      this.createdAt = data.createdAt || new Date().toISOString();
      this.updatedAt = new Date().toISOString();
    }
  
    // Validate item data
    static validate(data) {
      const errors = [];
      const conditions = ['new', 'like_new', 'good', 'fair', 'poor'];
      const statuses = ['available', 'pending', 'traded'];
  
      if (!data.title || data.title.trim().length < 3) {
        errors.push('Title must be at least 3 characters long');
      }
  
      if (!data.description || data.description.trim().length < 10) {
        errors.push('Description must be at least 10 characters long');
      }
  
      if (!data.category) {
        errors.push('Category is required');
      }
  
      if (!conditions.includes(data.condition)) {
        errors.push('Invalid condition value');
      }
  
      if (data.status && !statuses.includes(data.status)) {
        errors.push('Invalid status value');
      }
  
      if (!data.location || !data.location.lat || !data.location.lng) {
        errors.push('Valid location with latitude and longitude is required');
      }
  
      if (data.images && (!Array.isArray(data.images) || data.images.length === 0)) {
        errors.push('At least one image is required');
      }
  
      return errors;
    }
  
    // Convert to Firestore data
    toFirestore() {
      return {
        userId: this.userId,
        title: this.title,
        description: this.description,
        category: this.category,
        condition: this.condition,
        images: this.images,
        location: this.location,
        preferredItems: this.preferredItems,
        status: this.status,
        createdAt: this.createdAt,
        updatedAt: this.updatedAt
      };
    }
  
    // Create from Firestore data
    static fromFirestore(data, id) {
      return new Item({
        id,
        ...data
      });
    }
  }
  
  module.exports = Item;
  