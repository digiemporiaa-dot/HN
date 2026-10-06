"use client";

import { useActionState, useState } from "react";

import {
  Button,
  Checkbox,
  Field,
  Input,
  Select,
  Textarea,
} from "@/components/ui";
import { FormFeedback } from "@/components/admin/form-feedback";
import {
  MediaPicker,
  type MediaOption,
} from "@/components/admin/sections/field-inputs";
import { useSyncedState } from "@/lib/hooks/use-synced-state";
import { CONTENT_STATUS_OPTIONS } from "@/lib/validation/content-status";
import { slugify } from "@/lib/utils/slug";
import {
  createPostAction,
  updatePostAction,
  type BlogActionState,
} from "@/server/blog/actions";

const INITIAL: BlogActionState = {};

export type PostValues = {
  title: string;
  slug: string;
  excerpt: string;
  authorName: string;
  coverId: string;
  featured: boolean;
  status: string;
};

/**
 * A post's details: everything but the body, which is written in sections
 * below the form once the post exists.
 */
export function PostForm({
  mode,
  postId,
  initial,
  media,
  canPublish = false,
  readOnly = false,
  version = "new",
}: {
  mode: "create" | "edit";
  postId?: string;
  initial: PostValues;
  media: MediaOption[];
  canPublish?: boolean;
  readOnly?: boolean;
  /** Changes only when a write lands, so the form catches up after a save. */
  version?: string;
}) {
  const [state, formAction, pending] = useActionState(
    mode === "create" ? createPostAction : updatePostAction,
    INITIAL,
  );
  const [values, setValues] = useSyncedState(initial, version);
  // On a new post the slug follows the title until it is edited by hand; on
  // an existing one it never moves on its own.
  const [slugTouched, setSlugTouched] = useState(mode === "edit");
  const set = <K extends keyof PostValues>(key: K, value: PostValues[K]) =>
    setValues((current) => ({ ...current, [key]: value }));

  return (
    <form action={formAction} className="flex flex-col gap-5" noValidate>
      {postId ? <input type="hidden" name="postId" value={postId} /> : null}
      <FormFeedback state={state} />

      <div className="grid gap-5 md:grid-cols-2">
        <Field label="Title" required error={state.fieldErrors?.title}>
          {(control) => (
            <Input
              name="title"
              value={values.title}
              disabled={readOnly}
              maxLength={200}
              onChange={(event) => {
                const title = event.target.value;
                setValues((current) => ({
                  ...current,
                  title,
                  slug: slugTouched ? current.slug : slugify(title),
                }));
              }}
              {...control}
            />
          )}
        </Field>

        <Field
          label="URL slug"
          required
          help={`/blog/${values.slug || "your-slug"}${mode === "edit" ? " — changing it on a published post leaves a redirect from the old address." : ""}`}
          error={state.fieldErrors?.slug}
        >
          {(control) => (
            <Input
              name="slug"
              value={values.slug}
              disabled={readOnly}
              onChange={(event) => {
                setSlugTouched(true);
                set("slug", event.target.value);
              }}
              {...control}
            />
          )}
        </Field>
      </div>

      <Field
        label="Summary"
        help="One or two sentences for the blog index, search results and link previews."
        error={state.fieldErrors?.excerpt}
      >
        {(control) => (
          <Textarea
            name="excerpt"
            rows={3}
            maxLength={300}
            value={values.excerpt}
            disabled={readOnly}
            onChange={(event) => set("excerpt", event.target.value)}
            {...control}
          />
        )}
      </Field>

      <div className="grid gap-5 md:grid-cols-2">
        <Field
          label="Cover image"
          help="Shown on the blog index and at the top of the post."
          error={state.fieldErrors?.coverId}
        >
          {(control) => (
            <>
              <input type="hidden" name="coverId" value={values.coverId} />
              <MediaPicker
                value={values.coverId}
                options={media.filter((option) => option.isImage)}
                onChange={(next) => set("coverId", next)}
                disabled={readOnly}
                control={control}
              />
            </>
          )}
        </Field>

        <div className="flex flex-col gap-5">
          <Field
            label="Byline"
            help="The author's name as readers see it. Leave blank for none."
            error={state.fieldErrors?.authorName}
          >
            {(control) => (
              <Input
                name="authorName"
                value={values.authorName}
                disabled={readOnly}
                maxLength={120}
                onChange={(event) => set("authorName", event.target.value)}
                {...control}
              />
            )}
          </Field>

          {mode === "edit" ? (
            <Field
              label="Status"
              error={state.fieldErrors?.status}
              help={
                canPublish
                  ? undefined
                  : "You do not have permission to publish posts."
              }
            >
              {(control) => (
                <Select
                  name="status"
                  value={values.status}
                  disabled={readOnly}
                  onChange={(event) => set("status", event.target.value)}
                  {...control}
                >
                  {CONTENT_STATUS_OPTIONS.map((option) => (
                    <option
                      key={option.value}
                      value={option.value}
                      disabled={
                        !canPublish &&
                        (option.value === "PUBLISHED") !==
                          (initial.status === "PUBLISHED")
                      }
                    >
                      {option.label}
                    </option>
                  ))}
                </Select>
              )}
            </Field>
          ) : (
            <input type="hidden" name="status" value="DRAFT" />
          )}
        </div>
      </div>

      <label className="text-body-sm text-ink flex items-center gap-2.5">
        <Checkbox
          name="featured"
          checked={values.featured}
          disabled={readOnly}
          onChange={(event) => set("featured", event.target.checked)}
        />
        Pin to the top of the blog
      </label>

      {readOnly ? null : (
        <div>
          <Button type="submit" loading={pending}>
            {mode === "create" ? "Create post" : "Save post"}
          </Button>
        </div>
      )}
    </form>
  );
}
