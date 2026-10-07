import { createElement, forwardRef, useEffect, useState, type ComponentProps } from 'react';
import {
  Award,
  BarChart3,
  Boxes,
  Building,
  Building2,
  Calculator,
  CheckCircle2,
  ClipboardCheck,
  Clock,
  Compass,
  CreditCard,
  DollarSign,
  FileText,
  Handshake,
  HardHat,
  Heart,
  Home,
  Landmark,
  LineChart,
  Lock,
  Map as MapIcon,
  MapPin,
  MessageSquare,
  Monitor,
  Mountain,
  Settings,
  Shield,
  ShoppingBag,
  Shovel,
  Target,
  TrendingUp,
  Users,
  Users2,
  Wallet,
  Warehouse,
  Wrench,
  type LucideIcon,
} from 'lucide-react';
import type { IconName } from 'lucide-react/dynamic';

const readyIcons: Readonly<Record<string, LucideIcon>> = {
  Award,
  BarChart3,
  Boxes,
  Building,
  Building2,
  Calculator,
  CheckCircle2,
  ClipboardCheck,
  Clock,
  Compass,
  CreditCard,
  DollarSign,
  FileText,
  Handshake,
  HardHat,
  Heart,
  Home,
  HomeIcon: Home,
  Landmark,
  LineChart,
  Lock,
  Map: MapIcon,
  MapPin,
  MessageSquare,
  Monitor,
  Mountain,
  Settings,
  Shield,
  ShoppingBag,
  Shovel,
  Target,
  TrendingUp,
  Users,
  Users2,
  Wallet,
  Warehouse,
  Wrench,
};

const deferredIcons = new Map<string, LucideIcon>();
type DynamicComponent = (typeof import('lucide-react/dynamic'))['DynamicIcon'];
let dynamicComponentRequest: Promise<DynamicComponent> | undefined;

function deferredIcon(name: string): LucideIcon {
  const cached = deferredIcons.get(name);
  if (cached !== undefined) return cached;
  const slug =
    name === 'Grid3x2'
      ? 'grid-3x2'
      : name
          .replace(/([A-Z])([A-Z][a-z])/g, '$1-$2')
          .replace(/([a-zA-Z])(\d)/g, '$1-$2')
          .replace(/(\d)([A-Za-z])/g, '$1-$2')
          .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
          .toLowerCase();
  const Icon = forwardRef<SVGSVGElement, ComponentProps<LucideIcon>>(
    function DeferredIcon(props, ref) {
      const [DynamicIcon, setDynamicIcon] = useState<DynamicComponent>();
      useEffect(() => {
        let active = true;
        dynamicComponentRequest ??= import('lucide-react/dynamic').then(
          (module) => module.DynamicIcon,
        );
        void dynamicComponentRequest.then((component) => {
          if (active) setDynamicIcon(() => component);
        });
        return () => {
          active = false;
        };
      }, []);
      if (DynamicIcon === undefined) return createElement(Building2, props);
      return createElement(DynamicIcon, {
        ...props,
        name: slug as IconName,
        className: `${props.className ?? ''} lucide-${slug}`.trim(),
        fallback: () => createElement(Building2, props),
        ref,
      });
    },
  );
  deferredIcons.set(name, Icon);
  return Icon;
}

export const contentIconComponents: Readonly<Record<string, LucideIcon>> = new Proxy(readyIcons, {
  get(icons, name) {
    if (typeof name !== 'string') return Reflect.get(icons, name);
    return icons[name] ?? deferredIcon(name);
  },
});
