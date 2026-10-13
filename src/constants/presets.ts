import { VoicePreset } from '../types.ts';

export const VOICE_PRESETS: VoicePreset[] = [
  {
    id: 'commercial',
    name: 'Publicité Commerciale',
    icon: 'Megaphone',
    category: 'Marketing',
    description: 'Ton dynamique, persuasif et accrocheur avec appel à l\'action percutant.',
    stylePrompt: 'Ton publicitaire dynamique, clair, ultra-convaincant, énergie haute et enthousiaste, diction parfaite avec appel à l\'action marqué.',
    recommendedVoice: 'Puck',
    speed: 1.1,
    pitch: 'normal',
  },
  {
    id: 'luxury',
    name: 'Publicité Luxe',
    icon: 'Sparkles',
    category: 'Marketing',
    description: 'Voix feutrée, raffinée et élégante avec pauses soignées.',
    stylePrompt: 'Ton raffiné, chaleureux, élégant et intime, articulation délicate, pauses théâtrales et envoûtantes dans le style haute couture.',
    recommendedVoice: 'Kore',
    speed: 0.9,
    pitch: 'normal',
  },
  {
    id: 'tiktok',
    name: 'Voix-off TikTok & Reels',
    icon: 'Flame',
    category: 'Réseaux Sociaux',
    description: 'Rythme rapide, accrocheur, moderne et énergique pour captiver l\'attention.',
    stylePrompt: 'Voix jeune, punchy, spontanée, débit soutenu et moderne avec intonation captivante dès la première seconde.',
    recommendedVoice: 'Puck',
    speed: 1.15,
    pitch: 'normal',
  },
  {
    id: 'youtube',
    name: 'Narration YouTube',
    icon: 'Video',
    category: 'Contenu Vidéo',
    description: 'Style captivant, engageant et fluide pour retenir l\'audience sur de longues vidéos.',
    stylePrompt: 'Narration vidéo fluide, engageante, naturelle et chaleureuse, relances d\'intonation régulières pour maintenir l\'attention.',
    recommendedVoice: 'Zephyr',
    speed: 1.05,
    pitch: 'normal',
  },
  {
    id: 'motivational',
    name: 'Discours Motivationnel',
    icon: 'Trophy',
    category: 'Inspiration',
    description: 'Intensité montante, voix inspirante et déterminée pour galvaniser.',
    stylePrompt: 'Discours puissant, inspirant, conviction inébranlable, intensité croissante et souffle déterminé.',
    recommendedVoice: 'Fenrir',
    speed: 0.95,
    pitch: 'deep',
  },
  {
    id: 'storytelling',
    name: 'Récit & Storytelling',
    icon: 'BookOpen',
    category: 'Fiction & Audiobooks',
    description: 'Interprétation expressive, variations d\'émotions et rythme narratif immersif.',
    stylePrompt: 'Conteur immersif, émotion palpable, intonations variées et mystérieuses, respect du suspense et du silence.',
    recommendedVoice: 'Kore',
    speed: 0.95,
    pitch: 'normal',
  },
  {
    id: 'calm',
    name: 'Calme & Méditation',
    icon: 'Moon',
    category: 'Bien-être',
    description: 'Rythme ralenti, souffle doux et présence réconfortante.',
    stylePrompt: 'Voix très douce, apaisante, tempo lent, réconfortante, respiration paisible pour la relaxation et le sommeil.',
    recommendedVoice: 'Kore',
    speed: 0.85,
    pitch: 'normal',
  },
  {
    id: 'documentary',
    name: 'Documentaire Historique & Nature',
    icon: 'Compass',
    category: 'Culture',
    description: 'Voix grave, posée, neutre et majestueuse digne d\'Arte ou National Geographic.',
    stylePrompt: 'Narration de documentaire prestigieux, ton grave, sage, posé et majestueux, diction cinématographique impeccable.',
    recommendedVoice: 'Charon',
    speed: 0.95,
    pitch: 'deep',
  },
  {
    id: 'corporate',
    name: 'Présentation Professionnelle',
    icon: 'Briefcase',
    category: 'Business',
    description: 'Clarté irréprochable, sérieux, crédibilité et ton assuré.',
    stylePrompt: 'Ton exécutif clair, posé, rassurant et expert, prononciation exemplaire pour présentation d\'entreprise ou formation.',
    recommendedVoice: 'Zephyr',
    speed: 1.0,
    pitch: 'normal',
  },
  {
    id: 'conversational',
    name: 'Conversation Naturelle',
    icon: 'MessageSquare',
    category: 'Podcast & Dialogue',
    description: 'Ton décontracté et authentique comme entre amis.',
    stylePrompt: 'Conversation naturelle et fluide en français, sans rigidité, intonations vivantes et spontanées.',
    recommendedVoice: 'Kore',
    speed: 1.0,
    pitch: 'normal',
  },
];

export const SAMPLE_SCRIPTS: { [key: string]: { title: string; preset: string; text: string } } = {
  commercial: {
    title: 'Spot Publicitaire High-Tech',
    preset: 'commercial',
    text: `Imaginez un monde où chaque seconde compte, où la technologie anticipe vos moindres désirs.
Découvrez la nouvelle génération Marius Voice AI. Plus rapide, plus intuitive, et conçue pour sublimer toutes vos créations audio.
N'attendez plus, passez au niveau supérieur dès aujourd'hui. Vos projets méritent le meilleur de l'intelligence artificielle !`,
  },
  tiktok: {
    title: 'Script Court TikTok / Reels',
    preset: 'tiktok',
    text: `Arrête tout de suite de chercher comment doubler tes vidéos ! <gasp>
Cette IA vocale vient littéralement de changer les règles du jeu. En deux clics, tu peux convertir n'importe quel texte en voix-off ultra-réaliste, ou même créer ta propre voix personnalisée.
Enregistre ce post pour ton prochain montage et dis-moi en commentaire ce que tu en penses !`,
  },
  documentary: {
    title: 'Extrait Documentaire Historique (Long)',
    preset: 'documentary',
    text: `Au cœur des vallées silencieuses, là où le vent sculpte la roche depuis des millénaires, les vestiges du passé murmurent encore d'antiques légendes.
Les premiers explorateurs traversèrent ces terres hostiles guidés par les étoiles. Chaque pas résonnait comme un serment gravé dans l'éternité.
Aujourd'hui encore, la nature préserve ses mystères les plus profonds, rappelant à l'humanité l'humilité face aux forces intemporelles de l'univers.`,
  },
  storytelling: {
    title: 'Conte Immersif & Fiction',
    preset: 'storytelling',
    text: `La pluie battait contre les vitres de la vieille bâtisse. <breath> Dans la pénombre du grenier, Elena découvrit un carnet relié de cuir usé.
En tournant la première page, une carte dessinée à l'encre dorée sembla s'illuminer sous ses yeux émerveillés.
"Ce secret t'attendait depuis cent ans", disait l'inscription manuscrite. Son cœur battait la chamade tandis qu'au dehors, la tempête redoublait de violence.`,
  },
  motivational: {
    title: 'Discours Motivationnel',
    preset: 'motivational',
    text: `Chaque matin, vous avez deux choix : continuer à rêver de votre vie, ou vous lever et la bâtir.
Les obstacles ne sont pas des barrières, ils sont l'entraînement qui forge votre caractère. Ne laissez personne dicter vos limites.
Le succès n'appartient pas aux spectateurs, il appartient à ceux qui osent passer à l'action avec audace et persévérance.`,
  },
};
