/**
 * Aplicação Frontend da Plataforma de Crachás Light & Grupo DDM
 * Suporta execução em Node.js e cPanel / Hospedagem Estática Apache
 * Credenciais de Acesso: admin / 35349020
 */
document.addEventListener('DOMContentLoaded', () => {
  const canvas = document.getElementById('badgeCanvas');
  const badgeEngine = new BadgeEngine(canvas);

  // Elementos de Autenticação
  const loginOverlay = document.getElementById('loginOverlay');
  const loginForm = document.getElementById('loginForm');
  const loginUsername = document.getElementById('loginUsername');
  const loginPassword = document.getElementById('loginPassword');
  const btnTogglePassword = document.getElementById('btnTogglePassword');
  const loginErrorMessage = document.getElementById('loginErrorMessage');
  const btnLoginSubmit = document.getElementById('btnLoginSubmit');
  const authStatusIndicator = document.getElementById('authStatusIndicator');
  const authStatusText = document.getElementById('authStatusText');
  const btnLogout = document.getElementById('btnLogout');

  // Elementos do formulário
  const inputPrimeiroNome = document.getElementById('inputPrimeiroNome');
  const inputNomeCompleto = document.getElementById('inputNomeCompleto');
  const inputMatricula = document.getElementById('inputMatricula');
  const inputCargo = document.getElementById('inputCargo');

  // Elementos de Upload e Foto
  const photoFileInput = document.getElementById('photoFileInput');
  const dropzone = document.getElementById('photoDropzone');
  const photoControls = document.getElementById('photoControls');
  const sliderZoom = document.getElementById('sliderZoom');
  const sliderX = document.getElementById('sliderX');
  const sliderY = document.getElementById('sliderY');
  const valZoom = document.getElementById('valZoom');
  const valX = document.getElementById('valX');
  const valY = document.getElementById('valY');
  const btnRotate = document.getElementById('btnRotate');
  const btnResetPhoto = document.getElementById('btnResetPhoto');

  // Botões de Ação
  const btnSalvar = document.getElementById('btnSalvar');
  const btnDownloadPng = document.getElementById('btnDownloadPng');
  const btnDownloadPdf = document.getElementById('btnDownloadPdf');
  const btnImprimir = document.getElementById('btnImprimir');
  const btnNovo = document.getElementById('btnNovo');

  // Tabela e Busca
  const searchInput = document.getElementById('searchInput');
  const colabTableBody = document.getElementById('colabTableBody');
  const totalColabCount = document.getElementById('totalColabCount');

  // Estado Atual
  let currentEditingId = null;
  let currentPhotoRotation = 0;
  let currentPhotoSrc = null;
  let authToken = localStorage.getItem('badge_auth_token') || null;
  let isStandaloneMode = false; // true quando rodando em cPanel / sem backend Node.js

  // Credenciais Oficiais
  const CRED_USER = 'admin';
  const CRED_PASS = '35349020';

  // ================= SISTEMA DE ARMAZENAMENTO LOCAL (CPANEL) ================= //

  const LocalStorageDB = {
    KEY: 'light_ddm_colaboradores',

    getAll() {
      try {
        const raw = localStorage.getItem(this.KEY);
        if (!raw) {
          // Inicializar com exemplo do Maurício se estiver vazio
          const initial = [{
            id: 1,
            primeiro_nome: 'Maurício',
            nome_completo: 'Maurício Magalhães de Oliveira',
            matricula: '4009683',
            cargo: 'Técnico de Operações',
            foto_path: './assets/exemplo-mauricio.jpg',
            created_at: new Date().toISOString()
          }];
          localStorage.setItem(this.KEY, JSON.stringify(initial));
          return initial;
        }
        return JSON.parse(raw);
      } catch (e) {
        return [];
      }
    },

    saveAll(list) {
      localStorage.setItem(this.KEY, JSON.stringify(list));
    },

    list(busca = '') {
      const list = this.getAll();
      if (!busca || !busca.trim()) return list;
      const term = busca.trim().toLowerCase();
      return list.filter((c) =>
        (c.primeiro_nome && c.primeiro_nome.toLowerCase().includes(term)) ||
        (c.nome_completo && c.nome_completo.toLowerCase().includes(term)) ||
        (c.matricula && c.matricula.toLowerCase().includes(term)) ||
        (c.cargo && c.cargo.toLowerCase().includes(term))
      );
    },

    getById(id) {
      const list = this.getAll();
      return list.find((c) => String(c.id) === String(id));
    },

    create(data) {
      const list = this.getAll();
      const newId = list.length > 0 ? Math.max(...list.map(c => Number(c.id) || 0)) + 1 : 1;
      const novo = {
        id: newId,
        primeiro_nome: data.primeiro_nome,
        nome_completo: data.nome_completo,
        matricula: data.matricula,
        cargo: data.cargo || '',
        foto_path: data.foto_base64 || './assets/exemplo-mauricio.jpg',
        created_at: new Date().toISOString()
      };
      list.unshift(novo);
      this.saveAll(list);
      return novo;
    },

    update(id, data) {
      const list = this.getAll();
      const idx = list.findIndex((c) => String(c.id) === String(id));
      if (idx === -1) return null;

      list[idx] = {
        ...list[idx],
        primeiro_nome: data.primeiro_nome,
        nome_completo: data.nome_completo,
        matricula: data.matricula,
        cargo: data.cargo !== undefined ? data.cargo : list[idx].cargo,
        foto_path: data.foto_base64 ? data.foto_base64 : list[idx].foto_path,
        updated_at: new Date().toISOString()
      };

      this.saveAll(list);
      return list[idx];
    },

    remove(id) {
      const list = this.getAll();
      const filtered = list.filter((c) => String(c.id) !== String(id));
      this.saveAll(filtered);
      return true;
    }
  };

  // ================= SISTEMA DE AUTENTICAÇÃO HÍBRIDO ================= //

  function showLoginModal(error = null) {
    loginOverlay.classList.add('active');
    btnLogout.style.display = 'none';
    authStatusText.textContent = 'Acesso Bloqueado';
    authStatusIndicator.style.background = 'rgba(239, 68, 68, 0.15)';
    authStatusIndicator.style.borderColor = 'rgba(239, 68, 68, 0.3)';

    if (error) {
      loginErrorMessage.textContent = error;
      loginErrorMessage.style.display = 'block';
    } else {
      loginErrorMessage.style.display = 'none';
    }

    loginPassword.value = '';
    setTimeout(() => {
      if (!loginUsername.value) loginUsername.focus();
      else loginPassword.focus();
    }, 100);
  }

  function hideLoginModal(user = 'admin') {
    loginOverlay.classList.remove('active');
    btnLogout.style.display = 'inline-flex';
    authStatusText.textContent = `Conectado (${user})`;
    authStatusIndicator.style.background = 'rgba(16, 185, 129, 0.1)';
    authStatusIndicator.style.borderColor = 'rgba(16, 185, 129, 0.3)';
  }

  btnTogglePassword.addEventListener('click', () => {
    if (loginPassword.type === 'password') {
      loginPassword.type = 'text';
      btnTogglePassword.textContent = '🙈';
    } else {
      loginPassword.type = 'password';
      btnTogglePassword.textContent = '👁️';
    }
  });

  // Login
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    loginErrorMessage.style.display = 'none';
    btnLoginSubmit.disabled = true;
    btnLoginSubmit.innerHTML = '<span>Verificando...</span>';

    const username = loginUsername.value.trim();
    const password = loginPassword.value;

    // Tentar autenticar via API Node se disponível
    let authenticated = false;

    if (!isStandaloneMode) {
      try {
        const res = await fetch('./api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username, password })
        });

        if (res.ok) {
          const json = await res.json();
          if (json.success && json.token) {
            authToken = json.token;
            localStorage.setItem('badge_auth_token', authToken);
            authenticated = true;
          }
        } else if (res.status === 404 || res.status === 403 || res.status === 405) {
          // Servidor estático cPanel detectado!
          isStandaloneMode = true;
        }
      } catch (err) {
        // Sem conexão de API (cPanel estático)
        isStandaloneMode = true;
      }
    }

    // Se estiver em modo cPanel (ou API caiu)
    if (isStandaloneMode || !authenticated) {
      if (username === CRED_USER && password === CRED_PASS) {
        authToken = 'local-token-admin-' + Date.now();
        localStorage.setItem('badge_auth_token', authToken);
        authenticated = true;
      }
    }

    btnLoginSubmit.disabled = false;
    btnLoginSubmit.innerHTML = '<span>Acessar Plataforma</span> <span>➜</span>';

    if (authenticated) {
      hideLoginModal(username);
      showToast('Acesso concedido com sucesso!', 'success');
      carregarColaboradores();
    } else {
      loginErrorMessage.textContent = 'Usuário ou senha incorretos!';
      loginErrorMessage.style.display = 'block';
      loginPassword.select();
    }
  });

  // Logout
  btnLogout.addEventListener('click', () => {
    authToken = null;
    localStorage.removeItem('badge_auth_token');
    showLoginModal();
    showToast('Você saiu da plataforma.', 'info');
  });

  async function checkAuthOnStartup() {
    if (!authToken) {
      showLoginModal();
      return;
    }

    // Se tiver token salvo, checar com backend ou validar modo local
    try {
      const res = await fetch('./api/auth/check', {
        headers: { 'Authorization': `Bearer ${authToken}` }
      });
      if (res.ok) {
        const json = await res.json();
        if (json.authenticated) {
          hideLoginModal(json.user);
          carregarColaboradores();
          return;
        }
      } else if (res.status === 404 || res.status === 403) {
        isStandaloneMode = true;
      }
    } catch (e) {
      isStandaloneMode = true;
    }

    if (isStandaloneMode && authToken.startsWith('local-token-')) {
      hideLoginModal('admin');
      carregarColaboradores();
    } else {
      showLoginModal();
    }
  }

  // ================= FORMULÁRIO E RENDERIZAÇÃO ================= //

  function updateDataFromInputs() {
    badgeEngine.setData({
      primeiroNome: inputPrimeiroNome.value,
      nomeCompleto: inputNomeCompleto.value,
      matricula: inputMatricula.value,
      cargo: inputCargo.value
    });
  }

  inputNomeCompleto.addEventListener('input', () => {
    if (!inputPrimeiroNome.dataset.userEdited && inputNomeCompleto.value.trim()) {
      const parts = inputNomeCompleto.value.trim().split(' ');
      inputPrimeiroNome.value = parts[0] || '';
    }
    updateDataFromInputs();
  });

  inputPrimeiroNome.addEventListener('input', () => {
    inputPrimeiroNome.dataset.userEdited = 'true';
    updateDataFromInputs();
  });

  inputMatricula.addEventListener('input', updateDataFromInputs);
  inputCargo.addEventListener('input', updateDataFromInputs);

  // Alternador de Estilo da Logo (Caixa Branca Oficial Light vs Fundo Amarelo)
  const partnerLogoPreviewBox = document.getElementById('partnerLogoPreviewBox');
  document.querySelectorAll('input[name="logoBgOption"]').forEach((radio) => {
    radio.addEventListener('change', (e) => {
      const mode = e.target.value;
      badgeEngine.setLogoBackground(mode);
      if (partnerLogoPreviewBox) {
        partnerLogoPreviewBox.style.backgroundColor = mode === 'white' ? '#ffffff' : '#f7a600';
      }
    });
  });

  // Upload e Arrastar Foto
  dropzone.addEventListener('click', () => photoFileInput.click());

  dropzone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropzone.classList.add('dragover');
  });

  dropzone.addEventListener('dragleave', () => dropzone.classList.remove('dragover'));

  dropzone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropzone.classList.remove('dragover');
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handlePhotoFile(e.dataTransfer.files[0]);
    }
  });

  photoFileInput.addEventListener('change', (e) => {
    if (e.target.files && e.target.files[0]) {
      handlePhotoFile(e.target.files[0]);
    }
  });

  function handlePhotoFile(file) {
    if (!file.type.startsWith('image/')) {
      showToast('Envie um arquivo de imagem válido (JPG ou PNG).', 'error');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      loadPhotoFromSrc(event.target.result);
    };
    reader.readAsDataURL(file);
  }

  function loadPhotoFromSrc(src) {
    currentPhotoSrc = src;
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      badgeEngine.setPhoto(img);
      photoControls.classList.add('active');
      resetPhotoControls();
      showToast('Foto carregada com sucesso!', 'success');
    };
    img.onerror = () => {
      showToast('Erro ao carregar a imagem da foto.', 'error');
    };
    img.src = src;
  }

  function applyPhotoTransform() {
    const zoom = parseFloat(sliderZoom.value);
    const offsetX = parseInt(sliderX.value, 10);
    const offsetY = parseInt(sliderY.value, 10);

    valZoom.textContent = `${zoom.toFixed(1)}x`;
    valX.textContent = `${offsetX}px`;
    valY.textContent = `${offsetY}px`;

    badgeEngine.setPhotoTransform({
      zoom,
      offsetX,
      offsetY,
      rotation: currentPhotoRotation
    });
  }

  sliderZoom.addEventListener('input', applyPhotoTransform);
  sliderX.addEventListener('input', applyPhotoTransform);
  sliderY.addEventListener('input', applyPhotoTransform);

  btnRotate.addEventListener('click', () => {
    currentPhotoRotation = (currentPhotoRotation + 90) % 360;
    applyPhotoTransform();
  });

  function resetPhotoControls() {
    sliderZoom.value = 1.0;
    sliderX.value = 0;
    sliderY.value = 0;
    currentPhotoRotation = 0;
    applyPhotoTransform();
  }

  btnResetPhoto.addEventListener('click', resetPhotoControls);

  // ================= AÇÕES DO BANCO DE DADOS ================= //

  btnSalvar.addEventListener('click', async () => {
    const primeiroNome = inputPrimeiroNome.value.trim();
    const nomeCompleto = inputNomeCompleto.value.trim();
    const matricula = inputMatricula.value.trim();
    const cargo = inputCargo.value.trim();

    if (!primeiroNome || !matricula) {
      showToast('Preencha pelo menos o Primeiro Nome e a Matrícula!', 'error');
      return;
    }

    btnSalvar.disabled = true;
    btnSalvar.innerHTML = '<i>⏳</i> Salvando...';

    const payload = {
      primeiro_nome: primeiroNome,
      nome_completo: nomeCompleto || primeiroNome,
      matricula,
      cargo,
      foto_base64: currentPhotoSrc || ''
    };

    try {
      if (isStandaloneMode) {
        if (currentEditingId) {
          LocalStorageDB.update(currentEditingId, payload);
          showToast('Colaborador atualizado no banco com sucesso!', 'success');
        } else {
          LocalStorageDB.create(payload);
          showToast('Colaborador salvo no banco com sucesso!', 'success');
        }
        carregarColaboradores();
      } else {
        let url = './api/colaboradores';
        let method = 'POST';

        if (currentEditingId) {
          url = `./api/colaboradores/${currentEditingId}`;
          method = 'PUT';
        }

        const res = await fetch(url, {
          method,
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authToken}`
          },
          body: JSON.stringify(payload)
        });

        if (res.ok) {
          showToast(currentEditingId ? 'Colaborador atualizado!' : 'Colaborador salvo!', 'success');
          carregarColaboradores();
        } else {
          // Fallback para banco local
          if (currentEditingId) LocalStorageDB.update(currentEditingId, payload);
          else LocalStorageDB.create(payload);
          showToast('Colaborador salvo no banco de dados local!', 'success');
          carregarColaboradores();
        }
      }
    } catch (err) {
      // Em caso de falha de rede ou cPanel
      if (currentEditingId) LocalStorageDB.update(currentEditingId, payload);
      else LocalStorageDB.create(payload);
      showToast('Colaborador salvo no banco de dados local!', 'success');
      carregarColaboradores();
    } finally {
      btnSalvar.disabled = false;
      btnSalvar.innerHTML = '<i>💾</i> Salvar no Banco';
    }
  });

  // Download da Imagem PNG (300 DPI)
  btnDownloadPng.addEventListener('click', () => {
    const nome = (inputPrimeiroNome.value || 'cracha').trim().toLowerCase().replace(/\s+/g, '_');
    const matricula = (inputMatricula.value || '').trim();
    const fileName = `cracha_light_${nome}_${matricula || 'ddm'}.png`;

    const dataUrl = badgeEngine.toDataURL('image/png', 1.0);
    const link = document.createElement('a');
    link.download = fileName;
    link.href = dataUrl;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Crachá em alta resolução baixado!', 'success');
  });

  // Download PDF (55x85mm)
  btnDownloadPdf.addEventListener('click', () => {
    const dataUrl = badgeEngine.toDataURL('image/png', 1.0);
    const nome = (inputPrimeiroNome.value || 'cracha').trim().toLowerCase().replace(/\s+/g, '_');
    const matricula = (inputMatricula.value || '').trim();
    const fileName = `cracha_light_${nome}_${matricula || 'ddm'}.pdf`;

    if (window.jspdf && window.jspdf.jsPDF) {
      const { jsPDF } = window.jspdf;
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: [55, 85]
      });

      doc.addImage(dataUrl, 'PNG', 0, 0, 55, 85, undefined, 'FAST');
      doc.save(fileName);
      showToast('PDF do crachá gerado com sucesso!', 'success');
    } else {
      window.print();
    }
  });

  btnImprimir.addEventListener('click', () => {
    window.print();
  });

  btnNovo.addEventListener('click', () => {
    currentEditingId = null;
    currentPhotoSrc = null;
    delete inputPrimeiroNome.dataset.userEdited;

    inputPrimeiroNome.value = '';
    inputNomeCompleto.value = '';
    inputMatricula.value = '';
    inputCargo.value = '';

    badgeEngine.setData({
      primeiroNome: '',
      nomeCompleto: '',
      matricula: '',
      cargo: ''
    });

    badgeEngine.setPhoto(null);
    photoControls.classList.remove('active');
    photoFileInput.value = '';
    showToast('Pronto para cadastrar um novo colaborador.', 'info');
  });

  // Carregar lista de colaboradores
  async function carregarColaboradores(busca = '') {
    if (!authToken) return;

    if (isStandaloneMode) {
      const lista = LocalStorageDB.list(busca);
      renderTabelaColaboradores(lista);
      return;
    }

    try {
      const url = busca ? `./api/colaboradores?busca=${encodeURIComponent(busca)}` : './api/colaboradores';
      const res = await fetch(url, {
        headers: { 'Authorization': `Bearer ${authToken}` }
      });

      if (res.ok) {
        const json = await res.json();
        if (json.success) {
          renderTabelaColaboradores(json.data);
          return;
        }
      }
      // Se não respondeu com sucesso, carregar do local
      isStandaloneMode = true;
      const lista = LocalStorageDB.list(busca);
      renderTabelaColaboradores(lista);
    } catch (err) {
      isStandaloneMode = true;
      const lista = LocalStorageDB.list(busca);
      renderTabelaColaboradores(lista);
    }
  }

  function renderTabelaColaboradores(lista) {
    totalColabCount.textContent = lista ? lista.length : 0;

    if (!lista || lista.length === 0) {
      colabTableBody.innerHTML = `
        <tr>
          <td colspan="5" class="empty-state">
            <div class="empty-state-icon">📋</div>
            <div>Nenhum colaborador encontrado no banco de dados.</div>
            <div style="font-size: 0.8rem; margin-top: 0.25rem;">Preencha os dados acima e clique em "Salvar no Banco".</div>
          </td>
        </tr>
      `;
      return;
    }

    colabTableBody.innerHTML = lista.map((c) => `
      <tr data-id="${c.id}">
        <td style="width: 60px;">
          <img src="${c.foto_path || './assets/badge_template_clean.png'}"
               alt="${escapeHtml(c.primeiro_nome)}"
               class="avatar-mini"
               onerror="this.src='./assets/badge_template_clean.png'">
        </td>
        <td>
          <span class="colab-badge-name">${escapeHtml(c.primeiro_nome)}</span>
          <span class="colab-name-cell">${escapeHtml(c.nome_completo)}</span>
        </td>
        <td>
          <span class="colab-matricula-badge">${escapeHtml(c.matricula)}</span>
        </td>
        <td>
          <span style="color: var(--text-muted);">${escapeHtml(c.cargo || '—')}</span>
        </td>
        <td style="text-align: right;">
          <div class="table-actions" style="justify-content: flex-end;">
            <button class="btn-icon btn-load" title="Carregar no Crachá" data-id="${c.id}">
              ✏️ Editar
            </button>
            <button class="btn-icon delete btn-delete" title="Excluir" data-id="${c.id}">
              🗑️
            </button>
          </div>
        </td>
      </tr>
    `).join('');

    colabTableBody.querySelectorAll('.btn-load').forEach((btn) => {
      btn.addEventListener('click', () => carregarColaboradorNoForm(btn.dataset.id));
    });

    colabTableBody.querySelectorAll('.btn-delete').forEach((btn) => {
      btn.addEventListener('click', () => excluirColaborador(btn.dataset.id));
    });
  }

  async function carregarColaboradorNoForm(id) {
    let c = null;

    if (isStandaloneMode) {
      c = LocalStorageDB.getById(id);
    } else {
      try {
        const res = await fetch(`./api/colaboradores/${id}`, {
          headers: { 'Authorization': `Bearer ${authToken}` }
        });
        const json = await res.json();
        if (json.success && json.data) c = json.data;
      } catch (e) {
        c = LocalStorageDB.getById(id);
      }
    }

    if (!c) {
      showToast('Colaborador não encontrado.', 'error');
      return;
    }

    currentEditingId = c.id;
    inputPrimeiroNome.value = c.primeiro_nome;
    inputPrimeiroNome.dataset.userEdited = 'true';
    inputNomeCompleto.value = c.nome_completo;
    inputMatricula.value = c.matricula;
    inputCargo.value = c.cargo || '';

    updateDataFromInputs();

    if (c.foto_path) {
      loadPhotoFromSrc(c.foto_path);
    } else {
      badgeEngine.setPhoto(null);
      photoControls.classList.remove('active');
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });
    showToast(`Colaborador "${c.primeiro_nome}" carregado no gerador!`, 'info');
  }

  async function excluirColaborador(id) {
    if (!confirm('Deseja realmente excluir este colaborador do banco de dados?')) return;

    if (isStandaloneMode) {
      LocalStorageDB.remove(id);
      showToast('Colaborador removido com sucesso.', 'info');
      if (currentEditingId == id) currentEditingId = null;
      carregarColaboradores(searchInput.value);
      return;
    }

    try {
      const res = await fetch(`./api/colaboradores/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${authToken}` }
      });
      if (res.ok) {
        showToast('Colaborador removido com sucesso.', 'info');
      } else {
        LocalStorageDB.remove(id);
        showToast('Colaborador removido do banco local.', 'info');
      }
    } catch (err) {
      LocalStorageDB.remove(id);
      showToast('Colaborador removido do banco local.', 'info');
    }

    if (currentEditingId == id) currentEditingId = null;
    carregarColaboradores(searchInput.value);
  }

  let searchTimeout;
  searchInput.addEventListener('input', () => {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
      carregarColaboradores(searchInput.value);
    }, 250);
  });

  function showToast(message, type = 'info') {
    let container = document.querySelector('.toast-container');
    if (!container) {
      container = document.createElement('div');
      container.className = 'toast-container';
      document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    const icon = type === 'success' ? '✅' : type === 'error' ? '⚠️' : 'ℹ️';
    toast.innerHTML = `<span>${icon}</span><span>${message}</span>`;
    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(100%)';
      toast.style.transition = 'all 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 3500);
  }

  function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>"']/g, (m) => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    }[m]));
  }

  // Inicialização
  updateDataFromInputs();
  loadPhotoFromSrc('./assets/exemplo-mauricio.jpg');
  checkAuthOnStartup();
});
