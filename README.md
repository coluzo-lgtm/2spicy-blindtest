# 🌶️ 2 Spicy — Blind Test, interface de notation

Trois pages, un seul lien de base :

- **`/play`** — les équipes rejoignent depuis leur téléphone et appuient sur le gros bouton BUZZ dès qu'elles pensent avoir la réponse.
- **`/screen`** — à brancher sur la TV / le projecteur du bar : classement en direct + qui a buzzé en premier.
- **`/host`** — ton pupitre de contrôle : valider les réponses, attribuer les points, gérer les équipes.

Règles déjà intégrées :
- ✓✓ Titre **et** artiste trouvés → **2 points**
- ✓ Un seul des deux trouvé → **1 point**
- ✗ Mauvaise réponse → l'équipe ne peut pas buzzer **la manche suivante**

Aucun compte, aucune appli à installer côté joueurs : ils scannent le QR code affiché sur ton pupitre et jouent directement dans leur navigateur.

---

## 1. Mettre l'appli en ligne (une seule fois, ~5 min, gratuit)

On utilise **Glitch**, un hébergement gratuit qui ne demande aucune compétence technique.

1. Va sur **glitch.com** et crée un compte gratuit (avec Google ou email).
2. Clique sur **"New Project" → "Import from GitHub"**... en fait, plus simple : clique sur **"New Project" → "glitch-hello-node"** pour partir d'un projet Node.js vide.
3. Dans l'éditeur Glitch, supprime les fichiers créés par défaut (`server.js`, `.env`, le contenu de `views/` s'il y en a) et importe/colle les fichiers de ce dossier :
   - `server.js`
   - `package.json`
   - tout le dossier `public/` (avec `index.html`, `host.html`, `screen.html`, `play.html`, `style.css`)

   Le plus simple : ouvre chaque fichier avec un éditeur de texte sur ton ordi, copie son contenu, et colle-le dans un fichier du même nom créé dans Glitch (clic droit dans l'arborescence → "New File"). Tu n'as pas besoin d'importer `node_modules` ni `state.json`, `package-lock.json` — Glitch installe tout seul les dépendances à partir de `package.json`.
4. Glitch démarre automatiquement le serveur. En haut, clique sur **"Share"** pour récupérer ton lien, du type :
   `https://ton-projet-au-hasard.glitch.me`

C'est ce lien qui te sert de base pour tout :
- `https://ton-projet.glitch.me/play` → à partager avec les joueurs
- `https://ton-projet.glitch.me/screen` → à ouvrir sur la TV
- `https://ton-projet.glitch.me/host` → **ton lien perso, à ne partager avec personne** (voir sécurité ci-dessous)

Astuce : renomme le projet dans Glitch (bouton en haut à gauche) pour avoir un lien plus facile à retenir, genre `2spicy-blindtest.glitch.me`.

### ⚠️ Sécurité du pupitre `/host`

N'importe qui avec le lien `/host` peut attribuer les points. Comme le lien est en ligne, mieux vaut le protéger :

1. Dans Glitch, ouvre le fichier **`.env`** (ou crée-le).
2. Ajoute une ligne : `HOST_PASSWORD=tonmotdepasse`
3. Redémarre le projet (bouton "Restart" dans Glitch).
4. Quand tu ouvres `/host`, un mot de passe te sera demandé — les joueurs sur `/play` et l'écran `/screen` ne sont pas concernés, eux n'ont jamais besoin de mot de passe.

Sans cette étape, `/host` reste accessible à qui a le lien — à réserver si tu es sûre que personne d'autre ne le récupère.

---

## 2. Le soir du blind test

1. Ouvre **`/host`** sur ton téléphone ou ton ordi (entre le mot de passe si tu en as mis un).
2. Branche un ordi/une tablette sur la TV du bar et ouvre **`/screen`**.
3. Affiche le QR code visible sur ta page `/host` (ou partage le lien `/play`) → les équipes scannent et choisissent un nom d'équipe.
4. Pour chaque morceau :
   - Clique **"Ouvrir les buzz"** (ou "Manche suivante" si ce n'est pas le premier morceau) juste avant de lancer la musique.
   - Les équipes buzzent, l'ordre s'affiche en direct sur ton pupitre et sur l'écran.
   - Clique sur **2 pts**, **1 pt** ou **Faux** pour la première équipe de la file. En cas de "Faux", la file passe automatiquement à l'équipe suivante.
5. **"Manche suivante"** relance un tour propre (réouvre les buzz, lève les blocages des équipes qui ont fini leur pénalité).
6. Tu peux ajouter une équipe manuellement, corriger un score à la main (+/−) ou retirer une équipe à tout moment depuis le pupitre.
7. **"Réinitialiser toute la partie"** en fin de soirée efface tout pour repartir à zéro la prochaine fois.

Petit détail à savoir : l'hébergement gratuit "s'endort" après quelques minutes sans visite. Ouvre `/host` et `/screen` 1-2 minutes avant de commencer pour être sûre que tout est bien réveillé — une fois que quelqu'un a ouvert la page, ça tourne normalement toute la soirée.

Les scores sont sauvegardés automatiquement (même en cas de coupure), donc si l'appli redémarre en cours de route, rien n'est perdu.
