#!/usr/bin/env bash

# Bash strict mode
set -euo pipefail

make

# Grab password from keychain
PASSWORD="$(security find-internet-password -s wells.campus.pomona.edu -w)"
WEB_HOST="WellsAF/Fac-Staff/ajcd2020"

# Mount server
mkdir -p _mount
mount -t smbfs "//ajcd2020:$PASSWORD@$WEB_HOST/My%20Documents/My%20Webs/tutorials/simr-icra2026" _mount

# RSYNC files
cpsync _site/ _mount/

# Unmount
until diskutil unmount _mount; do echo "Trying again..."; sleep 2; done
