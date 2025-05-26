require('dotenv').config();

module.exports = {
  port: process.env.PORT || 3000,
  projectId: process.env.FIREBASE_PROJECT_ID,
  googleMapsApiKey: process.env.GOOGLE_MAPS_API_KEY,
  nodeEnv: process.env.NODE_ENV || 'development'
};
