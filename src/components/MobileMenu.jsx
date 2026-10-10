import {
  ArrowUpRight,
  CalendarDays,
  MapPin,
  Users,
  Plus,
  Search,
  Menu,
  X,
  ChevronRight,
  Check,
  Image as ImageIcon,
  Copy,
  LogOut,
  CreditCard,
  ShieldCheck,
  Play,
  UserPlus,
} from "lucide-react";

export function MobileMenu({ menu, setMenu, go }) {
  return (
    <>
      {menu && (
        <div className="mobile-overlay">
          <div className="mobile-panel">
            <button className="close" onClick={() => setMenu(false)}>
              <X />
            </button>
            <strong>NEXTUP.</strong>
            {[
              ["discover", "Discover"],
              ["clubs", "Clubs"],
              ["my-games", "My games"],
              ["profile", "Profile"],
              ["pricing", "Plans"],
            ].map(([key, label]) => (
              <button key={key} onClick={() => go(key)}>
                {label}
                <ChevronRight size={18} />
              </button>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
