import React, { useRef, useEffect, useCallback } from 'react';

interface AutoResizeTextProps {
  children: string;
  maxFont?: number;
  minFont?: number;
  style?: React.CSSProperties;
}

const AutoResizeText: React.FC<AutoResizeTextProps> = ({
  children,
  maxFont = 17,
  minFont = 10,
  style
}) => {
  const spanRef = useRef<HTMLSpanElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const checkIfTextFits = useCallback((fontSize: number): boolean => {
    if (!spanRef.current || !containerRef.current) return false;
    
    spanRef.current.style.fontSize = `${fontSize}px`;
    
    return spanRef.current.scrollHeight <= containerRef.current.offsetHeight && 
           spanRef.current.scrollWidth <= containerRef.current.offsetWidth;
  }, []);

  useEffect(() => {
    if (!spanRef.current || !containerRef.current) return;
    
    let currentFont = maxFont;
    
    // Metni sığana kadar font boyutunu küçült
    while (!checkIfTextFits(currentFont) && currentFont > minFont) {
      currentFont -= 1;
    }
    
    // Son font boyutunu ayarla
    spanRef.current.style.fontSize = `${currentFont}px`;
  }, [children, maxFont, minFont, checkIfTextFits]);

  return (
    <div 
      ref={containerRef} 
      style={{
        width: '100%', 
        height: '2.8em', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        overflow: 'hidden',
        ...style
      }}
    >
      <span 
        ref={spanRef} 
        style={{
          fontSize: maxFont, 
          fontWeight: 700, 
          lineHeight: 1.22, 
          width: '100%', 
          textAlign: 'center', 
          wordBreak: 'break-word', 
          whiteSpace: 'normal', 
          display: 'block'
        }}
      >
        {children}
      </span>
    </div>
  );
};

export default AutoResizeText; 