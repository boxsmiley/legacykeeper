#!/bin/bash

# Script to make all route handlers async

echo "🔧 Making all route handlers async..."

ROUTES_DIR="/home/william/legacykeeper/routes"

for file in "$ROUTES_DIR"/*.js; do
    if [ -f "$file" ]; then
        filename=$(basename "$file")
        echo "Processing: $filename"

        # router.get('/', (req, res) => {  ->  router.get('/', async (req, res) => {
        sed -i "s/router\.\(get\|post\|put\|delete\|patch\)(\([^,]*\), (\(req, res\|req, res, next\)) =>/router.\1(\2, async (\3) =>/g" "$file"

        # router.get('/', middleware, (req, res) => {  ->  router.get('/', middleware, async (req, res) => {
        sed -i "s/router\.\(get\|post\|put\|delete\|patch\)(\([^,]*\), \([^,]*\), (\(req, res\|req, res, next\)) =>/router.\1(\2, \3, async (\4) =>/g" "$file"

        # Fix double async
        sed -i 's/async async/async/g' "$file"

        echo "  ✓ Fixed $filename"
    fi
done

echo "✅ All route handlers are now async!"
