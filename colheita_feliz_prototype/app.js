// Colheita Feliz Prototype

// Estado do jogador: moedas, sementes, dólar (usd), experiência e nível
const defaultState = {
  coins: 10,
  seeds: 3,
  usd: 0,
  exp: 0,
  level: 1,
};
let state = loadState();
function loadState() {
  const saved = localStorage.getItem('cfState');
  if (!saved) return { ...defaultState };
  const parsed = JSON.parse(saved);
  // Garantir que novas propriedades existam quando se carrega estados antigos
  return { ...defaultState, ...parsed };
}
function saveState() {
  localStorage.setItem('cfState', JSON.stringify(state));
}

// Estado da fazenda: estágio, secura e praga para cada canteiro
const rows = 5;
const cols = 5;
const totalTiles = rows * cols;
// estágio: 0 vazio, 1 semente, 2 broto, 3 planta, 4 maduro
// secura: 0 (regada) a 3 (seca, morre)
// praga: boolean
let farm = loadFarm();
function loadFarm() {
  const saved = localStorage.getItem('cfFarm');
  if (saved) return JSON.parse(saved);
  const arr = [];
  for (let i = 0; i < totalTiles; i++) {
    arr.push({ stage: 0, dryness: 0, pest: false });
  }
  return arr;
}
function saveFarm() {
  localStorage.setItem('cfFarm', JSON.stringify(farm));
}

// Ganhar experiência e subir de nível quando necessário
function gainExp(amount) {
  state.exp += amount;
  // Verificar se precisa subir de nível
  while (state.exp >= state.level * 20) {
    state.exp -= state.level * 20;
    state.level += 1;
  }
  updateTopBar();
  saveState();
}

// Atualizar exibição de moedas e sementes
function updateTopBar() {
  // Atualizar números de recursos
  document.getElementById('coins-display').textContent = state.coins;
  document.getElementById('usd-display').textContent = state.usd;
  document.getElementById('seeds-display').textContent = state.seeds;
  // Atualizar nível e experiência
  document.getElementById('level').textContent = `Nv. ${state.level}`;
  const needed = state.level * 20; // experiência necessária para próximo nível
  // Atualizar texto de experiência no formato atual/necessário
  const xpText = `${state.exp}/${needed}`;
  const xpElem = document.getElementById('xp-text');
  if (xpElem) xpElem.textContent = xpText;
}

// Navegação entre telas
const screens = {
  farm: document.getElementById('farm-screen'),
  shop: document.getElementById('shop-screen'),
};
function showScreen(id) {
  Object.values(screens).forEach((el) => el.classList.add('hidden'));
  screens[id].classList.remove('hidden');
}
document.querySelectorAll('.side-btn').forEach((btn) => {
  btn.addEventListener('click', () => {
    // Alternar telas
    showScreen(btn.dataset.screen);
    // Atualizar botão ativo
    document.querySelectorAll('.side-btn').forEach((b) => b.classList.remove('active'));
    btn.classList.add('active');
  });
});

// Comprar sementes na loja
document.getElementById('buy-seed-btn').addEventListener('click', () => {
  if (state.coins > 0) {
    state.coins -= 1;
    state.seeds += 1;
    updateTopBar();
    saveState();
  } else {
    alert('Moedas insuficientes!');
  }
});

// Seleção de ação
let currentAction = 'plant';
document.querySelectorAll('.action-btn').forEach((btn) => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.action-btn').forEach((b) => b.classList.remove('active'));
    btn.classList.add('active');
    currentAction = btn.id.replace('action-', '');
  });
});

// Phaser configuration
const tileSize = 64;
let phaserGame;
function initFarm() {
  if (phaserGame) phaserGame.destroy(true);
  const config = {
    type: Phaser.AUTO,
    parent: 'farm-screen',
    width: cols * tileSize,
    height: rows * tileSize,
    backgroundColor: 'rgba(0,0,0,0)',
    scene: {
      preload: preload,
      create: create,
    },
  };
  phaserGame = new Phaser.Game(config);

  function preload() {
    // Não há assets externos para os canteiros nesta cena
  }

  function create() {
    const scene = this;
    // Criar base do grid
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const idx = r * cols + c;
        const x = c * tileSize + tileSize / 2;
        const y = r * tileSize + tileSize / 2;
        // Desenha um retângulo para o canteiro com borda verde
        // Desenhar canteiro com cores mais suaves inspiradas na terra
        const rect = scene.add.rectangle(x, y, tileSize - 4, tileSize - 4, 0x8d6e63);
        rect.setStrokeStyle(2, 0x6d4c41);
        rect.setInteractive();
        rect.on('pointerdown', () => handleTileClick(idx));
        renderTile(idx, scene);
      }
    }
  }
}

// Manter referências às sobreposições para poder removê-las
const overlayMap = {};
function renderTile(idx, scene) {
  const cell = farm[idx];
  // Remover ícone existente
  if (overlayMap[idx]) {
    overlayMap[idx].destroy();
    delete overlayMap[idx];
  }
  const col = idx % cols;
  const row = Math.floor(idx / cols);
  const x = col * tileSize + tileSize / 2;
  const y = row * tileSize + tileSize / 2;
  // Escolher ícone baseado no estágio
  let icon = '';
  if (cell.stage === 1) icon = '🌱';
  else if (cell.stage === 2) icon = '🌿';
  else if (cell.stage === 3) icon = '🌼';
  else if (cell.stage === 4) icon = '🌽';
  // Ajuste: se houver praga, substitui por ícone de inseto
  if (cell.pest) {
    icon = '🐛';
  }
  if (icon) {
    const overlay = scene.add.text(x, y - tileSize * 0.25, icon, {
      fontSize: '28px',
      color: '#4e342e',
    });
    overlay.setOrigin(0.5);
    overlay.setDepth(1);
    overlayMap[idx] = overlay;
  }
}

// Lógica de ações
function handleTileClick(idx) {
  const cell = farm[idx];
  switch (currentAction) {
    case 'plant':
      if (cell.stage === 0 && state.seeds > 0) {
        cell.stage = 1;
        cell.dryness = 0;
        cell.pest = false;
        state.seeds -= 1;
        updateTopBar();
        saveState();
        saveFarm();
        renderTile(idx, phaserGame.scene.scenes[0]);
        gainExp(1);
      }
      break;
    case 'water':
      if (cell.stage > 0 && cell.dryness > 0) {
        cell.dryness = 0;
        renderTile(idx, phaserGame.scene.scenes[0]);
        saveFarm();
        gainExp(1);
      }
      break;
    case 'remove':
      if (cell.pest) {
        cell.pest = false;
        renderTile(idx, phaserGame.scene.scenes[0]);
        saveFarm();
        gainExp(1);
      }
      break;
    case 'harvest':
      if (cell.stage >= 4) {
        cell.stage = 0;
        cell.dryness = 0;
        cell.pest = false;
        state.coins += 5;
        updateTopBar();
        saveState();
        saveFarm();
        renderTile(idx, phaserGame.scene.scenes[0]);
        // Ao colher, conceder mais experiência
        gainExp(3);
      }
      break;
  }
}

// Atualização periódica da fazenda: secura, praga e crescimento
function updateFarmState() {
  let changed = false;
  for (let i = 0; i < totalTiles; i++) {
    const cell = farm[i];
    if (cell.stage > 0) {
      // Aumentar secura
      cell.dryness += 1;
      // Se muito seca, planta morre
      if (cell.dryness >= 3) {
        cell.stage = 0;
        cell.dryness = 0;
        cell.pest = false;
        changed = true;
      } else {
        // Crescimento: se secura baixa (<2) e estágio <4
        if (cell.dryness < 2 && cell.stage < 4) {
          cell.stage += 1;
          changed = true;
        }
        // Chance de aparecer praga se secura >0
        if (!cell.pest && cell.dryness > 0 && Math.random() < 0.2) {
          cell.pest = true;
          changed = true;
        }
      }
    }
  }
  if (changed) {
    // Re-render all tiles
    const scene = phaserGame.scene.scenes[0];
    for (let i = 0; i < totalTiles; i++) {
      renderTile(i, scene);
    }
    saveFarm();
  }
}

// Inicialização
window.addEventListener('load', () => {
  updateTopBar();
  showScreen('farm');
  initFarm();
  // Atualizar fazenda a cada 20 segundos
  setInterval(updateFarmState, 20000);
});