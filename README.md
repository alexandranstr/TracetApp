# 🌍 Tracet — Travel Journal & Map App

**Tracet** is a travel journal and social map. Travellers drop pins on the places they visit, keep a journal with photos and ratings, share their public pins with friends, chat in real time, and ask an AI travel assistant for personalised suggestions.

---

## Features

- **Interactive map:** drop pins anywhere, search places with Google Places, see your own and your friends' pins.
- **Travel journal:** photos, notes, ratings, tags and statistics (countries, cities, categories, pins per month).
- **Friends:** search users, send and accept friend requests, block and unblock.
- **Chat:** real-time messages and photos with typing indicators, read receipts and custom themes.
- **AI travel assistant:** Gemini, with Tracey (a local Ollama model) as an alternative; it knows your saved places and interests.
- **Recommendations:** places you have not visited, ranked by how well their tags match yours.
- **Accounts:** Firebase sign-in (email, Google), profile, optional SMS second step, full account deletion.

---

## Repository layout

```
TracetApp/
├── backend/                   ASP.NET Core API (.NET 10), Clean Architecture
│   ├── Tracet.Domain/         entities, enums, constants (no dependencies)
│   ├── Tracet.Application/    business logic, one folder per feature
│   ├── Tracet.Infrastructure/ database, Firebase, Gemini, Tracey
│   ├── Tracet.Api/            controllers, SignalR hub, startup
│   ├── Tracet.Tests/          integration tests
│   └── data/                  local only, never committed: tracet.db, serviceAccountKey.json
├── frontend/                  React Native app (Expo SDK 57)
└── Tracet.slnx                open this in Rider: the 5 backend projects + frontend
```

---

## Running the backend

```bash
cd backend/Tracet.Api
dotnet user-secrets set GeminiApiKey "<your-gemini-key>"
dotnet run
```

The API listens on `http://0.0.0.0:5001`. It needs `serviceAccountKey.json` (Firebase Admin) in `backend/data`, or its path in `FIREBASE_SERVICE_ACCOUNT_KEY_PATH`. The SQLite database is created at `backend/data/tracet.db`. All photos are stored in Firebase Storage. Tracey needs Ollama running locally (`Ollama:BaseUrl`, default `http://localhost:11434`).

## Running the app

```bash
cd frontend
npm install
npx expo start --dev-client
```

Create `frontend/.env` with `EXPO_PUBLIC_API_URL` (your computer's network address, e.g. `http://192.168.1.8:5001`), `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY` and `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`. Native builds: `npx expo run:ios --device` or `npx expo run:android`.

## Tests

```bash
dotnet test Tracet.slnx
cd frontend && npm test
```

GitHub Actions runs both suites on every push and pull request.
