# Instagram clone (MERN)

React + Vite client, Express + MongoDB + Socket.io server. Icons: Remix Icon. Font: Figtree.

## Features
- **Auth:** signup with email confirmation code (OTP), login, logout, forgot / reset password (by username or email),
  change password, short-lived access token + rotating httpOnly refresh cookie, login lockout, rate limits.
- **App:** feed (infinite scroll), posts, reels, stories (24h), like, comment, share, save, follow / unfollow,
  explore + search, hashtags, realtime chat (DM) with typing + online status, realtime notifications, dark mode.
- **Edit & delete:** edit caption (shows "Edited"), delete post / reel / story / comment, unsend messages,
  edit profile (name, username, bio, photo), story viewers list.

## Run
Needs Node 18+ and MongoDB (local, or an Atlas URI).

```bash
cd server
npm install
cp .env.example .env     # Windows: copy .env.example .env   -> then edit MONGO_URI and JWT_SECRET
npm run dev              # http://localhost:5000

cd ../client
npm install
npm run dev              # http://localhost:5173
```

If you already have a `server/.env` from an older version, keep it and just add the new variables from `.env.example`
(`CLIENT_URL`, `DEV_SHOW_OTP`, `SMTP_*`, `MAIL_FROM`). Run `npm install` in `server` again (new packages).

## Email / OTP not arriving?
The server prints its email status when it starts:
- `[mail] SMTP is NOT configured` -> **no real email is sent.** The code / reset link is printed in the server terminal and,
  because `DEV_SHOW_OTP=true`, also shown on screen in a yellow "Development mode" box. This is normal in development.
- `[mail] SMTP ready` -> real emails are sent.
- `[mail] SMTP connection FAILED` -> wrong SMTP settings (the exact error is printed).

To send real emails with Gmail:
1. Turn on 2-step verification for your Google account, then create an **App Password**: https://myaccount.google.com/apppasswords
2. In `server/.env`:
   ```
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_USER=yourname@gmail.com
   SMTP_PASS=the_16_character_app_password
   MAIL_FROM="Instagram <yourname@gmail.com>"
   ```
3. Restart the server and check for `[mail] SMTP ready`. Check the Spam folder too.

For production set `NODE_ENV=production` (hides the on-screen code, enables Secure cookies) and `RATE_LIMIT_DISABLED=false`.

## Notes
- Birthday is only used for a 13+ age check. Terms / Privacy / Cookies pages are short plain-language summaries.
- `assets/logo-original.png` is the logo image you supplied; the app uses a crisp SVG version (`client/public/logo.svg`).
- To rename the app, change `APP_NAME` in `client/src/config.js` and the logo/title in `client/index.html`.
