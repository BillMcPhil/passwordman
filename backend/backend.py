from pymongo import MongoClient
from flask import Flask, request
from flask_cors import CORS

uri = #Mongo DB uri goes here
client = MongoClient(uri)

app = Flask(__name__)
CORS(app, origins=["http://localhost:3000"])

@app.route("/", methods=["GET"])
def retrieve_passwords():
    try:
        #To be changed to reflect individual user accounts
        database = client.get_database(#database name goes here)
            passwords=database.get_collection(#Cluster for specific user goes here)
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

@app.route("/add", methods=["GET", "POST"])
def insert_password():
    try:
        database = client.get_database(#database name goes here)
        passwords = database.get_collection(#Cluster for specific user goes here)

        website = request.json["website"]
        username = request.json["username"]
        password = request.json["password"]

        passwords.insert_one({"website": website, "username": username, "password": password})

        return {"1": "1"}

    except Exception as e:
        print (f"Failed because of {e}")

        