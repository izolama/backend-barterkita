const admin = require('firebase-admin');

const sendNotification = async (tokens, notification, data) => {
  try {
    const message = {
      notification: {
        title: notification.title,
        body: notification.body,
      },
      data: data,
      tokens: Array.isArray(tokens) ? tokens : [tokens],
    };

    const response = await admin.messaging().sendMulticast(message);
    console.log('Successfully sent notifications:', response);
    return response;
  } catch (error) {
    console.error('Error sending notification:', error);
    throw error;
  }
};

const sendTopicNotification = async (topic, notification, data) => {
  try {
    const message = {
      notification: {
        title: notification.title,
        body: notification.body,
      },
      data: data,
      topic: topic,
    };

    const response = await admin.messaging().send(message);
    console.log('Successfully sent topic notification:', response);
    return response;
  } catch (error) {
    console.error('Error sending topic notification:', error);
    throw error;
  }
};

const subscribeToTopic = async (tokens, topic) => {
  try {
    const response = await admin.messaging().subscribeToTopic(tokens, topic);
    console.log('Successfully subscribed to topic:', response);
    return response;
  } catch (error) {
    console.error('Error subscribing to topic:', error);
    throw error;
  }
};

const unsubscribeFromTopic = async (tokens, topic) => {
  try {
    const response = await admin.messaging().unsubscribeFromTopic(tokens, topic);
    console.log('Successfully unsubscribed from topic:', response);
    return response;
  } catch (error) {
    console.error('Error unsubscribing from topic:', error);
    throw error;
  }
};

module.exports = {
  sendNotification,
  sendTopicNotification,
  subscribeToTopic,
  unsubscribeFromTopic,
};
