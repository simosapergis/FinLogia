#!/bin/bash
set -e

echo "Creating Office Admin..."
# Accepts email, password, and sets custom claims { isAccountant: true, role: 'admin' }
# And adds a document to /accountants/{uid}
