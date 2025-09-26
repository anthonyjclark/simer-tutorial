#!/usr/bin/env bash

read -s -p "Enter password: " WELLS_PASS
export WELLS_PASS

python upload_linux.py
