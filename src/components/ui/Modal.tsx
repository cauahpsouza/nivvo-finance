import React, { useEffect, useId, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { cn } from '../../lib/utils';
import { MOTION_MS } from '../../lib/motion';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

export function Modal({ isOpen, onClose, title, children }: ModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const [rendered, setRendered] = useState(isOpen);
  const [closing, setClosing] = useState(false);

  useEffect(() => {
    let frame = 0;
    let timeout: ReturnType<typeof setTimeout> | undefined;
    if (isOpen) {
      frame = requestAnimationFrame(() => {
        setRendered(true);
        setClosing(false);
      });
    } else if (rendered) {
      frame = requestAnimationFrame(() => setClosing(true));
      timeout = setTimeout(() => {
        setRendered(false);
        setClosing(false);
      }, MOTION_MS.normal);
    }
    return () => {
      if (frame) cancelAnimationFrame(frame);
      if (timeout) clearTimeout(timeout);
    };
  }, [isOpen, rendered]);

  useEffect(() => {
    if (!isOpen || !rendered) return;
    const previouslyFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key !== 'Tab' || !dialogRef.current) return;
      const focusable = [...dialogRef.current.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
      )].filter(element => !element.hasAttribute('hidden') && element.getAttribute('aria-hidden') !== 'true');
      if (!focusable.length) {
        event.preventDefault();
        dialogRef.current.focus();
        return;
      }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';
    const focusFrame = requestAnimationFrame(() => dialogRef.current?.focus());
    return () => {
      cancelAnimationFrame(focusFrame);
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = previousOverflow;
      previouslyFocused?.focus();
    };
  }, [isOpen, onClose, rendered]);

  if (!rendered) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end md:justify-center items-center">
      <div 
        ref={overlayRef}
        className={`${closing ? 'modal-backdrop-exit' : 'modal-backdrop-enter'} absolute inset-0 bg-brand-900/40 backdrop-blur-sm`}
        onClick={onClose}
        aria-hidden="true"
      />
      <div 
        className={cn(
          "relative bg-surface w-full md:w-[480px] max-h-[90vh] overflow-y-auto z-10 flex flex-col",
          closing ? "modal-panel-exit rounded-t-[24px] shadow-2xl md:rounded-[24px]" : "modal-panel-enter rounded-t-[24px] shadow-2xl md:rounded-[24px]"
        )}
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
      >
        <div className="sticky top-0 bg-surface flex items-center justify-between p-5 border-b border-border z-20">
          <h2 id={titleId} className="text-lg font-bold text-text-primary">{title}</h2>
          <button 
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-background flex items-center justify-center text-text-secondary hover:text-text-primary transition-colors focus:outline-none focus:ring-2 focus:ring-brand-500"
            aria-label="Fechar"
          >
            <X size={18} />
          </button>
        </div>
        <div className="p-5 pb-safe">
          {children}
        </div>
      </div>
    </div>
  );
}
