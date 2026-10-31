'use client';

import { useState } from 'react';

export function MobileMenu({ children }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        className="menu-toggle"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Abrir menu"
        aria-expanded={isOpen}
      >
        <span></span>
        <span></span>
        <span></span>
      </button>
      {isOpen && <div className="mobile-menu-backdrop" onClick={() => setIsOpen(false)} />}
      <div className={`mobile-menu ${isOpen ? 'is-open' : ''}`} onClick={() => setIsOpen(false)}>
        {children}
      </div>
    </>
  );
}
