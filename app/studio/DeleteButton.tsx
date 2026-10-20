"use client";

import { useFormStatus } from "react-dom";

export default function DeleteButton({ title }: { title: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      className="st-link st-danger"
      disabled={pending}
      onClick={(e) => {
        if (!window.confirm(`Delete “${title}”? This can’t be undone.`)) e.preventDefault();
      }}
    >
      {pending ? "Deleting…" : "Delete"}
    </button>
  );
}
