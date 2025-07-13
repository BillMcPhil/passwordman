'use client'
import Image from "next/image";
import styles from "./page.module.css";
import { useState, useEffect } from 'react';

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

  // Fetch passwords from backend API
  useEffect(() => {
    fetch('http://localhost:5000/').then(res => res.json()).then(data => {
      setEntries(data);
    });
  }, []);

  // Handle change in inputs for adding new passwords
  const handleChange = (e) => {
    const name = e.target.name;
    const value = e.target.value;
    setInputs(values => ({ ...values, [name]: value }));
  }

  // Handle entering the password form
  const handleEntry = (e) => {
    e.preventDefault();
    setModalVisible(false);
    setEntries(entries.concat({"website": inputs.website, "username": inputs.username, "password": inputs.password}));

    // Add new password to database
    return fetch("http://localhost:5000/add", {
      'method': 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      //TODO: Give each password a unique ID in the database
      body: JSON.stringify(inputs)
    })
      .then(response => response.json)
      .then(result => console.log(result));

  }

  function handleDelete(website) {
    setEntries(entries => entries.filter(entry => entry.website !== website));

    return fetch("http://localhost:5000/delete", {
      'method': 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ "website": website })
    })
      .then(response => response.json)
      .then(result => console.log(result));
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
    <div className="displays">
        {entries.map(entry =>
          <PasswordDisplay
            website={entry.website}
            username={entry.username}
            password={entry.password}
            onDelete={() => handleDelete(entry.website)} />
      )}
    </div>
  </>
  );
}