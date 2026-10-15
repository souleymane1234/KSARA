/* ---------- Référentiels ---------- */
export const SERVICES = [
  { id: "admin", name: "Administration", desc: "Direction & pilotage" },
  { id: "rh", name: "RH / Paie", desc: "Personnel, paie, achats" },
  { id: "marketing", name: "Marketing", desc: "Prospection & communication" },
  { id: "syndic", name: "Syndic", desc: "Copropriétés & recouvrement" },
  { id: "gestion", name: "Gestion locative", desc: "Baux, visites, états des lieux" },
  { id: "juridique", name: "Juridique", desc: "Contrats & contentieux" }
];
export const svcName = id => (SERVICES.find(s => s.id === id) || { name: id === "client" ? "Portail client" : id }).name;
export const POSTES0 = {
  admin: ["Directeur général", "Administrateur plateforme"],
  rh: ["Responsable RH/Paie", "Assistant RH/Paie", "Comptable"],
  marketing: ["Responsable marketing", "Chargé de communication", "Commercial terrain"],
  syndic: ["Gestionnaire de copropriété", "Agent de recouvrement"],
  gestion: ["Gestionnaire locatif", "Agent immobilier"],
  juridique: ["Juriste", "Assistant juridique"]
};
export const COMMUNES = ["Cocody", "Plateau", "Marcory", "Yopougon", "Treichville", "Koumassi", "Bingerville", "Port-Bouët"];
export const PAY_MODES = ["Orange Money", "MTN MoMo", "Moov Money", "Wave", "Virement", "Espèces"];

/* ---------- Modules & permissions ---------- */
export const MODULES = [
  { id: "dash", label: "Tableau de bord", g: "Pilotage", i: "home" },
  { id: "activites", label: "Activités des services", g: "Pilotage", i: "chart" },
  { id: "personnel", label: "Personnel", g: "Ressources humaines", i: "users" },
  { id: "postes", label: "Postes & organigramme", g: "Ressources humaines", i: "org" },
  { id: "conges", label: "Congés", g: "Ressources humaines", i: "cal" },
  { id: "absences", label: "Absences", g: "Ressources humaines", i: "clock" },
  { id: "stages", label: "Stages", g: "Ressources humaines", i: "cap" },
  { id: "formations", label: "Formations", g: "Ressources humaines", i: "book" },
  { id: "paie", label: "Paie, avances & primes", g: "Ressources humaines", i: "wallet" },
  { id: "biens", label: "Biens & cartographie", g: "Gestion locative", i: "build" },
  { id: "locatif", label: "Baux, entrées & sorties", g: "Gestion locative", i: "key" },
  { id: "edl", label: "États des lieux", g: "Gestion locative", i: "clip" },
  { id: "quittances", label: "Loyers & quittances", g: "Gestion locative", i: "receipt" },
  { id: "recouvrement", label: "Impayés & relances", g: "Gestion locative", i: "alert" },
  { id: "charges", label: "Charges communes", g: "Gestion locative", i: "layers" },
  { id: "travaux", label: "Rappels des travaux", g: "Gestion locative", i: "tool" },
  { id: "finance", label: "Finance & comptabilité", g: "Finance", i: "chart" },
  { id: "facturation", label: "Facturation", g: "Finance", i: "file" },
  { id: "achats", label: "Achats", g: "Finance", i: "cart" },
  { id: "inventaire", label: "Inventaire", g: "Finance", i: "box" },
  { id: "contrats", label: "Contrats & modèles", g: "Juridique", i: "scale" },
  { id: "contentieux", label: "Contentieux", g: "Juridique", i: "gavel" },
  { id: "clients", label: "Clients & prospects", g: "Relation client", i: "user" },
  { id: "prestataires", label: "Prestataires", g: "Relation client", i: "star" },
  { id: "messages", label: "Notifications & SMS", g: "Relation client", i: "bell" },
  { id: "emailing", label: "Emailing / newsletter", g: "Relation client", i: "mail" },
  { id: "users", label: "Utilisateurs & rôles", g: "Administration", i: "shield" },
  { id: "historique", label: "Historique", g: "Administration", i: "hist" },
  { id: "moncompte", label: "Mon espace", g: "Mon espace", i: "user" },
  /* portail client */
  { id: "p_dash", label: "Accueil", g: "Mon portail", i: "home", client: 1 },
  { id: "p_biens", label: "Mes biens", g: "Mon portail", i: "build", client: 1 },
  { id: "p_pay", label: "Paiements", g: "Mon portail", i: "pay", client: 1 },
  { id: "p_docs", label: "Documents", g: "Mon portail", i: "file", client: 1 },
  { id: "p_hist", label: "Historique", g: "Mon portail", i: "hist", client: 1 }
];
export const STAFF_MODS = MODULES.filter(m => !m.client).map(m => m.id);
export const PERMS0 = {
  admin: STAFF_MODS,
  rh: ["dash", "personnel", "postes", "conges", "absences", "stages", "formations", "paie", "facturation", "achats", "inventaire", "finance", "clients", "biens", "prestataires", "travaux", "messages", "historique", "moncompte"],
  juridique: ["dash", "contrats", "contentieux", "locatif", "clients", "biens", "messages", "historique", "moncompte"],
  syndic: ["dash", "biens", "locatif", "edl", "quittances", "recouvrement", "charges", "travaux", "clients", "contentieux", "prestataires", "messages", "historique", "moncompte"],
  gestion: ["dash", "biens", "locatif", "edl", "quittances", "recouvrement", "travaux", "clients", "prestataires", "messages", "historique", "moncompte"],
  marketing: ["dash", "clients", "biens", "emailing", "messages", "historique", "moncompte"],
  client: ["p_dash", "p_biens", "p_pay", "p_docs", "p_hist"]
};

