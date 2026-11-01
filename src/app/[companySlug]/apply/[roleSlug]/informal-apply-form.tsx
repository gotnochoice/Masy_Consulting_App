"use client";

import { useActionState, useState } from "react";
import { CheckCircle2, Camera, User, Phone, Mail, MapPin } from "lucide-react";
import { SocialLinksList } from "@/components/social-links";
import type { InformalApplyState } from "./informal-actions";

const inputClass =
  "w-full rounded-btn border border-border bg-paper px-4 py-3.5 text-base text-ink transition-shadow focus:border-indigo focus:outline-none focus:ring-4 focus:ring-indigo-tint";
const labelClass = "mb-2 flex items-center gap-2 text-base font-semibold text-ink";
const buttonClass =
  "w-full rounded-btn bg-indigo px-4 py-4 text-base font-bold text-white shadow-sm transition-colors hover:bg-indigo-light disabled:cursor-not-allowed disabled:opacity-50";

export function InformalApplyForm({
  action,
  roleTitle,
  companyName,
  workSampleLabel,
}: {
  action: (prevState: InformalApplyState, formData: FormData) => Promise<InformalApplyState>;
  roleTitle: string;
  companyName: string;
  workSampleLabel: string;
}) {
  const [state, formAction, isPending] = useActionState<InformalApplyState, FormData>(action, {});
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

  if (state && "success" in state) {
    return (
      <div className="py-4 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-indigo-tint">
          <CheckCircle2 className="h-8 w-8 text-indigo" strokeWidth={2} />
        </div>
        <h2 className="mt-5 text-2xl font-extrabold text-ink">We got it!</h2>
        <p className="mx-auto mt-3 max-w-sm text-base leading-relaxed text-slate">
          {state.name ? `Thank you, ${state.name}. ` : "Thank you. "}
          Your application for <span className="font-medium text-ink">{roleTitle}</span> has been received.
        </p>
        <p className="mx-auto mt-4 max-w-sm text-base leading-relaxed text-slate">
          If they want to talk to you, someone from {companyName} or Masy Consulting will call or WhatsApp you.
        </p>

        <div className="mx-auto mt-8 max-w-sm border-t border-border pt-6">
          <p className="text-base font-semibold text-ink">Follow us for more jobs like this</p>
          <p className="mt-1 text-sm text-slate">We post new opportunities on these pages every week.</p>
          <SocialLinksList className="mt-4" />
        </div>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-6">
      <div className="hidden" aria-hidden="true">
        <input id="hp_gate" name="hp_gate" type="text" tabIndex={-1} autoComplete="off" />
      </div>

      <div>
        <label className={labelClass} htmlFor="name">
          <User className="h-5 w-5 text-indigo" strokeWidth={2} />
          Your full name
        </label>
        <input id="name" name="name" required autoComplete="name" className={inputClass} />
      </div>

      <div>
        <label className={labelClass} htmlFor="phone">
          <Phone className="h-5 w-5 text-indigo" strokeWidth={2} />
          Your phone number
        </label>
        <input id="phone" name="phone" type="tel" required autoComplete="tel" className={inputClass} />
      </div>

      <div>
        <label className={labelClass} htmlFor="email">
          <Mail className="h-5 w-5 text-indigo" strokeWidth={2} />
          Email <span className="text-sm font-normal text-slate-light">(only if you have one)</span>
        </label>
        <input id="email" name="email" type="email" autoComplete="email" className={inputClass} />
      </div>

      <div>
        <label className={labelClass} htmlFor="location">
          <MapPin className="h-5 w-5 text-indigo" strokeWidth={2} />
          Where are you? <span className="text-sm font-normal text-slate-light">e.g. Maryland, Lagos</span>
        </label>
        <input id="location" name="location" className={inputClass} />
      </div>

      <div>
        <label className={labelClass} htmlFor="workSamplePhoto">
          <Camera className="h-5 w-5 text-indigo" strokeWidth={2} />
          {workSampleLabel}
        </label>
        <p className="mb-2 text-sm text-slate">Take a photo now, or choose one you already have.</p>
        <input
          id="workSamplePhoto"
          name="workSamplePhoto"
          type="file"
          accept="image/*"
          capture="environment"
          required
          onChange={(e) => {
            const file = e.target.files?.[0];
            setPhotoPreview(file ? URL.createObjectURL(file) : null);
          }}
          className="sr-only"
        />
        <label
          htmlFor="workSamplePhoto"
          className="flex cursor-pointer flex-col items-center justify-center gap-3 rounded-card border-2 border-dashed border-indigo/40 bg-indigo-tint/40 p-6 text-center transition-colors active:bg-indigo-tint"
        >
          {photoPreview ? (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element -- local object URL preview, not a remote asset */}
              <img
                src={photoPreview}
                alt="Your uploaded photo"
                className="h-48 w-full rounded-card border border-border object-cover"
              />
              <span className="text-base font-semibold text-indigo">Tap to change photo</span>
            </>
          ) : (
            <>
              <span className="flex h-16 w-16 items-center justify-center rounded-full bg-indigo text-white">
                <Camera className="h-8 w-8" strokeWidth={2} />
              </span>
              <span className="text-base font-bold text-indigo">Tap to take or choose a photo</span>
            </>
          )}
        </label>
      </div>

      <div className="rounded-card border border-border bg-paper-2 p-4">
        <p className="text-base font-semibold text-ink">Are you following us?</p>
        <p className="mt-1 text-sm text-slate">Follow us so you don&rsquo;t miss more jobs like this one.</p>
        <SocialLinksList className="mt-3" />
      </div>

      {state && "error" in state && (
        <p className="rounded-btn bg-orange-light/40 px-4 py-3 text-base font-medium text-orange">{state.error}</p>
      )}

      <button type="submit" disabled={isPending} className={buttonClass}>
        {isPending ? "Sending..." : "Send my application"}
      </button>
    </form>
  );
}
