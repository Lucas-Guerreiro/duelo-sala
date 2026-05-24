import React, { useState, useEffect, useRef } from 'react';
import * as XLSX from 'xlsx';
import katex from 'katex';
import 'katex/dist/katex.min.css';

// Componente para renderização de fórmulas matemáticas KaTeX de forma offline
function MathText({ text }) {
  const containerRef = useRef(null);

  useEffect(() => {
    if (!containerRef.current) return;
    if (!text) {
      containerRef.current.innerHTML = '';
      return;
    }

    try {
      // Divide o texto pelos delimitadores de equações LaTeX: $$ (bloco) ou $ (inline) ou [math]
      const parts = String(text).split(/(\$\$[\s\S]+?\$\$|\$[\s\S]+?\$|\[math\][\s\S]+?\[\/math\])/g);
      containerRef.current.innerHTML = '';

      parts.forEach(part => {
        if (part.startsWith('$$') && part.endsWith('$$')) {
          const formula = part.slice(2, -2);
          const span = document.createElement('span');
          katex.render(formula, span, { displayMode: true, throwOnError: false });
          containerRef.current.appendChild(span);
        } else if (part.startsWith('$') && part.endsWith('$')) {
          const formula = part.slice(1, -1);
          const span = document.createElement('span');
          katex.render(formula, span, { displayMode: false, throwOnError: false });
          containerRef.current.appendChild(span);
        } else if (part.startsWith('[math]') && part.endsWith('[/math]')) {
          const formula = part.slice(6, -7);
          const span = document.createElement('span');
          katex.render(formula, span, { displayMode: false, throwOnError: false });
          containerRef.current.appendChild(span);
        } else {
          const textNode = document.createTextNode(part);
          containerRef.current.appendChild(textNode);
        }
      });
    } catch (e) {
      console.error("Erro KaTeX:", e);
      containerRef.current.textContent = String(text);
    }
  }, [text]);

  return <span ref={containerRef} />;
}


// Sistema de Efeitos Sonoros Offline usando Web Audio API (100% livre de lag e disponível offline)
let audioCtx = null;
function getAudioContext() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

function playSound(type) {
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;

    switch (type) {
      case 'click': {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = 'sine';
        osc.frequency.setValueAtTime(600, now);
        osc.frequency.exponentialRampToValueAtTime(1000, now + 0.08);
        gain.gain.setValueAtTime(0.08, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.08);
        osc.start(now);
        osc.stop(now + 0.08);
        break;
      }
      case 'success': {
        const gain = ctx.createGain();
        gain.connect(ctx.destination);
        gain.gain.setValueAtTime(0.1, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.4);

        const playNote = (freq, start, duration) => {
          const osc = ctx.createOscillator();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(freq, start);
          osc.connect(gain);
          osc.start(start);
          osc.stop(start + duration);
        };

        playNote(523.25, now, 0.08); // C5
        playNote(659.25, now + 0.08, 0.08); // E5
        playNote(783.99, now + 0.16, 0.08); // G5
        playNote(1046.50, now + 0.24, 0.16); // C6
        break;
      }
      case 'error': {
        const osc1 = ctx.createOscillator();
        const osc2 = ctx.createOscillator();
        const gain = ctx.createGain();
        
        osc1.connect(gain);
        osc2.connect(gain);
        gain.connect(ctx.destination);
        
        osc1.type = 'sawtooth';
        osc2.type = 'sine';
        
        osc1.frequency.setValueAtTime(180, now);
        osc1.frequency.linearRampToValueAtTime(100, now + 0.35);
        
        osc2.frequency.setValueAtTime(185, now);
        osc2.frequency.linearRampToValueAtTime(103, now + 0.35);
        
        gain.gain.setValueAtTime(0.08, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
        
        osc1.start(now);
        osc2.start(now);
        osc1.stop(now + 0.35);
        osc2.stop(now + 0.35);
        break;
      }
      case 'block': {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(320, now);
        osc.frequency.exponentialRampToValueAtTime(80, now + 0.4);
        
        gain.gain.setValueAtTime(0.12, now);
        gain.gain.linearRampToValueAtTime(0.001, now + 0.4);
        
        osc.start(now);
        osc.stop(now + 0.4);
        break;
      }
      case 'half': {
        const gain = ctx.createGain();
        gain.connect(ctx.destination);
        gain.gain.setValueAtTime(0.06, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);

        for (let i = 0; i < 6; i++) {
          const osc = ctx.createOscillator();
          osc.type = 'sine';
          const freq = 800 + i * 200;
          const delay = i * 0.05;
          osc.frequency.setValueAtTime(freq, now + delay);
          osc.connect(gain);
          osc.start(now + delay);
          osc.stop(now + delay + 0.08);
        }
        break;
      }
      case 'double': {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(220, now);
        osc.frequency.exponentialRampToValueAtTime(880, now + 0.4);
        
        gain.gain.setValueAtTime(0.12, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.4);
        
        osc.start(now);
        osc.stop(now + 0.4);
        break;
      }
      case 'buzzer': {
        const osc1 = ctx.createOscillator();
        const osc2 = ctx.createOscillator();
        const gain = ctx.createGain();
        
        osc1.connect(gain);
        osc2.connect(gain);
        gain.connect(ctx.destination);
        
        osc1.type = 'sawtooth';
        osc2.type = 'square';
        
        osc1.frequency.setValueAtTime(440, now);
        osc2.frequency.setValueAtTime(445, now);
        
        gain.gain.setValueAtTime(0.1, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
        
        osc1.start(now);
        osc2.start(now);
        osc1.stop(now + 0.3);
        osc2.stop(now + 0.3);
        break;
      }
      case 'tick': {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        
        osc.type = 'sine';
        osc.frequency.setValueAtTime(880, now);
        
        gain.gain.setValueAtTime(0.03, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);
        
        osc.start(now);
        osc.stop(now + 0.04);
        break;
      }
      case 'victory': {
        const gain = ctx.createGain();
        gain.connect(ctx.destination);
        gain.gain.setValueAtTime(0.1, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 1.2);

        const playChord = (notes, start, duration) => {
          notes.forEach(freq => {
            const osc = ctx.createOscillator();
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(freq, start);
            osc.connect(gain);
            osc.start(start);
            osc.stop(start + duration);
          });
        };

        playChord([261.63, 329.63, 392.00], now, 0.2); // C4 Major
        playChord([349.23, 440.00, 523.25], now + 0.2, 0.2); // F4 Major
        playChord([392.00, 493.88, 587.33], now + 0.4, 0.2); // G4 Major
        playChord([523.25, 659.25, 783.99, 1046.50], now + 0.6, 0.6); // C5 Major alto!
        break;
      }
      case 'reveal': {
        const gain = ctx.createGain();
        gain.connect(ctx.destination);
        gain.gain.setValueAtTime(0.12, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);

        const playNote = (freq, start, duration) => {
          const osc = ctx.createOscillator();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(freq, start);
          osc.connect(gain);
          osc.start(start);
          osc.stop(start + duration);
        };

        playNote(587.33, now, 0.15); // D5
        playNote(880.00, now + 0.08, 0.35); // A5 alto e sustentado
        break;
      }
      case 'suspense': {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        
        osc.type = 'sine';
        osc.frequency.setValueAtTime(120, now);
        osc.frequency.linearRampToValueAtTime(160, now + 0.5);
        
        gain.gain.setValueAtTime(0.01, now);
        gain.gain.linearRampToValueAtTime(0.08, now + 0.5);
        
        osc.start(now);
        osc.stop(now + 0.5);
        break;
      }
      default:
        break;
    }
  } catch (e) {
    console.warn("Erro ao reproduzir som:", e);
  }
}

// Definição das Cores e Mapeamentos dos Botões estilo Kahoot
const KAHOOT = [
  { cls: 'kbtn-amarelo', label: '🟡', name: 'Amarelo' },
  { cls: 'kbtn-vermelho', label: '🔴', name: 'Vermelho' },
  { cls: 'kbtn-azul',    label: '🔵', name: 'Azul' },
  { cls: 'kbtn-verde',   label: '🟢', name: 'Verde' }
];

const MAP_ITEMS = [
  { name: 'Amarelo (Opção A)', icon: '🟡', isPowerUp: false },
  { name: 'Vermelho (Opção B / Falso)', icon: '🔴', isPowerUp: false },
  { name: 'Azul (Opção C / Verdadeiro)', icon: '🔵', isPowerUp: false },
  { name: 'Verde (Opção D)', icon: '🟢', isPowerUp: false },
  { name: '🚫 Poder: Bloquear Oponente', icon: '🚫', isPowerUp: true, type: 'block' },
  { name: '💡 Poder: Dica 50/50', icon: '💡', isPowerUp: true, type: 'half' }
];

// Temas Padrões para perguntas em caso de inicialização vazia
const MATERIAS_PADRAO = ['História', 'Matemática', 'Conhecimentos Gerais'];
const PERGUNTAS_PADRAO = [
  { mat: 'História', tipo: 'mc', txt: 'Quem foi o primeiro imperador do Brasil?', alts: ['Dom Pedro I', 'Dom Pedro II', 'Deodoro da Fonseca', 'Getúlio Vargas'], resp: 0 },
  { mat: 'História', tipo: 'vf', txt: 'A Lei Áurea aboliu a escravidão no Brasil em 1888.', resp: 'v' },
  { mat: 'Matemática', tipo: 'mc', txt: 'Qual é o valor de 7 x 8?', alts: ['54', '56', '62', '64'], resp: 1 },
  { mat: 'Matemática', tipo: 'vf', txt: 'O número 17 é um número primo.', resp: 'v' },
  { mat: 'Conhecimentos Gerais', tipo: 'veloc', txt: 'Qual é o maior oceano do planeta Terra?', resp: 'Oceano Pacífico' }
];

export default function App() {
  // --- ESTADOS DE BANCO DE DADOS (LOCAL STORAGE) ---
  const [materias, setMaterias] = useState(() => {
    const saved = localStorage.getItem('dm_mat');
    return saved ? JSON.parse(saved) : MATERIAS_PADRAO;
  });

  const [perguntas, setPerguntas] = useState(() => {
    const saved = localStorage.getItem('dm_perg');
    return saved ? JSON.parse(saved) : PERGUNTAS_PADRAO;
  });

  const [ctrl, setCtrl] = useState(() => {
    const saved0 = localStorage.getItem('dm_ctrl_0');
    const saved1 = localStorage.getItem('dm_ctrl_1');
    const parseMap = (saved) => {
      if (!saved) return { gpIdx: null, map: [null, null, null, null, null, null] };
      try {
        const parsed = JSON.parse(saved);
        if (parsed && Array.isArray(parsed.map)) {
          while (parsed.map.length < 6) {
            parsed.map.push(null);
          }
          return parsed;
        }
      } catch (e) {
        console.error(e);
      }
      return { gpIdx: null, map: [null, null, null, null, null, null] };
    };
    return [parseMap(saved0), parseMap(saved1)];
  });

  // Salvar no localStorage sempre que mudar
  useEffect(() => {
    localStorage.setItem('dm_mat', JSON.stringify(materias));
  }, [materias]);

  useEffect(() => {
    localStorage.setItem('dm_perg', JSON.stringify(perguntas));
  }, [perguntas]);

  const salvarControles = (novosControles) => {
    setCtrl(novosControles);
    localStorage.setItem('dm_ctrl_0', JSON.stringify(novosControles[0]));
    localStorage.setItem('dm_ctrl_1', JSON.stringify(novosControles[1]));
  };

  const sincMaterias = (novasPerguntas) => {
    const matsDePerg = novasPerguntas.map(p => p.mat).filter((v, i, a) => a.indexOf(v) === i);
    setMaterias(prev => {
      const novas = [...prev];
      matsDePerg.forEach(m => {
        if (!novas.includes(m)) novas.push(m);
      });
      return novas;
    });
  };

  // --- ESTADOS DE NAVEGAÇÃO ---
  const [tela, setTela] = useState('menu'); // 'menu' | 'ia' | 'controles' | 'cadastro' | 'selecao' | 'nomes' | 'jogo' | 'fim'

  const irParaTela = (dest) => {
    playSound('click');
    setTela(dest);
  };

  // --- ESTADOS DO GAMEPAD E DETECÇÃO ---
  const [gamepadsConectados, setGamepadsConectados] = useState([]);
  const [detectMode, setDetectMode] = useState(null); // null | { jogador: 0|1, fase: 'detect'|'map', slot: 0|1|2|3 }
  const [feedbackControles, setFeedbackControles] = useState(null); // { txt: string, tipo: 'ok'|'err'|'warn' }

  // Refs de botões de Gamepad para debouncing
  const prevBtnsRef = useRef({});
  const animationFrameRef = useRef(null);

  // Escutar gamepads
  useEffect(() => {
    const updateGamepads = () => {
      const gps = Array.from(navigator.getGamepads()).filter(Boolean);
      setGamepadsConectados(gps);
    };

    window.addEventListener('gamepadconnected', updateGamepads);
    window.addEventListener('gamepaddisconnected', updateGamepads);
    updateGamepads();

    return () => {
      window.removeEventListener('gamepadconnected', updateGamepads);
      window.removeEventListener('gamepaddisconnected', updateGamepads);
    };
  }, []);

  const handleGamepadButtonPressRef = useRef(null);
  useEffect(() => {
    handleGamepadButtonPressRef.current = handleGamepadButtonPress;
  });

  // Loop de escuta de Gamepad em React usando requestAnimationFrame
  useEffect(() => {
    const pollGamepad = () => {
      const gps = Array.from(navigator.getGamepads()).filter(Boolean);
      gps.forEach(gp => {
        const prev = prevBtnsRef.current[gp.index] || gp.buttons.map(() => false);
        gp.buttons.forEach((btn, bi) => {
          if (btn.pressed && !prev[bi]) {
            handleGamepadButtonPressRef.current(gp.index, bi, gp.id);
          }
        });
        prevBtnsRef.current[gp.index] = gp.buttons.map(b => b.pressed);
      });
      animationFrameRef.current = requestAnimationFrame(pollGamepad);
    };

    animationFrameRef.current = requestAnimationFrame(pollGamepad);
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [detectMode, tela, ctrl]);

  const handleGamepadButtonPress = (gpIdx, btnIdx, gpId) => {
    // 1. Modo de Detecção de Controles
    if (detectMode) {
      const { jogador, fase, slot } = detectMode;
      if (fase === 'detect') {
        const novos = [
          { gpIdx: gpIdx, map: [null, null, null, null, null, null] },
          { gpIdx: gpIdx, map: [null, null, null, null, null, null] }
        ];
        salvarControles(novos);
        setDetectMode(null);
        setFeedbackControles({ txt: `✅ Controle compartilhado detectado (${gpId.substring(0, 35)}...)! Mapeie os botões de cada jogador.`, tipo: 'ok' });
        return;
      }
      if (fase === 'map') {
        if (ctrl[jogador].gpIdx !== gpIdx) {
          setFeedbackControles({ txt: '❌ Pressione o botão no controle compartilhado detectado!', tipo: 'err' });
          return;
        }
        // Validar se o botão físico já está em uso por outra cor/jogador/função
        for (let j = 0; j < 2; j++) {
          for (let s = 0; s < 6; s++) {
            if (j === jogador && s === slot) continue;
            if (ctrl[j].map[s] === btnIdx) {
              setFeedbackControles({ txt: `❌ O Botão ${btnIdx} já está em uso pelo ${j === 0 ? 'Jogador 1' : 'Jogador 2'} (${MAP_ITEMS[s].name})!`, tipo: 'err' });
              return;
            }
          }
        }

        const novos = [...ctrl];
        novos[jogador].map[slot] = btnIdx;
        salvarControles(novos);
        setDetectMode(null);
        setFeedbackControles({ txt: `✅ ${MAP_ITEMS[slot].name} do ${jogador === 0 ? 'Jogador 1' : 'Jogador 2'} mapeado para o Botão ${btnIdx}!`, tipo: 'ok' });
        return;
      }
    }

    // 2. Lógica do Jogo Ativo
    if (tela === 'jogo') {
      const p = fila[rodAtual - 1];
      if (!p || rodDescanso) return; // Nenhuma rodada ativa ou em tela de feedback

      for (let jg = 0; jg < 2; jg++) {
        if (ctrl[jg].gpIdx === gpIdx) {
          const slotG = ctrl[jg].map.indexOf(btnIdx);
          if (slotG === -1) continue; // Botão pressionado não mapeado para este jogador

          // Se o jogador estiver bloqueado nesta rodada, ele não pode acionar NENHUM botão do gamepad
          if (efeitosRodada.bloqueado === jg) continue;

          // INTERCEPÇÃO DO MODO APOSTAS
          if (faseJogo === 'aposta') {
            if (slotG < 4 && !apostasConfirmadas[jg] && !revelandoApostas) {
              const valoresAposta = [0.5, 1.0, 2.0, 3.0];
              const valorApostado = valoresAposta[slotG];
              
              const novasApostas = [...apostasRodada];
              novasApostas[jg] = valorApostado;
              setApostasRodada(novasApostas);
              
              const novasConfirmadas = [...apostasConfirmadas];
              novasConfirmadas[jg] = true;
              setApostasConfirmadas(novasConfirmadas);
              
              playSound('click');
              
              if (novasConfirmadas[0] && novasConfirmadas[1]) {
                revelarELiberarPergunta();
              }
            }
            continue;
          }

          if (slotG < 4) {
            // Botões de alternativas de resposta
            if (p.tipo === 'mc') {
              responderPerguntaMC(jg, slotG);
            } else if (p.tipo === 'vf') {
              if (slotG === 2) responderPerguntaVF(jg, 'v');
              if (slotG === 1) responderPerguntaVF(jg, 'f');
            } else if (p.tipo === 'veloc') {
              baterVelocidade(jg);
            }
          } else if (slotG === 4) {
            // Botão físico Especial 1: Bloquear Oponente
            usarPoder(jg, 'block');
          } else if (slotG === 5) {
            // Botão físico Especial 2: Dica 50/50
            usarPoder(jg, 'half');
          }
        }
      }
    }
  };

  // --- ESTADOS DO IA DE GERAÇÃO ---
  const [iaFileData, setIaFileData] = useState(null);
  const [iaFileType, setIaFileType] = useState(null);
  const [iaFileMediaType, setIaFileMediaType] = useState(null);
  const [iaFileName, setIaFileName] = useState('');
  const [iaUrl, setIaUrl] = useState('');
  const [iaSourceMode, setIaSourceMode] = useState('file'); // 'file' | 'url'
  const [iaTurma, setIaTurma] = useState('');
  const [iaMateria, setIaMateria] = useState('');
  const [iaTema, setIaTema] = useState('');
  const [iaPromptInstrucao, setIaPromptInstrucao] = useState('');
  const [iaQtd, setIaQtd] = useState(5);
  const [iaTipoMC, setIaTipoMC] = useState(true);
  const [iaTipoVF, setIaTipoVF] = useState(true);
  const [iaTipoVel, setIaTipoVel] = useState(false);
  const [iaLoading, setIaLoading] = useState(false);
  const [iaFeedback, setIaFeedback] = useState(null);
  const [iaPergsGeradas, setIaPergsGeradas] = useState([]);
  const [geminiKey, setGeminiKey] = useState(() => localStorage.getItem('dm_gemini_key') || '');

  useEffect(() => {
    localStorage.setItem('dm_gemini_key', geminiKey);
  }, [geminiKey]);

  // --- ESTADOS DO CADASTRO MANUAL ---
  const [cadTab, setCadTab] = useState('manual'); // 'manual' | 'importar' | 'lista' | 'backup'
  const [cadTurmaText, setCadTurmaText] = useState('');
  const [cadMateriaText, setCadMateriaText] = useState('');
  const [cadTemaText, setCadTemaText] = useState('');
  const [cadMateriaSelected, setCadMateriaSelected] = useState('');
  const [cadTipoSelected, setCadTipoSelected] = useState('mc'); // 'mc' | 'vf' | 'veloc'
  const [cadPerguntaText, setCadPerguntaText] = useState('');
  const [cadMcAlts, setCadMcAlts] = useState(['', '', '', '']);
  const [cadMcResp, setCadMcResp] = useState(0);
  const [cadVfResp, setCadVfResp] = useState('v');
  const [cadVelocResp, setCadVelocResp] = useState('');
  const [cadTempoCustomEnabled, setCadTempoCustomEnabled] = useState(false);
  const [cadTempoVal, setCadTempoVal] = useState(15);
  const [cadFiltroTurma, setCadFiltroTurma] = useState('');
  const [cadFiltroMateria, setCadFiltroMateria] = useState('');
  const [cadFiltroTema, setCadFiltroTema] = useState('');
  const [planilhaFeedback, setPlanilhaFeedback] = useState(null);
  const [planilhaNovasPerguntas, setPlanilhaNovasPerguntas] = useState([]);

  // --- ESTADOS DA SELEÇÃO DE MATÉRIA E NOMES ---
  const [materiasSelecionadas, setMateriasSelecionadas] = useState([]);
  const [selTurmas, setSelTurmas] = useState([]);
  const [selMaterias, setSelMaterias] = useState([]);
  const [selTemas, setSelTemas] = useState([]);
  const [composicaoQuiz, setComposicaoQuiz] = useState({}); // { "turma||materia||tema": quantidade }
  const [nomeJ1, setNomeJ1] = useState('Jogador 1');
  const [nomeJ2, setNomeJ2] = useState('Jogador 2');

  // --- ESTADOS DO JOGO ATIVO ---
  const [fila, setFila] = useState([]); // Fila de perguntas embaralhadas do jogo
  const [rodAtual, setRodAtual] = useState(0);
  const [pts, setPts] = useState([0, 0]);
  const [timerSeg, setTimerSeg] = useState(15);
  const [respJ, setRespJ] = useState([null, null]); // Respostas dadas: [altIdx/v_f/true, ...]
  const [ordemResp, setOrdemResp] = useState([]); // Ordem de batida/resposta: [0, 1] ou [1, 0]
  const [rodDescanso, setRodDescanso] = useState(false); // Travado exibindo feedback
  const [velocBateu, setVelocBateu] = useState(null); // Quem bateu primeiro na velocidade: 0|1
  const [velocRevelado, setVelocRevelado] = useState(false); // Revelar gabarito de velocidade
  const [historico, setHistorico] = useState([]);

  // --- ESTADOS DO MODO APOSTAS ("O PREÇO DA RESPOSTA") ---
  const [modoApostas, setModoApostas] = useState(false);
  const [faseJogo, setFaseJogo] = useState('pergunta'); // 'aposta' | 'pergunta'
  const [apostasRodada, setApostasRodada] = useState([null, null]); // [apostaJ1, apostaJ2]
  const [apostasConfirmadas, setApostasConfirmadas] = useState([false, false]);
  const [revelandoApostas, setRevelandoApostas] = useState(false);

  // --- PODERES E EFEITOS DE RODADA ---
  const [poderes, setPoderes] = useState([
    { block: 1, double: 1, half: 1 },
    { block: 1, double: 1, half: 1 }
  ]);
  const [efeitosRodada, setEfeitosRodada] = useState({
    bloqueado: null, // null | 0 (J1 bloqueado) | 1 (J2 bloqueado)
    rodadaDupla: false,
    dica: [false, false]
  });
  const [dicaExcluidas, setDicaExcluidas] = useState([]);

  // --- CONFIGURAÇÃO GLOBAL DE TEMPO ---
  const [globalTempo, setGlobalTempo] = useState(15);
  const [globalTimerEnabled, setGlobalTimerEnabled] = useState(true);

  const timerIntRef = useRef(null);
  const rodInicioRef = useRef(0);
  const ordemRespRef = useRef([]);
  const temposRespRef = useRef([null, null]);

  useEffect(() => {
    ordemRespRef.current = ordemResp;
  }, [ordemResp]);

  // --- GESTÃO DE CLIQUES E ARRASTE DE ARQUIVO IA ---
  const handleIADrop = (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleIAFile(file);
  };

  const handleIAFile = (file) => {
    const isPDF = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
    const isImg = file.type.startsWith('image/');
    if (!isPDF && !isImg) {
      setIaFeedback({ txt: '❌ Formato inválido! Envie uma Imagem (JPG, PNG, WEBP, GIF) ou arquivo PDF.', tipo: 'err' });
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const b64 = e.target.result.split(',')[1];
      setIaFileData(b64);
      setIaFileType(isPDF ? 'pdf' : 'img');
      setIaFileMediaType(isPDF ? 'application/pdf' : file.type);
      setIaFileName(file.name);
      setIaFeedback(null);
    };
    reader.readAsDataURL(file);
  };

  // GERAÇÃO DE PERGUNTAS COM IA (Real + Fallback Inteligente Local)
  const gerarPerguntasIA = async () => {
    if (iaSourceMode === 'file' && !iaFileData) {
      setIaFeedback({ txt: '❌ Envie uma imagem ou arquivo PDF primeiro.', tipo: 'err' });
      return;
    }
    if (iaSourceMode === 'url' && !iaUrl.trim()) {
      setIaFeedback({ txt: '❌ Insira um link/URL de internet válido primeiro.', tipo: 'err' });
      return;
    }
    const materia = iaMateria.trim() || 'Geral';
    if (!iaTipoMC && !iaTipoVF && !iaTipoVel) {
      setIaFeedback({ txt: '❌ Selecione pelo menos um tipo de pergunta para gerar!', tipo: 'err' });
      return;
    }

    setIaLoading(true);
    setIaFeedback({ txt: iaSourceMode === 'file' ? '⏳ Analisando arquivo e formulando perguntas...' : '⏳ Rastreando link e formulando perguntas...', tipo: 'warn' });
    setIaPergsGeradas([]);

    const tiposDisponiveis = [];
    if (iaTipoMC) tiposDisponiveis.push('mc');
    if (iaTipoVF) tiposDisponiveis.push('vf');
    if (iaTipoVel) tiposDisponiveis.push('veloc');

    // Prompt detalhado
    const promptBase = `Analise o conteúdo fornecido e gere exatamente ${iaQtd} perguntas sobre o tema "${materia}".\n`
      + `Utilize exclusivamente os seguintes tipos selecionados: ${tiposDisponiveis.join(', ')}.\n`
      + `Distribua de forma variada entre os tipos selecionados.\n\n`
      + (iaPromptInstrucao.trim() ? `INSTRUÇÃO DE PERSONALIZAÇÃO ADICIONAL DO USUÁRIO QUE DEVE SER SEGUIDA RIGOROSAMENTE:\n"${iaPromptInstrucao.trim()}"\n\n` : '')
      + `REGRA MATEMÁTICA CRÍTICA: Se a pergunta ou as alternativas envolverem fórmulas matemáticas complexas (como frações, raízes, chaves, potências ou equações), represente-as utilizando a sintaxe padrão LaTeX delimitada por cifrões simples "$" para modo inline (ex: "$ \\frac{1}{3} - 7 $" ou "$ \\sqrt{121} $"). Nunca utilize parênteses planos para frações multinível se puder usar LaTeX, de modo a garantir uma renderização visualmente impecável.\n\n`
      + `Responda unicamente no formato JSON estrito, sem markdown, sem textos adicionais, respeitando esta estrutura:\n`
      + `[\n`
      + `  {\n`
      + `    "turma": "${iaTurma.trim() || 'Sem Turma'}",\n`
      + `    "mat": "${materia}",\n`
      + `    "tema": "${iaTema.trim() || 'Geral'}",\n`
      + `    "tipo": "mc",\n`
      + `    "txt": "Texto da pergunta?",\n`
      + `    "alts": ["Opção A", "Opção B", "Opção C", "Opção D"],\n`
      + `    "resp": 0\n` // 0 a 3
      + `  },\n`
      + `  {\n`
      + `    "turma": "${iaTurma.trim() || 'Sem Turma'}",\n`
      + `    "mat": "${materia}",\n`
      + `    "tema": "${iaTema.trim() || 'Geral'}",\n`
      + `    "tipo": "vf",\n`
      + `    "txt": "Fato ou afirmação?",\n`
      + `    "resp": "v"\n` // "v" ou "f"
      + `  },\n`
      + `  {\n`
      + `    "turma": "${iaTurma.trim() || 'Sem Turma'}",\n`
      + `    "mat": "${materia}",\n`
      + `    "tema": "${iaTema.trim() || 'Geral'}",\n`
      + `    "tipo": "veloc",\n`
      + `    "txt": "Pergunta de resposta rápida?",\n`
      + `    "resp": "Resposta correta curta"\n`
      + `  }\n`
      + `]`;

    const prompt = iaSourceMode === 'file' 
      ? `Analise o conteúdo deste arquivo.\n\n${promptBase}`
      : `Visite, leia e analise minuciosamente o conteúdo deste link de internet: ${iaUrl.trim()}.\n\n${promptBase}`;

    // Se tivermos a chave do Gemini inserida pelo usuário, fazemos a chamada direta
    if (geminiKey.trim()) {
      try {
        const reqBody = {
          contents: [{
            parts: iaSourceMode === 'file' ? [
              { inlineData: { mimeType: iaFileMediaType, data: iaFileData } },
              { text: prompt }
            ] : [
              { text: prompt }
            ]
          }],
          generationConfig: {
            responseMimeType: "application/json"
          }
        };

        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiKey.trim()}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(reqBody)
        });

        if (!response.ok) {
          const errData = await response.json();
          throw new Error(errData.error?.message || `Erro HTTP ${response.status}`);
        }

        const data = await response.json();
        let text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
        text = text.trim();

        const parsed = JSON.parse(text);
        if (!Array.isArray(parsed) || !parsed.length) throw new Error('O retorno da IA não é um array válido.');

        const validadas = parsed.filter(p => {
          if (!p.tipo || !p.txt) return false;
          if (p.tipo === 'mc') return Array.isArray(p.alts) && p.alts.length === 4 && p.resp >= 0 && p.resp <= 3;
          if (p.tipo === 'vf') return p.resp === 'v' || p.resp === 'f';
          if (p.tipo === 'veloc') return !!p.resp;
          return false;
        }).map(p => ({ 
          ...p, 
          turma: p.turma || iaTurma.trim() || 'Sem Turma', 
          mat: p.mat || materia, 
          tema: p.tema || iaTema.trim() || 'Geral' 
        }));

        if (!validadas.length) throw new Error('Nenhuma pergunta gerada atendeu aos critérios de validação.');

        setIaPergsGeradas(validadas);
        setIaFeedback({ txt: `✅ ${validadas.length} perguntas formuladas com sucesso diretamente do seu documento pela IA do Gemini!`, tipo: 'ok' });
        setIaLoading(false);
        return;
      } catch (err) {
        console.error('Erro na API do Gemini:', err);
        setIaFeedback({ txt: `⚠️ Falha na API do Gemini: ${err.message}. Ativando simulação local...`, tipo: 'warn' });
        // Deixa seguir para o fallback local
      }
    }

    // Fallback Local se a API não estiver configurada ou falhar
    setTimeout(() => {
      const bancoMock = {
        'História': [
          { tipo: 'mc', txt: 'Quem assinou a abolição da escravidão no Brasil através da Lei Áurea?', alts: ['D. Pedro II', 'D. João VI', 'Princesa Isabel', 'José do Patrocínio'], resp: 2 },
          { tipo: 'vf', txt: 'O Brasil proclamou sua independência de Portugal no dia 7 de Setembro de 1822.', resp: 'v' },
          { tipo: 'mc', txt: 'Em qual ano teve início a Primeira Guerra Mundial?', alts: ['1912', '1914', '1918', '1939'], resp: 1 },
          { tipo: 'vf', txt: 'A Revolução Francesa começou em 1789 com a queda da Bastilha.', resp: 'v' },
          { tipo: 'veloc', txt: 'Quem foi o primeiro presidente da República no Brasil?', resp: 'Marechal Deodoro da Fonseca' },
          { tipo: 'mc', txt: 'Qual civilização antiga construiu as famosas Pirâmides de Gizé?', alts: ['Maias', 'Romanos', 'Egípcios', 'Gregos'], resp: 2 }
        ],
        'Matemática': [
          { tipo: 'mc', txt: 'Qual é o valor da raiz quadrada de 144?', alts: ['10', '12', '14', '16'], resp: 1 },
          { tipo: 'vf', txt: 'A soma dos ângulos internos de um triângulo é sempre 180 graus.', resp: 'v' },
          { tipo: 'mc', txt: 'Se x + 7 = 15, qual é o valor de x?', alts: ['6', '7', '8', '9'], resp: 2 },
          { tipo: 'vf', txt: 'O número 1 é considerado um número primo.', resp: 'f' },
          { tipo: 'veloc', txt: 'Quanto é a metade de 150 multiplicado por 2?', resp: '150' },
          { tipo: 'mc', txt: 'Qual é a fórmula da área de um círculo?', alts: ['2 * pi * r', 'pi * r^2', 'pi * d', 'r^2'], resp: 1 }
        ],
        'Geografia': [
          { tipo: 'mc', txt: 'Qual é a capital de Roraima?', alts: ['Porto Velho', 'Macapá', 'Boa Vista', 'Palmas'], resp: 2 },
          { tipo: 'vf', txt: 'O maior país em extensão territorial do mundo é a Rússia.', resp: 'v' },
          { tipo: 'mc', txt: 'Qual é o rio mais extenso do planeta?', alts: ['Rio Nilo', 'Rio Amazonas', 'Rio Mississippi', 'Rio Yangtzé'], resp: 1 },
          { tipo: 'vf', txt: 'A linha do equador divide a Terra em Leste e Oeste.', resp: 'f' },
          { tipo: 'veloc', txt: 'Qual é o país conhecido como a "Terra do Sol Nascente"?', resp: 'Japão' }
        ],
        'Ciências': [
          { tipo: 'mc', txt: 'Qual elemento químico é representado pela letra O na tabela periódica?', alts: ['Ouro', 'Oxigênio', 'Ósmio', 'Ozônio'], resp: 1 },
          { tipo: 'vf', txt: 'A água congela a exatamente 0 graus Celsius ao nível do mar.', resp: 'v' },
          { tipo: 'mc', txt: 'Qual planeta do sistema solar é conhecido como o Planeta Vermelho?', alts: ['Vênus', 'Marte', 'Júpiter', 'Saturno'], resp: 1 },
          { tipo: 'vf', txt: 'O sol é um planeta gasoso gigante.', resp: 'f' },
          { tipo: 'veloc', txt: 'Qual é a velocidade aproximada da luz no vácuo?', resp: '300.000 km/s' }
        ],
        'Cinema': [
          { tipo: 'mc', txt: 'Quem dirigiu o aclamado filme "Titanic" (1997)?', alts: ['Steven Spielberg', 'Christopher Nolan', 'James Cameron', 'Quentin Tarantino'], resp: 2 },
          { tipo: 'vf', txt: 'O filme "Parasita" foi o primeiro filme em língua estrangeira a ganhar o Oscar de Melhor Filme.', resp: 'v' },
          { tipo: 'mc', txt: 'Quantos filmes compõem a trilogia original de Star Wars?', alts: ['3', '6', '9', '12'], resp: 0 },
          { tipo: 'vf', txt: 'O ator Leonardo DiCaprio ganhou o Oscar de Melhor Ator por Titanic.', resp: 'f' },
          { tipo: 'veloc', txt: 'Qual filme animado da Disney apresenta a música "Let It Go"?', resp: 'Frozen' }
        ],
        'Ensino Religioso': [
          { tipo: 'mc', txt: 'Qual é o livro sagrado do Islã?', alts: ['A Bíblia', 'A Torá', 'O Alcorão', 'Os Vedas'], resp: 2 },
          { tipo: 'vf', txt: 'O Budismo é uma tradição filosófico-religiosa que não prega a existência de um Deus criador pessoal.', resp: 'v' },
          { tipo: 'mc', txt: 'No Hinduísmo, como é chamado o conceito que representa o ciclo de nascimento, morte e renascimento (reencarnação)?', alts: ['Dharma', 'Karma', 'Nirvana', 'Samsara'], resp: 3 },
          { tipo: 'vf', txt: 'A Regra de Ouro ("trate os outros como gostaria de ser tratado") é um princípio ético universal presente em quase todas as grandes tradições de fé e filosofias.', resp: 'v' },
          { tipo: 'veloc', txt: 'Qual é o nome da principal figura histórica e mestre espiritual cuja vida e ensinamentos fundaram o Cristianismo?', resp: 'Jesus Cristo' },
          { tipo: 'mc', txt: 'Qual destas comemorações religiosas celebra a libertação do povo hebreu da escravidão no antigo Egito?', alts: ['Hanukkah', 'Pessach (Páscoa)', 'Yom Kippur', 'Rosh Hashaná'], resp: 1 }
        ]
      };

      // Obter perguntas mock do tema de forma case-insensitive
      const temaEncontrado = Object.keys(bancoMock).find(k => k.toLowerCase() === materia.toLowerCase());
      let pool = temaEncontrado ? bancoMock[temaEncontrado] : null;

      // Se a matéria for desconhecida, fazemos um pool misto de todos os temas
      if (!pool) {
        pool = [];
        Object.keys(bancoMock).forEach(key => {
          pool = pool.concat(bancoMock[key]);
        });
      }

      // Filtrar pelos tipos aceitos pelo usuário
      let filtrados = pool.filter(p => tiposDisponiveis.includes(p.tipo));
      if (!filtrados.length) filtrados = pool; // Fallback se nada bater

      // Selecionar de forma aleatória a quantidade pedida
      const embaralhadas = [...filtrados].sort(() => Math.random() - 0.5);
      const selecionadas = embaralhadas.slice(0, Math.min(iaQtd, embaralhadas.length)).map(p => ({
        ...p,
        turma: iaTurma.trim() || 'Sem Turma',
        mat: materia,
        tema: iaTema.trim() || 'Geral'
      }));

      setIaPergsGeradas(selecionadas);
      setIaFeedback({
        txt: geminiKey.trim()
          ? `✨ Modo Simulação Ativo: A API do Gemini falhou ou retornou inválido. Geramos perguntas simuladas para o tema "${materia}"!`
          : `✨ Modo Simulação: Para ler PDFs reais, insira sua chave do Gemini. Geramos perguntas simuladas para o tema "${materia}"!`,
        tipo: 'ok'
      });
      setIaLoading(false);
    }, 1500);
  };

  const confirmarImportacaoIA = (modo) => {
    if (!iaPergsGeradas.length) return;
    if (modo === 'sub') {
      setPerguntas(iaPergsGeradas);
      const matsUnicas = iaPergsGeradas.map(p => p.mat).filter((v, i, a) => a.indexOf(v) === i);
      setMaterias(matsUnicas);
    } else {
      const novas = [...perguntas, ...iaPergsGeradas];
      setPerguntas(novas);
      sincMaterias(novas);
    }
    setIaFeedback({ txt: `✅ ${iaPergsGeradas.length} perguntas importadas com sucesso ao banco de dados principal!`, tipo: 'ok' });
    setIaPergsGeradas([]);
  };

  // --- CADASTRO MANUAL E IMPORTAÇÃO ---
  const adicionarMateriaManual = () => {
    const text = cadMateriaText.trim();
    if (!text) {
      alert('Por favor, digite o nome da matéria!');
      return;
    }
    if (materias.includes(text)) {
      alert('Essa matéria já está cadastrada!');
      return;
    }
    setMaterias([...materias, text]);
    setCadMateriaText('');
  };

  const deletarMateria = (idx) => {
    if (!window.confirm('Aviso: Isso excluirá todas as perguntas vinculadas a esta matéria. Prosseguir?')) return;
    const matNome = materias[idx];
    setMaterias(materias.filter((_, i) => i !== idx));
    setPerguntas(perguntas.filter(p => p.mat !== matNome));
  };

  const adicionarPerguntaManual = () => {
    const mat = cadMateriaSelected || materias[0] || 'Geral';
    if (!mat) {
      alert('Cadastre uma matéria primeiro!');
      return;
    }
    const txt = cadPerguntaText.trim();
    if (!txt) {
      alert('Digite o texto da pergunta!');
      return;
    }

    const turma = cadTurmaText.trim() || 'Sem Turma';
    const tema = cadTemaText.trim() || 'Geral';

    const obj = { mat, turma, tema, tipo: cadTipoSelected, txt };

    if (cadTempoCustomEnabled) {
      obj.tempo = cadTempoVal === 0 ? null : cadTempoVal;
    }

    if (cadTipoSelected === 'mc') {
      if (cadMcAlts.some(a => !a.trim())) {
        alert('Preencha todas as 4 alternativas de múltipla escolha!');
        return;
      }
      obj.alts = [...cadMcAlts];
      obj.resp = Number(cadMcResp);
    } else if (cadTipoSelected === 'vf') {
      obj.resp = cadVfResp;
    } else {
      obj.resp = cadVelocResp.trim() || 'N/A';
    }

    setPerguntas([...perguntas, obj]);
    setCadPerguntaText('');
    setCadMcAlts(['', '', '', '']);
    setCadMcResp(0);
    setCadVfResp('v');
    setCadVelocResp('');
    setCadTempoCustomEnabled(false);
    setCadTempoVal(15);
    setCadTurmaText('');
    setCadTemaText('');
    alert('Pergunta cadastrada com sucesso!');
  };

  const deletarPergunta = (idx) => {
    setPerguntas(perguntas.filter((_, i) => i !== idx));
  };

  const limparTodasPerguntas = () => {
    if (!window.confirm('Tem certeza absoluta de que deseja APAGAR TODAS as matérias e perguntas do banco?')) return;
    setMaterias([]);
    setPerguntas([]);
  };

  // HELPER PARA FILTRAR PERGUNTAS DA PARTIDA
  const obterPerguntasFiltradasPartida = () => {
    return perguntas.filter(p => {
      const pTurma = p.turma || 'Sem Turma';
      const pMat = p.mat || 'Geral';
      const pTema = p.tema || 'Geral';

      const matchTurma = selTurmas.length === 0 || selTurmas.includes(pTurma);
      const matchMateria = selMaterias.length === 0 || selMaterias.includes(pMat);
      const matchTema = selTemas.length === 0 || selTemas.includes(pTema);

      return matchTurma && matchMateria && matchTema;
    });
  };

  // SISTEMA DE EXPORTAÇÃO E IMPORTAÇÃO DE BACKUPS (JSON)
  const exportarPerguntasBackup = () => {
    try {
      const backupObj = {
        dataBackup: new Date().toISOString(),
        materias: materias,
        perguntas: perguntas
      };
      const jsonStr = JSON.stringify(backupObj, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `duelo_sala_backup_${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e) {
      alert('Erro ao exportar backup: ' + e.message);
    }
  };

  const importarPerguntasBackup = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const json = JSON.parse(evt.target.result);
        if (!json || !Array.isArray(json.perguntas)) {
          throw new Error('Arquivo de backup inválido. O arquivo JSON deve conter uma lista de perguntas.');
        }

        const importadas = json.perguntas.map(p => ({
          turma: p.turma || 'Sem Turma',
          mat: p.mat || 'Geral',
          tema: p.tema || 'Geral',
          tipo: p.tipo || 'mc',
          txt: p.txt || '',
          alts: Array.isArray(p.alts) ? p.alts : undefined,
          resp: p.resp !== undefined ? p.resp : '',
          tempo: p.tempo !== undefined ? p.tempo : undefined
        }));

        const confirmacao = window.confirm(
          `Backup lido com sucesso!\n` +
          `Encontramos ${importadas.length} perguntas e ${json.materias?.length || 0} matérias no backup.\n\n` +
          `Clique em OK para MESCLAR estas perguntas às perguntas atuais do banco de dados.\n` +
          `Clique em CANCELAR para SUBSTITUIR completamente o banco atual pelas perguntas do backup.`
        );

        if (confirmacao) {
          // MESCLAR
          const novasPerguntas = [...perguntas, ...importadas];
          setPerguntas(novasPerguntas);
          
          const novasMats = [...materias];
          if (Array.isArray(json.materias)) {
            json.materias.forEach(m => {
              if (!novasMats.includes(m)) novasMats.push(m);
            });
          }
          importadas.forEach(p => {
            if (!novasMats.includes(p.mat)) novasMats.push(p.mat);
          });
          setMaterias(novasMats);
          alert(`Backup mesclado com sucesso! ${importadas.length} perguntas adicionadas.`);
        } else {
          // SUBSTITUIR
          const subConfirm = window.confirm('ATENÇÃO: Você escolheu SUBSTITUIR. Todas as perguntas e matérias atuais serão APAGADAS permanentemente e substituídas pelas perguntas do backup. Tem certeza?');
          if (subConfirm) {
            setPerguntas(importadas);
            const matsUnicas = Array.isArray(json.materias) && json.materias.length > 0 
              ? json.materias 
              : Array.from(new Set(importadas.map(p => p.mat))).filter(Boolean);
            setMaterias(matsUnicas);
            alert(`Banco substituído com sucesso! ${importadas.length} perguntas restauradas.`);
          }
        }
      } catch (err) {
        alert('Erro ao carregar arquivo de backup: ' + err.message);
      } finally {
        e.target.value = '';
      }
    };
    reader.readAsText(file);
  };

  // IMPORTAÇÃO DE PLANILHA VIA XLSX
  const processarPlanilha = (e) => {
    setPlanilhaFeedback({ txt: '⏳ Analisando arquivo de planilha...', tipo: 'warn' });
    const file = e.target.files?.[0] || e.dataTransfer?.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = new Uint8Array(evt.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' });

        if (!rows.length) throw new Error('A planilha está vazia!');

        const norm = (s) => String(s).toLowerCase().trim().replace(/\s+/g, '_').normalize('NFD').replace(/[\u0300-\u036f]/g, '');

        const novas = [];
        const erros = [];

        rows.forEach((row, idx) => {
          const r = {};
          Object.keys(row).forEach(k => {
            r[norm(k)] = String(row[k]).trim();
          });

          const mat = r['materia'] || r['mat'] || 'Geral';
          const turma = r['turma'] || r['class'] || 'Sem Turma';
          const tema = r['tema'] || r['topic'] || r['subject'] || 'Geral';
          const tipo = (r['tipo'] || 'mc').toLowerCase();
          const txt = r['pergunta'] || r['question'] || '';
          const respRaw = (r['resposta'] || r['resp'] || '').toUpperCase();

          if (!txt) {
            erros.push(`Linha ${idx + 2}: Pergunta sem texto.`);
            return;
          }

          const t = (tipo === 'mc' || tipo === 'múltipla') ? 'mc' : (tipo === 'vf' || tipo === 'v/f') ? 'vf' : 'veloc';
          const obj = { mat, turma, tema, tipo: t, txt };

          const tempoRaw = r['tempo'] || r['time'] || '';
          let tempoVal = undefined;
          if (tempoRaw !== '') {
            const rawLower = String(tempoRaw).toLowerCase().trim();
            if (rawLower === 'sem_tempo' || rawLower === 'sem tempo' || rawLower === '0' || rawLower === 'infinito' || rawLower === '∞') {
              tempoVal = null;
            } else {
              const parsedTempo = parseInt(tempoRaw, 10);
              if (!isNaN(parsedTempo) && parsedTempo > 0) {
                tempoVal = parsedTempo;
              }
            }
          }

          if (tempoVal !== undefined) {
            obj.tempo = tempoVal;
          }

          if (t === 'mc') {
            const a = [r['alt_a'] || r['a'] || '', r['alt_b'] || r['b'] || '', r['alt_c'] || r['c'] || '', r['alt_d'] || r['d'] || ''];
            if (a.some(x => !x)) {
              erros.push(`Linha ${idx + 2}: Alternativas incompletas para Múltipla Escolha.`);
              return;
            }
            const mapa = { A: 0, B: 1, C: 2, D: 3 };
            if (!(respRaw in mapa)) {
              erros.push(`Linha ${idx + 2}: Resposta da Alt. inválida (deve ser A, B, C ou D).`);
              return;
            }
            obj.alts = a;
            obj.resp = mapa[respRaw];
          } else if (t === 'vf') {
            const rv = (respRaw === 'V' || respRaw === 'VERDADEIRO') ? 'v' : (respRaw === 'F' || respRaw === 'FALSO') ? 'f' : null;
            if (!rv) {
              erros.push(`Linha ${idx + 2}: Resposta V/F inválida (deve ser V ou F).`);
              return;
            }
            obj.resp = rv;
          } else {
            obj.resp = r['resposta'] || 'N/A';
          }

          novas.push(obj);
        });

        if (!novas.length) {
          setPlanilhaFeedback({ txt: `❌ Nenhuma pergunta válida encontrada na planilha!\n${erros.join('\n')}`, tipo: 'err' });
          return;
        }

        setPlanilhaNovasPerguntas(novas);
        setPlanilhaFeedback({ txt: `✅ Planilha analisada! ${novas.length} perguntas prontas para importação (erros ignorados: ${erros.length}).`, tipo: 'ok' });

      } catch (err) {
        setPlanilhaFeedback({ txt: `❌ Erro de processamento: ${err.message}`, tipo: 'err' });
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const confirmarImportacaoPlanilha = (modo) => {
    if (!planilhaNovasPerguntas.length) return;
    if (modo === 'sub') {
      setPerguntas(planilhaNovasPerguntas);
      const matsUnicas = planilhaNovasPerguntas.map(p => p.mat).filter((v, i, a) => a.indexOf(v) === i);
      setMaterias(matsUnicas);
    } else {
      const novas = [...perguntas, ...planilhaNovasPerguntas];
      setPerguntas(novas);
      sincMaterias(novas);
    }
    alert(`Sucesso! ${planilhaNovasPerguntas.length} perguntas importadas.`);
    setPlanilhaNovasPerguntas([]);
    setPlanilhaFeedback(null);
  };

  // Gerador de Planilha Modelo
  const baixarModeloExcel = () => {
    const data = [
      { turma: '8º Ano A', materia: 'Geografia', tema: 'Europa', tipo: 'mc', pergunta: 'Qual é a capital da França?', alt_a: 'Londres', alt_b: 'Madri', alt_c: 'Berlim', alt_d: 'Paris', resposta: 'D', tempo: 20 },
      { turma: '8º Ano A', materia: 'Geografia', tema: 'América do Sul', tipo: 'vf', pergunta: 'O Brasil é o maior país da América do Sul.', alt_a: '', alt_b: '', alt_c: '', alt_d: '', resposta: 'V', tempo: 'sem tempo' },
      { turma: '9º Ano B', materia: 'História', tema: 'Guerras Mundiais', tipo: 'veloc', pergunta: 'Em que ano iniciou a Segunda Guerra Mundial?', alt_a: '', alt_b: '', alt_c: '', alt_d: '', resposta: '1939', tempo: '' }
    ];
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Modelo_Duelo');
    XLSX.writeFile(wb, 'modelo_perguntas_duelo.xlsx');
  };

  // --- SELEÇÃO E INICIALIZAÇÃO DO JOGO ---
  const toggleMateriaSelecao = (mat) => {
    setMateriasSelecionadas(prev =>
      prev.includes(mat) ? prev.filter(x => x !== mat) : [...prev, mat]
    );
  };

  const confirmarSelecaoMaterias = () => {
    const filtradas = obterPerguntasFiltradasPartida();
    if (!filtradas.length) {
      alert('Nenhuma pergunta atende aos critérios selecionados! Por favor, ajuste os filtros.');
      return;
    }
    irParaTela('nomes');
  };

  const obterLimiteTempo = (pergunta) => {
    if (!pergunta) return null;
    if (pergunta.tempo !== undefined && pergunta.tempo !== null) {
      return pergunta.tempo;
    }
    return globalTimerEnabled ? globalTempo : null;
  };

  const iniciarJogoDuelo = () => {
    let poolFinal = [];
    
    // Obter os assuntos correspondentes aos filtros
    const assuntos = Array.from(new Set(
      obterPerguntasFiltradasPartida().map(p => {
        const t = p.turma || 'Sem Turma';
        const m = p.mat || 'Geral';
        const te = p.tema || 'Geral';
        return `${t}||${m}||${te}`;
      })
    )).map(key => {
      const [turma, mat, tema] = key.split('||');
      const pergsDoAssunto = perguntas.filter(p => 
        (p.turma || 'Sem Turma') === turma && 
        (p.mat || 'Geral') === mat && 
        (p.tema || 'Geral') === tema
      );
      return { key, pergs: pergsDoAssunto, total: pergsDoAssunto.length };
    });

    // Para cada assunto, adicionar a quantidade de perguntas escolhidas à pool
    assuntos.forEach(ass => {
      const qtdEscolhida = composicaoQuiz[ass.key] !== undefined 
        ? Math.min(composicaoQuiz[ass.key], ass.total) 
        : ass.total;

      if (qtdEscolhida > 0) {
        const pergsEmbaralhadasAssunto = [...ass.pergs].sort(() => Math.random() - 0.5);
        const selecionadas = pergsEmbaralhadasAssunto.slice(0, qtdEscolhida);
        poolFinal = [...poolFinal, ...selecionadas];
      }
    });

    // Embaralhar o pool final consolidado
    const poolEmbaralhadoCompleto = [...poolFinal].sort(() => Math.random() - 0.5);

    if (poolEmbaralhadoCompleto.length === 0) {
      alert('Nenhuma pergunta selecionada para o duelo! Por favor, selecione pelo menos 1 pergunta.');
      return;
    }

    setFila(poolEmbaralhadoCompleto);
    setPts([0, 0]);
    setRodAtual(1);
    setHistorico([]);
    setRespJ([null, null]);
    setOrdemResp([]);
    setVelocBateu(null);
    setVelocRevelado(false); // Reset de gabarito revelado
    setRodDescanso(false);
    
    // Reset de tempos individuais
    temposRespRef.current = [null, null];

    // Reset de poderes para nova partida
    setPoderes([
      { block: 1, double: 1, half: 1 },
      { block: 1, double: 1, half: 1 }
    ]);
    setEfeitosRodada({
      bloqueado: null,
      rodadaDupla: false,
      dica: [false, false]
    });
    setDicaExcluidas([]);

    setTela('jogo');
    playSound('click');

    setApostasRodada([null, null]);
    setApostasConfirmadas([false, false]);
    setRevelandoApostas(false);

    if (modoApostas) {
      setFaseJogo('aposta');
    } else {
      setFaseJogo('pergunta');
      iniciarRodadaTimer(poolEmbaralhadoCompleto[0]);
    }
  };

  // GESTÃO DO TIMER DE CADA RODADA
  const iniciarRodadaTimer = (pergunta) => {
    if (timerIntRef.current) clearInterval(timerIntRef.current);
    
    const limite = obterLimiteTempo(pergunta);
    rodInicioRef.current = Date.now();
    temposRespRef.current = [null, null]; // Reset de tempos individuais

    if (limite === null) {
      setTimerSeg(null); // Sem limite
    } else {
      setTimerSeg(limite);
      timerIntRef.current = setInterval(() => {
        setTimerSeg(prev => {
          if (prev === null) return null;
          if (prev <= 1) {
            clearInterval(timerIntRef.current);
            encerrarRodadaPorTempo();
            return 0;
          }
          // Tocar som de tick se estiver nos últimos 5 segundos da rodada
          if (prev <= 5) {
            playSound('tick');
          }
          return prev - 1;
        });
      }, 1000);
    }
  };

  const encerrarRodadaPorTempo = () => {
    setRodDescanso(true);
    if (timerIntRef.current) clearInterval(timerIntRef.current);

    // Avaliar e pontuar respostas dadas até o momento
    setRespJ(prev => {
      const p = fila[rodAtual - 1];
      const novasPontuacoes = [...pts];
      const limite = (p && p.tempo !== undefined && p.tempo !== null) ? p.tempo : (globalTimerEnabled ? globalTempo : null);
      const limiteEficaz = limite !== null ? limite : 0;
      let alguemAcertou = false;

      // Calcular quem pontua nas de Múltipla Escolha e V/F
      if (p.tipo === 'mc' || p.tipo === 'vf') {
        const respostaCerta = p.resp;
        const acertos = [false, false];

        for (let j = 0; j < 2; j++) {
          const apostaMult = (modoApostas && apostasRodada[j] !== null) ? apostasRodada[j] : 1.0;
          if (prev[j] !== null) {
            const acertou = String(prev[j]) === String(respostaCerta);
            acertos[j] = acertou;
            if (acertou) {
              alguemAcertou = true;
              // Fórmula Kahoot: 1000 a 500 pontos dependendo do tempo gasto individual
              let ganho = 1000;
              if (limiteEficaz > 0) {
                const tempoGasto = temposRespRef.current[j] !== null ? temposRespRef.current[j] : limiteEficaz;
                const proporcao = Math.max(0, Math.min(1, tempoGasto / limiteEficaz));
                ganho = Math.round((1 - (proporcao / 2)) * 1000);
              }
              // Dobrar se pontos duplos estiver ativo na rodada (moderador)!
              if (efeitosRodada.rodadaDupla) {
                ganho *= 2;
              }
              if (modoApostas) {
                ganho = Math.round(ganho * apostaMult);
              }
              novasPontuacoes[j] += ganho;
            } else {
              // Errou a resposta
              if (modoApostas) {
                const perda = Math.round(1000 * apostaMult);
                novasPontuacoes[j] = Math.max(0, novasPontuacoes[j] - perda);
              }
            }
          } else {
            // Não respondeu (tempo esgotado no Modo Apostas)
            if (modoApostas && efeitosRodada.bloqueado !== j) {
              const perda = Math.round(1000 * apostaMult);
              novasPontuacoes[j] = Math.max(0, novasPontuacoes[j] - perda);
            }
          }
        }
        setPts(novasPontuacoes);
        if (alguemAcertou) {
          playSound('success');
        } else {
          playSound('error');
        }
      } else {
        // Velocidade que estourou o tempo (Se modo aposta ativo, penaliza quem não bateu se houver regra de aposta, mas em velocidade a omissão de batida de ambos não penaliza)
        playSound('error');
      }

      // Adicionar no histórico
      const j1Desc = prev[0] !== null ? (p.tipo === 'mc' ? KAHOOT[prev[0]].name : prev[0] === 'v' ? 'Verdadeiro' : 'Falso') : 'Não respondeu';
      const j2Desc = prev[1] !== null ? (p.tipo === 'mc' ? KAHOOT[prev[1]].name : prev[1] === 'v' ? 'Verdadeiro' : 'Falso') : 'Não respondeu';
      const histItem = {
        rodada: rodAtual,
        txt: p.txt,
        tipo: p.tipo,
        j1: j1Desc,
        j2: j2Desc,
        correta: p.tipo === 'mc' ? KAHOOT[p.resp].name : p.tipo === 'vf' ? (p.resp === 'v' ? 'Verdadeiro' : 'Falso') : p.resp,
        pontos: [...novasPontuacoes]
      };
      setHistorico(h => [...h, histItem]);

      return prev;
    });
  };

  // --- FUNÇÃO PARA ACIONAR CARTAS DE PODER ---
  const usarPoder = (equipe, tipoPoder) => {
    if (rodDescanso || tela !== 'jogo') return;

    // Se o jogador estiver bloqueado nesta rodada, ele não pode usar NENHUM poder
    if (efeitosRodada.bloqueado === equipe) return;

    // Verificar se o poder já foi usado
    if (poderes[equipe][tipoPoder] <= 0) return;

    const p = fila[rodAtual - 1];
    if (!p) return;

    // Debitar o poder da equipe
    const novosPoderes = [...poderes];
    novosPoderes[equipe] = {
      ...novosPoderes[equipe],
      [tipoPoder]: 0
    };
    setPoderes(novosPoderes);

    // Aplicar os efeitos
    if (tipoPoder === 'block') {
      playSound('block');
      const oponente = equipe === 0 ? 1 : 0;
      setEfeitosRodada(prev => ({
        ...prev,
        bloqueado: oponente
      }));
      // Se a equipe atual já respondeu e acabou de bloquear o oponente, fecha a rodada imediatamente!
      if (respJ[equipe] !== null) {
        fecharRodadaImediato(respJ, ordemResp);
      }
    } else if (tipoPoder === 'half') {
      playSound('half');
      if (p.tipo !== 'mc') return; // 50/50 só funciona para múltipla escolha
      
      const novosDicas = [...efeitosRodada.dica];
      novosDicas[equipe] = true;
      setEfeitosRodada(prev => ({
        ...prev,
        dica: novosDicas
      }));

      // Selecionar 2 alternativas incorretas para excluir
      const corretora = p.resp;
      const incorretas = [0, 1, 2, 3].filter(idx => idx !== corretora);
      const excluidas = incorretas.sort(() => Math.random() - 0.5).slice(0, 2);
      setDicaExcluidas(excluidas);
    }
  };

  // TRATAMENTO DE RESPOSTA ATIVA DO JOGADOR
  const responderPerguntaMC = (jogador, slot) => {
    if (respJ[jogador] !== null || rodDescanso) return; // Já respondeu ou travado
    if (efeitosRodada.bloqueado === jogador) return; // Ignora se este jogador estiver bloqueado

    // Registrar o tempo individual gasto
    if (temposRespRef.current[jogador] === null) {
      temposRespRef.current[jogador] = (Date.now() - rodInicioRef.current) / 1000;
    }

    const novasRespostas = [...respJ];
    novasRespostas[jogador] = slot;
    setRespJ(novasRespostas);

    const novaOrdem = [...ordemResp, jogador];
    setOrdemResp(novaOrdem);

    const oponente = jogador === 0 ? 1 : 0;
    // Se ambos responderam, ou se o oponente está bloqueado
    if ((novasRespostas[0] !== null && novasRespostas[1] !== null) || (efeitosRodada.bloqueado === oponente)) {
      fecharRodadaImediato(novasRespostas, novaOrdem);
    }
  };

  const responderPerguntaVF = (jogador, valor) => {
    if (respJ[jogador] !== null || rodDescanso) return;
    if (efeitosRodada.bloqueado === jogador) return; // Ignora se estiver bloqueado

    // Registrar o tempo individual gasto
    if (temposRespRef.current[jogador] === null) {
      temposRespRef.current[jogador] = (Date.now() - rodInicioRef.current) / 1000;
    }

    const novasRespostas = [...respJ];
    novasRespostas[jogador] = valor;
    setRespJ(novasRespostas);

    const novaOrdem = [...ordemResp, jogador];
    setOrdemResp(novaOrdem);

    const oponente = jogador === 0 ? 1 : 0;
    if ((novasRespostas[0] !== null && novasRespostas[1] !== null) || (efeitosRodada.bloqueado === oponente)) {
      fecharRodadaImediato(novasRespostas, novaOrdem);
    }
  };

  // Batida de botão de velocidade
  const baterVelocidade = (jogador) => {
    if (velocBateu !== null || rodDescanso) return; // Alguém já bateu ou travado
    if (efeitosRodada.bloqueado === jogador) return; // Ignora se estiver bloqueado
    playSound('buzzer');
    setVelocBateu(jogador);
    if (timerIntRef.current) clearInterval(timerIntRef.current);
  };

  const julgarVelocidade = (acertou) => {
    setRodDescanso(true);
    const p = fila[rodAtual - 1];
    const novasPontuacoes = [...pts];

    if (acertou && velocBateu !== null) {
      playSound('success');
      let ganho = 1200; // Pontuação fixa de velocidade
      // Dobrar se pontos duplos estiver ativo na rodada (moderador)!
      if (efeitosRodada.rodadaDupla) {
        ganho *= 2;
      }
      if (modoApostas) {
        const apostaMult = (apostasRodada[velocBateu] !== null) ? apostasRodada[velocBateu] : 1.0;
        ganho = Math.round(ganho * apostaMult);
      }
      novasPontuacoes[velocBateu] += ganho; 
      setPts(novasPontuacoes);
    } else {
      playSound('error');
      if (modoApostas && velocBateu !== null) {
        const apostaMult = (apostasRodada[velocBateu] !== null) ? apostasRodada[velocBateu] : 1.0;
        const perda = Math.round(1000 * apostaMult);
        novasPontuacoes[velocBateu] = Math.max(0, novasPontuacoes[velocBateu] - perda);
        setPts(novasPontuacoes);
      }
    }

    const bateuNome = velocBateu === 0 ? nomeJ1 : nomeJ2;
    const julg = acertou ? 'Acertou!' : 'Errou!';

    const histItem = {
      rodada: rodAtual,
      txt: p.txt,
      tipo: p.tipo,
      j1: velocBateu === 0 ? `Bateu (${julg})` : 'Não respondeu',
      j2: velocBateu === 1 ? `Bateu (${julg})` : 'Não respondeu',
      correta: p.resp,
      pontos: [...novasPontuacoes]
    };
    setHistorico(h => [...h, histItem]);
  };

  const fecharRodadaImediato = (respostasFinais, ordemFinal) => {
    setRodDescanso(true);
    if (timerIntRef.current) clearInterval(timerIntRef.current);

    const p = fila[rodAtual - 1];
    const novasPontuacoes = [...pts];
    const tempoFinal = Date.now();
    const tempoGasto = (tempoFinal - rodInicioRef.current) / 1000;

    const respostaCerta = p.resp;
    const limite = (p && p.tempo !== undefined && p.tempo !== null) ? p.tempo : (globalTimerEnabled ? globalTempo : null);
    const limiteEficaz = limite !== null ? limite : 0;

    let alguemAcertou = false;
    for (let j = 0; j < 2; j++) {
      const resp = respostasFinais[j];
      const acertou = String(resp) === String(respostaCerta);
      const apostaMult = (modoApostas && apostasRodada[j] !== null) ? apostasRodada[j] : 1.0;

      if (acertou) {
        alguemAcertou = true;
        // Fórmula Kahoot: 1000 a 500 pontos dependendo do tempo gasto individual
        let ganho = 1000;
        if (limiteEficaz > 0) {
          const tempoGastoIndiv = temposRespRef.current[j] !== null ? temposRespRef.current[j] : tempoGasto;
          const proporcao = Math.max(0, Math.min(1, tempoGastoIndiv / limiteEficaz));
          ganho = Math.round((1 - (proporcao / 2)) * 1000);
        }
        // Dobrar se pontos duplos estiver ativo na rodada (moderador)!
        if (efeitosRodada.rodadaDupla) {
          ganho *= 2;
        }
        if (modoApostas) {
          ganho = Math.round(ganho * apostaMult);
        }
        novasPontuacoes[j] += ganho;
      } else {
        // Errou a resposta ativamente (e não estava bloqueado)
        if (modoApostas && resp !== null && efeitosRodada.bloqueado !== j) {
          const perda = Math.round(1000 * apostaMult);
          novasPontuacoes[j] = Math.max(0, novasPontuacoes[j] - perda);
        }
      }
    }
    setPts(novasPontuacoes);
    if (alguemAcertou) {
      playSound('success');
    } else {
      playSound('error');
    }

    const j1Desc = respostasFinais[0] !== null ? (p.tipo === 'mc' ? KAHOOT[respostasFinais[0]].name : respostasFinais[0] === 'v' ? 'Verdadeiro' : 'Falso') : 'Não respondeu';
    const j2Desc = respostasFinais[1] !== null ? (p.tipo === 'mc' ? KAHOOT[respostasFinais[1]].name : respostasFinais[1] === 'v' ? 'Verdadeiro' : 'Falso') : 'Não respondeu';

    const histItem = {
      rodada: rodAtual,
      txt: p.txt,
      tipo: p.tipo,
      j1: j1Desc,
      j2: j2Desc,
      correta: p.tipo === 'mc' ? KAHOOT[p.resp].name : p.tipo === 'vf' ? (p.resp === 'v' ? 'Verdadeiro' : 'Falso') : p.resp,
      pontos: [...novasPontuacoes]
    };
    setHistorico(h => [...h, histItem]);
  };

  const avancarPergunta = () => {
    if (rodAtual >= fila.length) {
      playSound('victory');
      setTela('fim');
    } else {
      const proximaRodada = rodAtual + 1;
      setRodAtual(proximaRodada);
      setRespJ([null, null]);
      setOrdemResp([]);
      setVelocBateu(null);
      setVelocRevelado(false); // Reset de gabarito revelado
      setRodDescanso(false);
      setEfeitosRodada({
        bloqueado: null,
        rodadaDupla: false,
        dica: [false, false]
      });
      setDicaExcluidas([]);
      temposRespRef.current = [null, null]; // Reset dos tempos individuais
      
      setApostasRodada([null, null]);
      setApostasConfirmadas([false, false]);
      setRevelandoApostas(false);

      if (modoApostas) {
        setFaseJogo('aposta');
      } else {
        setFaseJogo('pergunta');
        iniciarRodadaTimer(fila[rodAtual]);
      }
    }
  };

  const revelarELiberarPergunta = () => {
    setRevelandoApostas(true);
    playSound('reveal');
    
    // Revela as apostas por 2 segundos antes de iniciar
    setTimeout(() => {
      setRevelandoApostas(false);
      setFaseJogo('pergunta');
      
      const p = fila[rodAtual - 1];
      if (p) {
        iniciarRodadaTimer(p);
      }
    }, 2000);
  };

  // --- RENDERS DE TELAS ---

  return (
    <div style={{ width: '100%' }}>
      {/* 1. TELA MENU */}
      <div id="tela-menu" className={`tela ${tela === 'menu' ? 'ativa' : ''}`}>
        <div style={{ fontSize: '4.5rem', filter: 'drop-shadow(0 0 25px rgba(124, 58, 237, 0.4))' }}>🏆</div>
        <h1>Duelo na Sala</h1>
        <p>Jogo de disputa interativo para duas equipes</p>
        
        <button className="btn-menu btn-play" onClick={() => { setMateriasSelecionadas([]); irParaTela('selecao'); }}>
          ▶ Jogar Duelo
        </button>
        <button className="btn-menu btn-outline" onClick={() => { setIaPergsGeradas([]); setIaFeedback(null); irParaTela('ia'); }}>
          ✨ Gerar perguntas com IA
        </button>
        <button className="btn-menu btn-outline" onClick={() => { setFeedbackControles(null); setDetectMode(null); irParaTela('controles'); }}>
          🎮 Configurar controles
        </button>
        <button className="btn-menu btn-outline" onClick={() => { setCadTab('manual'); irParaTela('cadastro'); }}>
          ⚙️ Gerenciar perguntas
        </button>
      </div>

      {/* 2. TELA GERADOR IA */}
      <div id="tela-ia" className={`tela ${tela === 'ia' ? 'ativa' : ''}`}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '8px' }}>
          <button className="btn-volta" onClick={() => irParaTela('menu')}>← Voltar ao Menu</button>
          <h2 style={{ fontSize: '1.6rem', fontWeight: 900 }}>✨ Gerar perguntas com IA</h2>
        </div>

        <div className="card">
          <div style={{ marginBottom: '20px', padding: '14px', border: '1px solid rgba(139, 92, 246, 0.25)', borderRadius: '10px', background: 'rgba(139, 92, 246, 0.04)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 'bold', color: '#c4b5fd', fontSize: '0.95rem' }}>
              🔑 Chave de API do Gemini (Grátis)
            </label>
            <p style={{ color: '#9ca3af', fontSize: '0.78rem', margin: 0, lineHeight: '1.4' }}>
              Insira sua chave para que a IA analise e gere perguntas reais baseadas diretamente no seu arquivo PDF ou imagem. Obtenha uma chave grátis no <a href="https://aistudio.google.com/" target="_blank" rel="noopener noreferrer" style={{ color: '#a78bfa', textDecoration: 'underline', fontWeight: 600 }}>Google AI Studio</a>.
            </p>
            <input 
              type="password" 
              placeholder="Digite sua chave de API (Ex: AIzaSy...)" 
              value={geminiKey}
              onChange={(e) => setGeminiKey(e.target.value)}
              style={{ fontFamily: 'monospace', fontSize: '0.85rem', padding: '8px 12px', background: 'rgba(17, 24, 39, 0.5)' }}
            />
          </div>

          <div className="sec">📎 Fonte do Conteúdo para a IA</div>
          <div style={{ display: 'flex', gap: '8px', marginBottom: '14px', flexWrap: 'wrap' }}>
            <button 
              className={`tab ${iaSourceMode === 'file' ? 'ativa' : ''}`}
              style={{ padding: '8px 18px', fontSize: '0.85rem' }}
              onClick={() => setIaSourceMode('file')}
            >
              📄 Arquivo local (PDF ou Imagem)
            </button>
            <button 
              className={`tab ${iaSourceMode === 'url' ? 'ativa' : ''}`}
              style={{ padding: '8px 18px', fontSize: '0.85rem' }}
              onClick={() => setIaSourceMode('url')}
            >
              🔗 Link da Internet (URL)
            </button>
          </div>

          {iaSourceMode === 'file' ? (
            <>
              <p style={{ color: '#c4b5fd', fontSize: '0.88rem', marginBottom: '12px' }}>A IA analisará o material fornecido para formular as perguntas automaticamente.</p>
              <div 
                className="ia-drop" 
                id="ia-drop"
                onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add('drag'); }}
                onDragLeave={(e) => e.currentTarget.classList.remove('drag')}
                onDrop={handleIADrop}
                onClick={() => document.getElementById('ia-file-input').click()}
                style={{ marginBottom: '16px' }}
              >
                <input 
                  type="file" 
                  id="ia-file-input" 
                  accept="image/*,.pdf" 
                  style={{ display: 'none' }}
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleIAFile(f);
                  }}
                />
                <div style={{ fontSize: '3rem' }}>📂</div>
                <div style={{ color: '#c4b5fd', fontWeight: 700, marginTop: '6px' }}>
                  {iaFileName ? `Arquivo: ${iaFileName}` : 'Clique ou arraste uma imagem ou arquivo PDF aqui'}
                </div>
                <div style={{ color: '#6b7280', fontSize: '0.8rem' }}>JPG, PNG, GIF, WEBP, PDF</div>

                {iaFileType === 'img' && iaFileData && (
                  <img src={`data:${iaFileMediaType};base64,${iaFileData}`} className="ia-preview-img" alt="Preview" />
                )}
                {iaFileType === 'pdf' && iaFileName && (
                  <div className="ia-preview-pdf">
                    <span style={{ fontSize: '1.6rem' }}>📄</span>
                    <span>{iaFileName}</span>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '18px' }}>
              <p style={{ color: '#c4b5fd', fontSize: '0.88rem', marginBottom: '4px' }}>A IA acessará a URL de internet informada para extrair o texto e formular as perguntas.</p>
              <input 
                type="text" 
                placeholder="Cole o link da internet aqui (Ex: https://pt.wikipedia.org/wiki/...)" 
                value={iaUrl}
                onChange={(e) => setIaUrl(e.target.value)}
                style={{ fontSize: '0.9rem', padding: '12px', background: 'rgba(15, 52, 96, 0.4)' }}
              />
            </div>
          )}

          <label>Matéria / Tema das Perguntas</label>
          <input 
            id="ia-materia" 
            placeholder="Ex: História do Brasil, Física Quântica, Conhecimentos Gerais..." 
            value={iaMateria}
            onChange={(e) => setIaMateria(e.target.value)}
          />

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '14px' }}>
            <div>
              <label>Turma / Ano (Para salvar no banco)</label>
              <input 
                id="ia-turma" 
                placeholder="Ex: 8º Ano A..." 
                value={iaTurma}
                onChange={(e) => setIaTurma(e.target.value)}
                style={{ fontSize: '0.9rem', padding: '12px' }}
              />
            </div>
            <div>
              <label>Tema Específico (Opcional)</label>
              <input 
                id="ia-tema" 
                placeholder="Ex: Frações, Ásia..." 
                value={iaTema}
                onChange={(e) => setIaTema(e.target.value)}
                style={{ fontSize: '0.9rem', padding: '12px' }}
              />
            </div>
          </div>

          <label style={{ marginTop: '14px' }}>Instruções Extras / Prompt Adicional (Opcional)</label>
          <textarea 
            id="ia-prompt-instrucao" 
            placeholder="Ex: Foque em conceitos fáceis e divertidos; inclua fórmulas matemáticas simples; evite terminologias excessivamente difíceis..." 
            value={iaPromptInstrucao}
            onChange={(e) => setIaPromptInstrucao(e.target.value)}
            rows={3}
            style={{ 
              width: '100%', 
              padding: '12px', 
              borderRadius: '8px', 
              border: '1px solid rgba(255, 255, 255, 0.1)', 
              background: 'rgba(15, 52, 96, 0.4)', 
              color: '#fff', 
              fontFamily: 'inherit',
              fontSize: '0.9rem',
              resize: 'vertical',
              outline: 'none',
              marginTop: '6px'
            }}
          />

          <label style={{ marginTop: '14px' }}>Quantidade de perguntas: <span className="range-val">{iaQtd}</span></label>
          <div className="range-group">
            <span style={{ fontSize: '0.82rem', color: '#6b7280' }}>1</span>
            <input 
              type="range" 
              id="ia-qtd" 
              min="1" 
              max="20" 
              value={iaQtd} 
              onChange={(e) => setIaQtd(Number(e.target.value))}
            />
            <span style={{ fontSize: '0.82rem', color: '#6b7280' }}>20</span>
          </div>

          <label style={{ marginTop: '14px' }}>Tipos de Pergunta Desejados</label>
          <div style={{ display: 'flex', gap: '12px', marginTop: '6px', flexWrap: 'wrap' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: 0, cursor: 'pointer', fontSize: '0.9rem' }}>
              <input type="checkbox" checked={iaTipoMC} onChange={(e) => setIaTipoMC(e.target.checked)} style={{ width: 'auto' }} />
              <span className="ia-chip ia-chip-mc">Múltipla escolha</span>
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: 0, cursor: 'pointer', fontSize: '0.9rem' }}>
              <input type="checkbox" checked={iaTipoVF} onChange={(e) => setIaTipoVF(e.target.checked)} style={{ width: 'auto' }} />
              <span className="ia-chip ia-chip-vf">Verdadeiro/Falso</span>
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: 0, cursor: 'pointer', fontSize: '0.9rem' }}>
              <input type="checkbox" checked={iaTipoVel} onChange={(e) => setIaTipoVel(e.target.checked)} style={{ width: 'auto' }} />
              <span className="ia-chip ia-chip-vel">Velocidade</span>
            </label>
          </div>

          <div style={{ marginTop: '24px', textAlign: 'center' }}>
            <button className="btn-ia" onClick={gerarPerguntasIA} disabled={iaLoading}>
              {iaLoading ? <><span className="ia-spinner"></span> Gerando...</> : '✨ Gerar perguntas com IA'}
            </button>
          </div>

          {iaFeedback && (
            <div className={iaFeedback.tipo === 'ok' ? 'msg-ok' : iaFeedback.tipo === 'err' ? 'msg-err' : 'msg-warn'}>
              {iaFeedback.txt}
            </div>
          )}
        </div>

        {/* Preview das perguntas da IA */}
        {iaPergsGeradas.length > 0 && (
          <div className="card" id="ia-resultado">
            <div style={{ display: 'flex', alignItems: 'center', justifyItems: 'space-between', justifyContent: 'space-between', marginBottom: '14px' }}>
              <div className="sec" style={{ margin: 0 }}>Perguntas Formuladas pela IA</div>
              <div className="ia-counter">{iaPergsGeradas.length} pergunta(s) prontas</div>
            </div>
            
            <div id="ia-lista-preview" style={{ maxHeight: '400px', overflowY: 'auto', paddingRight: '6px' }}>
              {iaPergsGeradas.map((p, i) => (
                <div key={i} className="ia-perg-preview">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                    <span style={{ fontSize: '0.8rem', color: '#8b5cf6', fontWeight: 800 }}>#{i + 1}</span>
                    <span className={`ia-chip ${p.tipo === 'mc' ? 'ia-chip-mc' : p.tipo === 'vf' ? 'ia-chip-vf' : 'ia-chip-vel'}`}>
                      {p.tipo === 'mc' ? 'Múltipla Escolha' : p.tipo === 'vf' ? 'V/F' : 'Velocidade'}
                    </span>
                  </div>
                  <div className="ia-perg-txt"><MathText text={p.txt} /></div>
                  {p.tipo === 'mc' && (
                    <>
                      <div className="ia-perg-alts">
                        {p.alts.map((a, ai) => (
                          <div key={ai}>{KAHOOT[ai].label} <MathText text={a} /></div>
                        ))}
                      </div>
                      <div className="ia-perg-resp">✅ Resposta correta: Alt. {['A', 'B', 'C', 'D'][p.resp]} (<MathText text={p.alts[p.resp]} />)</div>
                    </>
                  )}
                  {p.tipo === 'vf' && (
                    <div className="ia-perg-resp">✅ Resposta correta: {p.resp === 'v' ? 'Verdadeiro' : 'Falso'}</div>
                  )}
                  {p.tipo === 'veloc' && (
                    <div className="ia-perg-resp">✅ Resposta: <MathText text={p.resp} /></div>
                  )}
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', gap: '12px', marginTop: '16px', flexWrap: 'wrap' }}>
              <button className="btn-importar" onClick={() => confirmarImportacaoIA('add')}>
                ➕ Adicionar ao banco
              </button>
              <button className="btn-importar" style={{ background: 'linear-gradient(90deg, #374151, #4b5563)', boxShadow: 'none' }} onClick={() => confirmarImportacaoIA('sub')}>
                ⬆ Substituir banco completo
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 3. TELA CONTROLES */}
      <div id="tela-controles" className={`tela ${tela === 'controles' ? 'ativa' : ''}`}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '12px' }}>
          <button className="btn-volta" onClick={() => irParaTela('menu')}>← Voltar ao Menu</button>
          <h2 style={{ fontSize: '1.6rem', fontWeight: 900 }}>🎮 Configurar Controle Compartilhado</h2>
        </div>

        <div className="info-box" style={{ marginBottom: '14px' }}>
          <strong>Mapeamento de 12 botões (6 botões para cada jogador):</strong><br />
          1. Conecte o controle compartilhado na máquina e clique em <em>"🔌 Detectar controle compartilhado"</em>.<br />
          2. Pressione qualquer botão no controle para que o sistema identifique a sua ID.<br />
          3. Mapeie <strong style={{ color: '#60a5fa' }}>6 botões para o Jogador 1</strong> e <strong style={{ color: '#f472b6' }}>6 botões para o Jogador 2</strong> correspondentes às cores e cartas de poderes especiais abaixo.
        </div>

        <div className="ctrl-single">
          <div className="ctrl-titulo-single">🎮 Gamepad Compartilhado</div>
          <div className={`ctrl-status ${(ctrl[0].gpIdx !== null) ? 'ok' : ''}`}>
            {ctrl[0].gpIdx !== null ? `✅ Controle mapeado e ativo (Porta #${ctrl[0].gpIdx})` : 'Nenhum controle associado'}
          </div>
          
          <button className="btn-conectar" onClick={() => setDetectMode({ jogador: 0, fase: 'detect', slot: null })}>
            🔌 Detectar controle compartilhado
          </button>
          
          <div className="separador-ctrl"></div>
          <div style={{ fontSize: '0.8rem', color: '#9ca3af', textAlign: 'center', fontWeight: 600 }}>
            Clique na cor/função desejada e pressione o respectivo botão físico no seu controle para mapear
          </div>

          <div className="ctrl-players-grid">
            {/* JOGADOR 1 */}
            <div className="ctrl-player-col">
              <div className="ctrl-player-titulo ctrl-j1-title">🔵 Jogador 1 (Equipe A)</div>
              {MAP_ITEMS.map((item, idx) => (
                <button 
                  key={idx} 
                  className={`btn-ctrl ${ctrl[0].map[idx] !== null ? 'mapeado' : ''} ${(detectMode?.jogador === 0 && detectMode?.slot === idx) ? 'ativo' : ''}`}
                  disabled={ctrl[0].gpIdx === null}
                  onClick={() => setDetectMode({ jogador: 0, fase: 'map', slot: idx })}
                >
                  <span className="alt-label">
                    <span style={{ marginRight: '6px' }}>{item.icon}</span>
                    {item.name}
                  </span>
                  <span className="btn-idx">{ctrl[0].map[idx] !== null ? `Botão ${ctrl[0].map[idx]}` : '— Mapear'}</span>
                </button>
              ))}
              <button className="btn-resetar" onClick={() => {
                const novos = [...ctrl];
                novos[0].map = [null, null, null, null, null, null];
                salvarControles(novos);
              }}>
                ↺ Resetar J1
              </button>
            </div>

            {/* JOGADOR 2 */}
            <div className="ctrl-player-col">
              <div className="ctrl-player-titulo ctrl-j2-title">🩷 Jogador 2 (Equipe B)</div>
              {MAP_ITEMS.map((item, idx) => (
                <button 
                  key={idx} 
                  className={`btn-ctrl ${ctrl[1].map[idx] !== null ? 'mapeado' : ''} ${(detectMode?.jogador === 1 && detectMode?.slot === idx) ? 'ativo' : ''}`}
                  disabled={ctrl[1].gpIdx === null}
                  onClick={() => setDetectMode({ jogador: 1, fase: 'map', slot: idx })}
                >
                  <span className="alt-label">
                    <span style={{ marginRight: '6px' }}>{item.icon}</span>
                    {item.name}
                  </span>
                  <span className="btn-idx">{ctrl[1].map[idx] !== null ? `Botão ${ctrl[1].map[idx]}` : '— Mapear'}</span>
                </button>
              ))}
              <button className="btn-resetar" onClick={() => {
                const novos = [...ctrl];
                novos[1].map = [null, null, null, null, null, null];
                salvarControles(novos);
              }}>
                ↺ Resetar J2
              </button>
            </div>
          </div>
        </div>

        {feedbackControles && (
          <div className={feedbackControles.tipo === 'ok' ? 'msg-ok' : 'msg-err'}>
            {feedbackControles.txt}
          </div>
        )}

        <button className="btn-menu btn-play" style={{ margin: '16px auto 0', width: 'fit-content' }} onClick={() => irParaTela('menu')}>
          ✅ Mapeamento concluído
        </button>
      </div>

      {/* 4. TELA CADASTRO */}
      <div id="tela-cadastro" className={`tela ${tela === 'cadastro' ? 'ativa' : ''}`}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '8px' }}>
          <button className="btn-volta" onClick={() => irParaTela('menu')}>← Voltar ao Menu</button>
          <h2 style={{ fontSize: '1.6rem', fontWeight: 900 }}>⚙️ Gerenciar Matérias e Perguntas</h2>
        </div>

        <div className="tabs">
          <button className={`tab ${cadTab === 'manual' ? 'ativa' : ''}`} onClick={() => setCadTab('manual')}>✏️ Manual</button>
          <button className={`tab ${cadTab === 'importar' ? 'ativa' : ''}`} onClick={() => setCadTab('importar')}>📥 Importar Planilha</button>
          <button className={`tab ${cadTab === 'lista' ? 'ativa' : ''}`} onClick={() => setCadTab('lista')}>📋 Perguntas ({perguntas.length})</button>
          <button className={`tab ${cadTab === 'backup' ? 'ativa' : ''}`} onClick={() => setCadTab('backup')}>💾 Backup JSON</button>
        </div>

        {/* TAB 1: MANUAL */}
        {cadTab === 'manual' && (
          <div className="tab-panel ativa">
            <div className="card">
              <div className="sec">➕ Nova Matéria</div>
              <label>Nome da Matéria</label>
              <div style={{ display: 'flex', gap: '10px' }}>
                <input 
                  placeholder="Ex: Geografia, Ciências..." 
                  value={cadMateriaText}
                  onChange={(e) => setCadMateriaText(e.target.value)}
                />
                <button className="btn-ac btn-add" onClick={adicionarMateriaManual}>Adicionar</button>
              </div>

              {materias.length > 0 && (
                <div style={{ marginTop: '16px' }}>
                  <label>Matérias Cadastradas ({materias.length})</label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '180px', overflowY: 'auto', paddingRight: '4px' }}>
                    {materias.map((m, i) => (
                      <div key={i} className="item-row">
                        <span>📖 {m} <span style={{ color: '#6b7280', fontSize: '0.8rem' }}>({perguntas.filter(p => p.mat === m).length} perguntas)</span></span>
                        <button className="btn-del" onClick={() => deletarMateria(i)}>Remover</button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="card">
              <div className="sec">➕ Cadastrar Pergunta</div>
              
              <label>Selecione a Matéria</label>
              <select value={cadMateriaSelected} onChange={(e) => setCadMateriaSelected(e.target.value)}>
                <option value="">-- Selecione --</option>
                {materias.map((m, i) => (
                  <option key={i} value={m}>{m}</option>
                ))}
              </select>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '14px' }}>
                <div>
                  <label>Turma / Ano</label>
                  <input 
                    placeholder="Ex: 8º Ano A, 9º Ano B..." 
                    value={cadTurmaText}
                    onChange={(e) => setCadTurmaText(e.target.value)}
                    list="sug-turmas"
                    style={{ fontSize: '0.9rem', padding: '12px' }}
                  />
                  <datalist id="sug-turmas">
                    {Array.from(new Set(perguntas.map(p => p.turma).filter(Boolean))).map((t, idx) => (
                      <option key={idx} value={t} />
                    ))}
                  </datalist>
                </div>
                
                <div>
                  <label>Tema da Pergunta</label>
                  <input 
                    placeholder="Ex: Frações, Ásia, Guerras..." 
                    value={cadTemaText}
                    onChange={(e) => setCadTemaText(e.target.value)}
                    list="sug-temas"
                    style={{ fontSize: '0.9rem', padding: '12px' }}
                  />
                  <datalist id="sug-temas">
                    {Array.from(new Set(perguntas.map(p => p.tema).filter(Boolean))).map((t, idx) => (
                      <option key={idx} value={t} />
                    ))}
                  </datalist>
                </div>
              </div>

              <label>Tipo de Pergunta</label>
              <select value={cadTipoSelected} onChange={(e) => setCadTipoSelected(e.target.value)}>
                <option value="mc">Múltipla Escolha (4 alternativas)</option>
                <option value="vf">Verdadeiro ou Falso</option>
                <option value="veloc">Disputa de Velocidade (Resposta livre falada)</option>
              </select>

              <label>Enunciado da Pergunta</label>
              <textarea 
                placeholder="Digite a pergunta de forma clara..." 
                value={cadPerguntaText}
                onChange={(e) => setCadPerguntaText(e.target.value)}
              />

              <div style={{ margin: '14px 0', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', margin: 0, textTransform: 'none', color: '#e5e7eb', fontSize: '0.9rem' }}>
                  <input 
                    type="checkbox" 
                    checked={cadTempoCustomEnabled} 
                    onChange={(e) => setCadTempoCustomEnabled(e.target.checked)} 
                    style={{ width: 'auto' }}
                  />
                  Definir tempo limite customizado para esta pergunta
                </label>
                {cadTempoCustomEnabled && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', paddingLeft: '24px', marginTop: '4px' }}>
                    <span style={{ fontSize: '0.85rem', color: '#a78bfa', fontWeight: 'bold' }}>
                      Tempo da pergunta: <span style={{ color: '#fb923c', fontSize: '0.95rem' }}>{cadTempoVal === 0 ? 'Sem tempo limite (∞)' : `${cadTempoVal} segundos`}</span>
                    </span>
                    <input 
                      type="range" 
                      min="0" 
                      max="120" 
                      step="5" 
                      value={cadTempoVal} 
                      onChange={(e) => setCadTempoVal(Number(e.target.value))}
                      style={{ accentColor: '#7c3aed', height: '6px', background: 'rgba(255, 255, 255, 0.1)', border: 'none' }}
                    />
                    <span style={{ fontSize: '0.75rem', color: '#9ca3af', fontStyle: 'italic' }}>* Defina 0 para "Sem tempo limite" (infinito). Se desmarcado, usará o tempo global configurado na partida.</span>
                  </div>
                )}
              </div>

              {cadTipoSelected === 'mc' && (
                <div style={{ marginTop: '12px', borderLeft: '3px solid #3b82f6', paddingLeft: '12px' }}>
                  <label>Alternativas (Preencha todas)</label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <input 
                      placeholder="🟡 Alternativa A" 
                      value={cadMcAlts[0]}
                      onChange={(e) => {
                        const a = [...cadMcAlts]; a[0] = e.target.value; setCadMcAlts(a);
                      }}
                    />
                    <input 
                      placeholder="🔴 Alternativa B" 
                      value={cadMcAlts[1]}
                      onChange={(e) => {
                        const a = [...cadMcAlts]; a[1] = e.target.value; setCadMcAlts(a);
                      }}
                    />
                    <input 
                      placeholder="🔵 Alternativa C" 
                      value={cadMcAlts[2]}
                      onChange={(e) => {
                        const a = [...cadMcAlts]; a[2] = e.target.value; setCadMcAlts(a);
                      }}
                    />
                    <input 
                      placeholder="🟢 Alternativa D" 
                      value={cadMcAlts[3]}
                      onChange={(e) => {
                        const a = [...cadMcAlts]; a[3] = e.target.value; setCadMcAlts(a);
                      }}
                    />
                  </div>
                  <label>Alternativa Correta</label>
                  <select value={cadMcResp} onChange={(e) => setCadMcResp(Number(e.target.value))}>
                    <option value={0}>🟡 Alternativa A (Amarelo)</option>
                    <option value={1}>🔴 Alternativa B (Vermelho)</option>
                    <option value={2}>🔵 Alternativa C (Azul)</option>
                    <option value={3}>🟢 Alternativa D (Verde)</option>
                  </select>
                </div>
              )}

              {cadTipoSelected === 'vf' && (
                <div style={{ marginTop: '12px', borderLeft: '3px solid #10b981', paddingLeft: '12px' }}>
                  <label>Resposta Correta</label>
                  <select value={cadVfResp} onChange={(e) => setCadVfResp(e.target.value)}>
                    <option value="v">✔ Verdadeiro (Azul no controle)</option>
                    <option value="f">✘ Falso (Vermelho no controle)</option>
                  </select>
                </div>
              )}

              {cadTipoSelected === 'veloc' && (
                <div style={{ marginTop: '12px', borderLeft: '3px solid #f59e0b', paddingLeft: '12px' }}>
                  <label>Resposta Correta Curta (Apenas para fins de gabarito na tela)</label>
                  <input 
                    placeholder="Digite a resposta curta..." 
                    value={cadVelocResp}
                    onChange={(e) => setCadVelocResp(e.target.value)}
                  />
                </div>
              )}

              <div style={{ marginTop: '20px' }}>
                <button className="btn-ac btn-add" onClick={adicionarPerguntaManual}>
                  ➕ Salvar Pergunta no Banco
                </button>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: IMPORTAR PLANILHA */}
        {cadTab === 'importar' && (
          <div className="tab-panel ativa">
            <div className="card">
              <div className="sec">📥 Importar Perguntas via Planilha Excel</div>
              <p style={{ color: '#c4b5fd', fontSize: '0.85rem', marginBottom: '14px' }}>
                O sistema lê arquivos Excel (.xlsx, .xls) ou arquivos texto delimitados (.csv).
              </p>
              
              <button className="btn-download" onClick={baixarModeloExcel}>
                ⬇ Baixar Planilha de Exemplo (.xlsx)
              </button>

              <div className="msg-warn" style={{ marginTop: '14px' }}>
                <strong>Regras de Colunas:</strong><br />
                A planilha precisa ter exatamente as seguintes colunas na primeira linha:<br />
                <code>materia | tipo | pergunta | alt_a | alt_b | alt_c | alt_d | resposta</code><br />
                • tipo: usar <code>mc</code> (múltipla escolha), <code>vf</code> ou <code>veloc</code><br />
                • resposta: para mc usar <code>A, B, C ou D</code>. Para vf usar <code>V ou F</code>.
              </div>

              <div 
                className="drop-area" 
                style={{ marginTop: '20px' }}
                onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add('drag'); }}
                onDragLeave={(e) => e.currentTarget.classList.remove('drag')}
                onDrop={(e) => { e.preventDefault(); e.currentTarget.classList.remove('drag'); processarPlanilha(e); }}
                onClick={() => document.getElementById('sheet-file').click()}
              >
                <input 
                  type="file" 
                  id="sheet-file" 
                  accept=".xlsx,.xls,.csv" 
                  style={{ display: 'none' }}
                  onChange={processarPlanilha}
                />
                <div style={{ fontSize: '2.5rem' }}>📊</div>
                <div style={{ color: '#c4b5fd', fontWeight: 700 }}>Arraste a planilha ou clique para fazer upload</div>
                <div style={{ color: '#6b7280', fontSize: '0.8rem' }}>Suporta planilhas .xlsx, .xls e .csv</div>
              </div>

              {planilhaFeedback && (
                <div className={planilhaFeedback.tipo === 'ok' ? 'msg-ok' : planilhaFeedback.tipo === 'err' ? 'msg-err' : 'msg-warn'}>
                  {planilhaFeedback.txt}
                </div>
              )}

              {planilhaNovasPerguntas.length > 0 && (
                <div style={{ marginTop: '20px' }}>
                  <div className="sec">Preview das perguntas da planilha</div>
                  <table className="preview-table">
                    <thead>
                      <tr>
                        <th>Matéria</th>
                        <th>Tipo</th>
                        <th>Pergunta</th>
                      </tr>
                    </thead>
                    <tbody>
                      {planilhaNovasPerguntas.slice(0, 5).map((p, idx) => (
                        <tr key={idx}>
                          <td>{p.mat}</td>
                          <td>
                            <span className={`tbadge ${p.tipo === 'mc' ? 't-mc' : p.tipo === 'vf' ? 't-vf' : 't-veloc'}`}>
                              {p.tipo === 'mc' ? 'MC' : p.tipo === 'vf' ? 'V/F' : '⚡'}
                            </span>
                          </td>
                          <td>{p.txt.substring(0, 50)}...</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {planilhaNovasPerguntas.length > 5 && (
                    <p style={{ color: '#6b7280', fontSize: '0.8rem', marginTop: '6px', fontStyle: 'italic' }}>
                      ... e mais {planilhaNovasPerguntas.length - 5} pergunta(s).
                    </p>
                  )}

                  <div style={{ display: 'flex', gap: '12px', marginTop: '16px', flexWrap: 'wrap' }}>
                    <button className="btn-importar" onClick={() => confirmarImportacaoPlanilha('add')}>
                      ➕ Mesclar ao Banco de Dados
                    </button>
                    <button className="btn-importar" style={{ background: 'linear-gradient(90deg, #374151, #4b5563)', boxShadow: 'none' }} onClick={() => confirmarImportacaoPlanilha('sub')}>
                      ⬆ Substituir Banco Completo
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 4: BACKUP E RESTAURAÇÃO */}
        {cadTab === 'backup' && (
          <div className="tab-panel ativa">
            <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div className="sec" style={{ margin: 0 }}>💾 Backup e Restauração do Banco de Dados</div>
              <p style={{ color: '#c4b5fd', fontSize: '0.9rem', lineHeight: '1.4' }}>
                Exporte todo o seu banco de perguntas e matérias para salvaguardar o seu trabalho. Você poderá importar o arquivo JSON gerado em qualquer computador para restaurar o quiz.
              </p>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginTop: '10px' }}>
                <div className="jcard j1" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', padding: '20px', background: 'rgba(30, 41, 59, 0.5)' }}>
                  <h3 style={{ fontSize: '1.2rem', color: '#60a5fa', margin: 0 }}>📥 Exportar Backup</h3>
                  <p style={{ fontSize: '0.8rem', color: '#9ca3af', textAlign: 'center', margin: '8px 0' }}>
                    Baixe um arquivo contendo todas as {perguntas.length} perguntas e matérias cadastradas.
                  </p>
                  <button 
                    className="btn-ia" 
                    style={{ background: 'linear-gradient(90deg, #2563eb, #1d4ed8)', padding: '10px 20px', width: '100%', marginTop: 'auto' }}
                    onClick={exportarPerguntasBackup}
                  >
                    Exportar JSON
                  </button>
                </div>
                
                <div className="jcard j2" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', padding: '20px', background: 'rgba(30, 41, 59, 0.5)' }}>
                  <h3 style={{ fontSize: '1.2rem', color: '#ec4899', margin: 0 }}>📤 Importar Backup</h3>
                  <p style={{ fontSize: '0.8rem', color: '#9ca3af', textAlign: 'center', margin: '8px 0' }}>
                    Restaure um arquivo JSON de backup feito anteriormente.
                  </p>
                  
                  <input 
                    type="file" 
                    id="input-backup-json" 
                    accept=".json" 
                    style={{ display: 'none' }} 
                    onChange={importarPerguntasBackup} 
                  />
                  <button 
                    className="btn-ia" 
                    style={{ background: 'linear-gradient(90deg, #db2777, #be185d)', padding: '10px 20px', width: '100%', marginTop: 'auto' }}
                    onClick={() => document.getElementById('input-backup-json').click()}
                  >
                    Selecionar Arquivo JSON
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: LISTA DE PERGUNTAS */}
        {cadTab === 'lista' && (() => {
          const listaFiltrada = perguntas.filter(p => {
            const pTurma = p.turma || 'Sem Turma';
            const pMat = p.mat || 'Geral';
            const pTema = p.tema || 'Geral';
            return (!cadFiltroTurma || pTurma === cadFiltroTurma) &&
                   (!cadFiltroMateria || pMat === cadFiltroMateria) &&
                   (!cadFiltroTema || pTema === cadFiltroTema);
          });

          return (
            <div className="tab-panel ativa">
              <div className="card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                  <div className="sec" style={{ margin: 0 }}>Perguntas no Banco ({perguntas.length})</div>
                  <button className="btn-del" onClick={limparTodasPerguntas}>🗑 Limpar tudo</button>
                </div>

                {/* FILTROS DA LISTA */}
                <div style={{ marginBottom: '14px', display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '14px', background: 'rgba(255,255,255,0.03)', padding: '10px 16px', borderRadius: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#60a5fa' }}>Turma:</span>
                    <select 
                      style={{ width: 'auto', padding: '4px 8px', fontSize: '0.8rem' }}
                      value={cadFiltroTurma}
                      onChange={(e) => setCadFiltroTurma(e.target.value)}
                    >
                      <option value="">Todas</option>
                      {Array.from(new Set(perguntas.map(p => p.turma || 'Sem Turma'))).sort().map((t, i) => (
                        <option key={i} value={t}>{t}</option>
                      ))}
                    </select>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#f59e0b' }}>Matéria:</span>
                    <select 
                      style={{ width: 'auto', padding: '4px 8px', fontSize: '0.8rem' }}
                      value={cadFiltroMateria}
                      onChange={(e) => setCadFiltroMateria(e.target.value)}
                    >
                      <option value="">Todas</option>
                      {Array.from(new Set(perguntas.map(p => p.mat || 'Geral'))).sort().map((m, i) => (
                        <option key={i} value={m}>{m}</option>
                      ))}
                    </select>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#ec4899' }}>Tema:</span>
                    <select 
                      style={{ width: 'auto', padding: '4px 8px', fontSize: '0.8rem' }}
                      value={cadFiltroTema}
                      onChange={(e) => setCadFiltroTema(e.target.value)}
                    >
                      <option value="">Todos</option>
                      {Array.from(new Set(perguntas.map(p => p.tema || 'Geral'))).sort().map((t, i) => (
                        <option key={i} value={t}>{t}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '420px', overflowY: 'auto', paddingRight: '4px' }}>
                  {listaFiltrada.length === 0 ? (
                    <div className="lista-vazia">Nenhuma pergunta encontrada com este filtro.</div>
                  ) : (
                    listaFiltrada.map((p, i) => (
                      <div key={i} className="item-row">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flex: 1, minWidth: 0, flexWrap: 'wrap' }}>
                          <span className="badge" style={{ background: 'rgba(96, 165, 250, 0.15)', color: '#60a5fa', borderColor: 'rgba(96, 165, 250, 0.25)', fontSize: '0.72rem', padding: '2px 8px' }}>🏫 {p.turma || 'Sem Turma'}</span>
                          <span className="badge" style={{ fontSize: '0.72rem', padding: '2px 8px' }}>{p.mat || 'Geral'}</span>
                          <span className="badge" style={{ background: 'rgba(236, 72, 153, 0.15)', color: '#f472b6', borderColor: 'rgba(236, 72, 153, 0.25)', fontSize: '0.72rem', padding: '2px 8px' }}>🏷️ {p.tema || 'Geral'}</span>
                          <span className={`tbadge ${p.tipo === 'mc' ? 't-mc' : p.tipo === 'vf' ? 't-vf' : 't-veloc'}`} style={{ fontSize: '0.7rem' }}>
                            {p.tipo === 'mc' ? 'MC' : p.tipo === 'vf' ? 'V/F' : '⚡'}
                          </span>
                          {p.tempo !== undefined && (
                            <span className="badge" style={{ background: 'rgba(245, 158, 11, 0.15)', color: '#fb923c', borderColor: 'rgba(245, 158, 11, 0.25)', fontSize: '0.72rem', padding: '2px 8px' }}>
                              ⏱️ {p.tempo === null ? '∞' : `${p.tempo}s`}
                            </span>
                          )}
                          <span style={{ fontSize: '0.85rem', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', color: '#e5e7eb', flex: 1, minWidth: '150px' }}>
                            <MathText text={p.txt} />
                          </span>
                        </div>
                        <button className="btn-del" onClick={() => deletarPergunta(perguntas.indexOf(p))}>✕</button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          );
        })()}
      </div>

      {/* 5. TELA SELEÇÃO DE MATÉRIA */}
      <div id="tela-selecao" className={`tela ${tela === 'selecao' ? 'ativa' : ''}`}>
        <button className="btn-volta" onClick={() => irParaTela('menu')} style={{ alignSelf: 'flex-start' }}>← Voltar</button>
        {(() => {
          // Derivar as opções únicas para exibição com base nos filtros
          const turmasUnicas = Array.from(new Set(perguntas.map(p => p.turma || 'Sem Turma'))).sort();
          
          const materiasCorrespondentes = Array.from(new Set(
            perguntas
              .filter(p => selTurmas.length === 0 || selTurmas.includes(p.turma || 'Sem Turma'))
              .map(p => p.mat || 'Geral')
          )).sort();

          const temasCorrespondentes = Array.from(new Set(
            perguntas
              .filter(p => (selTurmas.length === 0 || selTurmas.includes(p.turma || 'Sem Turma')) &&
                           (selMaterias.length === 0 || selMaterias.includes(p.mat || 'Geral')))
              .map(p => p.tema || 'Geral')
          )).sort();

          const perguntasFiltradasDeCima = obterPerguntasFiltradasPartida();

          // Obter os assuntos disponíveis a partir do filtro do topo
          const assuntosDisponiveis = Array.from(new Set(
            perguntasFiltradasDeCima.map(p => {
              const t = p.turma || 'Sem Turma';
              const m = p.mat || 'Geral';
              const te = p.tema || 'Geral';
              return `${t}||${m}||${te}`;
            })
          )).map(key => {
            const [turma, mat, tema] = key.split('||');
            const pergsDoAssunto = perguntas.filter(p => 
              (p.turma || 'Sem Turma') === turma && 
              (p.mat || 'Geral') === mat && 
              (p.tema || 'Geral') === tema
            );
            return {
              key,
              turma,
              mat,
              tema,
              total: pergsDoAssunto.length
            };
          }).sort((a, b) => a.turma.localeCompare(b.turma) || a.mat.localeCompare(b.mat) || a.tema.localeCompare(b.tema));

          // Helper para ler a quantidade atual de um assunto no estado da composição
          const obterQtdAssunto = (key, max) => {
            if (composicaoQuiz[key] !== undefined) {
              return Math.min(composicaoQuiz[key], max);
            }
            return max; // Padrão: inclui todas as perguntas disponíveis daquele assunto
          };

          // Soma de todas as perguntas que farão parte do duelo
          const totalPerguntasQuiz = assuntosDisponiveis.reduce((soma, ass) => {
            return soma + obterQtdAssunto(ass.key, ass.total);
          }, 0);

          // Função para ajustar quantidade
          const ajustarQtdAssunto = (key, delta, max) => {
            const atual = obterQtdAssunto(key, max);
            const nova = Math.max(0, Math.min(atual + delta, max));
            setComposicaoQuiz(prev => ({
              ...prev,
              [key]: nova
            }));
          };

          const incluirTodosAssuntos = () => {
            const novo = {};
            assuntosDisponiveis.forEach(ass => {
              novo[ass.key] = ass.total;
            });
            setComposicaoQuiz(novo);
          };

          const zerarTodosAssuntos = () => {
            const novo = {};
            assuntosDisponiveis.forEach(ass => {
              novo[ass.key] = 0;
            });
            setComposicaoQuiz(novo);
          };

          // Atualizar o clique de confirmação para validar se há perguntas selecionadas no montador
          const confirmarSelecaoPerguntasQuiz = () => {
            if (totalPerguntasQuiz === 0) {
              alert('Por favor, selecione pelo menos 1 pergunta na composição do quiz para continuar!');
              return;
            }
            irParaTela('nomes');
          };

          return (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px', width: '100%', maxWidth: '960px', margin: '0 auto' }}>
              <div style={{ textAlign: 'center' }}>
                <h2 style={{ fontSize: '2.2rem', fontWeight: 900 }}>🎯 Configure o Conteúdo do Duelo</h2>
                <p style={{ color: '#c4b5fd', fontSize: '0.95rem', marginTop: '4px' }}>
                  Filtre por Turma, Matéria e Tema para compor as perguntas deste duelo.
                </p>
              </div>

              <div style={{ display: 'flex', gap: '10px', alignSelf: 'flex-end', marginTop: '-5px' }}>
                <button 
                  className="btn-del" 
                  style={{ background: 'rgba(255, 255, 255, 0.08)', color: '#fff', border: '1px solid rgba(255, 255, 255, 0.1)', padding: '6px 14px', fontSize: '0.85rem' }}
                  onClick={() => {
                    setSelTurmas([]);
                    setSelMaterias([]);
                    setSelTemas([]);
                    setComposicaoQuiz({});
                  }}
                >
                  🧹 Resetar Filtros
                </button>
              </div>

              {/* GRIDS DE FILTROS SUPERIORES */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', width: '100%' }}>
                {/* COLUNA 1: TURMAS */}
                <div className="card" style={{ background: 'rgba(22, 33, 62, 0.45)', border: '1px solid rgba(255, 255, 255, 0.05)', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px', textAlign: 'left' }}>
                  <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#60a5fa', borderBottom: '1px solid rgba(255, 255, 255, 0.1)', paddingBottom: '6px' }}>
                    🏫 Selecione a(s) Turma(s)
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '200px', overflowY: 'auto', paddingRight: '4px' }}>
                    {turmasUnicas.length === 0 ? (
                      <span style={{ fontSize: '0.82rem', color: '#6b7280', fontStyle: 'italic' }}>Nenhuma turma cadastrada</span>
                    ) : (
                      turmasUnicas.map((t, idx) => (
                        <button 
                          key={idx}
                          className={`btn-mat ${selTurmas.includes(t) ? 'sel' : ''}`}
                          style={{ padding: '8px 12px', fontSize: '0.82rem', textAlign: 'left', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                          onClick={() => {
                            setSelTurmas(prev => prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t]);
                          }}
                        >
                          <span>{t}</span>
                          <span style={{ fontSize: '0.72rem', opacity: 0.7 }}>({perguntas.filter(p => (p.turma || 'Sem Turma') === t).length})</span>
                        </button>
                      ))
                    )}
                  </div>
                </div>

                {/* COLUNA 2: MATÉRIAS */}
                <div className="card" style={{ background: 'rgba(22, 33, 62, 0.45)', border: '1px solid rgba(255, 255, 255, 0.05)', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px', textAlign: 'left' }}>
                  <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#f59e0b', borderBottom: '1px solid rgba(255, 255, 255, 0.1)', paddingBottom: '6px' }}>
                    📖 Selecione a(s) Matéria(s)
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '200px', overflowY: 'auto', paddingRight: '4px' }}>
                    {materiasCorrespondentes.length === 0 ? (
                      <span style={{ fontSize: '0.82rem', color: '#6b7280', fontStyle: 'italic' }}>Nenhuma matéria disponível</span>
                    ) : (
                      materiasCorrespondentes.map((m, idx) => (
                        <button 
                          key={idx}
                          className={`btn-mat ${selMaterias.includes(m) ? 'sel' : ''}`}
                          style={{ padding: '8px 12px', fontSize: '0.82rem', textAlign: 'left', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                          onClick={() => {
                            setSelMaterias(prev => prev.includes(m) ? prev.filter(x => x !== m) : [...prev, m]);
                          }}
                        >
                          <span>{m}</span>
                          <span style={{ fontSize: '0.72rem', opacity: 0.7 }}>({perguntas.filter(p => (p.mat || 'Geral') === m && (selTurmas.length === 0 || selTurmas.includes(p.turma || 'Sem Turma'))).length})</span>
                        </button>
                      ))
                    )}
                  </div>
                </div>

                {/* COLUNA 3: TEMAS */}
                <div className="card" style={{ background: 'rgba(22, 33, 62, 0.45)', border: '1px solid rgba(255, 255, 255, 0.05)', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px', textAlign: 'left' }}>
                  <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#ec4899', borderBottom: '1px solid rgba(255, 255, 255, 0.1)', paddingBottom: '6px' }}>
                    🏷️ Selecione o(s) Tema(s)
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '200px', overflowY: 'auto', paddingRight: '4px' }}>
                    {temasCorrespondentes.length === 0 ? (
                      <span style={{ fontSize: '0.82rem', color: '#6b7280', fontStyle: 'italic' }}>Nenhum tema correspondente</span>
                    ) : (
                      temasCorrespondentes.map((t, idx) => (
                        <button 
                          key={idx}
                          className={`btn-mat ${selTemas.includes(t) ? 'sel' : ''}`}
                          style={{ padding: '8px 12px', fontSize: '0.82rem', textAlign: 'left', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                          onClick={() => {
                            setSelTemas(prev => prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t]);
                          }}
                        >
                          <span>{t}</span>
                          <span style={{ fontSize: '0.72rem', opacity: 0.7 }}>({perguntas.filter(p => (p.tema || 'Geral') === t && (selTurmas.length === 0 || selTurmas.includes(p.turma || 'Sem Turma')) && (selMaterias.length === 0 || selMaterias.includes(p.mat || 'Geral'))).length})</span>
                        </button>
                      ))
                    )}
                  </div>
                </div>
              </div>

              {/* SEÇÃO DO MONTADOR DE QUIZ GRANULAR */}
              <div className="card" style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '14px', background: 'rgba(22, 33, 62, 0.55)', padding: '18px', textAlign: 'left' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '8px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    <span style={{ fontSize: '1.1rem', fontWeight: 800, color: '#a78bfa' }}>📋 Composição Fina do Quiz</span>
                    <span style={{ fontSize: '0.78rem', color: '#9ca3af' }}>Defina a quantidade exata de perguntas de cada assunto para o questionário.</span>
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button className="btn-mat" style={{ padding: '5px 12px', fontSize: '0.75rem', background: 'rgba(74, 222, 128, 0.1)', borderColor: 'rgba(74, 222, 128, 0.3)', color: '#4ade80' }} onClick={incluirTodosAssuntos}>
                      ⚡ Incluir Todas
                    </button>
                    <button className="btn-del" style={{ padding: '5px 12px', fontSize: '0.75rem', border: '1px solid rgba(239, 68, 68, 0.3)' }} onClick={zerarTodosAssuntos}>
                      🧹 Zerar Seleção
                    </button>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '200px', overflowY: 'auto', paddingRight: '4px' }}>
                  {assuntosDisponiveis.length === 0 ? (
                    <div style={{ fontSize: '0.85rem', color: '#6b7280', fontStyle: 'italic', textAlign: 'center', padding: '14px' }}>
                      Nenhum assunto disponível com os filtros selecionados acima.
                    </div>
                  ) : (
                    assuntosDisponiveis.map((ass) => {
                      const escolhida = obterQtdAssunto(ass.key, ass.total);
                      return (
                        <div key={ass.key} style={{ display: 'flex', justifyItems: 'center', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '8px', gap: '14px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap', flex: 1, minWidth: 0 }}>
                            <span className="badge" style={{ background: 'rgba(96, 165, 250, 0.15)', color: '#60a5fa', borderColor: 'rgba(96, 165, 250, 0.25)', fontSize: '0.72rem', padding: '2px 8px' }}>🏫 {ass.turma}</span>
                            <span className="badge" style={{ fontSize: '0.72rem', padding: '2px 8px' }}>{ass.mat}</span>
                            <span className="badge" style={{ background: 'rgba(236, 72, 153, 0.15)', color: '#f472b6', borderColor: 'rgba(236, 72, 153, 0.25)', fontSize: '0.72rem', padding: '2px 8px' }}>🏷️ {ass.tema}</span>
                            <span style={{ fontSize: '0.78rem', color: '#9ca3af', marginLeft: '6px' }}>({ass.total} disponíveis)</span>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <button 
                              className="btn-del" 
                              style={{ width: '28px', height: '28px', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem', border: '1px solid rgba(255,255,255,0.1)' }}
                              onClick={() => ajustarQtdAssunto(ass.key, -1, ass.total)}
                              disabled={escolhida === 0}
                            >
                              -
                            </button>
                            <input 
                              type="number"
                              min={0}
                              max={ass.total}
                              value={escolhida}
                              onChange={(e) => {
                                const val = Math.max(0, Math.min(Number(e.target.value), ass.total));
                                setComposicaoQuiz(prev => ({ ...prev, [ass.key]: val }));
                              }}
                              style={{ width: '45px', textAlign: 'center', padding: '4px 6px', fontSize: '0.85rem', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', borderRadius: '4px' }}
                            />
                            <button 
                              className="btn-mat" 
                              style={{ width: '28px', height: '28px', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem', background: 'rgba(255,255,255,0.05)', borderColor: 'rgba(255,255,255,0.1)' }}
                              onClick={() => ajustarQtdAssunto(ass.key, 1, ass.total)}
                              disabled={escolhida === ass.total}
                            >
                              +
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* PAINEL INFERIOR DE CONFIRMAÇÃO */}
              <div className="card" style={{ width: '100%', background: 'rgba(22, 33, 62, 0.35)', border: '1px dashed rgba(255, 255, 255, 0.15)', padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderRadius: '12px', textAlign: 'left' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <span style={{ fontSize: '1.05rem', color: '#4ade80', fontWeight: 'bold' }}>
                    🎯 {totalPerguntasQuiz} pergunta(s) selecionada(s) para o duelo!
                  </span>
                  <span style={{ fontSize: '0.78rem', color: '#9ca3af' }}>
                    * Ajuste os filtros no topo e as quantidades na Composição Fina. Clique no botão ao lado para começar.
                  </span>
                </div>
                
                <button 
                  className="btn-start" 
                  style={{ margin: 0, padding: '12px 28px', opacity: totalPerguntasQuiz > 0 ? 1 : 0.5, cursor: totalPerguntasQuiz > 0 ? 'pointer' : 'not-allowed' }} 
                  disabled={totalPerguntasQuiz === 0}
                  onClick={confirmarSelecaoPerguntasQuiz}
                >
                  Confirmar e Continuar →
                </button>
              </div>
            </div>
          );
        })()}
      </div>

      {/* 6. TELA NOMES DAS EQUIPES */}
      <div id="tela-nomes" className={`tela ${tela === 'nomes' ? 'ativa' : ''}`}>
        <button className="btn-volta" onClick={() => irParaTela('selecao')} style={{ alignSelf: 'flex-start' }}>← Voltar</button>
        
        <h2>👥 Quem vai disputar o duelo?</h2>
        <p style={{ color: '#c4b5fd', fontSize: '0.95rem', marginTop: '-12px' }}>Personalize o nome das duas equipes.</p>

        <div className="dupla">
          <div className="jcard j1">
            <h3>🔵 Equipe 1</h3>
            <input value={nomeJ1} onChange={(e) => setNomeJ1(e.target.value)} placeholder="Equipe Azul" />
          </div>
          <div className="jcard j2">
            <h3>🩷 Equipe 2</h3>
            <input value={nomeJ2} onChange={(e) => setNomeJ2(e.target.value)} placeholder="Equipe Rosa" />
          </div>
        </div>

        <div id="ctrl-resumo" style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', justifyContent: 'center', fontSize: '0.85rem' }}>
          <span style={{
            padding: '8px 18px',
            borderRadius: '20px',
            background: ctrl[0].gpIdx !== null && ctrl[0].map.every(v => v !== null) ? 'rgba(34, 197, 94, 0.15)' : 'rgba(239, 68, 68, 0.1)',
            border: `1px solid ${ctrl[0].gpIdx !== null && ctrl[0].map.every(v => v !== null) ? 'rgba(34, 197, 94, 0.3)' : 'rgba(239, 68, 68, 0.2)'}`,
            color: ctrl[0].gpIdx !== null && ctrl[0].map.every(v => v !== null) ? '#4ade80' : '#fca5a5'
          }}>
            🎮 {ctrl[0].gpIdx !== null && ctrl[0].map.every(v => v !== null) ? 'Controle Compartilhado Pronto!' : 'Aviso: Configurar controle compartilhado no Menu é recomendado para jogar fisicamente'}
          </span>
        </div>

        {/* PAINEL DE CONFIGURAÇÃO DE TEMPO GLOBAL */}
        <div className="card" style={{ width: '100%', maxWidth: '500px', margin: '14px auto', padding: '16px', background: 'rgba(22, 33, 62, 0.45)', textAlign: 'left' }}>
          <div style={{ fontSize: '1rem', fontWeight: 800, color: '#c4b5fd', marginBottom: '10px', borderLeft: '3px solid #7c3aed', paddingLeft: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            ⏱️ Tempo Limite das Rodadas
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: 0, cursor: 'pointer', textTransform: 'none', fontSize: '0.9rem', color: '#e5e7eb' }}>
              <input 
                type="checkbox" 
                checked={globalTimerEnabled} 
                onChange={(e) => setGlobalTimerEnabled(e.target.checked)} 
                style={{ width: 'auto' }}
              />
              Habilitar limite de tempo automático nas rodadas
            </label>

            {globalTimerEnabled && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '6px' }}>
                <span style={{ fontSize: '0.85rem', color: '#a78bfa', fontWeight: 'bold' }}>
                  Tempo global por rodada: <span style={{ color: '#fb923c', fontSize: '1rem' }}>{globalTempo} segundos</span>
                </span>
                <input 
                  type="range" 
                  min="5" 
                  max="60" 
                  step="5"
                  value={globalTempo}
                  onChange={(e) => setGlobalTempo(Number(e.target.value))}
                  style={{ accentColor: '#7c3aed', height: '6px', background: 'rgba(255, 255, 255, 0.1)', border: 'none' }}
                />
              </div>
            )}
          </div>
        </div>

        {/* PAINEL DE CONFIGURAÇÃO DO MODO APOSTAS */}
        <div className="card" style={{ width: '100%', maxWidth: '500px', margin: '14px auto', padding: '16px', background: 'rgba(22, 33, 62, 0.45)', textAlign: 'left', border: '1px solid rgba(245, 158, 11, 0.15)', boxShadow: modoApostas ? '0 0 15px rgba(245, 158, 11, 0.08)' : 'none', transition: 'all 0.3s ease' }}>
          <div style={{ fontSize: '1rem', fontWeight: 800, color: '#fb923c', marginBottom: '10px', borderLeft: '3px solid #fb923c', paddingLeft: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            🎰 Variação: O Preço da Resposta (Modo Apostas)
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: 0, cursor: 'pointer', textTransform: 'none', fontSize: '0.9rem', color: '#e5e7eb' }}>
              <input 
                type="checkbox" 
                checked={modoApostas} 
                onChange={(e) => { playSound('click'); setModoApostas(e.target.checked); }} 
                style={{ width: 'auto' }}
              />
              Habilitar apostas estratégicas e multiplicadores de risco
            </label>
            <p style={{ color: '#9ca3af', fontSize: '0.78rem', margin: '4px 0 0 24px', lineHeight: '1.4' }}>
              Os jogadores apostarão ocultamente (0.5x, 1x, 2x ou 3x) antes de cada pergunta baseado apenas na categoria. Acertos multiplicam os pontos, mas erros **subtraem** pontos proporcionalmente!
            </p>
          </div>
        </div>

        <div style={{ textAlign: 'center', color: '#a78bfa', fontSize: '0.9rem', lineHeight: 1.6, maxWidth: '500px', margin: '8px auto' }}>
          🏅 <strong>Pontuação Kahoot:</strong> Resposta correta = <strong style={{ color: '#fcd34d' }}>1.000 pts</strong> + até <strong style={{ color: '#fb923c' }}>+500 pts</strong> de bônus de velocidade para quem responder primeiro.
        </div>

        <button className="btn-start" style={{ padding: '16px 64px' }} onClick={iniciarJogoDuelo}>
          Começar Disputa! 🚀
        </button>
      </div>

      {/* 7. TELA ARENA DO JOGO */}
      <div id="tela-jogo" className={`tela ${tela === 'jogo' ? 'ativa' : ''}`}>
        {fila.length > 0 && rodAtual > 0 && (
          <div className="jogo-inner">
            {modoApostas && faseJogo === 'aposta' ? (
              <div className="fase-aposta-container" style={{ display: 'flex', flexDirection: 'column', width: '100%', gap: '24px', alignItems: 'center', padding: '10px 0' }}>
                <div style={{ textAlign: 'center' }}>
                  <span className="badge" style={{ background: 'rgba(245, 158, 11, 0.15)', color: '#fb923c', borderColor: 'rgba(245, 158, 11, 0.3)', fontSize: '0.9rem', padding: '6px 16px', borderRadius: '20px', textTransform: 'uppercase', fontWeight: 'bold' }}>
                    🎰 Fase de Aposta Secreta
                  </span>
                  <h2 style={{ fontSize: '2rem', marginTop: '14px', marginBottom: '8px', color: '#fff' }}>
                    Próxima Categoria: <span style={{ color: '#a78bfa' }}>{fila[rodAtual - 1].mat}</span>
                  </h2>
                  <p style={{ color: '#f472b6', fontSize: '1.1rem', margin: 0, fontWeight: 'bold' }}>
                    🏷️ Assunto: {fila[rodAtual - 1].tema || 'Geral'}
                  </p>
                </div>

                <div style={{ display: 'flex', gap: '30px', width: '100%', maxWidth: '800px', flexWrap: 'wrap', justifyContent: 'center' }}>
                  {/* COLUNA JOGADOR 1 */}
                  <div className="card" style={{ flex: 1, minWidth: '280px', background: 'rgba(59, 130, 246, 0.05)', border: '1px solid rgba(59, 130, 246, 0.2)', padding: '24px', borderRadius: '16px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', textAlign: 'center', transition: 'all 0.3s ease', boxShadow: apostasConfirmadas[0] ? '0 0 20px rgba(59, 130, 246, 0.15)' : 'none' }}>
                    <h3 style={{ fontSize: '1.4rem', color: '#60a5fa', margin: 0 }}>🔵 {nomeJ1}</h3>
                    <div style={{ fontSize: '0.85rem', color: '#9ca3af' }}>Saldo Atual: {pts[0].toLocaleString('pt-BR')} pts</div>

                    {revelandoApostas ? (
                      <div style={{ fontSize: '2.5rem', fontWeight: 900, color: '#fb923c', animation: 'pulse 0.5s infinite alternate' }}>
                        🔥 {apostasRodada[0]}x
                      </div>
                    ) : apostasConfirmadas[0] ? (
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', color: '#4ade80' }}>
                        <span style={{ fontSize: '2rem' }}>🔒</span>
                        <strong style={{ fontSize: '1.1rem' }}>Aposta Feita!</strong>
                        <span style={{ fontSize: '0.78rem', color: '#9ca3af' }}>Aguardando oponente...</span>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', width: '100%' }}>
                        <span style={{ fontSize: '0.85rem', color: '#9ca3af', marginBottom: '4px' }}>Escolha o multiplicador:</span>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                          <button 
                            className="btn-poder" 
                            style={{ background: 'rgba(251, 191, 36, 0.1)', borderColor: '#fbbf24', color: '#fbbf24', fontSize: '0.85rem', padding: '10px' }}
                            onClick={() => {
                              const novasApostas = [...apostasRodada];
                              novasApostas[0] = 0.5;
                              setApostasRodada(novasApostas);
                              const novasConfirmadas = [...apostasConfirmadas];
                              novasConfirmadas[0] = true;
                              setApostasConfirmadas(novasConfirmadas);
                              playSound('click');
                              if (novasConfirmadas[1]) revelarELiberarPergunta();
                            }}
                          >
                            🟡 0.5x (Baixo)
                          </button>
                          <button 
                            className="btn-poder" 
                            style={{ background: 'rgba(239, 68, 68, 0.1)', borderColor: '#ef4444', color: '#ef4444', fontSize: '0.85rem', padding: '10px' }}
                            onClick={() => {
                              const novasApostas = [...apostasRodada];
                              novasApostas[0] = 1.0;
                              setApostasRodada(novasApostas);
                              const novasConfirmadas = [...apostasConfirmadas];
                              novasConfirmadas[0] = true;
                              setApostasConfirmadas(novasConfirmadas);
                              playSound('click');
                              if (novasConfirmadas[1]) revelarELiberarPergunta();
                            }}
                          >
                            🔴 1.0x (Médio)
                          </button>
                          <button 
                            className="btn-poder" 
                            style={{ background: 'rgba(59, 130, 246, 0.1)', borderColor: '#3b82f6', color: '#3b82f6', fontSize: '0.85rem', padding: '10px' }}
                            onClick={() => {
                              const novasApostas = [...apostasRodada];
                              novasApostas[0] = 2.0;
                              setApostasRodada(novasApostas);
                              const novasConfirmadas = [...apostasConfirmadas];
                              novasConfirmadas[0] = true;
                              setApostasConfirmadas(novasConfirmadas);
                              playSound('click');
                              if (novasConfirmadas[1]) revelarELiberarPergunta();
                            }}
                          >
                            🔵 2.0x (Alto)
                          </button>
                          <button 
                            className="btn-poder" 
                            style={{ background: 'rgba(16, 185, 129, 0.1)', borderColor: '#10b981', color: '#10b981', fontSize: '0.85rem', padding: '10px' }}
                            onClick={() => {
                              const novasApostas = [...apostasRodada];
                              novasApostas[0] = 3.0;
                              setApostasRodada(novasApostas);
                              const novasConfirmadas = [...apostasConfirmadas];
                              novasConfirmadas[0] = true;
                              setApostasConfirmadas(novasConfirmadas);
                              playSound('click');
                              if (novasConfirmadas[1]) revelarELiberarPergunta();
                            }}
                          >
                            🟢 3.0x (Risco!)
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* COLUNA JOGADOR 2 */}
                  <div className="card" style={{ flex: 1, minWidth: '280px', background: 'rgba(236, 72, 153, 0.05)', border: '1px solid rgba(236, 72, 153, 0.2)', padding: '24px', borderRadius: '16px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', textAlign: 'center', transition: 'all 0.3s ease', boxShadow: apostasConfirmadas[1] ? '0 0 20px rgba(236, 72, 153, 0.15)' : 'none' }}>
                    <h3 style={{ fontSize: '1.4rem', color: '#f472b6', margin: 0 }}>🩷 {nomeJ2}</h3>
                    <div style={{ fontSize: '0.85rem', color: '#9ca3af' }}>Saldo Atual: {pts[1].toLocaleString('pt-BR')} pts</div>

                    {revelandoApostas ? (
                      <div style={{ fontSize: '2.5rem', fontWeight: 900, color: '#fb923c', animation: 'pulse 0.5s infinite alternate' }}>
                        🔥 {apostasRodada[1]}x
                      </div>
                    ) : apostasConfirmadas[1] ? (
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', color: '#4ade80' }}>
                        <span style={{ fontSize: '2rem' }}>🔒</span>
                        <strong style={{ fontSize: '1.1rem' }}>Aposta Feita!</strong>
                        <span style={{ fontSize: '0.78rem', color: '#9ca3af' }}>Aguardando oponente...</span>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', width: '100%' }}>
                        <span style={{ fontSize: '0.85rem', color: '#9ca3af', marginBottom: '4px' }}>Escolha o multiplicador:</span>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                          <button 
                            className="btn-poder" 
                            style={{ background: 'rgba(251, 191, 36, 0.1)', borderColor: '#fbbf24', color: '#fbbf24', fontSize: '0.85rem', padding: '10px' }}
                            onClick={() => {
                              const novasApostas = [...apostasRodada];
                              novasApostas[1] = 0.5;
                              setApostasRodada(novasApostas);
                              const novasConfirmadas = [...apostasConfirmadas];
                              novasConfirmadas[1] = true;
                              setApostasConfirmadas(novasConfirmadas);
                              playSound('click');
                              if (novasConfirmadas[0]) revelarELiberarPergunta();
                            }}
                          >
                            🟡 0.5x (Baixo)
                          </button>
                          <button 
                            className="btn-poder" 
                            style={{ background: 'rgba(239, 68, 68, 0.1)', borderColor: '#ef4444', color: '#ef4444', fontSize: '0.85rem', padding: '10px' }}
                            onClick={() => {
                              const novasApostas = [...apostasRodada];
                              novasApostas[1] = 1.0;
                              setApostasRodada(novasApostas);
                              const novasConfirmadas = [...apostasConfirmadas];
                              novasConfirmadas[1] = true;
                              setApostasConfirmadas(novasConfirmadas);
                              playSound('click');
                              if (novasConfirmadas[0]) revelarELiberarPergunta();
                            }}
                          >
                            🔴 1.0x (Médio)
                          </button>
                          <button 
                            className="btn-poder" 
                            style={{ background: 'rgba(59, 130, 246, 0.1)', borderColor: '#3b82f6', color: '#3b82f6', fontSize: '0.85rem', padding: '10px' }}
                            onClick={() => {
                              const novasApostas = [...apostasRodada];
                              novasApostas[1] = 2.0;
                              setApostasRodada(novasApostas);
                              const novasConfirmadas = [...apostasConfirmadas];
                              novasConfirmadas[1] = true;
                              setApostasConfirmadas(novasConfirmadas);
                              playSound('click');
                              if (novasConfirmadas[0]) revelarELiberarPergunta();
                            }}
                          >
                            🔵 2.0x (Alto)
                          </button>
                          <button 
                            className="btn-poder" 
                            style={{ background: 'rgba(16, 185, 129, 0.1)', borderColor: '#10b981', color: '#10b981', fontSize: '0.85rem', padding: '10px' }}
                            onClick={() => {
                              const novasApostas = [...apostasRodada];
                              novasApostas[1] = 3.0;
                              setApostasRodada(novasApostas);
                              const novasConfirmadas = [...apostasConfirmadas];
                              novasConfirmadas[1] = true;
                              setApostasConfirmadas(novasConfirmadas);
                              playSound('click');
                              if (novasConfirmadas[0]) revelarELiberarPergunta();
                            }}
                          >
                            🟢 3.0x (Risco!)
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {!revelandoApostas && (
                  <p style={{ color: '#9ca3af', fontSize: '0.85rem', background: 'rgba(0,0,0,0.2)', padding: '10px 20px', borderRadius: '30px', border: '1px solid rgba(255,255,255,0.05)' }}>
                    🎮 Dica: Pressione no controle físico: 🟡 Amarelo (0.5x), 🔴 Vermelho (1.0x), 🔵 Azul (2.0x) ou 🟢 Verde (3.0x)
                  </p>
                )}
              </div>
            ) : (
              <>
                {/* PLACAR E TIMER */}
                <div className="placar-bar">
                  <div className="pl-bloco pl-j1">
                    <div className="pl-nome">🔵 {nomeJ1}</div>
                    <div className="pl-pts">{pts[0].toLocaleString('pt-BR')} pts</div>
                    {modoApostas && faseJogo === 'pergunta' && apostasRodada[0] !== null && (
                      <div className="pl-aposta-badge" style={{ fontSize: '0.78rem', color: '#fb923c', marginTop: '4px', fontWeight: 'bold', background: 'rgba(251, 146, 60, 0.1)', padding: '2px 8px', borderRadius: '12px', border: '1px solid rgba(251, 146, 60, 0.2)', display: 'inline-block' }}>
                        💰 Aposta: {apostasRodada[0]}x
                      </div>
                    )}
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div className="rod-info">Pergunta {rodAtual} de {fila.length}</div>
                    <div style={{ fontSize: '2.5rem', fontWeight: 900, color: (timerSeg !== null && timerSeg <= 4) ? '#ef4444' : '#a78bfa', transition: 'color 0.3s ease', fontFamily: 'monospace' }}>
                      {timerSeg !== null ? timerSeg : '∞'}
                    </div>
                  </div>
                  <div className="pl-bloco pl-j2">
                    <div className="pl-nome">🩷 {nomeJ2}</div>
                    <div className="pl-pts">{pts[1].toLocaleString('pt-BR')} pts</div>
                    {modoApostas && faseJogo === 'pergunta' && apostasRodada[1] !== null && (
                      <div className="pl-aposta-badge" style={{ fontSize: '0.78rem', color: '#fb923c', marginTop: '4px', fontWeight: 'bold', background: 'rgba(251, 146, 60, 0.1)', padding: '2px 8px', borderRadius: '12px', border: '1px solid rgba(251, 146, 60, 0.2)', display: 'inline-block' }}>
                        💰 Aposta: {apostasRodada[1]}x
                      </div>
                    )}
                  </div>
                </div>

                {/* BARRA DO TIMER */}
                <div className="timer-bar">
                  <div 
                    className="timer-fill" 
                    style={{ 
                      width: timerSeg === null ? '100%' : `${(timerSeg / (obterLimiteTempo(fila[rodAtual - 1]) || 15)) * 100}%`,
                      background: (timerSeg !== null && timerSeg <= 4) ? 'linear-gradient(90deg, #ef4444, #b91c1c)' : 'linear-gradient(90deg, #7c3aed, #4f46e5)'
                    }}
                  ></div>
                </div>

                {/* BOTÃO GLOBAL DE PONTOS DUPLOS DO MODERADOR */}
                <div style={{ textAlign: 'center', margin: '14px 0 10px' }}>
                  {efeitosRodada.rodadaDupla ? (
                    <div 
                      className="rodada-dupla-alerta"
                      style={{ 
                        display: 'inline-flex', 
                        alignItems: 'center', 
                        gap: '8px',
                        background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.2), rgba(245, 158, 11, 0.2))', 
                        border: '2px solid #f59e0b', 
                        color: '#fb923c', 
                        padding: '8px 24px', 
                        borderRadius: '30px', 
                        fontSize: '1.05rem', 
                        fontWeight: 'bold',
                        boxShadow: '0 0 15px rgba(245, 158, 11, 0.3)',
                        animation: 'pulse 1.5s infinite alternate'
                      }}
                    >
                      🔥 RODADA VALENDO PONTOS DUPLOS! (+100% Pontos)
                      {(!rodDescanso && (fila[rodAtual - 1].tipo === 'veloc' ? velocBateu === null : (respJ[0] === null && respJ[1] === null))) && (
                        <button 
                          style={{ background: 'rgba(255, 255, 255, 0.15)', border: 'none', color: '#fff', padding: '2px 8px', borderRadius: '4px', cursor: 'pointer', fontSize: '0.75rem', marginLeft: '10px' }}
                          onClick={() => setEfeitosRodada(prev => ({ ...prev, rodadaDupla: false }))}
                        >
                          Cancelar
                        </button>
                      )}
                    </div>
                  ) : (
                    (!rodDescanso && (fila[rodAtual - 1].tipo === 'veloc' ? velocBateu === null : (respJ[0] === null && respJ[1] === null))) ? (
                      <button 
                        className="btn-poder"
                        style={{ 
                          padding: '8px 24px', 
                          borderRadius: '20px', 
                          fontSize: '0.9rem', 
                          background: 'rgba(245, 158, 11, 0.1)', 
                          borderColor: '#fb923c', 
                          color: '#fb923c',
                          width: 'auto',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          cursor: 'pointer'
                        }}
                        onClick={() => setEfeitosRodada(prev => ({ ...prev, rodadaDupla: true }))}
                      >
                        🔥 Ativar Pontos Duplos (Moderador)
                      </button>
                    ) : null
                  )}
                </div>

                {/* PAINEL DE CARTAS DE PODER */}
                <div className="painel-poderes">
                  {/* PODERES JOGADOR 1 */}
                  <div className="poderes-col">
                    <div style={{ fontSize: '0.78rem', fontWeight: 800, color: '#60a5fa', marginBottom: '6px', textAlign: 'center', textTransform: 'uppercase', letterSpacing: '0.5px' }}>⚡ Cartas de Poder {nomeJ1}</div>
                    <div className="poderes-lista">
                      <button 
                        className={`btn-poder ${poderes[0].block ? 'disponivel' : 'usado'} ${efeitosRodada.bloqueado === 1 ? 'ativo' : ''}`}
                        disabled={poderes[0].block === 0 || rodDescanso || efeitosRodada.bloqueado === 0}
                        onClick={() => usarPoder(0, 'block')}
                        title="Bloquear oponente por esta rodada (Botão Especial 1 no Controle)"
                      >
                        🚫 Bloquear
                      </button>
                      <button 
                        className={`btn-poder ${poderes[0].half ? 'disponivel' : 'usado'} ${efeitosRodada.dica[0] ? 'ativo' : ''}`}
                        disabled={poderes[0].half === 0 || rodDescanso || fila[rodAtual - 1].tipo !== 'mc' || efeitosRodada.bloqueado === 0}
                        onClick={() => usarPoder(0, 'half')}
                        title="Riscar 2 opções erradas (Botão Especial 2 no Controle)"
                      >
                        💡 Dica 50/50
                      </button>
                    </div>
                  </div>

                  {/* DIVISOR */}
                  <div className="divisor-poderes"></div>

                  {/* PODERES JOGADOR 2 */}
                  <div className="poderes-col">
                    <div style={{ fontSize: '0.78rem', fontWeight: 800, color: '#f472b6', marginBottom: '6px', textAlign: 'center', textTransform: 'uppercase', letterSpacing: '0.5px' }}>⚡ Cartas de Poder {nomeJ2}</div>
                    <div className="poderes-lista">
                      <button 
                        className={`btn-poder ${poderes[1].block ? 'disponivel' : 'usado'} ${efeitosRodada.bloqueado === 0 ? 'ativo' : ''}`}
                        disabled={poderes[1].block === 0 || rodDescanso || efeitosRodada.bloqueado === 1}
                        onClick={() => usarPoder(1, 'block')}
                        title="Bloquear oponente por esta rodada (Botão Especial 1 no Controle)"
                      >
                        🚫 Bloquear
                      </button>
                      <button 
                        className={`btn-poder ${poderes[1].half ? 'disponivel' : 'usado'} ${efeitosRodada.dica[1] ? 'ativo' : ''}`}
                        disabled={poderes[1].half === 0 || rodDescanso || fila[rodAtual - 1].tipo !== 'mc' || efeitosRodada.bloqueado === 1}
                        onClick={() => usarPoder(1, 'half')}
                        title="Riscar 2 opções erradas (Botão Especial 2 no Controle)"
                      >
                        💡 Dica 50/50
                      </button>
                    </div>
                  </div>
                </div>

                {/* ENUNCIADO CENTRAL */}
                <div className="pergunta-central">
                  <span className={`tipo-label ${fila[rodAtual - 1].tipo === 'mc' ? 'tl-mc' : fila[rodAtual - 1].tipo === 'vf' ? 'tl-vf' : 'tl-veloc'}`}>
                    {fila[rodAtual - 1].tipo === 'mc' ? 'Múltipla Escolha' : fila[rodAtual - 1].tipo === 'vf' ? 'Verdadeiro ou Falso' : '⚡ Disputa de Velocidade'}
                  </span>
                  <div className="perg-txt"><MathText text={fila[rodAtual - 1].txt} /></div>
                </div>

                {/* ÁREA DE RESPOSTA ATIVA */}
                <div id="arena" style={{ margin: '10px 0' }}>
                  {/* CASO 1: MÚLTIPLA ESCOLHA */}
                  {fila[rodAtual - 1].tipo === 'mc' && (
                    <div className="grade-respostas">
                      {fila[rodAtual - 1].alts.map((alt, idx) => {
                        const correta = fila[rodAtual - 1].resp === idx;
                        let clsAdicional = '';
                        if (rodDescanso) {
                          clsAdicional = correta ? 'correto' : 'errado';
                        } else {
                          // Se algum jogador já respondeu e estamos aguardando
                          const respondeuJ1 = respJ[0] === idx;
                          const respondeuJ2 = respJ[1] === idx;
                          if (respondeuJ1 || respondeuJ2) {
                            clsAdicional = ''; // Mantém sem destaque até fechar
                          }
                        }
                        if (dicaExcluidas.includes(idx)) {
                          clsAdicional += ' dica-escondida';
                        }

                        return (
                          <button 
                            key={idx}
                            className={`resp-btn ${KAHOOT[idx].cls} ${clsAdicional}`}
                            disabled={rodDescanso}
                            onClick={() => {
                              // Se o moderador clicar diretamente via mouse, respeita o bloqueio absoluto
                              if (respJ[0] === null && efeitosRodada.bloqueado !== 0) {
                                responderPerguntaMC(0, idx);
                              } else if (respJ[1] === null && efeitosRodada.bloqueado !== 1) {
                                responderPerguntaMC(1, idx);
                              }
                            }}
                          >
                            <span style={{ fontSize: '1.4rem' }}>{KAHOOT[idx].label}</span>
                            <span><MathText text={alt} /></span>
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {/* CASO 2: VERDADEIRO OU FALSO */}
                  {fila[rodAtual - 1].tipo === 'vf' && (
                    <div className="grade-respostas">
                      {/* VERDADEIRO */}
                      <button 
                        className={`resp-btn vf-btn-v ${rodDescanso ? (fila[rodAtual - 1].resp === 'v' ? 'correto' : 'errado') : ''}`}
                        disabled={rodDescanso}
                        onClick={() => {
                          if (respJ[0] === null && efeitosRodada.bloqueado !== 0) responderPerguntaVF(0, 'v');
                          else if (respJ[1] === null && efeitosRodada.bloqueado !== 1) responderPerguntaVF(1, 'v');
                        }}
                      >
                        <span style={{ fontSize: '1.4rem' }}>🔵</span>
                        <span>Verdadeiro</span>
                      </button>

                      {/* FALSO */}
                      <button 
                        className={`resp-btn vf-btn-f ${rodDescanso ? (fila[rodAtual - 1].resp === 'f' ? 'correto' : 'errado') : ''}`}
                        disabled={rodDescanso}
                        onClick={() => {
                          if (respJ[0] === null && efeitosRodada.bloqueado !== 0) responderPerguntaVF(0, 'f');
                          else if (respJ[1] === null && efeitosRodada.bloqueado !== 1) responderPerguntaVF(1, 'f');
                        }}
                      >
                        <span style={{ fontSize: '1.4rem' }}>🔴</span>
                        <span>Falso</span>
                      </button>
                    </div>
                  )}

                  {/* CASO 3: DISPUTA DE VELOCIDADE */}
                  {fila[rodAtual - 1].tipo === 'veloc' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', width: '100%' }}>
                      {velocBateu === null ? (
                        <div style={{ display: 'flex', gap: '16px' }}>
                          <button 
                            className="btn-veloc-grande bvg-j1" 
                            onClick={() => baterVelocidade(0)}
                            disabled={efeitosRodada.bloqueado === 0}
                            style={{ 
                              opacity: efeitosRodada.bloqueado === 0 ? 0.3 : 1, 
                              cursor: efeitosRodada.bloqueado === 0 ? 'not-allowed' : 'pointer',
                              filter: efeitosRodada.bloqueado === 0 ? 'grayscale(1)' : 'none'
                            }}
                          >
                            🔵 {nomeJ1} bater!
                          </button>
                          <button 
                            className="btn-veloc-grande bvg-j2" 
                            onClick={() => baterVelocidade(1)}
                            disabled={efeitosRodada.bloqueado === 1}
                            style={{ 
                              opacity: efeitosRodada.bloqueado === 1 ? 0.3 : 1, 
                              cursor: efeitosRodada.bloqueado === 1 ? 'not-allowed' : 'pointer',
                              filter: efeitosRodada.bloqueado === 1 ? 'grayscale(1)' : 'none'
                            }}
                          >
                            🩷 {nomeJ2} bater!
                          </button>
                        </div>
                      ) : (
                        <div className="card" style={{ border: '2px solid #fb923c', background: 'rgba(245, 158, 11, 0.05)', textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '16px', alignItems: 'center' }}>
                          <h3 style={{ fontSize: '1.6rem', color: '#fb923c', margin: 0 }}>
                            ⚡ {velocBateu === 0 ? nomeJ1 : nomeJ2} bateu primeiro!
                          </h3>
                          
                          <p style={{ color: '#e5e7eb', fontSize: '1.2rem', margin: 0, fontWeight: 700 }}>
                            📢 Responda oralmente à pergunta!
                          </p>

                          {!velocRevelado && !rodDescanso ? (
                            <button 
                              className="btn-prox" 
                              style={{ background: 'linear-gradient(90deg, #f59e0b, #d97706)', boxShadow: '0 4px 15px rgba(245, 158, 11, 0.3)', margin: '10px 0 0' }}
                              onClick={() => setVelocRevelado(true)}
                            >
                              👁️ Revelar Resposta Correta
                            </button>
                          ) : (
                            <>
                              <div style={{ background: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255, 255, 255, 0.1)', padding: '12px 24px', borderRadius: '12px', width: '100%', maxWidth: '400px' }}>
                                <span style={{ color: '#9ca3af', fontSize: '0.9rem', display: 'block', marginBottom: '4px' }}>Gabarito na tela:</span>
                                <strong style={{ fontSize: '1.3rem', color: '#4ade80' }}><MathText text={fila[rodAtual - 1].resp} /></strong>
                              </div>

                              {!rodDescanso ? (
                                <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', width: '100%' }}>
                                  <button className="btn-ac btn-add" style={{ background: '#16a34a', padding: '12px 30px' }} onClick={() => julgarVelocidade(true)}>
                                    ✅ Respondeu correto (+1.200 pts)
                                  </button>
                                  <button className="btn-ac" style={{ background: '#dc2626', color: '#fff', padding: '12px 30px' }} onClick={() => { julgarVelocidade(false); setVelocRevelado(true); }}>
                                    ❌ Errou / Não respondeu
                                  </button>
                                </div>
                              ) : (
                                <div className="msg-ok" style={{ width: 'fit-content', margin: '0 auto' }}>
                                  Avaliação da velocidade concluída.
                                </div>
                              )}
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {timerSeg === null && !rodDescanso && (
                <div style={{ textAlign: 'center', margin: '14px 0 20px' }}>
                  <button 
                    className="btn-prox" 
                    style={{ background: 'linear-gradient(90deg, #f59e0b, #d97706)', boxShadow: '0 4px 15px rgba(245, 158, 11, 0.3)' }}
                    onClick={encerrarRodadaPorTempo}
                  >
                    ⏳ Encerrar Tempo Manualmente
                  </button>
                </div>
              )}

              {/* STATUS DOS JOGADORES NA RODADA */}
              {fila[rodAtual - 1].tipo !== 'veloc' && (
                <div className="status-jogadores">
                  <div className={`sj-card ${efeitosRodada.bloqueado === 0 ? 'bloqueado' : respJ[0] !== null ? 'respondeu' : 'aguardando'}`}>
                    🔵 {nomeJ1}: {efeitosRodada.bloqueado === 0 ? '🚫 BLOQUEADO!' : respJ[0] !== null ? (rodDescanso ? `Escolheu ${fila[rodAtual - 1].tipo === 'mc' ? KAHOOT[respJ[0]].name : respJ[0] === 'v' ? 'Verdadeiro' : 'Falso'}` : 'Pronto!') : 'Aguardando...'}
                  </div>
                  <div className={`sj-card ${efeitosRodada.bloqueado === 1 ? 'bloqueado' : respJ[1] !== null ? 'respondeu' : 'aguardando'}`}>
                    🩷 {nomeJ2}: {efeitosRodada.bloqueado === 1 ? '🚫 BLOQUEADO!' : respJ[1] !== null ? (rodDescanso ? `Escolheu ${fila[rodAtual - 1].tipo === 'mc' ? KAHOOT[respJ[1]].name : respJ[1] === 'v' ? 'Verdadeiro' : 'Falso'}` : 'Pronto!') : 'Aguardando...'}
                  </div>
                </div>
              )}

              {/* BOTÃO PROXIMA PERGUNTA */}
              {rodDescanso && (
                <button className="btn-prox" onClick={avancarPergunta}>
                  {rodAtual >= fila.length ? 'Finalizar Duelo 🏁' : 'Próxima pergunta →'}
                </button>
              )}
            </>
          )}
        </div>
        )}
      </div>

      {/* 8. TELA FIM DE JOGO */}
      <div id="tela-fim" className={`tela ${tela === 'fim' ? 'ativa' : ''}`}>
        <div className="trofeu">🏆</div>
        <h2>Resultado Final do Duelo</h2>
        
        <div className="venc-final">
          {pts[0] > pts[1] ? `🎉 ${nomeJ1} é a Campeã! 🏆` : pts[1] > pts[0] ? `🎉 ${nomeJ2} é a Campeã! 🏆` : '🤝 Empate Técnico!'}
        </div>

        <div className="placar-final">
          <div className="pf-item">
            <div className="pf-nome" style={{ color: '#60a5fa' }}>🔵 {nomeJ1}</div>
            <div className="pf-pts" style={{ color: '#60a5fa' }}>{pts[0].toLocaleString('pt-BR')}</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', color: '#a78bfa', fontSize: '1.6rem', fontWeight: 800 }}>×</div>
          <div className="pf-item">
            <div className="pf-nome" style={{ color: '#f472b6' }}>🩷 {nomeJ2}</div>
            <div className="pf-pts" style={{ color: '#f472b6' }}>{pts[1].toLocaleString('pt-BR')}</div>
          </div>
        </div>

        {/* HISTÓRICO DE TODAS AS RODADAS */}
        {historico.length > 0 && (
          <div className="historico">
            <h3>📋 Histórico do Duelo por Rodada</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '280px', overflowY: 'auto', paddingRight: '4px' }}>
              {historico.map((h, i) => (
                <div key={i} style={{ padding: '12px', borderBottom: '1px solid rgba(255, 255, 255, 0.05)', fontSize: '0.85rem' }}>
                  <div style={{ fontWeight: 700, color: '#a78bfa', marginBottom: '4px' }}>
                    Rodada #{h.rodada}: <MathText text={h.txt} />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#9ca3af', flexWrap: 'wrap', gap: '8px' }}>
                    <span>🔵 {nomeJ1}: <strong><MathText text={h.j1} /></strong></span>
                    <span>🩷 {nomeJ2}: <strong><MathText text={h.j2} /></strong></span>
                    <span style={{ color: '#4ade80' }}>✔ Gabarito: <strong><MathText text={h.correta} /></strong></span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap', justifyContent: 'center', marginTop: '10px' }}>
          <button className="btn-start" onClick={iniciarJogoDuelo}>
            Jogar novamente 🔄
          </button>
          <button className="btn-start" style={{ background: 'linear-gradient(90deg, #374151, #4b5563)', boxShadow: 'none' }} onClick={() => irParaTela('menu')}>
            Voltar ao Menu 🏠
          </button>
        </div>
      </div>
    </div>
  );
}
