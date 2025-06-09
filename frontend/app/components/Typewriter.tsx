'use client';

import React, { useEffect, useState } from 'react';

interface TypewriterProps {
    /** Text to display character-by-character */
    text: string;
    /** Delay in milliseconds between each character */
    speed?: number;
}

export default function Typewriter({
                                       text,
                                       speed = 5,    // ← faster: 30ms per char (≈33 chars/sec)
                                   }: TypewriterProps) {
    const [displayed, setDisplayed] = useState('');

    useEffect(() => {
        let index = 0;
        setDisplayed('');

        const interval = setInterval(() => {
            setDisplayed((prev) => prev + text.charAt(index));
            index++;
            if (index >= text.length) clearInterval(interval);
        }, 10);

        return () => clearInterval(interval);
    }, [text, 10]);

    return <>{displayed}</>;
}
