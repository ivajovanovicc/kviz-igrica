import { useState } from "react";

// Polje za rešenje (kolona ili konačno) u Asocijacijama: klikom postaje polje za kucanje, na istom mestu.
export default function AnswerBox({
  className,
  label,
  editing,
  disabled,
  placeholder,
  onStart,
  onCancel,
  onSubmit,
}: {
  className: string;
  label: string;
  editing: boolean;
  disabled: boolean;
  placeholder: string;
  onStart: () => void;
  onCancel: () => void;
  onSubmit: (text: string) => void;
}) {
  const [text, setText] = useState("");

  if (editing && !disabled) {
    return (
      <form
        className={`${className} editing`}
        onSubmit={(e) => {
          e.preventDefault();
          if (!text.trim()) return;
          onSubmit(text);
          setText("");
        }}
      >
        <input
          autoFocus
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={placeholder}
          enterKeyHint="send"
          autoComplete="off"
          autoCapitalize="off"
          onBlur={() => {
            if (!text.trim()) onCancel();
          }}
          onKeyDown={(e) => {
            if (e.key === "Escape") onCancel();
          }}
        />
        <button type="submit" className="answer-ok" disabled={!text.trim()} aria-label="pogodi">
          ✓
        </button>
      </form>
    );
  }

  return (
    <button className={className} disabled={disabled} onClick={onStart}>
      {label}
    </button>
  );
}
