'use client'
import { useRouter } from 'next/navigation'
import { useState, useEffect } from 'react';
import { initializeApp } from "firebase/app"
import { getAuth, createUserWithEmailAndPassword } from "firebase/auth"

const firebaseConfig = // firebase config goes here


export default function Home() {
    const router = useRouter();

    const app = initializeApp(firebaseConfig);
    const auth = getAuth();

    const [inputs, setInputs] = useState({});

    const handleChange = (e) => {
        const name = e.target.name;
        const value = e.target.value;
        setInputs(values => ({ ...values, [name]: value }));
        console.log(name, value);
    }

    const handleAccountCreation = (e) => {
        e.preventDefault();

        console.log(inputs);

        createUserWithEmailAndPassword(auth, inputs.email, inputs.password)
            .then((userCredential) => {
                const user = userCredential.user;
            })
            .catch((error) => {
                const errorCode = error.code;
                const errorMessage = error.message
                alert(errorMessage);
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