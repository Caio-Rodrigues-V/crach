# ⚡ Plataforma de Emissão de Crachás | Light & Grupo DDM

Aplicação web completa desenvolvida em **HTML5, CSS3, JavaScript e Node.js com SQLite** para geração, pré-visualização em tempo real, armazenamento e impressão de crachás oficiais de prestadores de serviço da **Light** em parceria com o **Grupo DDM**.

---

## 🚀 Recursos da Plataforma

1. **Preenchimento Automático Conforme Normas da Light:**
   - **Nome no Crachá / Primeiro Nome:** tipografia Arial Bold 22 com redução de tamanho dinâmica inteligente (autofit) caso o nome seja muito grande.
   - **Nome Completo:** tipografia Arial Bold 10 em até 2 linhas.
   - **Matrícula:** rótulo oficial "Matrícula" (Arial Bold 6) e número da matrícula (Arial Bold 10).
   - **Logo Oficial Light:** selo "A SERVIÇO DA Light" perfeitamente posicionado.
   - **Logo Oficial Grupo DDM:** centralizado com proporções perfeitas na caixa branca inferior.

2. **Upload e Enquadramento de Foto (Sem Distorção):**
   - Atende à norma do manual: *"A foto não pode ser esticada, amassada ou não dar visibilidade para o rosto do colaborador"*.
   - Upload via arrastar e soltar (drag & drop) ou seleção de arquivo.
   - Controles em tempo real de **Zoom**, **Deslocamento Horizontal (X)**, **Deslocamento Vertical (Y)** e **Rotação (90°)**.

3. **Live Preview em Tempo Real:**
   - Renderização instantânea via HTML5 Canvas em **alta resolução (936 × 1446 px @ 430 DPI)** correspondente às dimensões físicas oficiais de **55 mm × 85 mm**.

4. **Exportação e Impressão:**
   - 📥 **Download da Imagem PNG (300+ DPI)** pronta para bureaus de impressão gráfica.
   - 📄 **Download em PDF** no tamanho exato do crachá (55 mm × 85 mm).
   - 🖨️ **Impressão Direta**.

5. **Banco de Dados Integrado (SQLite):**
   - Persistência automática dos colaboradores cadastrados (`database.sqlite`).
   - Busca instantânea por nome, matrícula ou cargo.
   - Botão para recarregar qualquer colaborador no gerador com 1 clique para reemissão ou atualização.
   - Exclusão com confirmação.

---

## 📦 Como Executar

### 1. Iniciar o Servidor
No terminal, na pasta do projeto:
```bash
npm start
```
Ou:
```bash
node server.js
```

### 2. Acessar no Navegador
Abra:
```text
http://localhost:3000
```

---

## 📂 Estrutura do Projeto

```text
lightads/
├── server.js               # Servidor Express com API REST
├── database.js             # Módulo SQLite nativo com CRUD de colaboradores
├── database.sqlite         # Banco de dados local dos colaboradores
├── package.json            # Dependências e scripts
├── uploads/                # Armazenamento das fotos dos colaboradores
└── public/
    ├── index.html          # Interface web responsiva
    ├── css/
    │   └── style.css       # Estilização moderna com tema escuro e regras de impressão
    ├── js/
    │   ├── app.js          # Lógica da interface, eventos e comunicação com a API
    │   └── badge-engine.js # Motor de renderização no Canvas 936x1446 com normas da Light
    └── assets/
        ├── badge_template_clean.png  # Template base em alta resolução da página 3 do manual
        ├── logo-ddm.png              # Logotipo oficial do Grupo DDM
        └── template_page_1.png       # Exemplo de referência do manual
```
