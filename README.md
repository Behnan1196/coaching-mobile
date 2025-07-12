# Coaching Mobile App

A React Native mobile application for students to video call with their coaches using Stream.io. This app integrates with the existing Next.js coaching web application.

## Features

- 🔐 **Authentication**: Secure login with Supabase
- 📹 **Video Calling**: Cross-platform video calls between mobile students and web coaches
- 👥 **Coach Assignment**: Automatic detection of assigned coaches
- 🎥 **Stream.io Integration**: Uses the same video infrastructure as the web app
- 📱 **Mobile Optimized**: Built specifically for mobile devices with Expo

## Prerequisites

- Node.js 18+ 
- Expo CLI (`npm install -g @expo/cli`)
- iOS Simulator (for iOS development) or Android Emulator (for Android development)
- Stream.io API keys (same as web app)
- Supabase project (same as web app)

## Installation

1. **Navigate to the mobile app directory:**
   ```bash
   cd coaching-mobile
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Setup environment variables:**
   ```bash
   cp env.example .env
   ```
   
   Edit `.env` file with your actual values:
   ```bash
   # Stream.io Configuration (same as web app)
   EXPO_PUBLIC_STREAM_API_KEY=your_stream_api_key_here
   
   # Supabase Configuration (same as web app)
   EXPO_PUBLIC_SUPABASE_URL=your_supabase_url_here
   EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key_here
   
   # Backend API URL (your Next.js app)
   EXPO_PUBLIC_API_URL=https://your-app-domain.com
   ```

4. **For iOS development, install pods:**
   ```bash
   npx pod-install ios
   ```

## Running the App

### Development Mode
```bash
npm start
```

This will start the Expo development server. You can then:
- Press `i` to open iOS Simulator
- Press `a` to open Android Emulator
- Scan the QR code with Expo Go app on your phone

### Platform-specific Commands
```bash
# iOS
npm run ios

# Android  
npm run android

# Web (for testing)
npm run web
```

## Project Structure

```
coaching-mobile/
├── src/
│   ├── components/          # Reusable UI components
│   ├── contexts/            # React contexts (Auth, Stream)
│   │   ├── AuthContext.tsx  # Authentication state management
│   │   └── StreamContext.tsx # Stream.io video state management
│   ├── lib/                 # Utility libraries
│   │   ├── supabase.ts      # Supabase client configuration
│   │   └── stream.ts        # Stream.io utilities
│   ├── navigation/          # Navigation components
│   │   └── AppNavigator.tsx # Main app navigator
│   ├── screens/             # Screen components
│   │   ├── LoginScreen.tsx  # User authentication
│   │   ├── HomeScreen.tsx   # Main dashboard
│   │   └── VideoCallScreen.tsx # Video calling interface
│   └── types/               # TypeScript type definitions
│       └── database.ts      # Database types (matches web app)
├── App.tsx                  # Main app component
├── app.json                 # Expo configuration
├── package.json             # Dependencies and scripts
└── README.md               # This file
```

## Configuration

### Stream.io Setup

The mobile app uses the **same Stream.io API keys** as your web application. This enables seamless cross-platform video calling between mobile students and web coaches.

1. Use the same `STREAM_API_KEY` from your web app
2. The mobile app will automatically generate tokens from your backend API
3. Video calls use the same call IDs, so mobile and web participants can join the same call

### Supabase Setup

The mobile app connects to the **same Supabase database** as your web application:

1. Use the same `SUPABASE_URL` and `SUPABASE_ANON_KEY`
2. The app automatically detects coach-student assignments
3. User authentication works with the same user profiles

### Demo Mode

If Stream.io API keys are not configured, the app runs in demo mode:
- Shows demo interface but video calling won't work
- Displays warning message to configure API keys
- Useful for testing UI without Stream.io setup

## How It Works

### Cross-Platform Video Calling

1. **Student Side (Mobile)**:
   - Student logs in with their credentials
   - App fetches their assigned coach from Supabase
   - Student taps "Start Video Call" button
   - App creates/joins a Stream.io video call with a unique call ID

2. **Coach Side (Web)**:
   - Coach sees the same call ID in their web interface
   - Coach can join the call from their browser
   - Both participants can see and hear each other seamlessly

3. **Call ID Generation**:
   - Uses coach ID + student ID to create unique, predictable call IDs
   - Same call ID is generated on both mobile and web
   - Ensures both participants join the same call room

### Authentication Flow

1. User enters email/password
2. Supabase authenticates and returns user session
3. App fetches user profile and role
4. Stream.io client initializes with user token
5. User can start video calls with their assigned coach

## Testing

### Testing Cross-Platform Video Calls

1. **Setup**: Make sure both web and mobile apps use the same API keys
2. **Create Test Users**: Use your admin panel to create a coach and student
3. **Assign Coach**: Create a coach-student assignment in the database
4. **Login**: Login as student on mobile, coach on web
5. **Start Call**: Student starts call on mobile, coach joins on web

### Demo Mode Testing

1. Don't configure Stream.io API keys (or use demo key)
2. App will show demo interface
3. You can test UI and navigation without video functionality
4. Perfect for development and UI testing

## Troubleshooting

### Common Issues

1. **"Failed to initialize video client"**
   - Check your Stream.io API keys
   - Ensure backend API is running and accessible
   - Verify API URL in environment variables

2. **"No assigned coach found"**
   - Check coach_student_assignments table in Supabase
   - Ensure assignment is marked as `is_active: true`
   - Verify user is logged in as a student

3. **Camera/microphone permissions**
   - Ensure permissions are declared in app.json
   - Grant permissions when prompted on device
   - Test on real device (simulators have limited media support)

4. **Cross-platform calls not working**
   - Verify both apps use same Stream.io API keys
   - Check that call IDs match between mobile and web
   - Ensure both users are in the same call room

### Development Tips

1. **Use real devices** for video calling (simulators have limitations)
2. **Test on same network** for local development
3. **Check browser console** on web app for Stream.io errors
4. **Use React Native Debugger** for debugging mobile app

## Deployment

### Building for Production

```bash
# Create production build
expo build:ios
expo build:android

# Or using EAS Build (recommended)
eas build --platform ios
eas build --platform android
```

### Environment Variables for Production

Make sure to update environment variables for production:
- Use your production Supabase URL
- Use your production API URL (your deployed Next.js app)
- Use production Stream.io API keys

## Related Documentation

- [Stream.io React Native SDK](https://getstream.io/video/docs/reactnative/)
- [Expo Documentation](https://docs.expo.dev/)
- [Supabase React Native Guide](https://supabase.com/docs/guides/getting-started/tutorials/with-expo-react-native)
- [Your Web App README](../README.md)

## Contributing

This mobile app is designed to work seamlessly with the existing web coaching application. When making changes:

1. Ensure compatibility with existing web app features
2. Use the same database schema and API endpoints
3. Test cross-platform video calling functionality
4. Update this README with any new setup requirements 