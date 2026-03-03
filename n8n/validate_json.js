const fs = require('fs');
const path = 'c:/Users/gusta/Documents/Antigravity/CRM Praxis/n8n/praxis_finance_workflow.json';

try {
    const content = fs.readFileSync(path, 'utf8');
    JSON.parse(content);
    console.log('JSON is valid');
} catch (e) {
    console.error('JSON is invalid:', e.message);
    const lines = fs.readFileSync(path, 'utf8').split('\n');
    const match = e.message.match(/at position (\d+)/);
    if (match) {
        const pos = parseInt(match[1]);
        console.log('Error around position:', pos);
        console.log('Excerpt:', fs.readFileSync(path, 'utf8').substring(pos - 20, pos + 20));
    }
}
