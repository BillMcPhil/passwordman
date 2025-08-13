'use client'
import { useRouter } from 'next/navigation'
import { useState, useEffect, useContext } from 'react';
import { initializeApp } from "firebase/app";
import { setPersistence, getAuth, createUserWithEmailAndPassword, browserSessionPersistence, signInWithEmailAndPassword } from "firebase/auth";
import context from '../KeyContext/context.js';

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

    const encoder = new TextEncoder();
    const { key, setKey } = useContext(context);

    const [inputs, setInputs] = useState({});

    // Handle input changes to the form
    const handleChange = (e) => {
        const name = e.target.name;
        const value = e.target.value;
        setInputs(values => ({ ...values, [name]: value }));
    }

    const handleLogin = (e) => {
        e.preventDefault();
        alert("")

        signInWithEmailAndPassword(auth, inputs.email, inputs.password)
            .then((userCredential) => {
                auth.currentUser.getIdToken(true)
                    .then((idToken) => {
                        fetch("http://localhost:5000/login", {
                            'method': 'GET',
                            headers: { 'Content-Type': 'application/json', "Authorization": idToken }
                        })
                        .then(res => res.json())
                        .then(data => {
                            const salt_object = data["salt"];  
                            if (salt_object) {
                                // Reconstruct the salt buffer
                                const bytes = Object.values(salt_object);
                                const uint8 = new Uint8Array(bytes);
                                const salt = uint8.buffer;
                                // Construct key import
                                window.crypto.subtle.importKey(
                                    "raw",
                                    encoder.encode(inputs.password),
                                    "PBKDF2",
                                    false,
                                    ["deriveBits", "deriveKey"]
                                )
                                .then((keyImport) => {
                                    // Derive the key from password    
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
                                    // Set the key in the context and route to vault
                                    .then((key) => {
                                        setKey(key);    
                                        router.push(`/manager/${idToken}`);
                                    })
                                });
                            }
                            else {
                                alert("Salt Failure");
                                router.push('/login');
                            }
                        })    

                })
            })
            .catch((error) => {
                const errorCode = error.code;
                const errorMessage = error.message;
                alert(errorMessage);
            });
    }

    return (
        <>
            <span>Login</span>
            <form onSubmit={handleLogin}>
                <input type="text" placeholder="username" name="email" onChange={handleChange} />
                <input type="text" placeholder="password" name="password" onChange={handleChange} />
                <button type="submit">Log In</button>
            </form>
        </>
    )
}