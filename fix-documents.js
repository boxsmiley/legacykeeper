// One-time script to fix documents missing FileName and other fields
const fs = require('fs');
const path = require('path');

const dataFile = path.join(__dirname, 'data/documents.json');

try {
  const data = JSON.parse(fs.readFileSync(dataFile, 'utf8'));

  let fixed = 0;
  data.forEach(doc => {
    let modified = false;

    // Fix missing FileName
    if (!doc.FileName || doc.FileName.trim() === '') {
      doc.FileName = 'Untitled Document';
      modified = true;
    }

    // Fix missing DocumentType
    if (!doc.DocumentType) {
      doc.DocumentType = 'Other';
      modified = true;
    }

    // Fix missing FileType
    if (!doc.FileType) {
      doc.FileType = 'N/A';
      modified = true;
    }

    // Fix missing Description
    if (doc.Description === undefined) {
      doc.Description = '';
      modified = true;
    }

    if (modified) {
      fixed++;
      console.log(`Fixed document: ${doc.UniqueId}`);
    }
  });

  if (fixed > 0) {
    fs.writeFileSync(dataFile, JSON.stringify(data, null, 2));
    console.log(`\n✅ Fixed ${fixed} document(s)`);
  } else {
    console.log('✅ All documents are properly formatted');
  }
} catch (error) {
  console.error('Error fixing documents:', error);
}
