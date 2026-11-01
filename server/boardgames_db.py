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
        self.cursor = self.connection.cursor()
        self.createTable()

    def createTable(self):
        self.cursor.execute(
            "SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'boardgames'"
        )
        is_new = self.cursor.fetchone() is None

        self.cursor.execute("""
            CREATE TABLE IF NOT EXISTS boardgames (
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
            )
        """)
        self.connection.commit()

        if is_new:
            self.seedGames()

    def seedGames(self):
        if not os.path.exists(SEED_PATH):
            return
        with open(SEED_PATH, encoding="utf-8") as file:
            games = json.load(file)
        for game in games:
            self.createBoardGame(game)

    def getBoardGames(self):
        self.cursor.execute("SELECT * FROM boardgames")
        return self.cursor.fetchall()

    def getBoardGame(self,game_id):
        self.cursor.execute("SELECT * FROM boardgames WHERE id = ?", (game_id,))
        return self.cursor.fetchone()

    def createBoardGame(self, game):
        self.cursor.execute(""" INSERT INTO boardgames (name, game_type, min_players, 
                                    max_players, play_time, min_age, complexity,rating,price, status, notes)
                                VALUES(:name,:game_type, :min_players, :max_players, :play_time,
                                    :min_age, :complexity, :rating, :price, :status, :notes)""", game )
        self.connection.commit()
        return self.cursor.lastrowid

    def updateBoardGame(self,game_id,game):
        game["id"] = game_id
        self.cursor.execute(""" UPDATE boardgames SET 
                                name = :name, game_type = :game_type, min_players = :min_players,
                                max_players = :max_players,play_time = :play_time,min_age = :min_age,
                                complexity = :complexity,rating = :rating,price = :price,
                                status = :status,notes = :notes
                                WHERE id = :id""", game)
        self.connection.commit()

    def deleteBoardGame(self,game_id):
        self.cursor.execute("DELETE FROM boardgames WHERE id = ?",(game_id,))
        self.connection.commit()

    def nameExists(self, name, exclude_id=None):
        name = name.strip()
        if exclude_id is None:
            self.cursor.execute("SELECT id FROM boardgames WHERE LOWER(name) = LOWER(?)", (name,))
        else:
            self.cursor.execute("SELECT id FROM boardgames WHERE LOWER(name) = LOWER(?) AND id != ?", (name, exclude_id))
        return self.cursor.fetchone() is not None
