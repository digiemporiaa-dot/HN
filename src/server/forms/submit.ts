"use server";

import { revalidatePath } from "next/cache";

import { prisma } from "@/server/db";
import { recordAuditEvent } from "@/server/audit/log";
import { storeFile } from "@/server/storage/files";
import { MAX_FILES_PER_SUBMISSION } from "@/lib/validation/forms";
import {
  checkFormTiming,
  checkSubmissionRate,
  RATE_LIMIT_WINDOW_MINUTES,
} from "@/server/leads/throttle";
import {
  createLeadWithReference,
  readLeadContext,
  requestContext,
} from "@/server/leads/service";
import { recordLeadActivity } from "@/server/leads/activity";
import { leadFromAnswers } from "./lead";
import { sendMail } from "@/server/mail/send";
import { publicForm } from "./service";
import { collectAnswers } from "./answers";
import { submissionNotification } from "./templates";

export type FormSubmitState = {
  error?: string;
  /** Set once the submission is stored, so the form can say what happens next. */
  done?: boolean;
  message?: string;
  fieldErrors?: Record<string, string>;
};

/** The types a stranger may attach. Narrower than the media library's own. */
const ALLOWED_UPLOAD_MIME = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
]);

const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

/**
 * Receives a built form.
 *
 * The form is loaded before anything is read from the submission, and the
 * fields it actually has decide what is validated and what is stored. A posted
 * value with no matching field is not rejected with a message — it is never
 * looked at, which is the only version of this that cannot be got around.
 */
export async function submitFormAction(
  _previous: FormSubmitState,
  formData: FormData,
): Promise<FormSubmitState> {
  const key = String(formData.get("formKey") ?? "");
  const form = await publicForm(key);

  // A draft or deleted form answers exactly as an unknown one does. Which
  // forms exist is not something a submission should be able to discover.
  if (!form) {
    return { error: "This form is no longer accepting submissions." };
  }

  const collected = collectAnswers(form.fields, formData);
  // Validation first, then the abuse checks: a person who leaves a required
  // box empty and presses send quickly should see which box, not a silent
  // success.
  if (!collected.ok) return { fieldErrors: collected.fieldErrors };

  const timing = checkFormTiming(
    String(formData.get("website") ?? ""),
    String(formData.get("startedAt") ?? ""),
  );

  const context = await requestContext();

  if (!timing.ok) {
    await recordAuditEvent({
      action: "FORM_SUBMISSION_REFUSED",
      module: "FORMS",
      entityType: "Form",
      entityId: form.id,
      summary: `Automated submission refused (${timing.reason})`,
      ...context,
    });
    // Told it succeeded and nothing written, for the same reason the enquiry
    // form does it: a submitter that learns which attempts were refused learns
    // how to get past the check.
    return { done: true, message: form.successMessage ?? undefined };
  }

  const rate = await checkSubmissionRate(context.ipAddress);
  if (!rate.ok) {
    return {
      error: `We have already received several submissions from you in the last ${RATE_LIMIT_WINDOW_MINUTES} minutes. Please try again later.`,
    };
  }

  // Files are validated and written before the submission row exists, so a
  // rejected attachment never leaves a half-recorded submission behind.
  const stored: Array<{
    fieldKey: string;
    storageKey: string;
    originalName: string;
    mimeType: string;
    sizeBytes: number;
  }> = [];

  for (const fieldKey of collected.fileFields.slice(
    0,
    MAX_FILES_PER_SUBMISSION,
  )) {
    const file = formData.get(`field_${fieldKey}`);
    if (!(file instanceof File)) continue;

    if (file.size > MAX_UPLOAD_BYTES) {
      return {
        fieldErrors: { [fieldKey]: "That file is larger than 10 MB" },
      };
    }

    const bytes = Buffer.from(await file.arrayBuffer());
    const result = await storeFile({
      bytes,
      filename: file.name,
      folder: "submissions",
    });

    if (!result.ok) return { fieldErrors: { [fieldKey]: result.reason } };

    // The allowlist is checked against what the file turned out to be, not
    // what it claimed: storeFile sniffs the type, and this narrows that result
    // further than the media library does, because this upload came from a
    // stranger rather than from a member of staff.
    if (!ALLOWED_UPLOAD_MIME.has(result.file.mimeType)) {
      return {
        fieldErrors: {
          [fieldKey]: "Attach a PDF or an image (JPEG, PNG or WebP)",
        },
      };
    }

    stored.push({
      fieldKey,
      storageKey: result.file.storageKey,
      // Stored for the sales team to read, never used to build a path.
      originalName: file.name.slice(0, 200),
      mimeType: result.file.mimeType,
      sizeBytes: result.file.sizeBytes,
    });
  }

  const answers = { ...collected.answers };
  for (const file of stored) answers[file.fieldKey] = file.originalName;

  const submission = await prisma.formSubmission.create({
    data: {
      formId: form.id,
      answers,
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
      files: { create: stored },
    },
    select: { id: true },
  });

  // A form the administrator mapped to an email address produces a lead as well
  // as a submission, so a custom form lands in the same pipeline as every other
  // enquiry rather than in a list nobody opens. A form with no mapping — a
  // survey, a feedback box — produces the submission alone.
  const mapped = leadFromAnswers(form.fields, answers);
  if (mapped) {
    const lead = await createLeadWithReference({
      name: mapped.name,
      email: mapped.email,
      phone: mapped.phone,
      organisation: mapped.organisation,
      city: mapped.city,
      message: mapped.message,
      source: "CUSTOM_FORM",
      formSubmissionId: submission.id,
      // The form's own consent wording is whatever question the administrator
      // wrote; the enquiry consent text would be a claim about an agreement
      // nobody was shown. Left unset rather than asserted.
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
      ...readLeadContext(formData),
    });

    if (lead) {
      await recordLeadActivity({
        leadId: lead.id,
        kind: "CREATED",
        summary: `Submitted through ${form.name}`,
      });
    }
  }

  await recordAuditEvent({
    action: "FORM_SUBMITTED",
    module: "FORMS",
    entityType: "Form",
    entityId: form.id,
    summary: `${form.name} submitted`,
    metadata: { submissionId: submission.id, files: stored.length },
    ...context,
  });

  // After the commit, and its outcome never changes the answer the visitor
  // gets: their submission is recorded, and a mail server having a bad
  // afternoon is the sales team's problem to see on the deliveries screen.
  const notification = submissionNotification({
    formName: form.name,
    submissionId: submission.id,
    fields: form.fields.map((field) => ({
      key: field.key,
      label: field.label,
    })),
    answers,
    fileCount: stored.length,
  });

  await sendMail({
    kind: "form.submission",
    subject: notification.subject,
    text: notification.text,
    html: notification.html,
    entityType: "FormSubmission",
    entityId: submission.id,
    // The form's own recipient when it names one, otherwise the site's. A
    // form is never quietly received by nobody.
    to: form.notifyEmail ? [form.notifyEmail] : undefined,
  });

  revalidatePath("/admin/forms");
  return { done: true, message: form.successMessage ?? undefined };
}
