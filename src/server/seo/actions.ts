"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { prisma } from "@/server/db";
import { recordAuditEvent } from "@/server/audit/log";
import { requirePermission } from "@/server/permissions";
import {
  fromPathProblem,
  internalTargetPath,
  normalisePath,
  targetProblem,
} from "@/lib/seo/redirect-paths";
import { invalidateRedirectCache } from "./redirect-cache";
import { resolveNotFound } from "./not-found-log";
import { finalTarget, livePathOwner, repointChains } from "./redirects";

export type RedirectActionState = {
  error?: string;
  success?: string;
  fieldErrors?: Record<string, string>;
};

function refused(
  fieldErrors: Record<string, string>,
  error = "The redirect could not be saved. Check the highlighted fields.",
): RedirectActionState {
  return { error, fieldErrors };
}

function revalidateRedirects(): void {
  revalidatePath("/admin/seo/redirects");
  revalidatePath("/admin/seo/redirects/[id]", "page");
}

type Input = {
  fromPath: string;
  toPath: string;
  type: "PERMANENT" | "TEMPORARY";
  active: boolean;
  note: string | null;
};

function readForm(formData: FormData): {
  input?: Input;
  fieldErrors?: Record<string, string>;
} {
  const rawFrom = String(formData.get("fromPath") ?? "");
  const rawTo = String(formData.get("toPath") ?? "").trim();
  const type = String(formData.get("type") ?? "");
  const note = String(formData.get("note") ?? "").trim();

  const fieldErrors: Record<string, string> = {};
  const fromError = fromPathProblem(rawFrom);
  if (fromError) fieldErrors.fromPath = fromError;
  const toError = targetProblem(rawTo);
  if (toError) fieldErrors.toPath = toError;
  if (type !== "PERMANENT" && type !== "TEMPORARY") {
    fieldErrors.type = "Choose permanent or temporary";
  }
  if (note.length > 300)
    fieldErrors.note = "Keep the note under 300 characters";

  if (Object.keys(fieldErrors).length > 0) return { fieldErrors };

  const fromPath = normalisePath(rawFrom);
  if (internalTargetPath(rawTo) === fromPath) {
    return { fieldErrors: { toPath: "A redirect cannot lead to itself" } };
  }

  return {
    input: {
      fromPath,
      toPath: rawTo,
      type: type as Input["type"],
      active: formData.get("active") === "on",
      note: note || null,
    },
  };
}

/**
 * The checks every save makes, in the order an editor can act on them: the
 * address is not already redirected, is not a live page, and does not lead
 * back to itself. Returns the target to store — the end of any chain.
 */
async function vet(
  input: Input,
  selfId: string | null,
): Promise<{ target?: string; refusal?: RedirectActionState }> {
  const clash = await prisma.redirect.findUnique({
    where: { fromPath: input.fromPath },
    select: { id: true },
  });
  if (clash && clash.id !== selfId) {
    return {
      refusal: refused({
        fromPath: "That address already has a redirect. Edit that one instead.",
      }),
    };
  }

  if (input.active) {
    const live = await livePathOwner(input.fromPath);
    if (live) {
      return {
        refusal: refused({
          fromPath: `That address is ${live}, which is live. A redirect would hide it — unpublish or rename it first.`,
        }),
      };
    }
  }

  const target = await finalTarget(input.fromPath, input.toPath);
  if (target === null) {
    return {
      refusal: refused({
        toPath:
          "That would make a loop: the destination already redirects back here.",
      }),
    };
  }
  return { target };
}

export async function createRedirectAction(
  _previous: RedirectActionState,
  formData: FormData,
): Promise<RedirectActionState> {
  const actor = await requirePermission("SEO_REDIRECTS", "CREATE");

  const { input, fieldErrors } = readForm(formData);
  if (!input) return refused(fieldErrors ?? {});

  const { target, refusal } = await vet(input, null);
  if (refusal) return refusal;

  const created = await prisma.redirect.create({
    data: { ...input, toPath: target!, createdById: actor.id },
    select: { id: true },
  });
  const repointed = await repointChains(input.fromPath, target!);
  invalidateRedirectCache();
  if (input.active) await resolveNotFound(input.fromPath);

  await recordAuditEvent({
    actorId: actor.id,
    actorEmail: actor.email,
    action: "REDIRECT_CREATED",
    module: "SEO_REDIRECTS",
    entityType: "Redirect",
    entityId: created.id,
    summary: `${input.fromPath} → ${target}`,
    metadata: { type: input.type, active: input.active, repointed },
  });

  revalidateRedirects();
  redirect(`/admin/seo/redirects/${created.id}?saved=created`);
}

export async function updateRedirectAction(
  _previous: RedirectActionState,
  formData: FormData,
): Promise<RedirectActionState> {
  const actor = await requirePermission("SEO_REDIRECTS", "EDIT");

  const id = String(formData.get("redirectId") ?? "");
  const existing = await prisma.redirect.findUnique({
    where: { id },
    select: { id: true, fromPath: true, toPath: true },
  });
  if (!existing) return { error: "That redirect no longer exists." };

  const { input, fieldErrors } = readForm(formData);
  if (!input) return refused(fieldErrors ?? {});

  const { target, refusal } = await vet(input, existing.id);
  if (refusal) return refusal;

  await prisma.redirect.update({
    where: { id: existing.id },
    data: { ...input, toPath: target! },
  });
  const repointed = await repointChains(input.fromPath, target!);
  invalidateRedirectCache();
  if (input.active) await resolveNotFound(input.fromPath);

  await recordAuditEvent({
    actorId: actor.id,
    actorEmail: actor.email,
    action: "REDIRECT_UPDATED",
    module: "SEO_REDIRECTS",
    entityType: "Redirect",
    entityId: existing.id,
    summary: `${input.fromPath} → ${target}`,
    metadata: {
      from: { fromPath: existing.fromPath, toPath: existing.toPath },
      type: input.type,
      active: input.active,
      repointed,
    },
  });

  revalidateRedirects();
  return {
    success:
      target === input.toPath
        ? "Redirect saved."
        : `Redirect saved. It now points straight at ${target}, because ${input.toPath} already redirects there.`,
  };
}

export async function deleteRedirectAction(formData: FormData): Promise<void> {
  const actor = await requirePermission("SEO_REDIRECTS", "DELETE");

  const id = String(formData.get("redirectId") ?? "");
  const existing = await prisma.redirect.findUnique({
    where: { id },
    select: { id: true, fromPath: true, toPath: true },
  });
  if (!existing) redirect("/admin/seo/redirects");

  await prisma.redirect.delete({ where: { id: existing.id } });
  invalidateRedirectCache();

  await recordAuditEvent({
    actorId: actor.id,
    actorEmail: actor.email,
    action: "REDIRECT_DELETED",
    module: "SEO_REDIRECTS",
    entityType: "Redirect",
    entityId: existing.id,
    summary: `${existing.fromPath} → ${existing.toPath}`,
  });

  revalidateRedirects();
  redirect("/admin/seo/redirects?deleted=1");
}
