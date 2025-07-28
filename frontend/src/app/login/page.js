'use client'
import { useRouter } from 'next/navigation'
import { useState, useEffect } from 'react';
import { initializeApp } from "firebase/app";
import { setPersistence, getAuth, createUserWithEmailAndPassword, browserSessionPersistence, signInWithEmailAndPassword } from "firebase/auth";

const firebaseConfig = // Firebase config goes here

export default function Home() {

    const router = useRouter();

    const app = initializeApp(firebaseConfig);
    const auth = getAuth();

    setPersistence(auth, browserSessionPersistence);

    const [inputs, setInputs] = useState({});

    // Handle input changes to the form
    const handleChange = (e) => {
        const name = e.target.name;
        const value = e.target.value;
        setInputs(values => ({ ...values, [name]: value }));
    }

    const handleLogin = (e) => {
        e.preventDefault();

        signInWithEmailAndPassword(auth, inputs.email, inputs.password)
            .then((userCredential) => {
                const user = userCredential.user;
                auth.currentUser.getIdToken(true)
                    .then(function (idToken) {
                        router.push(`/manager/${idToken}`);
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
                <button type="submit">Sign Up</button>
            </form>
        </>
    )
}