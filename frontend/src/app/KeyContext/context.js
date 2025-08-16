"use client";

import { createContext, useContext, useState } from 'react';

const context = createContext();

export function KeyContext({ children }) {
    const [encryptionKey, setEncryptionKey] = useState(null);

    return (
        <context.Provider value={{ encryptionKey, setEncryptionKey }}>
            {children}
        </context.Provider>
    );
}

export default context;