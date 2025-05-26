class Event {
    constructor(data) {
      this.id = data.id;
      this.title = data.title;
      this.description = data.description;
      this.organizer = data.organizer; // userId of organizer
      this.type = data.type; // 'barter_meetup', 'community_gathering', 'workshop'
      this.date = data.date;
      this.time = data.time;
      this.location = data.location; // { address: string, lat: number, lng: number }
      this.communityCode = data.communityCode;
      this.maxParticipants = data.maxParticipants || null;
      this.participants = data.participants || [];
      this.status = data.status || 'upcoming'; // upcoming, ongoing, completed, cancelled
      this.images = data.images || [];
      this.createdAt = data.createdAt || new Date().toISOString();
      this.updatedAt = new Date().toISOString();
    }
  
    // Validate event data
    static validate(data) {
      const errors = [];
      const eventTypes = ['barter_meetup', 'community_gathering', 'workshop'];
      const statusTypes = ['upcoming', 'ongoing', 'completed', 'cancelled'];
  
      if (!data.title || data.title.trim().length < 5) {
        errors.push('Title must be at least 5 characters long');
      }
  
      if (!data.description || data.description.trim().length < 20) {
        errors.push('Description must be at least 20 characters long');
      }
  
      if (!data.organizer) {
        errors.push('Organizer ID is required');
      }
  
      if (!eventTypes.includes(data.type)) {
        errors.push('Invalid event type');
      }
  
      if (!data.date || !Date.parse(data.date)) {
        errors.push('Valid date is required');
      }
  
      if (!data.time) {
        errors.push('Time is required');
      }
  
      if (!data.location || !data.location.address || !data.location.lat || !data.location.lng) {
        errors.push('Complete location information is required');
      }
  
      if (!data.communityCode) {
        errors.push('Community code is required');
      }
  
      if (data.maxParticipants && typeof data.maxParticipants !== 'number') {
        errors.push('Maximum participants must be a number');
      }
  
      if (data.status && !statusTypes.includes(data.status)) {
        errors.push('Invalid status value');
      }
  
      return errors;
    }
  
    // Convert to Firestore data
    toFirestore() {
      return {
        title: this.title,
        description: this.description,
        organizer: this.organizer,
        type: this.type,
        date: this.date,
        time: this.time,
        location: this.location,
        communityCode: this.communityCode,
        maxParticipants: this.maxParticipants,
        participants: this.participants,
        status: this.status,
        images: this.images,
        createdAt: this.createdAt,
        updatedAt: this.updatedAt
      };
    }
  
    // Create from Firestore data
    static fromFirestore(data, id) {
      return new Event({
        id,
        ...data
      });
    }
  
    // Check if event is full
    isFull() {
      return this.maxParticipants !== null && 
             this.participants.length >= this.maxParticipants;
    }
  
    // Add participant
    addParticipant(userId) {
      if (!this.participants.includes(userId) && !this.isFull()) {
        this.participants.push(userId);
        this.updatedAt = new Date().toISOString();
        return true;
      }
      return false;
    }
  
    // Remove participant
    removeParticipant(userId) {
      const index = this.participants.indexOf(userId);
      if (index > -1) {
        this.participants.splice(index, 1);
        this.updatedAt = new Date().toISOString();
        return true;
      }
      return false;
    }
  }
  
  module.exports = Event;
  