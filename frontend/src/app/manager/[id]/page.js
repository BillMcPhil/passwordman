'use client'
import { useState, useEffect, useContext } from 'react';
import { useRouter } from 'next/navigation';
import { initializeApp } from "firebase/app";
import { setPersistence, getAuth, browserSessionPersistence } from "firebase/auth";
import { v4 as uuidv4 } from 'uuid';
import context from '../../KeyContext/context.js';

const firebaseConfig = //Firebase config goes here

function PasswordDisplay({ id, website, username, password, onDelete, onUpdate }) {
  const [isVisible, setVisible] = useState(false);
  const [isEditing, setEditing] = useState(false);
  const [editInputs, setEditInputs] = useState({});
  const { encryptionKey, setEncryptionKey } = useContext(context);

  const app = initializeApp(firebaseConfig);
  const auth = getAuth();

  function copy() {
    navigator.clipboard.writeText(password);
  }

  const handleEditChange = (e) => {
    const name = e.target.name;
    const value = e.target.value;
    setEditInputs(values => ({ ...values, [name]: value }));
  }

  const handleEdit = (e) => {
    e.preventDefault();
    setEditing(false);

    const enc = new TextEncoder().encode(editInputs.password);
    const nonce = window.crypto.getRandomValues(new Uint8Array(12));
    window.crypto.subtle.encrypt({ name: "AES-GCM", iv: nonce }, encryptionKey, enc).then((cipher) => {
      const ciphertext = new Uint8Array(cipher);
      auth.currentUser.getIdToken(true).then((idToken) => {
        fetch("http://localhost:5000/edit", {
          'method': 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `${idToken}`
          },
          body: JSON.stringify({
            "id": id,
            "website": editInputs.website,
            "username": editInputs.username,
            "nonce": nonce,
            "cipher": ciphertext
          })
        })
          .then(response => response.json)
          .then(result => console.log(result));
      }).catch((error) => alert(error))
    }).catch((error) => alert(error))

    onUpdate({ "id": id, "website": editInputs.website, "username": editInputs.username, "password": editInputs.password });
  }

  return (
    <>
    {!isEditing &&
      <>      
      <div className="grid grid-cols-4 items-center gap-17 py-2 border-b border-gray-700 justify-self-center">
        <p className="w-30 text-center">{website}</p>
        <p className="w-30 text-center"><b>{username}</b></p>
        <p className="w-30 text-center"><b>{isVisible ? password : "***"}</b></p>
        <div className="">
          <button className="m-1 w-13 bg-black outline-2 outline-white-20 rounded-sm hover:bg-sky-700" 
            onClick={() => setVisible(!isVisible)}>{isVisible ? "Hide" : "Reveal"}</button>
          <button className="m-1 w-10 bg-black outline-2 outline-white-20 rounded-sm hover:bg-sky-700" 
            onClick={copy}>Copy</button>
          <button className="m-1 w-8 bg-black outline-2 outline-white-20 rounded-sm hover:bg-sky-700" onClick={() => {
            setEditing(true);
            setEditInputs({
              "website": website,
              "username": username,
              "password": password
            })
          }}>Edit</button>
          <button className="m-1 bg-black outline-2 outline-white-20 rounded-sm hover:bg-sky-700" onClick={onDelete}>Delete</button>
        </div>
      </div>  
      </>  
    }
    {isEditing &&
      <form className="grid grid-cols-4 items-center gap-30 py-2 border-b border-gray-700 justify-self-center" onSubmit={handleEdit}>
        <input className="w-40 bg-black outline-2 outline-white-20 rounded-sm" 
          type="text" placeholder="Website" name="website" value={ editInputs.website } onChange={handleEditChange} />
        <input className="w-40 bg-black outline-2 outline-white-20 rounded-sm" 
          type="text" placeholder="Username" name="username" value={editInputs.username} onChange={handleEditChange} />
        <input className="w-40 bg-black outline-2 outline-white-20 rounded-sm" 
          type="text" placeholder="Password" name="password" value={editInputs.password} onChange={handleEditChange} />
        <div>
          <button type="submit" className="m-1 w-10 bg-black outline-2 outline-white-20 rounded-sm hover:bg-sky-700">Save</button>
          <button  className="m-1 w-15 bg-black outline-2 outline-white-20 rounded-sm hover:bg-sky-700" onClick={() => setEditing(false)}>Cancel</button>
        </div>
      </form>

      }
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

  const { encryptionKey, setEncryptionKey } = useContext(context);

  const encoder = new TextEncoder();

  // Fetch passwords from backend API
  useEffect(() => {
    try {
      auth.currentUser.getIdToken(true).then((idToken) => {
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
              return window.crypto.subtle.decrypt({ name: "AES-GCM", iv: nonce }, encryptionKey, cipher).then(decryptedEntry => {
                const password = new TextDecoder().decode(decryptedEntry);
                return {
                  "id": encryptedEntry.id,
                  "website": encryptedEntry.website,
                  "username": encryptedEntry.username,
                  "password": password
                };
              }).catch((error) => { alert(`Vault decryption failed because of ${error}, routing to login`); router.push("/login"); })
            })
            // Wait for promises to complete
            Promise.all(decryptionPromise).then(decryptedPasswords => {
              setEntries(decryptedPasswords);
            }).catch(error => { alert(error); router.push("/login"); });
          }).catch((error) => { alert(error); router.push("/login"); });
      }).catch((error) => { alert(error); router.push("/login"); })
    }
    catch {
      router.push("/login");
    }
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
    const id = uuidv4();
    setEntries(entries.concat({ "id": id, "website": inputs.website, "username": inputs.username, "password": inputs.password }));
    
    // Encrypt password input
    const enc = encoder.encode(inputs.password);
    const nonce = window.crypto.getRandomValues(new Uint8Array(12));
    window.crypto.subtle.encrypt({ name: "AES-GCM", iv: nonce }, encryptionKey, enc).then((cipher) => {
      const ciphertext = new Uint8Array(cipher);
      // Add new password to database
      auth.currentUser.getIdToken(true).then((idToken) => {
        fetch("http://localhost:5000/add", {
          'method': 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `${idToken}`
          },
          body: JSON.stringify({
            "id": id,
            "website": inputs.website,
            "username": inputs.username,
            "nonce": nonce,
            "cipher": ciphertext
          })
        })
        .then(response => response.json)
        .then(result => console.log(result));
      })
    })

  }

  // Handle the user deleting passwords
  function handleDelete(id) {
    // Remove password from entries list
    setEntries(entries => entries.filter(entry => entry.id !== id));

    // Query the backend to remove the password from the database
    return auth.currentUser.getIdToken(true).then((idToken) => {
      fetch("http://localhost:5000/delete", {
        'method': 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `${idToken}`
        },
        body: JSON.stringify({ "id": id })
      })
      .then(response => response.json)
      .then(result => console.log(result));
    });
  }

  return (
    <>
    <div className="my-15 justify-self-center">
        <h1 className="inline text-center text-5xl font-bold font-mono mt-5 mb-8">PasswordMan Vault</h1>
    </div>
    <div className="">
      <button className="absolute top-18 right-70 text-xl bg-white text-black px-3 py-1 rounded hover:bg-gray-200" 
        onClick={() => setModalVisible(true)}>+</button>
    </div>
    <div className="-translate-x-10 grid grid-cols-4 items-left gap-x-40 justify-self-center">
      <h2 className="text-2xl font-bold font-mono">Website</h2>
      <h2 className="text-2xl font-bold font-mono">Username</h2>
      <h2 className="text-2xl font-bold font-mono">Password</h2>
    </div>
    
    <div className="justify-self-center">
      {entries.map(entry =>
        <PasswordDisplay
          id={entry.id}
          website={entry.website}
          username={entry.username}
          password={entry.password}
          onDelete={() => handleDelete(entry.id)}
          onUpdate={(updatedEntry) => {
            setEntries(prevEntries => prevEntries.map(e => e.id === updatedEntry.id ? updatedEntry : e))
          }} />
      )}
    </div>
    {entryModalVisible &&
      <div>
        <form className="grid grid-cols-4 items-center gap-17 py-2 border-b border-gray-700 justify-self-center" onSubmit={handleEntry}>
          <input className="w-40 bg-black outline-2 outline-white-20 rounded-sm" type="text" placeholder="Website" name="website" onChange={handleChange} />
          <input className="w-40 bg-black outline-2 outline-white-20 rounded-sm" type="text" placeholder="Username" name="username" onChange={handleChange} />
          <input className="w-40 bg-black outline-2 outline-white-20 rounded-sm" type="text" placeholder="Password" name="password" onChange={handleChange} />
          <div className="entry-form-buttons">
            <button type="submit" className="m-1 w-10 bg-black outline-2 outline-white-20 rounded-sm hover:bg-sky-700">Save</button>
            <button className="m-1 w-15 bg-black outline-2 outline-white-20 rounded-sm hover:bg-sky-700" onClick={() => setModalVisible(false)}>Cancel</button>
          </div>
        </form>
      </div>
    }  
  </>
  );
}