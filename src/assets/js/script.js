const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');
const nextCanvas = document.getElementById('next-canvas');
const nextCtx = nextCanvas.getContext('2d');
const holdCanvas = document.getElementById('hold-canvas');
const holdCtx = holdCanvas.getContext('2d');
const scoreEl = document.getElementById('score');
const levelEl = document.getElementById('level');
const titleScreen = document.getElementById('title-screen');
const startButton = document.getElementById('start-button');
const gameContainer = document.querySelector('.game-container');
const gameOverScreen = document.getElementById('game-over-screen');
const retryButton = document.getElementById('retry-button');
const finalScoreEl = document.getElementById('final-score');

const COLS = 10, ROWS = 20, BLOCK = 30;
let board, score, level;
let dropCounter, dropInterval;
let lastTime;
let currentPiece, nextPieces, holdPiece, canHold;
let particles = [];
let ghosts = true;
let paused = false, gameStarted = false, gameOver = false;
let mobileControlsRegistered = false;
let isClearing = false;    // 行消去の待機中フラグ

// Particle for line clear effect
class Particle {
  constructor(x, y, color) {
    this.x = x;
    this.y = y;
    this.vx = (Math.random() * 2 - 1) * 2;
    this.vy = (Math.random() * -3 - 1);
    this.alpha = 1;
    this.color = color;
  }
  update() {
    this.x += this.vx;
    this.y += this.vy;
    this.vy += 0.1;
    this.alpha = Math.max(0, this.alpha - 0.02);
  }
  draw() {
    ctx.save();
    ctx.globalAlpha = this.alpha;
    ctx.fillStyle = this.color;
    ctx.fillRect(this.x, this.y, 4, 4);
    ctx.restore();
  }
}

// Block ID to type mapping
const idToType = {1:'I',2:'J',3:'L',4:'O',5:'S',6:'T',7:'Z'};

// 7種類のミノID
const TETROMINO_TYPES = ['I','J','L','O','S','T','Z'];
// 7-バッグ用の配列
let bag = [];

// Standard colors
const colors = { I:'#00FFFF', J:'#0000FF', L:'#FFA500', O:'#FFFF00', S:'#00FF00', T:'#800080', Z:'#FF0000' };

// Tetromino definitions: 4 rotation states each
const PIECES = {
  I: [
    [[0,0,0,0],[1,1,1,1],[0,0,0,0],[0,0,0,0]],
    [[0,0,1,0],[0,0,1,0],[0,0,1,0],[0,0,1,0]],
    [[0,0,0,0],[0,0,0,0],[1,1,1,1],[0,0,0,0]],
    [[0,1,0,0],[0,1,0,0],[0,1,0,0],[0,1,0,0]]
  ],
  J: [
    [[2,0,0],[2,2,2],[0,0,0]],
    [[0,2,2],[0,2,0],[0,2,0]],
    [[0,0,0],[2,2,2],[0,0,2]],
    [[0,2,0],[0,2,0],[2,2,0]]
  ],
  L: [
    [[0,0,3],[3,3,3],[0,0,0]],
    [[0,3,0],[0,3,0],[0,3,3]],
    [[0,0,0],[3,3,3],[3,0,0]],
    [[3,3,0],[0,3,0],[0,3,0]]
  ],
  O: [
    [[4,4],[4,4]],
    [[4,4],[4,4]],
    [[4,4],[4,4]],
    [[4,4],[4,4]]
  ],
  S: [
    [[0,5,5],[5,5,0],[0,0,0]],
    [[0,5,0],[0,5,5],[0,0,5]],
    [[0,0,0],[0,5,5],[5,5,0]],
    [[5,0,0],[5,5,0],[0,5,0]]
  ],
  T: [
    [[0,6,0],[6,6,6],[0,0,0]],
    [[0,6,0],[0,6,6],[0,6,0]],
    [[0,0,0],[6,6,6],[0,6,0]],
    [[0,6,0],[6,6,0],[0,6,0]]
  ],
  Z: [
    [[7,7,0],[0,7,7],[0,0,0]],
    [[0,0,7],[0,7,7],[0,7,0]],
    [[0,0,0],[7,7,0],[0,7,7]],
    [[0,7,0],[7,7,0],[7,0,0]]
  ]
};

// SRS wall kick data
const kicks = {
  I: {
    '0>1': [[0,0],[-2,0],[1,0],[-2,1],[1,-2]],
    '1>0': [[0,0],[2,0],[-1,0],[2,-1],[-1,2]],
    '1>2': [[0,0],[-1,0],[2,0],[-1,-2],[2,1]],
    '2>1': [[0,0],[1,0],[-2,0],[1,2],[-2,-1]],
    '2>3': [[0,0],[2,0],[-1,0],[2,-1],[-1,2]],
    '3>2': [[0,0],[-2,0],[1,0],[-2,1],[1,-2]],
    '3>0': [[0,0],[1,0],[-2,0],[1,2],[-2,-1]],
    '0>3': [[0,0],[-1,0],[2,0],[-1,-2],[2,1]]
  },
  JLSTZ: {
    '0>1': [[0,0],[-1,0],[-1,1],[0,-2],[-1,-2]],
    '1>0': [[0,0],[1,0],[1,-1],[0,2],[1,2]],
    '1>2': [[0,0],[1,0],[1,-1],[0,2],[1,2]],
    '2>1': [[0,0],[-1,0],[-1,1],[0,-2],[-1,-2]],
    '2>3': [[0,0],[1,0],[1,1],[0,-2],[1,-2]],
    '3>2': [[0,0],[-1,0],[-1,-1],[0,2],[-1,2]],
    '3>0': [[0,0],[-1,0],[-1,-1],[0,2],[-1,2]],
    '0>3': [[0,0],[1,0],[1,1],[0,-2],[1,-2]]
  }
};

const sounds = {
  move:       document.getElementById('sound-move'),
  rotate:     document.getElementById('sound-rotate'),
  'soft-drop':document.getElementById('sound-soft-drop'),
  'hard-drop':document.getElementById('sound-hard-drop'),
  hold:       document.getElementById('sound-hold'),
  clear:      document.getElementById('sound-clear'),
  gameover:   document.getElementById('sound-gameover'),
  click:      document.getElementById('sound-click'),
};
function playSound(key) {
  const s = sounds[key];
  if (!s) return;
  s.currentTime = 0;
  s.play();
}

function createMatrix(w, h) {
  return Array.from({ length: h }, () => Array(w).fill(0));
}

function addHoldAction(el, action, initialDelay = 500, interval = 100) {
  let startTimer = null, repeatTimer = null;
  const onPointerDown = (e) => {
    // タッチ時のブラウザスクロール等を抑制
    e.preventDefault();
    el.classList.add('pressed');
    action();
    startTimer = setTimeout(() => {
      repeatTimer = setInterval(action, interval);
    }, initialDelay);
  };
  const onPointerUpOrLeave = () => {
    clearTimeout(startTimer);
    clearInterval(repeatTimer);
    el.classList.remove('pressed');
  };
  // Pointer Events でまとめて
  el.addEventListener('pointerdown', onPointerDown, { passive: false });
  el.addEventListener('pointerup',   onPointerUpOrLeave);
  el.addEventListener('pointerleave', onPointerUpOrLeave);
}

function initGame() {
  gameOver = false;
  paused   = false;

  board = createMatrix(COLS, ROWS);
  score = 0;
  level = 1;
  dropCounter  = 0;
  dropInterval = 1000;
  lastTime     = 0;
  nextPieces   = [];
  holdPiece    = null;
  canHold      = true;
  particles    = [];
  scoreEl.textContent = score;
  levelEl.textContent = level;
}

function startGame(){
  const isMobile = document.getElementById('mobile-mode-checkbox').checked;
  if (isMobile) {
    document.body.classList.add('mobile-mode');
    document.getElementById('mobile-controls').classList.remove('hidden');
    if (!mobileControlsRegistered) {
      registerMobileControls();
      mobileControlsRegistered = true;
    }
  }
  titleScreen.classList.add('hidden');
  gameContainer.classList.remove('hidden');
  initGame();
  playerReset();
  gameStarted = true;
  requestAnimationFrame(update);
  holdPiece = null;
  canHold = true;
  updateHold();
  adjustGameScale();
}

// バッグをシャッフルして詰め替える
function refillBag() {
  bag = TETROMINO_TYPES.slice();
  // Fisher–Yates でシャッフル
  for (let i = bag.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [bag[i], bag[j]] = [bag[j], bag[i]];
  }
}

// バッグから次のタイプを取り出す
function getNextType() {
  if (bag.length === 0) refillBag();
  return bag.shift();
}

function registerMobileControls() {
  const btnRotateLeft  = document.getElementById('btn-rotate-left');
  const btnRotateRight = document.getElementById('btn-rotate-right');
  const btnMoveLeft    = document.getElementById('btn-move-left');
  const btnMoveRight   = document.getElementById('btn-move-right');
  const btnSoftDrop    = document.getElementById('btn-soft-drop');
  const btnHardDrop    = document.getElementById('btn-hard-drop');
  const btnHold        = document.getElementById('btn-hold');

  addHoldAction(btnRotateLeft, () => {
    playSound('rotate');
    rotatePiece(currentPiece, -1);
  });

  addHoldAction(btnRotateRight, () => {
    playSound('rotate');
    rotatePiece(currentPiece, 1);
  });

  addHoldAction(btnMoveLeft, () => {
    playSound('move');
    currentPiece.pos.x--;
    if (collide(currentPiece)) currentPiece.pos.x++;
  });

  addHoldAction(btnMoveRight, () => {
    playSound('move');
    currentPiece.pos.x++;
    if (collide(currentPiece)) currentPiece.pos.x--;
  });

  addHoldAction(btnSoftDrop, () => {
    playSound('soft-drop');
    currentPiece.pos.y++;
    if (collide(currentPiece)) {
      currentPiece.pos.y--;
      merge();
      sweepRows();
    }
    dropCounter = 0;
  });

  addHoldAction(btnHardDrop, () => {
    playSound('hard-drop');
    while (!collide(currentPiece)) currentPiece.pos.y++;
    currentPiece.pos.y--;
    merge();
    sweepRows();
    dropCounter = 0;
  });

  addHoldAction(btnHold, () => {
    playSound('hold');
    hold();
  });
}

function endGame() {
  playSound('gameover');
  gameOver = true;
  finalScoreEl.textContent = score;
  gameOverScreen.classList.remove('hidden');
  document.getElementById('mobile-controls').classList.add('hidden');
}

startButton.onclick = () => {
  playSound('click');
  startGame();
};
retryButton.onclick = () => {
  playSound('click');
  gameOverScreen.classList.add('hidden');
  titleScreen.classList.remove('hidden');
  document.body.classList.remove('mobile-mode');
  if (document.body.classList.contains('mobile-mode')) {
    document.getElementById('mobile-controls').classList.remove('hidden');
  }
};

function randomPieceType() {
  const types = Object.keys(PIECES);
  return types[Math.floor(Math.random() * types.length)];
}

function spawnPiece() {
  const type = getNextType();
  return {
    type,
    dir:    0,
    matrix: PIECES[type][0],
    pos:    { x: 3, y: type === 'I' ? -1 : 0 }
  };
}

function updateNext() {
  nextCtx.clearRect(0, 0, nextCanvas.width, nextCanvas.height);
  nextPieces.forEach((p, i) => {
    drawMatrix(p.matrix, nextCtx, { x: 0, y: i * 3 });
  });
}

function updateHold() {
  holdCtx.clearRect(0, 0, holdCanvas.width, holdCanvas.height);
  if (holdPiece) drawMatrix(holdPiece.matrix, holdCtx, { x: 0, y: 0 });
}

function hold() {
  if (!canHold) return;
  canHold = false;

  if (!holdPiece) {
    // 初回ホールド時
    holdPiece = { 
      type: currentPiece.type, 
      matrix: PIECES[currentPiece.type][0],
      dir: 0
    };
    // NEXT キューから１個取り出して currentPiece に
    currentPiece = nextPieces.shift();
    // 取り出したぶんだけすぐ補充しておく
    nextPieces.push(spawnPiece());
  } else {
    // ２回目以降は普段通りスワップ
    const temp = { 
      type: currentPiece.type, 
      matrix: PIECES[currentPiece.type][0],
      dir: 0
    };
    currentPiece = {
      type: holdPiece.type,
      matrix: PIECES[holdPiece.type][0],
      pos: { x: 3, y: holdPiece.type === 'I' ? -1 : 0 },
      dir: 0
    };
    holdPiece = temp;
  }

  // ホールド枠とネクスト枠を再描画
  updateHold();
  updateNext();

  // currentPiece の初期位置セット
  currentPiece.pos = { x: 3, y: currentPiece.type === 'I' ? -1 : 0 };

  if (collide(currentPiece)) endGame();
}

function playerReset() {
  // nextPieces が常に最低7個になるよう、spawnPiece() でバッグから補充
  while (nextPieces.length < 7) {
    nextPieces.push(spawnPiece());
  }
  currentPiece = nextPieces.shift();
  canHold      = true;
  currentPiece.dir    = 0;
  currentPiece.matrix = PIECES[currentPiece.type][0];
  if (collide(currentPiece)) endGame();
  updateNext();
}

function collide(p) {
  return p.matrix.some((r, y) =>
    r.some((v, x) =>
      v && (board[y + p.pos.y] && board[y + p.pos.y][x + p.pos.x]) !== 0
    )
  );
}

function rotatePiece(p, dir) {
  if (p.type === 'O') return;
  const oldDir = p.dir;
  const newDir = (p.dir + dir + 4) % 4;
  const kickTests = (p.type === 'I' ? kicks.I : kicks.JLSTZ)[`${oldDir}>${newDir}`];
  for (const [kX, kY] of kickTests) {
    const prev = { ...p.pos };
    p.pos.x += kX;
    p.pos.y += kY;
    p.matrix = PIECES[p.type][newDir];
    p.dir = newDir;
    if (!collide(p)) return;
    Object.assign(p.pos, prev);
    p.matrix = PIECES[p.type][oldDir];
    p.dir = oldDir;
  }
}

function merge() {
  currentPiece.matrix.forEach((r, y) => {
    r.forEach((v, x) => {
      if (v) board[y + currentPiece.pos.y][x + currentPiece.pos.x] = v;
    });
  });
}

function sweepRows() {
  let count = 0;
  outer: for (let y = ROWS - 1; y >= 0; --y) {
    if (board[y].every(v => v)) {
      const clearedRow = y;
      board.splice(y, 1);
      board.unshift(Array(COLS).fill(0));
      count++;
      for (let x = 0; x < COLS; ++x) {
        const color = colors[currentPiece.type];
        for (let k = 0; k < BLOCK / 4; ++k) {
          particles.push(new Particle(
            (x + 0.5) * BLOCK,
            (clearedRow + 0.5) * BLOCK,
            color
          ));
        }
      }
      y++;
    }
  }
  if (count) {
    playSound('clear');
    score += count * 100;
    level = Math.floor(score / 500) + 1;
    scoreEl.textContent = score;
    levelEl.textContent = level;
    dropInterval = Math.max(100, 1000 - (level - 1) * 50);

    // 行消去中フラグを立てる
    isClearing = true;

    // ライン消去後の待機時間（200ms）
    const clearDelay = 400;  // ここはスピードカーブに応じて調整
    setTimeout(() => {
      playerReset();  // 次ミノの生成タイミングを遅延
      isClearing = false;// フラグ解除
    }, clearDelay);
    return;
  }
  // 消去行がない場合は即時生成
  playerReset();
}

function drawGrid() {
  ctx.strokeStyle = 'rgba(0,255,255,0.1)';
  for (let x = 0; x <= COLS; ++x) {
    ctx.beginPath();
    ctx.moveTo(x * BLOCK, 0);
    ctx.lineTo(x * BLOCK, ROWS * BLOCK);
    ctx.stroke();
  }
  for (let y = 0; y <= ROWS; ++y) {
    ctx.beginPath();
    ctx.moveTo(0, y * BLOCK);
    ctx.lineTo(COLS * BLOCK, y * BLOCK);
    ctx.stroke();
  }
}

function drawGhost() {
  const ghost = { ...currentPiece, pos: { ...currentPiece.pos }, matrix: currentPiece.matrix };
  while (!collide(ghost)) ghost.pos.y++;
  ghost.pos.y--;
  ctx.save();
  ctx.globalAlpha = 0.3;
  drawMatrix(ghost.matrix, ctx, ghost.pos);
  ctx.restore();
}

function update(time = 0) {
  if (!gameStarted || gameOver) return;
  if (isClearing) {
    // 行消去中は物理更新を行わず、ボード＆パーティクルだけ描いて終わる
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawGrid();
    drawMatrix(board, ctx, { x: 0, y: 0 });
    particles = particles.filter(p => p.alpha > 0);
    particles.forEach(p => { p.update(); p.draw(); });
    // ポーズ表示もここで
    if (paused) {
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#0ff';
      ctx.font = '36px Verdana';
      ctx.fillText('Paused', canvas.width / 2 - 60, canvas.height / 2);
    }
    // 次のフレームも待機
    return requestAnimationFrame(update);
  }
  
  const delta = time - lastTime;
  lastTime = time;

  if (!paused) {
    dropCounter += delta;
    if (dropCounter > dropInterval) {
      currentPiece.pos.y++;
      if (collide(currentPiece)) {
        currentPiece.pos.y--;
        merge();
        sweepRows();
      }
      dropCounter = 0;
    }
  }

  // 1) 画面クリア
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // 2) グリッドを描く
  drawGrid();

  // 3) ボードを描く
  drawMatrix(board, ctx, { x: 0, y: 0 });

  // 4) クリア待機中でなければ、ゴーストと本体ミノを描く
  if (!isClearing) {
    if (ghosts) {
      drawGhost();
    }
    drawMatrix(currentPiece.matrix, ctx, currentPiece.pos);
  }

  // 5) パーティクルを更新・描画
  particles = particles.filter(p => p.alpha > 0);
  particles.forEach(p => {
    p.update();
    p.draw();
  });

  // 6) ポーズ文字など
  if (paused) {
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#0ff';
    ctx.font = '36px Verdana';
    ctx.fillText('Paused', canvas.width / 2 - 60, canvas.height / 2);
  }

  if (!gameOver) requestAnimationFrame(update);
}

function drawMatrix(matrix, ctx, offset) {
  matrix.forEach((row, y) => {
    row.forEach((v, x) => {
      if (v) {
        ctx.fillStyle = colors[matrix === currentPiece.matrix ? currentPiece.type : Object.keys(colors)[v - 1]];
        ctx.fillRect((x + offset.x) * BLOCK, (y + offset.y) * BLOCK, BLOCK, BLOCK);
        ctx.strokeStyle = '#000';
        ctx.strokeRect((x + offset.x) * BLOCK, (y + offset.y) * BLOCK, BLOCK, BLOCK);
      }
    });
  });
}

// ★画面サイズ判定してチェックボックスを初期選択
window.addEventListener('load', () => {
  const cb = document.getElementById('mobile-mode-checkbox');
  if (window.innerHeight > window.innerWidth && window.innerWidth < 600) {
    cb.checked = true;
  }
});

function adjustGameScale() {
  const wrapper   = document.querySelector('.mobile-game-wrapper');
  const container = wrapper.querySelector('.game-container');

  // 横幅に合わせた縮小率
  const widthRatio  = window.innerWidth  / container.offsetWidth;
  // wrapper の高さは モバイルなら 70vh、それ以外は 90vh (= window.innerHeight * 0.7, 0.9)
  const maxHeight = document.body.classList.contains('mobile-mode')
    ? window.innerHeight * 0.7
    : window.innerHeight * 0.9;
  const heightRatio = maxHeight / container.offsetHeight;
  
  // 両方に収まる縮小率を計算
  const scale = Math.min(widthRatio, heightRatio);

  container.style.transform       = `scale(${scale})`;
  container.style.transformOrigin = 'center center';
}

// モバイルモード時の初回／リサイズ時
window.addEventListener('load', () => {
  // existing: チェックボックス初期化...
  adjustGameScale();
});
window.addEventListener('resize', () => {
  adjustGameScale();
});

// 「結果をシェア」ボタンの動作
document.getElementById('share-button').onclick = () => {
    playSound('click');
    const text = encodeURIComponent(`私のテトリスの記録は……\nスコア：${score}点\nレベル：${level}\n\n▼みんなも挑戦してみてね！\nhttps://hato1198.github.io/tetris/`);
    const url  = `https://x.com/intent/tweet?text=${text}`;
    window.open(url, '_blank');
  };

window.addEventListener('keydown', e => {
  if (gameOver) return;
  
  if (e.key === 'P') {
    paused = !paused;
    return;
  }
  
  if (paused) return;
  
  switch (e.key) {
    case 'ArrowLeft':
    case 'a':
      playSound('move');
      currentPiece.pos.x--;
      if (collide(currentPiece)) currentPiece.pos.x++;
      break;
    case 'ArrowRight':
    case 'd':
      playSound('move');
      currentPiece.pos.x++;
      if (collide(currentPiece)) currentPiece.pos.x--;
      break;
    case 'ArrowDown':
    case 's':
      playSound('soft-drop');
      currentPiece.pos.y++;
      if (collide(currentPiece)) {
        currentPiece.pos.y--;
        merge();
        sweepRows();
      }
      dropCounter = 0;
      break;
    case 'z':
    case '.':
      playSound('rotate');
      rotatePiece(currentPiece, -1);
      break;
    case 'x':
    case '/':
    case 'ArrowUp':
    case 'w':
      playSound('rotate');
      rotatePiece(currentPiece, 1);
      break;
    case ' ':
      playSound('hard-drop');
      while (!collide(currentPiece)) currentPiece.pos.y++;
      currentPiece.pos.y--;
      merge();
      sweepRows();
      dropCounter = 0;
      break;
    case 'c':
    case '\\':
      playSound('hold');
      hold();
      break;
  }
});