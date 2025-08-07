export const emailTemplates = {
  passwordSetup: (firstName: string, magicLink: string, isAdmin: boolean): string => `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <meta http-equiv="X-UA-Compatible" content="IE=edge">
      <title>Welcome to INSEAT${isAdmin ? ' Admin Portal' : ''}</title>
      <style>
        /* CSS Reset */
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }

        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
          line-height: 1.6;
          color: #2c3e50;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          min-height: 100vh;
          padding: 20px;
        }

        .email-wrapper {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          min-height: 100vh;
          padding: 40px 20px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .container {
          max-width: 600px;
          width: 100%;
          background: #ffffff;
          border-radius: 20px;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.15);
          overflow: hidden;
          position: relative;
        }

        .header {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          padding: 40px 40px 60px;
          text-align: center;
          position: relative;
          overflow: hidden;
        }

        .header::before {
          content: '';
          position: absolute;
          top: -50%;
          right: -50%;
          width: 200%;
          height: 200%;
          background: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs><pattern id="grain" patternUnits="userSpaceOnUse" width="100" height="100"><circle cx="20" cy="20" r="1" fill="white" opacity="0.1"/><circle cx="80" cy="40" r="1.5" fill="white" opacity="0.08"/><circle cx="40" cy="80" r="1" fill="white" opacity="0.12"/></pattern></defs><rect width="100" height="100" fill="url(%23grain)"/></svg>') repeat;
          animation: float 20s ease-in-out infinite;
        }

        @keyframes float {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-20px) rotate(2deg); }
        }

        .logo {
          font-size: 32px;
          font-weight: 800;
          color: white;
          margin-bottom: 10px;
          letter-spacing: -1px;
          position: relative;
          z-index: 2;
          text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
        }

        .admin-badge {
          display: inline-block;
          background: rgba(255, 255, 255, 0.2);
          color: white;
          padding: 4px 12px;
          border-radius: 20px;
          font-size: 12px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          backdrop-filter: blur(10px);
          border: 1px solid rgba(255, 255, 255, 0.3);
        }

        .content {
          padding: 50px 40px;
          background: white;
          position: relative;
        }

        .greeting {
          font-size: 28px;
          font-weight: 700;
          color: #2c3e50;
          margin-bottom: 20px;
          background: linear-gradient(135deg, #667eea, #764ba2);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .description {
          font-size: 16px;
          color: #5a6c7d;
          margin-bottom: 35px;
          line-height: 1.7;
        }

        .cta-button {
          display: inline-block;
          padding: 16px 32px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          text-decoration: none;
          border-radius: 50px;
          font-weight: 600;
          font-size: 16px;
          letter-spacing: 0.5px;
          text-transform: uppercase;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          box-shadow: 0 8px 25px rgba(102, 126, 234, 0.4);
          position: relative;
          overflow: hidden;
          margin: 25px 0;
        }

        .cta-button::before {
          content: '';
          position: absolute;
          top: 0;
          left: -100%;
          width: 100%;
          height: 100%;
          background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.3), transparent);
          transition: left 0.5s;
        }

        .cta-button:hover::before {
          left: 100%;
        }

        .cta-button:hover {
          transform: translateY(-2px);
          box-shadow: 0 12px 35px rgba(102, 126, 234, 0.5);
        }

        .fallback-link {
          background: #f8f9fa;
          border: 2px dashed #e9ecef;
          border-radius: 12px;
          padding: 20px;
          margin: 30px 0;
          font-family: 'Courier New', monospace;
          font-size: 14px;
          word-break: break-all;
          color: #6c757d;
        }

        .security-notice {
          background: linear-gradient(135deg, #ffeaa7, #fab1a0);
          border-left: 4px solid #e17055;
          padding: 20px;
          border-radius: 0 12px 12px 0;
          margin: 30px 0;
          position: relative;
        }

        .security-notice::before {
          content: '⚠️';
          position: absolute;
          left: -12px;
          top: 20px;
          background: #e17055;
          width: 24px;
          height: 24px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 12px;
        }

        .security-notice p {
          margin: 0;
          font-weight: 600;
          color: #8b4513;
        }

        .footer {
          background: #f8f9fa;
          padding: 30px 40px;
          border-top: 1px solid #e9ecef;
          text-align: center;
        }

        .footer-text {
          font-size: 13px;
          color: #6c757d;
          line-height: 1.6;
          margin-bottom: 15px;
        }

        .divider {
          width: 60px;
          height: 3px;
          background: linear-gradient(135deg, #667eea, #764ba2);
          margin: 30px auto;
          border-radius: 2px;
        }

        /* Responsive Design */
        @media screen and (max-width: 640px) {
          .email-wrapper {
            padding: 20px 10px;
          }
          
          .container {
            border-radius: 15px;
          }
          
          .header, .content, .footer {
            padding: 30px 25px;
          }
          
          .logo {
            font-size: 28px;
          }
          
          .greeting {
            font-size: 24px;
          }
          
          .cta-button {
            padding: 14px 28px;
            font-size: 15px;
          }
        }

        /* Dark mode support */
        @media (prefers-color-scheme: dark) {
          .container {
            background: #1a1a1a;
          }
          
          .content {
            background: #1a1a1a;
          }
          
          .greeting {
            color: #ffffff;
          }
          
          .description {
            color: #b0b0b0;
          }
          
          .footer {
            background: #2a2a2a;
            border-top-color: #404040;
          }
          
          .footer-text {
            color: #888888;
          }
          
          .fallback-link {
            background: #2a2a2a;
            border-color: #404040;
            color: #b0b0b0;
          }
        }
      </style>
    </head>
    <body>
      <div class="email-wrapper">
        <div class="container">
          <div class="header">
            <div class="logo">
              INSEAT
              ${isAdmin ? '<div class="admin-badge">Admin Portal</div>' : ''}
            </div>
          </div>
          
          <div class="content">
            <h1 class="greeting">Welcome${firstName ? `, ${firstName}` : ''}! 👋</h1>
            
            <p class="description">
              We're excited to have you join our platform! Your ${isAdmin ? 'administrative ' : ''}account has been successfully created, and you're just one step away from getting started.
            </p>
            
            <p class="description">
              Click the button below to set up your secure password and activate your account:
            </p>
            
            <div style="text-align: center;">
              <a href="${magicLink}" class="cta-button">
                ${isAdmin ? 'Activate Admin Account' : 'Set Up Password'}
              </a>
            </div>
            
            <div class="divider"></div>
            
            <p style="color: #6c757d; font-size: 14px; margin-bottom: 15px;">
              If the button above doesn't work, copy and paste this secure link into your browser:
            </p>
            
            <div class="fallback-link">
              ${magicLink}
            </div>
            
            <div class="security-notice">
              <p>🔒 This secure link expires in 1 hour for your protection</p>
            </div>
          </div>
          
          <div class="footer">
            <p class="footer-text">
              If you didn't request this account, please ignore this email or contact our support team.
            </p>
            <p class="footer-text">
              This is an automated message — please don't reply to this email.
            </p>
            <div style="margin-top: 20px; font-size: 12px; color: #adb5bd;">
              © 2025 INSEAT. All rights reserved.
            </div>
          </div>
        </div>
      </div>
    </body>
    </html>
  `,
};