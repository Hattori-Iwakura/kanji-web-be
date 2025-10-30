# 📧 Mail Service Documentation

## Overview

The Mail Service provides email functionality for the Kanji Learning App, including password reset emails, 2FA OTP emails, welcome emails, and security notifications.

## Features

- ✅ Password reset emails with token
- ✅ Two-factor authentication OTP emails
- ✅ Welcome emails for new users
- ✅ Password changed notifications
- ✅ Beautiful HTML email templates with Handlebars
- ✅ Configurable SMTP settings
- ✅ Support for multiple email providers (Gmail, SendGrid, AWS SES, Outlook)

## Architecture

```
src/shared/mail/
├── mail.module.ts          # Mail module configuration
├── mail.service.ts         # Mail service implementation
└── templates/
    ├── password-reset.hbs  # Password reset email template
    └── 2fa-otp.hbs        # 2FA OTP email template
```

## Configuration

### Environment Variables

Add these variables to your `.env` file:

```env
# App Configuration
APP_NAME=Kanji Learning App
APP_URL=http://localhost:3000

# Mail Configuration
MAIL_HOST=smtp.gmail.com
MAIL_PORT=587
MAIL_USER=your-email@gmail.com
MAIL_PASSWORD=your-app-specific-password
MAIL_FROM=noreply@kanjiapp.com
```

### Provider-Specific Configuration

#### Gmail
1. Enable 2-Step Verification: https://myaccount.google.com/security
2. Create App Password: https://myaccount.google.com/apppasswords
3. Use the 16-digit app password in `MAIL_PASSWORD`

```env
MAIL_HOST=smtp.gmail.com
MAIL_PORT=587
MAIL_USER=your-email@gmail.com
MAIL_PASSWORD=abcd-efgh-ijkl-mnop
```

#### SendGrid
```env
MAIL_HOST=smtp.sendgrid.net
MAIL_PORT=587
MAIL_USER=apikey
MAIL_PASSWORD=SG.your-sendgrid-api-key
```

#### AWS SES
```env
MAIL_HOST=email-smtp.us-east-1.amazonaws.com
MAIL_PORT=587
MAIL_USER=your-smtp-username
MAIL_PASSWORD=your-smtp-password
```

#### Outlook/Office 365
```env
MAIL_HOST=smtp.office365.com
MAIL_PORT=587
MAIL_USER=your-email@outlook.com
MAIL_PASSWORD=your-password
```

## Usage

### In Services

```typescript
import { MailService } from '../../shared/mail/mail.service';

@Injectable()
export class YourService {
  constructor(private readonly mailService: MailService) {}

  async someMethod() {
    // Send password reset email
    await this.mailService.sendPasswordResetEmail(
      'user@example.com',
      'John Doe',
      'abc123token456'
    );

    // Send 2FA OTP email
    await this.mailService.send2FAOtpEmail(
      'user@example.com',
      'John Doe',
      '123456'
    );

    // Send welcome email
    await this.mailService.sendWelcomeEmail(
      'user@example.com',
      'John Doe'
    );

    // Send password changed notification
    await this.mailService.sendPasswordChangedEmail(
      'user@example.com',
      'John Doe'
    );
  }
}
```

## API Methods

### `sendPasswordResetEmail(email, name, token)`
Sends a password reset email with a secure token.

**Parameters:**
- `email` (string): Recipient email address
- `name` (string): Recipient name
- `token` (string): Password reset token

**Email Contents:**
- Reset button with link
- Token copy-paste option
- 1-hour expiration warning
- Security notice

**Template:** `password-reset.hbs`

---

### `send2FAOtpEmail(email, name, otp)`
Sends a two-factor authentication OTP code.

**Parameters:**
- `email` (string): Recipient email address
- `name` (string): Recipient name
- `otp` (string): 6-digit OTP code

**Email Contents:**
- Large, easy-to-read OTP code
- 10-minute expiration notice
- Security warning

**Template:** `2fa-otp.hbs`

---

### `sendWelcomeEmail(email, name)`
Sends a welcome email to new users.

**Parameters:**
- `email` (string): Recipient email address
- `name` (string): Recipient name

**Email Contents:**
- Welcome message
- Feature highlights
- Call-to-action button

**Template:** Inline HTML

---

### `sendPasswordChangedEmail(email, name)`
Sends a notification when password is changed.

**Parameters:**
- `email` (string): Recipient email address
- `name` (string): Recipient name

**Email Contents:**
- Confirmation message
- Security alert if not authorized
- Login button

**Template:** Inline HTML

## Email Templates

### Template Variables

#### `password-reset.hbs`
```handlebars
{{name}}       - User's name
{{resetUrl}}   - Full reset URL with token
{{token}}      - Reset token (for copy-paste)
{{appUrl}}     - Application URL
```

#### `2fa-otp.hbs`
```handlebars
{{name}}       - User's name
{{otp}}        - 6-digit OTP code
{{appUrl}}     - Application URL
```

### Template Styling

All templates feature:
- Responsive design
- Modern gradient colors (#667eea to #764ba2)
- Professional typography
- Security warnings with icons
- Mobile-friendly layout
- Dark/light theme compatible

## Error Handling

### Non-Critical Emails
Welcome and notification emails use fire-and-forget pattern:

```typescript
this.mailService.sendWelcomeEmail(email, name).catch(err => {
  console.error('Failed to send welcome email:', err);
});
```

### Critical Emails
Password reset and 2FA emails throw errors:

```typescript
try {
  await this.mailService.sendPasswordResetEmail(email, name, token);
} catch (error) {
  console.error('Failed to send password reset email:', error);
  // Handle error appropriately
}
```

## Security Considerations

### Email Enumeration Prevention
Always return success messages regardless of whether the email exists:

```typescript
// ✅ Good
return { message: 'If the email exists, a reset link has been sent' };

// ❌ Bad
if (!user) {
  throw new NotFoundException('Email not found');
}
```

### Token Security
- Tokens are cryptographically secure (32 bytes random)
- Tokens expire after 1 hour
- Previous tokens are invalidated on new requests
- Tokens are marked as used after consumption

### OTP Security
- OTPs are 6-digit random numbers
- OTPs expire after 10 minutes
- Previous OTPs are invalidated on new requests
- OTPs are marked as used after verification

## Testing

### Development Mode
In development, tokens may be returned in API responses:

```typescript
return {
  message: 'Reset link sent',
  token: process.env.NODE_ENV === 'development' ? token : undefined,
};
```

### Testing Without Real Email
For testing, you can use services like:
- [Mailtrap](https://mailtrap.io/) - Email testing
- [Ethereal Email](https://ethereal.email/) - Fake SMTP service
- [MailHog](https://github.com/mailhog/MailHog) - Local email testing

Configure `.env` for testing:
```env
MAIL_HOST=smtp.mailtrap.io
MAIL_PORT=2525
MAIL_USER=your-mailtrap-username
MAIL_PASSWORD=your-mailtrap-password
```

## Troubleshooting

### Common Issues

#### 1. Authentication Failed
**Problem:** `Invalid login: 535-5.7.8 Username and Password not accepted`

**Solutions:**
- For Gmail: Use App-Specific Password, not regular password
- Enable "Less secure app access" (not recommended)
- Check if 2-Step Verification is enabled

#### 2. Connection Timeout
**Problem:** `ETIMEDOUT` or `ESOCKET`

**Solutions:**
- Check firewall settings
- Verify SMTP port (587 for TLS, 465 for SSL)
- Try different SMTP host

#### 3. Templates Not Found
**Problem:** `Template not found: password-reset`

**Solutions:**
- Verify template files exist in `src/shared/mail/templates/`
- Check template file extensions (`.hbs`)
- Ensure MailModule is imported in AuthModule

#### 4. Emails Going to Spam
**Solutions:**
- Set up SPF, DKIM, and DMARC records
- Use a verified sending domain
- Avoid spam trigger words
- Include unsubscribe link

## Production Checklist

- [ ] Configure production SMTP credentials
- [ ] Set up custom domain for `MAIL_FROM`
- [ ] Configure SPF/DKIM/DMARC records
- [ ] Test email delivery to major providers (Gmail, Outlook, Yahoo)
- [ ] Set up email logging/monitoring
- [ ] Configure rate limiting for email sending
- [ ] Add retry logic for failed emails
- [ ] Set up email queue (optional, for high volume)
- [ ] Remove development tokens from responses
- [ ] Test all email templates on multiple devices

## Monitoring

### Email Delivery Tracking
Consider adding:
- SendGrid Event Webhook
- AWS SES Configuration Set
- Mailgun Event Tracking
- Custom email logging

### Metrics to Monitor
- Email delivery rate
- Bounce rate
- Spam complaints
- Open rate (if tracking enabled)
- Time to delivery

## Future Enhancements

- [ ] Email queue with Bull/Redis
- [ ] Email templates in database
- [ ] Multi-language support
- [ ] Custom email themes per user
- [ ] Email preferences management
- [ ] Transactional email analytics
- [ ] A/B testing for email content
- [ ] Rich text editor for admin
- [ ] Email scheduling
- [ ] Batch email sending

## Related Documentation

- [Auth Module Documentation](../modules/auth/README.md)
- [Password Reset Flow](../modules/auth/PASSWORD_RESET.md)
- [2FA Implementation](../modules/auth/TWO_FACTOR_AUTH.md)
- [Environment Configuration](.env.example)

---

**Last Updated:** 2025-10-24  
**Module Version:** 1.0.0  
**Dependencies:**
- `@nestjs-modules/mailer` ^2.0.2
- `nodemailer` ^7.0.10
- `handlebars` ^4.7.8
