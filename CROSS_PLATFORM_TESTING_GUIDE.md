# Cross-Platform Communication Testing Guide

This guide helps you test the communication features between the web and mobile apps to ensure they work seamlessly together.

## Prerequisites

### Mobile App Setup
1. **Android**: Follow `ANDROID_PUSH_SETUP.md` to configure Firebase
2. **iOS**: Development build with proper certificates
3. **Physical device**: Push notifications don't work on simulators
4. **Network**: Both apps must be connected to the internet

### Web App Setup
1. **Browser**: Chrome/Firefox with notification permissions
2. **HTTPS**: Service worker requires secure context
3. **API URL**: Ensure mobile app points to correct backend URL

## Test Scenarios

### 1. User Authentication & Profile Sync
- [ ] Login with same credentials on both platforms
- [ ] Verify user profile data is identical
- [ ] Check role-based access (student/coach) works on both
- [ ] Confirm coach-student assignments are visible on both

### 2. Online Presence Tracking
- [ ] **Setup**: Login as coach on web, student on mobile (or vice versa)
- [ ] **Test**: 
  - Online status should show "Çevrimiçi" when partner is active
  - Status should change to "Çevrimdışı" when partner closes app
  - Status updates should be near real-time (< 5 seconds)
- [ ] **App states**: Test background/foreground transitions
- [ ] **Network**: Test reconnection after brief disconnection

### 3. Push Notifications (Mobile)
- [ ] **Token Registration**: Check console for successful token registration
- [ ] **Database Storage**: Verify token is saved to `device_tokens` table
- [ ] **Permission**: Ensure notification permissions are granted
- [ ] **Test Notification**: Use in-app test button to verify local notifications work

### 4. Real-time Notifications
- [ ] **Cross-platform**: Send notification from web to mobile
- [ ] **Immediate**: Check mobile receives notification instantly
- [ ] **Persistent**: Verify notification appears even when app is backgrounded
- [ ] **Data**: Confirm notification data/actions work correctly

### 5. Video Call Integration
- [ ] **Initialization**: Both apps should use same Stream.io credentials
- [ ] **Call Creation**: Coach creates call, student receives invitation
- [ ] **Cross-platform**: Web coach can call mobile student (and vice versa)
- [ ] **Call Quality**: Video and audio work properly between platforms
- [ ] **Call Management**: Both participants can mute/unmute, turn video on/off

### 6. Session Management
- [ ] **Session Creation**: Coach creates session on web
- [ ] **Mobile Visibility**: Student sees session on mobile
- [ ] **Notifications**: Student receives notification about new session
- [ ] **Join Session**: Student can join from mobile, coach from web
- [ ] **Time Sync**: Both apps show same session times

## Detailed Test Steps

### Test 1: Complete Communication Flow
1. **Setup**:
   - Coach logs in on web app
   - Student logs in on mobile app
   - Verify both can see each other's online status

2. **Create Session**:
   - Coach creates new coaching session for next day
   - Student should receive push notification on mobile
   - Verify session appears in student's upcoming sessions

3. **Session Reminder**:
   - Wait for or trigger session reminder (15 min before)
   - Student should receive reminder notification
   - Verify notification includes correct session details

4. **Join Session**:
   - Student joins session from mobile
   - Coach joins same session from web
   - Verify both can see and hear each other

### Test 2: Notification Reliability
1. **Foreground Notifications**:
   - Keep mobile app open
   - Send notification from web
   - Verify immediate local notification appears

2. **Background Notifications**:
   - Put mobile app in background
   - Send notification from web
   - Verify push notification appears in system tray

3. **App Closed**:
   - Close mobile app completely
   - Send notification from web
   - Verify push notification still appears

### Test 3: Network Resilience
1. **Connection Loss**:
   - Disconnect internet on one device
   - Wait 30 seconds
   - Reconnect internet
   - Verify presence status updates correctly

2. **Slow Network**:
   - Test with slow 3G connection
   - Verify notifications still arrive (may be delayed)
   - Check video call quality degrades gracefully

## Troubleshooting Common Issues

### Mobile Push Notifications Not Working
1. **Check Firebase Setup**:
   - Verify `google-services.json` is configured
   - Check Firebase project settings
   - Ensure package name matches exactly

2. **Check Permissions**:
   - Verify notification permissions are granted
   - Check device notification settings
   - Ensure app isn't in battery optimization mode

3. **Check Token Registration**:
   - Look for token in console logs
   - Verify token is saved to database
   - Check if token is being sent to API

### Web Real-time Notifications Not Working
1. **Check Service Worker**:
   - Verify service worker is registered
   - Check browser console for errors
   - Ensure HTTPS is being used

2. **Check Supabase Connection**:
   - Verify WebSocket connection is established
   - Check browser network tab for channel subscriptions
   - Ensure API keys are correct

### Video Calls Not Working
1. **Check Stream.io Setup**:
   - Verify API keys match between web and mobile
   - Check Stream.io dashboard for active users
   - Ensure both apps use same environment

2. **Check Permissions**:
   - Verify camera/microphone permissions
   - Check firewall/network restrictions
   - Test with different network connections

## Performance Monitoring

### Metrics to Track
- **Notification Delivery Time**: < 5 seconds for real-time
- **Presence Update Time**: < 3 seconds for status changes
- **Video Call Connection Time**: < 10 seconds to establish
- **Memory Usage**: Monitor for memory leaks during long sessions

### Debugging Tools
- **Mobile**: React Native Debugger, Flipper
- **Web**: Browser DevTools, Network tab
- **Database**: Supabase dashboard, logs
- **Stream.io**: Stream dashboard, call logs

## Success Criteria

### ✅ All tests pass when:
- [ ] Online presence updates reliably between platforms
- [ ] Push notifications arrive on mobile within 5 seconds
- [ ] Real-time notifications work on web immediately
- [ ] Video calls connect successfully cross-platform
- [ ] Session management works seamlessly
- [ ] All features work on both slow and fast networks
- [ ] App recovery works after network interruptions

### 🔄 Test Schedule
- **Daily**: Basic notification and presence tests
- **Weekly**: Full cross-platform communication test
- **Before Release**: Complete test suite with multiple devices
- **Production**: Monitor logs and user reports

## Contact for Issues

If you encounter issues during testing:
1. Check console logs on both platforms
2. Verify network connectivity
3. Confirm all configuration files are correct
4. Check database for proper data storage
5. Review this guide for troubleshooting steps

---

**Note**: This testing guide should be updated as new communication features are added to maintain comprehensive coverage. 