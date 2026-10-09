"use client";

import { Checkbox, Field, Input, Textarea } from "@/components/ui";
import { useSiteLinks } from "@/components/site/site-links";
import { FIELD_DEFINITIONS, todayIso, type FieldSetting } from "@/lib/cta/fields";
import { cn } from "@/lib/utils/cn";

/** A random key per opened form, so a repeated submission is recognised. */
export function newSubmissionKey(): string {
  const bytes = new Uint8Array(18);
  crypto.getRandomValues(bytes);
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/** Empty values for every field a form could show. */
export function emptyValues(): Record<string, string> {
  return {
    name: "",
    email: "",
    ...Object.fromEntries(Object.keys(FIELD_DEFINITIONS).map((key) => [key, ""])),
  };
}

/**
 * The contact fields of a popup, as the configuration asks for them.
 *
 * Controlled: values live in the caller's state, so a server refusal does not
 * empty the form (React resets a form once its action returns) and the
 * quotation modal can keep what was typed when it is closed and reopened.
 */
export function CtaFields({
  settings,
  values,
  errors,
  onChange,
  compact = false,
}: {
  settings: FieldSetting[];
  values: Record<string, string>;
  errors?: Record<string, string>;
  onChange: (key: string, value: string) => void;
  /** One column, for a narrow popup. */
  compact?: boolean;
}) {
  const shown = settings.filter((setting) => setting.enabled);

  return (
    <div className={cn("grid gap-4", compact ? "grid-cols-1" : "sm:grid-cols-2")}>
      <Field label="Full name" required error={errors?.name}>
        {(control) => (
          <Input
            name="name"
            autoComplete="name"
            maxLength={120}
            value={values.name ?? ""}
            onChange={(event) => onChange("name", event.target.value)}
            {...control}
          />
        )}
      </Field>
      <Field label="Email" required error={errors?.email}>
        {(control) => (
          <Input
            name="email"
            type="email"
            autoComplete="email"
            maxLength={200}
            value={values.email ?? ""}
            onChange={(event) => onChange("email", event.target.value)}
            {...control}
          />
        )}
      </Field>
      {shown.map((setting) => {
        const definition = FIELD_DEFINITIONS[setting.key];
        const wide = definition.input === "textarea" && !compact;
        return (
          <Field
            key={setting.key}
            label={definition.label}
            required={setting.required}
            error={errors?.[setting.key]}
            className={wide ? "sm:col-span-2" : undefined}
          >
            {(control) =>
              definition.input === "textarea" ? (
                <Textarea
                  name={setting.key}
                  rows={3}
                  maxLength={definition.maxLength}
                  value={values[setting.key] ?? ""}
                  onChange={(event) => onChange(setting.key, event.target.value)}
                  {...control}
                />
              ) : (
                <Input
                  name={setting.key}
                  type={definition.input}
                  autoComplete={definition.autoComplete}
                  maxLength={definition.maxLength}
                  min={definition.input === "date" ? todayIso() : undefined}
                  value={values[setting.key] ?? ""}
                  onChange={(event) => onChange(setting.key, event.target.value)}
                  {...control}
                />
              )
            }
          </Field>
        );
      })}
    </div>
  );
}

/** The consent box, with the configured wording and privacy link. */
export function ConsentField({
  text,
  privacyHref,
  checked,
  onChange,
  error,
}: {
  text: string;
  privacyHref: string | null;
  checked: boolean;
  onChange: (checked: boolean) => void;
  error?: string;
}) {
  const site = useSiteLinks();
  const href = privacyHref || site.privacyHref;
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-body-sm text-ink flex items-start gap-2.5">
        <Checkbox
          name="consent"
          className="mt-0.5"
          checked={checked}
          aria-invalid={error ? true : undefined}
          onChange={(event) => onChange(event.target.checked)}
        />
        <span>
          {text}
          {href ? (
            <>
              {" "}
              {/* A new tab, so reading the policy does not cost the form. */}
              <a href={href} target="_blank" rel="noopener" className="text-primary underline underline-offset-4">
                Privacy policy
              </a>
            </>
          ) : null}
        </span>
      </label>
      {error ? (
        <p role="alert" className="text-caption text-danger-700">
          {error}
        </p>
      ) : null}
    </div>
  );
}

/** The off-screen field only an automated submitter fills in. */
export function Honeypot() {
  return (
    <div aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
      <label>
        Do not fill this in
        <input type="text" name="website" tabIndex={-1} autoComplete="off" />
      </label>
    </div>
  );
}
