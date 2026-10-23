import {
  ArrowDown, ArrowLeft, ArrowRight, ArrowUp, ArrowUpRight, Bell,
  BookOpen, Building2, CalendarDays, Check, CircleCheck, Clock3,
  CreditCard, Droplets, Gift, Globe2, HandHeart, Heart, House,
  Infinity as InfinityIcon, Landmark, LayoutGrid, Menu, Moon,
  Package, Plus, Repeat2, Search, ShieldCheck, Sparkles, Users,
  Wallet, X, Smartphone, Download, ReceiptText, Settings2, LifeBuoy, Stethoscope, GraduationCap, FileCheck2, ChevronRight, type LucideIcon,
} from 'lucide-react';

const icons: Record<string, LucideIcon> = {
  download: Download, receipt: ReceiptText, settings: Settings2, support: LifeBuoy, healthcare: Stethoscope, education: GraduationCap, evidence: FileCheck2, chevron: ChevronRight, check: Check, 'arrow-right': ArrowRight, 'arrow-left': ArrowLeft, search: Search, bell: Bell, globe: Globe2, menu: Menu, close: X,
  heart: Heart, home: House, giving: HandHeart, platform: LayoutGrid,
  wallet: Wallet, shield: ShieldCheck, users: Users, calendar: CalendarDays, phone: Smartphone,
  book: BookOpen, bank: Landmark, card: CreditCard,
  '⌕': Search, '◉': Bell, '✦': Sparkles, '♡': Heart, '♥': Heart,
  '⌂': House, '◇': Building2, '◎': ShieldCheck, '≡': Landmark,
  '↻': Repeat2, '□': Package, '○': Users, '▦': Building2, '☾': Moon,
  '↗': ArrowUpRight, '→': ArrowRight, '←': ArrowLeft, '↓': ArrowDown,
  '↑': ArrowUp, '✓': Check, '×': X, '∞': InfinityIcon, '◷': Clock3,
  '◫': BookOpen, '≈': Droplets, '◌': HandHeart, '▣': ShieldCheck,
  '●': CircleCheck, '+': Plus, gift: Gift,
};

// Assign the same palette to every alias of a shared icon.
const tones = new Map<LucideIcon, string>([
  [Heart, 'rose'], [HandHeart, 'rose'], [Users, 'violet'],
  [Droplets, 'blue'], [House, 'blue'], [Search, 'blue'], [Globe2, 'blue'],
  [ShieldCheck, 'emerald'], [CircleCheck, 'emerald'], [Smartphone, 'emerald'],
  [Wallet, 'amber'], [CreditCard, 'amber'], [Landmark, 'amber'], [Gift, 'amber'], [Bell, 'amber'],
  [GraduationCap, 'violet'], [Stethoscope, 'rose'], [LifeBuoy, 'blue'], [ReceiptText, 'amber'], [FileCheck2, 'emerald'], [Settings2, 'teal'], [BookOpen, 'violet'], [Moon, 'violet'], [InfinityIcon, 'violet'],
  [Building2, 'teal'], [LayoutGrid, 'teal'], [Repeat2, 'teal'],
  [CalendarDays, 'orange'], [Clock3, 'orange'], [Package, 'orange'], [Sparkles, 'amber'],
]);

/** Decorative icons inherit their accessible name from the surrounding control. */
export default function Icon({ name, className = '' }: { name: string; className?: string }) {
  const Glyph = icons[name] || CircleCheck;
  return <Glyph className={`app-icon ${className}`} data-icon-tone={tones.get(Glyph)} size={20} strokeWidth={1.8} aria-hidden="true" focusable="false" />;
}
