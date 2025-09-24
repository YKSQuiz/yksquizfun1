import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';

interface AutoResizeTextProps {
  text: string;
  className?: string;
  style?: React.CSSProperties;
  minFontSize?: number;
  maxFontSize?: number;
}

const AutoResizeText: React.FC<AutoResizeTextProps> = ({
  text,
  className = '',
  style = {},
  minFontSize = 12,
  maxFontSize = 24
}) => {
  const textRef = useRef<HTMLDivElement>(null);
  const [fontSize, setFontSize] = useState(maxFontSize);

  const adjustFontSize = useCallback(() => {
    if (!textRef.current) return;

    const container = textRef.current;
    const containerWidth = container.offsetWidth;
    const containerHeight = container.offsetHeight;

    let currentFontSize = maxFontSize;
    container.style.fontSize = `${currentFontSize}px`;

    while (
      (container.scrollWidth > containerWidth || 
       container.scrollHeight > containerHeight) && 
      currentFontSize > minFontSize
    ) {
      currentFontSize--;
      container.style.fontSize = `${currentFontSize}px`;
    }

    setFontSize(currentFontSize);
  }, [minFontSize, maxFontSize]);

  useEffect(() => {
    adjustFontSize();
    
    const handleResize = () => {
      adjustFontSize();
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [adjustFontSize]);

  const containerStyle = useMemo(() => ({
    fontSize: `${fontSize}px`,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    ...style
  }), [fontSize, style]);

  return (
    <div
      ref={textRef}
      className={`auto-resize-text ${className}`}
      style={containerStyle}
    >
      {text}
    </div>
  );
};

export default AutoResizeText; 