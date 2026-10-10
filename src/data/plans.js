export const plans = [
  {
    id: "free",
    name: "Starter",
    price: "Free",
    period: "forever",
    description: "For players and new clubs.",
    features: [
      "Discover and join sessions",
      "Create one club",
      "Host up to 2 courts",
      "Live player queue",
    ],
  },
  {
    id: "club",
    name: "Club",
    price: "₱399",
    period: "/ month",
    description: "For regular open play hosts.",
    features: [
      "Everything in Starter",
      "Up to 6 courts per session",
      "Live player queue",
      "Club and session pages",
    ],
    featured: true,
  },
  {
    id: "venue",
    name: "Venue",
    price: "₱999",
    period: "/ month",
    description: "For busy clubs and venues.",
    features: [
      "Everything in Club",
      "Up to 32 courts per session",
      "Live player queue",
      "Club and session pages",
    ],
  },
];
