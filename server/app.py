import sqlite3

from flask import Flask, jsonify, request
from boardgames_db import BoardGamesDB
from passlib.hash import bcrypt

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

@app.route("/users", methods= ["POST"])
def create_user():
    data = request.get_json(silent=True)
    if not isinstance(data, dict):
        return jsonify({"error": "Invalid JSON"}), 400
    first_name = data.get("first_name")
    last_name = data.get("last_name")
    email = data.get("email")
    password = data.get("password")

    if not all(
        isinstance(value, str) and value.strip()
        for value in [first_name, last_name, email, password]
    ):
        return jsonify({"error": "All fields are required"}), 400

    first_name = first_name.strip()
    last_name = last_name.strip()
    email = email.strip().lower()

    if email.count("@") != 1 or "." not in email.split("@")[1]:
        return jsonify({"error": "Invalid email address"}), 400

    

    if len(password.encode("utf-8")) > 72:
        return jsonify({"error": "Password is too long. Try a shorter password."}), 400

    db = BoardGamesDB()
    try:
        user = db.findUserByEmail(email)

        if user is not None:
            return jsonify({"error": "The email already exists"}), 409

        password_hash = bcrypt.hash(password)

        try:
            user_id = db.createUser(
                first_name=first_name,
                last_name=last_name,
                email=email,
                password_hash=password_hash
            )
        # except sqlite3.IntegrityError:
        #     db.connection.rollback()
        #     return jsonify({"error": "New user creation conflict"}), 409

        except sqlite3.Error as e:
            db.connection.rollback()
            print("REGISTRATION DATABASE ERROR:", repr(e), flush=True)
            return jsonify({"error": "Database operation failed"}), 500

        return jsonify({"id":user_id, "first_name": first_name, "last_name": last_name, "email": email }), 201

    except sqlite3.Error:
        db.connection.rollback()
        return jsonify({"error": "Database operation failed"}), 500



if __name__ == "__main__":
    app.run(port = 8080, debug = True)

