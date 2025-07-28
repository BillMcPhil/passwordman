from pymongo import MongoClient
from flask import Flask, request
from flask_cors import CORS
import firebase_admin
from firebase_admin import credentials, auth
import keys

# Set up mongo db
uri = keys.mongo_uri
client = MongoClient(uri)
database = client.get_database(# Database goes here)
cluster = database.get_collection(# Cluster goes here)

# Set up flask
app = Flask(__name__)
CORS(app, origins=["http://localhost:3000"])

# Set up firebase
default_app = firebase_admin.initialize_app()

@app.route("/", methods=["GET"])
def retrieve_passwords():
    try:

        # Get and authorize token
        auth_header = request.headers.get("Authorization", None)
        print(f"Header: {auth_header}")
        try:
            token = auth.verify_id_token(auth_header)
            uid = token['uid']
        except Exception:
            return {"error": auth_header}

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
            json[i]['password'] = r['password']
            i += 1
        return json

    except Exception as e:
        print(f"Program failed because of {e}")

# Adds passwords to the database
@app.route("/add", methods=["GET", "POST"])
def insert_password():
    try:
        auth_header = request.headers.get("Authorization", None)
        try:
            token = auth.verify_id_token(auth_header)
            uid = token['uid']
        except Exception:
            print("Invalid token")
            return {"error": "Invalid session token"}

        # Connect to user passwords
        query_filter = {"id": uid}
        user = cluster.find_one(query_filter)
        passwords = user['passwords']
        
        # Get the data from the POST request
        website = request.json["website"]
        username = request.json["username"]
        password = request.json["password"]

        # Insert the data into the db
        passwords.append({"website": website, "username": username, "password": password})
        update = {'$set': {'passwords': passwords}}
        cluster.update_one(query_filter, update)

    except Exception as e:
        print (f"Failed because of {e}")

@app.route("/delete", methods=["GET", "POST"])
def delete_password():
    try:
        auth_header = request.headers.get("Authorization", None)
        try:
            token = auth.verify_id_token(auth_header)
            uid = token['uid']
        except Exception:
            print("Invalid token")
            return {"error": "Invalid session token"}
        
        passwords = cluster.find_one({'id': uid})['passwords']
        # Will be switched to unique id when it's implemented
        website = request.json["website"]
        username = request.json["username"]
        password = request.json["password"]
        passwords.remove({"website": website, "username": username, "password": password })

        update = {'$set': {'passwords': passwords}}
        cluster.update_one({'id': uid}, update)

    except Exception as e:
        print(f"Failed because of {e}")

@app.route("/create", methods=["POST", "GET"])
def create_account():
    try:
        try:
            # Verify token sent from frontend
            token = auth.verify_id_token(request.json["id_token"])
            uid = token['uid']
        except:
            return {'error': 'invalid token'}

        # Add new user into database
        cluster.insert_one({"id": uid, 'passwords': []})
    except Exception as e:
        print(f"Failed because of {e}")



        