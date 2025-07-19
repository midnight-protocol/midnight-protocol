
import React, { useState, useEffect } from 'react';

interface EnhancedTypewriterProps {
  text: string;
  delay?: number;
  speed?: number;
  className?: string;
  showCursor?: boolean;
  onComplete?: () => void;
}

export const EnhancedTypewriter = ({ 
  text, 
  delay = 1000, 
  speed = 50, 
  className = "", 
  showCursor = true,
  onComplete
}: EnhancedTypewriterProps) => {
  const [displayedText, setDisplayedText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [cursorVisible, setCursorVisible] = useState(true);

  useEffect(() => {
    const startTyping = setTimeout(() => {
      setIsTyping(true);
      let i = 0;
      const typingInterval = setInterval(() => {
        if (i < text.length) {
          setDisplayedText(text.slice(0, i + 1));
          i++;
        } else {
          clearInterval(typingInterval);
          setIsTyping(false);
          onComplete?.();
        }
      }, speed + Math.random() * 30); // Add slight randomness to typing speed

      return () => clearInterval(typingInterval);
    }, delay);

    return () => clearTimeout(startTyping);
  }, [text, delay, speed, onComplete]);

  useEffect(() => {
    const cursorInterval = setInterval(() => {
      setCursorVisible(prev => !prev);
    }, 600);

    return () => clearInterval(cursorInterval);
  }, []);

  return (
    <span className={className}>
      {displayedText}
      {showCursor && (isTyping || displayedText.length < text.length) && (
        <span className={`inline-block w-2 h-6 bg-terminal-cyan ml-1 ${cursorVisible ? 'opacity-100' : 'opacity-0'} transition-opacity`}>
        </span>
      )}
    </span>
  );
};
