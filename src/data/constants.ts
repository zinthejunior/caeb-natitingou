export const genreList = [
  'Action', 'Aventure', 'Biographie', 'Classique', 'Cuisine',
  'Développement personnel', 'Droit', 'Economie', 'Education',
  'Essai', 'Fantastique', 'Histoire', 'Horreur', 'Humour',
  'Jeunesse', 'Littérature', 'Management', 'Philosophie',
  'Poésie', 'Policier', 'Psychologie', 'Religion', 'Roman',
  'Science', 'Science-fiction', 'Société', 'Théâtre', 'Thriller'
];

export const educationLevels = [
  'École', 'Lycée', 'Étudiant', 'Professionnel', 'Autre'
];

export const sousGenresParGenre: Record<string, string[]> = {
  "Roman": ["Contemporain", "Classique", "Historique", "Science-fiction", "Fantastique", "Policier", "famille"],
  "Policier": ["Enquête", "Thriller", "Noir", "Espionnage", "Legal"],
  "Romance": ["Contemporain", "Classique", "Historique", "Science-fiction", "Fantastique", "Policier", "Romance", "famille"],
  "Fiction": ["Science-fiction", "Fantastique", "Policier", "Historique", "Romance", "Aventure"],
  "Non-fiction": ["Biographie", "Essai", "Histoire", "Science", "Philosophie", "Société"],
  "Jeunesse": ["Album", "Première lecture", "Roman jeunesse", "Bande dessinée"],
  "Classique": ["Littérature française", "Littérature étrangère", "Poésie", "Théâtre"],
  "Développement personnel": ["Motivation", "Productivité", "Psychologie", "Santé", "Spiritualité"],
  "Science": ["Physique", "Chimie", "Biologie", "Mathématiques", "Informatique"],
  "Horreur": ["Gothique", "Surnaturel", "Psychologique", "Slasher", "Zombie"],
  "Poésie": ["Lyrisme", "Épique", "Satirique", "Dramatique", "Haïku"],
  "Humour": ["Satire", "Comédie", "Parodie", "Humour noir", "Humour absurde"],
  "Essai": ["Politique", "Philosophie", "Société", "Science", "Littérature"],
  "Philosophie": ["Métaphysique", "Éthique", "Logique", "Philosophie politique", "Philosophie de la science"],
  "Fantastique": ["Épique", "Urbain", "Horreur", "Science-fiction", "Contemporain"],
  "Autre": [],
};
