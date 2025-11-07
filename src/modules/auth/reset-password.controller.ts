import { Controller, Get, Query, Res } from '@nestjs/common';
import { Response } from 'express';

@Controller('reset-password')
export class ResetPasswordController {
  @Get()
  redirectToApp(@Query('token') token: string, @Res() res: Response) {
    if (!token) {
      return res.status(400).send(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Invalid Reset Link</title>
            <style>
              body { font-family: Arial, sans-serif; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); }
              .container { text-align: center; background: white; padding: 40px; border-radius: 12px; box-shadow: 0 10px 40px rgba(0,0,0,0.2); max-width: 500px; }
              h1 { color: #e74c3c; margin-bottom: 20px; }
              p { color: #666; line-height: 1.6; }
            </style>
          </head>
          <body>
            <div class="container">
              <h1>❌ Invalid Reset Link</h1>
              <p>This password reset link is invalid or has expired.</p>
              <p>Please request a new password reset from the app.</p>
            </div>
          </body>
        </html>
      `);
    }

    // For mobile app, you can use deep link
    const deepLink = `kanjiapp://reset-password?token=${token}`;
    
    // Fallback: Show instructions page with the token
    return res.send(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Reset Your Password</title>
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body { 
              font-family: Arial, sans-serif; 
              display: flex; 
              justify-content: center; 
              align-items: center; 
              min-height: 100vh; 
              margin: 0; 
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              padding: 20px;
            }
            .container { 
              text-align: center; 
              background: white; 
              padding: 40px; 
              border-radius: 12px; 
              box-shadow: 0 10px 40px rgba(0,0,0,0.2);
              max-width: 500px;
              width: 100%;
            }
            h1 { 
              color: #667eea; 
              margin-bottom: 20px;
              font-size: 24px;
            }
            p { 
              color: #666; 
              line-height: 1.6;
              margin-bottom: 20px;
            }
            .token-box {
              background: #f8f9fa;
              border: 2px dashed #667eea;
              border-radius: 8px;
              padding: 20px;
              margin: 20px 0;
              word-break: break-all;
              font-family: monospace;
              font-size: 14px;
              color: #333;
            }
            .btn {
              display: inline-block;
              background: #667eea;
              color: white;
              padding: 12px 30px;
              border-radius: 6px;
              text-decoration: none;
              margin: 10px 5px;
              transition: background 0.3s;
            }
            .btn:hover {
              background: #5568d3;
            }
            .btn-secondary {
              background: #6c757d;
            }
            .btn-secondary:hover {
              background: #5a6268;
            }
            .instructions {
              text-align: left;
              margin-top: 30px;
              padding-top: 30px;
              border-top: 1px solid #ddd;
            }
            .instructions ol {
              padding-left: 20px;
            }
            .instructions li {
              margin-bottom: 10px;
              color: #666;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>🔐 Reset Your Password</h1>
            <p>Click the button below to open the Kanji Learning App and reset your password.</p>
            
            <a href="${deepLink}" class="btn">Open in App</a>
            
            <div class="instructions">
              <h3 style="color: #667eea;">If the app doesn't open automatically:</h3>
              <ol>
                <li>Open the Kanji Learning App on your device</li>
                <li>Go to Login page → "Forgot Password?"</li>
                <li>Copy the token below and paste it when prompted:</li>
              </ol>
              
              <div class="token-box">
                ${token}
              </div>
              
              <button onclick="copyToken()" class="btn btn-secondary">📋 Copy Token</button>
            </div>
            
            <p style="font-size: 12px; color: #999; margin-top: 30px;">
              This link expires in 1 hour. If it has expired, please request a new password reset.
            </p>
          </div>
          
          <script>
            // Try to open the app automatically
            window.location.href = '${deepLink}';
            
            function copyToken() {
              const token = '${token}';
              navigator.clipboard.writeText(token).then(() => {
                alert('Token copied to clipboard! ✓');
              }).catch(() => {
                // Fallback for older browsers
                const textarea = document.createElement('textarea');
                textarea.value = token;
                document.body.appendChild(textarea);
                textarea.select();
                document.execCommand('copy');
                document.body.removeChild(textarea);
                alert('Token copied to clipboard! ✓');
              });
            }
          </script>
        </body>
      </html>
    `);
  }
}
