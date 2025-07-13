from pymongo import MongoClient
from flask import Flask, request
from flask_cors import CORS

uri = # MongoDB uri goes here
client = MongoClient(uri)

app = Flask(__name__)
CORS(app, origins=["http://localhost:3000"])

@app.route("/", methods=["GET"])
def retrieve_passwords():
    try:
        #To be changed to reflect individual user accounts
        database = client.get_database(# Database name goes here)
        passwords = database.get_collection(  # User cluster goes here)
        results = passwords.find()

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
        # Connect
        database = client.get_database(# Database goes here)
        passwords = database.get_collection(# User cluster goes here)

        # Get the data from the POST request
        website = request.json["website"]
        username = request.json["username"]
        password = request.json["password"]

        # Insert the data into the db
        passwords.insert_one({"website": website, "username": username, "password": password})

        return {"1": "1"}

    except Exception as e:
        print (f"Failed because of {e}")

@app.route("/delete", methods=["GET", "POST"])
def delete_password():
    try:
        database=client.get_database(  # Database goes here)
        passwords=database.get_collection(  # User cluster goes here)

        # Will be switched to unique id when it's implemented
        website = request.json["website"]
        passwords.delete_one({"website": website })

    except Exception as e:
        print(f"Failed because of {e}")


        