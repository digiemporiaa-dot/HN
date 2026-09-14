import { fileTypeFromBuffer } from "file-type";

import type { MediaKind } from "@/generated/prisma/enums";
import {
  findAllowedTypeByExtension,
  findAllowedTypeByMime,
} from "./config";
import { extensionOf } from "./paths";

export type ValidationSuccess = {
  ok: true;
  mimeType: string;
  extension: string;
  kind: MediaKind;
  sizeBytes: number;
};

export type ValidationFailure = { ok: false; reason: string };

export type ValidationResult = ValidationSuccess | ValidationFailure;

/**
 * SVG is XML that browsers execute. These constructs turn an "image" into a
 * script delivery mechanism or an SSRF/XXE vector.
 *
 * The file is rejected rather than cleaned. Sanitising SVG correctly means
 * parsing the whole grammar and keeping pace with browser quirks; refusing the
 * dangerous subset is a check that cannot silently half-succeed, and legitimate
 * logos and icons never contain any of it.
 */
const SVG_FORBIDDEN: Array<{ pattern: RegExp; reason: string }> = [
  { pattern: /<\s*script/i, reason: "contains a script element" },
  { pattern: /<\s*foreignObject/i, reason: "contains a foreignObject element" },
  { pattern: /<\s*(iframe|embed|object)/i, reason: "embeds external content" },
  { pattern: /<!ENTITY/i, reason: "declares XML entities" },
  { pattern: /\son[a-z]+\s*=/i, reason: "contains an inline event handler" },
  { pattern: /javascript\s*:/i, reason: "contains a javascript: URL" },
  { pattern: /data\s*:\s*text\/html/i, reason: "contains an HTML data URL" },
  {
    pattern: /(href|xlink:href)\s*=\s*["']?\s*(https?:)?\/\//i,
    reason: "references a remote resource",
  },
];

function validateSvg(bytes: Buffer): ValidationResult {
  const text = bytes.toString("utf8");

  if (!/<\s*svg[\s>]/i.test(text)) {
    return { ok: false, reason: "File does not contain an SVG root element." };
  }

  for (const rule of SVG_FORBIDDEN) {
    if (rule.pattern.test(text)) {
      return {
        ok: false,
        reason: `SVG rejected because it ${rule.reason}.`,
      };
    }
  }

  const allowed = findAllowedTypeByMime("image/svg+xml");
  if (!allowed || bytes.byteLength > allowed.maxBytes) {
    return { ok: false, reason: "SVG exceeds the maximum permitted size." };
  }

  return {
    ok: true,
    mimeType: "image/svg+xml",
    extension: "svg",
    kind: "VECTOR",
    sizeBytes: bytes.byteLength,
  };
}

/**
 * Validates an upload against the allowlist.
 *
 * The declared Content-Type is ignored entirely — it is attacker-controlled.
 * What the bytes actually are decides the outcome, and the filename extension
 * must agree, because the extension is what determines how the file is served
 * back later.
 */
export async function validateUpload(params: {
  bytes: Buffer;
  filename: string;
}): Promise<ValidationResult> {
  const { bytes, filename } = params;

  if (bytes.byteLength === 0) {
    return { ok: false, reason: "The file is empty." };
  }

  const declaredExtension = extensionOf(filename);
  if (!declaredExtension) {
    return { ok: false, reason: "The file has no extension." };
  }

  const byExtension = findAllowedTypeByExtension(declaredExtension);
  if (!byExtension) {
    return {
      ok: false,
      reason: `Files of type .${declaredExtension} are not permitted.`,
    };
  }

  // SVG has no magic number, so it is validated as XML rather than sniffed.
  if (byExtension.mimeType === "image/svg+xml") {
    return validateSvg(bytes);
  }

  const sniffed = await fileTypeFromBuffer(bytes);
  if (!sniffed) {
    return {
      ok: false,
      reason: "The file contents could not be recognised.",
    };
  }

  const bySniffed = findAllowedTypeByMime(sniffed.mime);
  if (!bySniffed) {
    return {
      ok: false,
      reason: `The file is actually ${sniffed.mime}, which is not permitted.`,
    };
  }

  if (bySniffed.mimeType !== byExtension.mimeType) {
    return {
      ok: false,
      reason: `The file is ${sniffed.mime} but is named .${declaredExtension}.`,
    };
  }

  if (bytes.byteLength > bySniffed.maxBytes) {
    const limitMb = Math.round(bySniffed.maxBytes / (1024 * 1024));
    return {
      ok: false,
      reason: `The file exceeds the ${limitMb}MB limit for ${bySniffed.mimeType}.`,
    };
  }

  return {
    ok: true,
    mimeType: bySniffed.mimeType,
    // Normalise to the canonical extension so .JPEG and .jpg are stored alike.
    extension: bySniffed.extensions[0],
    kind: bySniffed.kind,
    sizeBytes: bytes.byteLength,
  };
}
