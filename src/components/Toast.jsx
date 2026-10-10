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

export function Toast({ message, setMessage }) {
  return (
    <>
      {message && (
        <div className="toast">
          {message}
          <button onClick={() => setMessage("")}>
            <X size={16} />
          </button>
        </div>
      )}
    </>
  );
}
