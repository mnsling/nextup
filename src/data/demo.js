export const demoClubs = [
  {
    id: "demo-a",
    name: "Davao Rally Club",
    city: "Davao City",
    description: "Good games, good people, every week.",
    members: 42,
    image: 1,
  },
  {
    id: "demo-b",
    name: "Southside Picklers",
    city: "Matina, Davao",
    description: "Open play for all levels.",
    members: 28,
    image: 2,
  },
  {
    id: "demo-c",
    name: "Baseline Social",
    city: "Lanang, Davao",
    description: "Play hard. Hang out longer.",
    members: 36,
    image: 3,
  },
];
const future = (days, hour) => {
  let d = new Date();
  d.setDate(d.getDate() + days);
  d.setHours(hour, 0, 0, 0);
  return d.toISOString();
};
export const demoSessions = [
  {
    id: "demo-1",
    title: "Tuesday night open play",
    club_id: "demo-a",
    location: "Matina Sports Complex",
    maps_url: "https://maps.google.com/?q=Matina+Sports+Complex",
    starts_at: future(0, 18),
    ends_at: future(0, 21),
    capacity: 24,
    courts: 4,
    skill_level: "All levels",
    fee: 100,
    status: "open",
    joined: 18,
  },
  {
    id: "demo-2",
    title: "Morning mix & match",
    club_id: "demo-b",
    location: "Southside Courts",
    maps_url: "https://maps.google.com/?q=Davao+City",
    starts_at: future(1, 7),
    ends_at: future(1, 10),
    capacity: 20,
    courts: 3,
    skill_level: "Beginner friendly",
    fee: 80,
    status: "open",
    joined: 12,
  },
  {
    id: "demo-3",
    title: "Friday doubles social",
    club_id: "demo-c",
    location: "Lanang Pickleball Center",
    maps_url: "https://maps.google.com/?q=Lanang+Davao",
    starts_at: future(3, 19),
    ends_at: future(3, 22),
    capacity: 32,
    courts: 5,
    skill_level: "Intermediate",
    fee: 120,
    status: "open",
    joined: 21,
  },
];
