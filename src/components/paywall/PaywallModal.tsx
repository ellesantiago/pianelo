"use client";

import { SignupStep } from "./SignupStep";

interface SignupPromptModalProps {
  onClose: () => void;
}

/**
 * Opened the moment a guest presses a piano key (see
 * GatedPiano/usePianoEngine's `locked` option). The piano itself is free to
 * any logged-in user -- this modal only ever needs to get them registered,
 * there's no payment step here. See PurchaseModal for the two paid add-ons
 * (letter notes + recording, and ad removal).
 */
export function SignupPromptModal({ onClose }: SignupPromptModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-sm rounded-2xl border border-neutral-200 bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-start justify-between">
          <h2 className="text-lg font-semibold">Sign up to play</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="text-neutral-400 hover:text-neutral-700"
          >
            ✕
          </button>
        </div>

        <SignupStep
          prompt="Create a free account -- the piano is free to play, forever, no payment needed."
          onAuthenticated={onClose}
        />
      </div>
    </div>
  );
}
