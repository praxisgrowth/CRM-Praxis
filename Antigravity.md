# Antigravity Protocol: n8n Workflow Development

Este arquivo define o protocolo para a criação de fluxos de trabalho do n8n (workflows) de alta qualidade neste projeto, utilizando o servidor MCP e as Skills especializadas.

## 🛠 Ferramentas e Recursos

- **n8n MCP Server**: [czlonkowski/n8n-mcp](https://github.com/czlonkowski/n8n-mcp)
  - Fornece ferramentas para gerenciar e criar itens no n8n.
- **n8n Skills**: [czlonkowski/n8n-skills](https://github.com/czlonkowski/n8n-skills)
  - Conjunto de instruções para garantir sintaxe de expressão correta, padrões de workflow e validação.

## 📋 Estratégia de Desenvolvimento

Sempre que uma tarefa envolver a criação ou modificação de um workflow no n8n, siga estes passos:

1.  **Definição de Requisitos**: Entenda o objetivo do fluxo, os gatilhos (triggers) e as ações necessárias.
2.  **Design do Workflow**: Use as skills de `Workflow Patterns` para desenhar a estrutura lógica.
3.  **Configuração de Nós**: Aplique a skill de `Node Configuration` e `Expression Syntax` para garantir que cada nó esteja configurado com precisão.
4.  **Implementação via MCP**: Utilize as ferramentas do `n8n-mcp` para criar o workflow na instância do usuário.
5.  **Validação**: Use a skill de `Validation Expert` para verificar possíveis erros antes da ativação.

## 💡 Diretrizes para o Usuário

- Para iniciar um novo fluxo, basta descrever o que você precisa: _"Crie um workflow que receba leads de um webhook e salve no meu banco de dados comercial."_
- O assistente usará automaticamente as ferramentas n8n configuradas para realizar a tarefa.

---

_Este protocolo garante consistência e qualidade técnica em todas as automações deste projeto._
