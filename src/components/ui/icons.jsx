// src/components/ui/icons.js
// ─────────────────────────────────────────────────────────────────────────
// VFRB Enterprise — icon map
//
// WHY THIS FILE EXISTS:
// AdminLayout.jsx / CustomerLayout.jsx nav arrays and most page headers
// currently use emoji as icons (📋 📦 💬 🚚 🧵 …). Emoji render
// inconsistently across OS/browser (different weight, different color
// treatment, some platforms render them as full-color pictures next to
// plain UI chrome), which is a real, verifiable part of why the app reads
// as "generated" rather than "a professional enterprise system built this".
//
// This file is the single place that maps a nav/action concept to one
// lucide-react icon. Same library, same default stroke width (2) and
// size (18) everywhere something is used as a nav/button icon — pages
// import from here rather than picking icons ad hoc, so the whole app
// stays visually consistent as more pages migrate off emoji.
//
// Usage:
//   import { NavIcon } from '../../components/ui/icons';
//   <NavIcon name="orders" size={18} />
//
// Adding a new concept: add one line to ICON_MAP below. Don't import
// lucide icons directly in page files — route everything through here,
// so a future icon swap is a one-file change.
// ─────────────────────────────────────────────────────────────────────────
import {
  LayoutGrid, ClipboardList, Boxes, MessageSquare, ShoppingCart, Truck,
  Layers, Factory, FileText, ShieldCheck, Hash, AlertTriangle, Wallet,
  BarChart3, Receipt, Store, Users, Settings, Package, MessageCircle,
  User, Palette, ImagePlus, Type, Sparkles, Ruler, ClipboardCheck,
  CheckCircle2, XCircle, AlertCircle, Info, Eye, EyeOff, Lock, Trash2,
  Plus, Minus, X, ChevronRight, ChevronDown, Search, Download, Upload,
  Pencil, Save, LogOut, Bell, Undo2, Redo2, GripVertical,
  Shirt, PaintBucket,
  // Added for DesignStudio.jsx's emoji cleanup (Task D, Aug 31 2026):
  Stethoscope, GraduationCap, Briefcase, Dumbbell, Square, Rows3,
  Grid2x2, CircleDot, Hexagon, Droplets, ChevronUp, ChevronLeft,
  UploadCloud, Camera, Image, FolderOpen, MousePointer2, Lightbulb, Cloud,
  Columns3, Slash, Loader2, Bug, Phone, Mail, Scale, ArrowDownCircle,
  ArrowUpCircle, Wrench, Scissors, RefreshCw, CreditCard, Landmark,
  Printer, Paperclip, Send, PenSquare, Clock, SlidersHorizontal, Flame, Calendar,
  // Added for DesignStudio.jsx freeform drawing tool (Sept 9 2026):
  Eraser,
  // Added for ShapesPanel.jsx / TOOLS 'shapes' entry + LayersPanel shape
  // icons (Sept 22 2026 fix — dsShared.js TOOLS and LayersPanel.jsx already
  // referenced these 3 names, ICON_MAP just never had them; Circle is new,
  // Square is reused from the existing patternSolid import below):
  Circle,
  // Added for Orders.jsx manager-badge emoji cleanup (Sept 10 2026):
  Crown,
  // Added Sept 15 2026 (QA account): 'trending' was referenced by
  // Reports.jsx's Avg Order Value KPI card (icon:'trending') but had
  // no ICON_MAP entry — NavIcon fails soft on an unknown name (renders
  // an empty span, per its own doc comment), so the card silently
  // rendered blank instead of crashing. Confirmed via grep: no prior
  // 'trending' key existed anywhere in this file.
  TrendingUp, Tag, MapPin,
} from 'lucide-react';

// Nav / concept → icon component. Keys match the `icon` slot pages
// actually need, not literal emoji — e.g. 'orders' covers both admin
// "Orders" and customer "My Orders".
const ICON_MAP = {
  dashboard:        LayoutGrid,
  orders:           ClipboardList,
  inventory:        Boxes,
  stock:            Boxes,
  messages:         MessageSquare,
  chat:             MessageCircle,
  procurement:      ShoppingCart,
  cart:             ShoppingCart,
  delivery:         Truck,
  materials:        Layers,
  production:       Factory,
  outputLog:        FileText,
  qc:               ShieldCheck,
  qcStitching:      Scissors,
  qcColor:          PaintBucket,
  qcSize:            Ruler,
  qcLabel:          Tag,
  qcFinish:         Sparkles,
  qcFastener:       CircleDot,
  physicalCount:    Hash,
  incidents:        AlertTriangle,
  salesPay:         Wallet,
  reports:          BarChart3,
  invoice:          Receipt,
  suppliers:        Store,
  users:            Users,
  settings:         Settings,
  package:          Package,
  profile:          User,
  designStudio:     Palette,
  garmentType:      Shirt,
  colorZone:        PaintBucket,
  logo:             ImagePlus,
  text:             Type,
  ai:               Sparkles,
  pattern:          Ruler,
  layersPanel:      Layers,
  draw:             Pencil,
  eraser:           Eraser,
  shapes:           Square,
  shapeRect:        Square,
  shapeCircle:      Circle,
  checklist:        ClipboardCheck,
  success:          CheckCircle2,
  error:            XCircle,
  warning:          AlertCircle,
  info:             Info,
  show:             Eye,
  hide:             EyeOff,
  lock:             Lock,
  delete:           Trash2,
  add:              Plus,
  remove:           Minus,
  close:            X,
  chevronRight:     ChevronRight,
  chevronDown:      ChevronDown,
  search:           Search,
  download:         Download,
  upload:           Upload,
  edit:             Pencil,
  save:             Save,
  logout:           LogOut,
  notifications:    Bell,
  undo:             Undo2,
  redo:             Redo2,
  dragHandle:       GripVertical,
  // Added for DesignStudio.jsx's emoji cleanup (Task D, Aug 31 2026):
  medical:          Stethoscope,
  school:           GraduationCap,
  corporate:        Briefcase,
  sports:           Dumbbell,
  patternSolid:     Square,
  patternStripes:   Rows3,
  patternChecker:   Grid2x2,
  patternPolka:     CircleDot,
  patternGeometric: Hexagon,
  patternGradient:  Droplets,
  patternVStripes:  Columns3,
  patternDiagonal:  Slash,
  loading:          Loader2,
  chevronUp:        ChevronUp,
  back:             ChevronLeft,
  dropzone:         UploadCloud,
  camera:           Camera,
  image:            Image,
  folder:           FolderOpen,
  cursor:           MousePointer2,
  tip:              Lightbulb,
  cloudSaved:       Cloud,
  // Added for Feedback.jsx's emoji cleanup (Sept 2 2026):
  bug:              Bug,
  suggestion:       Lightbulb,
  // Added for Suppliers.jsx's emoji cleanup (Sept 2 2026):
  phone:            Phone,
  email:            Mail,
  location:         MapPin,
  // Added for ActivityLog.jsx's emoji cleanup (Sept 3 2026):
  reconcile:        Scale,
  stockIn:          ArrowDownCircle,
  stockOut:         ArrowUpCircle,
  adjustment:       Wrench,
  // Added for ProductionList.jsx's emoji cleanup (Sept 4 2026):
  cutting:          Scissors,
  refresh:          RefreshCw,
  // Added for SalesTransactions.jsx's emoji cleanup (Sept 5 2026):
  ewallet:          CreditCard,
  bank:             Landmark,
  // Added for Invoice.jsx's emoji cleanup (Sept 6 2026):
  print:            Printer,
  attachment:       Paperclip,
  // Added for Messages.jsx's emoji cleanup (Sept 6 2026):
  send:             Send,
  // Added Sept 7 2026 (QA account, emergency unblock): Dashboard.jsx used
  // <PenSquare/> raw for its "New Order" button with zero import anywhere
  // in the file — a live ReferenceError crash. Same icon CustomerLayout.jsx
  // already uses (via direct lucide-react import) for the same "New Order"
  // nav concept, routed through NavIcon here for consistency with this
  // file's own stated convention.
  newOrder:         PenSquare,
  // Added Sept 13 2026: needed by PhysicalCount.jsx's overdue-materials banner.
  overdue:          Calendar,
  // Added Sept 7 2026 (QA account): Dashboard.jsx's S stage-config object
  // (line 48) references these 3 icon names, and the file's own comment
  // claims they were "already added" — they weren't, confirmed via grep.
  // Icon choices here are a reasonable first pass (Clock=waiting,
  // SlidersHorizontal=sorting-by-size, Flame=ironing/heat) — swap freely,
  // not a locked decision.
  pending:          Clock,
  manager:          Crown,
  delayed:          Clock,
  segregation:      SlidersHorizontal,
  pressing:         Flame,
  trending:         TrendingUp,
};

/**
 * Render a mapped icon by name. Falls back to a plain circle-ish dash
 * rather than throwing if an unknown name is passed — a missing icon
 * should never crash a page, just look slightly wrong (easy to spot in
 * review, unlike an error boundary tripping in production).
 */
export function NavIcon({ name, size = 18, strokeWidth = 2, color, style, className }) {
  const Cmp = ICON_MAP[name];
  if (!Cmp) return <span style={{ width: size, height: size, display: 'inline-block' }} />;
  return <Cmp size={size} strokeWidth={strokeWidth} color={color} style={style} className={className} />;
}

export default ICON_MAP;
