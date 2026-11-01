# Game Shelf

This web app is a digital game shelf that lets you keep track of all of the physical games you own. It will also keep track of your wishlist of games. 

## Resource

**Board Game** (`boardgames`)

| Attribute | Type | Description |
|---|---|---|
| `id` | integer | Unique identifier, assigned automatically |
| `name` | text | Name of the game (required) |
| `game_type` | text | Category of game: Strategy, Party, Cooperative, Family, Deck-building, Card, Abstract, Trivia, or Other |
| `min_players` | integer | Fewest number of players needed to play the game |
| `max_players` | integer | Most players the game will allow or support |
| `play_time` | integer | Typical length of a game, in minutes |
| `min_age` | integer | Minimum recommended player age from the box or game description |
| `complexity` | integer | How difficult the game is to learn and play, from 1 (light) to 5 (heavy) |
| `rating` | integer | Personal rating, from 1 to 5 stars |
| `price` | real | Price in US dollars (what was paid, or the current price for wishlist games) |
| `status` | text | Whether the game is `Owned` or on the `Wishlist` |
| `notes` | text | Optional free-form notes, such as house rules or reminders |

## Database Schema

```sql
CREATE TABLE boardgames (
    id INTEGER PRIMARY KEY,
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
    notes TEXT
);
```

## REST Endpoints

| Name | Method | Path |
|---|---|---|
| List | GET | `/boardgames` |
| Retrieve | GET | `/boardgames/<id>` |
| Create | POST | `/boardgames` |
| Replace | PUT | `/boardgames/<id>` |
| Delete | DELETE | `/boardgames/<id>` |

The server also handles CORS for every path, including OPTIONS preflight requests,
so the client can call the API from a different origin. Create and Replace check for
an existing game with the same name (ignoring capitalization) and return
`409 Conflict` if one is found. Adding `?force=true` to the URL saves it anyway so 
that you may duplicate names of games if you have multiple versions. All errors return
a JSON body explaining the problem, with a `400` for missing or
invalid data, `404` for an unknown path or a game that doesn't exist, `405` for a
method the path doesn't support, and `409` for a duplicate name.

## Features

- You can view all the games you have input into the system
- You can add new games, delete games, and edit games
- All games are searchable by name, type, status and notes
- Sort the shelf by name (A–Z or Z–A), type, rating (highest first), complexity
  (lightest first), play time (shortest first), price (lowest first), or status
  (Owned first). Ties are always broken alphabetically by name.
- There is a mobile view also.

## Running the App

1. From the project folder, create and activate a virtual environment, then install
   the requirements:
   ```
   python -m venv venv
   source venv/bin/activate        # Windows: venv\Scripts\activate
   pip install -r requirements.txt
   ```
2. Start the API server, which runs on port 8080:
   ```
   cd server
   python app.py
   ```
   On the first run, the database is created automatically and filled with sample
   games from `server/seed_games.json`. To start over with the sample games, stop the
   server, delete `server/boardgames.db`, and start it again.
3. In a second terminal, serve the client folder on port 5500:
   ```
   cd client
   python -m http.server 5500
   ```
4. Open `http://localhost:5500` in a browser.



## AI Disclosure

I wrote all backend and database code. I wrote the stucture of the html while AI named all the ids/classes.
I wrote all the basic functionality for the javascript, but AI helped me write the search and sort functions.
All styling and CSS were written by AI with specific design direction from me. All code was linted by Claude. 
I generated the background images through ChatGPT image generation. 