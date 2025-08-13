'use client'
import { useState, useEffect, useContext } from 'react';
import { useRouter } from 'next/navigation';
import { initializeApp } from "firebase/app";
import { setPersistence, getAuth, createUserWithEmailAndPassword, browserSessionPersistence, signInWithEmailAndPassword } from "firebase/auth";
import context from '../../KeyContext/context.js';

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
  setPersistence(auth, browserSessionPersistence);

  const router = useRouter();

  const { key, setKey } = useContext(context);

  const encoder = new TextEncoder();

  // Fetch passwords from backend API
  useEffect(() => {
    auth.currentUser.getIdToken(true).then(function (idToken) {
      fetch('http://localhost:5000/', { method: "GET", headers: { "Authorization": `${idToken}` } })
        .then(res => res.json())
        .then(result => {
          // Will initially give us a list of decryption promises
          const decryptionPromise = result.map((encryptedEntry) => {
            // Reconstruct the cipher buffer
            const cipherBytes = Object.values(encryptedEntry.cipher);
            const cipherUint8 = new Uint8Array(cipherBytes);
            const cipher = cipherUint8.buffer;
            
            // Reconstruct the nonce buffer
            const nonceBytes = Object.values(encryptedEntry.nonce);
            const nonceUint8 = new Uint8Array(nonceBytes);
            const nonce = nonceUint8.buffer;

            // Decrypt the password
            return window.crypto.subtle.decrypt({ name: "AES-GCM", iv: nonce }, key, cipher).then(decryptedEntry => {
              const password = new TextDecoder().decode(decryptedEntry);
              return { "website": encryptedEntry.website, "username": encryptedEntry.username, "password": password };
            }).catch((error) => { alert(`Vault decryption failed because of ${error}, routing to login`); router.push("/login"); })
          })
          // Wait for promises to complete
          Promise.all(decryptionPromise).then(decryptedPasswords => {
            setEntries(decryptedPasswords);
          }).catch(error => { alert(error); router.push("/login"); });
        }).catch((error) => { alert(error); router.push("/login"); });
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
    setEntries(entries.concat({ "website": inputs.website, "username": inputs.username, "password": inputs.password }));
    
    // Encrypt password input
    const enc = encoder.encode(inputs.password);
    const nonce = window.crypto.getRandomValues(new Uint8Array(12));
    window.crypto.subtle.encrypt({ name: "AES-GCM", iv: nonce }, key, enc).then((cipher) => {
      const ciphertext = new Uint8Array(cipher);
      // Add new password to database
      auth.currentUser.getIdToken(true).then(function (idToken) {
        fetch("http://localhost:5000/add", {
          'method': 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `${idToken}`
          },
          //TODO: Give each password a unique ID in the database
          body: JSON.stringify({ "website": inputs.website, "username": inputs.username, "nonce": nonce, "cipher": ciphertext })
        })
        .then(response => response.json)
        .then(result => console.log(result));
      })
    })

  }

  // Handle the user deleting passwords
  function handleDelete(website, username, password) {
    // Remove password from entries list
    setEntries(entries => entries.filter(entry => entry.website !== website));

    // Query the backend to remove the password from the database
    return auth.currentUser.getIdToken(true).then(function (idToken) {
      fetch("http://localhost:5000/delete", {
        'method': 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `${idToken}`
        },
        body: JSON.stringify({ "website": website })
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
      <div className="displays">
        {entries.map(entry =>
          <PasswordDisplay
            website={entry.website}
            username={entry.username}
            password={entry.password}
            onDelete={() => handleDelete(entry.website, entry.username, entry.password)} />
        )}
      </div>
  </>
  );
}