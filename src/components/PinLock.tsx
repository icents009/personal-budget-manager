"use client";
/**
 * PinLock — full-screen PIN entry screen shown when the app has a PIN set.
 * Uses sessionStorage so the user only enters the PIN once per browser session.
 */
import { useState, useEffect, useRef } from "react";
import { useSettings } from "@/hooks/useDb";

const SESSION_KEY = "budget_pin_unlocked";

export function PinLock({ children }: { children: React.ReactNode }) {
  const { settings, loading } = useSettings();
  const [unlocked, setUnlocked] = useState(false);
  const [pin, setPin] = useState("");
  const [error, setError] = useState(false);
  const [shake, setShake] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Check session on mount
  useEffect(() => {
    if (sessionStorage.getItem(SESSION_KEY) === "1") {
      setUnlocked(true);
    }
  }, []);

  // Focus hidden input when lock screen shows
  useEffect(() => {
    if (!unlocked && !loading && settings?.pin) {
      inputRef.current?.focus();
    }
  }, [unlocked, loading, settings?.pin]);

  // Auto-submit when 4 digits entered
  useEffect(() => {
    if (pin.length === 4) {
      if (pin === settings?.pin) {
        sessionStorage.setItem(SESSION_KEY, "1");
        setUnlocked(true);
        setError(false);
      } else {
        setShake(true);
        setError(true);
        setTimeout(() => {
          setPin("");
          setShake(false);
        }, 600);
      }
    }
  }, [pin, settings?.pin]);

  // No PIN set or already unlocked — render children directly
  if (loading || !settings?.pin || unlocked) {
    return <>{children}</>;
  }

  function pressKey(key: string) {
    if (pin.length < 4) setPin((p) => p + key);
  }

  function deleteKey() {
    setPin((p) => p.slice(0, -1));
    setError(false);
  }

  return (
    <div className="fixed inset-0 z-[9999] bg-indigo-600 flex flex-col items-center justify-center px-6">
      {/* App icon / title */}
      <div className="text-5xl mb-2">💰</div>
      <h1 className="text-white text-2xl font-bold mb-1">Budget Manager</h1>
      <p className="text-indigo-200 text-sm mb-10">Enter your PIN to continue</p>

      {/* Hidden input for keyboard on desktop */}
      <input
        ref={inputRef}
        type="tel"
        inputMode="numeric"
        maxLength={4}
        value={pin}
        onChange={(e) => {
          const val = e.target.value.replace(/\D/g, "").slice(0, 4);
          setPin(val);
          setError(false);
        }}
        className="absolute opacity-0 pointer-events-none"
      />

      {/* PIN dots */}
      <div className={`flex gap-4 mb-3 ${shake ? "animate-shake" : ""}`}>
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className={`w-5 h-5 rounded-full border-2 transition-all duration-150 ${
              i < pin.length
                ? "bg-white border-white scale-110"
                : "bg-transparent border-indigo-300"
            }`}
          />
        ))}
      </div>

      {error && (
        <p className="text-red-300 text-sm mb-4 font-medium">Incorrect PIN. Try again.</p>
      )}
      {!error && <div className="mb-4 h-5" />}

      {/* Number pad */}
      <div className="grid grid-cols-3 gap-3 w-full max-w-xs">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
          <button
            key={n}
            onClick={() => pressKey(String(n))}
            className="h-16 rounded-2xl bg-indigo-500 hover:bg-indigo-400 active:bg-indigo-300 text-white text-2xl font-semibold transition-all active:scale-95"
          >
            {n}
          </button>
        ))}
        {/* Bottom row: empty | 0 | delete */}
        <div />
        <button
          onClick={() => pressKey("0")}
          className="h-16 rounded-2xl bg-indigo-500 hover:bg-indigo-400 active:bg-indigo-300 text-white text-2xl font-semibold transition-all active:scale-95"
        >
          0
        </button>
        <button
          onClick={deleteKey}
          className="h-16 rounded-2xl bg-indigo-500 hover:bg-indigo-400 active:bg-indigo-300 text-white text-2xl font-semibold transition-all active:scale-95"
        >
          ⌫
        </button>
      </div>

      <p className="text-indigo-300 text-xs mt-8">Your data is stored securely on this device</p>
    </div>
  );
}
