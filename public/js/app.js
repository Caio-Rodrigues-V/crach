/**
 * Aplicação Frontend da Plataforma de Crachás Light & Grupo DDM
 */
document.addEventListener('DOMContentLoaded', () => {
  const canvas = document.getElementById('badgeCanvas');
  const badgeEngine = new BadgeEngine(canvas);

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

  // 1. Ouvintes de entrada de texto (atualização em tempo real)
  function updateDataFromInputs() {
    badgeEngine.setData({
      primeiroNome: inputPrimeiroNome.value,
      nomeCompleto: inputNomeCompleto.value,
      matricula: inputMatricula.value,
      cargo: inputCargo.value
    });
  }

  // Preencher automaticamente o primeiro nome ao digitar o nome completo se estiver vazio
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

  // 2. Manipulação de Arquivos e Fotos (Drag & Drop + Input File)
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
      showToast('Por favor envie um arquivo de imagem válido (JPG ou PNG).', 'error');
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

  // Controles de ajuste fino da foto (Zoom / Pan / Giro)
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

  // 3. Salvar no Banco de Dados
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

    try {
      const payload = {
        primeiro_nome: primeiroNome,
        nome_completo: nomeCompleto || primeiroNome,
        matricula,
        cargo,
        foto_base64: currentPhotoSrc || ''
      };

      let url = '/api/colaboradores';
      let method = 'POST';

      if (currentEditingId) {
        url = `/api/colaboradores/${currentEditingId}`;
        method = 'PUT';
      }

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const json = await res.json();

      if (json.success) {
        showToast(currentEditingId ? 'Colaborador atualizado com sucesso!' : 'Colaborador salvo no banco de dados!', 'success');
        carregarColaboradores();
      } else {
        showToast(json.error || 'Erro ao salvar colaborador', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Erro de comunicação com o servidor.', 'error');
    } finally {
      btnSalvar.disabled = false;
      btnSalvar.innerHTML = '<i>💾</i> Salvar no Banco';
    }
  });

  // 4. Download da Imagem em Alta Resolução (PNG 300 DPI)
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
    showToast('Crachá em alta resolução baixado com sucesso!', 'success');
  });

  // 5. Download em PDF (tamanho exato 55mm x 85mm)
  btnDownloadPdf.addEventListener('click', () => {
    const dataUrl = badgeEngine.toDataURL('image/png', 1.0);
    const nome = (inputPrimeiroNome.value || 'cracha').trim().toLowerCase().replace(/\s+/g, '_');
    const matricula = (inputMatricula.value || '').trim();
    const fileName = `cracha_light_${nome}_${matricula || 'ddm'}.pdf`;

    if (window.jspdf && window.jspdf.jsPDF) {
      const { jsPDF } = window.jspdf;
      // Dimensão padrão oficial de crachá: 55 mm largura x 85 mm altura
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: [55, 85]
      });

      doc.addImage(dataUrl, 'PNG', 0, 0, 55, 85, undefined, 'FAST');
      doc.save(fileName);
      showToast('PDF do crachá gerado com sucesso!', 'success');
    } else {
      // Fallback para impressão/salvamento do navegador
      window.print();
    }
  });

  // 6. Impressão Direta
  btnImprimir.addEventListener('click', () => {
    window.print();
  });

  // 7. Limpar / Novo Crachá
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

  // 8. Carregar lista de colaboradores do banco
  async function carregarColaboradores(busca = '') {
    try {
      const url = busca ? `/api/colaboradores?busca=${encodeURIComponent(busca)}` : '/api/colaboradores';
      const res = await fetch(url);
      const json = await res.json();

      if (json.success) {
        renderTabelaColaboradores(json.data);
      }
    } catch (err) {
      console.error('Falha ao carregar lista de colaboradores:', err);
    }
  }

  function renderTabelaColaboradores(lista) {
    totalColabCount.textContent = lista.length;

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
          <img src="${c.foto_path || '/assets/badge_template_clean.png'}"
               alt="${escapeHtml(c.primeiro_nome)}"
               class="avatar-mini"
               onerror="this.src='/assets/badge_template_clean.png'">
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

    // Adicionar eventos aos botões da tabela
    colabTableBody.querySelectorAll('.btn-load').forEach((btn) => {
      btn.addEventListener('click', () => carregarColaboradorNoForm(btn.dataset.id));
    });

    colabTableBody.querySelectorAll('.btn-delete').forEach((btn) => {
      btn.addEventListener('click', () => excluirColaborador(btn.dataset.id));
    });
  }

  // Carregar dados de um colaborador existente para edição/geração
  async function carregarColaboradorNoForm(id) {
    try {
      const res = await fetch(`/api/colaboradores/${id}`);
      const json = await res.json();
      if (!json.success || !json.data) return;

      const c = json.data;
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
    } catch (err) {
      showToast('Erro ao carregar dados do colaborador.', 'error');
    }
  }

  // Excluir colaborador
  async function excluirColaborador(id) {
    if (!confirm('Deseja realmente excluir este colaborador do banco de dados?')) return;

    try {
      const res = await fetch(`/api/colaboradores/${id}`, { method: 'DELETE' });
      const json = await res.json();
      if (json.success) {
        showToast('Colaborador removido com sucesso.', 'info');
        if (currentEditingId == id) {
          currentEditingId = null;
        }
        carregarColaboradores(searchInput.value);
      }
    } catch (err) {
      showToast('Erro ao excluir colaborador.', 'error');
    }
  }

  // Busca instantânea
  let searchTimeout;
  searchInput.addEventListener('input', () => {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
      carregarColaboradores(searchInput.value);
    }, 250);
  });

  // Função Toast
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

  // Iniciar carregando a lista do banco e a foto de exemplo
  carregarColaboradores();
  updateDataFromInputs();
  loadPhotoFromSrc('/uploads/exemplo-mauricio.jpg');
});
