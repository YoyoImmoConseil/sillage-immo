"use client";

import { useEffect, useRef, useState } from "react";

export type PersonSuggestion = {
  id: string;
  email: string;
  phone: string | null;
  fullName: string | null;
  firstName: string | null;
  lastName: string | null;
  accountActivated: boolean;
};

type PersonAutocompleteProps = {
  id: string;
  email: string;
  onEmailChange: (email: string) => void;
  onSelect: (person: PersonSuggestion) => void;
  required?: boolean;
  placeholder?: string;
};

export function PersonAutocomplete({
  id,
  email,
  onEmailChange,
  onSelect,
  required,
  placeholder,
}: PersonAutocompleteProps) {
  const [suggestions, setSuggestions] = useState<PersonSuggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  // Set when the field value comes from picking a suggestion, so we don't
  // immediately re-query and re-open the dropdown for that same value.
  const justSelected = useRef(false);

  useEffect(() => {
    if (justSelected.current) {
      justSelected.current = false;
      return;
    }
    const term = email.trim();
    if (term.length < 2) {
      setSuggestions([]);
      setOpen(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    const handle = setTimeout(async () => {
      try {
        const res = await fetch(`/api/admin/persons/search?q=${encodeURIComponent(term)}`);
        const json = await res.json();
        if (cancelled) return;
        if (res.ok && json.ok) {
          setSuggestions(json.results as PersonSuggestion[]);
          setOpen((json.results as PersonSuggestion[]).length > 0);
        }
      } catch {
        if (!cancelled) setSuggestions([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(handle);
    };
  }, [email]);

  const handlePick = (person: PersonSuggestion) => {
    justSelected.current = true;
    onSelect(person);
    setOpen(false);
    setSuggestions([]);
  };

  return (
    <div className="relative">
      <input
        id={id}
        type="email"
        required={required}
        value={email}
        autoComplete="off"
        onChange={(e) => onEmailChange(e.target.value)}
        onFocus={() => suggestions.length > 0 && setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        className="mt-1 w-full rounded border px-3 py-2 text-sm"
        placeholder={placeholder ?? "email@exemple.fr"}
      />
      {open && suggestions.length > 0 && (
        <ul className="absolute z-20 mt-1 max-h-56 w-full overflow-auto rounded-xl border border-[rgba(20,20,70,0.16)] bg-white shadow-lg">
          {suggestions.map((person) => (
            <li key={person.id}>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => handlePick(person)}
                className="flex w-full flex-col items-start px-3 py-2 text-left text-sm hover:bg-[rgba(20,20,70,0.05)]"
              >
                <span className="font-medium text-navy">
                  {person.fullName ?? person.email}
                </span>
                <span className="text-xs text-navy/60">
                  {person.email}
                  {person.phone ? ` · ${person.phone}` : ""}
                  {person.accountActivated ? " · compte activé" : ""}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {loading && <p className="mt-1 text-xs text-navy/50">Recherche…</p>}
    </div>
  );
}
