#!/bin/bash
set -e

echo "Creating Client Business..."
# Accepts business name, email, password
# Creates Firebase Auth user
# Creates /businesses/{businessId} doc
# Creates /users/{uid} doc mapping to businessId
