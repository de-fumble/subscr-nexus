const fs = require('fs');
const path = require('path');
const dir = './src/pages';
const files = fs.readdirSync(dir).filter(f => f.endsWith('.tsx'));

for (const file of files) {
  const filePath = path.join(dir, file);
  let content = fs.readFileSync(filePath, 'utf8');
  
  if (content.includes('AppSidebar') && content.includes('SidebarProvider')) {
    console.log('Processing', file);
    
    // Remove AppSidebar import
    content = content.replace(/import\s+\{\s*AppSidebar\s*\}\s*from\s*['"]@\/components\/AppSidebar['"];\n?/g, '');
    
    // Some pages might have a FloatingSupport or other dialogs outside the SidebarProvider.
    // So we just replace the start and end tokens safely.
    // Start token:
    content = content.replace(/<SidebarProvider(?:[^>]*)>[\s\S]{0,300}?<AppSidebar[^>]*\/>[\s\S]{0,300}?<SidebarInset(?:[^>]*)>/m, '<>');
    
    // End tokens (usually near the bottom):
    content = content.replace(/<\/SidebarInset>[\s\S]{0,100}?<\/div>[\s\S]{0,100}?<\/SidebarProvider>/m, '</>');
    
    // Check if AppSidebar is gone
    if (!content.includes('AppSidebar') && !content.includes('SidebarProvider')) {
       // Also remove it from imports
       content = content.replace(/import\s+\{([^}]+)\}\s*from\s*['"]@\/components\/ui\/sidebar['"]/g, (match, imports) => {
           const newImports = imports.split(',').map(i => i.trim()).filter(i => !['SidebarProvider', 'SidebarInset'].includes(i)).join(', ');
           if (newImports) return `import { ${newImports} } from "@/components/ui/sidebar";`;
           return '';
       });
       fs.writeFileSync(filePath, content);
       console.log('Updated', file);
    } else {
       console.log('Failed to fully strip from', file);
    }
  }
}
