# Simulador de Atendimento (Chat Simulator)

O Simulador de Atendimento é uma plataforma web interativa desenvolvida para treinar e avaliar colaboradores em cenários de atendimento ao cliente via chat. O sistema utiliza uma árvore de decisões para simular conversas reais, medindo a assertividade, o tempo de atendimento e promovendo o progresso através de níveis de dificuldade.

## 🚀 Funcionalidades Principais

### 1. Painel do Colaborador (Área de Treinamento)
- **Autenticação Simples:** Login através de Matrícula e Código de Identificação gerado pelo administrador.
- **Simulador de Chat:** Interface amigável que simula a tela de um software de atendimento. As mensagens do "cliente" aparecem na tela, e o colaborador deve escolher a melhor resposta entre as opções disponíveis.
- **Progressão por Nível (Gamificação):** Os cenários são divididos em três dificuldades (Fácil, Médio e Difícil). Um colaborador só consegue desbloquear os cenários de nível Médio após atingir **80% de assertividade** em todos os cenários Fáceis daquela categoria, e assim por diante.
- **Métricas em Tempo Real:** 
  - **TMA (Tempo Médio de Atendimento):** Cronômetro inteligente que roda durante o atendimento enquanto o cliente e colaborador estão interagindo. Simulando o tempo real entre a mensagem do cliente, a leitura das opção até a escolha da últma  resposta.
  - **Assertividade:** Cada decisão correta soma pontos. No final do atendimento, é calculada a porcentagem de acertos.
- **Feedback Automático:** Tela final de resultados que mostra a % de acerto, tempo gasto, proporção de decisões (ex: 4/5) e um feedback textual (Excelente, Bom, Regular, Precisa Melhorar).
- **Sistema de Dicas:** O colaborador pode usar o botão de dica (ícone de lâmpada) para receber uma orientação em cenários mais complexos.

### 2. Painel Administrativo (Controle Total)
- **Acesso Restrito:** Protegido por senha para garantir que apenas supervisores acessem as configurações. (O método de autenticação atual é temporária para testes)
- **Dashboard Resumo:** Cartões visuais exibindo o total de Categorias, Cenários, Decisões mapeadas e Colaboradores cadastrados no banco.
- **Gerenciador de Cenários e Categorias:**
  - Cadastro de novas categorias de atendimento (ex: Financeiro, Câmeras, Conexão).
  - Criação de cenários configurando: Nome do cliente fictício, URL do avatar, Categoria, Nível de Dificuldade e Dica associada.
- **Construtor Visual de Fluxo (Árvore de Decisão):**
  - Criação ilimitada de "Passos" (falas do cliente) e "Opções" (respostas do colaborador).
  - Cada resposta pode ser configurada com uma pontuação e vinculada diretamente a qual "Passo" ela levará a conversa a seguir.
- **Gerenciador de Colaboradores:**
  - Adição de novos colaboradores (geração automática da credencial no formato `PrimeiroNome+Matricula`, ex: `Matheus123`).
  - Campo de busca instantânea para filtrar a tabela de colaboradores por nome ou matrícula.
  - **Relatório de Desempenho (Analytics):** Geração de relatórios individuais na própria tabela, mostrando o desempenho daquele colaborador em cada cenário já jogado (Nível, Assertividade Máxima, Acertos vs Total de Decisões, TMA atingido, Status de Aprovação e total de tentativas).
- **Ferramentas de Backup:** Opções de 1 clique para exportar (baixar) ou importar todo o banco de dados em formato `.json`.

## 🛠️ Tecnologias Utilizadas

- **Frontend:** HTML5, CSS3 (Vanilla / Sem frameworks para máxima performance e personalização nativa), JavaScript (ES6+).
- **Ícones:** Phosphor Icons.
- **Banco de Dados (Backend as a Service):** Firebase Realtime Database. As métricas, cadastros de funcionários, árvores de decisões e resultados ficam armazenados na nuvem e são processados em tempo real (Realtime Sync).
- **Design:** Focado em UI/UX moderna, com micro-interações, cores semânticas de feedback (verde/vermelho) e Layout responsivo para uso em Desktop.

## 📦 Estrutura de Pastas e Arquivos Chave

- `index.html` / `welcome.js`: Tela inicial e lógica de autenticação (roteamento para admin ou simulador).
- `simulator.html` / `script.js` / `style.css`: O núcleo do simulador de chat. Contém o motor de renderização da árvore de decisão e lógica de bloqueio de níveis.
- `admin.html` / `admin.js` / `admin.css`: O painel administrativo inteiro. Gerencia chamadas de escrita/leitura profunda no banco (CRUD) e renderização do dashboard/relatórios.
- `db.js`: Camada de abstração do Firebase. Concentra todas as funções que "conversam" com a nuvem (salvar resultados, buscar cenários, importar dados, etc).

## 🔒 Regras de Negócio e Pontos de Atenção

- **Administradores não são bloqueados:** O sistema entende o perfil `admin` e libera todos os cadeados e níveis no simulador para fins de teste. Somente as credenciais do tipo `colaborador` sofrem bloqueio de níveis.
- **O TMA reflete o tempo operacional:** O cronômetro é construído para ser justo com o tempo médio de atendimento, simulando o tempo que ele gasta lendo as opções como se estivesse escrevendo-as.
- **Melhor Tentativa:** O relatório de desempenho e a lógica de bloqueio sempre respeitarão a **maior nota** (melhor assertividade) que o usuário conseguiu naquele cenário.