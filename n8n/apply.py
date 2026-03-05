import json

FILE = 'praxis_finance_workflow.json'

with open(FILE, 'r', encoding='utf-8') as f:
    data = json.load(f)

# Desativar cron
for node in data.get('nodes', []):
    if node.get('name') == 'Cron — Buscar Novos':
        node['disabled'] = True

new_nodes = [
    {
        "parameters": { "path": "finance/create-charge", "responseMode": "lastNode", "options": {} },
        "id": "webhook-create-charge",
        "name": "Webhook — Create Charge",
        "type": "n8n-nodes-base.webhook",
        "typeVersion": 1,
        "position": [-1480, 1580]
    },
    {
        "parameters": { "path": "finance/create-subscription", "responseMode": "lastNode", "options": {} },
        "id": "webhook-create-subscription",
        "name": "Webhook — Create Subscription",
        "type": "n8n-nodes-base.webhook",
        "typeVersion": 1,
        "position": [-1480, 1780]
    },
    {
        "parameters": { "path": "finance/duplicate", "responseMode": "lastNode", "options": {} },
        "id": "webhook-duplicate",
        "name": "Webhook — 2ª Via (Duplicate)",
        "type": "n8n-nodes-base.webhook",
        "typeVersion": 1,
        "position": [420, 1560]
    }
]

existing_names = [n.get('name') for n in data.get('nodes', [])]
for nn in new_nodes:
    if nn['name'] not in existing_names:
        data['nodes'].append(nn)

conns = data.get('connections', {})
if 'Webhook — Create Charge' not in conns:
    conns['Webhook — Create Charge'] = {
        "main": [[{"node": "Verificar Customer ID (Pay)", "type": "main", "index": 0}]]
    }

if 'Webhook — Create Subscription' not in conns:
    conns['Webhook — Create Subscription'] = {
        "main": [[{"node": "Verificar Customer ID (Sub)", "type": "main", "index": 0}]]
    }

if 'Webhook — 2ª Via (Duplicate)' not in conns:
    conns['Webhook — 2ª Via (Duplicate)'] = { "main": [[]] }

data['connections'] = conns

with open(FILE, 'w', encoding='utf-8') as f:
    json.dump(data, f, indent=2, ensure_ascii=False)

print("JSON gravado com sucesso via Python")
