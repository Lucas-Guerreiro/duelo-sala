/**
 * Script de teste automatizado para validação das perguntas certas, mapeamento de botões de controle físico
 * e cálculo do estado e pontuação do Duelo Online no Host.
 *
 * Para rodar este teste:
 * node test_gamepad_completo.js
 */

const assert = (condition, message) => {
  if (!condition) {
    console.error(`❌ FALHA: ${message}`);
    process.exit(1);
  } else {
    console.log(`✅ PASSOU: ${message}`);
  }
};

console.log("===============================================================================");
console.log("🧪 INICIANDO TESTE COMPLETO DE COMPUTAÇÃO DE PERGUNTAS E GAMEPAD FÍSICO");
console.log("===============================================================================\n");

// 1. Simulação do Banco de Perguntas (MC = Múltipla Escolha, VF = Verdadeiro ou Falso)
const mockBancoPerguntas = [
  {
    tipo: 'mc',
    txt: 'Qual o resultado de $ (3+2)^2 - 10 $?',
    alts: ['15', '20', '30', '5'],
    resp: 0 // Resposta correta: 15 (Index 0 / A / Azul)
  },
  {
    tipo: 'mc',
    txt: 'Resolva a expressão numérica: $ 10 + 5 - 3 \\times 2 $.',
    alts: ['9', '13', '18', '12'],
    resp: 0 // Resposta correta: 9 (Index 0 / A / Azul)
  },
  {
    tipo: 'vf',
    txt: 'A soma dos ângulos internos de um triângulo é 180 graus.',
    resp: 'v' // Resposta correta: Verdadeiro (Index 0 / A / Azul)
  },
  {
    tipo: 'mc',
    txt: 'Calcule: $ \\frac{1}{2} + \\frac{3}{4} - \\frac{1}{8} $.',
    alts: ['\\frac{7}{8}', '\\frac{9}{8}', '\\frac{5}{4}', '\\frac{1}{2}'],
    resp: 1 // Resposta correta: \frac{9}{8} (Index 1 / B / Vermelho)
  }
];

// 2. Mapeamento das Cores de Gamepad do Jogo
const MAP_ITEMS = [
  { name: 'Azul (Opção A / Verdadeiro)', color: 'blue' },
  { name: 'Vermelho (Opção B / Falso)', color: 'red' },
  { name: 'Amarelo (Opção C)', color: 'yellow' },
  { name: 'Verde (Opção D)', color: 'green' }
];

// Mapeamento dos botões físicos simulados para cada jogador
// Jogador 1 (Azul) mapeou os botões: [10, 11, 12, 13] para as opções A, B, C, D respectivamente
// Jogador 2 (Rosa) mapeou os botões: [20, 21, 22, 23] para as opções A, B, C, D respectivamente
const ctrlSimulado = [
  { gpIdx: 0, map: [10, 11, 12, 13, 14, 15] }, // J1
  { gpIdx: 1, map: [20, 21, 22, 23, 24, 25] }  // J2
];

// 3. Processamento do Mapeamento do Botão Pressionado para a Alternativa do Duelo
function processarBotaoGamepad(jg, btnIdx, currentQ) {
  const gpIdx = jg;
  const slotG = ctrlSimulado[jg].map.indexOf(btnIdx);
  if (slotG === -1) return null; // Botão não mapeado

  if (slotG < 4) {
    const optIdx = slotG;
    const correct = optIdx === currentQ.correct;

    const pidSimulado = `fisico_team_${jg}`;
    const nomeAlunoSimulado = jg === 0 ? 'Jogador 1' : 'Jogador 2';

    return {
      pid: pidSimulado,
      team: jg,
      optIdx: optIdx,
      correct: correct,
      speedBonus: 0, // velocidade estática para fins de assertividade simples
      nomeAluno: nomeAlunoSimulado,
      qIndex: currentQ.qIndex,
      timestamp: Date.now()
    };
  }
  return null;
}

// 4. Mapeamento do Banco do Estado do Duelo (Conversão para a estrutura do questions do dueloEstado)
const questionsDuelo = mockBancoPerguntas.map((q, idx) => {
  const alts = q.tipo === 'mc' ? q.alts : (q.tipo === 'vf' ? ['Verdadeiro', 'Falso'] : ['Resposta Única']);
  const correctIdx = typeof q.resp === 'number' 
    ? q.resp 
    : (q.tipo === 'mc' 
      ? ['a', 'b', 'c', 'd'].indexOf(String(q.resp || 'a').toLowerCase()) 
      : (String(q.resp || 'v').toLowerCase() === 'f' || String(q.resp || 'v').toLowerCase() === 'falso' ? 1 : 0));
  
  return {
    qIndex: idx,
    cat: q.mat || 'Geral',
    q: q.txt,
    opts: alts,
    correct: correctIdx,
    tipo: q.tipo || 'mc'
  };
});

// 5. Função de Cálculo de Pontuação e Progresso de Cada Time no Host
function computarPontuacaoEProgresso(respostasRodada, questions, modoJogo = "normal") {
  const respostasAzul = respostasRodada.filter(r => Number(r.team) === 0 && r.qIndex !== -1);
  const respostasRosa = respostasRodada.filter(r => Number(r.team) === 1 && r.qIndex !== -1);

  let pontosAzul = 0;
  respostasAzul.forEach(r => {
    if (r.correct) {
      pontosAzul += 5 + (r.speedBonus || 0);
    }
  });

  let pontosRosa = 0;
  respostasRosa.forEach(r => {
    if (r.correct) {
      pontosRosa += 5 + (r.speedBonus || 0);
    }
  });

  const maxQAzul = respostasAzul.length > 0 ? Math.max(...respostasAzul.map(r => r.qIndex)) : -1;
  const maxQRosa = respostasRosa.length > 0 ? Math.max(...respostasRosa.map(r => r.qIndex)) : -1;

  const terminadoAzul = maxQAzul >= questions.length - 1;
  const terminadoRosa = maxQRosa >= questions.length - 1;

  let scoreAzul = Math.min(100, pontosAzul);
  let scoreRosa = Math.min(100, pontosRosa);

  let cordaPos = 50;
  if (modoJogo === 'cabodeguerra') {
    const diferenca = scoreRosa - scoreAzul;
    cordaPos = Math.max(10, Math.min(90, 50 + diferenca));
    scoreAzul = Math.round(100 - cordaPos);
    scoreRosa = Math.round(cordaPos);
  }

  const nextQIdxAzul = Math.min(questions.length - 1, maxQAzul + 1);
  const nextQIdxRosa = Math.min(questions.length - 1, maxQRosa + 1);

  return {
    scoreAzul,
    scoreRosa,
    maxQAzul,
    maxQRosa,
    nextQIdxAzul,
    nextQIdxRosa,
    terminadoAzul,
    terminadoRosa,
    cordaPos
  };
}

// ==========================================
// TESTE 1: Mapeamento de Botão Físico -> Alternativa Escolhida
// ==========================================
console.log("--- TESTE 1: Mapeamento de Botões Físicos para Opções de Alternativa ---");

// Pergunta 0: "Qual o resultado de $ (3+2)^2 - 10 $?" com correct: 0 (A)
const p0 = questionsDuelo[0];

// Simular J1 (Azul) pressionando o botão físico 10 (Mapeado para slot 0 -> Opção A)
const respJ1_P0 = processarBotaoGamepad(0, 10, p0);
assert(respJ1_P0 !== null, "A resposta simulada do J1 não deve ser nula.");
assert(respJ1_P0.optIdx === 0, "Botão físico 10 deve mapear para o índice de opção 0 (A).");
assert(respJ1_P0.correct === true, "A resposta de J1 deve ser computada como CORRETA (opção 0).");

// Simular J2 (Rosa) pressionando o botão físico 22 (Mapeado para slot 2 -> Opção C)
const respJ2_P0 = processarBotaoGamepad(1, 22, p0);
assert(respJ2_P0 !== null, "A resposta simulada do J2 não deve ser nula.");
assert(respJ2_P0.optIdx === 2, "Botão físico 22 deve mapear para o índice de opção 2 (C).");
assert(respJ2_P0.correct === false, "A resposta de J2 deve ser computada como INCORRETA (opção correta é 0).");


// ==========================================
// TESTE 2: Acertos e Erros consecutivas e Progresso
// ==========================================
console.log("\n--- TESTE 2: Respostas Consecutivas, Acertos/Erros e Cálculo de Progresso ---");

let bancoRespostas = [];

// Rodada 1:
// J1 responde Pergunta 0 com Botão 10 (CORRETA)
bancoRespostas.push(processarBotaoGamepad(0, 10, questionsDuelo[0]));
// J2 responde Pergunta 0 com Botão 22 (INCORRETA)
bancoRespostas.push(processarBotaoGamepad(1, 22, questionsDuelo[0]));

let progresso1 = computarPontuacaoEProgresso(bancoRespostas, questionsDuelo, "normal");
assert(progresso1.scoreAzul === 5, `J1 acertou 1 pergunta. Pontuação Azul deve ser 5. Obtido: ${progresso1.scoreAzul}`);
assert(progresso1.scoreRosa === 0, `J2 errou a pergunta. Pontuação Rosa deve ser 0. Obtido: ${progresso1.scoreRosa}`);
assert(progresso1.nextQIdxAzul === 1, `J1 deve avançar para a pergunta de índice 1. Obtido: ${progresso1.nextQIdxAzul}`);
assert(progresso1.nextQIdxRosa === 1, `J2 deve avançar para a pergunta de índice 1 mesmo errando. Obtido: ${progresso1.nextQIdxRosa}`);

// Rodada 2:
// Ambos estão na Pergunta de índice 1 (p1).
// J1 responde Pergunta 1 com Botão 11 (INCORRETA, opção B. Correta era 0 - A)
bancoRespostas.push(processarBotaoGamepad(0, 11, questionsDuelo[1]));
// J2 responde Pergunta 1 com Botão 20 (CORRETA, opção A. Correta é 0)
bancoRespostas.push(processarBotaoGamepad(1, 20, questionsDuelo[1]));

let progresso2 = computarPontuacaoEProgresso(bancoRespostas, questionsDuelo, "normal");
assert(progresso2.scoreAzul === 5, `J1 errou a segunda pergunta. Pontuação Azul deve continuar em 5. Obtido: ${progresso2.scoreAzul}`);
assert(progresso2.scoreRosa === 5, `J2 acertou a segunda pergunta. Pontuação Rosa deve ser 5. Obtido: ${progresso2.scoreRosa}`);
assert(progresso2.nextQIdxAzul === 2, `J1 avança para a pergunta 2. Obtido: ${progresso2.nextQIdxAzul}`);
assert(progresso2.nextQIdxRosa === 2, `J2 avança para a pergunta 2. Obtido: ${progresso2.nextQIdxRosa}`);

// Rodada 3:
// Ambos na Pergunta de índice 2 (p2 - Verdadeiro/Falso). Resposta correta: v (index 0).
// J1 responde com Botão 10 (CORRETA)
bancoRespostas.push(processarBotaoGamepad(0, 10, questionsDuelo[2]));
// J2 responde com Botão 20 (CORRETA)
bancoRespostas.push(processarBotaoGamepad(1, 20, questionsDuelo[2]));

let progresso3 = computarPontuacaoEProgresso(bancoRespostas, questionsDuelo, "normal");
assert(progresso3.scoreAzul === 10, `J1 acertou mais uma. Pontuação Azul deve ser 10. Obtido: ${progresso3.scoreAzul}`);
assert(progresso3.scoreRosa === 10, `J2 acertou mais uma. Pontuação Rosa deve ser 10. Obtido: ${progresso3.scoreRosa}`);


// ==========================================
// TESTE 3: Modo Cabo de Guerra (Tug of War)
// ==========================================
console.log("\n--- TESTE 3: Cálculo da Corda no Modo Cabo de Guerra ---");

// Cenário: J1 (Azul) tem 10 pontos e J2 (Rosa) tem 5 pontos
const respostasCabo = [
  // J1 acertou P0 e P1 = 10 pontos
  { team: 0, qIndex: 0, correct: true, speedBonus: 0 },
  { team: 0, qIndex: 1, correct: true, speedBonus: 0 },
  // J2 acertou apenas P0 = 5 pontos
  { team: 1, qIndex: 0, correct: true, speedBonus: 0 },
  { team: 1, qIndex: 1, correct: false, speedBonus: 0 }
];

const resultadoCabo = computarPontuacaoEProgresso(respostasCabo, questionsDuelo, "cabodeguerra");

// Cálculo esperado da Corda no cabo de guerra:
// diferenca = scoreRosa - scoreAzul = 5 - 10 = -5
// cordaPos = 50 + diferenca = 45% (Corda puxada em direção ao time Azul)
// scoreAzul = 100 - cordaPos = 55%
// scoreRosa = cordaPos = 45%
assert(resultadoCabo.cordaPos === 45, `Posição da corda deve ser 45 (puxado pro Azul). Obtido: ${resultadoCabo.cordaPos}`);
assert(resultadoCabo.scoreAzul === 55, `Score da Equipe Azul deve ser 55. Obtido: ${resultadoCabo.scoreAzul}`);
assert(resultadoCabo.scoreRosa === 45, `Score da Equipe Rosa deve ser 45. Obtido: ${resultadoCabo.scoreRosa}`);


// ==========================================
// TESTE 4: Detecção Dual Arcade (Teclado HID / Encoder Arcade + Gamepad)
// ==========================================
console.log("\n--- TESTE 4: Detecção Dual Arcade (Teclado Arcade HID / IPAC & Zero Delay) ---");

// Simulação de Mapeamento Dual de Teclado Arcade para J1 (A, S, D, F) e J2 (J, K, L, Semicolon)
const ctrlTecladoSimulado = [
  { gpIdx: null, map: [null, null, null, null, null, null], keyMap: ['KeyA', 'KeyS', 'KeyD', 'KeyF', 'KeyQ', 'KeyW'] }, // J1 IPAC
  { gpIdx: null, map: [null, null, null, null, null, null], keyMap: ['KeyJ', 'KeyK', 'KeyL', 'Semicolon', 'KeyU', 'KeyI'] } // J2 IPAC
];

function processarBotaoArcadeUnificado(inputType, deviceId, btnId, currentQ) {
  let mappedPlayer = null;
  let mappedSlot = null;

  for (let jg = 0; jg < 2; jg++) {
    if (inputType === 'gamepad') {
      const slot = ctrlSimulado[jg].map.indexOf(btnId);
      if (slot !== -1) { mappedPlayer = jg; mappedSlot = slot; break; }
    } else if (inputType === 'keyboard') {
      const slot = ctrlTecladoSimulado[jg].keyMap.indexOf(btnId);
      if (slot !== -1) { mappedPlayer = jg; mappedSlot = slot; break; }
    }
  }

  if (mappedPlayer === null || mappedSlot === null) return null;

  const slotG = mappedSlot;
  if (slotG < 4) {
    const optIdx = slotG;
    const correct = optIdx === currentQ.correct;
    return {
      pid: `fisico_team_${mappedPlayer}`,
      team: mappedPlayer,
      optIdx,
      correct,
      qIndex: currentQ.qIndex,
      timestamp: Date.now()
    };
  }
  return null;
}

// Testar J1 pressionando tecla de Arcade 'KeyA' (mapeada para slot 0 -> Opção A)
const respKeyJ1 = processarBotaoArcadeUnificado('keyboard', 'keyboard', 'KeyA', questionsDuelo[0]);
assert(respKeyJ1 !== null, "Teclas de Arcade (Encoder Keyboard) devem ser detectadas.");
assert(respKeyJ1.optIdx === 0, "Tecla 'KeyA' deve responder a opção 0 (A).");
assert(respKeyJ1.correct === true, "A resposta via Teclado Arcade deve ser CORRETA.");

// Testar J2 pressionando tecla de Arcade 'KeyL' (mapeada para slot 2 -> Opção C)
const respKeyJ2 = processarBotaoArcadeUnificado('keyboard', 'keyboard', 'KeyL', questionsDuelo[0]);
assert(respKeyJ2 !== null, "Teclas de Arcade do Jogador 2 devem ser detectadas.");
assert(respKeyJ2.optIdx === 2, "Tecla 'KeyL' do J2 deve responder a opção 2 (C).");
assert(respKeyJ2.correct === false, "A resposta de J2 via Teclado Arcade deve ser INCORRETA.");


console.log("\n===============================================================================");
console.log("🎉 TODOS OS TESTES PASSARAM COM SUCESSO!");
console.log("Os botões físicos (Gamepad + Teclado Arcade) mapeiam corretamente para as alternativas.");
console.log("Os acertos são computados, incrementam a pontuação e avançam a pergunta do time.");
console.log("Os erros são computados, não alteram o placar e avançam a pergunta do time.");
console.log("===============================================================================");

