'use client'
import { useRouter } from 'next/navigation'
import Link from 'next/link';
import { useState, useEffect, useContext } from 'react';
import { initializeApp } from "firebase/app";
import { setPersistence, getAuth, createUserWithEmailAndPassword, browserSessionPersistence } from "firebase/auth";
import context from "../KeyContext/context.js";

const firebaseConfig = // Firebase config goes here


export default function Home() {
    const router = useRouter();

    const app = initializeApp(firebaseConfig);
    const auth = getAuth();

    setPersistence(auth, browserSessionPersistence);

    const [inputs, setInputs] = useState({});

    const { encryptionKey, setEncryptionKey } = useContext(context);

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
                // Get the salt that will be used to generate the encryption key
                const salt = window.crypto.getRandomValues(new Uint8Array(16));
                // Get the JWT token to send to backend
                auth.currentUser.getIdToken(true)
                    .then((idToken) => {
                        // Send token and salt to backend for validation and to create the account
                        fetch("http://localhost:5000/create", {
                            'method': 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                'Authorization': idToken
                            },
                            body: JSON.stringify({ "key_salt": salt })
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
                                        setEncryptionKey(key);
                                        // Move to the user's page
                                        router.push(`/manager/${auth.currentUser.uid}`);
                                    })
                                })
                        })
                        .catch((error) => {
                            alert("Invalid email/password. Try again");
                        });
                    });
            });
    }
        

    return (
        <>
            <h1 className="justify-self-center text-5xl font-bold font-mono mt-5">Welcome to PasswordMan</h1>
            <div className="grid rounded-md m-5 py-3 self-stretch justify-self-center w-sm h-xl bg-black shadow-lg outline outline-black/5 dark:bg-slate-800 dark:shadow-none dark:-outline-offset-1 dark:outline-white/10">
                <h1 className="justify-self-center text-3xl font-bold font-mono">Create New Account</h1>
                <form onSubmit={handleAccountCreation} className="justify-self-center grid grid-rows-3">
                    <input className="w-xs mt-2 bg-black outline-2 outline-white-20 rounded-sm row-span-1"
                        type="text" placeholder="Email" name="email" onChange={handleChange} />
                    <input className="mt-2 bg-black outline-2 outline-white-20 rounded-sm"
                        type="password" placeholder="Password" name="password" onChange={handleChange} />
                    <button type="submit" className="mt-2 bg-black outline-2 outline-white-20 rounded-sm hover:bg-sky-700">
                        Sign Up
                    </button>
                </form>
                <h2 className="justify-self-center mt-4">Already have an account?</h2>
                <Link className="text-center justify-self-center" href="/login">
                    <p className="hover:text-sky-700">Log in</p>
                </Link>
            </div>
        </>
    )
}