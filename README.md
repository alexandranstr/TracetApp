# 🌍 Tracet — Travel Journal & Map App

**Tracet** is a travel journal and social map. Travellers drop pins on the places they visit, keep a journal with photos and ratings, share their public pins with friends, chat in real time, and ask an AI travel assistant for personalised suggestions.

---

## Features

- **Interactive map:** drop pins anywhere, search places with Google Places, see your own and your friends' pins.
- **Travel journal:** photos, notes, ratings, tags and statistics (countries, cities, categories, pins per month).
- **Friends:** search users, send and accept friend requests, block and unblock.
- **Chat:** real-time messages and photos with read receipts and custom themes.
- **AI travel assistant:** Gemini, with Tracey (a local Ollama model) as an alternative; it knows your saved places and interests.
- **Recommendations:** places you have not visited, ranked by how well their tags match yours.
- **Accounts:** Firebase sign-in (email, Google), profile, optional SMS second step, full account deletion.

## Tech stack

| Part | Technology |
|---|---|
| App | React Native 0.86, Expo SDK 57 (development build), TypeScript |
| API | ASP.NET Core (.NET 10), Entity Framework Core, SQLite, SignalR |
| Sign-in and photos | Firebase Authentication, Firebase Storage |
| Maps | Google Maps, Google Places, OpenStreetMap (city outlines) |
| AI | Google Gemini, Ollama (Tracey) |
| Tests | xUnit (API), Jest (app), GitHub Actions |

---

## Architecture

The repository holds two separate programs that talk over HTTP and a SignalR WebSocket.

- **Backend: Clean Architecture.** One project per layer. Dependencies point inward: `Domain` knows nothing, `Application` only knows `Domain`, and `Infrastructure` and `Api` plug into `Application`.
- **Frontend: Feature-based architecture.** Code is grouped by what the user can do. Each feature folder holds its own API calls, types, hooks and screens; screens never call `fetch` themselves.

```
TracetApp/
├── Tracet.slnx                  open this in Rider: backend projects + frontend
├── backend/
│   ├── Tracet.Domain/           entities, enums, constants
│   ├── Tracet.Application/      use cases and rules, one folder per feature
│   ├── Tracet.Infrastructure/   database, migrations, Firebase, Gemini, Tracey
│   ├── Tracet.Api/              controllers, SignalR hub, startup (the program you run)
│   ├── Tracet.Tests/            integration tests
│   └── data/                    local only: tracet.db, serviceAccountKey.json
└── frontend/
    ├── app.config.ts            Expo app config
    ├── firebase/                local only: Firebase app config files
    └── src/
        ├── index.ts             app entry
        ├── api/                 shared HTTP client (server address, token, timeouts, errors)
        ├── navigation/          first screen: welcome, onboarding or map
        ├── shared/              Photo component, image upload
        └── features/
            ├── auth/            sign-in, sign-up, onboarding
            ├── map/             map screen, markers, place search
            ├── pins/            create, edit, share pins
            ├── journal/         journal and statistics
            ├── friends/         friends, requests, blocking
            ├── chat/            conversations and live chat
            ├── ai/              travel assistant
            └── profile/         settings and profile
```

Inside a feature: `api.ts` (one line per endpoint), `types.ts` (response shapes), `use*.ts` (state for a screen), `screens/` and `components/` (what the user sees).

---

## Getting started

### Requirements

- .NET 10 SDK
- Node.js (current LTS) and npm
- Xcode (iOS) or Android Studio (Android)
- A Firebase project with Authentication and Storage enabled

Keep the repository outside folders synced by iCloud (such as Documents or Desktop): sync creates conflict copies of the database and build files.

### Local files (never committed)

| File | Where | What it is |
|---|---|---|
| `serviceAccountKey.json` | `backend/data/` | Firebase Admin key, used by the API to delete accounts and photos. Server only, never put it in the app. |
| `GoogleService-Info.plist` | `frontend/firebase/` | Firebase config for iOS |
| `google-services.json` | `frontend/firebase/` | Firebase config for Android |
| `.env` | `frontend/` | `EXPO_PUBLIC_API_URL` (your computer's network address, e.g. `http://192.168.1.8:5001`), `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY`, `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` |

### Run the API

```bash
cd backend/Tracet.Api
dotnet user-secrets set GeminiApiKey "<your-gemini-key>"
dotnet run
```

The API listens on `http://0.0.0.0:5001` and creates the SQLite database at `backend/data/tracet.db` on first start. Tracey needs Ollama running locally (`Ollama:BaseUrl`, default `http://localhost:11434`).

### Run the app

```bash
cd frontend
npm install
npx expo run:ios --device
```

That builds and installs the development build once (`npx expo run:android` for Android). After that, start Metro and open the app:

```bash
npx expo start --dev-client
```

The phone and the computer must be on the same Wi-Fi network.

---

## Tests

```bash
dotnet test Tracet.slnx
cd frontend && npm test
```

GitHub Actions runs both suites on every push and pull request.
