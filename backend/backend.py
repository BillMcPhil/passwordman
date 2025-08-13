from pymongo import MongoClient
from flask import Flask, request
from flask_cors import CORS
import firebase_admin
from firebase_admin import credentials, auth
import keys

# Set up mongo db
uri = keys.mongo_uri
client = MongoClient(uri)
database = client.get_database(#Database name)
cluster = database.get_collection(# Collection name)

# Set up flask
app = Flask(__name__)
CORS(app, origins=["http://localhost:3000"])

# Set up firebase
default_app = firebase_admin.initialize_app()

def validate(token):
    try:
        token = auth.verify_id_token(token)
        uid = token['uid']
        return uid
    except Exception:
        return "Invalid Token"

@app.route("/", methods=["GET"])
def retrieve_passwords():
    try:
        # Get and authorize token
        auth_header = request.headers.get("Authorization", None)
        uid = validate(auth_header)
        if uid == "Invalid Token":
            return {"error": "Invalid token"}

        # Access user in database
        passwords = cluster.find_one({"id": uid})
        results = passwords['passwords']

        # Gather passwords and send to front end
        json = []
        i = 0
        for r in results:
            json.append({})
            json[i]['website'] = r['website']
            json[i]['username'] = r['username']
            json[i]['nonce'] = r['nonce']
            json[i]['cipher'] = r['cipher']
            i += 1
        return json

    except Exception as e:
        print(f"Program failed because of {e}")

# Adds passwords to the database
@app.route("/add", methods=["GET", "POST"])
def insert_password():
    try:
        auth_header = request.headers.get("Authorization", None)
        uid = validate(auth_header)
        if uid == "Invalid Token":
            return {"error": "Invalid Token"}

        # Connect to user passwords
        query_filter = {"id": uid}
        user = cluster.find_one(query_filter)
        passwords = user['passwords']
        
        # Get the data from the POST request
        website = request.json["website"]
        username = request.json["username"]
        nonce = request.json["nonce"]
        cipher = request.json["cipher"]

        # Insert the data into the db
        passwords.append({"website": website, "username": username, "nonce": nonce, "cipher": cipher})
        update = {'$set': {'passwords': passwords}}
        cluster.update_one(query_filter, update)

    except Exception as e:
        print (f"Failed because of {e}")

@app.route("/delete", methods=["GET", "POST"])
def delete_password():
    try:
        auth_header = request.headers.get("Authorization", None)
        uid = validate(auth_header)
        if uid == "Invalid Token":
            return {"error": "Invalid Token"}
        
        passwords = cluster.find_one({'id': uid})['passwords']
        # Will be switched to unique id when it's implemented
        website = request.json["website"]
        delete_request = [entry for entry in passwords if entry["website"] == website]
        passwords.remove(delete_request[0])

        update = {'$set': {'passwords': passwords}}
        cluster.update_one({'id': uid}, update)

    except Exception as e:
        print(f"Failed because of {e}")

@app.route("/login", methods=["POST", "GET"])
def login():
    try:
        auth_header = request.headers.get("Authorization", None)
        uid = validate(auth_header)
        if uid == "Invalid Token":
            return {"error": "Invalid Token"}
        passwords = cluster.find_one({"id": uid})
        return {"salt": passwords["key_salt"]}
    except Exception as e:
        print(f"Program failed because of {e}")

@app.route("/create", methods=["POST", "GET"])
def create_account():
    try:
        try:
            # Verify token sent from frontend
            token = auth.verify_id_token(request.json["id_token"])
            uid = token['uid']
            salt = request.json["key_salt"]
        except:
            return {'error': 'invalid token'}

        # Add new user into database
        cluster.insert_one({"id": uid, 'key_salt': salt, 'passwords': []})
    except Exception as e:
        print(f"Failed because of {e}")        