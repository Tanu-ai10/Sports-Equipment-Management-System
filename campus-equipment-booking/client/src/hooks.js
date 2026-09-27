import { useState, useCallback, useRef } from 'react';

export function useToast() {
  const [message, setMessage] = useState(null);
  const timerRef = useRef(null);

  const showToast = useCallback((msg) => {
    setMessage(msg);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setMessage(null), 2800);
  }, []);

  return [message, showToast];
}

export function errorMessage(err, fallback = 'Something went wrong.') {
  return err?.response?.data?.error || fallback;
}
