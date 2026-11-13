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
- `GET /api/hr-helpdesk/conversations` - list the signed-in employee's conversations; HR/Admin see all
- `POST /api/hr-helpdesk/conversations` - start a conversation with `{ "subject": "...", "message": "..." }`
- `DELETE /api/hr-helpdesk/conversations/:id` - hide a conversation from the signed-in user's list; other participants retain access
- `GET /api/hr-helpdesk/conversations/:id/messages` - read a conversation (owner or HR/Admin)
- `POST /api/hr-helpdesk/conversations/:id/messages` - send `{ "text": "..." }` (owner or HR/Admin)

Helpdesk data is stored in Firestore at `hrHelpdeskConversations/{conversationId}`. Each conversation's messages are stored under `hrHelpdeskConversations/{conversationId}/messages/{messageId}`. CRM and IT users can only access conversations where they are a participant; HR and Admin can access all conversations. Deleting a conversation adds the signed-in user's ID to `hiddenFor`; it does not delete the conversation or messages for other participants. HR can start a direct conversation by including `employeeId` in the create request.

## Local development

1. Copy `.env.example` to `.env`
2. Set `JWT_SECRET` and `FIREBASE_SERVICE_ACCOUNT_PATH`
3. Run `npm install`
4. Run `npm run dev:api`

## Vercel deployment notes

- Use Vercel environment variables rather than `.env`
- Set `JWT_SECRET`, `FIREBASE_SERVICE_ACCOUNT_BASE64`, and `VITE_API_BASE_URL`
- Deploy using Vercel's Node.js functions or an external backend server on the same domain if needed.
