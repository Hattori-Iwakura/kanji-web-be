# Password Reset Flow Testing Guide

## 🔗 Architecture

### Flow Overview
```
User forgot password
    ↓
1. Flutter: Enter email → POST /api/auth/forgot-password
    ↓
2. Backend: Generate token → Log reset link
    ↓
3. User: Click link → GET /reset-password?token=xxx
    ↓
4. Backend: Render HTML page → Attempt deep link
    ↓
5. Flutter: Open ResetPasswordPage(token)
    ↓
6. User: Enter new password → POST /api/auth/reset-password
    ↓
7. Backend: Validate token → Update password
    ↓
8. Flutter: Show success → Navigate to login
```

## 🧪 Testing Steps

### Step 1: Request Password Reset (Flutter)
1. Open Flutter app
2. Navigate to ForgotPasswordPage
3. Enter email: `test@example.com`
4. Tap "Send Reset Link"
5. See success dialog

### Step 2: Get Reset Token (Backend Console)
Check backend terminal for output like:
```
Password reset token for test@example.com: mz8YhWN_7Z9B...
Reset link: http://localhost:3000/reset-password?token=mz8YhWN_7Z9B...
```

### Step 3: Test Web Landing Page (Browser)
1. Copy the reset link from console
2. Open in browser: `http://localhost:3000/reset-password?token=xxx`
3. You should see:
   - Loading animation
   - "Opening the Kanji Learning app..."
   - After 3 seconds: Manual instructions with button

### Step 4: Test Manual Token Entry (Browser)
1. Open: `http://localhost:3000/reset-password-test`
2. Paste token from console
3. Click "Test Reset Link"
4. Should redirect to landing page

### Step 5: Reset Password (Postman/Swagger)
Until deep linking is configured, test API directly:

**POST** `http://localhost:3000/api/auth/reset-password`

**Body:**
```json
{
  "token": "mz8YhWN_7Z9B...",
  "newPassword": "NewPass123!"
}
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Password has been reset successfully"
}
```

### Step 6: Login with New Password
1. Go back to login page
2. Login with new password
3. Should succeed

## 🔗 Deep Link Setup (Next Step)

### For Android (`android/app/src/main/AndroidManifest.xml`)
```xml
<activity
    android:name=".MainActivity"
    ...>
    
    <!-- Deep link intent filter -->
    <intent-filter android:autoVerify="true">
        <action android:name="android.intent.action.VIEW" />
        <category android:name="android.intent.category.DEFAULT" />
        <category android:name="android.intent.category.BROWSABLE" />
        
        <!-- Handle kanji:// scheme -->
        <data
            android:scheme="kanji"
            android:host="reset-password" />
    </intent-filter>
    
    <!-- HTTP/HTTPS fallback -->
    <intent-filter android:autoVerify="true">
        <action android:name="android.intent.action.VIEW" />
        <category android:name="android.intent.category.DEFAULT" />
        <category android:name="android.intent.category.BROWSABLE" />
        
        <data
            android:scheme="https"
            android:host="kanji-app.com"
            android:pathPrefix="/reset-password" />
    </intent-filter>
</activity>
```

### For iOS (`ios/Runner/Info.plist`)
```xml
<key>CFBundleURLTypes</key>
<array>
    <dict>
        <key>CFBundleTypeRole</key>
        <string>Editor</string>
        <key>CFBundleURLName</key>
        <string>com.kanji.app</string>
        <key>CFBundleURLSchemes</key>
        <array>
            <string>kanji</string>
        </array>
    </dict>
</array>

<!-- For Universal Links (https://) -->
<key>com.apple.developer.associated-domains</key>
<array>
    <string>applinks:kanji-app.com</string>
</array>
```

### Flutter Deep Link Handling

**Install package:**
```yaml
dependencies:
  uni_links: ^0.5.1
  # or
  app_links: ^3.5.0  # Newer alternative
```

**In `main.dart`:**
```dart
import 'package:uni_links/uni_links.dart';
import 'dart:async';

class MyApp extends StatefulWidget {
  @override
  State<MyApp> createState() => _MyAppState();
}

class _MyAppState extends State<MyApp> {
  StreamSubscription? _linkSubscription;

  @override
  void initState() {
    super.initState();
    _initDeepLinks();
  }

  Future<void> _initDeepLinks() async {
    // Handle initial link if app was closed
    try {
      final initialLink = await getInitialLink();
      if (initialLink != null) {
        _handleDeepLink(initialLink);
      }
    } catch (e) {
      print('Failed to get initial link: $e');
    }

    // Listen for links while app is running
    _linkSubscription = linkStream.listen(
      (String? link) {
        if (link != null) {
          _handleDeepLink(link);
        }
      },
      onError: (err) {
        print('Deep link error: $err');
      },
    );
  }

  void _handleDeepLink(String link) {
    print('📱 Deep link received: $link');
    
    final uri = Uri.parse(link);
    
    // Handle reset-password deep link
    if (uri.host == 'reset-password' || uri.path == '/reset-password') {
      final token = uri.queryParameters['token'];
      if (token != null) {
        // Navigate to ResetPasswordPage
        Navigator.of(context).pushNamed(
          '/reset-password',
          arguments: token,
        );
      }
    }
  }

  @override
  void dispose() {
    _linkSubscription?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      routes: {
        '/reset-password': (context) {
          final token = ModalRoute.of(context)!.settings.arguments as String;
          return ResetPasswordPage(token: token);
        },
      },
      // ... rest of your app
    );
  }
}
```

## ✅ Verification Checklist

- [ ] Forgot password request returns success
- [ ] Backend logs reset token to console
- [ ] Web landing page renders correctly
- [ ] Manual test page works
- [ ] Token validation works (not expired, not used)
- [ ] Password reset API succeeds
- [ ] Token marked as used after reset
- [ ] Login works with new password
- [ ] Old password no longer works
- [ ] Expired tokens are rejected
- [ ] Used tokens are rejected

## 🚨 Common Issues

### Issue: "Cannot GET /reset-password"
**Solution:** Make sure AuthWebController is registered in AuthModule

### Issue: Deep link doesn't open app
**Solution:** 
1. Check AndroidManifest.xml / Info.plist configuration
2. Test with `adb shell am start -a android.intent.action.VIEW -d "kanji://reset-password?token=test"`
3. Check app is installed on device

### Issue: Token expired
**Solution:** Tokens expire after 1 hour. Request new reset link.

### Issue: Token already used
**Solution:** Each token can only be used once. Request new reset link.

## 📧 Email Integration (Future)

When email service is ready, update `password.service.ts`:

```typescript
async forgotPassword(dto: ForgotPasswordDto) {
  // ... existing code ...

  const resetLink = `${process.env.FRONTEND_URL}/reset-password?token=${token}`;
  
  await this.emailService.send({
    to: user.email,
    subject: 'Reset Your Kanji Learning Password',
    template: 'password-reset',
    context: {
      name: user.account,
      resetLink,
      expiresIn: '1 hour',
    },
  });

  // Remove console.log in production
}
```

## 🎯 Next Steps

1. ✅ Test web landing page
2. ⏳ Configure deep links in Flutter
3. ⏳ Install uni_links package
4. ⏳ Implement deep link handler in main.dart
5. ⏳ Test end-to-end flow
6. ⏳ Setup email service (SendGrid/AWS SES)
7. ⏳ Replace console.log with actual email sending
