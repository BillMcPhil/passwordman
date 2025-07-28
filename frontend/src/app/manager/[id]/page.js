'use client'
import { useState, useEffect } from 'react';
import { initializeApp } from "firebase/app";
import { setPersistence, getAuth, createUserWithEmailAndPassword, browserSessionPersistence, signInWithEmailAndPassword } from "firebase/auth";

const firebaseConfig = // Firebase config goes here

function PasswordDisplay({ website, username, password, onDelete }) {
  const [isVisible, setVisible] = useState(false);
  function reveal() {
    setVisible(!isVisible)
  }

  function copy() {
    navigator.clipboard.writeText(password);
  }

  return (
    <>
    <div className="display">
      <p className="website"><b>{website}</b></p>
      <p className="username"><b>{username}</b></p>
    </div>
    <div className="password-display">
      <p className="password"><b>{isVisible ? password : "***"}</b></p>
      <div className="password-buttons">
        <button className="revealbutton" onClick={reveal}>{isVisible ? "hide" : "reveal"}</button>
          <button className="copybutton" onClick={copy}>Copy</button>
          <button className="deletebutton" onClick={onDelete}>Delete</button>
      </div>
    </div>
    </>
  );
}

export default function Home() {
  const [entryModalVisible, setModalVisible] = useState(false);
  const [entries, setEntries] = useState([]);
  const [inputs, setInputs] = useState({});

  const app = initializeApp(firebaseConfig);
  const auth = getAuth();

  // Fetch passwords from backend API
  useEffect(() => {
    auth.currentUser.getIdToken(true).then(function (idToken) {
      fetch('http://localhost:5000/', { method: "GET", headers: { "Authorization": `${idToken}` } })
        .then(res => res.json())
        .then(data => {
          setEntries(data);
      });
    })
  }, []);

  // Handle change in inputs for adding new passwords
  const handleChange = (e) => {
    const name = e.target.name;
    const value = e.target.value;
    setInputs(values => ({ ...values, [name]: value }));
  }

  // Handle entering the password form
  const handleEntry = (e) => {
    console.log(entries);
    e.preventDefault();
    setModalVisible(false);
    setEntries(entries.concat({"website": inputs.website, "username": inputs.username, "password": inputs.password}));

    // Add new password to database
    return auth.currentUser.getIdToken(true).then(function (idToken) {
      fetch("http://localhost:5000/add", {
        'method': 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `${idToken}`
        },
        //TODO: Give each password a unique ID in the database
        body: JSON.stringify(inputs)
      })
      .then(response => response.json)
      .then(result => console.log(result));
    })

  }

  function handleDelete(website, username, password) {
    setEntries(entries => entries.filter(entry => entry.website !== website));

    return auth.currentUser.getIdToken(true).then(function (idToken) {
      fetch("http://localhost:5000/delete", {
        'method': 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `${idToken}`
        },
        body: JSON.stringify({ "website": website, "username": username, 'password': password })
      })
      .then(response => response.json)
      .then(result => console.log(result));
    });
  }

  return (
    <>
    <div>
      <h1>Password Manager (Skeleton)</h1>
    </div>
    <div className="topBar">
      <h2 className="label">Website</h2>
      <h2 className="label">Username</h2>
      <h2 className="label">Password</h2>
      <button className="add" onClick={() => setModalVisible(true)}>+</button>
    </div>

    {entryModalVisible &&
    <div className="add-modal">
      <h2>Add Password</h2>
      <form onSubmit={handleEntry}>
        <input className="new-entry-box" type="text" placeholder="Website" name="website" onChange={handleChange}/>
        <input className="new-entry-box" type="text" placeholder="Username" name="username" onChange={handleChange}/>
        <input className="new-entry-box" type="text" placeholder="Password" name="password" onChange={handleChange}/>
        <div className="entry-form-buttons">
          <button type="submit" className="password-save">Save</button>
          <button onClick={() => setModalVisible(false)}>Cancel</button>
        </div>
      </form>
    </div>
    }
      {/*entries.length > 0 &&*/ <div className="displays">
        {entries.map(entry =>
          <PasswordDisplay
            website={entry.website}
            username={entry.username}
            password={entry.password}
            onDelete={() => handleDelete(entry.website, entry.username, entry.password)} />
        )}
      </div>
      }
  </>
  );
}