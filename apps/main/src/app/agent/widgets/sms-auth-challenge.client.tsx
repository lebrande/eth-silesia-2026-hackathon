"use client";

import {
  useEffect,
  useRef,
  useState,
  type ClipboardEvent,
  type KeyboardEvent,
} from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { SmsAuthChallengeData } from "@/graphs/chat/chat.widgets.shared";
import { useWidgetActions } from "../widget-actions.client";

const LEN = 6;

export function SmsAuthChallengeWidget({
  data,
}: {
  data: SmsAuthChallengeData;
}) {
  const { sendText, sending } = useWidgetActions();
  const [digits, setDigits] = useState<string[]>(() => Array(LEN).fill(""));
  const [submitted, setSubmitted] = useState(false);
  const inputsRef = useRef<Array<HTMLInputElement | null>>([]);

  useEffect(() => {
    inputsRef.current[0]?.focus();
  }, []);

  function setDigitAt(i: number, v: string) {
    setDigits((prev) => {
      const next = [...prev];
      next[i] = v;
      return next;
    });
  }

  async function maybeSubmit(nextDigits: string[]) {
    if (submitted) return;
    const code = nextDigits.join("");
    if (code.length !== LEN || !/^\d{6}$/.test(code)) return;
    setSubmitted(true);
    await sendText(code);
  }

  function handleChange(i: number, raw: string) {
    const digit = raw.replace(/\D/g, "").slice(-1);
    if (!digit) {
      setDigitAt(i, "");
      return;
    }
    const next = [...digits];
    next[i] = digit;
    setDigits(next);
    if (i < LEN - 1) {
      inputsRef.current[i + 1]?.focus();
    } else {
      void maybeSubmit(next);
    }
  }

  function handleKeyDown(i: number, e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace" && !digits[i] && i > 0) {
      e.preventDefault();
      inputsRef.current[i - 1]?.focus();
      setDigitAt(i - 1, "");
    }
  }

  function handlePaste(e: ClipboardEvent<HTMLInputElement>) {
    const text = e.clipboardData
      .getData("text")
      .replace(/\D/g, "")
      .slice(0, LEN);
    if (text.length < 2) return;
    e.preventDefault();
    const next = Array(LEN).fill("");
    for (let i = 0; i < text.length; i++) next[i] = text[i];
    setDigits(next);
    const focusIdx = Math.min(text.length, LEN - 1);
    inputsRef.current[focusIdx]?.focus();
    void maybeSubmit(next);
  }

  const disabled = submitted || sending;

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Kod weryfikacyjny SMS</CardTitle>
        <p className="mt-1 text-sm text-muted-foreground">
          Wysłaliśmy 6-cyfrowy kod na numer {data.phoneMasked}.
        </p>
      </CardHeader>
      <CardContent>
        <div className="flex gap-2">
          {digits.map((d, i) => (
            <input
              key={i}
              ref={(el) => {
                inputsRef.current[i] = el;
              }}
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={1}
              value={d}
              disabled={disabled}
              aria-label={`Cyfra ${i + 1} z ${LEN}`}
              onChange={(e) => handleChange(i, e.target.value)}
              onKeyDown={(e) => handleKeyDown(i, e)}
              onPaste={(e) => handlePaste(e)}
              className={cn(
                "h-12 w-10 rounded-md border border-border bg-white text-center text-lg font-semibold",
                "focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30",
                "disabled:opacity-60",
              )}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
