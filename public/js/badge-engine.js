/**
 * BadgeEngine - Gerador e Renderizador do Crachá Light / Grupo DDM
 * Renderiza em resolução gráfica de 936 x 1446 px (300+ DPI para 55x85mm)
 */
class BadgeEngine {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.width = 936;
    this.height = 1446;

    this.canvas.width = this.width;
    this.canvas.height = this.height;

    // Recursos
    this.templateImg = new Image();
    this.templateLoaded = false;

    this.defaultLogoImg = new Image();
    this.defaultLogoLoaded = false;

    this.customLogoImg = null;

    this.photoImg = null;
    this.photoCrop = {
      zoom: 1.0,
      offsetX: 0,
      offsetY: 0,
      rotation: 0
    };

    // Dados do colaborador
    this.data = {
      primeiroNome: 'Maurício',
      nomeCompleto: 'Maurício Magalhães de Oliveira',
      matricula: '4009683',
      cargo: ''
    };

    // Coordenadas da grade da Light (medidas oficiais no canvas 936x1446):
    this.specs = {
      photoArea: { x: 0, y: 0, width: 936, height: 574 },
      dividerLine: { y: 574, height: 22 },
      leftMargin: 102, // 6mm oficial da margem esquerda
      textWidthLimit: 750,

      // Posição dos textos (alinhados com as normas oficiais da Light):
      firstNameY: 745,      // Base do Primeiro Nome (Arial Bold 22)
      fullNameY: 835,       // Início do Nome Completo (Arial Bold 10)
      matriculaLabelY: 995, // "Matrícula" (Arial Bold 6)
      matriculaValueY: 1060,// Número da matrícula (Arial Bold 10)

      // Caixa da Logo Prestadora (Grupo DDM)
      logoBox: { x: 227, y: 1167, width: 480, height: 196 }
    };

    this.init();
  }

  async init() {
    const p1 = new Promise((resolve) => {
      this.templateImg.onload = () => {
        this.templateLoaded = true;
        resolve();
      };
      this.templateImg.onerror = () => {
        console.error('Falha ao carregar template base');
        resolve();
      };
      this.templateImg.src = '/assets/badge_template_clean.png';
    });

    const p2 = new Promise((resolve) => {
      this.defaultLogoImg.onload = () => {
        this.defaultLogoLoaded = true;
        resolve();
      };
      this.defaultLogoImg.onerror = () => {
        console.error('Falha ao carregar logo DDM');
        resolve();
      };
      this.defaultLogoImg.src = '/assets/logo-ddm.png';
    });

    await Promise.all([p1, p2]);
    this.render();
  }

  setPhoto(imageElement) {
    this.photoImg = imageElement;
    this.photoCrop = {
      zoom: 1.0,
      offsetX: 0,
      offsetY: 0,
      rotation: 0
    };
    this.render();
  }

  setPhotoTransform({ zoom, offsetX, offsetY, rotation }) {
    if (zoom !== undefined) this.photoCrop.zoom = zoom;
    if (offsetX !== undefined) this.photoCrop.offsetX = offsetX;
    if (offsetY !== undefined) this.photoCrop.offsetY = offsetY;
    if (rotation !== undefined) this.photoCrop.rotation = rotation;
    this.render();
  }

  setData(data) {
    this.data = { ...this.data, ...data };
    this.render();
  }

  setCustomLogo(imageElement) {
    this.customLogoImg = imageElement;
    this.render();
  }

  clearCustomLogo() {
    this.customLogoImg = null;
    this.render();
  }

  render() {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.width, this.height);

    // 1. Fundo neutro
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, this.width, this.height);

    // 2. Renderizar FOTO do colaborador na área designada (0 a 574 px)
    this.renderPhoto(ctx);

    // 3. Renderizar TEMPLATE OFICIAL da Light (fundo amarelo com marcas d'água, faixa verde e selo Light)
    if (this.templateLoaded) {
      // Como a parte da foto no template original da página 3 tem fundo transparente/branco no topo,
      // desenhamos o template preservando a foto no topo.
      // A arte amarela e a faixa verde começam exatamente em y = 574!
      ctx.drawImage(
        this.templateImg,
        0, 574, this.width, this.height - 574,
        0, 574, this.width, this.height - 574
      );
    }

    // 4. Renderizar a Logo da Prestadora (Grupo DDM ou customizada)
    this.renderLogo(ctx);

    // 5. Renderizar Textos Conforme Normas do Crachá Light
    this.renderTexts(ctx);
  }

  renderPhoto(ctx) {
    const photoBox = this.specs.photoArea;

    if (!this.photoImg) {
      // Placeholder bonito caso não haja foto carregada
      ctx.fillStyle = '#f0f4f8';
      ctx.fillRect(photoBox.x, photoBox.y, photoBox.width, photoBox.height);

      ctx.fillStyle = '#94a3b8';
      ctx.font = 'bold 36px Arial, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('ENVIE UMA FOTO 3x4', photoBox.width / 2, photoBox.height / 2 - 20);

      ctx.font = '24px Arial, sans-serif';
      ctx.fillStyle = '#64748b';
      ctx.fillText('Enquadre o rosto do colaborador', photoBox.width / 2, photoBox.height / 2 + 25);
      return;
    }

    ctx.save();
    // Clip para não vazar da área da foto
    ctx.beginPath();
    ctx.rect(photoBox.x, photoBox.y, photoBox.width, photoBox.height);
    ctx.clip();

    const img = this.photoImg;
    const { zoom, offsetX, offsetY, rotation } = this.photoCrop;

    // Dimensões da foto com ajuste cover
    const scale = Math.max(photoBox.width / img.width, photoBox.height / img.height) * zoom;
    const drawW = img.width * scale;
    const drawH = img.height * scale;

    const centerX = photoBox.width / 2 + offsetX;
    const centerY = photoBox.height / 2 + offsetY;

    ctx.translate(centerX, centerY);
    if (rotation) {
      ctx.rotate((rotation * Math.PI) / 180);
    }

    ctx.drawImage(img, -drawW / 2, -drawH / 2, drawW, drawH);
    ctx.restore();
  }

  renderLogo(ctx) {
    const logoImg = this.customLogoImg || (this.defaultLogoLoaded ? this.defaultLogoImg : null);
    if (!logoImg) return;

    const box = this.specs.logoBox;
    const padX = 28;
    const padY = 20;
    const targetW = box.width - (padX * 2);
    const targetH = box.height - (padY * 2);

    const ratio = Math.min(targetW / logoImg.width, targetH / logoImg.height);
    const finalW = logoImg.width * ratio;
    const finalH = logoImg.height * ratio;

    const posX = box.x + (box.width - finalW) / 2;
    const posY = box.y + (box.height - finalH) / 2;

    ctx.drawImage(logoImg, posX, posY, finalW, finalH);
  }

  renderTexts(ctx) {
    ctx.save();
    ctx.textAlign = 'left';
    ctx.fillStyle = '#FFFFFF'; // Branco oficial do crachá da Light

    const marginX = this.specs.leftMargin;
    const maxWidth = this.specs.textWidthLimit;

    // Sombra sutil para máxima legibilidade sobre o amarelo com marca d'água
    ctx.shadowColor = 'rgba(0, 0, 0, 0.22)';
    ctx.shadowBlur = 4;
    ctx.shadowOffsetX = 1;
    ctx.shadowOffsetY = 2;

    // 1. PRIMEIRO NOME (Nome de Crachá) - Especificação: Arial Bold 22 (com autofit se for grande)
    const primeiroNome = (this.data.primeiroNome || '').trim();
    if (primeiroNome) {
      let fontSize = 120; // tamanho base proporcional
      ctx.font = `bold ${fontSize}px Arial, "Helvetica Neue", sans-serif`;

      // Regra oficial: "Caso seja um nome muito grande podemos diminuir a fonte para caber"
      while (ctx.measureText(primeiroNome).width > maxWidth && fontSize > 50) {
        fontSize -= 4;
        ctx.font = `bold ${fontSize}px Arial, "Helvetica Neue", sans-serif`;
      }

      ctx.textBaseline = 'alphabetic';
      ctx.fillText(primeiroNome, marginX, this.specs.firstNameY);
    }

    // 2. NOME COMPLETO - Especificação: Arial Bold 10 (em até 2 linhas)
    const nomeCompleto = (this.data.nomeCompleto || '').trim();
    if (nomeCompleto) {
      const fontSize = 54;
      ctx.font = `bold ${fontSize}px Arial, "Helvetica Neue", sans-serif`;
      ctx.textBaseline = 'alphabetic';

      // Quebra inteligente em até 2 linhas
      const lines = this.wrapText(ctx, nomeCompleto, maxWidth, 2);
      let currentY = this.specs.fullNameY;
      const lineHeight = 62;

      for (const line of lines) {
        ctx.fillText(line, marginX, currentY);
        currentY += lineHeight;
      }
    }

    // 3. MATRÍCULA
    // Rótulo: "Matrícula" - Arial Bold 6 (~34px)
    ctx.font = 'bold 36px Arial, "Helvetica Neue", sans-serif';
    ctx.fillText('Matrícula', marginX, this.specs.matriculaLabelY);

    // Valor: "4009683" - Arial Bold 10 (~56px)
    const matricula = (this.data.matricula || '').trim();
    if (matricula) {
      ctx.font = 'bold 56px Arial, "Helvetica Neue", sans-serif';
      ctx.fillText(matricula, marginX, this.specs.matriculaValueY);
    }

    ctx.restore();
  }

  wrapText(ctx, text, maxWidth, maxLines = 2) {
    const words = text.split(' ');
    const lines = [];
    let currentLine = '';

    for (let i = 0; i < words.length; i++) {
      const testLine = currentLine ? `${currentLine} ${words[i]}` : words[i];
      const metrics = ctx.measureText(testLine);

      if (metrics.width > maxWidth && i > 0) {
        lines.push(currentLine);
        currentLine = words[i];
        if (lines.length === maxLines - 1) {
          // Última linha permitida: coloca o resto das palavras
          const remaining = words.slice(i).join(' ');
          // Se ainda estourar, trunca ou ajusta
          lines.push(remaining);
          return lines;
        }
      } else {
        currentLine = testLine;
      }
    }

    if (currentLine && lines.length < maxLines) {
      lines.push(currentLine);
    }

    return lines;
  }

  // Gera Blob em alta resolução para download PNG
  async toBlob(type = 'image/png', quality = 1.0) {
    return new Promise((resolve) => {
      this.canvas.toBlob((blob) => resolve(blob), type, quality);
    });
  }

  // Gera data URL em alta resolução
  toDataURL(type = 'image/png', quality = 1.0) {
    return this.canvas.toDataURL(type, quality);
  }
}

window.BadgeEngine = BadgeEngine;
