from pymongo import MongoClient
from flask import Flask, request
from flask_cors import CORS
import firebase_admin
from firebase_admin import credentials, auth
import keys

# Set up mongo db
uri = keys.mongo_uri
client = MongoClient(uri)
database = client.get_database("passwordman")
cluster = database.get_collection("posts")

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
    except Exception as e:
        print(e)
        return "Invalid Token"

@app.route("/", methods=["GET", "POST"])
def retrieve_passwords():
    try:
        # Get and authorize token
        auth_header = request.headers.get("Authorization", None)
        uid = validate(auth_header)
        if uid == "Invalid Token":
            return {"error": "Invalid token"}

        # Access user in database
        query_filter = {"user_id": uid}
        user = cluster.find_one(query_filter)
        passwords = user['passwords']

        # Gather passwords and send to front end
        json = []
        i = 0
        for password in passwords:
            json.append({})
            json[i]['id'] = password['id']
            json[i]['website'] = password['website']
            json[i]['username'] = password['username']
            json[i]['nonce'] = password['nonce']
            json[i]['cipher'] = password['cipher']
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
        query_filter = {"user_id": uid}
        user = cluster.find_one(query_filter)
        passwords = user['passwords']
        
        # Get the data from the POST request
        website = request.json["website"]
        username = request.json["username"]
        nonce = request.json["nonce"]
        cipher = request.json["cipher"]
        id = request.json["id"]

        # Insert the data into the db
        passwords.append({"id": id, "website": website, "username": username, "nonce": nonce, "cipher": cipher})
        update = {'$set': {'passwords': passwords}}
        cluster.update_one(query_filter, update)

    except Exception as e:
        print (f"Failed because of {e}")

@app.route("/delete", methods=["GET", "POST"])
def delete_password():
    try:
        auth_header = request.headers.get("Authorization", None)
        uid = validate(auth_header)
        query_filter = {"user_id": uid}
        if uid == "Invalid Token":
            return {"error": "Invalid Token"}
        
        passwords = cluster.find_one(query_filter)['passwords']

        delete_id = request.json["id"]
        delete_request = [entry for entry in passwords if entry["id"] == delete_id]
        passwords.remove(delete_request[0])

        update = {'$set': {'passwords': passwords}}
        cluster.update_one(query_filter, update)

    except Exception as e:
        print(f"Program failed because of {e}")

@app.route("/edit", methods=["POST", "GET"])
def edit():

    auth_header = request.headers.get("Authorization", None)
    uid = validate(auth_header)
    if uid == "Invalid Token":
        return {"error": "Invalid Token"}
    
    query_filter = {'user_id': uid}
        
    passwords = cluster.find_one(query_filter)['passwords']
    password_id = request.json["id"]
    edit_request = [i for i in range(len(passwords)) if passwords[i]["id"] == password_id][0]
        
    website = request.json['website']
    username = request.json['username']
    cipher = request.json['cipher']
    nonce = request.json['nonce']
    passwords[edit_request] = {"id": password_id, "website": website,
                               "username": username, "nonce": nonce, "cipher": cipher}

    update = {'$set': {'passwords': passwords}}
    cluster.update_one(query_filter, update)


@app.route("/login", methods=["POST", "GET"])
def login():
    try:
        auth_header = request.headers.get("Authorization", None)
        uid = validate(auth_header)
        if uid == "Invalid Token":
            return {"error": "Invalid Token"}
        query_filter = {'user_id': uid}
        passwords = cluster.find_one(query_filter)
        return {"salt": passwords["key_salt"]}
    except Exception as e:
        print(f"Program failed because of {e}")

@app.route("/create", methods=["POST", "GET"])
def create_account():
    try:
        # Verify token sent from frontend
        uid = validate(request.headers.get("Authorization", None))
        if uid == "Invalid Token":
            return {'error': 'invalid token'}

        # Add new user into database
        salt = request.json["key_salt"]
        cluster.insert_one({"user_id": uid, 'key_salt': salt, 'passwords': []})
    except Exception as e:
        print(f"Failed because of {e}")        