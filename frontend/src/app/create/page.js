'use client'
import { useRouter } from 'next/navigation'
import { useState, useEffect, useContext } from 'react';
import { initializeApp } from "firebase/app";
import { setPersistence, getAuth, createUserWithEmailAndPassword, browserSessionPersistence } from "firebase/auth";
import context from "../KeyContext/context.js";

const firebaseConfig = {
    apiKey: "AIzaSyCS8WpQvPwQjU71qFO5vAd8bEhykTSlB8M",
    authDomain: "passwordman-ef84c.firebaseapp.com",
    projectId: "passwordman-ef84c",
    storageBucket: "passwordman-ef84c.firebasestorage.app",
    messagingSenderId: "692808035180",
    appId: "1:692808035180:web:7626d0eba10c688559e149",
    measurementId: "G-BLRY3HKY44"
};


export default function Home() {
    const router = useRouter();

    const app = initializeApp(firebaseConfig);
    const auth = getAuth();

    setPersistence(auth, browserSessionPersistence);

    const [inputs, setInputs] = useState({});

    const { key, setKey } = useContext(context);

    const encoder = new TextEncoder();

    // Handle input changes to the form
    const handleChange = (e) => {
        const name = e.target.name;
        const value = e.target.value;
        setInputs(values => ({ ...values, [name]: value }));
    }

    // Create account when form is submitted
    const handleAccountCreation = (e) => {
        e.preventDefault();

        // Create the user with the given email and password
        createUserWithEmailAndPassword(auth, inputs.email, inputs.password)
            .then((userCredential) => {
                const user = userCredential.user;
                // Get the salt that will be used to generate the encryption key
                const salt = window.crypto.getRandomValues(new Uint8Array(16));
                // Get the JWT token to send to backend
                auth.currentUser.getIdToken(true)
                    .then((idToken) => {
                        // Send token and salt to backend for validation and to create the account
                        fetch("http://localhost:5000/create", {
                            'method': 'POST',
                            headers: {
                                'Content-Type': 'application/json'
                            },
                            body: JSON.stringify({ "id_token": idToken, "key_salt": salt })
                        })
                        .then(response => response.json)
                        .then(result => {
                            // Import the encryption key
                            window.crypto.subtle.importKey(
                                "raw",
                                encoder.encode(inputs.password),
                                "PBKDF2",
                                false,
                                ["deriveBits", "deriveKey"]
                                )
                                .then((keyImport) => {
                                    // Derive the encryption key
                                    window.crypto.subtle.deriveKey(
                                        {
                                            name: "PBKDF2",
                                            salt,
                                            iterations: 100000,
                                            hash: "SHA-256"
                                        },
                                        keyImport,
                                        { name: "AES-GCM", length: 256 },
                                        true,
                                        ["encrypt", "decrypt"]
                                    )
                                    .then((key) => {
                                        // Set the key in the context for later encryption/decryption    
                                        setKey(key);
                                        // Move to the user's page
                                        router.push(`/manager/${idToken}`);
                                    })
                                })
                        })
                        .catch((error) => {
                            const errorCode = error.code;
                            const errorMessage = error.message
                            alert(errorMessage);
                        });
                    });
            });
    }
        

    return (
        <>
            <span>Create New Account</span>
            <form onSubmit={handleAccountCreation}>
                <input type="text" placeholder="username" name="email" onChange={handleChange} />
                <input type="text" placeholder="password" name="password" onChange={handleChange} />
                <button type="submit">Sign Up</button>
            </form>
        </>
    )
}