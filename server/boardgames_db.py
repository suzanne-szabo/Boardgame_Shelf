import sqlite3
import os
import json

DB_PATH = os.path.join(os.path.dirname(__file__), "boardgames.db")
SEED_PATH = os.path.join(os.path.dirname(__file__), "seed_games.json")

def dict_factory(cursor, row):
    fields = []
    for column in cursor.description:
        fields.append(column[0])
    result = {}
    for i in range(len(fields)):
        result[fields[i]] = row[i]
    return result

class BoardGamesDB:
    def __init__(self):
        self.connection = sqlite3.connect(DB_PATH)
        self.connection.row_factory = dict_factory
        self.connection.execute("PRAGMA foreign_keys = ON")
        self.cursor = self.connection.cursor()
        self.createUsersTable()
        self.createTable()

    def createTable(self):
        # self.cursor.execute(
        #     "SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'boardgames'"
        # )
        # is_new = self.cursor.fetchone() is None

        self.cursor.execute("""
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
            )
        """)
        self.connection.commit()

        # if is_new:
        #     self.seedGames()

    def createUsersTable(self):
        self.cursor.execute("""
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY,
                first_name TEXT NOT NULL,
                last_name TEXT NOT NULL,
                email TEXT NOT NULL COLLATE NOCASE UNIQUE,
                password_hash TEXT NOT NULL
            )
        """)
        self.connection.commit()

    def seedGames(self):
        if not os.path.exists(SEED_PATH):
            return
        with open(SEED_PATH, encoding="utf-8") as file:
            games = json.load(file)
        for game in games:
            self.createBoardGame(game)

    def getBoardGames(self, user_id):
        self.cursor.execute("SELECT * FROM boardgames WHERE user_id = ?", (user_id,))
        return self.cursor.fetchall()

    def getBoardGame(self,game_id, user_id):
        self.cursor.execute("SELECT * FROM boardgames WHERE id = ? AND user_id = ?", (game_id, user_id))
        return self.cursor.fetchone()

    def createBoardGame(self, game, user_id):
        game["user_id"] = user_id
        self.cursor.execute(""" INSERT INTO boardgames (user_id, name, game_type, min_players, 
                                    max_players, play_time, min_age, complexity,rating,price, status, notes)
                                VALUES(:user_id, :name,:game_type, :min_players, :max_players, :play_time,
                                    :min_age, :complexity, :rating, :price, :status, :notes)""", game )
        self.connection.commit()
        return self.cursor.lastrowid

    def updateBoardGame(self,game_id,game, user_id):
        game["id"] = game_id
        game["user_id"] = user_id
        self.cursor.execute(""" UPDATE boardgames SET 
                                name = :name, game_type = :game_type, min_players = :min_players,
                                max_players = :max_players,play_time = :play_time,min_age = :min_age,
                                complexity = :complexity,rating = :rating,price = :price,
                                status = :status,notes = :notes
                                WHERE id = :id AND user_id = :user_id""", game)
        self.connection.commit()

    def deleteBoardGame(self,game_id, user_id):
        self.cursor.execute("DELETE FROM boardgames WHERE id = ? AND user_id = ?", (game_id, user_id))
        self.connection.commit()

    def nameExists(self, name,user_id, exclude_id=None):
        name = name.strip()
        if exclude_id is None:
            self.cursor.execute("SELECT id FROM boardgames WHERE LOWER(name) = LOWER(?) AND user_id = ?", (name, user_id))
        else:
            self.cursor.execute("SELECT id FROM boardgames WHERE LOWER(name) = LOWER(?) AND id != ? AND user_id = ?", (name, exclude_id, user_id))
        return self.cursor.fetchone() is not None

    def findUserByEmail(self,email):
        self.cursor.execute("SELECT * FROM users WHERE email = ?", (email,))
        return self.cursor.fetchone()

    def createUser(self, first_name, last_name, email, password_hash):
        self.cursor.execute(""" INSERT INTO users (first_name, last_name, email, password_hash)
                                VALUES(?, ?, ?, ?)""", (first_name, last_name, email, password_hash))
        self.connection.commit()
        return self.cursor.lastrowid
