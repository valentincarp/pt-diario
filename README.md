# PT diário — portugais tous les jours

Appli web installable (PWA) qui remplace les carnets papier : tâche du jour issue du plan de 12 semaines, série (streak), rattrapage, exercices auto-corrigés, écriture corrigée par LanguageTool, cours avec Fábio, journal d'erreurs, cartes de révision (FSRS) et bilans. Les données restent sur l'appareil (IndexedDB) et fonctionnent hors ligne. Les rappels passent par l'appli **Calendrier** du téléphone, grâce à un fichier `.ics`.

## Installation et lancement (sur le Mac)

Prérequis : Node.js 20 ou plus récent.

```bash
cd app
npm install
npm run dev        # http://localhost:5173 (+ adresse « Network » pour le téléphone sur le même Wi-Fi)
npm test           # tests de la logique (semaine, série, décalage, rattrapage, cartes, .ics)
npm run build      # version de production dans dist/
```

## Modifier le plan (`src/plan.json`)

Tout le plan est dans `src/plan.json`. Aucune tâche n'est écrite dans les composants.

```jsonc
{
  "phases": [{ "n": 1, "title": "Consolider le B1", "weeks": [1, 4] }],  // la dernière semaine d'une phase = bilan de phase
  "weeks": [
    {
      "n": 1,
      "theme": "Pretérito perfeito",
      "objective": "…",
      "days": {
        "lun": { "title": "Titre court (notification)", "subtasks": ["Grammaire : …", "Anki 10 min", "1 article RTP Notícias"] },
        "mar": {}, "mer": {}, "jeu": {}, "ven": {}, "sam": {}, "dim": {},
        "cours2": { "title": "…", "subtasks": ["Cours 2 : …"] }   // ajouté au jour choisi dans Réglages
      }
    }
  ]
}
```

Règles :
- Chaque semaine doit avoir les 7 jours (`lun` … `dim`) et `cours2`, avec au moins une sous-tâche. Le test `npm test` le vérifie.
- Une sous-tâche contenant le mot **« Anki »** se coche toute seule quand la session de cartes du jour est validée.
- L'avancement est enregistré **par texte de sous-tâche**. Si tu renommes une sous-tâche déjà cochée, elle redevient décochée.
- Après modification : `npm test`, puis redéploie l'appli (voir plus bas).

## Exercices (`src/exercises.json`)

L'onglet **Exercices** propose :
- **une série de 10 questions** corrigée tout de suite : conjugaison des temps de la semaine (et révision des semaines passées), phrases à transformer (pronoms, voix passive, discours indirect…), traduction de tes cartes, et tes fautes du journal à corriger. La casse et la ponctuation ne comptent pas, les accents si (« Presque : attention aux accents »). Chaque erreur part dans le journal d'erreurs. Le bouton « J'avais juste » annule une erreur si ta réponse était correcte mais non prévue.
- **l'écriture** : ton texte est enregistré au fur et à mesure, et le bouton « Corriger avec LanguageTool » souligne les fautes (orthographe, grammaire, portugais européen). Tu peux appliquer une suggestion d'un geste ou envoyer la faute au journal. Le texte est envoyé à l'API publique gratuite de languagetool.org, ce qui demande internet. LanguageTool ne connaît pas ton intention : il ne verra pas un présent écrit à la place d'un passé (*visitamos* / *visitámos*).

Sur l'écran Aujourd'hui, les sous-tâches de grammaire ont un bouton « S'entraîner », et celles d'écriture un bouton « Écrire ».

Pour ajouter ou corriger des exercices, modifie `src/exercises.json` :
- `tenses` : un temps (`name`), les semaines où il est travaillé (`weeks`) et ses verbes, chacun avec 5 formes (eu, tu, ele/ela, nós, eles/elas) ;
- `sentences` : une consigne (`prompt`), la ou les réponses acceptées (`answers`), la règle (`rule`) et les semaines (`weeks`).

## Installer l'appli sur l'iPhone

Une PWA doit être servie en **HTTPS** pour fonctionner hors ligne. L'appli n'a pas de serveur : il suffit d'un hébergement de fichiers statiques gratuit. Exemple avec GitHub Pages :

1. Crée un dépôt GitHub (privé ou public) et envoie-y le contenu du dossier `app/`.
2. Lance `npm run deploy`. La commande construit l'appli et publie `dist/` sur la branche `gh-pages`.
3. Sur GitHub : Settings → Pages → Source : branche `gh-pages`. L'adresse ressemble à `https://<toi>.github.io/<depot>/`.
4. Sur l'iPhone, ouvre cette adresse dans **Safari**, puis Partager → **Sur l'écran d'accueil**.
5. Ouvre l'appli depuis l'icône. Les données de l'appli installée sont **séparées** de celles de Safari.

Pour un essai rapide sans hébergement, ouvre l'adresse « Network » affichée par `npm run dev` dans Safari, avec le téléphone sur le même Wi-Fi. Sans HTTPS, ce mode ne fonctionne pas hors ligne : il sert juste à tester.

## Notifications : abonnement au calendrier

Les rappels sont des événements du Calendrier iOS : ils arrivent appli fermée et hors ligne, sans serveur. À chaque `npm run build` ou `npm run deploy`, un fichier `calendrier.ics` est généré à partir de `src/plan.json` et `src/calendar.json`, puis publié avec le site. L'iPhone s'y **abonne** : les 12 semaines sont ajoutées d'un coup, sans doublons, et les mises à jour arrivent toutes seules.

> Pourquoi pas un import ? Sur iOS, l'app Fichiers et Mail n'affichent pas « Ajouter tout » pour un fichier qui contient plusieurs événements. L'abonnement contourne ce problème.

Le calendrier contient :
- **un événement par jour à heure fixe** (`dailyTime`, 12 h), avec en titre la tâche du jour et un message en portugais, et une alerte à l'heure. Le lundi des semaines 4, 8 et 12, le titre annonce le test blanc ;
- **les cours avec Fábio**, avec une alerte `coursBefore` minutes avant et ce qu'il faut préparer ;
- **le bilan du dimanche** à `bilanTime`. Les semaines 4, 8 et 12, c'est le bilan de phase.

**S'abonner (une seule fois)**
1. Dans PT diário : Réglages → **S'abonner au calendrier**. iOS propose « S'abonner » : accepte.
2. **Désactive « Supprimer les alertes »**. Sinon, aucune notification.
3. Touche « Ajouter ». Le calendrier apparaît dans l'app Calendrier.
4. Le bouton **Tester la notification** crée un seul événement dans 5 min. Celui-là s'importe normalement (Fichiers → Ajouter au calendrier).

Tu peux supprimer l'ancien calendrier « Portugais » créé à la main : il ne sert plus.

**Changer les horaires ou décaler le plan**
Modifie `src/calendar.json` (`planStart` = lundi de la semaine 1, jours de cours de 0 = lundi à 6 = dimanche, heures `"HH:MM"`), puis lance `npm run deploy`. L'iPhone recharge le calendrier tout seul (pour forcer : Calendrier → Calendriers → tirer vers le bas). Quand tu décales le plan dans l'appli, l'écran Réglages t'indique la nouvelle valeur de `planStart` à recopier.

Limite : un calendrier ne sait pas si tu as déjà travaillé. Il n'y a donc pas de rappel « Série en danger ». Le rappel du soir tombe tous les jours.

## Sauvegarde et changement d'appareil

Réglages → **Exporter mes données (JSON)**. Le fichier contient tout : plan suivi, journées, fautes, cours, cartes, révisions et bilans. **Importer une sauvegarde** remplace toutes les données actuelles. iOS peut effacer les données d'un site si le téléphone manque de place : exporte au moins chaque dimanche (le rappel du bilan te le rappelle).

## Règles de l'appli

- **Semaine en cours** : calculée depuis le lundi de la semaine 1 (19/10/2026 au départ).
- **Décaler le plan** (Réglages) : « reprendre à la semaine N » à partir de la semaine actuelle. L'historique reste intact, car chaque journée garde la semaine et le jour qu'elle avait au moment où tu l'as remplie.
- **Statut du jour** : *complet* si la tâche prévue ce jour-là est terminée ce jour-là ; *minimum* si la session de cartes est validée ou si tu as terminé un rattrapage ce jour-là.
- **Série** : jours consécutifs complets ou minimum. Aujourd'hui ne casse pas la série avant minuit. Un rattrapage fait avancer le plan, mais ne répare pas la série.
- **Rattrapage** : uniquement les jours passés non terminés de la semaine en cours.
- **Cartes** : algorithme FSRS (bibliothèque `ts-fsrs`). La session du jour contient les cartes dues et 5 nouvelles maximum. Quand la file est vide, tu peux continuer en révision anticipée ou avec 5 nouvelles de plus. La sous-tâche « Anki » est validée à 10 min de session, ou quand il ne reste vraiment plus rien à revoir.
- **Données de départ** : le paquet de la semaine 1 (10 phrases) et le carnet papier de la semaine 1 (mots en cartes, fautes dans le journal, notes). Ces entrées sont placées sur les dates du plan : lundi 19, mercredi 21 et jeudi 22 octobre.

## Organisation du code

```
src/plan.json        le plan (modifiable)
src/exercises.json   conjugaisons et phrases des exercices (modifiable)
src/calendar.json    horaires et début du calendrier publié (et réglages de départ de l'appli)
src/types.ts         types du plan et des données
src/logic/           logique pure et testée : dates, plan, streak, cards, exercises, ics (+ logic.test.ts)
src/store.ts         état (zustand) sauvegardé dans IndexedDB, export/import
src/seed.ts          données de départ (paquet S1 + carnet)
src/screens/         Aujourd'hui, Cartes (+ session), Exercices (+ écriture), Journal, Plus, Fábio, Bilans, Réglages
src/lib/             LanguageTool, enregistrement de fichiers
src/components/      modales (faute, carte), sous-tâches, calendrier de la série, bandeau de motivation
```
