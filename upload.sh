#!/usr/bin/env bash

# Bash strict mode
set -euo pipefail

# TODO: turn into makefile with render target and build
# quarto render

# Check network (use VPN if SSID != Pomona)
# /System/Library/PrivateFrameworks/Apple80211.framework/Resources/airport -I  | awk -F' SSID: '  '/ SSID: / {print $2}'
# networksetup -getairportnetwork en0 | cut -c 24-

# Grab password from keychain
PASSWORD="$(security find-internet-password -s wells.campus.pomona.edu -w)"
WEB_HOST="WellsAF/Fac-Staff/ajcd2020"

# Mount server
mkdir -p _mount
mount -t smbfs "//ajcd2020:$PASSWORD@$WEB_HOST/My%20Documents/My%20Webs/tutorials/simer" _mount

# RSYNC files
cpsync _site/ _mount/

# Unmount
until diskutil unmount _mount; do echo "Trying again..."; sleep 2; done
