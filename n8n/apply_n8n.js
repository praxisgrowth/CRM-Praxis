const fs = require('fs');
const filepath = 'praxis_finance_workflow.json';

try {
  let data = JSON.parse(fs.readFileSync(filepath, 'utf8'));

  // 1. Desativar Cron
  const cronNode = data.nodes.find(n => n.name === 'Cron — Buscar Novos');
  if (cronNode) cronNode.disabled = true;

  // 2. Add novos nodes Webhook
  const newNodes = [
    {
      parameters: { path: 'finance/create-charge', responseMode: 'lastNode', options: {} },
      id: 'webhook-create-charge',
      name: 'Webhook — Create Charge',
      type: 'n8n-nodes-base.webhook',
      typeVersion: 1,
      position: [-1480, 1580]
    },
    {
      parameters: { path: 'finance/create-subscription', responseMode: 'lastNode', options: {} },
      id: 'webhook-create-subscription',
      name: 'Webhook — Create Subscription',
      type: 'n8n-nodes-base.webhook',
      typeVersion: 1,
      position: [-1480, 1780]
    },
    {
      parameters: { path: 'finance/duplicate', responseMode: 'lastNode', options: {} },
      id: 'webhook-duplicate',
      name: 'Webhook — 2ª Via (Duplicate)',
      type: 'n8n-nodes-base.webhook',
      typeVersion: 1,
      position: [420, 1560]
    }
  ];

  // Filtra pra não duplicar caso já exista
  const nodeNames = data.nodes.map(n => n.name);
  newNodes.forEach(nn => {
    if (!nodeNames.includes(nn.name)) {
      data.nodes.push(nn);
    }
  });

  // 3. Adicionar Conexões
  if (!data.connections['Webhook — Create Charge']) {
    data.connections['Webhook — Create Charge'] = {
      main: [[{ node: 'Verificar Customer ID (Pay)', type: 'main', index: 0 }]]
    };
  }
  if (!data.connections['Webhook — Create Subscription']) {
    data.connections['Webhook — Create Subscription'] = {
      main: [[{ node: 'Verificar Customer ID (Sub)', type: 'main', index: 0 }]]
    };
  }
  if (!data.connections['Webhook — 2ª Via (Duplicate)']) {
    data.connections['Webhook — 2ª Via (Duplicate)'] = {
      main: [[]] // Deixamos sem conexão apenas pra entrar no canvas
    };
  }

  fs.writeFileSync(filepath, JSON.stringify(data, null, 2));
  console.log("SUCESSO: JSON do n8n atualizado com sucesso.");
} catch (e) {
  console.error("ERRO:", e.message);
}
