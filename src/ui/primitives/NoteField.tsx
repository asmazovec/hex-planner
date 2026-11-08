import { useState } from 'react';

/** A text field that writes to the plan when it is left, so typing leaves one undo step. */
export function NoteField({ label, value, disabled, onCommit }: { label: string; value: string; disabled?: boolean; onCommit: (value: string) => void }) {
  const [text, setText] = useState(value);
  return (
    <label className="field">
      {label}
      <input
        type="text" value={text} disabled={disabled} onChange={e => setText(e.target.value)} onBlur={() => onCommit(text)}
        onKeyDown={e => { if (e.key === 'Enter') onCommit(text); }}
      />
    </label>
  );
}
