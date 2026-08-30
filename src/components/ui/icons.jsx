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
  Pencil, Save, LogOut, Bell, QrCode, Undo2, Redo2, GripVertical,
  Shirt, PaintBucket,
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
  delivery:         Truck,
  materials:        Layers,
  production:       Factory,
  outputLog:        FileText,
  qc:               ShieldCheck,
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
  qr:               QrCode,
  undo:             Undo2,
  redo:             Redo2,
  dragHandle:       GripVertical,
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
