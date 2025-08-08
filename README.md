# RepairRight Server

A Node.js/Express backend for RepairRight — a full‑stack home repair and service booking platform that connects homeowners with professional service providers.

## Overview

RepairRight is a comprehensive, full-stack home repair and service booking platform that bridges the gap between homeowners and professional service providers. Built with modern web technologies, it offers a seamless experience for booking, managing, and tracking home repair services with real-time updates and secure authentication.

- Homeowners: Find and book trusted repair professionals easily
- Service Providers: Manage services, bookings, and grow their business
- Business: Create a reliable marketplace for home repair services
- Technology: Showcase modern full-stack development practices

## Tech Stack

- Node.js + Express
- MongoDB (Atlas)
- Firebase Admin (JWT verification)
- Vercel Serverless-friendly configuration
- dotenv, cors

## Requirements

- Node.js 18+
- A MongoDB Atlas cluster and credentials
- A Firebase project with a Service Account key

## Quick Start

1. Clone and install

```pwsh
npm install
```

2. Configure environment variables

Create a `.env` file (see `.env.example` below) and set:

- PORT (optional)
- DB_USER and DB_PASSWORD
- FB_SERVICE_KEY as a base64-encoded Firebase Service Account JSON

Tip: Use `keyConvert.js` to convert your `serviceAccountKey.json` to base64:

```pwsh
node keyConvert.js > fb_key.b64
# then paste the single-line output into FB_SERVICE_KEY
```

3. Run locally

```pwsh
npm run start
# or
npm run dev
```

The server starts on http://localhost:3000 (or the configured PORT).

## Environment Variables (.env)

```
PORT=3000
DB_USER=yourMongoUser
DB_PASSWORD=yourMongoPassword
# Base64 of Firebase Admin service account JSON
FB_SERVICE_KEY=eyJ0eXAiOiJKV1QiLC4uLg==
```

## API Endpoints

All JSON bodies unless noted. Authenticated routes require an Authorization header: `Bearer <Firebase ID token>`.

Public

- GET / — Health check (Welcome message)
- GET /services — List all services
- GET /services/:id — Get a service by ID

Authenticated

- POST /services — Create a service (provider metadata inferred from token)
- GET /my-services — List services created by the authenticated provider
- PUT /services/:id — Update own service
- DELETE /services/:id — Delete own service
- GET /bookings/check/:serviceId/:userEmail — Check if current user booked a service
- POST /bookings — Create a booking (prevents self‑booking and duplicates)
- GET /my-bookings — Bookings created by current user
- GET /service-to-do — Bookings where current user is the provider
- PATCH /bookings/:id/status — Provider updates booking `serviceStatus`

### Notes on Auth

- Tokens are verified with Firebase Admin. The decoded token injects `req.user`.
- For `bookings` operations, the server prevents users from booking their own service and from double-booking the same service.

## Deployment

### Vercel

This repo includes `vercel.json` configured for Node entry `index.js`.

1. Set environment variables in Vercel Project Settings:
   - DB_USER, DB_PASSWORD, FB_SERVICE_KEY, PORT (optional)
2. Deploy via Git integration or `vercel` CLI.

### MongoDB

- The code expects an Atlas cluster name `RepairRight` in the connection string. Ensure your cluster/app name matches or adjust `uri` in `index.js`.

## Development Tips

- Use `keyConvert.js` to generate the base64 service key for `FB_SERVICE_KEY`.
- `ObjectId` is used for route params like `/services/:id` and `/bookings/:id`.
- CORS is enabled globally; configure origins in production as needed.

## License

ISC
