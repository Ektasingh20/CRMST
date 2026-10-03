## ImageKit uploads

Copy `.env.example` to `.env` and add the ImageKit private key, public key, and URL endpoint. The backend signs short-lived uploads at `/api/courses/upload-auth`; the private key is never sent to the browser.
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

## WhatsApp messages and demo payment links

Firestore stores each training/service message and its payment link together in `whatsappMessages/{templateId}`. Message fields include `type`, `title`, `message`, `amount`, `active`, and `order`; the nested `paymentLink` field contains `url`, `amount`, `active`, and `demo`. Shared Greeting and Payment wording lives in `whatsappMessages/config` (`greetingMessage`, `paymentMessage`, `demoPaymentMessage`, and `demoPaymentUrl`). The frontend fetches these values from Firestore, so editing them changes new message previews without a frontend code change. The old `messageTemplates`, `paymentLinks`, and `messageLogs` collections are not used by the application.

Demo links use `/demo-payment.html` for a local QR preview. The WhatsApp modal shares a clearly labeled `https://example.com/` placeholder for demo links so recipients never receive `localhost`. This example link cannot collect payments. For a real payment flow, set `paymentLink.url` to a public absolute URL and `paymentLink.demo` to `false`. If a non-demo URL is relative, set `VITE_PUBLIC_APP_URL` to the publicly deployed frontend URL before building. The local QR preview is visual only and cannot collect payments.
