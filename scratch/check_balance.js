
import fs from 'fs';

const content = fs.readFileSync('c:/Users/PC/Documents/ANTGV/recurra/subscr-nexus/src/pages/DashboardFailedPayments.tsx', 'utf8');

let braceCount = 0;
let parenCount = 0;
let angleCount = 0;

for (let i = 0; i < content.length; i++) {
    const char = content[i];
    if (char === '{') braceCount++;
    else if (char === '}') braceCount--;
    else if (char === '(') parenCount++;
    else if (char === ')') parenCount--;
}

console.log(`Braces: ${braceCount}`);
console.log(`Parens: ${parenCount}`);
