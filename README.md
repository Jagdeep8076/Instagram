# Instaclone (MERN Stack)

A modern, full-featured Instagram-style web application built with Express, MongoDB, Socket.io, React, and Vite. Designed with Google Fonts **Figtree** typography, **Remix Icon** iconography, and pixel-close auth pages supporting dark and light themes.

---

## Highlights & Features

### 1. English-Only UI & Empty States
- 100% natural English across the entire client and server: all UI text, buttons, placeholders, notifications, toasts, and API error/success responses. Zero Hinglish.
- Custom Remix Icon empty states with bold headings and contextual helper text across Notifications, Feed, Messages, Reels, Saved, Search, and Comments.

### 2. Reference-Matched Auth Architecture
- **Branding**: `APP_NAME = "Instaclone"` with a custom gradient camera glyph (`ri-camera-lens-line`).
- **Typography & Theme**: Google Fonts **Figtree** (400, 500, 600, 700) for the whole application with dark mode (`#1f1f1f`) and light mode (`#ffffff`) matching design tokens.
- **Form Controls**: ~56px tall inputs with smooth floating labels, 18px border radius, and full-width pill buttons (solid blue primary, grey secondary, and blue outline).
- **Dedicated Routes**:
  - `/login` - Log into Instaclone with username/email and password with toggleable eye visibility.
  - `/accounts/password/reset` - Find your account with masked email hint and recovery assistance modal.
  - `/accounts/password/reset/confirm/:token` - Set a new password and revoke previous sessions.
  - `/accounts/emailsignup` - Signup with live debounced username check, password strength hint, age >= 13 birthday validation, and legal policy modals.
  - `/accounts/confirm-email` - 6-digit email confirmation code verification with 10-minute expiry and 60-second resend cooldown.

### 3. Solid Security & Authentication
- **Password Security**: `bcryptjs` with 12 salt rounds, minimum 8 characters, and common password blacklist protection.
- **Dual-Token Architecture**: Short-lived access JWT (15 min) paired with a 30-day cryptographically secure refresh token stored in an `httpOnly`, `SameSite=Strict` cookie (`Secure` in production) with rotation and server-side revocation.
- **Axios Interceptor**: Automatically intercepts 401 Unauthorized responses, silently refreshes the access token via `/api/auth/refresh`, and retries the original request.
- **Socket.io Authentication**: Authenticates socket connections with the active access token and re-authenticates automatically upon token rotation.
- **Hardening**: `helmet`, strict CORS with credentials support, `express-rate-limit` on all auth routes, and temporary account lockout (15 min) after 5 consecutive failed logins.

### 4. Complete Edit & Delete Ownership
- **Posts & Reels**: Inline caption editing from the `...` menu with an "Edited" badge indicator and updated hashtags; deletion with confirmation dialog and automatic disk cleanup from `/uploads`.
- **Stories**: 24-hour auto-expiring stories; authors can delete their own stories (with disk file removal) and inspect a real-time list of viewers.
- **Comments**: Authors can delete their own comments; post owners can delete any comment on their posts.
- **Direct Messages**: Live Socket.io chat with typing indicators and online presence; authors can unsend their messages (soft-delete displaying "Message unsent" live to both sender and receiver).
- **Profile Customization**: Edit full name, bio, and username (with live availability check); upload or remove profile avatar; in-app password change requiring current password verification.

---

## Environment Variables

Copy `.env.example` in `/server` to `.env`:

```bash
cp server/.env.example server/.env
```

| Variable | Description | Default / Example |
| :--- | :--- | :--- |
| `PORT` | Backend server port | `5001` (or `5000`) |
| `NODE_ENV` | Environment (`development` or `production`) | `development` |
| `CLIENT_URL` | Allowed client URL for CORS & cookies | `http://localhost:5173` |
| `MONGO_URI` | MongoDB connection URI (Local or Atlas) | `mongodb://127.0.0.1:27017/instaclone` |
| `JWT_SECRET` | Secret for short-lived access JWTs (15 min) | Random 32+ char string |
| `JWT_REFRESH_SECRET`| Secret for refresh tokens (30 days) | Random 32+ char string |
| `SMTP_HOST` | *(Optional)* SMTP host for email sending | `smtp.gmail.com` |
| `SMTP_PORT` | *(Optional)* SMTP port | `587` |
| `SMTP_USER` | *(Optional)* SMTP username | `your_email@gmail.com` |
| `SMTP_PASS` | *(Optional)* SMTP app password | `your_app_password` |
| `SMTP_FROM` | *(Optional)* From address in outgoing emails | `"Instaclone Support" <no-reply@instaclone.com>` |

---

## Local Development & Setup

### Requirements
- **Node.js** 18+
- **MongoDB** (Local instance or MongoDB Atlas cluster)

### 1. Backend Server
```bash
cd server
npm install
npm run dev
```
The server will connect to MongoDB and start listening on port `5001`.

### 2. Frontend Client
```bash
cd client
npm install
npm run dev
```
Open `http://localhost:5173` (or `http://localhost:5174`) in your browser.

---

## How to Test Email Flows Locally (No SMTP Required)

In local development, if SMTP environment variables are omitted, **Instaclone automatically falls back to secure server console dispatch**:

1. **Email Verification Code**:
   - Register a new account at `/accounts/emailsignup`.
   - Submit the form; you will be redirected to `/accounts/confirm-email`.
   - Look at the terminal running `server`: you will see an eye-catching box:
     ```text
     ================================================================
      [DEV EMAIL DISPATCH]
      To:      your_email@example.com
      Subject: 849301 is your Instaclone confirmation code
      Body:
     Welcome to Instaclone!
     Your 6-digit verification code is: 849301
     ================================================================
     ```
   - Enter the 6-digit code on the webpage to activate your account and log in.

2. **Password Recovery**:
   - Navigate to `/accounts/password/reset`.
   - Enter your username or email address and click **Continue**.
   - The terminal running `server` will print the password reset link:
     ```text
     ================================================================
      [DEV EMAIL DISPATCH]
      To:      your_email@example.com
      Subject: Reset your Instaclone password
      Body:
     Click the link below to set a new password:
     http://localhost:5173/accounts/password/reset/confirm/<token>
     ================================================================
     ```
   - Click the link or open it in your browser, enter your new password, and submit. You will be redirected to `/login` with a success notice.

---

## Running Verification Tests

Automated end-to-end tests using headless Chrome and Puppeteer are included:

```bash
# Test Auth Pages & Screenshot Reference Match
node test_auth_pages.js

# Complete End-to-End Test (Signup, Code, Reset, Edit, Delete, Unsend)
node test_e2e_complete.js
```
Screenshots are saved directly to the screenshots directory for inspection.
