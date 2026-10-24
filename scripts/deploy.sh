#!/usr/bin/env bash
# =============================================================================
#  JouwGezinsleven — veilige deploy van dist/ naar cPanel/Superspace (SFTP of FTPS)
#
#  Gebruik:
#    scripts/deploy.sh deploy   [dist-dir]   # gefaseerde, incrementele deploy
#    scripts/deploy.sh snapshot [out-dir]    # download live-versies van bestanden die de volgende deploy wijzigt/verwijdert
#    scripts/deploy.sh restore  <dir>        # zet een snapshot terug (rollback voor de eerste deploy)
#    scripts/deploy.sh verify                # controleer live _release.txt / homepage / sitemap
#
#  Strategie (geen "halve" site, niets blind verwijderen):
#   1. Verschil bepalen o.b.v. SHA-256-manifest van de vorige deploy (.deploy-manifest op de server).
#   2. Fase A: nieuwe/gewijzigde assets uploaden (css/js/fonts/afbeeldingen). Bestaande pagina's blijven werken.
#   3. Fase B: gewijzigde HTML/XML/TXT/.htaccess uploaden als tijdelijk bestand en daarna per bestand
#      hernoemen (rename is atomair op de server) → een bezoeker ziet nooit een half geschreven pagina.
#   4. Fase C: alleen bestanden verwijderen die DEZE straat zelf eerder heeft geplaatst (manifest) en
#      die niet meer bestaan. Gehashte assets blijven één release langer staan (gecachte pagina's).
#      Bestanden die niet door deze straat zijn geplaatst (oude site, .well-known, cgi-bin…) worden nooit aangeraakt.
#   5. Manifest + _release.txt als laatste → markeert een voltooide release.
#   Een fout in fase A laat de live site volledig intact. Een fout in fase B/C kan een deel van de
#   pagina's al vernieuwd hebben; opnieuw draaien (idempotent) of rollback herstelt dit.
#
#  Env (secrets via GitHub Environments — nooit in de repo):
#    DEPLOY_PROTOCOL   sftp | ftps  (ftp alleen met ALLOW_PLAIN_FTP=1)
#    DEPLOY_HOST, DEPLOY_PORT (optioneel), DEPLOY_USER
#    DEPLOY_PASSWORD   (ftps/sftp met wachtwoord)   of   DEPLOY_SSH_KEY (sftp, private key-inhoud)
#    DEPLOY_KNOWN_HOSTS (sftp: regel(s) uit known_hosts — verplicht, host-key pinning)
#    DEPLOY_PATH       remote document root, bijv. /home/<account>/public_html (verplicht, nooit "/"),
#                      of "." voor een FTP-account dat alleen de document root van deze site ziet
#    DEPLOY_SITE_URL   publieke URL voor verificatie (optioneel)
#    DEPLOY_TLS_VERIFY 1 (default) — alleen op 0 zetten als de host geen geldig certificaat heeft
#    DRY_RUN=1         toont wat er zou gebeuren, verandert niets
# =============================================================================
set -Eeuo pipefail

MODE="${1:-deploy}"
ARG="${2:-}"
WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT

trap 'printf "[deploy] FOUT: onverwachte fout (regel %s, exit %s)\n" "$LINENO" "$?" >&2' ERR
log()  { printf '[deploy %s] %s\n' "$(date -u +%H:%M:%S)" "$*"; }
die()  { printf '[deploy] FOUT: %s\n' "$*" >&2; exit 1; }

# ---------- configuratie & veiligheidscontroles ----------
PROTO="${DEPLOY_PROTOCOL:-}"
[[ -n "${DEPLOY_HOST:-}" && -n "${DEPLOY_USER:-}" && -n "${DEPLOY_PATH:-}" ]] || die "DEPLOY_HOST, DEPLOY_USER en DEPLOY_PATH zijn verplicht"
case "$PROTO" in
  sftp|ftps) ;;
  ftp) [[ "${ALLOW_PLAIN_FTP:-}" == "1" ]] || die "onversleutelde FTP geweigerd (zet ALLOW_PLAIN_FTP=1 als er echt geen alternatief is)";;
  *) die "DEPLOY_PROTOCOL moet sftp of ftps zijn";;
esac
# "." = de startmap van het FTP-account zelf. Bedoeld voor een cPanel-FTP-account dat is opgesloten in
# de document root van één site (least privilege): die map heet voor het account "/", wat hieronder geweigerd wordt.
REMOTE="${DEPLOY_PATH%/}"
if [[ "$DEPLOY_PATH" != "." ]]; then
  [[ "$REMOTE" == /* && "$REMOTE" != "/" && "$REMOTE" != *".."* ]] || die "DEPLOY_PATH moet '.' of een absoluut pad zijn, niet '/' en zonder '..'"
fi

command -v lftp >/dev/null || die "lftp is niet geïnstalleerd"

LFTP_SETTINGS="$WORK/settings.lftp"
{
  echo "set cmd:fail-exit yes"
  echo "set net:max-retries 3; set net:reconnect-interval-base 5; set net:timeout 30"
  echo "set cmd:verbose no; set xfer:clobber on"
  if [[ "$PROTO" == "ftps" ]]; then
    echo "set ftp:ssl-force true; set ftp:ssl-auth TLS; set ftp:ssl-protect-data true; set ftp:ssl-protect-list true; set ftp:passive-mode true"
    echo "set ssl:verify-certificate ${DEPLOY_TLS_VERIFY:-1}"
  fi
  if [[ "$PROTO" == "sftp" ]]; then
    [[ -n "${DEPLOY_KNOWN_HOSTS:-}" ]] || die "DEPLOY_KNOWN_HOSTS is verplicht voor sftp (host-key pinning)"
    printf '%s\n' "$DEPLOY_KNOWN_HOSTS" > "$WORK/known_hosts"
    SSH_OPTS="-a -x -o StrictHostKeyChecking=yes -o UserKnownHostsFile=$WORK/known_hosts -o BatchMode=no"
    if [[ -n "${DEPLOY_SSH_KEY:-}" ]]; then
      printf '%s\n' "$DEPLOY_SSH_KEY" > "$WORK/id_key"; chmod 600 "$WORK/id_key"
      SSH_OPTS="$SSH_OPTS -i $WORK/id_key -o BatchMode=yes"
    fi
    echo "set sftp:connect-program \"ssh $SSH_OPTS\""
    echo "set sftp:auto-confirm no"
  fi
} > "$LFTP_SETTINGS"

# FTPS = expliciete TLS (AUTH TLS op poort 21), zoals cPanel dat aanbiedt. Implicit FTPS (poort 990) wordt niet gebruikt.
SCHEME="$PROTO"; [[ "$PROTO" == "ftps" ]] && SCHEME="ftp"
URL="$SCHEME://${DEPLOY_HOST}${DEPLOY_PORT:+:$DEPLOY_PORT}"
# Wachtwoord via env (LFTP_PASSWORD) → komt niet in de proceslijst of logs.
export LFTP_PASSWORD="${DEPLOY_PASSWORD:-}"
lftp_run() {  # $1 = bestand met lftp-commando's
  local auth=(-u "$DEPLOY_USER")
  [[ -n "$LFTP_PASSWORD" ]] && auth=(--env-password -u "$DEPLOY_USER")
  [[ "$PROTO" == "sftp" && -z "$LFTP_PASSWORD" ]] && auth=(-u "$DEPLOY_USER,")
  lftp "${auth[@]}" -e "source $LFTP_SETTINGS; source $1; bye" "$URL"
}

# Remote bestand ophalen (leeg bestand als het niet bestaat)
fetch_remote() {  # $1 remote-relatief pad, $2 lokaal pad
  rm -f "$2"
  printf 'get %q -o %q\n' "$REMOTE/$1" "$2" > "$WORK/get.lftp"
  lftp_run "$WORK/get.lftp" >/dev/null 2>&1 || : > "$2"
  [[ -f "$2" ]] || : > "$2"
}

is_page() { [[ "$1" =~ \.(html|xml|txt)$ || "$(basename "$1")" == ".htaccess" ]]; }

# ---------- verify ----------
verify_live() {
  local site="${DEPLOY_SITE_URL:-}" rel="${1:-}"
  [[ -n "$site" ]] || { log "verify overgeslagen (DEPLOY_SITE_URL niet gezet)"; return 0; }
  site="${site%/}"
  local ok=0
  for i in 1 2 3 4 5; do
    local got; got="$(curl -fsS --max-time 20 "$site/_release.txt?nocache=$RANDOM$i" 2>/dev/null | sed -n 's/^release=//p' || true)"
    if [[ -z "$rel" || "$got" == "$rel" ]]; then ok=1; break; fi
    log "live release is '$got', verwacht '$rel' — opnieuw proberen ($i/5)"; sleep 6
  done
  [[ $ok == 1 ]] || die "live site toont niet de verwachte release ($rel)"
  for p in "/" "/sitemap.xml" "/robots.txt"; do
    local code; code="$(curl -s -o /dev/null -w '%{http_code}' --max-time 20 "$site$p")"
    [[ "$code" == "200" ]] || die "$site$p gaf HTTP $code"
  done
  local nf; nf="$(curl -s -o /dev/null -w '%{http_code}' --max-time 20 "$site/deze-pagina-bestaat-niet-$RANDOM/")"
  [[ "$nf" == "404" ]] || die "404-pagina geeft HTTP $nf i.p.v. 404"
  log "✓ live verificatie geslaagd ($site, release ${rel:-onbekend})"
}

# ---------- verbinding + document root controleren (een verbindingsfout mag nooit als "leeg" gelden) ----------
check_remote() {
  printf 'cls -1 %q/\n' "$REMOTE" > "$WORK/check.lftp"
  lftp_run "$WORK/check.lftp" > "$WORK/remote-ls" 2> "$WORK/remote-err" \
    || die "kan $REMOTE niet openen op $DEPLOY_HOST ($(tail -1 "$WORK/remote-err"))"
  log "verbonden met $DEPLOY_HOST via $PROTO; document root bevat $(wc -l < "$WORK/remote-ls") items"
}

# ---------- plan: verschil tussen lokaal en live manifest ----------
make_plan() {  # $1 = lokale dist
  local DIST="$1"
  [[ "${PLAN_CHECKED:-}" == 1 ]] || check_remote
  [[ -f "$DIST/_release.txt" && -f "$DIST/index.html" && -f "$DIST/sitemap.xml" ]] \
    || die "$DIST is geen geverifieerde build (draai eerst scripts/verify-dist.mjs)"
  (cd "$DIST" && find . -type f ! -name '.deploy-manifest*' -print0 | sort -z | xargs -0 sha256sum | sed 's#  \./#  #') > "$WORK/new.manifest"
  fetch_remote ".deploy-manifest" "$WORK/old.manifest"
  fetch_remote ".deploy-manifest.prev" "$WORK/older.manifest"
  # gewijzigd of nieuw = regels (hash+pad) die niet letterlijk in het oude manifest staan
  comm -23 <(sort "$WORK/new.manifest") <(sort "$WORK/old.manifest") | cut -c67- > "$WORK/changed"
  cut -c67- "$WORK/new.manifest" | sort > "$WORK/new.paths"
  cut -c67- "$WORK/old.manifest" | sort > "$WORK/old.paths"
  cut -c67- "$WORK/older.manifest" | sort > "$WORK/older.paths"
  # verwijderen: stonden in vorige release en niet meer in de nieuwe
  comm -23 "$WORK/old.paths" "$WORK/new.paths" | grep -v '^_astro/' > "$WORK/delete" || true
  # gehashte assets: één release grace → alleen verwijderen wat al twee releases niet meer gebruikt wordt
  comm -23 "$WORK/older.paths" <(sort -u "$WORK/new.paths" "$WORK/old.paths") | grep '^_astro/' >> "$WORK/delete" || true
  grep -v -E '\.(html|xml|txt)$|(^|/)\.htaccess$' "$WORK/changed" | grep -v '^_release\.txt$' > "$WORK/assets" || true
  grep -E '\.(html|xml|txt)$|(^|/)\.htaccess$' "$WORK/changed" | grep -v '^_release\.txt$' > "$WORK/pages" || true
  log "plan: $(wc -l < "$WORK/assets") assets, $(wc -l < "$WORK/pages") pagina's/config, $(wc -l < "$WORK/delete") verwijderen (vorige release: $(wc -l < "$WORK/old.paths") bestanden)"
}

emit_mkdirs() {  # stdin: paden
  sed -n 's#/[^/]*$##p' | sort -u | while read -r d; do printf 'mkdir -p -f %q\n' "$REMOTE/$d"; done
}

# ---------- lock: voorkomt dat twee deploys tegelijk op de server schrijven ----------
# GitHub Actions serialiseert al (concurrency-groep); dit is een tweede vangnet voor handmatige runs.
LOCK_HELD=0
acquire_lock() {  # $1 release-id
  fetch_remote ".deploy-lock" "$WORK/lock"
  if [[ -s "$WORK/lock" ]]; then
    local since now; since="$(sed -n 's/^since=//p' "$WORK/lock")"; now="$(date +%s)"
    if [[ -n "$since" && $(( now - since )) -lt ${LOCK_STALE_SECONDS:-1800} ]]; then
      die "er loopt al een deploy ($(tr '\n' ' ' < "$WORK/lock")). Wacht of verwijder .deploy-lock als die vastzit."
    fi
    log "verouderde lock gevonden ($(( now - since ))s) — wordt overgenomen"
  fi
  printf 'release=%s\nsince=%s\n' "$1" "$(date +%s)" > "$WORK/mylock"
  printf 'put %q -o %q\n' "$WORK/mylock" "$REMOTE/.deploy-lock" > "$WORK/lock.lftp"; lftp_run "$WORK/lock.lftp"
  LOCK_HELD=1
}
release_lock() {
  [[ "$LOCK_HELD" == 1 ]] || return 0
  printf 'set cmd:fail-exit no\nrm %q\n' "$REMOTE/.deploy-lock" > "$WORK/unlock.lftp"; lftp_run "$WORK/unlock.lftp" >/dev/null 2>&1 || true
  LOCK_HELD=0
}
trap 'release_lock; rm -rf "$WORK"' EXIT

# ---------- deploy ----------
do_deploy() {
  local DIST="${ARG:-dist}"
  local REL; REL="$(sed -n 's/^release=//p' "$DIST/_release.txt")"
  check_remote
  [[ "${DRY_RUN:-}" == "1" ]] || acquire_lock "$REL"
  PLAN_CHECKED=1 make_plan "$DIST"
  if [[ "${DRY_RUN:-}" == "1" ]]; then
    log "DRY_RUN: zou uploaden:"; cat "$WORK/assets" "$WORK/pages" | sed 's/^/  + /'
    log "DRY_RUN: zou verwijderen:"; sed 's/^/  - /' "$WORK/delete"; return 0
  fi
  local tmpsuffix=".upload-$REL"

  # Fase A — assets (nieuwe bestandsnamen; raakt live pagina's niet)
  { cat "$WORK/assets" | emit_mkdirs
    while read -r f; do [[ -n "$f" ]] && printf 'put %q -o %q\n' "$DIST/$f" "$REMOTE/$f"; done < "$WORK/assets"
  } > "$WORK/a.lftp"
  log "fase A: assets uploaden"; lftp_run "$WORK/a.lftp"

  # Fase B — pagina's: eerst alles als tijdelijk bestand, pas daarna hernoemen
  { cat "$WORK/pages" | emit_mkdirs
    while read -r f; do [[ -n "$f" ]] && printf 'put %q -o %q\n' "$DIST/$f" "$REMOTE/$f$tmpsuffix"; done < "$WORK/pages"
  } > "$WORK/b1.lftp"
  log "fase B1: pagina's uploaden (tijdelijk)"; lftp_run "$WORK/b1.lftp"
  # Hernoemen over een bestaand bestand lukt niet op elke FTP/SFTP-server → per bestand: oude weg, direct hernoemen
  # (het gat per pagina is milliseconden; alle inhoud staat op dat moment al volledig op de server).
  { while read -r f; do [[ -n "$f" ]] && printf 'rm -f %q\nmv %q %q\n' "$REMOTE/$f" "$REMOTE/$f$tmpsuffix" "$REMOTE/$f"; done < "$WORK/pages"; } > "$WORK/b2.lftp"
  log "fase B2: pagina's activeren"; lftp_run "$WORK/b2.lftp"

  # Fase C — opruimen (alleen eigen, niet meer gebruikte bestanden)
  if [[ -s "$WORK/delete" ]]; then
    { while read -r f; do [[ -n "$f" ]] && printf 'rm -f %q\n' "$REMOTE/$f"; done < "$WORK/delete"; } > "$WORK/c.lftp"
    log "fase C: $(wc -l < "$WORK/delete") verouderde bestanden verwijderen"; lftp_run "$WORK/c.lftp"
    # lege mappen opruimen (anders geeft Apache 403 i.p.v. 404); niet-lege mappen blijven gewoon staan
    { echo "set cmd:fail-exit no"
      sed -n 's#/[^/]*$##p' "$WORK/delete" | awk -F/ '{p=$1; print p; for(i=2;i<=NF;i++){p=p"/"$i; print p}}' \
        | sort -u | awk '{print length, $0}' | sort -rn | cut -d' ' -f2- | while read -r d; do printf 'rmdir %q\n' "$REMOTE/$d"; done
    } > "$WORK/c2.lftp"
    lftp_run "$WORK/c2.lftp" >/dev/null 2>&1 || true
  fi

  # Fase D — release markeren (manifesten + _release.txt als laatste)
  printf 'put %q -o %q\nput %q -o %q\nput %q -o %q\n' \
    "$WORK/old.manifest" "$REMOTE/.deploy-manifest.prev" \
    "$WORK/new.manifest" "$REMOTE/.deploy-manifest" \
    "$DIST/_release.txt" "$REMOTE/_release.txt" > "$WORK/d.lftp"
  log "fase D: release $REL markeren"; lftp_run "$WORK/d.lftp"
  release_lock
  log "✓ deploy voltooid: release $REL"
  verify_live "$REL"
  # Lijst met gewijzigde/verwijderde pagina's bewaren voor IndexNow (scripts/indexnow.mjs)
  if [[ -n "${INDEXNOW_DIR:-}" ]]; then
    mkdir -p "$INDEXNOW_DIR"
    cp "$WORK/pages" "$INDEXNOW_DIR/changed"
    cp "$WORK/delete" "$INDEXNOW_DIR/deleted" 2>/dev/null || : > "$INDEXNOW_DIR/deleted"
    log "IndexNow-lijsten: $(wc -l < "$INDEXNOW_DIR/changed") gewijzigd, $(wc -l < "$INDEXNOW_DIR/deleted") verwijderd"
  fi
}

# ---------- snapshot: live versie van alles wat de volgende deploy overschrijft/verwijdert ----------
do_snapshot() {
  local DIST="${DIST_DIR:-dist}" OUT="${ARG:-snapshot}"
  make_plan "$DIST"
  mkdir -p "$OUT"
  sort -u "$WORK/pages" "$WORK/delete" "$WORK/assets" | sed '/^$/d' > "$WORK/snap"
  { echo "set cmd:fail-exit no"   # bestanden die live nog niet bestaan (nieuw in deze release) zijn geen fout
    while read -r f; do mkdir -p "$OUT/$(dirname "$f")"; printf 'get %q -o %q\n' "$REMOTE/$f" "$OUT/$f"; done < "$WORK/snap"
  } > "$WORK/s.lftp"
  lftp_run "$WORK/s.lftp" >/dev/null 2>&1 || true
  find "$OUT" -type f -empty -delete; find "$OUT" -mindepth 1 -type d -empty -delete 2>/dev/null || true
  [[ -s "$WORK/old.manifest" ]] && cp "$WORK/old.manifest" "$OUT/.deploy-manifest"
  log "snapshot: $(find "$OUT" -type f ! -name '.deploy-manifest' | wc -l) live bestanden bewaard in $OUT"
}

# ---------- restore: snapshot terugzetten ----------
do_restore() {
  local SRC="${ARG:?geef de snapshot-map op}"
  [[ -d "$SRC" ]] || die "snapshot-map $SRC bestaat niet"
  (cd "$SRC" && find . -type f ! -name '.deploy-manifest*' | sed 's#^\./##') > "$WORK/restore"
  { emit_mkdirs < "$WORK/restore"
    while read -r f; do printf 'put %q -o %q\n' "$SRC/$f" "$REMOTE/$f"; done < "$WORK/restore"
    if [[ -s "$SRC/.deploy-manifest" ]]; then printf 'put %q -o %q\n' "$SRC/.deploy-manifest" "$REMOTE/.deploy-manifest"
    else printf 'set cmd:fail-exit no\nrm %q\n' "$REMOTE/.deploy-manifest"; fi
  } > "$WORK/r.lftp"
  [[ "${DRY_RUN:-}" == "1" ]] && { cat "$WORK/r.lftp"; return 0; }
  log "restore: $(wc -l < "$WORK/restore") bestanden terugzetten"; lftp_run "$WORK/r.lftp"
  log "✓ snapshot teruggezet"
}

case "$MODE" in
  deploy)   do_deploy ;;
  snapshot) do_snapshot ;;
  restore)  do_restore ;;
  verify)   verify_live "${ARG:-}" ;;
  *) die "onbekende modus: $MODE (deploy|snapshot|restore|verify)";;
esac
