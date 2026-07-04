# Sweety School — Guide de mise en ligne (pas à pas)

Ce guide suppose que vous ne savez pas coder. Chaque étape est un clic après l'autre.
Comptez environ 45–60 minutes la première fois.

---

## ÉTAPE 1 — Créer votre base de données (Supabase)

1. Allez sur **https://supabase.com** → **Start your project** → connectez-vous avec Google ou GitHub (gratuit).
2. Cliquez **New project**.
   - Name : `sweety-school`
   - Database Password : choisissez un mot de passe fort et **notez-le quelque part**.
   - Region : choisissez la plus proche (ex. Europe si rien pour Madagascar).
   - Cliquez **Create new project** (patientez ~2 minutes).
3. Une fois le projet ouvert, dans le menu de gauche cliquez sur **SQL Editor** → **New query**.
4. Ouvrez le fichier **`supabase_schema.sql`** fourni, copiez tout son contenu, collez-le dans l'éditeur, puis cliquez **Run**.
   - Cela crée toutes les tables (élèves, notes, absences, etc.) et toutes les règles de sécurité.
   - Vous devriez voir "Success. No rows returned".
5. Toujours dans le menu de gauche, allez dans **Storage** → **New bucket** :
   - Name : `documents`
   - Public bucket : **laissez décoché** (non public, c'est plus sûr)
   - Cliquez **Create bucket**.
6. Retournez dans **SQL Editor** → **New query**, collez ces deux lignes puis **Run** (elles étaient en commentaire à la fin du fichier .sql) :
   ```sql
   create policy "lecture documents pour connectes" on storage.objects for select using (bucket_id = 'documents' and auth.uid() is not null);
   create policy "enseignants deposent des documents" on storage.objects for insert with check (bucket_id = 'documents' and my_role() in ('teacher','admin'));
   ```
7. Allez dans **Project Settings** (roue crantée en bas à gauche) → **API**.
   - Notez la **Project URL** (ressemble à `https://xxxxx.supabase.co`)
   - Notez la clé **anon public** (une longue chaîne de caractères)
   - Vous en aurez besoin à l'étape 3.

---

## ÉTAPE 2 — Créer les premiers comptes (admin, enseignants, parents)

1. Dans Supabase, menu de gauche → **Authentication** → **Users** → **Add user** → **Create new user**.
   - Email : votre email (ex. `direction@sweetyschool.mg`)
   - Password : un mot de passe
   - Cochez **Auto Confirm User** (pour éviter l'email de confirmation au début)
   - Cliquez **Create user**. Notez son **User UID** (visible dans la liste).
2. Allez dans **Table Editor** → table **profiles** → **Insert row** :
   - `id` : collez le User UID de l'étape précédente
   - `role` : `admin`
   - `full_name` : votre nom
   - Cliquez **Save**.
3. Répétez pour chaque enseignant·e et chaque parent (créer le compte dans **Authentication**, puis sa ligne dans **profiles** avec `role` = `teacher` ou `parent`).
4. Pour un·e enseignant·e, ajoutez aussi une ligne dans la table **teacher_classes** (`teacher_id` = son UID, `class_id` = l'identifiant de sa classe visible dans la table **classes**, `subject_id` = une matière qu'il/elle enseigne).
5. Pour un parent, ajoutez une ligne dans **parent_students** (`parent_id` = son UID, `student_id` = l'identifiant de son enfant, à créer d'abord dans la table **students**).

*(Astuce : une fois à l'aise, vous pouvez créer une petite page d'inscription automatisée — dites-le moi et je la construis.)*

---

## ÉTAPE 3 — Mettre l'application en ligne (Vercel)

1. Allez sur **https://vercel.com** → connectez-vous avec GitHub (créez un compte GitHub gratuit si besoin sur github.com).
2. Créez un nouveau dépôt GitHub :
   - Sur github.com → **New repository** → nommez-le `sweety-school-ent` → **Create repository**.
   - Sur la page du dépôt vide, cliquez **uploading an existing file**, puis glissez-y **tout le contenu du dossier `sweetyschool`** (le zip fourni, une fois dézippé) → **Commit changes**.
3. Retournez sur Vercel → **Add New** → **Project** → choisissez le dépôt `sweety-school-ent` → **Import**.
4. Avant de cliquer "Deploy", dépliez **Environment Variables** et ajoutez :
   - `VITE_SUPABASE_URL` = votre Project URL (étape 1.7)
   - `VITE_SUPABASE_ANON_KEY` = votre clé anon public (étape 1.7)
5. Cliquez **Deploy**. Après 1–2 minutes, Vercel vous donne une adresse du type `sweety-school-ent.vercel.app` — c'est l'adresse de votre ENT, accessible par tout le monde, tout le temps.

---

## ÉTAPE 4 — Vérifier que tout fonctionne

1. Ouvrez l'adresse Vercel dans votre navigateur.
2. Connectez-vous avec l'email/mot de passe admin créé à l'étape 2.
3. Vous devriez voir le tableau de bord Administration avec les 4 classes créées automatiquement.
4. Testez la connexion avec un compte enseignant, ajoutez un devoir avec une pièce jointe, une note — puis reconnectez-vous en parent pour vérifier qu'il/elle les voit.

---

## Ce que fait déjà l'application
- Vrais comptes sécurisés (email + mot de passe) par rôle : administration / enseignant / parent
- Chaque rôle ne voit que ce qui le concerne (sécurité gérée directement par la base de données, pas seulement par l'interface)
- Cahier de texte avec pièces jointes (fascicules, devoirs en PDF, images...)
- Notes avec coefficient et trimestre → bulletin imprimable par matière et par élève
- Absences / retards
- Messagerie interne (y compris message groupé à tous les parents)

## Ce qu'il reste à ajouter si besoin (dites-le moi)
- Un formulaire pour que l'administration inscrive elle-même élèves/enseignants/parents sans passer par Supabase
- Export PDF "propre" du bulletin (actuellement : impression navigateur)
- Emploi du temps modifiable depuis l'interface (actuellement : à saisir dans Supabase)
- Notifications par email quand une note ou un message est ajouté
