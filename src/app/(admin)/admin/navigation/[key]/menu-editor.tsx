"use client";

import { useActionState, useState } from "react";
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  EyeOff,
  Plus,
  Trash2,
} from "lucide-react";

import { Badge, Button, Checkbox, Field, Input, Textarea } from "@/components/ui";
import { cn } from "@/lib/utils/cn";
import {
  addNavigationItemAction,
  deleteNavigationItemAction,
  moveNavigationItemAction,
  updateNavigationItemAction,
  type NavigationActionState,
} from "@/server/navigation/actions";
import {
  MediaPicker,
  type MediaOption,
} from "@/app/(admin)/admin/pages/[id]/field-inputs";

const INITIAL: NavigationActionState = {};

export type EditorNode = {
  id: string;
  label: string;
  href: string | null;
  description: string | null;
  visible: boolean;
  openInNewTab: boolean;
  highlight: boolean;
  imageId: string | null;
  depth: number;
  children: EditorNode[];
};

export type MenuShape = "HEADER" | "FOOTER" | "LEGAL";

/** What a level is called in each menu, so the labels match what it renders. */
const LEVEL_NAMES: Record<MenuShape, string[]> = {
  HEADER: ["Menu item", "Column", "Link"],
  FOOTER: ["Column", "Link", "Link"],
  LEGAL: ["Link", "Link", "Link"],
};

function Feedback({ state }: { state: NavigationActionState }) {
  if (state.error) {
    return (
      <div
        role="alert"
        className="border-danger-100 bg-danger-50 text-danger-700 text-body-sm flex items-start gap-2.5 rounded-md border p-3"
      >
        <AlertCircle aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
        <span>{state.error}</span>
      </div>
    );
  }
  if (state.success) {
    return (
      <div className="border-success-100 bg-success-50 text-success-700 text-body-sm flex items-start gap-2.5 rounded-md border p-3">
        <CheckCircle2 aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
        <span>{state.success}</span>
      </div>
    );
  }
  return null;
}

function IconForm({
  action,
  itemId,
  extra,
  label,
  confirm,
  children,
}: {
  action: (formData: FormData) => void | Promise<void>;
  itemId: string;
  extra?: Record<string, string>;
  label: string;
  confirm?: string;
  children: React.ReactNode;
}) {
  return (
    <form
      action={action}
      onSubmit={(event) => {
        if (confirm && !window.confirm(confirm)) event.preventDefault();
      }}
    >
      <input type="hidden" name="itemId" value={itemId} />
      {Object.entries(extra ?? {}).map(([key, value]) => (
        <input key={key} type="hidden" name={key} value={value} />
      ))}
      <Button type="submit" variant="ghost" size="sm" aria-label={label}>
        {children}
      </Button>
    </form>
  );
}

function AddButton({
  menuKey,
  parentId,
  label,
}: {
  menuKey: string;
  parentId: string;
  label: string;
}) {
  const [state, formAction, pending] = useActionState(
    addNavigationItemAction,
    INITIAL,
  );

  return (
    <div className="flex flex-col gap-2">
      <Feedback state={state} />
      <form action={formAction}>
        <input type="hidden" name="menuKey" value={menuKey} />
        <input type="hidden" name="parentId" value={parentId} />
        <Button type="submit" variant="outline" size="sm" loading={pending}>
          <Plus aria-hidden="true" className="size-4" />
          {label}
        </Button>
      </form>
    </div>
  );
}

function ItemForm({
  node,
  mediaOptions,
  canUseImage,
  readOnly,
}: {
  node: EditorNode;
  mediaOptions: MediaOption[];
  canUseImage: boolean;
  readOnly: boolean;
}) {
  const [state, formAction, pending] = useActionState(
    updateNavigationItemAction,
    INITIAL,
  );

  // Controlled: React clears an uncontrolled form once the action resolves,
  // which would discard the editor's work whenever validation fails.
  const [values, setValues] = useState({
    label: node.label,
    href: node.href ?? "",
    description: node.description ?? "",
    imageId: node.imageId ?? "",
    visible: node.visible,
    openInNewTab: node.openInNewTab,
    highlight: node.highlight,
  });

  const set = <K extends keyof typeof values>(
    key: K,
    value: (typeof values)[K],
  ) => setValues((current) => ({ ...current, [key]: value }));

  return (
    <form action={formAction} className="flex flex-col gap-4" noValidate>
      <input type="hidden" name="itemId" value={node.id} />
      <Feedback state={state} />

      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Label" required error={state.fieldErrors?.label}>
          {(control) => (
            <Input
              name="label"
              value={values.label}
              disabled={readOnly}
              onChange={(event) => set("label", event.target.value)}
              {...control}
            />
          )}
        </Field>

        <Field
          label="Destination"
          help={
            node.children.length > 0
              ? "Optional — a heading with links beneath it can be plain text."
              : "A path like /products, or an https:// address."
          }
          error={state.fieldErrors?.href}
        >
          {(control) => (
            <Input
              name="href"
              value={values.href}
              disabled={readOnly}
              placeholder="/products"
              onChange={(event) => set("href", event.target.value)}
              {...control}
            />
          )}
        </Field>

        <Field
          label="Description"
          help="Shown in the mega menu under the label."
          error={state.fieldErrors?.description}
          className="md:col-span-2"
        >
          {(control) => (
            <Textarea
              name="description"
              value={values.description}
              disabled={readOnly}
              rows={2}
              maxLength={160}
              onChange={(event) => set("description", event.target.value)}
              {...control}
            />
          )}
        </Field>

        {canUseImage ? (
          <Field
            label="Feature image"
            help="Optional. Appears as a card beside this menu's columns."
            className="md:col-span-2"
          >
            {(control) => (
              <>
                <input type="hidden" name="imageId" value={values.imageId} />
                <MediaPicker
                  value={values.imageId}
                  options={mediaOptions}
                  onChange={(next) => set("imageId", next)}
                  disabled={readOnly}
                  control={control}
                />
              </>
            )}
          </Field>
        ) : (
          <input type="hidden" name="imageId" value="" />
        )}
      </div>

      <div className="flex flex-wrap gap-x-6 gap-y-3">
        <label className="text-body-sm text-ink flex items-center gap-2.5">
          <Checkbox
            name="visible"
            checked={values.visible}
            disabled={readOnly}
            onChange={(event) => set("visible", event.target.checked)}
          />
          Show on the site
        </label>

        <label className="text-body-sm text-ink flex items-center gap-2.5">
          <Checkbox
            name="openInNewTab"
            checked={values.openInNewTab}
            disabled={readOnly}
            onChange={(event) => set("openInNewTab", event.target.checked)}
          />
          Open in a new tab
        </label>

        {node.depth === 0 ? (
          <label className="text-body-sm text-ink flex items-center gap-2.5">
            <Checkbox
              name="highlight"
              checked={values.highlight}
              disabled={readOnly}
              onChange={(event) => set("highlight", event.target.checked)}
            />
            Show as a button
          </label>
        ) : (
          <input type="hidden" name="highlight" value="" />
        )}
      </div>

      {readOnly ? null : (
        <div>
          <Button type="submit" loading={pending}>
            Save item
          </Button>
        </div>
      )}
    </form>
  );
}

function ItemRow({
  node,
  menuKey,
  shape,
  mediaOptions,
  maxDepth,
  readOnly,
}: {
  node: EditorNode;
  menuKey: string;
  shape: MenuShape;
  mediaOptions: MediaOption[];
  maxDepth: number;
  readOnly: boolean;
}) {
  const [open, setOpen] = useState(false);
  const panelId = `nav-item-${node.id}`;
  const levelName = LEVEL_NAMES[shape][node.depth] ?? "Link";
  const canNest = node.depth < maxDepth && shape !== "LEGAL";
  // Mirrors what the renderer does: an item with neither a destination nor
  // children leads nowhere, so it is dropped from the public menu.
  const leadsNowhere = !node.href && node.children.length === 0;

  return (
    <li className="border-line bg-surface rounded-lg border">
      <div className="flex flex-wrap items-center gap-3 p-4">
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          aria-expanded={open}
          aria-controls={panelId}
          className="text-ink hover:text-primary flex min-w-0 flex-1 items-center gap-2.5 text-left transition-colors"
        >
          <span className="text-body-sm truncate font-medium">
            {node.label}
          </span>
          <span className="text-caption text-ink-subtle truncate">
            {node.href ?? "no link"}
          </span>
        </button>

        <Badge tone="outline">{levelName}</Badge>

        {node.visible ? null : (
          <Badge tone="neutral">
            <EyeOff aria-hidden="true" className="size-3" />
            Hidden
          </Badge>
        )}

        {leadsNowhere ? (
          <Badge tone="warning">
            <AlertTriangle aria-hidden="true" className="size-3" />
            Needs a link
          </Badge>
        ) : null}

        {readOnly ? null : (
          <div className="flex items-center gap-0.5">
            <IconForm
              action={moveNavigationItemAction}
              itemId={node.id}
              extra={{ direction: "up" }}
              label={`Move ${node.label} up`}
            >
              <span aria-hidden="true">↑</span>
            </IconForm>
            <IconForm
              action={moveNavigationItemAction}
              itemId={node.id}
              extra={{ direction: "down" }}
              label={`Move ${node.label} down`}
            >
              <span aria-hidden="true">↓</span>
            </IconForm>
            <IconForm
              action={deleteNavigationItemAction}
              itemId={node.id}
              label={`Remove ${node.label}`}
              confirm={
                node.children.length > 0
                  ? `Remove "${node.label}" and its ${node.children.length} child item(s)? This cannot be undone.`
                  : `Remove "${node.label}"? This cannot be undone.`
              }
            >
              <Trash2 aria-hidden="true" className="text-danger-600 size-4" />
            </IconForm>
          </div>
        )}
      </div>

      <div
        id={panelId}
        hidden={!open}
        className="border-line flex flex-col gap-4 border-t p-4"
      >
        {leadsNowhere ? (
          <p className="border-warning-100 bg-warning-50 text-warning-700 text-body-sm rounded-md border p-3">
            This item has no destination and nothing beneath it, so it is left
            out of the public menu. Give it a link, or add items under it.
          </p>
        ) : null}

        <ItemForm
          node={node}
          mediaOptions={mediaOptions}
          canUseImage={shape === "HEADER" && node.depth === 0}
          readOnly={readOnly}
        />
      </div>

      {node.children.length > 0 || (canNest && !readOnly) ? (
        <div className="border-line ml-4 border-l pl-4 pb-4">
          <ul className="flex flex-col gap-2 pt-2">
            {node.children.map((child) => (
              <ItemRow
                key={child.id}
                node={child}
                menuKey={menuKey}
                shape={shape}
                mediaOptions={mediaOptions}
                maxDepth={maxDepth}
                readOnly={readOnly}
              />
            ))}
          </ul>

          {canNest && !readOnly ? (
            <div className="pt-3">
              <AddButton
                menuKey={menuKey}
                parentId={node.id}
                label={`Add ${(LEVEL_NAMES[shape][node.depth + 1] ?? "link").toLowerCase()}`}
              />
            </div>
          ) : null}
        </div>
      ) : null}
    </li>
  );
}

export function MenuEditor({
  menuKey,
  shape,
  tree,
  mediaOptions,
  maxDepth,
  readOnly,
}: {
  menuKey: string;
  shape: MenuShape;
  tree: EditorNode[];
  mediaOptions: MediaOption[];
  maxDepth: number;
  readOnly: boolean;
}) {
  return (
    <div className={cn("flex flex-col gap-4")}>
      {tree.length === 0 ? (
        <p className="border-line text-body-sm text-ink-muted rounded-lg border border-dashed p-6 text-center">
          This menu is empty. Nothing is rendered for it on the public site.
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {tree.map((node) => (
            <ItemRow
              key={node.id}
              node={node}
              menuKey={menuKey}
              shape={shape}
              mediaOptions={mediaOptions}
              maxDepth={maxDepth}
              readOnly={readOnly}
            />
          ))}
        </ul>
      )}

      {readOnly ? null : (
        <AddButton
          menuKey={menuKey}
          parentId=""
          label={`Add ${LEVEL_NAMES[shape][0].toLowerCase()}`}
        />
      )}
    </div>
  );
}
