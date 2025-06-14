# BarterKita Backend API

A Node.js backend service for the BarterKita application, providing APIs for user authentication, item trading, community events, and gamification features.

## Technologies Used

- Node.js
- Express.js
- Firebase Authentication
- Cloud Firestore
- Google Maps API

## Project Structure

```
barterkita-backend/
│
├── src/
│   ├── config/                # Configuration files
│   │   ├── firebase.js       # Firebase setup
│   │   └── env.js           # Environment variables
│   │
│   ├── controllers/          # Business logic
│   │   ├── authController.js
│   │   ├── userController.js
│   │   ├── itemController.js
│   │   ├── eventController.js
│   │   └── badgeController.js
│   │
│   ├── routes/               # API routes
│   │   ├── authRoutes.js
│   │   ├── userRoutes.js
│   │   ├── itemRoutes.js
│   │   ├── eventRoutes.js
│   │   └── badgeRoutes.js
│   │
│   ├── middleware/           # Middleware functions
│   │   ├── authMiddleware.js
│   │   └── errorHandler.js
│   │
│   ├── models/              # Data models
│   │   ├── User.js
│   │   ├── Item.js
│   │   ├── Event.js
│   │   └── Badge.js
│   │
│   ├── utils/               # Helper functions
│   │   ├── communityVerifier.js
│   │   └── pointCalculator.js
│   │
│   └── index.js            # Application entry point
```

## Setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Create a `.env` file in the root directory with the following variables:

   ```
   PORT=3000
   FIREBASE_PROJECT_ID=your-project-id
   GOOGLE_MAPS_API_KEY=your-api-key
   NODE_ENV=development
   ```

3. Add your Firebase service account key to `src/config/serviceAccountKey.json`

4. Start the server:
   ```bash
   npm start
   ```

## API Endpoints

### Authentication

- POST `/api/auth/register` - Register new user
- POST `/api/auth/login` - Login user
- POST `/api/auth/reset-password` - Request password reset
- GET `/api/auth/profile` - Get user profile
- PUT `/api/auth/profile` - Update user profile

### Users

- GET `/api/users/:userId` - Get user by ID
- POST `/api/users/:userId/points` - Update user points
- POST `/api/users/:userId/verify-community` - Verify community code

### Items

- GET `/api/items/search` - Search items
- GET `/api/items/:itemId` - Get item by ID
- POST `/api/items` - Create new item
- PUT `/api/items/:itemId` - Update item
- DELETE `/api/items/:itemId` - Delete item
- POST `/api/items/:itemId/trade-request` - Send trade request
- POST `/api/items/:itemId/trade-response` - Respond to trade request

### Events

- GET `/api/events` - List events
- GET `/api/events/:eventId` - Get event by ID
- POST `/api/events` - Create new event
- PUT `/api/events/:eventId` - Update event
- POST `/api/events/:eventId/join` - Join event
- POST `/api/events/:eventId/leave` - Leave event
- POST `/api/events/:eventId/comment` - Add comment
- POST `/api/events/:eventId/rating` - Rate event

### Badges

- GET `/api/badges` - List badges
- GET `/api/badges/:badgeId` - Get badge by ID
- GET `/api/badges/progress/:userId` - Check badge progress
- POST `/api/badges` - Create new badge (admin only)
- POST `/api/badges/:badgeId/award/:userId` - Award badge to user (admin only)

## Features

- User authentication and profile management
- Item listing and trading system
- Community events organization
- Gamification with points and badges
- Community verification system
- Location-based item search
- Real-time updates using Firebase
- Error handling and input validation
- Admin functionality for badge management

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License.
