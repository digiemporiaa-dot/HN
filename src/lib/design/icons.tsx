import {
  Boxes,
  Building2,
  ClipboardCheck,
  FileText,
  Gauge,
  GraduationCap,
  Headset,
  Layers,
  MapPinned,
  MessagesSquare,
  PackageCheck,
  ShieldCheck,
  Stethoscope,
  Truck,
  Wrench,
  type LucideIcon,
} from "lucide-react";

const ICONS: Record<string, LucideIcon> = {
  portfolio: Boxes,
  delivery: Truck,
  procurement: ClipboardCheck,
  installation: Wrench,
  documents: FileText,
  support: Headset,
  coverage: MapPinned,
  assurance: ShieldCheck,
  training: GraduationCap,
  consultation: MessagesSquare,
  facility: Building2,
  clinical: Stethoscope,
  configuration: Layers,
  quality: PackageCheck,
  performance: Gauge,
};

/** The icon for a stored name, or null for "auto" (a number is drawn). */
export function featureIcon(value: unknown): LucideIcon | null {
  return typeof value === "string" ? (ICONS[value] ?? null) : null;
}
