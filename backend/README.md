# CRM Backend

This backend is built with Node.js and Express, using Firebase Admin for Firestore database access.

## Available endpoints

- `POST /api/auth/login` - login with `username` and `password`
- `POST /api/auth/signup` - signup with `name`, `username`, and `password`
- `GET /api/users` - get all users (requires `Authorization: Bearer <token>`)
- `POST /api/users` - create a new user (requires auth)
- `GET /api/leads` - get all leads (requires auth)
- `POST /api/leads` - add a new lead (requires auth)

## Local development

1. Copy `.env.example` to `.env`
2. Set `JWT_SECRET` and `FIREBASE_SERVICE_ACCOUNT_PATH`
3. Run `npm install`
4. Run `npm run dev:api`

## Vercel deployment notes

- Use Vercel environment variables rather than `.env`
- Set `JWT_SECRET`, `FIREBASE_SERVICE_ACCOUNT_BASE64`, and `VITE_API_BASE_URL`
- Deploy using Vercel's Node.js functions or an external backend server on the same domain if needed.
