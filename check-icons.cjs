const fs = require('fs');
const path = require('path');

function getFiles(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach(file => {
        file = path.join(dir, file);
        const stat = fs.statSync(file);
        if (stat && stat.isDirectory()) { 
            results = results.concat(getFiles(file));
        } else if (file.endsWith('.jsx')) {
            results.push(file);
        }
    });
    return results;
}

const files = getFiles('./src');

files.forEach(file => {
    let content = fs.readFileSync(file, 'utf8');
    
    const match = content.match(/import\s+{([^}]+)}\s+from\s+['"]lucide-react['"]/);
    
    const tags = [...content.matchAll(/<([A-Z][a-zA-Z0-9]+)/g)].map(m => m[1]);
    const icons = [...content.matchAll(/icon={([A-Z][a-zA-Z0-9]+)}/g)].map(m => m[1]);
    const allUsages = new Set([...tags, ...icons]);

    const imported = new Set();
    if (match) {
        match[1].split(',').map(s => s.trim()).filter(Boolean).forEach(s => imported.add(s));
    }

    const missing = [];
    allUsages.forEach(u => {
        // Skip standard React stuff
        if (u === 'Fragment' || u === 'React') return;
        
        const isImported = new RegExp(`import\\s+.*?\\b${u}\\b.*?from`).test(content);
        const isDefinedLocally = new RegExp(`(?:const|let|var|function|class)\\s+${u}\\b`).test(content);
        
        if (!imported.has(u) && !isImported && !isDefinedLocally) {
            // Is it a known component from our own files?
            // Usually components are like Button, Card, Input. Lucide icons are like Search, DoorOpen.
            // Let's assume if it's not imported at all, and not defined, it MUST be an error.
            missing.push(u);
        }
    });

    if (missing.length > 0) {
        console.log(`${file} is missing: ${missing.join(', ')}`);
        if (match) {
            missing.forEach(m => imported.add(m));
            const newImportStr = 'import { ' + Array.from(imported).join(', ') + " } from 'lucide-react';";
            content = content.replace(match[0], newImportStr);
        } else {
            // No lucide import exists, add one
            const newImportStr = `import { ${missing.join(', ')} } from 'lucide-react';\n`;
            content = newImportStr + content;
        }
        fs.writeFileSync(file, content);
        console.log(`Fixed ${file}`);
    }
});
