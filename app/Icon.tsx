import {
  ArrowDown, ArrowLeft, ArrowRight, ArrowUp, ArrowUpRight, Bell,
  BookOpen, Building2, CalendarDays, Check, CircleCheck, Clock3,
  CreditCard, Droplets, Gift, Globe2, HandHeart, Heart, House,
  Infinity as InfinityIcon, Landmark, LayoutGrid, Menu, Moon,
  Package, Plus, Repeat2, Search, ShieldCheck, Sparkles, Users,
  Wallet, X, type LucideIcon,
} from 'lucide-react';

const icons: Record<string, LucideIcon> = {
  search: Search, bell: Bell, globe: Globe2, menu: Menu, close: X,
  heart: Heart, home: House, giving: HandHeart, platform: LayoutGrid,
  wallet: Wallet, shield: ShieldCheck, users: Users, calendar: CalendarDays,
  book: BookOpen, bank: Landmark, card: CreditCard,
  '⌕': Search, '◉': Bell, '✦': Sparkles, '♡': Heart, '♥': Heart,
  '⌂': House, '◇': Building2, '◎': ShieldCheck, '≡': Landmark,
  '↻': Repeat2, '□': Package, '○': Users, '▦': Building2, '☾': Moon,
  '↗': ArrowUpRight, '→': ArrowRight, '←': ArrowLeft, '↓': ArrowDown,
  '↑': ArrowUp, '✓': Check, '×': X, '∞': InfinityIcon, '◷': Clock3,
  '◫': BookOpen, '≈': Droplets, '◌': HandHeart, '▣': ShieldCheck,
  '●': CircleCheck, '+': Plus, gift: Gift,
};

/** Decorative icons inherit their accessible name from the surrounding control. */
export default function Icon({ name, className = '' }: { name: string; className?: string }) {
  const Glyph = icons[name] || CircleCheck;
  return <Glyph className={`app-icon ${className}`} size={20} strokeWidth={1.7} aria-hidden="true" focusable="false" />;
}
