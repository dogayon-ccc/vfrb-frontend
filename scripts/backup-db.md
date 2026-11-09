# Database backup and restore drill (Supabase PostgreSQL)

No credentials in this file or in the repo. The connection string is only ever read from an environment variable in your own shell.

## 0. Prerequisites
- PostgreSQL client tools (`pg_dump`, `pg_restore`, `psql`) with a major version at least as new as the Supabase server (check it with `select version();` in the SQL editor).
- Two connection strings, taken from the Supabase dashboard (Project settings > Database > Connection string, session mode). Keep them in your password manager:
  - `VFRB_DB_URL`: the live project (read only for this procedure).
  - `VFRB_DRILL_DB_URL`: a **separate, empty** Supabase project used only for drills. Never the live project.

Set them for the current shell only (PowerShell):
```powershell
$env:VFRB_DB_URL = Read-Host "Live connection string"
$env:VFRB_DRILL_DB_URL = Read-Host "Drill project connection string"
```
Git Bash: `read -rs VFRB_DB_URL; export VFRB_DB_URL` (and the same for `VFRB_DRILL_DB_URL`).

## 1. Backup (before every deploy, and weekly)
```bash
stamp=$(date +%Y%m%d-%H%M)
time pg_dump "$VFRB_DB_URL" --format=custom --no-owner --no-privileges \
  --schema=public --file="vfrb-$stamp.dump"
ls -l "vfrb-$stamp.dump"
```
- Store the file **outside the repo** (it is customer data), in the owner's storage with access control.
- Record the date, file name, size and duration in the log table (section 4).
- Quick integrity check: `pg_restore --list "vfrb-$stamp.dump" | head` must list tables, not an error.

## 2. Restore drill (monthly, and after any schema change)
Into the drill project only:
```bash
start=$(date +%s)
pg_restore --dbname="$VFRB_DRILL_DB_URL" --no-owner --no-privileges --clean --if-exists \
  --schema=public "vfrb-$stamp.dump"
echo "restore took $(( $(date +%s) - start )) s"
```
Then compare row counts against the live project (run the same query on both):
```sql
select 'orders' t, count(*) from orders union all
select 'users', count(*) from users union all
select 'migrations', count(*) from migrations;
```
The counts must match the live counts at dump time. Never point the drill project at production, and never run `php artisan migrate` against either database.

## 3. Real restore (only if a migration or a bad write damaged live data)
1. Stop writes: put the frontend in maintenance, or roll back with Vercel Instant Rollback.
2. Take a fresh dump of the current (damaged) state first, so nothing is lost twice.
3. Prefer a narrow fix: a single-file `migrate:rollback --path`, or restoring one table with `pg_restore --table=<name>` into a scratch schema and copying rows back.
4. A full restore over live is the last resort. Agree it with the owner, and log it.

## 4. Log (append a row each time)
| Date | Kind (backup/drill/restore) | Dump file | Size | Minutes | Row counts match | By |
|---|---|---|---|---|---|---|
| | | | | | | |
