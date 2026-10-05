"use client";

import { useActionState, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Archive, Trash2, Upload } from "lucide-react";

import { Button, Field, Input } from "@/components/ui";
import { FormFeedback } from "@/components/admin/form-feedback";
import {
  createBackupAction,
  deleteBackupAction,
  type BackupActionState,
} from "@/server/backups/actions";

const INITIAL: BackupActionState = {};

export function CreateBackupForm() {
  const [state, action, pending] = useActionState(createBackupAction, INITIAL);

  return (
    <form action={action} className="flex flex-col gap-4">
      <FormFeedback state={state} />
      <Field
        label="Note (optional)"
        help="Why this backup was taken, e.g. “Before importing the new catalogue”."
        error={state.fieldErrors?.note}
      >
        {(props) => <Input {...props} name="note" maxLength={200} />}
      </Field>
      <div>
        <Button type="submit" disabled={pending}>
          <Archive aria-hidden="true" className="size-4" />
          {pending ? "Backing up… this can take a few minutes" : "Back up now"}
        </Button>
      </div>
    </form>
  );
}

/**
 * Sends the archive as the raw request body, so a large file streams to the
 * backup volume instead of being held in memory as a form field.
 */
export function UploadBackupForm() {
  const router = useRouter();
  const [state, setState] = useState<BackupActionState>({});
  const [pending, setPending] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const file = new FormData(form).get("file");
    if (!(file instanceof File) || file.size === 0) {
      setState({ fieldErrors: { file: "Choose a backup archive (.tar.gz)." } });
      return;
    }
    setPending(true);
    setState({});
    try {
      const response = await fetch("/api/admin/backups/upload", {
        method: "POST",
        headers: { "Content-Type": "application/gzip" },
        body: file,
      });
      const result = (await response.json().catch(() => null)) as {
        id?: string;
        error?: string;
      } | null;
      if (!response.ok || !result?.id) {
        setState({ error: result?.error ?? "The upload failed." });
        return;
      }
      setState({
        success:
          "Archive uploaded and checked. It is in the list below; restoring it is a separate step.",
      });
      form.reset();
      router.refresh();
    } catch {
      setState({ error: "The upload was interrupted. Try again." });
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <FormFeedback state={state} />
      <Field
        label="Backup archive"
        help="A .tar.gz file downloaded from this screen, on this server or another."
        error={state.fieldErrors?.file}
      >
        {(props) => (
          <Input
            {...props}
            type="file"
            name="file"
            className="py-2.5"
            accept=".gz,application/gzip"
          />
        )}
      </Field>
      <div>
        <Button type="submit" variant="outline" disabled={pending}>
          <Upload aria-hidden="true" className="size-4" />
          {pending ? "Uploading…" : "Upload archive"}
        </Button>
      </div>
    </form>
  );
}

export function DeleteBackupButton({
  id,
  filename,
}: {
  id: string;
  filename: string;
}) {
  return (
    <form
      action={deleteBackupAction}
      onSubmit={(event) => {
        if (
          !window.confirm(
            `Delete ${filename}? The archive file is removed from the server and cannot be recovered.`,
          )
        ) {
          event.preventDefault();
        }
      }}
    >
      <input type="hidden" name="id" value={id} />
      <Button
        type="submit"
        variant="ghost"
        size="sm"
        aria-label={`Delete ${filename}`}
      >
        <Trash2 aria-hidden="true" className="text-danger-600 size-4" />
      </Button>
    </form>
  );
}
