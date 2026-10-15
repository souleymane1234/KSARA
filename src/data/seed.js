import { TODAY, addDays, iso, D, monthKey, uid } from '../lib/utils.js';
import { POSTES0, PAY_MODES, PERMS0 } from './referentiels.js';
import { VER } from '../lib/config.js';

/* ---------- Jeu de données de démonstration ---------- */
export function seed() {
  const db = { v: VER, agency: { nom: "KSARA", raison: "KSARA Agence Immobilière", tel: "+225 07 47 88 55 01", tel2: "07 77 59 60 47", tel3: "27 22 44 67 65", email: "ksaragenceci@yahoo.com", adresse: "Cocody Cannebière, Abidjan", prenomAdmin: "", nomAdmin: "", rccm: "" },
    postes: JSON.parse(JSON.stringify(POSTES0)), perms: JSON.parse(JSON.stringify(PERMS0)), tourDone: {} };

  const E = (id, nom, service, poste, statut, contrat, entree, salaire, tel) => ({ id, matricule: "KS-" + id.slice(1).padStart(3, "0"), nom, service, poste, statut, contrat, entree, salaire, tel, email: nom.split(" ")[1]?.toLowerCase().replace(/[^a-z]/g, "") + "@ksara-agence.ci", naissance: "", adresse: "Abidjan", historique: [{ date: entree, txt: "Embauche — " + poste }], docs: [{ nom: "Contrat de travail.pdf", type: "Contrat" }, { nom: "CV.pdf", type: "CV" }] });
  db.employes = [
    E("e1", "Kouassi Aya Marie-Laure", "admin", "Directeur général", "Actif", "CDI", "2019-03-01", 1500000, "07 07 11 22 33"),
    E("e2", "Traoré Moussa", "rh", "Responsable RH/Paie", "Actif", "CDI", "2020-01-15", 750000, "05 05 41 22 10"),
    E("e3", "Koné Fatoumata", "rh", "Assistant RH/Paie", "Actif", "CDI", "2023-06-01", 380000, "07 48 10 92 01"),
    E("e4", "Yao Kouadio Serge", "syndic", "Gestionnaire de copropriété", "Actif", "CDI", "2021-09-01", 520000, "01 02 33 44 55"),
    E("e5", "N'Guessan Adjoua Prisca", "gestion", "Gestionnaire locatif", "Actif", "CDI", "2022-02-14", 450000, "07 59 32 18 40"),
    E("e6", "Bamba Ibrahim", "syndic", "Agent de recouvrement", "Actif", "CDD", "2025-04-01", 300000, "05 66 20 14 78"),
    E("e7", "Diallo Aminata", "juridique", "Juriste", "Actif", "CDI", "2021-11-02", 650000, "07 22 90 61 03"),
    E("e8", "Ouattara Karim", "marketing", "Responsable marketing", "Actif", "CDI", "2022-07-18", 560000, "01 41 75 32 90"),
    E("e9", "Kouamé Éric", "gestion", "Agent immobilier", "Actif", "CDD", "2025-10-01", 280000, "05 04 87 66 12"),
    E("e10", "Coulibaly Mariam", "marketing", "Chargé de communication", "Stagiaire", "Stage", D(-45), 100000, "07 89 01 23 45"),
    E("e11", "Gnagne Ange-Désiré", "juridique", "Assistant juridique", "Stagiaire", "Stage", D(-20), 100000, "05 12 34 56 78"),
    E("e12", "Soro Lacina", "admin", "Administrateur plateforme", "Consultant", "Prestation", "2026-01-10", 400000, "01 70 70 21 21")
  ];
  db.employes[1].historique.push({ date: "2023-01-01", txt: "Promotion — Responsable RH/Paie" });
  db.employes[3].historique.push({ date: "2024-01-01", txt: "Augmentation de salaire (+8 %)" });
  db.employes[5].historique.push({ date: "2026-05-12", txt: "Avertissement écrit — retards répétés" });

  db.clients = [
    { id: "c1", nom: "Koné Adama", type: "Propriétaire", tel: "07 08 09 10 11", email: "adama.kone@gmail.com", commune: "Cocody", source: "Recommandation", entreprise: "", note: "Propriétaire de 3 biens" },
    { id: "c2", nom: "SCI Les Palmiers", type: "Propriétaire", tel: "27 22 44 55 66", email: "sci.palmiers@ci.net", commune: "Marcory", source: "Partenaire", entreprise: "SCI", note: "Résidence Les Palmiers (12 lots)" },
    { id: "c3", nom: "Aka Jean-Marc", type: "Locataire", tel: "05 55 44 33 22", email: "jm.aka@yahoo.fr", commune: "Cocody", source: "Site web", entreprise: "Orange CI", note: "" },
    { id: "c4", nom: "Dosso Mariétou", type: "Locataire", tel: "07 12 12 34 34", email: "m.dosso@gmail.com", commune: "Marcory", source: "Facebook", entreprise: "", note: "" },
    { id: "c5", nom: "Ehui Patrick", type: "Locataire", tel: "01 45 67 89 00", email: "patrick.ehui@outlook.com", commune: "Plateau", source: "Agence", entreprise: "Cabinet Ehui & Associés", note: "Bureau professionnel" },
    { id: "c6", nom: "Tanoh Bénédicte", type: "Locataire", tel: "05 98 76 54 32", email: "b.tanoh@gmail.com", commune: "Yopougon", source: "Facebook", entreprise: "", note: "" },
    { id: "c7", nom: "Kouadio Hervé", type: "Acheteur", tel: "07 33 22 11 00", email: "herve.k@gmail.com", commune: "Bingerville", source: "Site web", entreprise: "", note: "Cherche terrain 500 m²" },
    { id: "c8", nom: "Sylla Mohamed", type: "Prospect", tel: "05 01 02 03 04", email: "msylla@gmail.com", commune: "Cocody", source: "Facebook", entreprise: "", note: "Villa 4 pièces Riviera, budget 600 000/mois" },
    { id: "c9", nom: "Mme Brou Évelyne", type: "Propriétaire", tel: "07 77 66 55 44", email: "evelyne.brou@gmail.com", commune: "Yopougon", source: "Recommandation", entreprise: "", note: "" },
    { id: "c10", nom: "Assi Laurent", type: "Locataire", tel: "01 23 45 67 89", email: "l.assi@gmail.com", commune: "Koumassi", source: "Agence", entreprise: "", note: "" },
    { id: "c11", nom: "Bakayoko Salimata", type: "Prospect", tel: "07 40 50 60 70", email: "salimata.b@gmail.com", commune: "Marcory", source: "Site web", entreprise: "", note: "Studio meublé zone 4" },
    { id: "c12", nom: "N'Dri Yves", type: "Locataire", tel: "05 30 20 10 00", email: "yves.ndri@gmail.com", commune: "Cocody", source: "Agence", entreprise: "", note: "" }
  ];

  const B = (id, titre, type, commune, quartier, operation, prix, pieces, surface, statut, proprio) => ({ id, ref: "KS-B" + id.slice(1).padStart(3, "0"), titre, type, commune, quartier, operation, prix, pieces, surface, statut, proprio, desc: "" });
  db.biens = [
    B("b15", "Villa duplex 5 pièces très haut standing", "Villa", "Cocody", "Riviera Golf 4 — Beverly Hills", "Location", 4500000, 5, 600, "Disponible", "c1"),
    B("b1", "Villa duplex 5 pièces", "Villa", "Cocody", "Riviera Golf", "Location", 850000, 5, 320, "Loué", "c1"),
    B("b2", "Appartement 3 pièces vue lagune", "Appartement", "Marcory", "Zone 4", "Location", 400000, 3, 110, "Loué", "c2"),
    B("b3", "Bureau 80 m² climatisé", "Bureau", "Plateau", "Avenue Chardy", "Location", 650000, 3, 80, "Loué", "c1"),
    B("b4", "Appartement 2 pièces", "Appartement", "Yopougon", "Maroc", "Location", 150000, 2, 60, "Loué", "c9"),
    B("b5", "Appartement meublé 3 pièces avec terrasse", "Appartement", "Marcory", "Biétry", "Location", 650000, 3, 120, "Disponible", "c2"),
    B("b6", "Villa duplex neuve 5 pièces", "Villa", "Bingerville", "Feh Kessé", "Location", 900000, 5, 300, "Disponible", "c1"),
    B("b7", "Terrain 600 m² ACD", "Terrain", "Bingerville", "Akandjé", "Vente", 42000000, 0, 600, "Sous compromis", "c9"),
    B("b8", "Appartement 4 pièces", "Appartement", "Koumassi", "Remblais", "Location", 250000, 4, 120, "Loué", "c9"),
    B("b9", "Magasin 40 m²", "Magasin", "Treichville", "Avenue 16", "Location", 300000, 1, 40, "En travaux", "c2"),
    B("b10", "Villa basse 6 pièces avec piscine", "Villa", "Cocody", "Riviera 3", "Vente", 185000000, 6, 450, "Disponible", "c1"),
    B("b11", "Appartement 3 pièces", "Appartement", "Cocody", "Deux-Plateaux", "Location", 380000, 3, 105, "Loué", "c2"),
    B("b12", "Studio meublé, résidence neuve", "Studio", "Cocody", "Angré Château", "Location", 250000, 1, 40, "Disponible", "c9"),
    B("b13", "Appartement 4 pièces neuf", "Appartement", "Cocody", "Cannebière", "Location", 1200000, 4, 200, "Disponible", "c9"),
    B("b14", "Immeuble R+3 (8 lots)", "Immeuble", "Marcory", "Résidence Les Palmiers", "Gestion syndic", 0, 0, 900, "Loué", "c2")
  ];
  const PH = { b15: ["villa_piscine"], b5: ["std_salon", "std_cuisine", "std_terrasse"], b6: ["bv_villa", "bv_terrasse", "bv_facade", "bv_vue"], b10: ["vc_piscine", "vc_salon", "vc_sejour", "vc_salon2"], b12: ["imm_sdb", "imm_facade", "imm_douche"], b13: ["apt_salon", "apt_chambre", "apt_sdb", "apt_piece"] };
  const DESC = {
    b15: "Grand séjour et salle à manger lumineux ; cuisine moderne entièrement équipée ; toilette visiteur ; 4 chambres spacieuses avec salle d'eau attenante ; buanderie ; boyerie et guérite ; dépendance autonome ; beau jardin avec grande piscine ; 2 grandes terrasses. Commodités : gardiennage 7j/7 24h/24, splits et chauffe-eau installés, garage, groupe électrogène.",
    b5: "Coup de cœur : le standing du bien et la belle terrasse lumineuse. Cuisine ouverte équipée avec îlot, séjour avec éclairage indirect, entièrement meublé.",
    b6: "Villa duplex neuve sur grand terrain engazonné : longue terrasse carrelée, balcon avec vue dégagée, portail et clôture, climatisation installée.",
    b10: "Villa basse de charme avec piscine et jardin arboré : vaste séjour avec baies vitrées, salle à manger, salon TV, cuisine, terrasse autour de la piscine.",
    b12: "Studio meublé dans une résidence neuve sécurisée avec parking : salle d'eau en marbre, douche italienne, lave-linge, finitions soignées.",
    b13: "Appartement neuf aux grands volumes : séjour avec baie vitrée et terrasse, chambres avec placards, salle de bain avec baignoire îlot, carrelage effet parquet, climatisation."
  };
  db.biens.forEach(b => { b.photos = PH[b.id] || []; b.desc = DESC[b.id] || ""; });
  db.biens[0].vedette = true;

  const L = (id, bien, loc, debut, fin, loyer) => ({ id, bien, locataire: loc, debut, fin, loyer, caution: loyer * 2, avance: loyer * 2, statut: "Actif", edlEntree: null, edlSortie: null });
  db.baux = [
    L("l1", "b1", "c3", "2024-11-01", D(320), 850000),
    L("l2", "b2", "c4", "2025-03-01", D(45), 400000),
    L("l3", "b3", "c5", "2023-07-01", D(80), 650000),
    L("l4", "b4", "c6", "2025-10-01", D(350), 150000),
    L("l5", "b8", "c10", "2024-06-01", D(230), 250000),
    L("l6", "b11", "c12", "2026-02-01", D(475), 380000)
  ];
  db.baux[1].statut = "Préavis";

  // Paiements de loyer : 4 derniers mois
  db.paiements = [];
  const unpaid = { l4: 2, l5: 1, l2: 1, l1: 1 };
  db.baux.forEach(b => {
    for (let i = 3; i >= 0; i--) {
      const d = new Date(TODAY.getFullYear(), TODAY.getMonth() - i, 5);
      const mk = monthKey(d);
      const isUnpaid = unpaid[b.id] && i < unpaid[b.id];
      db.paiements.push({ id: uid("p"), bail: b.id, mois: mk, montant: b.loyer, statut: isUnpaid ? "Impayé" : "Payé", date: isUnpaid ? "" : iso(d), mode: isUnpaid ? "" : PAY_MODES[(i + b.id.length) % 4], relances: isUnpaid ? (i === 1 ? 2 : 0) : 0, quittance: isUnpaid ? "" : "Q-" + mk.replace("-", "") + "-" + b.id.toUpperCase() });
    }
  });

  db.prestataires = [
    { id: "s1", nom: "Ets Kouakou Plomberie", metier: "Plombier", note: 5, tel: "07 01 01 02 02", commune: "Cocody", interventions: 14 },
    { id: "s2", nom: "Électro Services CI", metier: "Électricien", note: 4, tel: "05 14 25 36 47", commune: "Marcory", interventions: 9 },
    { id: "s3", nom: "Maître Assoumou Claire", metier: "Notaire", note: 5, tel: "27 20 21 22 23", commune: "Plateau", interventions: 6 },
    { id: "s4", nom: "SCP Yéo & Konan", metier: "Huissier", note: 4, tel: "27 20 30 40 50", commune: "Plateau", interventions: 4 },
    { id: "s5", nom: "Peinture Pro Abidjan", metier: "Peintre", note: 3, tel: "01 88 77 66 55", commune: "Yopougon", interventions: 7 },
    { id: "s6", nom: "Froid Express", metier: "Climatisation", note: 4, tel: "07 66 55 44 33", commune: "Koumassi", interventions: 11 },
    { id: "s7", nom: "Menuiserie Bois d'Or", metier: "Menuisier", note: 3, tel: "05 22 33 44 55", commune: "Abobo", interventions: 3 },
    { id: "s8", nom: "Sécur'Gard", metier: "Gardiennage", note: 4, tel: "27 21 00 11 22", commune: "Marcory", interventions: 12 }
  ];

  db.factures = [
    { id: "f1", no: "FAC-2026-041", client: "c1", objet: "Commission de gestion — septembre", date: D(-28), echeance: D(-13), statut: "Payée", lignes: [{ d: "Commission de gestion 10 % (3 biens)", q: 1, pu: 185000 }], tva: true },
    { id: "f2", no: "FAC-2026-042", client: "c2", objet: "Honoraires syndic T3", date: D(-20), echeance: D(-5), statut: "En retard", lignes: [{ d: "Honoraires syndic — 3e trimestre", q: 1, pu: 450000 }], tva: true },
    { id: "f3", no: "FAC-2026-043", client: "c7", objet: "Frais de recherche terrain", date: D(-6), echeance: D(9), statut: "En attente", lignes: [{ d: "Frais de dossier", q: 1, pu: 50000 }, { d: "Visites accompagnées", q: 3, pu: 15000 }], tva: false },
    { id: "f4", no: "FAC-2026-044", client: "c9", objet: "Commission de gestion — septembre", date: D(-3), echeance: D(12), statut: "En attente", lignes: [{ d: "Commission de gestion 10 %", q: 1, pu: 40000 }], tva: true }
  ];
  db.achats = [
    { id: "a1", objet: "Ramettes de papier A4 (10 cartons)", fournisseur: "Librairie de France", montant: 185000, date: D(-12), statut: "Livré", demandeur: "e3" },
    { id: "a2", objet: "Imprimante multifonction", fournisseur: "Bureau Vallée Abidjan", montant: 420000, date: D(-4), statut: "Commandé", demandeur: "e2" },
    { id: "a3", objet: "Abonnement fibre bureau", fournisseur: "Orange CI", montant: 65000, date: D(-2), statut: "En validation", demandeur: "e12" }
  ];
  db.inventaire = [
    { id: "i1", nom: "Ordinateur portable HP ProBook", cat: "Informatique", qte: 8, etat: "Bon", lieu: "Siège", affecte: "Personnel" },
    { id: "i2", nom: "Climatiseur split 1,5 CV", cat: "Équipement", qte: 4, etat: "Bon", lieu: "Siège", affecte: "Bureaux" },
    { id: "i3", nom: "Trousseaux de clés biens", cat: "Clés", qte: 22, etat: "Bon", lieu: "Coffre", affecte: "Gestion locative" },
    { id: "i4", nom: "Véhicule Toyota Hilux", cat: "Véhicule", qte: 1, etat: "Moyen", lieu: "Parking", affecte: "Visites terrain" },
    { id: "i5", nom: "Groupe électrogène 10 kVA", cat: "Équipement", qte: 1, etat: "À réviser", lieu: "Siège", affecte: "Bâtiment" },
    { id: "i6", nom: "Caméra de surveillance", cat: "Sécurité", qte: 6, etat: "Bon", lieu: "Résidence Les Palmiers", affecte: "Syndic" }
  ];
  db.travaux = [
    { id: "t1", bien: "b9", objet: "Réfection électricité + peinture", prestataire: "s2", date: D(3), cout: 750000, statut: "Planifié" },
    { id: "t2", bien: "b14", objet: "Entretien trimestriel ascenseur", prestataire: "s6", date: D(9), cout: 180000, statut: "Planifié" },
    { id: "t3", bien: "b2", objet: "Fuite salle de bain", prestataire: "s1", date: D(-2), cout: 45000, statut: "Terminé" },
    { id: "t4", bien: "b1", objet: "Révision climatisation", prestataire: "s6", date: D(0), cout: 90000, statut: "En cours" }
  ];
  db.charges = [
    { id: "ch1", residence: "Résidence Les Palmiers", poste: "Gardiennage", montant: 600000, periode: monthKey(TODAY), repartition: "Tantièmes", statut: "Appelée" },
    { id: "ch2", residence: "Résidence Les Palmiers", poste: "Électricité parties communes", montant: 145000, periode: monthKey(TODAY), repartition: "Égalitaire", statut: "Appelée" },
    { id: "ch3", residence: "Résidence Les Palmiers", poste: "Entretien ascenseur", montant: 180000, periode: monthKey(TODAY), repartition: "Tantièmes", statut: "À appeler" },
    { id: "ch4", residence: "Résidence Les Palmiers", poste: "Eau parties communes", montant: 60000, periode: monthKey(addDays(TODAY, -30)), repartition: "Égalitaire", statut: "Recouvrée" }
  ];
  db.contrats = [
    { id: "k1", modele: "Bail d'habitation", ref: "BAIL-2024-118", bien: "b1", partieA: "c1", partieB: "c3", date: "2024-10-20", montant: 850000, duree: "24 mois", statut: "Signé" },
    { id: "k2", modele: "Mandat de gestion", ref: "MAND-2025-031", bien: "b2", partieA: "c2", partieB: "", date: "2025-02-10", montant: 0, duree: "36 mois", statut: "Signé" },
    { id: "k3", modele: "Bail professionnel", ref: "BAIL-2023-077", bien: "b3", partieA: "c1", partieB: "c5", date: "2023-06-20", montant: 650000, duree: "36 mois", statut: "Signé" },
    { id: "k4", modele: "Compromis de vente", ref: "VTE-2026-004", bien: "b7", partieA: "c9", partieB: "c7", date: D(-5), montant: 42000000, duree: "—", statut: "À signer" },
    { id: "k5", modele: "Bail d'habitation", ref: "BAIL-2026-140", bien: "b11", partieA: "c2", partieB: "c12", date: "2026-01-25", montant: 380000, duree: "24 mois", statut: "Signé" }
  ];
  db.contentieux = [
    { id: "x1", objet: "Loyers impayés (2 mois)", type: "Impayé", bail: "l4", adverse: "c6", etape: "Mise en demeure", audience: D(21), conseil: "s4", statut: "En cours" },
    { id: "x2", objet: "Dégâts des eaux — voisinage", type: "Litige", bail: "l1", adverse: "c3", etape: "Médiation", audience: "", conseil: "", statut: "En cours" },
    { id: "x3", objet: "Expulsion ancien locataire Treichville", type: "Expulsion", bail: "", adverse: "", etape: "Jugement rendu", audience: D(-40), conseil: "s4", statut: "Clos" }
  ];
  db.conges = [
    { id: "g1", emp: "e5", type: "Congé annuel", debut: D(10), fin: D(24), jours: 11, motif: "Congé annuel", statut: "En attente" },
    { id: "g2", emp: "e8", type: "Congé annuel", debut: D(-3), fin: D(4), jours: 6, motif: "", statut: "Approuvé" },
    { id: "g3", emp: "e6", type: "Permission exceptionnelle", debut: D(2), fin: D(3), jours: 2, motif: "Mariage d'un proche", statut: "En attente" },
    { id: "g4", emp: "e4", type: "Congé annuel", debut: D(40), fin: D(60), jours: 15, motif: "Fêtes de fin d'année", statut: "Approuvé" },
    { id: "g5", emp: "e3", type: "Congé maladie", debut: D(-30), fin: D(-27), jours: 4, motif: "Certificat médical fourni", statut: "Approuvé" }
  ];
  db.absences = [
    { id: "ab1", emp: "e6", date: D(-9), duree: "1 jour", motif: "Non justifiée", justif: "Non" },
    { id: "ab2", emp: "e9", date: D(-4), duree: "Demi-journée", motif: "Rendez-vous administratif", justif: "Oui" },
    { id: "ab3", emp: "e10", date: D(-1), duree: "2 heures", motif: "Examen à l'école", justif: "Oui" }
  ];
  db.stages = [
    { id: "st1", emp: "e10", ecole: "ISTC Polytechnique", tuteur: "e8", debut: D(-45), fin: D(45), objectifs: "Animer la page Facebook ; produire 3 visites virtuelles ; lancer la newsletter mensuelle", evaluations: [{ date: D(-15), note: 15, com: "Bonne autonomie, à renforcer sur la rédaction." }] },
    { id: "st2", emp: "e11", ecole: "Université FHB — Droit privé", tuteur: "e7", debut: D(-20), fin: D(70), objectifs: "Mettre à jour les modèles de bail ; classer les archives 2023-2025", evaluations: [] }
  ];
  db.formations = [
    { id: "fo1", titre: "Prise en main de la plateforme KSARA", type: "Interne", organisme: "AD'GEN'CI", date: D(7), duree: "1 jour", participants: ["e2", "e3", "e4", "e5", "e6", "e7", "e8", "e9"], cout: 0, statut: "Planifiée" },
    { id: "fo2", titre: "Fiscalité immobilière en Côte d'Ivoire", type: "Externe", organisme: "Cabinet FIDAFRICA", date: D(-35), duree: "2 jours", participants: ["e2", "e7"], cout: 350000, statut: "Réalisée" },
    { id: "fo3", titre: "Techniques de recouvrement amiable", type: "Externe", organisme: "CCI Côte d'Ivoire", date: D(25), duree: "1 jour", participants: ["e4", "e6"], cout: 120000, statut: "Planifiée" }
  ];
  db.mouvements = []; // primes & avances
  db.mouvements.push({ id: "m1", emp: "e6", type: "Avance sur salaire", montant: 60000, mois: monthKey(TODAY), statut: "Validée" });
  db.mouvements.push({ id: "m2", emp: "e5", type: "Prime de performance", montant: 75000, mois: monthKey(TODAY), statut: "Validée" });
  db.mouvements.push({ id: "m3", emp: "e9", type: "Prime de commission", montant: 120000, mois: monthKey(TODAY), statut: "En attente" });
  db.paies = []; // bulletins validés (historique)
  for (let i = 3; i >= 1; i--) { const mk = monthKey(new Date(TODAY.getFullYear(), TODAY.getMonth() - i, 1)); db.paies.push({ mois: mk, date: iso(new Date(TODAY.getFullYear(), TODAY.getMonth() - i, 28)), net: 5320000 + i * 41000, effectif: 12 }); }

  // Mouvements financiers (6 mois)
  db.ecritures = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(TODAY.getFullYear(), TODAY.getMonth() - i, 15), mk = monthKey(d);
    const f = 1 + (5 - i) * .035;
    db.ecritures.push({ id: uid("w"), date: iso(d), mois: mk, cat: "Loyers encaissés", lib: "Loyers du mois (mandats)", montant: Math.round(2380000 * f), sens: "in" });
    db.ecritures.push({ id: uid("w"), date: iso(d), mois: mk, cat: "Commissions", lib: "Commissions de gestion & honoraires", montant: Math.round(610000 * f + (i === 2 ? 900000 : 0)), sens: "in" });
    db.ecritures.push({ id: uid("w"), date: iso(d), mois: mk, cat: "Salaires", lib: "Masse salariale", montant: 5300000, sens: "out" });
    db.ecritures.push({ id: uid("w"), date: iso(d), mois: mk, cat: "Charges", lib: "Loyer siège, électricité, internet", montant: Math.round(780000 + (i % 2) * 60000), sens: "out" });
    db.ecritures.push({ id: uid("w"), date: iso(d), mois: mk, cat: "Dépenses", lib: "Fournitures, carburant, divers", montant: Math.round(310000 + (i % 3) * 45000), sens: "out" });
    db.ecritures.push({ id: uid("w"), date: iso(d), mois: mk, cat: "Ventes & transactions", lib: "Honoraires de transaction", montant: [3200000, 0, 4800000, 1500000, 0, 2650000][5 - i], sens: "in" });
  }

  db.users = [
    { id: "u0", username: "admin", password: "ksara2026", role: "admin", service: "admin", poste: "Administrateur plateforme", nom: "KSARA", emp: "", actif: true },
    { id: "u1", username: "service_paie1", password: "ksara2026", role: "rh", service: "rh", poste: "Assistant RH/Paie", nom: "Koné Fatoumata", emp: "e3", actif: true },
    { id: "u2", username: "service_juridique1", password: "ksara2026", role: "juridique", service: "juridique", poste: "Juriste", nom: "Diallo Aminata", emp: "e7", actif: true },
    { id: "u3", username: "service_syndic1", password: "ksara2026", role: "syndic", service: "syndic", poste: "Gestionnaire de copropriété", nom: "Yao Kouadio Serge", emp: "e4", actif: true },
    { id: "u4", username: "service_marketing1", password: "ksara2026", role: "marketing", service: "marketing", poste: "Responsable marketing", nom: "Ouattara Karim", emp: "e8", actif: true },
    { id: "u5", username: "client_aka", password: "ksara2026", role: "client", service: "client", poste: "Locataire", nom: "Aka Jean-Marc", client: "c3", actif: true },
    { id: "u6", username: "client_kone", password: "ksara2026", role: "client", service: "client", poste: "Propriétaire", nom: "Koné Adama", client: "c1", actif: true }
  ];

  db.notifs = [
    { id: "n1", date: addDays(TODAY, -0.1).toISOString(), canal: "Alerte", titre: "Fin de bail dans 45 jours", txt: "Appartement 3 pièces vue lagune (Marcory) — locataire Dosso Mariétou, préavis reçu.", lu: false, to: ["admin", "juridique", "syndic", "gestion"] },
    { id: "n2", date: addDays(TODAY, -0.3).toISOString(), canal: "Alerte", titre: "2 loyers impayés", txt: "Tanoh Bénédicte (Yopougon) — dossier transmis au juridique.", lu: false, to: ["admin", "syndic", "juridique", "gestion"] },
    { id: "n3", date: addDays(TODAY, -1).toISOString(), canal: "Système", titre: "Demande de congé à valider", txt: "N'Guessan Adjoua Prisca — 11 jours.", lu: false, to: ["admin", "rh"] },
    { id: "n4", date: addDays(TODAY, -2).toISOString(), canal: "SMS", titre: "SMS envoyé", txt: "Rappel de paiement envoyé à Assi Laurent (01 23 45 67 89).", lu: true, to: ["admin", "syndic", "gestion"] },
    { id: "n5", date: addDays(TODAY, -2.5).toISOString(), canal: "Alerte", titre: "Audience dans 21 jours", txt: "Dossier « Loyers impayés (2 mois) » — Tribunal de Yopougon.", lu: false, to: ["admin", "juridique"] },
    { id: "n6", date: addDays(TODAY, -3).toISOString(), canal: "Email", titre: "Quittance envoyée", txt: "Quittance du mois envoyée à Aka Jean-Marc.", lu: true, to: ["admin", "syndic", "gestion", "client:c3"] },
    { id: "n7", date: addDays(TODAY, -0.2).toISOString(), canal: "Système", titre: "Votre loyer est disponible au paiement", txt: "Payez en ligne par Mobile Money ou carte depuis votre portail.", lu: false, to: ["client:c3", "client:c6"] }
  ];
  db.campagnes = [
    { id: "cp1", titre: "Nouvelles offres — Cocody & Riviera", cible: "Prospects", envoyes: 214, ouverture: 38, date: D(-18), statut: "Envoyée" },
    { id: "cp2", titre: "Promo : 1 mois de frais d'agence offert", cible: "Tous", envoyes: 486, ouverture: 31, date: D(-47), statut: "Envoyée" }
  ];
  db.edl = [
    { id: "ed1", bail: "l6", type: "Entrée", date: "2026-02-01", agent: "e5", pieces: [{ p: "Séjour", e: "Bon", c: "Peinture neuve" }, { p: "Cuisine", e: "Bon", c: "" }, { p: "Chambre 1", e: "Bon", c: "" }, { p: "Chambre 2", e: "Moyen", c: "Placard porte décollée" }, { p: "Salle d'eau", e: "Bon", c: "" }], compteurs: "Électricité 004512 kWh — Eau 1290 m³", cles: 3 }
  ];
  db.baux[5].edlEntree = "ed1";
  db.logs = [];
  const A = (d, svc, user, action, mod) => db.logs.push({ id: uid("h"), date: addDays(TODAY, d).toISOString(), service: svc, user, action, mod });
  const acts = [
    ["syndic", "service_syndic1", "Quittance émise — Aka Jean-Marc", "quittances"], ["rh", "service_paie1", "Facture FAC-2026-044 créée", "facturation"],
    ["juridique", "service_juridique1", "Compromis de vente VTE-2026-004 rédigé", "contrats"], ["marketing", "service_marketing1", "Prospect ajouté — Sylla Mohamed", "clients"],
    ["syndic", "service_syndic1", "Relance SMS — Tanoh Bénédicte", "recouvrement"], ["gestion", "admin", "Visite programmée — Villa basse Angré", "biens"],
    ["rh", "service_paie1", "Avance sur salaire validée — Bamba Ibrahim", "paie"], ["syndic", "service_syndic1", "Appel de charges — Résidence Les Palmiers", "charges"],
    ["admin", "admin", "Utilisateur service_marketing1 créé", "users"], ["juridique", "service_juridique1", "Mise en demeure envoyée — dossier impayés", "contentieux"],
    ["marketing", "service_marketing1", "Campagne « Nouvelles offres » envoyée", "emailing"], ["rh", "service_paie1", "Inventaire mis à jour — ordinateurs", "inventaire"]
  ];
  for (let i = 0; i < 46; i++) { const a = acts[(i * 7) % acts.length]; A(-(i * 0.63) - 0.05, a[0], a[1], a[2], a[3]); }
  return db;
}

