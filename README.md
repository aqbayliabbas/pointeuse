# Pointeuse — Next.js + Supabase

Application simple pour une agence : dashboard, employées, calendrier hebdomadaire, pointage et estimation de paie. Aucune donnée de démonstration.

## Démarrer

1. `npm install`
2. Copier `.env.example` vers `.env.local` et renseigner `NEXT_PUBLIC_SUPABASE_URL` et `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` avec la clé publique Supabase (ou utiliser `NEXT_PUBLIC_SUPABASE_ANON_KEY`). Ne jamais placer une clé `sb_secret_` ou service-role dans une variable `NEXT_PUBLIC_`.
3. Exécuter `supabase/schema.sql` dans le SQL Editor Supabase. Ce script installe les tables et remplace les anciennes politiques des tables `employees` et `attendance_events`. Il ne supprime aucun enregistrement. Il vise une base neuve ou le prototype de ce projet ; un schéma différent doit être adapté avant exécution.
4. Dans Supabase → Authentication → Users → Add user, créer le compte administrateur avec email confirmé.
5. Attribuer le rôle depuis le SQL Editor en remplaçant l’adresse :

```sql
update auth.users
set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb) || '{"role":"admin"}'::jsonb
where email = 'VOTRE_ADRESSE_EMAIL';
```

6. `npm run dev`, puis ouvrir http://localhost:3000/admin/login. Se reconnecter après un changement de rôle. Sans clés, `/admin` montre une interface vide avec une notice de configuration.

## Utilisation

- **Dashboard** : effectif actif, heures pointées, paie acquise, jours d’absence et pointages incomplets pour le mois sélectionné.
- **Employées** : ajouter/modifier le nom, la fonction, le salaire mensuel en DZD, la date d’entrée et les horaires de chaque jour (dimanche à samedi). Un créneau par jour, sans passage de minuit. Décocher les jours de repos.
- **Supprimer** archive l’employée à la date du jour : elle disparaît de la pointeuse, mais ses pointages sont conservés pour la paie passée.
- **Pointeuse** : accessible via `/` ou `/employee` sur un poste partagé connecté au compte administrateur. Choisir un nom puis début, pause, retour ou sortie. Plusieurs pauses sont possibles. Le serveur valide l’ordre des actions, verrouille les pointages concurrents et fixe l’heure. Ce mode est destiné à un poste supervisé ; aucun pointage anonyme n’est autorisé.
- **Paie** : choisir un mois pour consulter le détail et le total acquis.

## Règle de calcul

Salaire acquis = salaire mensuel × minutes pointées validées / minutes prévues sur tout le mois selon le calendrier hebdomadaire.

- Fuseau : Africa/Casablanca ; devise : DZD.
- Les pauses et le temps hors créneau sont exclus. Les jours de repos ne créent aucune absence.
- Une absence correspond à un jour planifié terminé sans aucun pointage. Les retards et départs anticipés réduisent les minutes payées.
- La journée en cours et les jours futurs ne comptent pas dans les absences ou heures manquantes. Les intervalles déjà terminés du jour sont inclus dans le montant acquis.
- Les journées incomplètes sont signalées : aucun temps n’est inventé après une entrée sans sortie. Vérifier et corriger les pointages dans Supabase avant paiement ; il n’y a pas encore d’éditeur de corrections dans l’application.
- Une entrée/sortie en cours de mois est proratisée sur le calendrier du mois complet.
- Les changements de salaire ou calendrier recalculent les anciens mois. Cette version simple ne fige pas les fiches de paie et ne conserve pas de versions de contrat. Exporter/conserver les montants validés avant de modifier un contrat.
- Estimation de rémunération du temps travaillé uniquement : pas de cotisations, fiscalité, congés payés, jours fériés, primes ou majorations d’heures supplémentaires.

## Sécurité et vérification

Les données sont accessibles uniquement aux utilisateurs dont `app_metadata.role` vaut `admin`, avec les politiques RLS Supabase. Le rôle ne provient jamais des métadonnées modifiables par l’utilisateur. Le navigateur utilise uniquement la clé publique. La création publique de comptes administrateurs est désactivée.

- `npm test` : cas de calcul (absence, pause, retard, jour de repos, mois partiel, archivage, pointage incomplet).
- `npx tsc --noEmit --incremental false`
- `npm run build`

Après configuration, vérifier dans une base de test : accès refusé sans session, création/modification d’une employée, pointages successifs, refus d’un doublon et archivage. Les tests locaux ne remplacent pas cette vérification des politiques sur votre instance Supabase.
