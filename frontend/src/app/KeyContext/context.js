"use client";

import { createContext, useContext, useState } from 'react';

const context = createContext();

export function KeyContext({ children }) {
    const [key, setKey] = useState(null);

    return (
        <context.Provider value={{ key, setKey }}>
            {children}
        </context.Provider>
    );
}

export default context;