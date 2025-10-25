#!/bin/bash

# Script to add await to all database calls in route files

echo "🔧 Fixing async/await in route files..."

ROUTES_DIR="/home/william/legacykeeper/routes"

# Patterns to fix:
# db.findAll( -> await db.findAll(
# db.findById( -> await db.findById(
# db.findByField( -> await db.findByField(
# db.create( -> await db.create(
# db.update( -> await db.update(
# db.delete( -> await db.delete(

# Also need to make sure the containing function is async

for file in "$ROUTES_DIR"/*.js; do
    if [ -f "$file" ]; then
        filename=$(basename "$file")
        echo "Processing: $filename"

        # Add await before database calls (if not already there)
        sed -i 's/\([^await ]\)db\.findAll(/\1await db.findAll(/g' "$file"
        sed -i 's/\([^await ]\)db\.findById(/\1await db.findById(/g' "$file"
        sed -i 's/\([^await ]\)db\.findByField(/\1await db.findByField(/g' "$file"
        sed -i 's/\([^await ]\)db\.create(/\1await db.create(/g' "$file"
        sed -i 's/\([^await ]\)db\.update(/\1await db.update(/g' "$file"
        sed -i 's/\([^await ]\)db\.delete(/\1await db.delete(/g' "$file"

        # Fix cases where we added double await
        sed -i 's/await await/await/g' "$file"

        # Fix beginning of line cases
        sed -i 's/^  const \(.*\) = db\./  const \1 = await db./g' "$file"
        sed -i 's/^    const \(.*\) = db\./    const \1 = await db./g' "$file"
        sed -i 's/^      const \(.*\) = db\./      const \1 = await db./g' "$file"

        echo "  ✓ Fixed $filename"
    fi
done

echo "✅ All route files processed!"
