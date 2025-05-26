const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  storageBucket: '${process.env.FIREBASE_PROJECT_ID}.appspot.com'
});

const db = admin.firestore();
const auth = admin.auth();

module.exports = { admin, db, auth };
