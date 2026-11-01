from flask import Flask, jsonify, request
from boardgames_db import BoardGamesDB

app = Flask(__name__)
app.json.sort_keys = False

Fields = ["name", "game_type", "min_players", "max_players", "play_time", "min_age", "complexity", "rating", "price", "status", "notes"]

def game_attributes(data):
    return {field: data.get(field) for field in Fields}

@app.before_request
def handle_preflight():
    if request.method == "OPTIONS":
        return "", 200

@app.after_request
def add_cors_headers(response):
    response.headers["Access-Control-Allow-Origin"] = "*"
    response.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE, OPTIONS"
    response.headers["Access-Control-Allow-Headers"] = "Content-Type"
    return response

@app.errorhandler(404)
def not_found(error):
    return jsonify({"error": "The requested resource was not found"}), 404

@app.errorhandler(405)
def invalid_method(error):
    return jsonify({"error": "The method is not allowed for this URL"}), 405

@app.route("/boardgames", methods=["GET"])
def list_boardgames():
    db = BoardGamesDB()
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

    db = BoardGamesDB()
    force = request.args.get("force") == "true"
    if not force and db.nameExists(data["name"]):
        return jsonify({
            "error": f"A game named {data['name']} is already on your shelf",
            "duplicate": True
        }), 409

    game = game_attributes(data)
    gameID = db.createBoardGame(game)
    return jsonify(db.getBoardGame(gameID)), 201

@app.route("/boardgames/<int:game_id>", methods=["PUT"])
def update_boardgame(game_id):
    db = BoardGamesDB()
    game = db.getBoardGame(game_id)
    if game is None:
        return jsonify({"error": "Board game is not on your shelf"}), 404

    data = request.get_json()
    if data is None or not data.get("name"):
        return jsonify({"error": "Name is required"}), 400

    force = request.args.get("force") == "true"
    if not force and db.nameExists(data["name"], game_id):
        return jsonify({
            "error": f"A game named {data['name']} is already on your shelf",
            "duplicate": True
        }), 409
    updates = game_attributes(data)

    db.updateBoardGame(game_id, updates)
    return jsonify(db.getBoardGame(game_id)), 200

@app.route("/boardgames/<int:game_id>", methods=["DELETE"])
def delete_boardgame(game_id):
    db = BoardGamesDB()
    game = db.getBoardGame(game_id)
    if game is None:
        return jsonify({"error": "Board game is not on your shelf"}), 404
    db.deleteBoardGame(game_id)
    return jsonify({"message": "Board game was removed from your shelf"}),200

if __name__ == "__main__":
    app.run(port = 8080, debug = True)

