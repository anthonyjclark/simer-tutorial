#!/usr/bin/env sh

# Check network (use VPN if SSID != Pomona)
/System/Library/PrivateFrameworks/Apple80211.framework/Resources/airport -I  | awk -F' SSID: '  '/ SSID: / {print $2}'
networksetup -getairportnetwork en0 | cut -c 24-

# Mount server
...

# Rsync files
...
