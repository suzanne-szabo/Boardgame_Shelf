from flask import Flask, jsonify, request
from boardgames_db import BoardGamesDB

app = Flask(__name__)
app.json.sort_keys = False

Fields = ["name", "game_type", "min_players", "max_players", "play_time", "min_age", "complexity", "rating", "price", "status", "notes"] 
def game_attributes(data):
     return{field: data.get(field) for field in Fields}

@app.route("/boardgames", methods=["GET"])
def list_boardgames():
    db= BoardGamesDB()
    games = db.getBoardGames()
    return jsonify(games), 200

@app.route("/boardgames/<int:game_id>", methods=["GET"])
def get_boardgame(game_id):
    db = BoardGamesDB()
    game = db.getBoardGame(game_id)
    if game is None:
             return jsonify({"error": "Board game is not on your shelf"}), 404
    return jsonify(game), 200

@app.route("/boardgames", methods=["POST"])
def create_boardgame():
     data = request.get_json()
     if data is None or not data.get("name"):
          return jsonify({"error": "Name is required"}), 400

     game = game_attributes(data)
     db = BoardGamesDB()
     gameID = db.createBoardGame(game)
     return jsonify(db.getBoardGame(gameID)), 201
     

if __name__ == "__main__":
    app.run(port = 8080, debug = True)

