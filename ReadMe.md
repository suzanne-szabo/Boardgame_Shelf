# Game Shelf

Game Shelf is a web application that lets users keep track of their physical board game collections and maintain a wishlist of games they would like to own.

Users can register an account, log in, and manage their own private game collection. Each user can only view, add, edit, and delete games belonging to their account.

The application uses a Flask REST API, a SQLite database, and a frontend built with HTML, CSS, and vanilla JavaScript.

## Quick Login — Demo Accounts

Two demo accounts are provided, each with its own collection of seeded games. Once both servers are running, open **http://localhost:5500** and log in using either account.

| User | Email | Password |
|---|---|---|
| Jane (Demo One) | `jane@email.com` | `game1234` |
| John (Demo Two) | `john@email.com` | `play1234` |

You can also register a new account to start with an empty game collection.

## Important: Use Consistent Localhost Addresses

**Use `localhost` for both the frontend and backend. Do not mix `localhost` and `127.0.0.1`.** Although both refer to your local computer, browsers treat them as different hosts when handling session cookies. Mixing them can prevent authentication from working properly.

- **Frontend:** `http://localhost:5500`
- **Backend API:** `http://localhost:8080`

Start the frontend server using:

```bash
cd client
python3 -m http.server 5500 --bind localhost
```

The Flask backend runs on port `8080`. Both `auth.js` and `app.js` should use `http://localhost:8080` for API requests.

See **Running the App** below for the complete setup instructions.

## Browser Caching Note

During development, the browser kept using cached copies of older JavaScript and CSS files, so code changes did not always show. To prevent this AI offered this solution- the HTML pages load their files with a version number (for example, `app.js?v=2`). Changing the number forces the browser to download the latest version. If the app ever behaves unexpectedly after an update, a hard refresh (**Cmd+Shift+R** on macOS, **Ctrl+Shift+R** on Windows) will also clear the cached files.

## Resources

The application uses two resources: **User** and **Board Game**.

### User (`users`)

| Attribute | Type | Description |
|---|---|---|
| `id` | integer | Unique user identifier, assigned automatically |
| `first_name` | text | User's first name (required) |
| `last_name` | text | User's last name (required) |
| `email` | text | User's email address (required, unique, case-insensitive) |
| `password_hash` | text | Password stored as a bcrypt hash, never plaintext |

Passwords are hashed on the server before being stored in the database. The plaintext password is not saved.

### Board Game (`boardgames`)

| Attribute | Type | Description |
|---|---|---|
| `id` | integer | Unique game identifier, assigned automatically |
| `user_id` | integer | ID of the user who owns the game (required, foreign key) |
| `name` | text | Name of the game (required) |
| `game_type` | text | Category: Strategy, Party, Cooperative, Family, Deck-building, Card, Abstract, Trivia, or Other |
| `min_players` | integer | Fewest number of players needed |
| `max_players` | integer | Maximum number of players supported |
| `play_time` | integer | Typical game length in minutes |
| `min_age` | integer | Minimum recommended player age |
| `complexity` | integer | Difficulty rating from 1 (light) to 5 (heavy) |
| `rating` | integer | Personal rating from 1 to 5 stars |
| `price` | real | Price in US dollars |
| `status` | text | `Owned` or `Wishlist` |
| `notes` | text | Optional notes, house rules, or reminders |

Each board game belongs to one registered user. A user may have multiple board games.

## Database Schema

The application uses SQLite with two related tables.

### Users

```sql
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    email TEXT NOT NULL COLLATE NOCASE UNIQUE,
    password_hash TEXT NOT NULL
);
```

### Board Games

```sql
CREATE TABLE IF NOT EXISTS boardgames (
    id INTEGER PRIMARY KEY,
    user_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    game_type TEXT,
    min_players INTEGER,
    max_players INTEGER,
    play_time INTEGER,
    min_age INTEGER,
    complexity INTEGER,
    rating INTEGER,
    price REAL,
    status TEXT,
    notes TEXT,
    FOREIGN KEY (user_id) REFERENCES users(id)
);
```

Foreign key enforcement is enabled through `PRAGMA foreign_keys = ON` when the database connection is created.

### Database Initialization

The database file is created automatically when the application first initializes `BoardGamesDB()`.

If the database file does not already exist, the application:

1. Creates the `users` and `boardgames` tables.
2. Creates two demo user accounts with bcrypt-hashed passwords.
3. Reads the existing game data from `server/seed_games.json`.
4. Distributes the seeded games between the two demo users.

The seed operation runs only when a new database file is created. Restarting Flask, refreshing the page, or logging in again does not recreate users or duplicate games.

Newly registered users start with an empty game collection.

## REST API Endpoints

The Flask API runs on port `8080`.

### User Registration

| Action | Method | Path | Authentication |
|---|---|---|---|
| Register user | POST | `/users` | Not required |

Registration requires `first_name`, `last_name`, `email`, and `password`.

The server validates required fields, checks that the email is not already registered, hashes the password using bcrypt, and saves the new user.

A successful registration returns `201 Created`. Attempting to register an existing email returns `409 Conflict`.

### Authentication and Sessions

| Action | Method | Path | Authentication |
|---|---|---|---|
| Log in | POST | `/sessions` | Not required |
| Check current session | GET | `/sessions` | Required |
| Log out | DELETE | `/sessions` | Not required |

**Login:** Accepts an email address and password. The server retrieves the user account and verifies the password against the stored bcrypt hash. If the credentials are valid, it generates a random session ID using Python's `secrets` module.

The session ID is stored in an in-memory Python dictionary associated with the user's ID and returned to the browser as an `HttpOnly` cookie.

**Session check:** Returns `200 OK` when the browser has a valid session and `401 Unauthorized` when it does not.

**Logout:** Invalidates the current session on the server, deletes the browser's session cookie, and returns the user to the login page.

Sessions are stored in memory, not in SQLite. Restarting Flask clears active sessions and requires users to log in again.

### Board Games

All board game endpoints require an authenticated session.

| Action | Method | Path |
|---|---|---|
| List | GET | `/boardgames` |
| Retrieve | GET | `/boardgames/<id>` |
| Create | POST | `/boardgames` |
| Replace | PUT | `/boardgames/<id>` |
| Delete | DELETE | `/boardgames/<id>` |

The server identifies the current user through the session cookie. The user ID is never taken from the client's request data.

All database operations involving board games are restricted by `user_id`:

- **List:** Returns only games belonging to the authenticated user.
- **Retrieve:** Returns a game only if the authenticated user owns it.
- **Create:** Automatically assigns the authenticated user as the owner.
- **Replace:** Allows modification only when the game belongs to the authenticated user.
- **Delete:** Allows deletion only when the game belongs to the authenticated user.

Requests to retrieve, modify, or delete another user's game return `404 Not Found`.

### Duplicate Game Names

Create and Replace check whether a game with the same name already exists within the authenticated user's collection. The comparison is case-insensitive.

If a duplicate is found, the server returns `409 Conflict`.

Adding `?force=true` to the Create or Replace URL allows the duplicate name, supporting users who own multiple versions of the same game.

Different users may have games with identical names without causing a conflict.

### HTTP Responses

| Status | Meaning |
|---|---|
| `200 OK` | Successful request |
| `201 Created` | A new user or board game was created |
| `400 Bad Request` | Missing or invalid required request data |
| `401 Unauthorized` | Invalid login credentials or missing/invalid session |
| `404 Not Found` | Resource does not exist or does not belong to the authenticated user |
| `405 Method Not Allowed` | HTTP method is not supported for the requested path |
| `409 Conflict` | Duplicate email or game name |
| `500 Internal Server Error` | Server or database operation failed |

API responses use JSON, including error messages.

## Authentication and Security

Authentication and authorization are handled on the Flask server.

**Password hashing**

- Uses `passlib` with the bcrypt hashing algorithm.
- Uses bcrypt's default work factor of 12.
- Generates salted password hashes.
- Does not store plaintext passwords.
- Limits password input to 72 UTF-8 bytes, consistent with the bcrypt implementation used.

**Session management**

- Generates session IDs with `secrets.token_urlsafe(32)`.
- Stores session ID-to-user ID mappings in server memory.
- Sends the session ID as an `HttpOnly` cookie with `SameSite=Lax`.
- Invalidates the current session on logout.
- Clears sessions when the Flask server restarts.

**Authorization**

- Uses a custom `@login_required` decorator on protected endpoints.
- Verifies the session before allowing access to game resources.
- Enforces ownership in SQL queries using both the game ID and authenticated user ID.
- Prevents users from viewing, editing, or deleting another user's games.

**CORS**

The application allows credentialed requests from these local frontend origins:

- `http://localhost:5500`
- `http://127.0.0.1:5500`

The API supports OPTIONS preflight requests and includes the appropriate CORS headers for allowed origins.

For browser testing, the frontend and API should use consistent hostnames so session cookies work correctly.

This application is configured for local classroom development and testing, not public production deployment.

## Features

- Register a user account and log in securely.
- Maintain a separate board game collection for each user.
- View only the games belonging to the logged-in account.
- Add, edit, and delete games.
- Track both owned games and wishlist items.
- Search games by name, type, status, and notes.
- Sort games by name (A–Z or Z–A), type, rating (highest first), complexity (lightest first), play time (shortest first), price (lowest first), or status (Owned first). Ties are broken alphabetically by name.
- View game information through an interactive details dialog.
- Receive messages for unsuccessful login, duplicate emails, and duplicate game names.
- Remain logged in while the session is valid, including after refreshing the page.
- Log out and prevent access to private collections without authentication.
- Use a responsive interface with a mobile layout.

## Running the App

### Requirements

- Python 3
- pip
- A modern web browser

No JavaScript frameworks or additional frontend development server packages are required.

### 1. Clone the repository

```bash
git clone https://github.com/suzanne-szabo/Boardgame_Shelf.git
cd Boardgame_Shelf
```

### 2. Create a virtual environment and install dependencies

From the project root:

**macOS / Linux:**

```bash
python3 -m venv venv
source venv/bin/activate
python -m pip install -r requirements.txt
```

**Windows PowerShell:**

```powershell
python -m venv venv
.\venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
```

If PowerShell prevents activation, the virtual environment's Python executable can be used directly, or the activation policy can be configured for the development environment.

### 3. Start the Flask API

In the terminal with the virtual environment activated:

```bash
cd server
python app.py
```

The API runs at:

`http://localhost:8080`

Leave this terminal running.

### 4. Start the frontend server

Open a second terminal at the project root:

```bash
cd client
python3 -m http.server 5500 --bind localhost
```

On Windows, use `python` instead of `python3` if needed.

The frontend is served at:

`http://localhost:5500`

Leave this terminal running as well.

### 5. Open Game Shelf

Open the following URL in your browser:

`http://localhost:5500`

The application's entry page is `index.html`, which displays the login and registration forms.

After logging in successfully, users are redirected to `gameshelf.html`.

An unauthenticated visitor who attempts to open `gameshelf.html` is redirected back to the login page.

### 6. Demo Accounts

Two demo accounts are automatically created when a new database is initialized. Each account has its own collection of seeded games.

| Demo user | Email | Password |
|---|---|---|
| Demo One (Jane) | `jane@email.com` | `game1234` |
| Demo Two (John) | `john@email.com` | `play1234` |

These credentials are intentionally simple for local classroom testing. The passwords are stored in SQLite as bcrypt hashes, not plaintext.

### 7. Suggested Testing Procedure

1. Log in using Jane's demo account.
2. View the games assigned to Jane.
3. Add a game, edit an existing game, and delete a game.
4. Log out.
5. Log in using John's demo account.
6. Verify that John's collection contains different games.
7. Confirm that Jane's modifications did not affect John's collection.
8. Register a third account and verify that its collection starts empty.
9. Log out and attempt to open `gameshelf.html` directly. The application should redirect to login.

For additional authorization testing, the protected API endpoints can be called directly using separate session cookies for different users. Requests to retrieve, update, or delete another user's game should return `404`.

### Resetting the Demo Database

To restore the original demo accounts and seed games:

1. Stop the Flask server.
2. Delete `server/boardgames.db`.
3. Restart Flask.
4. Log in using one of the demo accounts.

The database and seed data are recreated on the first request that initializes `BoardGamesDB()`.

**Warning:** Deleting the database permanently removes all existing registered accounts, games, and modifications.

## Project Structure

```text
Boardgame_Shelf/
├── client/
│   ├── index.html           # Login and registration page
│   ├── gameshelf.html       # Private game collection interface
│   ├── auth.js              # Registration, login, session checks
│   ├── app.js               # Game management and logout
│   ├── style.css            # Shared styling
│   └── images/              # Interface background images
├── server/
│   ├── app.py               # Flask REST API and authentication
│   ├── boardgames_db.py     # SQLite database methods and seeding
│   └── seed_games.json      # Sample games
├── requirements.txt
└── README.md
```

The SQLite database file is generated locally and excluded from Git.

## AI Disclosure

I developed the backend and database functionality, including the REST API, user authentication, and database operations, with AI assistance for troubleshooting, code review, and implementation guidance.

I wrote the HTML structure, while AI assisted with naming IDs and classes. I wrote the core JavaScript functionality, with AI assistance for search and sorting, authentication integration, and debugging.

The CSS and styling were generated with AI based on my specific design direction. The background images were generated using ChatGPT image generation.

AI tools were also used to help review and lint the code, including Claude.