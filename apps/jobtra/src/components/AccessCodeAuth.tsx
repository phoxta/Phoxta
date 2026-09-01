import React, { useState, useRef, useEffect } from 'react';
import { Lock, KeyRound, ArrowRight, ShieldCheck, AlertCircle, Eye, EyeOff } from 'lucide-react';

interface AccessCodeAuthProps {
  onSuccess: () => void;
  correctCode?: string;
}

export const ACCESS_AUTH_STORAGE_KEY = 'jobtra_auth_authenticated_v1';
export const ACCESS_CODE_DEFAULT = '082900';

export const AccessCodeAuth: React.FC<AccessCodeAuthProps> = ({
  onSuccess,
  correctCode = ACCESS_CODE_DEFAULT,
}) => {
  const [digits, setDigits] = useState<string[]>(['', '', '', '', '', '']);
  const [singleInput, setSingleInput] = useState('');
  const [useSingleInput, setUseSingleInput] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isShaking, setIsShaking] = useState(false);
  const [rememberDevice, setRememberDevice] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Focus the first input on mount
  useEffect(() => {
    if (!useSingleInput) {
      inputRefs.current[0]?.focus();
    }
  }, [useSingleInput]);

  const verifyCode = (codeToTest: string) => {
    setIsSubmitting(true);
    setError(null);

    // Normalize
    const cleanCode = codeToTest.trim();

    if (cleanCode === correctCode) {
      if (rememberDevice) {
        localStorage.setItem(ACCESS_AUTH_STORAGE_KEY, 'true');
      } else {
        sessionStorage.setItem(ACCESS_AUTH_STORAGE_KEY, 'true');
      }
      setTimeout(() => {
        setIsSubmitting(false);
        onSuccess();
      }, 200);
    } else {
      setTimeout(() => {
        setIsSubmitting(false);
        setError('Incorrect access code. Please enter the valid code.');
        setIsShaking(true);
        setTimeout(() => setIsShaking(false), 600);
        // Clear digits
        setDigits(['', '', '', '', '', '']);
        setSingleInput('');
        inputRefs.current[0]?.focus();
      }, 250);
    }
  };

  const handleDigitChange = (index: number, value: string) => {
    setError(null);
    // If pasted or multi-char
    if (value.length > 1) {
      const pastedDigits = value.replace(/\D/g, '').slice(0, 6).split('');
      const newDigits = [...digits];
      pastedDigits.forEach((d, i) => {
        if (i < 6) newDigits[i] = d;
      });
      setDigits(newDigits);
      if (pastedDigits.length === 6) {
        verifyCode(pastedDigits.join(''));
      } else {
        const nextIndex = Math.min(pastedDigits.length, 5);
        inputRefs.current[nextIndex]?.focus();
      }
      return;
    }

    const val = value.replace(/\D/g, '');
    const newDigits = [...digits];
    newDigits[index] = val;
    setDigits(newDigits);

    if (val && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto submit if all 6 digits filled
    if (val && index === 5) {
      const fullCode = newDigits.join('');
      if (fullCode.length === 6) {
        verifyCode(fullCode);
      }
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === 'Enter') {
      const fullCode = digits.join('');
      if (fullCode.length === 6) {
        verifyCode(fullCode);
      }
    } else if (e.key === 'ArrowLeft' && index > 0) {
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === 'ArrowRight' && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleSingleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!singleInput.trim()) {
      setError('Please enter the access code');
      return;
    }
    verifyCode(singleInput);
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').trim().replace(/\D/g, '').slice(0, 6);
    if (pasted) {
      const newDigits = ['', '', '', '', '', ''];
      pasted.split('').forEach((char, i) => {
        if (i < 6) newDigits[i] = char;
      });
      setDigits(newDigits);
      if (pasted.length === 6) {
        verifyCode(pasted);
      } else {
        inputRefs.current[pasted.length]?.focus();
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-900/60 backdrop-blur-md p-4 selection:bg-blue-100 selection:text-blue-900">
      <div
        className={`w-full max-w-md bg-white rounded-2xl shadow-2xl border border-neutral-200 overflow-hidden transition-transform duration-200 ${
          isShaking ? 'animate-[shake_0.5s_ease-in-out]' : ''
        }`}
        style={{
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        }}
      >
        {/* Header decoration */}
        <div className="bg-gradient-to-b from-neutral-50 to-white px-8 pt-8 pb-6 text-center border-b border-neutral-100">
          <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-blue-50 border border-blue-100 text-blue-600 flex items-center justify-center shadow-xs">
            <Lock className="w-7 h-7 stroke-[2.2]" />
          </div>

          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-neutral-100 text-neutral-600 text-xs font-medium mb-3">
            <span>💼</span>
            <span className="font-semibold text-neutral-800">Jobtra</span>
            <span className="text-neutral-300">•</span>
            <span>Workspace Security</span>
          </div>

          <h2 className="text-xl font-bold text-neutral-900 tracking-tight">
            Enter Access Code
          </h2>
          <p className="text-xs text-neutral-500 mt-1 max-w-xs mx-auto">
            Please enter your 6-digit access passcode to unlock your job applications & tracker.
          </p>
        </div>

        {/* Form Body */}
        <div className="p-8">
          {error && (
            <div className="mb-6 flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-rose-50 border border-rose-200/80 text-rose-700 text-xs font-medium animate-in fade-in slide-in-from-top-1">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
              <span>{error}</span>
            </div>
          )}

          {!useSingleInput ? (
            /* 6-PIN Boxes Input */
            <div className="space-y-6">
              <div className="flex justify-between items-center gap-2 sm:gap-2.5" onPaste={handlePaste}>
                {digits.map((digit, idx) => (
                  <input
                    key={idx}
                    ref={(el) => (inputRefs.current[idx] = el)}
                    type={showPassword ? 'text' : 'password'}
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={idx === 0 ? 6 : 1}
                    value={digit}
                    onChange={(e) => handleDigitChange(idx, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(idx, e)}
                    disabled={isSubmitting}
                    className={`w-12 h-14 sm:w-13 sm:h-15 text-center text-xl font-bold rounded-xl border outline-none transition-all duration-150 ${
                      error
                        ? 'border-rose-400 bg-rose-50/40 text-rose-700 focus:border-rose-500 focus:ring-2 focus:ring-rose-100'
                        : digit
                        ? 'border-blue-500 bg-blue-50/20 text-neutral-900 shadow-xs'
                        : 'border-neutral-200 bg-neutral-50/70 text-neutral-900 hover:bg-neutral-50 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100'
                    }`}
                  />
                ))}
              </div>

              {/* Show / Hide toggle */}
              <div className="flex items-center justify-between text-xs text-neutral-500 pt-1">
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="inline-flex items-center gap-1.5 hover:text-neutral-800 transition cursor-pointer"
                >
                  {showPassword ? (
                    <>
                      <EyeOff className="w-3.5 h-3.5" />
                      <span>Hide digits</span>
                    </>
                  ) : (
                    <>
                      <Eye className="w-3.5 h-3.5" />
                      <span>Show digits</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setUseSingleInput(true)}
                  className="text-blue-600 hover:text-blue-700 font-medium hover:underline cursor-pointer"
                >
                  Use standard input
                </button>
              </div>

              {/* Remember device checkbox */}
              <label className="flex items-center gap-2 text-xs text-neutral-600 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={rememberDevice}
                  onChange={(e) => setRememberDevice(e.target.checked)}
                  className="w-4 h-4 rounded border-neutral-300 text-blue-600 focus:ring-blue-500 accent-blue-600 cursor-pointer"
                />
                <span>Remember this device for 30 days</span>
              </label>

              {/* Submit button */}
              <button
                type="button"
                onClick={() => verifyCode(digits.join(''))}
                disabled={isSubmitting || digits.join('').length < 6}
                className="w-full py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold shadow-xs flex items-center justify-center gap-2 transition cursor-pointer"
              >
                {isSubmitting ? (
                  <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                ) : (
                  <>
                    <span>Unlock Workspace</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          ) : (
            /* Single Text Input Fallback */
            <form onSubmit={handleSingleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1.5">
                  Access Passcode
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={singleInput}
                    onChange={(e) => setSingleInput(e.target.value)}
                    placeholder="Enter access code..."
                    autoFocus
                    className="w-full pl-3.5 pr-10 py-2.5 rounded-xl border border-neutral-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 text-sm text-neutral-900 outline-none transition"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-700"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs text-neutral-500">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={rememberDevice}
                    onChange={(e) => setRememberDevice(e.target.checked)}
                    className="w-4 h-4 rounded border-neutral-300 text-blue-600 focus:ring-blue-500 accent-blue-600 cursor-pointer"
                  />
                  <span>Remember this device</span>
                </label>

                <button
                  type="button"
                  onClick={() => setUseSingleInput(false)}
                  className="text-blue-600 hover:text-blue-700 font-medium hover:underline cursor-pointer"
                >
                  Use PIN boxes
                </button>
              </div>

              <button
                type="submit"
                disabled={isSubmitting || !singleInput.trim()}
                className="w-full py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold shadow-xs flex items-center justify-center gap-2 transition cursor-pointer"
              >
                {isSubmitting ? (
                  <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                ) : (
                  <>
                    <span>Unlock Workspace</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          )}
        </div>

        {/* Footer Security Badge */}
        <div className="bg-neutral-50 px-8 py-3.5 border-t border-neutral-100 flex items-center justify-center gap-2 text-[11px] text-neutral-500">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
          <span>Secured private workspace</span>
        </div>
      </div>
    </div>
  );
};
