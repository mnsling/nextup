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

export function PricingPage({ plans, go, setSelectedPlan, setModal }) {
  return (
    <>
      {" "}
      <div className="page-title">
        <span className="eyebrow">SIMPLE PLANS FOR EVERY COURT</span>
        <h1>Grow the game.</h1>
        <p>
          Players join free. Clubs pay only when they need more hosting tools.
        </p>
      </div>
      <div className="plans">
        {plans.map((p) => (
          <div className={"plan " + (p.featured ? "featured" : "")} key={p.id}>
            {p.featured && <span className="popular">MOST POPULAR</span>}
            <span className="eyebrow">{p.name.toUpperCase()}</span>
            <h2>
              {p.price}
              <small>{p.period}</small>
            </h2>
            <p>{p.description}</p>
            <button
              className={p.featured ? "primary" : "outline"}
              onClick={() =>
                p.id === "free"
                  ? go("discover")
                  : (setSelectedPlan(p), setModal("payment"))
              }
            >
              {p.id === "free" ? "Start playing" : "Choose " + p.name}{" "}
              <ArrowUpRight size={17} />
            </button>
            <div className="plan-lines">
              {p.features.map((x) => (
                <div key={x}>
                  <Check size={17} />
                  {x}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
      <div className="payment-note">
        <ShieldCheck size={22} />
        <span>
          Plan payments use your GCash merchant QR and manual review. Plans are
          recommendations for launch and do not auto-renew.
        </span>
      </div>{" "}
    </>
  );
}
