'use client'
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useState, useEffect, useContext } from 'react';
import { initializeApp } from "firebase/app";
import { setPersistence, getAuth, browserSessionPersistence, signInWithEmailAndPassword } from "firebase/auth";
import context from '../KeyContext/context.js';

const firebaseConfig = // Firebase config goes here

export default function Home() {

    const router = useRouter();

    const app = initializeApp(firebaseConfig);
    const auth = getAuth();

    const encoder = new TextEncoder();
    const { encryptionKey, setEncryptionKey } = useContext(context);

    const [inputs, setInputs] = useState({});

    // Handle input changes to the form
    const handleChange = (e) => {
        const name = e.target.name;
        const value = e.target.value;
        setInputs(values => ({ ...values, [name]: value }));
    }

    const handleLogin = (e) => {
        e.preventDefault();
        setPersistence(auth, browserSessionPersistence).then(() => {    
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
                                    alert(data["salt"]);
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
                                                        setEncryptionKey(key);
                                                        router.push(`/manager/${auth.currentUser.uid}`);
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
                alert("Incorrect email/password. Please try again");
            });
        });
    }

    return (
        <>
            <h1 className="justify-self-center text-5xl font-bold font-mono mt-5">Welcome to PasswordMan</h1>
            <div className="grid rounded-md m-5 py-3 self-stretch justify-self-center w-sm h-xl bg-black shadow-lg outline outline-black/5 dark:bg-slate-800 dark:shadow-none dark:-outline-offset-1 dark:outline-white/10">
                <h1 className="justify-self-center text-3xl font-bold font-mono">Login</h1>
                <form onSubmit={handleLogin} className="justify-self-center grid grid-rows-3">
                    <input className="w-xs mt-2 bg-black outline-2 outline-white-20 rounded-sm row-span-1"
                        type="text" placeholder="Email" name="email" onChange={handleChange} />
                    <input className="mt-2 bg-black outline-2 outline-white-20 rounded-sm"
                        type="password" placeholder="Password" name="password" onChange={handleChange} />
                    <button type="submit" className="mt-2 bg-black outline-2 outline-white-20 rounded-sm hover:bg-sky-700">Log In</button>
                </form>
                <h2 className="justify-self-center mt-4">New Here?</h2>
                <Link className="text-center justify-self-center" href="/create">
                    <p className="hover:text-sky-700">Sign up</p>
                </Link>
            </div>
        </>
    )
}