import React, { useState, useEffect, useRef } from 'react';
import * as XLSX from 'xlsx';
import katex from 'katex';
import 'katex/dist/katex.min.css';
import { initFirebase, salvarBackupImAcao, publicarBancoNuvem, obterBancoNuvem } from './firebase';

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

// Error Boundary para capturar erros de renderização
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo);
    this.setState({ errorInfo });
    if (this.props.onError) this.props.onError({ message: String(error), stack: errorInfo && errorInfo.componentStack });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: 24 }}>
          <h2>Ocorreu um erro na aplicação.</h2>
          <pre style={{ whiteSpace: 'pre-wrap' }}>{String(this.state.error && this.state.error.toString())}</pre>
          <details style={{ whiteSpace: 'pre-wrap', marginTop: 12 }}>{this.state.errorInfo && this.state.errorInfo.componentStack}</details>
          <div style={{ marginTop: 12 }}>
            <button className="btn-menu btn-outline" onClick={() => this.setState({ hasError: false, error: null, errorInfo: null })}>Tentar novamente</button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
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
      case 'dice': {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(180, now);
        osc.frequency.exponentialRampToValueAtTime(60, now + 0.15);
        
        gain.gain.setValueAtTime(0.06, now);
        gain.gain.linearRampToValueAtTime(0.001, now + 0.15);
        
        osc.start(now);
        osc.stop(now + 0.15);
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

const PISTAS_PADRAO = [
  {
    cat: 'Pessoa',
    resp: 'Albert Einstein',
    pistas: [
      { txt: 'Nasci na Alemanha em 1879 e sou amplamente considerado um dos maiores físicos da história.', efeito: null },
      { txt: 'Minha fórmula mais famosa relaciona energia, massa e velocidade da luz: E=mc².', efeito: 'avance_1' },
      { txt: 'Ganhei o Prêmio Nobel de Física em 1921 pela minha explicação do efeito fotoelétrico.', efeito: null },
      { txt: 'Recusei formalmente a presidência do Estado de Israel em 1952.', efeito: 'recue_1' },
      { txt: 'Desenvolvi a Teoria da Relatividade Geral e sou famoso pelo meu cabelo despenteado e foto mostrando a língua.', efeito: null }
    ]
  },
  {
    cat: 'Lugar',
    resp: 'Paris',
    pistas: [
      { txt: 'Sou uma capital europeia cortada pelo Rio Sena.', efeito: null },
      { txt: 'Tenho um monumento de ferro construído originalmente para a Exposição Universal de 1889.', efeito: 'avance_2' },
      { txt: 'Sou mundialmente conhecida como a "Cidade Luz" e centro global de arte, moda e gastronomia.', efeito: null },
      { txt: 'Abrigo o Museu do Louvre, onde está exposta a famosa Mona Lisa de Leonardo da Vinci.', efeito: 'oponente_recue_1' },
      { txt: 'Minha avenida mais charmosa é a Champs-Élysées e possuo o Arco do Triunfo.', efeito: null }
    ]
  },
  {
    cat: 'Coisa',
    resp: 'Smartphone',
    pistas: [
      { txt: 'Fui criado a partir da fusão de várias tecnologias móveis, de computação e telefonia.', efeito: null },
      { txt: 'Meu primeiro modelo de grande sucesso moderno foi apresentado por Steve Jobs em 2007 (iPhone).', efeito: 'avance_1' },
      { txt: 'Minha tela é sensível ao toque (touchscreen) e rodo aplicativos (apps) diversos.', efeito: null },
      { txt: 'Muitas pessoas me desbloqueiam dezenas de vezes ao dia por reconhecimento facial ou biometria.', efeito: 'recue_1' },
      { txt: 'Substituí câmeras fotográficas, calculadoras, agendas e tocadores de música em um único bolso.', efeito: null }
    ]
  },
  {
    cat: 'Ano',
    resp: '1969',
    pistas: [
      { txt: 'Sou um ano da década de 60 do século XX.', efeito: null },
      { txt: 'Neste ano ocorreu o lentário festival de música de Woodstock nos EUA.', efeito: 'avance_2' },
      { txt: 'O homem pisou na Lua pela primeira vez com a missão Apollo 11 de Neil Armstrong.', efeito: null },
      { txt: 'Foi o ano em que a rede precursora da internet, a ARPANET, realizou sua primeira conexão.', efeito: 'oponente_recue_2' },
      { txt: 'No Brasil, foi editado o Ato Institucional Número Cinco (AI-5) no final do ano anterior, marcando este ano pelo auge da ditadura.', efeito: null }
    ]
  },
  {
    cat: 'Animal',
    resp: 'Ornitorrinco',
    pistas: [
      { txt: 'Sou um mamífero semiaquático nativo do leste da Austrália.', efeito: null },
      { txt: 'Sou uma das poucas espécies de mamíferos que põem ovos (monotremados).', efeito: 'avance_2' },
      { txt: 'Os machos possuem um esporão venenoso nas patas traseiras capaz de causar dores intensas.', efeito: null },
      { txt: 'Possuo bico de pato, rabo de castor e patas com membranas interdigitais.', efeito: 'recue_2' },
      { txt: 'Inspirei o famoso agente secreto "Perry" em um desenho animado moderno da Disney.', efeito: null }
    ]
  }
];

const IMAGEM_ACAO_PADRAO = [
  {
    opcoes: [
      { num: 1, cat: 'Ação', resp: 'Andar de Bicicleta' },
      { num: 2, cat: 'Objeto', resp: 'Liquidificador' },
      { num: 3, cat: 'Lugar', resp: 'Torre Eiffel' },
      { num: 4, cat: 'Pessoa/Animal', resp: 'Harry Potter' },
      { num: 5, cat: 'Difícil', resp: 'Criptomoeda' }
    ]
  },
  {
    opcoes: [
      { num: 1, cat: 'Ação', resp: 'Saltar de Paraquedas' },
      { num: 2, cat: 'Objeto', resp: 'Computador Portátil' },
      { num: 3, cat: 'Lugar', resp: 'Muralha da China' },
      { num: 4, cat: 'Pessoa/Animal', resp: 'Albert Einstein' },
      { num: 5, cat: 'Difícil', resp: 'Buraco Negro' }
    ]
  },
  {
    opcoes: [
      { num: 1, cat: 'Ação', resp: 'Escovar os Dentes' },
      { num: 2, cat: 'Objeto', resp: 'Guarda-chuva' },
      { num: 3, cat: 'Lugar', resp: 'Estátua da Liberdade' },
      { num: 4, cat: 'Pessoa/Animal', resp: 'Leão Africano' },
      { num: 5, cat: 'Difícil', resp: 'Inteligência Artificial' }
    ]
  },
  {
    opcoes: [
      { num: 1, cat: 'Ação', resp: 'Tocar Guitarra' },
      { num: 2, cat: 'Objeto', resp: 'Forno de Micro-ondas' },
      { num: 3, cat: 'Lugar', resp: 'Coliseu de Roma' },
      { num: 4, cat: 'Pessoa/Animal', resp: 'Sherlock Holmes' },
      { num: 5, cat: 'Difícil', resp: 'Aquecimento Global' }
    ]
  },
  {
    opcoes: [
      { num: 1, cat: 'Ação', resp: 'Nadar no Mar' },
      { num: 2, cat: 'Objeto', resp: 'Telescópio Espacial' },
      { num: 3, cat: 'Lugar', resp: 'Monte Everest' },
      { num: 4, cat: 'Pessoa/Animal', resp: 'Dinossauro Rex' },
      { num: 5, cat: 'Difícil', resp: 'Teoria da Relatividade' }
    ]
  }
];

const obterCatCasaImAcao = (numeroCasa) => {
  if (numeroCasa === 4 || numeroCasa === 9 || numeroCasa === 17 || numeroCasa === 19 || numeroCasa === 24 || numeroCasa === 28) {
    return 'Todos Jogam';
  }
  const cats = ['Ação', 'Objeto', 'Lugar', 'Pessoa/Animal', 'Difícil'];
  return cats[(numeroCasa - 1) % cats.length];
};

const obterCorCasaImAcao = (cat) => {
  switch (cat) {
    case 'Ação': return '#ef4444'; // Vermelho
    case 'Objeto': return '#10b981'; // Verde
    case 'Lugar': return '#3b82f6'; // Azul
    case 'Pessoa/Animal': case 'Pessoa': return '#eab308'; // Amarelo
    case 'Mundo': return '#a855f7'; // Roxo
    case 'Difícil': return '#f97316'; // Laranja
    case 'Todos Jogam': return '#a855f7'; // Violeta neon brilhante para Todas as Equipes
    default: return '#7c3aed';
  }
};

const obterDesafioTexto = (num) => {
  switch (num) {
    case 1: return { topo: 'Desafio', centro: 'NENHUM', desc: 'Normal' };
    case 2: return { topo: 'Desafio', centro: 'MÃO', desc: 'Oposta' };
    case 3: return { topo: 'Desafio', centro: 'OLHOS', desc: 'Fechados' };
    case 4: return { topo: 'Desafio', centro: 'DUAS', desc: 'Figuras' };
    case 5: return { topo: 'Desafio', centro: 'LÁPIS', desc: 'Sem Tirar' };
    case 6: return { topo: 'Desafio', centro: 'NENHUM', desc: 'Normal' };
    default: return { topo: 'Desafio', centro: 'NENHUM', desc: 'Normal' };
  }
};

const IMAGENS_PADRAO_MEMORIA = [
  "https://images.unsplash.com/photo-1538481199705-c710c4e965fc?q=80&w=250&auto=format&fit=crop", // Controle de videogame / Gaming
  "https://images.unsplash.com/photo-1547447134-cd3f5c716030?q=80&w=250&auto=format&fit=crop", // Skate urbano / Cultura jovem
  "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?q=80&w=250&auto=format&fit=crop", // Headphone moderno / Música
  "https://images.unsplash.com/photo-1542751371-adc38448a05e?q=80&w=250&auto=format&fit=crop", // Setup Gamer Neon / Tecnologia
  "https://images.unsplash.com/photo-1561055657-b9e0bf0fa360?q=80&w=250&auto=format&fit=crop", // Graffiti colorido / Arte urbana
  "https://images.unsplash.com/photo-1519766304817-4f37bda74a27?q=80&w=250&auto=format&fit=crop", // Basquete de rua / Esportes
  "https://images.unsplash.com/photo-1542291026-7eec264c27ff?q=80&w=250&auto=format&fit=crop", // Tênis Sneaker estiloso / Moda jovem
  "https://images.unsplash.com/photo-1593508512255-86ab42a8e620?q=80&w=250&auto=format&fit=crop", // Óculos de Realidade Virtual (VR)
  "https://images.unsplash.com/photo-1484755560695-a4c7477ab9ea?q=80&w=250&auto=format&fit=crop", // Guitarra elétrica neon / Rock
  "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=250&auto=format&fit=crop", // Astronauta Cyberpunk / Arte digital
  "https://images.unsplash.com/photo-1529156069898-49953e39b3ac?q=80&w=250&auto=format&fit=crop", // Grupo de amigos rindo / Social
  "https://images.unsplash.com/photo-1536440136628-849c177e76a1?q=80&w=250&auto=format&fit=crop", // Cinema / Pipoca / Filmes
  "https://images.unsplash.com/photo-1485827404703-89b55fcc595e?q=80&w=250&auto=format&fit=crop", // Robótica / Tecnologia do futuro
  "https://images.unsplash.com/photo-1504280390367-361c6d9f38f4?q=80&w=250&auto=format&fit=crop"  // Aventura / Acampamento ao ar livre
];

const obterTituloAura = (pares) => {
  if (pares === 0) return "Sem Aura 😐";
  if (pares >= 1 && pares <= 2) return "Aura Básica (+1000) 😎";
  if (pares >= 3 && pares <= 4) return "Aura Sigma (+3000) 🗿";
  if (pares >= 5 && pares <= 6) return "Muita Aura (+5000) 🔥";
  if (pares >= 7 && pares <= 8) return "Monstro da Aura (+7000) 👑";
  return "Pico de Aura / Deus da Aura (10000+) 🌌💫";
};

export default function App() {
  // --- ESTADOS DO JOGO DAS TRÊS PISTAS ---
  const [modoJogo, setModoJogo] = useState('duelo'); // 'duelo' | 'pistas' | 'imacao'
  const [cartasPistas, setCartasPistas] = useState(() => {
    const saved = localStorage.getItem('dm_pistas');
    return saved ? JSON.parse(saved) : PISTAS_PADRAO;
  });
  const [cartaPistaAtual, setCartaPistaAtual] = useState(0);
  const [pistasFila, setPistasFila] = useState([]);
  const [pistasPontuacao, setPistasPontuacao] = useState([1, 1]); // Posições no tabuleiro (1 a 30)
  const [pistasEquipeVez, setPistasEquipeVez] = useState(0); // 0 ou 1
  const [pistasReveladas, setPistasReveladas] = useState([false, false, false, false, false]);
  const [pistasTentouAdivinhar, setPistasTentouAdivinhar] = useState([false, false]);
  const [pistasEfeitoAtivo, setPistasEfeitoAtivo] = useState(null); // { equipe, desc, tipo }
  const [pistasFluxoPalpite, setPistasFluxoPalpite] = useState(null); // null | 'palpite' | 'revelado'
  const [pistasVezPassada, setPistasVezPassada] = useState(false);
  const [iaAba, setIaAba] = useState('duelo'); // 'duelo' | 'pistas'
  const [iaPistasGeradas, setIaPistasGeradas] = useState([]);
  const [pistasQtdRodadas, setPistasQtdRodadas] = useState(5);
  const [pistasTimerSeg, setPistasTimerSeg] = useState(null);
  const pistasTimerIntRef = useRef(null);

  // --- ESTADOS DO NOVO JOGO: IMAGEM E AÇÃO ---
  const [cartasImAcao, setCartasImAcao] = useState(() => {
    const saved = localStorage.getItem('dm_imacao');
    return saved ? JSON.parse(saved) : IMAGEM_ACAO_PADRAO;
  });
  const [imAcaoFila, setImAcaoFila] = useState([]);
  const [imAcaoFilaIndex, setImAcaoFilaIndex] = useState(0); // posicao atual na fila embaralhada
  const [imAcaoPontuacao, setImAcaoPontuacao] = useState([1, 1]);
  const [imAcaoRodada, setImAcaoRodada] = useState(1);
  const [imAcaoCartaAtual, setImAcaoCartaAtual] = useState(null);
  const [imAcaoTimer, setImAcaoTimer] = useState(60);
  const [imAcaoMaxTimer, setImAcaoMaxTimer] = useState(60);
  const [imAcaoFluxo, setImAcaoFluxo] = useState('preparacao'); // 'preparacao' | 'jogando' | 'revelada'
  const [imAcaoCartaRevelada, setImAcaoCartaRevelada] = useState(false);
  const [imAcaoProjetorRevelado, setImAcaoProjetorRevelado] = useState(false);
  const [imAcaoEquipeVez, setImAcaoEquipeVez] = useState(0);
  const [isProjetorMode, setIsProjetorMode] = useState(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      return params.get('projetor') === 'true';
    } catch (e) {
      return false;
    }
  });

  // --- ESTADOS DE NAVEGAÇÃO ---
  const [tela, setTela] = useState(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      if (params.get('projetor') === 'true') return 'ia-projetor';
      const last = localStorage.getItem('dm_last_tela');
      if (last === 'ia-projetor' || last === 'ia-projetor-fim') return 'menu';
      return last || 'menu';
    } catch (e) {
      return 'menu';
    }
  }); // 'menu' | 'ia' | 'controles' | 'cadastro' | 'selecao' | 'nomes' | 'jogo' | 'fim'
  const [origemConfig, setOrigemConfig] = useState(null);

  const irParaTela = (dest) => {
    playSound('click');
    setTela(dest);
  };

  // Persistir tela atual para reinício seguro (apenas se não for modo projetor)
  useEffect(() => {
    if (isProjetorMode) return;
    try { localStorage.setItem('dm_last_tela', tela); } catch (e) { /* noop */ }
  }, [tela, isProjetorMode]);

  // Estados dos Dados e Seleção de Opção/Modo
  const [imAcaoOpcaoSelecionada, setImAcaoOpcaoSelecionada] = useState(0); // 0 a 4
  const [imAcaoModoRepresentacao, setImAcaoModoRepresentacao] = useState('Desenho'); // 'Mímica' | 'Desenho'
  const [imAcaoDadoCategoria, setImAcaoDadoCategoria] = useState(1); // 1 a 6
  const [imAcaoDadoMovimentacao, setImAcaoDadoMovimentacao] = useState(2); // 1 a 6
  const [imAcaoDadosRolando, setImAcaoDadosRolando] = useState(false);
  const [imAcaoDadoDesafio, setImAcaoDadoDesafio] = useState(1); // 1 a 6
  const [imAcaoDadoDesafioRolando, setImAcaoDadoDesafioRolando] = useState(false);
  const [imAcaoLousaAberta, setImAcaoLousaAberta] = useState(false);
  const [imAcaoTelaBrancaAtiva, setImAcaoTelaBrancaAtiva] = useState(false);
  const [iaImAcaoGeradas, setIaImAcaoGeradas] = useState([]);
  const [backupStatus, setBackupStatus] = useState('');
  const [appError, setAppError] = useState(null);
  const [autoBackupEnabled, setAutoBackupEnabled] = useState(() => {
    try { return localStorage.getItem('dm_auto_backup') === '1'; } catch (e) { return false; }
  });

  const imAcaoChannelRef = useRef(null);
  const imAcaoTimerIntRef = useRef(null);

  // --- ESTADOS DO NOVO JOGO: JOGO DA MEMÓRIA ---
  const [memoCartas, setMemoCartas] = useState([]);
  const [memoPontuacao, setMemoPontuacao] = useState([0, 0]);
  const [memoEquipeVez, setMemoEquipeVez] = useState(0); // 0 para Equipe 1, 1 para Equipe 2
  const [memoCartasSelecionadas, setMemoCartasSelecionadas] = useState([]); // indices de cartas viradas no turno (0 a 29)
  const [memoEfeitoAtivo, setMemoEfeitoAtivo] = useState(null); // 'embaralhar' | 'revelar' | null
  const [memoMateria, setMemoMateria] = useState('');
  const [memoBloqueioCliques, setMemoBloqueioCliques] = useState(false);
  const [memoAuraFeedback, setMemoAuraFeedback] = useState(null);
  const [memoSurpresaEfeito1, setMemoSurpresaEfeito1] = useState('embaralhar');
  const [memoSurpresaEfeito2, setMemoSurpresaEfeito2] = useState('olho');
  const [memoSurpresaEfeito3, setMemoSurpresaEfeito3] = useState('embaralhar');
  const [memoImagensPool, setMemoImagensPool] = useState(() => {
    const saved = localStorage.getItem('dm_memo_imagens');
    return saved ? JSON.parse(saved) : IMAGENS_PADRAO_MEMORIA;
  });
  const [cadMemoImagemUrl, setCadMemoImagemUrl] = useState('');
  const [cadMemoImagemMateria, setCadMemoImagemMateria] = useState('');

  const [memoImgSurpresaEmbaralhar, setMemoImgSurpresaEmbaralhar] = useState(() => localStorage.getItem('memoImgSurpresaEmbaralhar') || "https://images.unsplash.com/photo-1527489377706-5bf97e608852?q=80&w=250&auto=format&fit=crop");
  const [memoImgSurpresaOlho, setMemoImgSurpresaOlho] = useState(() => localStorage.getItem('memoImgSurpresaOlho') || "https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=250&auto=format&fit=crop");
  const [memoImgSurpresaGanharAura, setMemoImgSurpresaGanharAura] = useState(() => localStorage.getItem('memoImgSurpresaGanharAura') || "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=250&auto=format&fit=crop");
  const [memoImgSurpresaPerderAura, setMemoImgSurpresaPerderAura] = useState(() => localStorage.getItem('memoImgSurpresaPerderAura') || "https://images.unsplash.com/photo-1594322436404-5a0526db4d13?q=80&w=250&auto=format&fit=crop");
  const [memoImgSurpresaVezExtra, setMemoImgSurpresaVezExtra] = useState(() => localStorage.getItem('memoImgSurpresaVezExtra') || "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?q=80&w=250&auto=format&fit=crop");

  // --- NOVOS ESTADOS DA CUSTOMIZAÇÃO DO JOGO DA MEMÓRIA ---
  const [mostrarCriarCategoriaMemo, setMostrarCriarCategoriaMemo] = useState(false);
  const [novaCategoriaMemoInput, setNovaCategoriaMemoInput] = useState('');
  const [materiaCustomizarSurpresas, setMateriaCustomizarSurpresas] = useState('');
  const [memoSurpresasPorMateria, setMemoSurpresasPorMateria] = useState(() => {
    const saved = localStorage.getItem('dm_memo_surpresas_mat');
    return saved ? JSON.parse(saved) : {};
  });

  const [codigoSalaOnline, setCodigoSalaOnline] = useState(() => localStorage.getItem('codigoSalaOnline') || '');
  const [sincronismoAutomatico, setSincronismoAutomatico] = useState(() => localStorage.getItem('sincronismoAutomatico') === 'true');
  const [statusSincronismo, setStatusSincronismo] = useState('Nuvem não ativa. Insira o Código de Acesso.');

  const [memoCartaEscala, setMemoCartaEscala] = useState(() => Number(localStorage.getItem('memoCartaEscala')) || 100);
  const [memoProjetorCartaEscala, setMemoProjetorCartaEscala] = useState(100);

  const [pistasEquipeIniciar, setPistasEquipeIniciar] = useState(() => Number(localStorage.getItem('pistasEquipeIniciar')) || 0);
  const [imAcaoEquipeIniciar, setImAcaoEquipeIniciar] = useState(() => Number(localStorage.getItem('imAcaoEquipeIniciar')) || 0);
  const [memoEquipeIniciar, setMemoEquipeIniciar] = useState(() => Number(localStorage.getItem('memoEquipeIniciar')) || 0);

  useEffect(() => {
    localStorage.setItem('pistasEquipeIniciar', String(pistasEquipeIniciar));
  }, [pistasEquipeIniciar]);

  useEffect(() => {
    localStorage.setItem('imAcaoEquipeIniciar', String(imAcaoEquipeIniciar));
  }, [imAcaoEquipeIniciar]);

  useEffect(() => {
    localStorage.setItem('memoEquipeIniciar', String(memoEquipeIniciar));
  }, [memoEquipeIniciar]);

  useEffect(() => {
    localStorage.setItem('memoCartaEscala', String(memoCartaEscala));
  }, [memoCartaEscala]);

  useEffect(() => {
    localStorage.setItem('codigoSalaOnline', codigoSalaOnline);
  }, [codigoSalaOnline]);

  useEffect(() => {
    localStorage.setItem('sincronismoAutomatico', sincronismoAutomatico ? 'true' : 'false');
  }, [sincronismoAutomatico]);

  useEffect(() => {
    localStorage.setItem('memoImgSurpresaEmbaralhar', memoImgSurpresaEmbaralhar);
  }, [memoImgSurpresaEmbaralhar]);
  useEffect(() => {
    localStorage.setItem('memoImgSurpresaOlho', memoImgSurpresaOlho);
  }, [memoImgSurpresaOlho]);
  useEffect(() => {
    localStorage.setItem('memoImgSurpresaGanharAura', memoImgSurpresaGanharAura);
  }, [memoImgSurpresaGanharAura]);
  useEffect(() => {
    localStorage.setItem('memoImgSurpresaPerderAura', memoImgSurpresaPerderAura);
  }, [memoImgSurpresaPerderAura]);
  useEffect(() => {
    localStorage.setItem('memoImgSurpresaVezExtra', memoImgSurpresaVezExtra);
  }, [memoImgSurpresaVezExtra]);

  useEffect(() => {
    localStorage.setItem('dm_memo_surpresas_mat', JSON.stringify(memoSurpresasPorMateria));
  }, [memoSurpresasPorMateria]);

  // Pré-carregamento (Preloading) de Imagens do Jogo da Memória em Cache local do navegador
  useEffect(() => {
    if (!memoImagensPool || memoImagensPool.length === 0) return;
    
    // Filtra as imagens da categoria selecionada ou Gerais para cachear
    let imagensParaCachear = memoImagensPool
      .filter(img => typeof img === 'object' ? (img.mat === memoMateria || !img.mat) : true)
      .map(img => typeof img === 'object' ? img.url : img);

    // Adiciona imagens padrão de fábrica ao cache para garantir carregamento instantâneo
    const padroes = [
      ...IMAGENS_PADRAO_MEMORIA,
      memoImgSurpresaEmbaralhar,
      memoImgSurpresaOlho
    ];
    
    const unicasUrls = Array.from(new Set([...imagensParaCachear, ...padroes]));

    // Dispara o preloading silencioso instanciando Image objects
    unicasUrls.forEach(url => {
      if (!url) return;
      const img = new Image();
      img.src = url;
    });
  }, [memoMateria, memoImagensPool, memoImgSurpresaEmbaralhar, memoImgSurpresaOlho]);

  useEffect(() => {
    localStorage.setItem('dm_memo_imagens', JSON.stringify(memoImagensPool));
  }, [memoImagensPool]);

  useEffect(() => {
    localStorage.setItem('dm_imacao', JSON.stringify(cartasImAcao));
  }, [cartasImAcao]);

  useEffect(() => {
    initFirebase();
  }, []);

  // Captura global de erros para diagnosticar tela em branco
  useEffect(() => {
    const onErr = (message, source, lineno, colno, error) => {
      try {
        const msg = message?.toString?.() || String(message);
        const srcStr = String(source || '');
        
        // Ignorar erros vindos de extensões ou scripts de terceiros externos
        if (
          srcStr.includes('chrome-extension') || 
          srcStr.includes('pinComponent') ||
          srcStr.includes('extension') ||
          msg.includes('chrome-extension') ||
          msg.includes('pinComponent')
        ) return false;

        // Ignorar erros internos do BroadcastChannel / HMR do Vite
        if (
          msg.includes('BroadcastChannel') ||
          msg.includes('Channel is closed') ||
          msg.includes('postMessage') ||
          msg.includes('isTrusted') ||
          msg === '[object ErrorEvent]' ||
          msg === 'Script error.'
        ) return false;
        console.error('Global error captured:', msg, error || { source, lineno, colno });
        setAppError({ message: msg, stack: (error && error.stack) || `${source}:${lineno}:${colno}` });
      } catch (e) {
        // noop
      }
      return false;
    };

    const onRej = (ev) => {
      try {
        const reason = ev && (ev.reason || ev.detail || ev);
        const msg = reason && reason.message ? reason.message : String(reason);
        const stackStr = String((reason && reason.stack) || '');

        // Ignorar rejeições vindas de extensões do Chrome ou scripts externos
        if (
          msg.includes('chrome-extension') || 
          msg.includes('pinComponent') ||
          stackStr.includes('chrome-extension') ||
          stackStr.includes('pinComponent')
        ) return;

        // Ignorar erros do BroadcastChannel e do próprio Vite HMR
        if (msg.includes('BroadcastChannel') || msg.includes('postMessage') || msg.includes('Channel is closed')) return;
        console.error('Unhandled rejection captured:', ev);
        setAppError({ message: msg, stack: reason && reason.stack ? reason.stack : JSON.stringify(reason) });
      } catch (e) {}
    };

    window.addEventListener('error', onErr);
    window.addEventListener('unhandledrejection', onRej);

    return () => {
      window.removeEventListener('error', onErr);
      window.removeEventListener('unhandledrejection', onRej);
    };
  }, []);

  // Automatic backup (conditional)
  useEffect(() => {
    try { localStorage.setItem('dm_auto_backup', autoBackupEnabled ? '1' : '0'); } catch (e) {}
  }, [autoBackupEnabled]);

  useEffect(() => {
    if (!autoBackupEnabled) return;

    const backupPayload = {
      timestamp: new Date().toISOString(),
      cartasImAcao,
      imAcaoFila,
      imAcaoPontuacao,
      imAcaoRodada,
      imAcaoCartaAtual,
      imAcaoTimer,
      imAcaoMaxTimer,
      imAcaoFluxo,
      imAcaoCartaRevelada,
      imAcaoProjetorRevelado,
      imAcaoEquipeVez,
      imAcaoOpcaoSelecionada,
      imAcaoModoRepresentacao,
      imAcaoDadoCategoria,
      imAcaoDadoMovimentacao,
      imAcaoDadosRolando,
      imAcaoDadoDesafio,
      imAcaoDadoDesafioRolando,
      imAcaoLousaAberta,
      imAcaoTelaBrancaAtiva,
      iaImAcaoGeradas,
    };

    const timer = setTimeout(() => {
      salvarBackupImAcao(backupPayload)
        .then(() => setBackupStatus('Backup salvo em nuvem.'))
        .catch((error) => {
          console.error('Backup Firebase falhou:', error);
          setBackupStatus('Falha ao salvar backup em nuvem.');
        });
    }, 1000);

    return () => clearTimeout(timer);
  }, [
    autoBackupEnabled,
    cartasImAcao,
    imAcaoFila,
    imAcaoPontuacao,
    imAcaoRodada,
    imAcaoCartaAtual,
    imAcaoTimer,
    imAcaoMaxTimer,
    imAcaoFluxo,
    imAcaoCartaRevelada,
    imAcaoProjetorRevelado,
    imAcaoEquipeVez,
    imAcaoOpcaoSelecionada,
    imAcaoModoRepresentacao,
    imAcaoDadoCategoria,
    imAcaoDadoMovimentacao,
    imAcaoDadosRolando,
    imAcaoDadoDesafio,
    imAcaoDadoDesafioRolando,
    imAcaoLousaAberta,
    imAcaoTelaBrancaAtiva,
    iaImAcaoGeradas,
  ]);

  const enviarMsgProjetor = (type, data = {}) => {
    if (imAcaoChannelRef.current) {
      let lousaAbertaSinc = imAcaoLousaAberta;
      if (type === 'ABRIR_LOUSA') lousaAbertaSinc = true;
      if (type === 'FECHAR_LOUSA') lousaAbertaSinc = false;

      // Injeta incondicionalmente todos os estados críticos de Imagem e Ação e Jogo da Memória para sincronização atômica
      const dataSinc = {
        ...data,
        _sinc: {
          modoJogo,
          carta: imAcaoCartaAtual,
          opcaoSelecionada: imAcaoOpcaoSelecionada,
          modo: imAcaoModoRepresentacao,
          pontuacao: imAcaoPontuacao,
          rodada: imAcaoRodada,
          equipeVez: imAcaoEquipeVez,
          fluxo: imAcaoFluxo,
          timer: imAcaoTimer,
          maxTimer: imAcaoMaxTimer,
          dadoCat: imAcaoDadoCategoria,
          dadoMov: imAcaoDadoMovimentacao,
          dadosRolando: imAcaoDadosRolando,
          dadoDesafio: imAcaoDadoDesafio,
          dadoDesafioRolando: imAcaoDadoDesafioRolando,
          lousaAberta: lousaAbertaSinc,
          cartaRevelada: imAcaoCartaRevelada,
          projetorRevelado: imAcaoProjetorRevelado,
          nomeJ1,
          nomeJ2,
          telaBrancaAtiva: imAcaoTelaBrancaAtiva,
          // Estados de Jogo da Memória
          memoCartas,
          memoPontuacao,
          memoEquipeVez,
          memoCartasSelecionadas,
          memoEfeitoAtivo,
          memoMateria
        }
      };
      try {
        imAcaoChannelRef.current.postMessage({ type, data: dataSinc });
      } catch (e) {
        // Canal fechado (ex: HMR) — limpar ref para reconexão automática
        imAcaoChannelRef.current = null;
      }
    }
  };

  // Backup manual acionado pelo usuário
  const triggerManualBackup = async () => {
    setBackupStatus('Salvando backup...');
    const backupPayload = {
      timestamp: new Date().toISOString(),
      cartasImAcao,
      imAcaoFila,
      imAcaoPontuacao,
      imAcaoRodada,
      imAcaoCartaAtual,
      imAcaoTimer,
      imAcaoMaxTimer,
      imAcaoFluxo,
      imAcaoCartaRevelada,
      imAcaoProjetorRevelado,
      imAcaoEquipeVez,
      imAcaoOpcaoSelecionada,
      imAcaoModoRepresentacao,
      imAcaoDadoCategoria,
      imAcaoDadoMovimentacao,
      imAcaoDadosRolando,
      imAcaoDadoDesafio,
      imAcaoDadoDesafioRolando,
      imAcaoLousaAberta,
      imAcaoTelaBrancaAtiva,
      iaImAcaoGeradas,
    };

    try {
      await salvarBackupImAcao(backupPayload);
      setBackupStatus('Backup salvo em nuvem.');
    } catch (err) {
      console.error('Erro backup manual:', err);
      setBackupStatus('Falha ao salvar backup em nuvem.');
    }
  };

  const tratarMensagemProjetor = (type, data) => {
    // 1. Handshake: Solicitação de sincronização de estado (Projetor -> Moderador)
    if (type === 'SOLICITAR_SINCRONIZACAO') {
      if (!isProjetorMode) {
        enviarMsgProjetor('SINCRONIZAR_ESTADO', {
          modoJogo,
          pontuacao: imAcaoPontuacao,
          rodada: imAcaoRodada,
          carta: imAcaoCartaAtual,
          equipeVez: imAcaoEquipeVez,
          maxTimer: imAcaoMaxTimer,
          timer: imAcaoTimer,
          fluxo: imAcaoFluxo,
          opcaoSelecionada: imAcaoOpcaoSelecionada,
          modo: imAcaoModoRepresentacao,
          dadoCat: imAcaoDadoCategoria,
          dadoMov: imAcaoDadoMovimentacao,
          dadosRolando: imAcaoDadosRolando,
          dadoDesafio: imAcaoDadoDesafio,
          dadoDesafioRolando: imAcaoDadoDesafioRolando,
          lousaAberta: imAcaoLousaAberta,
          cartaRevelada: imAcaoCartaRevelada,
          projetorRevelado: imAcaoProjetorRevelado,
          nomeJ1,
          nomeJ2,
          telaBrancaAtiva: imAcaoTelaBrancaAtiva,
          // Jogo da Memória
          memoCartas,
          memoPontuacao,
          memoEquipeVez,
          memoCartasSelecionadas,
          memoEfeitoAtivo,
          memoMateria
        });
      }
      return;
    }

    // 2. Handshake: Carregamento do Estado Completo Síncrono (Moderador -> Projetor)
    if (type === 'SINCRONIZAR_ESTADO') {
      if (isProjetorMode && data) {
        if (data.modoJogo === 'memoria') {
          setTela('memo-projetor');
        } else {
          setTela('ia-projetor');
        }
        if (data.modoJogo !== undefined) setModoJogo(data.modoJogo);
        if (data.pontuacao !== undefined) setImAcaoPontuacao(data.pontuacao);
        if (data.rodada !== undefined) setImAcaoRodada(data.rodada);
        if (data.carta !== undefined) setImAcaoCartaAtual(data.carta);
        if (data.equipeVez !== undefined) setImAcaoEquipeVez(data.equipeVez);
        if (data.maxTimer !== undefined) setImAcaoMaxTimer(data.maxTimer);
        if (data.timer !== undefined) setImAcaoTimer(data.timer);
        if (data.fluxo !== undefined) setImAcaoFluxo(data.fluxo);
        if (data.opcaoSelecionada !== undefined) setImAcaoOpcaoSelecionada(data.opcaoSelecionada);
        if (data.modo !== undefined) setImAcaoModoRepresentacao(data.modo);
        if (data.dadoCat !== undefined) setImAcaoDadoCategoria(data.dadoCat);
        if (data.dadoMov !== undefined) setImAcaoDadoMovimentacao(data.dadoMov);
        if (data.dadosRolando !== undefined) setImAcaoDadosRolando(data.dadosRolando);
        if (data.dadoDesafio !== undefined) setImAcaoDadoDesafio(data.dadoDesafio);
        if (data.dadoDesafioRolando !== undefined) setImAcaoDadoDesafioRolando(data.dadoDesafioRolando);
        if (data.lousaAberta !== undefined) setImAcaoLousaAberta(data.lousaAberta);
        if (data.cartaRevelada !== undefined) setImAcaoCartaRevelada(data.cartaRevelada);
        if (data.projetorRevelado !== undefined) setImAcaoProjetorRevelado(data.projetorRevelado);
        if (data.nomeJ1 !== undefined) setNomeJ1(data.nomeJ1);
        if (data.nomeJ2 !== undefined) setNomeJ2(data.nomeJ2);
        if (data.telaBrancaAtiva !== undefined) setImAcaoTelaBrancaAtiva(data.telaBrancaAtiva);
        // Estados de Memória
        if (data.memoCartas !== undefined) setMemoCartas(data.memoCartas);
        if (data.memoPontuacao !== undefined) setMemoPontuacao(data.memoPontuacao);
        if (data.memoEquipeVez !== undefined) setMemoEquipeVez(data.memoEquipeVez);
        if (data.memoCartasSelecionadas !== undefined) setMemoCartasSelecionadas(data.memoCartasSelecionadas);
        if (data.memoEfeitoAtivo !== undefined) setMemoEfeitoAtivo(data.memoEfeitoAtivo);
        if (data.memoMateria !== undefined) setMemoMateria(data.memoMateria);
      }
      return;
    }

    // 3. Auto-sincronização passiva por mensagem para o projetor
    if (isProjetorMode && data && data._sinc) {
      const s = data._sinc;
      if (s.carta !== undefined) setImAcaoCartaAtual(s.carta);
      if (s.opcaoSelecionada !== undefined && type !== 'ROLAR_DADOS') setImAcaoOpcaoSelecionada(s.opcaoSelecionada);
      if (s.modo !== undefined) setImAcaoModoRepresentacao(s.modo);
      if (s.pontuacao !== undefined) setImAcaoPontuacao(s.pontuacao);
      if (s.rodada !== undefined) setImAcaoRodada(s.rodada);
      if (s.equipeVez !== undefined) setImAcaoEquipeVez(s.equipeVez);
      if (s.nomeJ1 !== undefined) setNomeJ1(s.nomeJ1);
      if (s.nomeJ2 !== undefined) setNomeJ2(s.nomeJ2);
      if (s.fluxo !== undefined) setImAcaoFluxo(s.fluxo);
      if (s.maxTimer !== undefined) setImAcaoMaxTimer(s.maxTimer);
      if (s.telaBrancaAtiva !== undefined) setImAcaoTelaBrancaAtiva(s.telaBrancaAtiva);

      if (type !== 'ROLAR_DADOS') {
        if (s.dadoCat !== undefined) setImAcaoDadoCategoria(s.dadoCat);
        if (s.dadoMov !== undefined) setImAcaoDadoMovimentacao(s.dadoMov);
        if (s.dadosRolando !== undefined) setImAcaoDadosRolando(s.dadosRolando);
      }

      if (type !== 'ROLAR_DADO_DESAFIO') {
        if (s.dadoDesafio !== undefined) setImAcaoDadoDesafio(s.dadoDesafio);
        if (s.dadoDesafioRolando !== undefined) setImAcaoDadoDesafioRolando(s.dadoDesafioRolando);
      }

      if (s.lousaAberta !== undefined) setImAcaoLousaAberta(s.lousaAberta);

      // Auto-sincronização dos estados de Memória
      if (s.modoJogo !== undefined) setModoJogo(s.modoJogo);
      if (s.memoCartas !== undefined) setMemoCartas(s.memoCartas);
      if (s.memoPontuacao !== undefined) setMemoPontuacao(s.memoPontuacao);
      if (s.memoEquipeVez !== undefined) setMemoEquipeVez(s.memoEquipeVez);
      if (s.memoCartasSelecionadas !== undefined) setMemoCartasSelecionadas(s.memoCartasSelecionadas);
      if (s.memoEfeitoAtivo !== undefined) setMemoEfeitoAtivo(s.memoEfeitoAtivo);
      if (s.memoMateria !== undefined) setMemoMateria(s.memoMateria);
      if (s.memoCartaEscala !== undefined) setMemoProjetorCartaEscala(s.memoCartaEscala);
    }

    switch (type) {
      case 'MEMO_INICIAR':
        setTela('memo-projetor');
        setModoJogo('memoria');
        setMemoCartas(data.cartas);
        setMemoPontuacao(data.pontuacao);
        setMemoEquipeVez(data.equipeVez);
        setMemoCartasSelecionadas([]);
        setMemoEfeitoAtivo(null);
        setMemoAuraFeedback(null);
        setMemoMateria(data.materia);
        setNomeJ1(data.nomeJ1);
        setNomeJ2(data.nomeJ2);
        if (data.cartaEscala !== undefined) setMemoProjetorCartaEscala(data.cartaEscala);
        break;
      case 'MEMO_ATUALIZAR':
        if (data.cartas !== undefined) setMemoCartas(data.cartas);
        if (data.pontuacao !== undefined) setMemoPontuacao(data.pontuacao);
        if (data.equipeVez !== undefined) setMemoEquipeVez(data.equipeVez);
        if (data.cartasSelecionadas !== undefined) setMemoCartasSelecionadas(data.cartasSelecionadas);
        if (data.efeitoAtivo !== undefined) setMemoEfeitoAtivo(data.efeitoAtivo);
        if (data.auraFeedback !== undefined) setMemoAuraFeedback(data.auraFeedback);
        if (data.cartaEscala !== undefined) setMemoProjetorCartaEscala(data.cartaEscala);
        if (data.som) playSound(data.som);
        break;
      case 'MEMO_PEDIR_VIRAR':
        if (!isProjetorMode && data && data.index !== undefined) {
          virarCartaMemoria(data.index);
        }
        break;
      case 'TOGGLE_TELA_BRANCA':
        setImAcaoTelaBrancaAtiva(data.telaBrancaAtiva);
        break;
      case 'INICIAR_PARTIDA':
        setImAcaoTelaBrancaAtiva(false);
        setTela('ia-projetor');
        setImAcaoPontuacao(data.pontuacao);
        setImAcaoRodada(data.rodada);
        setImAcaoCartaAtual(data.carta);
        setImAcaoEquipeVez(data.equipeVez);
        setImAcaoFluxo('preparacao');
        setImAcaoCartaRevelada(false);
        setImAcaoProjetorRevelado(false);
        setImAcaoTimer(data.maxTimer);
        setImAcaoMaxTimer(data.maxTimer);
        setNomeJ1(data.nomeJ1);
        setNomeJ2(data.nomeJ2);
        setImAcaoOpcaoSelecionada(0);
        setImAcaoModoRepresentacao('Desenho');
        setImAcaoDadoCategoria(1);
        setImAcaoDadoMovimentacao(2);
        setImAcaoDadosRolando(false);
        break;
      case 'SORTEAR_CARTA':
        setImAcaoTelaBrancaAtiva(false);
        setImAcaoCartaAtual(data.carta);
        setImAcaoFluxo('preparacao');
        setImAcaoCartaRevelada(false);
        setImAcaoProjetorRevelado(false);
        setImAcaoTimer(data.timer);
        setImAcaoOpcaoSelecionada(0);
        setImAcaoDadoCategoria(1);
        setImAcaoDadoMovimentacao(2);
        break;
      case 'REVELAR_CARTA':
        setImAcaoCartaRevelada(true);
        break;
      case 'REVELAR_PROJETOR':
        setImAcaoProjetorRevelado(true);
        break;
      case 'OCULTAR_PROJETOR':
        setImAcaoCartaRevelada(false);
        setImAcaoProjetorRevelado(false);
        break;
      case 'PROXIMA_RODADA':
        setImAcaoTelaBrancaAtiva(false);
        setImAcaoRodada(data.rodada);
        setImAcaoCartaAtual(data.carta);
        setImAcaoEquipeVez(data.equipeVez);
        setImAcaoCartaRevelada(false);
        setImAcaoProjetorRevelado(false);
        setImAcaoTimer(data.maxTimer);
        setImAcaoFluxo('preparacao');
        break;
      case 'FLUXO_JULGADA':
        setImAcaoFluxo('julgada');
        break;
      case 'ATUALIZAR_PONTUACAO':
        setImAcaoPontuacao(data.pontuacao);
        break;
      case 'INICIAR_TIMER':
        setImAcaoFluxo('jogando');
        setImAcaoTimer(data.timer);
        iniciarTimerImAcaoLocal(data.timer);
        break;
      case 'PAUSAR_TIMER':
        setImAcaoFluxo('preparacao');
        if (imAcaoTimerIntRef.current) clearInterval(imAcaoTimerIntRef.current);
        break;
      case 'PONTUAR_EQUIPE':
        setImAcaoTelaBrancaAtiva(false);
        setImAcaoPontuacao(data.pontuacao);
        setImAcaoFluxo('preparacao');
        setImAcaoCartaRevelada(false);
        setImAcaoProjetorRevelado(false);
        setImAcaoRodada(data.rodada);
        setImAcaoEquipeVez(data.equipeVez);
        setImAcaoOpcaoSelecionada(0);
        setImAcaoDadoCategoria(1);
        setImAcaoDadoMovimentacao(2);
        if (imAcaoTimerIntRef.current) clearInterval(imAcaoTimerIntRef.current);
        break;
      case 'ERROU_RODADA':
        setImAcaoTelaBrancaAtiva(false);
        setImAcaoFluxo('preparacao');
        setImAcaoCartaRevelada(false);
        setImAcaoProjetorRevelado(false);
        setImAcaoRodada(data.rodada);
        setImAcaoEquipeVez(data.equipeVez);
        setImAcaoOpcaoSelecionada(0);
        setImAcaoDadoCategoria(1);
        setImAcaoDadoMovimentacao(2);
        if (imAcaoTimerIntRef.current) clearInterval(imAcaoTimerIntRef.current);
        break;
      case 'ESGOTOU_TEMPO':
        setImAcaoFluxo('preparacao');
        if (imAcaoTimerIntRef.current) clearInterval(imAcaoTimerIntRef.current);
        break;
      case 'FIM_JOGO':
        setTela('ia-projetor-fim');
        break;
      case 'ROLAR_DADOS':
        setImAcaoTelaBrancaAtiva(false);
        setImAcaoCartaRevelada(false);
        setImAcaoProjetorRevelado(false);
        
        // Se a rodada avançou, atualiza os dados da rodada/carta/vez de forma atômica
        if (data.avancouRodada) {
          setImAcaoRodada(data.rodada);
          setImAcaoCartaAtual(data.carta);
          setImAcaoEquipeVez(data.equipeVez);
          setImAcaoTimer(data.maxTimer);
          setImAcaoFluxo('preparacao');
        }

        setImAcaoDadoCategoria(data.dadoCat);
        setImAcaoDadoMovimentacao(data.dadoMov);
        setImAcaoDadosRolando(true);
        // Toca efeito sonoro rítmico de chocalhar dados no projetor
        let chacoalharSons = setInterval(() => playSound('dice'), 110);
        setTimeout(() => {
          clearInterval(chacoalharSons);
          setImAcaoDadosRolando(false);
          if (data.dadoCat <= 5) {
            setImAcaoOpcaoSelecionada(data.dadoCat - 1);
          }
        }, 3000);
        break;
      case 'SELECIONAR_OPCAO':
        setImAcaoOpcaoSelecionada(data.opcaoIdx);
        setImAcaoModoRepresentacao(data.modo);
        break;
      case 'ROLAR_DADO_DESAFIO':
        setImAcaoDadoDesafio(data.dadoDesafio);
        setImAcaoDadoDesafioRolando(true);
        let chacoalharSonsDesafio = setInterval(() => playSound('dice'), 110);
        setTimeout(() => {
          clearInterval(chacoalharSonsDesafio);
          setImAcaoDadoDesafioRolando(false);
        }, 3000);
        break;
      default:
        break;
    }
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    let projetor = false;
    if (params.get('projetor') === 'true') {
      setIsProjetorMode(true);
      setTela('ia-projetor');
      projetor = true;
    }

    const channel = new BroadcastChannel('imagem_acao_channel');
    imAcaoChannelRef.current = channel;

    channel.onmessage = (event) => {
      const { type, data } = event.data;
      tratarMensagemProjetor(type, data);
    };

    // Se for o projetor, solicita sincronização imediatamente após abrir o canal para obter o estado atual
    if (projetor) {
      setTimeout(() => {
        try {
          if (channel && channel.name) {
            channel.postMessage({ type: 'SOLICITAR_SINCRONIZACAO', data: {} });
          }
        } catch (e) {
          // canal pode ter sido fechado pelo HMR — ignorar
        }
      }, 400);
    }

    return () => {
      try { channel.close(); } catch (e) { /* já fechado */ }
      imAcaoChannelRef.current = null;
    };
  }, []);

  useEffect(() => {
    // Reconecta o BroadcastChannel se ele foi fechado (ex: HMR do Vite)
    const ensureChannel = () => {
      if (!imAcaoChannelRef.current) {
        try {
          const ch = new BroadcastChannel('imagem_acao_channel');
          ch.onmessage = (event) => {
            const { type, data } = event.data;
            tratarMensagemProjetor(type, data);
          };
          imAcaoChannelRef.current = ch;
        } catch (e) { /* BroadcastChannel não suportado */ }
      }
    };
    const intervalId = setInterval(ensureChannel, 2000);
    return () => clearInterval(intervalId);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const iniciarTimerImAcaoLocal = (tempoInicial) => {
    if (imAcaoTimerIntRef.current) clearInterval(imAcaoTimerIntRef.current);
    let tempo = tempoInicial;
    imAcaoTimerIntRef.current = setInterval(() => {
      tempo -= 1;
      setImAcaoTimer(tempo);
      if (tempo <= 5 && tempo > 0) {
        playSound('tick');
      }
      if (tempo <= 0) {
        clearInterval(imAcaoTimerIntRef.current);
        playSound('error');
        setImAcaoFluxo('julgada');
        setImAcaoProjetorRevelado(true);
        enviarMsgProjetor('REVELAR_PROJETOR', {});
      }
    }, 1000);
  };

  const rolarDadoDesafioImAcao = () => {
    if (imAcaoDadoDesafioRolando) return;
    
    playSound('click');
    setImAcaoDadoDesafioRolando(true);
    
    const dadoDesafio = Math.floor(Math.random() * 6) + 1;
    
    enviarMsgProjetor('ROLAR_DADO_DESAFIO', {
      dadoDesafio
    });
    
    let chacoalharSons = setInterval(() => playSound('dice'), 110);
    
    setTimeout(() => {
      clearInterval(chacoalharSons);
      setImAcaoDadoDesafio(dadoDesafio);
      setImAcaoDadoDesafioRolando(false);
    }, 3000);
  };



  const rolarDadosImAcao = () => {
    if (imAcaoDadosRolando) return;
    
    playSound('click');
    setImAcaoDadosRolando(true);

    // Oculta a carta imediatamente no clique dos dados
    setImAcaoCartaRevelada(false);
    setImAcaoProjetorRevelado(false);
    setImAcaoTelaBrancaAtiva(false);
    enviarMsgProjetor('OCULTAR_PROJETOR', {});

    const oponente = imAcaoEquipeVez === 0 ? 1 : 0;
    let proximaRodada = imAcaoRodada;
    let novaCarta = imAcaoCartaAtual;
    let avancouRodada = false;

    if (imAcaoFluxo === 'julgada') {
      avancouRodada = true;
      // Avança a rodada e passa a vez de fato!
      proximaRodada = imAcaoRodada + 1;
      setImAcaoRodada(proximaRodada);
      setImAcaoEquipeVez(oponente);

      // Sorteia a nova carta sem repetição imediata
      const { fila: novaFila, index: novoIndex, carta: cartaSorteada } = proximaCartaDaFila(imAcaoFila, imAcaoFilaIndex, imAcaoCartaAtual);
      novaCarta = cartaSorteada;
      setImAcaoFila(novaFila);
      setImAcaoFilaIndex(novoIndex);
      setImAcaoCartaAtual(novaCarta);

      // Oculta a carta na tela privada e pública
      setImAcaoCartaRevelada(false);
      setImAcaoProjetorRevelado(false);

      // Timer volta ao máximo
      setImAcaoTimer(imAcaoMaxTimer);

      // Redefine fluxo para preparação
      setImAcaoFluxo('preparacao');
    }

    const dadoCat = Math.floor(Math.random() * 6) + 1;
    const dadoMov = Math.floor(Math.random() * 6) + 1;
    
    // Transmitir a rolagem e os dados da nova rodada (se aplicável) de forma atômica para o projetor
    enviarMsgProjetor('ROLAR_DADOS', {
      dadoCat,
      dadoMov,
      avancouRodada,
      rodada: proximaRodada,
      carta: novaCarta,
      equipeVez: oponente,
      maxTimer: imAcaoMaxTimer
    });
    
    // Animação de som chacoalhando local
    let chacoalharSons = setInterval(() => playSound('dice'), 110);
    
    setTimeout(() => {
      clearInterval(chacoalharSons);
      setImAcaoDadoCategoria(dadoCat);
      setImAcaoDadoMovimentacao(dadoMov);
      setImAcaoDadosRolando(false);
      
      // Sorteia opção correspondente
      if (dadoCat <= 5) {
        setImAcaoOpcaoSelecionada(dadoCat - 1);
        enviarMsgProjetor('SELECIONAR_OPCAO', { opcaoIdx: dadoCat - 1, modo: imAcaoModoRepresentacao });
      }
    }, 3000);
  };

  const selecionarOpcaoImAcao = (idx) => {
    setImAcaoOpcaoSelecionada(idx);
    enviarMsgProjetor('SELECIONAR_OPCAO', { opcaoIdx: idx, modo: imAcaoModoRepresentacao });
  };

  const selecionarModoRepresentacaoImAcao = (modo) => {
    setImAcaoModoRepresentacao(modo);
    enviarMsgProjetor('SELECIONAR_OPCAO', { opcaoIdx: imAcaoOpcaoSelecionada, modo: modo });
  };

  // Embaralha array usando Fisher-Yates (util reutilizavel)
  const fisherYates = (arr) => {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };

  const iniciarPartidaImAcao = (tempoConfig) => {
    if (cartasImAcao.length === 0) return;

    // Embaralha toda a pool e salva o indice zerado
    const embaralhadas = fisherYates(cartasImAcao);

    setImAcaoFila(embaralhadas);
    setImAcaoFilaIndex(0);
    setImAcaoPontuacao([1, 1]);
    setImAcaoRodada(1);
    setImAcaoCartaAtual(embaralhadas[0]);
    setImAcaoTimer(tempoConfig);
    setImAcaoMaxTimer(tempoConfig);
    setImAcaoFluxo('preparacao');
    setImAcaoCartaRevelada(false);
    setImAcaoEquipeVez(imAcaoEquipeIniciar);
    setModoJogo('imacao');
    setImAcaoOpcaoSelecionada(0);
    setImAcaoModoRepresentacao('Desenho');
    setImAcaoDadoCategoria(1);
    setImAcaoDadoMovimentacao(2);
    setImAcaoDadosRolando(false);
    setImAcaoTelaBrancaAtiva(false);

    enviarMsgProjetor('INICIAR_PARTIDA', {
      pontuacao: [1, 1],
      rodada: 1,
      carta: embaralhadas[0],
      equipeVez: imAcaoEquipeIniciar,
      maxTimer: tempoConfig,
      nomeJ1,
      nomeJ2
    });

    irParaTela('ia-jogo');
  };

  // Retorna a proxima carta da fila; quando a fila esgota, re-embaralha evitando repetir a ultima carta
  const proximaCartaDaFila = (filaAtual, indexAtual, ultimaCarta) => {
    const proximoIndex = indexAtual + 1;
    if (proximoIndex < filaAtual.length) {
      return { fila: filaAtual, index: proximoIndex, carta: filaAtual[proximoIndex] };
    }
    // Fila esgotada: re-embaralha garantindo que a 1a carta seja diferente da ultima
    let novaFila = fisherYates(filaAtual);
    if (novaFila.length > 1 && ultimaCarta && novaFila[0].id === ultimaCarta.id) {
      // Troca a primeira com uma posicao aleatoria diferente de 0
      const swap = Math.floor(Math.random() * (novaFila.length - 1)) + 1;
      [novaFila[0], novaFila[swap]] = [novaFila[swap], novaFila[0]];
    }
    return { fila: novaFila, index: 0, carta: novaFila[0] };
  };

  const sortearNovaCartaImAcao = () => {
    const { fila, index, carta } = proximaCartaDaFila(imAcaoFila, imAcaoFilaIndex, imAcaoCartaAtual);
    setImAcaoFila(fila);
    setImAcaoFilaIndex(index);
    setImAcaoCartaAtual(carta);
    setImAcaoFluxo('preparacao');
    setImAcaoCartaRevelada(false);
    setImAcaoTimer(imAcaoMaxTimer);
    setImAcaoOpcaoSelecionada(0);
    setImAcaoDadoCategoria(1);
    setImAcaoDadoMovimentacao(2);
    setImAcaoTelaBrancaAtiva(false);

    enviarMsgProjetor('SORTEAR_CARTA', {
      carta,
      timer: imAcaoMaxTimer
    });
  };

  const revelarCartaImAcao = () => {
    setImAcaoCartaRevelada(true);
    setImAcaoFluxo('revelada');
    playSound('reveal');
    enviarMsgProjetor('REVELAR_CARTA', {});
  };

  const iniciarCronometroImAcao = () => {
    setImAcaoFluxo('jogando');
    enviarMsgProjetor('INICIAR_TIMER', { timer: imAcaoTimer });
    iniciarTimerImAcaoLocal(imAcaoTimer);
  };

  const pausarCronometroImAcao = () => {
    setImAcaoFluxo('preparacao');
    if (imAcaoTimerIntRef.current) clearInterval(imAcaoTimerIntRef.current);
    enviarMsgProjetor('PAUSAR_TIMER', {});
  };

  const toggleTelaBrancaImAcao = () => {
    playSound('click');
    const novoEstado = !imAcaoTelaBrancaAtiva;
    setImAcaoTelaBrancaAtiva(novoEstado);
    enviarMsgProjetor('TOGGLE_TELA_BRANCA', { telaBrancaAtiva: novoEstado });
  };

  const julgarImAcao = (acertou) => {
    if (imAcaoTimerIntRef.current) clearInterval(imAcaoTimerIntRef.current);

    // Revela imediatamente a palavra correta para toda a sala
    setImAcaoProjetorRevelado(true);
    setImAcaoTelaBrancaAtiva(false);
    enviarMsgProjetor('REVELAR_PROJETOR', {});

    const oponente = imAcaoEquipeVez === 0 ? 1 : 0;
    const casasAvançar = imAcaoDadoMovimentacao;

    if (acertou) {
      playSound('victory');
      const posFinal = Math.min(30, imAcaoPontuacao[imAcaoEquipeVez] + casasAvançar);
      
      moverPeaoImAcaoGradual(imAcaoEquipeVez, posFinal, () => {
        if (posFinal >= 30) {
          enviarMsgProjetor('FIM_JOGO', {});
          irParaTela('ia-fim');
          return;
        }
        
        // Define o fluxo como julgada e notifica o projetor.
        // Desta forma a carta permanece aberta (virada para cima) e a rodada não avança
        // até que a próxima equipe chacoalhe os dados!
        setImAcaoFluxo('julgada');
        enviarMsgProjetor('FLUXO_JULGADA', {});
      });
    } else {
      playSound('error');
      // No erro, apenas define o fluxo como julgada e notifica o projetor, mantendo a carta aberta.
      setImAcaoFluxo('julgada');
      enviarMsgProjetor('FLUXO_JULGADA', {});
    }
  };

  const julgarImAcaoEspecial = (equipeVencedoraIndex) => {
    if (imAcaoTimerIntRef.current) clearInterval(imAcaoTimerIntRef.current);

    // Revela imediatamente a resposta secreta para toda a sala
    setImAcaoProjetorRevelado(true);
    setImAcaoTelaBrancaAtiva(false);
    enviarMsgProjetor('REVELAR_PROJETOR', {});

    if (equipeVencedoraIndex !== null) {
      playSound('victory');
      const casasAvançar = imAcaoDadoMovimentacao;
      const posFinal = Math.min(30, imAcaoPontuacao[equipeVencedoraIndex] + casasAvançar);
      
      moverPeaoImAcaoGradual(equipeVencedoraIndex, posFinal, () => {
        if (posFinal >= 30) {
          enviarMsgProjetor('FIM_JOGO', {});
          irParaTela('ia-fim');
          return;
        }
        setImAcaoFluxo('julgada');
        enviarMsgProjetor('FLUXO_JULGADA', {});
      });
    } else {
      playSound('error');
      setImAcaoFluxo('julgada');
      enviarMsgProjetor('FLUXO_JULGADA', {});
    }
  };

  const moverPeaoImAcaoGradual = (equipeIndex, posFinal, callback) => {
    let posAtual = imAcaoPontuacao[equipeIndex];
    if (posAtual === posFinal) {
      if (callback) callback();
      return;
    }

    const direcao = posFinal > posAtual ? 1 : -1;
    const proximoPasso = () => {
      posAtual += direcao;
      playSound('tick');
      
      setImAcaoPontuacao(prev => {
        const novos = [...prev];
        novos[equipeIndex] = posAtual;
        
        // Sincroniza a posição dos peões de forma pura, sem reiniciar ou sumir com a revelação da carta
        enviarMsgProjetor('ATUALIZAR_PONTUACAO', {
          pontuacao: novos
        });

        return novos;
      });

      if (posAtual !== posFinal) {
        setTimeout(proximoPasso, 350);
      } else {
        if (callback) callback();
      }
    };

    setTimeout(proximoPasso, 350);
  };

  // --- ESTADOS DO CADASTRO MANUAL DO TRÊS PISTAS ---
  const [cadGerenciadorAba, setCadGerenciadorAba] = useState('duelo'); // 'duelo' | 'pistas' | 'imacao'
  const [cadPistasCat, setCadPistasCat] = useState('');
  const [cadPistasResp, setCadPistasResp] = useState('');
  const [cadPistasTextos, setCadPistasTextos] = useState(['', '', '', '', '']);
  const [cadPistasEfeitos, setCadPistasEfeitos] = useState([null, null, null, null, null]);

  // --- ESTADOS DO CADASTRO MANUAL DO IMAGEM E AÇÃO ---
  const [cadImAcaoNome, setCadImAcaoNome] = useState('');
  const [cadImAcaoRespostas, setCadImAcaoRespostas] = useState(['', '', '', '', '']);

  const adicionarMemoImagemManual = () => {
    if (!cadMemoImagemUrl.trim()) {
      alert('Por favor, digite a URL da imagem!');
      return;
    }
    if (!cadMemoImagemUrl.startsWith('http://') && !cadMemoImagemUrl.startsWith('https://')) {
      alert('A URL da imagem deve começar com http:// ou https://');
      return;
    }
    const novaPool = [...memoImagensPool, { url: cadMemoImagemUrl.trim(), mat: cadMemoImagemMateria || "" }];
    setMemoImagensPool(novaPool);
    setCadMemoImagemUrl('');
    setCadMemoImagemMateria('');
  };

  const deletarMemoImagem = (idx) => {
    if (confirm('Deseja realmente remover esta imagem?')) {
      const novaPool = memoImagensPool.filter((_, i) => i !== idx);
      setMemoImagensPool(novaPool);
    }
  };

  const restaurarMemoImagensPadrao = () => {
    if (confirm('Deseja realmente restaurar a lista de imagens para o padrão de fábrica? Isso removerá as suas imagens cadastradas.')) {
      setMemoImagensPool(IMAGENS_PADRAO_MEMORIA);
    }
  };

  const salvarNovaCategoriaMemo = () => {
    const nome = novaCategoriaMemoInput.trim();
    if (!nome) return;
    if (materias.includes(nome)) {
      alert('Esta categoria já existe!');
      return;
    }
    const novasMaterias = [...materias, nome];
    setMaterias(novasMaterias);
    localStorage.setItem('dm_mat', JSON.stringify(novasMaterias));
    setCadMemoImagemMateria(nome);
    setNovaCategoriaMemoInput('');
    setMostrarCriarCategoriaMemo(false);
  };

  const editarMemoImagemMateria = (idx, novaMat) => {
    const novasImagens = [...memoImagensPool];
    if (typeof novasImagens[idx] === 'object') {
      novasImagens[idx] = { ...novasImagens[idx], mat: novaMat };
    } else {
      novasImagens[idx] = { url: novasImagens[idx], mat: novaMat };
    }
    setMemoImagensPool(novasImagens);
    localStorage.setItem('dm_memo_imgs', JSON.stringify(novasImagens));
  };

  const duplicarMemoImagem = (idx) => {
    const item = memoImagensPool[idx];
    const url = typeof item === 'object' ? item.url : item;
    const mat = typeof item === 'object' ? item.mat : '';
    const novoItem = { url, mat };
    const novasImagens = [...memoImagensPool, novoItem];
    setMemoImagensPool(novasImagens);
    localStorage.setItem('dm_memo_imgs', JSON.stringify(novasImagens));
  };

  const obterSurpresaAtiva = (tipo) => {
    const daMateria = memoSurpresasPorMateria[memoMateria]?.[tipo];
    if (daMateria) return daMateria;
    return tipo === 'embaralhar' ? memoImgSurpresaEmbaralhar : memoImgSurpresaOlho;
  };

  const atualizarImagemSurpresa = (tipo, url) => {
    if (!materiaCustomizarSurpresas) {
      if (tipo === 'embaralhar') setMemoImgSurpresaEmbaralhar(url);
      if (tipo === 'olho') setMemoImgSurpresaOlho(url);
    } else {
      setMemoSurpresasPorMateria(prev => {
        const mat = prev[materiaCustomizarSurpresas] || {};
        return {
          ...prev,
          [materiaCustomizarSurpresas]: {
            ...mat,
            [tipo]: url
          }
        };
      });
    }
  };

  const adicionarCartaImAcaoManual = () => {
    if (!cadImAcaoNome.trim()) {
      alert('Por favor, digite o nome/tema da carta!');
      return;
    }
    
    const categorias = ['Ação', 'Objeto', 'Lugar', 'Pessoa/Animal', 'Difícil'];
    const opcoes = categorias.map((cat, idx) => {
      const resp = cadImAcaoRespostas[idx]?.trim() || '';
      return {
        num: idx + 1,
        cat,
        resp: resp || 'Segredo Oculto'
      };
    });
    
    const novaCarta = {
      id: Date.now(),
      nome: cadImAcaoNome.trim(),
      opcoes
    };
    
    setCartasImAcao(prev => [...prev, novaCarta]);
    setCadImAcaoNome('');
    setCadImAcaoRespostas(['', '', '', '', '']);
    alert('Carta de Imagem e Ação salva com sucesso!');
  };

  const deletarCartaImAcao = (index) => {
    if (cartasImAcao.length <= 1) {
      alert('Você precisa ter pelo menos 1 carta cadastrada no banco para jogar!');
      return;
    }
    setCartasImAcao(prev => prev.filter((_, idx) => idx !== index));
  };

  // ==========================================================================
  // FUNÇÕES DE LÓGICA DO JOGO DA MEMÓRIA
  // ==========================================================================
  const obterTextoResposta = (perg) => {
    if (!perg) return '';
    if (perg.tipo === 'mc') {
      return perg.alts && perg.alts[perg.resp] !== undefined ? String(perg.alts[perg.resp]) : String(perg.resp);
    }
    if (perg.tipo === 'vf') {
      const respStr = String(perg.resp).toLowerCase();
      return respStr === 'v' || respStr === 'verdadeiro' ? 'Verdadeiro' : 'Falso';
    }
    return String(perg.resp);
  };

  const iniciarPartidaMemoria = (materiaEscolhida) => {
    playSound('click');
    setMemoMateria(materiaEscolhida);
    setModoJogo('memoria');

    // 1. Filtrar e completar perguntas para obter exatamente 16 pares (32 cartas normais)
    let pergsFiltradas = perguntas.filter(p => p.mat === materiaEscolhida);
    
    // Se faltarem perguntas, completa com outras da pool geral
    if (pergsFiltradas.length < 16) {
      const outras = perguntas.filter(p => p.mat !== materiaEscolhida);
      pergsFiltradas = [...pergsFiltradas, ...outras];
    }
    
    // Se ainda assim faltarem, completa com as perguntas padrão
    if (pergsFiltradas.length < 16) {
      pergsFiltradas = [...pergsFiltradas, ...PERGUNTAS_PADRAO];
    }

    // Garantia final: se o pool disponível for menor que 16, repete as perguntas
    // em ciclo até completar os 16 pares necessários para o tabuleiro 7x5 (35 cartas)
    const poolBase = pergsFiltradas.length > 0 ? pergsFiltradas : PERGUNTAS_PADRAO;
    const pergsPartida = [];
    for (let i = 0; i < 16; i++) {
      pergsPartida.push(poolBase[i % poolBase.length]);
    }

    const surpresaEmbaralharUrl = materiaEscolhida ? (memoSurpresasPorMateria[materiaEscolhida]?.embaralhar || memoImgSurpresaEmbaralhar) : memoImgSurpresaEmbaralhar;
    const surpresaOlhoUrl = materiaEscolhida ? (memoSurpresasPorMateria[materiaEscolhida]?.olho || memoImgSurpresaOlho) : memoImgSurpresaOlho;

    // Filtra prioritariamente as imagens associadas à matéria ativa (excluindo as usadas nas cartas surpresa)
    let poolImagensMat = memoImagensPool
      .filter(img => typeof img === 'object' ? img.mat === materiaEscolhida : false)
      .map(img => img.url)
      .filter(url => url !== surpresaEmbaralharUrl && url !== surpresaOlhoUrl);

    // Se não houver imagens específicas para a matéria, busca imagens Gerais (sem matéria associada, excluindo surpresas)
    if (poolImagensMat.length === 0) {
      poolImagensMat = memoImagensPool
        .filter(img => typeof img === 'object' ? !img.mat : true)
        .map(img => typeof img === 'object' ? img.url : img)
        .filter(url => url !== surpresaEmbaralharUrl && url !== surpresaOlhoUrl);
    }

    // Fallback de segurança para o padrão de fábrica caso a pool resultante esteja vazia
    const poolImagens = poolImagensMat.length > 0 ? poolImagensMat : IMAGENS_PADRAO_MEMORIA.filter(url => url !== surpresaEmbaralharUrl && url !== surpresaOlhoUrl);

    // 2. Criar cartas (16 perguntas e 16 respostas correspondentes)
    const cartas = [];
    pergsPartida.forEach((perg, idx) => {
      const imgUrl = poolImagens[idx % poolImagens.length];
      cartas.push({
        id: `p_${idx}_${Date.now()}`,
        parId: idx,
        tipo: 'pergunta',
        texto: '',
        imagem: imgUrl,
        aberta: false,
        encontradaPor: null
      });
      cartas.push({
        id: `r_${idx}_${Date.now()}`,
        parId: idx,
        tipo: 'resposta',
        texto: '',
        imagem: imgUrl,
        aberta: false,
        encontradaPor: null
      });
    });

    // Obter definições das cartas surpresa escolhidas pelo professor
    const obterDefinicaoSurpresa = (tipo, idSufixo) => {
      switch (tipo) {
        case 'embaralhar':
          return {
            id: `s_embaralhar_${idSufixo}_${Date.now()}`,
            parId: -1,
            tipo: 'surpresa-embaralhar',
            texto: 'Troca-Tudo! 🌪️',
            imagem: surpresaEmbaralharUrl,
            aberta: false,
            encontradaPor: null
          };
        case 'olho':
          return {
            id: `s_olho_${idSufixo}_${Date.now()}`,
            parId: -2,
            tipo: 'surpresa-olho',
            texto: 'Olho Mágico! 👁️',
            imagem: surpresaOlhoUrl,
            aberta: false,
            encontradaPor: null
          };
        case 'ganhar-aura':
          return {
            id: `s_ganhar_aura_${idSufixo}_${Date.now()}`,
            parId: -3,
            tipo: 'surpresa-ganhar-aura',
            texto: 'Explosão de Aura! 🗿✨',
            imagem: memoImgSurpresaGanharAura,
            aberta: false,
            encontradaPor: null
          };
        case 'perder-aura':
          return {
            id: `s_perder_aura_${idSufixo}_${Date.now()}`,
            parId: -4,
            tipo: 'surpresa-perder-aura',
            texto: 'Dreno de Aura! 📉💔',
            imagem: memoImgSurpresaPerderAura,
            aberta: false,
            encontradaPor: null
          };
        case 'vez-extra':
          return {
            id: `s_vez_extra_${idSufixo}_${Date.now()}`,
            parId: -5,
            tipo: 'surpresa-vez-extra',
            texto: 'Turno Extra! 🔄⚡',
            imagem: memoImgSurpresaVezExtra,
            aberta: false,
            encontradaPor: null
          };
        default:
          return {
            id: `s_embaralhar_${idSufixo}_${Date.now()}`,
            parId: -1,
            tipo: 'surpresa-embaralhar',
            texto: 'Troca-Tudo! 🌪️',
            imagem: surpresaEmbaralharUrl,
            aberta: false,
            encontradaPor: null
          };
      }
    };

    // 3. Inserir as 3 cartas surpresas (16 pares [32 cartas] + 3 surpresas = 35 cartas)
    // Composta estritamente por Troca-Tudo e Olho Mágico
    cartas.push(obterDefinicaoSurpresa('embaralhar', 's1'));
    cartas.push(obterDefinicaoSurpresa('olho', 's2'));
    cartas.push(obterDefinicaoSurpresa('embaralhar', 's3'));

    // 4. Embaralhar as 30 cartas na mesa usando o algoritmo robusto de Fisher-Yates
    const cartasEmbaralhadas = [...cartas];
    for (let i = cartasEmbaralhadas.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const temp = cartasEmbaralhadas[i];
      cartasEmbaralhadas[i] = cartasEmbaralhadas[j];
      cartasEmbaralhadas[j] = temp;
    }

    // 5. Atualizar os estados locais do moderador
    setMemoCartas(cartasEmbaralhadas);
    setMemoPontuacao([0, 0]);
    setMemoEquipeVez(memoEquipeIniciar); // Equipe inicial configurada
    setMemoCartasSelecionadas([]);
    setMemoEfeitoAtivo(null);
    setMemoBloqueioCliques(false);
    setMemoAuraFeedback(null);

    // 6. Notificar e sincronizar com o Projetor via BroadcastChannel
    enviarMsgProjetor('MEMO_INICIAR', {
      materia: materiaEscolhida,
      cartas: cartasEmbaralhadas,
      pontuacao: [0, 0],
      equipeVez: memoEquipeIniciar, // Sincroniza equipe inicial no projetor
      nomeJ1,
      nomeJ2,
      cartaEscala: memoCartaEscala
    });

    // 7. Navegar para a tela de moderação do jogo
    irParaTela('memo-jogo');
  };

  const virarCartaMemoria = (index) => {
    if (index === undefined || index === null) return;
    const idxNum = Number(index);
    if (isNaN(idxNum) || idxNum < 0) return;

    // Se estiver no modo projetor, envia mensagem para o moderador fazer a virada
    if (isProjetorMode) {
      enviarMsgProjetor('MEMO_PEDIR_VIRAR', { index: idxNum });
      return;
    }
    
    // Validações básicas de clique (no moderador)
    if (memoBloqueioCliques || memoEfeitoAtivo) return;
    if (idxNum >= memoCartas.length) return;
    
    const carta = memoCartas[idxNum];
    if (!carta) return;
    if (carta.aberta || carta.encontradaPor !== null) return;
    if (memoCartasSelecionadas.includes(idxNum)) return;
    if (memoCartasSelecionadas.length >= 2) return;

    // Toca som de clique local
    playSound('click');

    // Vira a carta selecionada
    const novasCartas = [...memoCartas];
    novasCartas[index] = { ...carta, aberta: true };
    setMemoCartas(novasCartas);

    // --- CASO 1: CARTA SURPRESA EMBARALHAR 🌪️ ---
    if (carta.tipo === 'surpresa-embaralhar' || (carta.tipo && carta.tipo.startsWith('surpresa-') && carta.tipo !== 'surpresa-olho')) {
      setMemoBloqueioCliques(true);
      setMemoEfeitoAtivo('embaralhar');
      
      const novasSelecionadas = [...memoCartasSelecionadas, index];
      setMemoCartasSelecionadas(novasSelecionadas);

      // Notifica o projetor para rodar animação do efeito
      enviarMsgProjetor('MEMO_ATUALIZAR', {
        cartas: novasCartas,
        cartasSelecionadas: novasSelecionadas,
        efeitoAtivo: 'embaralhar',
        som: 'dice'
      });

      // Roda o redemoinho e troca posições
      setTimeout(() => {
        // 1. Primeiro, fechamos as cartas que estão abertas e sem o par descoberto (a primeira carta normal e a surpresa)
        // para que fiquem com aberta: false e entrem na pool de cartas fechadas que serão embaralhadas!
        const cartasComSuporte = novasCartas.map(c => {
          if (c.encontradaPor === null) {
            return { ...c, aberta: false }; // desvira todas as não encontradas
          }
          return c;
        });

        // 2. Filtramos todas as cartas fechadas / não descobertas (que agora inclui a normal e a surpresa)
        const cartasFechadas = cartasComSuporte.filter(c => c.encontradaPor === null);
        
        const indicesFechadas = [];
        cartasComSuporte.forEach((c, idx) => {
          if (c.encontradaPor === null) indicesFechadas.push(idx);
        });

        // 3. Re-embaralhamos as cartas fechadas (todas mudam de posição!)
        const cartasFechadasEmbaralhadas = [...cartasFechadas].sort(() => Math.random() - 0.5);
        
        const cartasFinais = [...cartasComSuporte];
        indicesFechadas.forEach((originalIdx, i) => {
          cartasFinais[originalIdx] = cartasFechadasEmbaralhadas[i];
        });

        // 4. Passa a vez para a outra equipe e libera cliques
        const proximaVez = memoEquipeVez === 0 ? 1 : 0;
        setMemoCartas(cartasFinais);
        setMemoEquipeVez(proximaVez);
        setMemoCartasSelecionadas([]);
        setMemoEfeitoAtivo(null);
        setMemoBloqueioCliques(false);

        enviarMsgProjetor('MEMO_ATUALIZAR', {
          cartas: cartasFinais,
          cartasSelecionadas: [],
          equipeVez: proximaVez,
          efeitoAtivo: null,
          som: 'success'
        });
      }, 2500);
      return;
    }

    // --- CASO 2: CARTA SURPRESA OLHO MÁGICO 👁️ ---
    if (carta.tipo === 'surpresa-olho') {
      setMemoBloqueioCliques(true);
      setMemoEfeitoAtivo('revelar');
      
      const novasSelecionadas = [...memoCartasSelecionadas, index];
      setMemoCartasSelecionadas(novasSelecionadas);

      enviarMsgProjetor('MEMO_ATUALIZAR', {
        cartas: novasCartas,
        cartasSelecionadas: novasSelecionadas,
        efeitoAtivo: 'revelar',
        som: 'click'
      });

      setTimeout(() => {
        // Encontra todos os pares que ainda estão fechados na mesa
        const paresFechados = [];
        const paresMapeados = {};
        
        novasCartas.forEach((c, idx) => {
          if (!c.aberta && c.encontradaPor === null && c.parId >= 0) {
            if (!paresMapeados[c.parId]) paresMapeados[c.parId] = [];
            paresMapeados[c.parId].push(idx);
          }
        });

        Object.keys(paresMapeados).forEach(parId => {
          if (paresMapeados[parId].length === 2) {
            paresFechados.push(paresMapeados[parId]);
          }
        });

        // Se houver algum par fechado, abre as duas cartas dele temporariamente
        let indicesParaRevelar = [];
        if (paresFechados.length > 0) {
          const parEscolhido = paresFechados[Math.floor(Math.random() * paresFechados.length)];
          indicesParaRevelar = parEscolhido;
        }

        const cartasComRevelacao = novasCartas.map((c, idx) => {
          if (indicesParaRevelar.includes(idx)) {
            return { ...c, aberta: true };
          }
          return c;
        });

        setMemoCartas(cartasComRevelacao);
        
        enviarMsgProjetor('MEMO_ATUALIZAR', {
          cartas: cartasComRevelacao,
          som: 'success'
        });

        // Mantém aberto por 2.5 segundos para os alunos verem e depois fecha novamente
        setTimeout(() => {
          const cartasFechadasDeVolta = cartasComRevelacao.map((c, idx) => {
            if (indicesParaRevelar.includes(idx)) {
              return { ...c, aberta: false };
            }
            return c;
          });

          const proximaVez = memoEquipeVez === 0 ? 1 : 0;
          setMemoCartas(cartasFechadasDeVolta);
          setMemoEquipeVez(proximaVez);
          setMemoCartasSelecionadas([]);
          setMemoEfeitoAtivo(null);
          setMemoBloqueioCliques(false);

          enviarMsgProjetor('MEMO_ATUALIZAR', {
            cartas: cartasFechadasDeVolta,
            cartasSelecionadas: [],
            equipeVez: proximaVez,
            efeitoAtivo: null,
            som: 'error'
          });
        }, 2500);

      }, 1500);
      return;
    }

    // --- CASO 3: EXPLOSÃO DE AURA 🗿✨ ---
    if (carta.tipo === 'surpresa-ganhar-aura') {
      setMemoBloqueioCliques(true);
      
      const novasSelecionadas = [...memoCartasSelecionadas, index];
      setMemoCartasSelecionadas(novasSelecionadas);

      // Marca a carta como descoberta pela equipe da vez
      const cartasMarcadas = novasCartas.map((c, idx) => {
        if (idx === index) return { ...c, encontradaPor: memoEquipeVez };
        return c;
      });

      const feedback = {
        equipe: memoEquipeVez,
        txt: `🗿✨ EXPLOSÃO DE AURA para a Equipe ${memoEquipeVez === 0 ? nomeJ1 : nomeJ2}! +1000 Aura Points!`
      };
      setMemoAuraFeedback(feedback);

      enviarMsgProjetor('MEMO_ATUALIZAR', {
        cartas: cartasMarcadas,
        cartasSelecionadas: novasSelecionadas,
        auraFeedback: feedback,
        som: 'success'
      });

      setTimeout(() => {
        const proximaVez = memoEquipeVez === 0 ? 1 : 0;
        setMemoCartas(cartasMarcadas);
        setMemoEquipeVez(proximaVez);
        setMemoCartasSelecionadas([]);
        setMemoAuraFeedback(null);
        setMemoBloqueioCliques(false);

        enviarMsgProjetor('MEMO_ATUALIZAR', {
          cartas: cartasMarcadas,
          cartasSelecionadas: [],
          equipeVez: proximaVez,
          auraFeedback: null,
          som: 'success'
        });
      }, 3000);
      return;
    }

    // --- CASO 4: DRENO DE AURA 📉💔 ---
    if (carta.tipo === 'surpresa-perder-aura') {
      setMemoBloqueioCliques(true);
      
      const novasSelecionadas = [...memoCartasSelecionadas, index];
      setMemoCartasSelecionadas(novasSelecionadas);

      // Marca a carta como descoberta pela equipe da vez
      const cartasMarcadas = novasCartas.map((c, idx) => {
        if (idx === index) return { ...c, encontradaPor: memoEquipeVez };
        return c;
      });

      const feedback = {
        equipe: memoEquipeVez,
        txt: `📉💔 DRENO DE AURA da Equipe ${memoEquipeVez === 0 ? nomeJ1 : nomeJ2}! Perderam -500 Aura Points!`
      };
      setMemoAuraFeedback(feedback);

      enviarMsgProjetor('MEMO_ATUALIZAR', {
        cartas: cartasMarcadas,
        cartasSelecionadas: novasSelecionadas,
        auraFeedback: feedback,
        som: 'error'
      });

      setTimeout(() => {
        const proximaVez = memoEquipeVez === 0 ? 1 : 0;
        setMemoCartas(cartasMarcadas);
        setMemoEquipeVez(proximaVez);
        setMemoCartasSelecionadas([]);
        setMemoAuraFeedback(null);
        setMemoBloqueioCliques(false);

        enviarMsgProjetor('MEMO_ATUALIZAR', {
          cartas: cartasMarcadas,
          cartasSelecionadas: [],
          equipeVez: proximaVez,
          auraFeedback: null,
          som: 'error'
        });
      }, 3000);
      return;
    }

    // --- CASO 5: TURNO EXTRA 🔄⚡ ---
    if (carta.tipo === 'surpresa-vez-extra') {
      setMemoBloqueioCliques(true);
      
      const novasSelecionadas = [...memoCartasSelecionadas, index];
      setMemoCartasSelecionadas(novasSelecionadas);

      // Marca a carta como descoberta pela equipe da vez
      const cartasMarcadas = novasCartas.map((c, idx) => {
        if (idx === index) return { ...c, encontradaPor: memoEquipeVez };
        return c;
      });

      const feedback = {
        equipe: memoEquipeVez,
        txt: `🔄⚡ TURNO EXTRA para a Equipe ${memoEquipeVez === 0 ? nomeJ1 : nomeJ2}! Joguem Novamente!`
      };
      setMemoAuraFeedback(feedback);

      enviarMsgProjetor('MEMO_ATUALIZAR', {
        cartas: cartasMarcadas,
        cartasSelecionadas: novasSelecionadas,
        auraFeedback: feedback,
        som: 'dice'
      });

      setTimeout(() => {
        // Mantém a mesma equipe da vez ativa (não passa a vez!)
        setMemoCartas(cartasMarcadas);
        setMemoCartasSelecionadas([]);
        setMemoAuraFeedback(null);
        setMemoBloqueioCliques(false);

        enviarMsgProjetor('MEMO_ATUALIZAR', {
          cartas: cartasMarcadas,
          cartasSelecionadas: [],
          equipeVez: memoEquipeVez,
          auraFeedback: null,
          som: 'success'
        });
      }, 3000);
      return;
    }

    // --- CASO 6: CARTA NORMAL ---
    const novasSelecionadas = [...memoCartasSelecionadas, index];
    setMemoCartasSelecionadas(novasSelecionadas);

    enviarMsgProjetor('MEMO_ATUALIZAR', {
      cartas: novasCartas,
      cartasSelecionadas: novasSelecionadas,
      som: 'click'
    });

    // Se for a segunda carta virada, faz a checagem
    if (novasSelecionadas.length === 2) {
      setMemoBloqueioCliques(true);
      const idx1 = novasSelecionadas[0];
      const idx2 = novasSelecionadas[1];
      const c1 = novasCartas[idx1];
      const c2 = novasCartas[idx2];

      // --- ACERTO! ---
      if (c1.parId === c2.parId) {
        setTimeout(() => {
          playSound('success');
          
          const cartasAcertadas = novasCartas.map((c, idx) => {
            if (idx === idx1 || idx === idx2) {
              return { ...c, encontradaPor: memoEquipeVez };
            }
            return c;
          });

          const novosPontos = [...memoPontuacao];
          novosPontos[memoEquipeVez] += 1;

          setMemoCartas(cartasAcertadas);
          setMemoPontuacao(novosPontos);
          setMemoCartasSelecionadas([]);
          setMemoBloqueioCliques(false);

          // Dispara animação de pop-up de Aura no Projetor!
          const feedback = {
            equipe: memoEquipeVez,
            txt: `+1000 de AURA para a Equipe ${memoEquipeVez === 0 ? nomeJ1 : nomeJ2}! 🗿🔥`
          };
          setMemoAuraFeedback(feedback);

          enviarMsgProjetor('MEMO_ATUALIZAR', {
            cartas: cartasAcertadas,
            pontuacao: novosPontos,
            cartasSelecionadas: [],
            auraFeedback: feedback,
            som: 'success'
          });

          // Limpa o feedback após 2200ms
          setTimeout(() => {
            setMemoAuraFeedback(null);
            enviarMsgProjetor('MEMO_ATUALIZAR', {
              cartas: cartasAcertadas,
              pontuacao: novosPontos,
              cartasSelecionadas: [],
              auraFeedback: null
            });
          }, 2200);

          // Verifica se o jogo acabou (14 pares encontrados)
          const totalEncontradas = cartasAcertadas.filter(c => c.encontradaPor !== null).length;
          if (totalEncontradas >= 28) {
            setTimeout(() => {
              enviarMsgProjetor('MEMO_ATUALIZAR', { som: 'victory' });
              irParaTela('memo-fim');
            }, 1000);
          }
        }, 1000);

      } else {
        // --- ERRO! ---
        setTimeout(() => {
          playSound('error');

          const cartasFechadas = novasCartas.map((c, idx) => {
            if (idx === idx1 || idx === idx2) {
              return { ...c, aberta: false };
            }
            return c;
          });

          const proximaVez = memoEquipeVez === 0 ? 1 : 0;
          setMemoCartas(cartasFechadas);
          setMemoEquipeVez(proximaVez);
          setMemoCartasSelecionadas([]);
          setMemoBloqueioCliques(false);

          enviarMsgProjetor('MEMO_ATUALIZAR', {
            cartas: cartasFechadas,
            cartasSelecionadas: [],
            equipeVez: proximaVez,
            som: 'error'
          });
        }, 2500); // 2.5 segundos aberta para memorização
      }
    }
  };

  // Salvar cartas de pistas no localStorage
  useEffect(() => {
    localStorage.setItem('dm_pistas', JSON.stringify(cartasPistas));
  }, [cartasPistas]);

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

  // Segurança: se por algum motivo nenhuma tela estiver ativa, garante que a tela padrão seja 'menu'
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      if (params.get('projetor') === 'true') return; // Ignora no projetor
    } catch (e) {}

    const checkActiveTela = () => {
      try {
        const telas = document.querySelectorAll('.tela');
        const anyActive = Array.from(telas).some(el => el.classList.contains('ativa'));
        if (!anyActive) setTela('menu');
      } catch (e) {
        // noop
      }
    };

    // checa logo após o primeiro render e novamente um pouco depois (por segurança)
    const t1 = setTimeout(checkActiveTela, 50);
    const t2 = setTimeout(checkActiveTela, 350);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

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
  const [planilhaPistasFeedback, setPlanilhaPistasFeedback] = useState(null);
  const [planilhaPistasNovasCartas, setPlanilhaPistasNovasCartas] = useState([]);
  const [planilhaImAcaoFeedback, setPlanilhaImAcaoFeedback] = useState(null);
  const [planilhaImAcaoNovasCartas, setPlanilhaImAcaoNovasCartas] = useState([]);

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
    if (iaAba === 'duelo' && !iaTipoMC && !iaTipoVF && !iaTipoVel) {
      setIaFeedback({ txt: '❌ Selecione pelo menos um tipo de pergunta para gerar!', tipo: 'err' });
      return;
    }

    setIaLoading(true);
    setIaFeedback({ txt: iaSourceMode === 'file' ? '⏳ Analisando arquivo e formulando perguntas...' : '⏳ Rastreando link e formulando perguntas...', tipo: 'warn' });
    setIaPergsGeradas([]);
    setIaPistasGeradas([]);

    const tiposDisponiveis = [];
    if (iaTipoMC) tiposDisponiveis.push('mc');
    if (iaTipoVF) tiposDisponiveis.push('vf');
    if (iaTipoVel) tiposDisponiveis.push('veloc');

    // Prompt de Duelo
    const promptBaseDuelo = `Analise o conteúdo fornecido e gere exatamente ${iaQtd} perguntas sobre o tema "${materia}".\n`
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
      + `    "resp": 0\n`
      + `  },\n`
      + `  {\n`
      + `    "turma": "${iaTurma.trim() || 'Sem Turma'}",\n`
      + `    "mat": "${materia}",\n`
      + `    "tema": "${iaTema.trim() || 'Geral'}",\n`
      + `    "tipo": "vf",\n`
      + `    "txt": "Fato ou afirmação?",\n`
      + `    "resp": "v"\n`
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

    // Prompt de Três Pistas
    const promptBasePistas = `Analise o conteúdo fornecido (ou o tema informado) e gere exatamente ${iaQtd} cartas de pistas estruturadas para o jogo de tabuleiro clássico Três Pistas (estilo Perfil) sobre o tema "${materia}".\n`
      + `Cada carta deve possuir uma Categoria ampla (ex: Pessoa, Lugar, Animal, Coisa, Ano, Objeto, Evento), um Segredo/Resposta exata e exatamente 5 pistas textuais associadas, organizadas em ordem de dificuldade estritamente decrescente (a Pista 1 é muito difícil/misteriosa, a Pista 5 é muito fácil e quase entrega a resposta de bandeja).\n\n`
      + (iaPromptInstrucao.trim() ? `INSTRUÇÃO DE PERSONALIZAÇÃO ADICIONAL DO USUÁRIO QUE DEVE SER SEGUIDA RIGOROSAMENTE:\n"${iaPromptInstrucao.trim()}"\n\n` : '')
      + `Você também pode, opcionalmente, associar um efeito clássico de tabuleiro a algumas pistas normais da carta para criar pistas bônus ou penalidades surpresa! Os efeitos válidos em JSON são: "avance_1", "avance_2", "recue_1", "recue_2", "oponente_avance_1", "oponente_recue_1", "oponente_recue_2". Se uma pista for apenas dica normal sem efeito, defina-a com "efeito": null.\n\n`
      + `Responda unicamente no formato JSON estrito, sem markdown, sem textos adicionais, respeitando esta estrutura exata:\n`
      + `[\n`
      + `  {\n`
      + `    "cat": "Categoria",\n`
      + `    "resp": "Segredo/Resposta",\n`
      + `    "pistas": [\n`
      + `      { "txt": "Pista 1 super difícil", "efeito": null },\n`
      + `      { "txt": "Pista 2 difícil", "efeito": "avance_1" },\n`
      + `      { "txt": "Pista 3 média", "efeito": null },\n`
      + `      { "txt": "Pista 4 fácil", "efeito": "recue_1" },\n`
      + `      { "txt": "Pista 5 muito óbvia", "efeito": null }\n`
      + `    ]\n`
      + `  }\n`
      + `]`;

    // Prompt de Imagem e Ação
    const promptBaseImAcao = `Analise o conteúdo fornecido (ou o tema informado) e gere exatamente ${iaQtd} cartas de jogo para a modalidade Imagem e Ação sobre o tema "${materia}".\n`
      + `Cada carta deve possuir exatamente 5 opções estruturadas correspondentes às seguintes categorias clássicas do jogo oficial:\n`
      + `1. Ação (um verbo ou atividade representável fisicamente por gestos/mímica)\n`
      + `2. Objeto (uma coisa física ou utensílio que pode ser desenhado no quadro)\n`
      + `3. Lugar (uma cidade, país, espaço físico ou monumento)\n`
      + `4. Pessoa/Animal (um personagem famoso, profissão, figura histórica ou animal)\n`
      + `5. Difícil (um conceito abstrato, gíria ou termo complexo)\n\n`
      + (iaPromptInstrucao.trim() ? `INSTRUÇÃO DE PERSONALIZAÇÃO ADICIONAL DO USUÁRIO QUE DEVE SER SEGUIDA RIGOROSAMENTE:\n"${iaPromptInstrucao.trim()}"\n\n` : '')
      + `Responda unicamente no formato JSON estrito, sem markdown, sem textos adicionais, respeitando esta estrutura exata:\n`
      + `[\n`
      + `  {\n`
      + `    "opcoes": [\n`
      + `      { "num": 1, "cat": "Ação", "resp": "Palavra de Ação" },\n`
      + `      { "num": 2, "cat": "Objeto", "resp": "Palavra de Objeto" },\n`
      + `      { "num": 3, "cat": "Lugar", "resp": "Palavra de Lugar" },\n`
      + `      { "num": 4, "cat": "Pessoa/Animal", "resp": "Palavra de Pessoa/Animal" },\n`
      + `      { "num": 5, "cat": "Difícil", "resp": "Palavra Difícil" }\n`
      + `    ]\n`
      + `  }\n`
      + `]`;

    const promptBase = iaAba === 'pistas' 
      ? promptBasePistas 
      : iaAba === 'imacao' 
        ? promptBaseImAcao 
        : promptBaseDuelo;

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

        if (iaAba === 'pistas') {
          const validadasPistas = parsed.filter(c => {
            return c.cat && c.resp && Array.isArray(c.pistas) && c.pistas.length === 5 && c.pistas.every(p => p.txt);
          }).map(c => ({
            cat: c.cat,
            resp: c.resp,
            pistas: c.pistas.map(p => ({
              txt: p.txt,
              efeito: p.efeito || null
            }))
          }));

          if (!validadasPistas.length) throw new Error('Nenhuma carta de pistas gerada atendeu aos critérios de validação.');

          setIaPistasGeradas(validadasPistas);
          setIaFeedback({ txt: `✅ ${validadasPistas.length} cartas de Três Pistas geradas com sucesso pela IA do Gemini!`, tipo: 'ok' });
          setIaLoading(false);
          return;
        } else if (iaAba === 'imacao') {
          const validadasImAcao = parsed.filter(c => {
            return Array.isArray(c.opcoes) && c.opcoes.length === 5 && c.opcoes.every(o => o.num && o.cat && o.resp);
          }).map(c => ({
            opcoes: c.opcoes.map(o => ({
              num: Number(o.num),
              cat: o.cat,
              resp: o.resp
            }))
          }));

          if (!validadasImAcao.length) throw new Error('Nenhuma carta de Imagem e Ação gerada atendeu aos critérios de validação.');

          setIaImAcaoGeradas(validadasImAcao);
          setIaFeedback({ txt: `✅ ${validadasImAcao.length} cartas de Imagem e Ação geradas com sucesso pela IA do Gemini!`, tipo: 'ok' });
          setIaLoading(false);
          return;
        } else {
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
          setIaFeedback({ txt: `✅ ${validadas.length} perguntas de Duelo formuladas com sucesso pela IA do Gemini!`, tipo: 'ok' });
          setIaLoading(false);
          return;
        }
      } catch (err) {
        console.error('Erro na API do Gemini:', err);
        setIaFeedback({ txt: `⚠️ Falha na API do Gemini: ${err.message}. Ativando simulação local...`, tipo: 'warn' });
        // Deixa seguir para o fallback local
      }
    }

    // Fallback Local se a API não estiver configurada ou falhar
    setTimeout(() => {
      if (iaAba === 'imacao') {
        const mockImAcaoTema = [
          {
            opcoes: [
              { num: 1, cat: 'Ação', resp: `Fazer Mímica de ${materia}` },
              { num: 2, cat: 'Objeto', resp: `Escrever no Quadro de ${materia}` },
              { num: 3, cat: 'Lugar', resp: 'Sala de Aula Divertida' },
              { num: 4, cat: 'Pessoa/Animal', resp: 'Professor Inteligente' },
              { num: 5, cat: 'Difícil', resp: 'Decifrar Equação' }
            ]
          },
          {
            opcoes: [
              { num: 1, cat: 'Ação', resp: 'Desenhar no Quadro' },
              { num: 2, cat: 'Objeto', resp: 'Projetor Digital' },
              { num: 3, cat: 'Lugar', resp: 'Laboratório de Ciências' },
              { num: 4, cat: 'Pessoa/Animal', resp: 'Cientista Famoso' },
              { num: 5, cat: 'Difícil', resp: 'Entropia Térmica' }
            ]
          }
        ];
        
        setIaImAcaoGeradas(mockImAcaoTema);
        setIaFeedback({
          txt: geminiKey.trim()
            ? `✨ Modo Simulação Ativo: A API do Gemini falhou ou retornou inválido. Geramos cartas de Imagem e Ação simuladas para o tema "${materia}"!`
            : `✨ Modo Simulação: Para ler PDFs reais, insira sua chave do Gemini. Geramos cartas de Imagem e Ação simuladas para o tema "${materia}"!`,
          type: 'ok'
        });
        setIaLoading(false);
        return;
      }

      if (iaAba === 'pistas') {
        const bancoMockPistas = {
          'História': [
            {
              cat: 'Pessoa',
              resp: 'Dom Pedro II',
              pistas: [
                { txt: 'Fui o segundo e último imperador do Império do Brasil, reinando por 58 anos.', efeito: null },
                { txt: 'Meu reinado foi marcado pela consolidação nacional e pela abolição da escravidão por minha filha.', efeito: 'avance_1' },
                { txt: 'Subi ao trono com apenas 5 anos de idade após a abdicação de meu pai em 1831.', efeito: null },
                { txt: 'Fui deposto em 1889 pela Proclamação da República e exilado na Europa.', efeito: 'recue_1' },
                { txt: 'Sou conhecido pela alcunha de "O Magnânimo" e por meu amor às artes e ciências.', efeito: null }
              ]
            },
            {
              cat: 'Lugar',
              resp: 'Brasília',
              pistas: [
                { txt: 'Sou uma cidade planejada construída a partir do zero no meio do Planalto Central brasileiro.', efeito: null },
                { txt: 'Minha arquitetura inovadora e futurista foi desenhada por Oscar Niemeyer.', efeito: 'avance_2' },
                { txt: 'Fui inaugurada em 1960 pelo então presidente Juscelino Kubitschek.', efeito: null },
                { txt: 'Meu desenho urbano original assemelha-se ao formato de um avião (Plano Piloto).', efeito: 'oponente_recue_1' },
                { txt: 'Substituí a cidade do Rio de Janeiro como capital federal do Brasil.', efeito: null }
              ]
            },
            {
              cat: 'Ano',
              resp: '1500',
              pistas: [
                { txt: 'Sou o ano que marca o início do século XVI.', efeito: null },
                { txt: 'Neste ano, uma expedição liderada por Pedro Álvares Cabral chegou às terras que hoje formam o Brasil.', efeito: 'avance_1' },
                { txt: 'Foi o ano em que Pero Vaz de Caminha escreveu sua famosa carta relatando as belezas da nova terra.', efeito: null },
                { txt: 'O rei de Portugal na época desta grande expedição era Dom Manuel I.', efeito: 'oponente_recue_1' },
                { txt: 'Meu número é composto pelo algarismo 1 seguido de 5 e dois zeros.', efeito: null }
              ]
            }
          ],
          'Ciências': [
            {
              cat: 'Coisa',
              resp: 'DNA',
              pistas: [
                { txt: 'Sou a molécula que carrega as instruções genéticas para o desenvolvimento e funcionamento de todos os seres vivos.', efeito: null },
                { txt: 'Minha estrutura tridimensional característica em dupla hélice foi descoberta por Watson e Crick em 1953.', efeito: 'avance_1' },
                { txt: 'Sou composto por quatro bases nitrogenadas principais: Adenina, Timina, Citosina e Guanina.', efeito: null },
                { txt: 'Fico localizado principalmente no interior do núcleo das células eucarióticas.', efeito: 'recue_1' },
                { txt: 'Minha sigla em português significa Ácido Desoxirribonucleico.', efeito: null }
              ]
            },
            {
              cat: 'Animal',
              resp: 'Dinossauro',
              pistas: [
                { txt: 'Fomos um grupo diversificado de répteis que dominaram a Terra durante a Era Mesozoica.', efeito: null },
                { txt: 'Nossa extinção em massa ocorreu há aproximadamente 66 milhões de anos, provavelmente por impacto de asteroide.', efeito: 'avance_2' },
                { txt: 'O Tiranossauro Rex e o Tricerátops são algumas de nossas espécies mais célebres.', efeito: null },
                { txt: 'Nossos restos fossilizados são estudados com entusiasmo por paleontólogos no mundo todo.', efeito: 'recue_1' },
                { txt: 'Fomos popularizados na cultura moderna por franquias de ficção científica como "Jurassic Park".', efeito: null }
              ]
            }
          ]
        };

        const temaEncontradoPistas = Object.keys(bancoMockPistas).find(k => k.toLowerCase() === materia.toLowerCase());
        let poolPistas = temaEncontradoPistas ? bancoMockPistas[temaEncontradoPistas] : null;

        if (!poolPistas) {
          poolPistas = [];
          Object.keys(bancoMockPistas).forEach(key => {
            poolPistas = poolPistas.concat(bancoMockPistas[key]);
          });
        }

        const embaralhadasPistas = [...poolPistas].sort(() => Math.random() - 0.5);
        const selecionadasPistas = embaralhadasPistas.slice(0, Math.min(iaQtd, embaralhadasPistas.length));

        setIaPistasGeradas(selecionadasPistas);
        setIaFeedback({
          txt: geminiKey.trim()
            ? `✨ Modo Simulação Ativo: A API do Gemini falhou. Geramos cartas de pistas simuladas para o tema "${materia}"!`
            : `✨ Modo Simulação: Para ler PDFs reais, insira sua chave do Gemini. Geramos cartas de pistas simuladas para o tema "${materia}"!`,
          tipo: 'ok'
        });
        setIaLoading(false);
        return;
      }

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

  const confirmarImportacaoPistasIA = (modo) => {
    if (!iaPistasGeradas.length) return;
    if (modo === 'sub') {
      setCartasPistas(iaPistasGeradas);
    } else {
      setCartasPistas(prev => [...prev, ...iaPistasGeradas]);
    }
    setIaFeedback({ txt: `✅ ${iaPistasGeradas.length} cartas de Três Pistas importadas com sucesso ao banco!`, tipo: 'ok' });
    setIaPistasGeradas([]);
  };

  const confirmarImportacaoImAcaoIA = (modo) => {
    if (!iaImAcaoGeradas.length) return;
    if (modo === 'sub') {
      setCartasImAcao(iaImAcaoGeradas);
    } else {
      setCartasImAcao(prev => [...prev, ...iaImAcaoGeradas]);
    }
    setIaFeedback({ txt: `✅ ${iaImAcaoGeradas.length} cartas de Imagem e Ação importadas com sucesso ao banco!`, tipo: 'ok' });
    setIaImAcaoGeradas([]);
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

  const adicionarCartaPistasManual = () => {
    const cat = cadPistasCat.trim();
    const resp = cadPistasResp.trim();
    if (!cat) {
      alert('Por favor, informe a Categoria do segredo (ex: Pessoa, Lugar)!');
      return;
    }
    if (!resp) {
      alert('Por favor, informe o Segredo/Resposta (ex: Albert Einstein)!');
      return;
    }
    if (cadPistasTextos.some(t => !t.trim())) {
      alert('Por favor, preencha o texto de todas as 5 pistas!');
      return;
    }

    const novaCarta = {
      cat: cat,
      resp: resp,
      pistas: cadPistasTextos.map((txt, idx) => ({
        txt: txt.trim(),
        efeito: cadPistasEfeitos[idx]
      }))
    };

    setCartasPistas([...cartasPistas, novaCarta]);
    
    // Reseta formulário
    setCadPistasCat('');
    setCadPistasResp('');
    setCadPistasTextos(['', '', '', '', '']);
    setCadPistasEfeitos([null, null, null, null, null]);
    
    alert('Carta de pistas cadastrada com sucesso!');
  };

  const deletarCartaPistas = (idx) => {
    if (!window.confirm('Deseja excluir permanentemente esta carta de pistas?')) return;
    setCartasPistas(cartasPistas.filter((_, i) => i !== idx));
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

  // BACKUP E RESTAURAÇÃO DE TRÊS PISTAS
  const exportarPistasBackup = () => {
    try {
      const backupObj = {
        jogo: 'trespistas',
        dataBackup: new Date().toISOString(),
        cartasPistas: cartasPistas
      };
      const jsonStr = JSON.stringify(backupObj, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `duelo_sala_trespistas_backup_${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e) {
      alert('Erro ao exportar backup de Três Pistas: ' + e.message);
    }
  };

  const importarPistasBackup = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const json = JSON.parse(evt.target.result);
        if (!json || !Array.isArray(json.cartasPistas)) {
          throw new Error('Arquivo de backup inválido para Três Pistas.');
        }

        const importadas = json.cartasPistas;
        const confirmacao = window.confirm(
          `Backup de Três Pistas lido com sucesso!\n` +
          `Encontramos ${importadas.length} cartas no backup.\n\n` +
          `Clique em OK para MESCLAR estas cartas com o banco atual.\n` +
          `Clique em CANCELAR para SUBSTITUIR completamente o banco atual pelo backup.`
        );

        if (confirmacao) {
          setCartasPistas([...cartasPistas, ...importadas]);
          alert('Cartas de Três Pistas mescladas com sucesso!');
        } else {
          const subConfirm = window.confirm('ATENÇÃO: Você escolheu substituir. Todas as cartas de Três Pistas atuais serão permanentemente apagadas. Continuar?');
          if (subConfirm) {
            setCartasPistas(importadas);
            alert('Banco de Três Pistas substituído com sucesso!');
          }
        }
      } catch (err) {
        alert('Erro ao importar backup: ' + err.message);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // BACKUP E RESTAURAÇÃO DE IMAGEM E AÇÃO
  const exportarImAcaoBackup = () => {
    try {
      const backupObj = {
        jogo: 'imacao',
        dataBackup: new Date().toISOString(),
        cartasImAcao: cartasImAcao
      };
      const jsonStr = JSON.stringify(backupObj, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `duelo_sala_imacao_backup_${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e) {
      alert('Erro ao exportar backup de Imagem e Ação: ' + e.message);
    }
  };

  const importarImAcaoBackup = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const json = JSON.parse(evt.target.result);
        if (!json || !Array.isArray(json.cartasImAcao)) {
          throw new Error('Arquivo de backup inválido para Imagem e Ação.');
        }

        const importadas = json.cartasImAcao;
        const confirmacao = window.confirm(
          `Backup de Imagem e Ação lido com sucesso!\n` +
          `Encontramos ${importadas.length} cartas no backup.\n\n` +
          `Clique em OK para MESCLAR estas cartas com o banco atual.\n` +
          `Clique em CANCELAR para SUBSTITUIR completamente o banco atual pelo backup.`
        );

        if (confirmacao) {
          setCartasImAcao([...cartasImAcao, ...importadas]);
          alert('Cartas de Imagem e Ação mescladas com sucesso!');
        } else {
          const subConfirm = window.confirm('ATENÇÃO: Você escolheu substituir. Todas as cartas de Imagem e Ação atuais serão permanentemente apagadas. Continuar?');
          if (subConfirm) {
            setCartasImAcao(importadas);
            alert('Banco de Imagem e Ação substituído com sucesso!');
          }
        }
      } catch (err) {
        alert('Erro ao importar backup: ' + err.message);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // BACKUP E RESTAURAÇÃO DE JOGO DA MEMÓRIA
  const exportarMemoriaBackup = () => {
    try {
      const backupObj = {
        jogo: 'memoria',
        dataBackup: new Date().toISOString(),
        memoImagensPool: memoImagensPool,
        imagensSurpresas: {
          embaralhar: memoImgSurpresaEmbaralhar,
          olho: memoImgSurpresaOlho,
          ganharAura: memoImgSurpresaGanharAura,
          perderAura: memoImgSurpresaPerderAura,
          vezExtra: memoImgSurpresaVezExtra
        }
      };
      const jsonStr = JSON.stringify(backupObj, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `duelo_sala_memoria_backup_${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e) {
      alert('Erro ao exportar backup de Memória: ' + e.message);
    }
  };

  const importarMemoriaBackup = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const json = JSON.parse(evt.target.result);
        if (!json || !Array.isArray(json.memoImagensPool)) {
          throw new Error('Arquivo de backup inválido para o Jogo da Memória.');
        }

        const confirmacao = window.confirm(
          `Backup de Jogo da Memória lido com sucesso!\n` +
          `Encontramos ${json.memoImagensPool.length} imagens no backup.\n\n` +
          `Clique em OK para MESCLAR estas imagens à sua lista atual de imagens do jogo.\n` +
          `Clique em CANCELAR para SUBSTITUIR completamente a lista e configurações de surpresas pelo backup.`
        );

        if (confirmacao) {
          const novasImagens = [...memoImagensPool];
          json.memoImagensPool.forEach(img => {
            if (!novasImagens.includes(img)) novasImagens.push(img);
          });
          setMemoImagensPool(novasImagens);

          if (json.imagensSurpresas) {
            if (json.imagensSurpresas.embaralhar) setMemoImgSurpresaEmbaralhar(json.imagensSurpresas.embaralhar);
            if (json.imagensSurpresas.olho) setMemoImgSurpresaOlho(json.imagensSurpresas.olho);
            if (json.imagensSurpresas.ganharAura) setMemoImgSurpresaGanharAura(json.imagensSurpresas.ganharAura);
            if (json.imagensSurpresas.perderAura) setMemoImgSurpresaPerderAura(json.imagensSurpresas.perderAura);
            if (json.imagensSurpresas.vezExtra) setMemoImgSurpresaVezExtra(json.imagensSurpresas.vezExtra);
          }
          alert('Dados do Jogo da Memória mesclados com sucesso!');
        } else {
          const subConfirm = window.confirm('ATENÇÃO: Você escolheu substituir. Todas as imagens e configurações de surpresas atuais serão apagadas permanentemente. Continuar?');
          if (subConfirm) {
            setMemoImagensPool(json.memoImagensPool);
            if (json.imagensSurpresas) {
              setMemoImgSurpresaEmbaralhar(json.imagensSurpresas.embaralhar || "https://images.unsplash.com/photo-1527489377706-5bf97e608852?q=80&w=250&auto=format&fit=crop");
              setMemoImgSurpresaOlho(json.imagensSurpresas.olho || "https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=250&auto=format&fit=crop");
              setMemoImgSurpresaGanharAura(json.imagensSurpresas.ganharAura || "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=250&auto=format&fit=crop");
              setMemoImgSurpresaPerderAura(json.imagensSurpresas.perderAura || "https://images.unsplash.com/photo-1594322436404-5a0526db4d13?q=80&w=250&auto=format&fit=crop");
              setMemoImgSurpresaVezExtra(json.imagensSurpresas.vezExtra || "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?q=80&w=250&auto=format&fit=crop");
            }
            alert('Banco e configurações de cartas surpresas da Memória substituídos com sucesso!');
          }
        }
      } catch (err) {
        alert('Erro ao importar backup: ' + err.message);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // LÓGICA DE SINCRONIZAÇÃO ONLINE COM FIREBASE (FIREBASE FIRESTORE)
  const handleEnviarParaNuvem = async () => {
    if (!codigoSalaOnline.trim()) {
      alert('Por favor, digite um Código de Acesso Online antes de sincronizar.');
      return;
    }
    
    setStatusSincronismo('⏳ Enviando dados para a nuvem...');
    try {
      const payload = {
        perguntas: perguntas,
        materias: materias,
        cartasPistas: cartasPistas,
        cartasImAcao: cartasImAcao,
        memoImagensPool: memoImagensPool,
        imagensSurpresas: {
          embaralhar: memoImgSurpresaEmbaralhar,
          olho: memoImgSurpresaOlho,
          ganharAura: memoImgSurpresaGanharAura,
          perderAura: memoImgSurpresaPerderAura,
          vezExtra: memoImgSurpresaVezExtra
        }
      };

      const sucesso = await publicarBancoNuvem(codigoSalaOnline, payload);
      if (sucesso) {
        setStatusSincronismo('✅ Sincronizado com a nuvem em: ' + new Date().toLocaleTimeString());
        alert(`Sucesso! Seus dados de todos os jogos foram salvos na nuvem sob o código: ${codigoSalaOnline.trim().toUpperCase()}`);
      } else {
        setStatusSincronismo('❌ Erro: Firebase não inicializado.');
      }
    } catch (e) {
      setStatusSincronismo('❌ Erro na sincronização.');
      alert('Erro ao enviar dados para a nuvem: ' + e.message);
    }
  };

  const handleBaixarDaNuvem = async () => {
    if (!codigoSalaOnline.trim()) {
      alert('Por favor, digite o Código de Acesso Online do qual deseja baixar os dados.');
      return;
    }

    setStatusSincronismo('⏳ Buscando dados na nuvem...');
    try {
      const dados = await obterBancoNuvem(codigoSalaOnline);
      if (!dados) {
        setStatusSincronismo('⚠️ Nenhum dado encontrado na nuvem para este código.');
        alert(`Não encontramos nenhum banco de dados associado ao código: ${codigoSalaOnline.trim().toUpperCase()}.\nVerifique se o código está correto ou envie seus dados locais primeiro.`);
        return;
      }

      const confirmacao = window.confirm(
        `Banco de dados encontrado!\n` +
        `Atualizado em: ${dados.updatedAt ? new Date(dados.updatedAt).toLocaleString() : 'N/A'}\n\n` +
        `Matérias cadastradas: ${dados.materias?.length || 0}\n` +
        `Perguntas do Quiz: ${dados.perguntas?.length || 0}\n` +
        `Cartas de Três Pistas: ${dados.cartasPistas?.length || 0}\n` +
        `Cartas de Imagem e Ação: ${dados.cartasImAcao?.length || 0}\n` +
        `Imagens da Memória: ${dados.memoImagensPool?.length || 0}\n\n` +
        `Clique em OK para MESCLAR estes dados online aos seus dados locais do navegador.\n` +
        `Clique em CANCELAR para SUBSTITUIR completamente todos os dados locais pelos dados salvos na nuvem.`
      );

      if (confirmacao) {
        // MESCLAR
        if (Array.isArray(dados.perguntas)) {
          setPerguntas([...perguntas, ...dados.perguntas]);
        }
        if (Array.isArray(dados.materias)) {
          const novasMats = [...materias];
          dados.materias.forEach(m => {
            if (!novasMats.includes(m)) novasMats.push(m);
          });
          setMaterias(novasMats);
        }
        if (Array.isArray(dados.cartasPistas)) {
          setCartasPistas([...cartasPistas, ...dados.cartasPistas]);
        }
        if (Array.isArray(dados.cartasImAcao)) {
          setCartasImAcao([...cartasImAcao, ...dados.cartasImAcao]);
        }
        if (Array.isArray(dados.memoImagensPool)) {
          const novasImgs = [...memoImagensPool];
          dados.memoImagensPool.forEach(img => {
            if (!novasImgs.includes(img)) novasImgs.push(img);
          });
          setMemoImagensPool(novasImgs);
        }
        if (dados.imagensSurpresas) {
          if (dados.imagensSurpresas.embaralhar) setMemoImgSurpresaEmbaralhar(dados.imagensSurpresas.embaralhar);
          if (dados.imagensSurpresas.olho) setMemoImgSurpresaOlho(dados.imagensSurpresas.olho);
          if (dados.imagensSurpresas.ganharAura) setMemoImgSurpresaGanharAura(dados.imagensSurpresas.ganharAura);
          if (dados.imagensSurpresas.perderAura) setMemoImgSurpresaPerderAura(dados.imagensSurpresas.perderAura);
          if (dados.imagensSurpresas.vezExtra) setMemoImgSurpresaVezExtra(dados.imagensSurpresas.vezExtra);
        }
        setStatusSincronismo('✅ Dados mesclados com a nuvem!');
        alert('Dados da nuvem mesclados com sucesso!');
      } else {
        // SUBSTITUIR
        const subConfirm = window.confirm('ATENÇÃO: Você escolheu SUBSTITUIR. Todos os dados atuais do navegador (Perguntas, Três Pistas, Imagem e Ação e Memória) serão permanentemente apagados e substituídos pelos dados da nuvem. Continuar?');
        if (subConfirm) {
          setPerguntas(dados.perguntas || []);
          setMaterias(dados.materias || []);
          setCartasPistas(dados.cartasPistas || []);
          setCartasImAcao(dados.cartasImAcao || []);
          setMemoImagensPool(dados.memoImagensPool || []);
          if (dados.imagensSurpresas) {
            setMemoImgSurpresaEmbaralhar(dados.imagensSurpresas.embaralhar || "https://images.unsplash.com/photo-1527489377706-5bf97e608852?q=80&w=250&auto=format&fit=crop");
            setMemoImgSurpresaOlho(dados.imagensSurpresas.olho || "https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=250&auto=format&fit=crop");
            setMemoImgSurpresaGanharAura(dados.imagensSurpresas.ganharAura || "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=250&auto=format&fit=crop");
            setMemoImgSurpresaPerderAura(dados.imagensSurpresas.perderAura || "https://images.unsplash.com/photo-1594322436404-5a0526db4d13?q=80&w=250&auto=format&fit=crop");
            setMemoImgSurpresaVezExtra(dados.imagensSurpresas.vezExtra || "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?q=80&w=250&auto=format&fit=crop");
          }
          setStatusSincronismo('✅ Dados locais substituídos pelos da nuvem!');
          alert('Banco de dados local substituído com sucesso pelos dados da nuvem!');
        } else {
          setStatusSincronismo('✅ Download da nuvem cancelado.');
        }
      }
    } catch (e) {
      setStatusSincronismo('❌ Erro ao baixar da nuvem.');
      alert('Erro ao buscar dados na nuvem: ' + e.message);
    }
  };

  // EFEITO DE AUTO-SINCRONIZAÇÃO EM NUVEM (DEBOUNCE 2.5s)
  useEffect(() => {
    if (!sincronismoAutomatico || !codigoSalaOnline.trim()) return;

    const timer = setTimeout(async () => {
      setStatusSincronismo('⏳ Salvamento automático em nuvem...');
      try {
        const payload = {
          perguntas: perguntas,
          materias: materias,
          cartasPistas: cartasPistas,
          cartasImAcao: cartasImAcao,
          memoImagensPool: memoImagensPool,
          imagensSurpresas: {
            embaralhar: memoImgSurpresaEmbaralhar,
            olho: memoImgSurpresaOlho,
            ganharAura: memoImgSurpresaGanharAura,
            perderAura: memoImgSurpresaPerderAura,
            vezExtra: memoImgSurpresaVezExtra
          }
        };
        const sucesso = await publicarBancoNuvem(codigoSalaOnline, payload);
        if (sucesso) {
          setStatusSincronismo('✅ Auto-Sincronizado: ' + new Date().toLocaleTimeString());
        } else {
          setStatusSincronismo('❌ Auto-Sincronismo falhou: Firestore inativo.');
        }
      } catch (err) {
        setStatusSincronismo('❌ Auto-Sincronismo falhou.');
        console.error('Erro no auto-sincronismo:', err);
      }
    }, 2500);

    return () => clearTimeout(timer);
  }, [
    sincronismoAutomatico,
    codigoSalaOnline,
    perguntas,
    materias,
    cartasPistas,
    cartasImAcao,
    memoImagensPool,
    memoImgSurpresaEmbaralhar,
    memoImgSurpresaOlho,
    memoImgSurpresaGanharAura,
    memoImgSurpresaPerderAura,
    memoImgSurpresaVezExtra
  ]);

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

  // Processamento de planilha para CARTAS DE PISTAS
  const processarPlanilhaPistas = (e) => {
    setPlanilhaPistasFeedback({ txt: '⏳ Analisando arquivo de planilha...', tipo: 'warn' });
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

          const categoria = r['categoria'] || r['cat'] || 'Geral';
          const resposta = r['resposta'] || r['resp'] || r['segredo'] || '';

          if (!resposta) {
            erros.push(`Linha ${idx + 2}: Resposta/Segredo vazia.`);
            return;
          }

          const pistas = [];
          for (let i = 1; i <= 5; i++) {
            const pistaKey = `pista_${i}` || `pista${i}` || `p${i}`;
            const efeitoKey = `efeito_${i}` || `efeito${i}`;
            
            const pistaText = r[`pista_${i}`] || r[`pista${i}`] || r[`p${i}`] || '';
            const efeitoText = r[`efeito_${i}`] || r[`efeito${i}`] || '';

            if (pistaText) {
              pistas.push({
                txt: pistaText,
                efeito: efeitoText || null
              });
            }
          }

          if (pistas.length === 0) {
            erros.push(`Linha ${idx + 2}: Nenhuma pista fornecida.`);
            return;
          }

          const novaCarta = {
            cat: categoria,
            resp: resposta,
            pistas: pistas
          };

          novas.push(novaCarta);
        });

        if (!novas.length) {
          setPlanilhaPistasFeedback({ txt: `❌ Nenhuma carta válida encontrada!\n${erros.join('\n')}`, tipo: 'err' });
          return;
        }

        setPlanilhaPistasNovasCartas(novas);
        setPlanilhaPistasFeedback({ txt: `✅ Planilha analisada! ${novas.length} cartas prontas para importação.`, tipo: 'ok' });

      } catch (err) {
        setPlanilhaPistasFeedback({ txt: `❌ Erro de processamento: ${err.message}`, tipo: 'err' });
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const confirmarImportacaoPlanilhaPistas = (modo) => {
    if (!planilhaPistasNovasCartas.length) return;
    if (modo === 'sub') {
      setCartasPistas(planilhaPistasNovasCartas);
    } else {
      const novas = [...cartasPistas, ...planilhaPistasNovasCartas];
      setCartasPistas(novas);
    }
    alert(`Sucesso! ${planilhaPistasNovasCartas.length} cartas de pistas importadas.`);
    setPlanilhaPistasNovasCartas([]);
    setPlanilhaPistasFeedback(null);
  };

  // Processamento de planilha para CARTAS DE IMAGEM E AÇÃO
  const processarPlanilhaImAcao = (e) => {
    setPlanilhaImAcaoFeedback({ txt: '⏳ Analisando arquivo de planilha...', tipo: 'warn' });
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

          const nome = r['nome'] || r['theme'] || r['tema'] || '';

          if (!nome) {
            erros.push(`Linha ${idx + 2}: Nome/tema vazio.`);
            return;
          }

          const categorias = ['Ação', 'Objeto', 'Lugar', 'Pessoa/Animal', 'Difícil'];
          const opcoes = [];

          categorias.forEach(cat => {
            const normCat = norm(cat);
            const respKey = `${normCat}_resposta` || `${normCat}_resp` || `resposta_${normCat}`;
            
            // Buscar com várias variações de chaves
            let respText = r[normCat] || r[`${normCat}_resposta`] || r[`resposta_${normCat}`] || '';
            
            if (respText) {
              opcoes.push({
                cat: cat,
                resp: respText
              });
            }
          });

          if (opcoes.length === 0) {
            erros.push(`Linha ${idx + 2}: Nenhuma resposta para as categorias.`);
            return;
          }

          const novaCarta = {
            id: `imacao_${Date.now()}_${idx}`,
            nome: nome,
            opcoes: opcoes
          };

          novas.push(novaCarta);
        });

        if (!novas.length) {
          setPlanilhaImAcaoFeedback({ txt: `❌ Nenhuma carta válida encontrada!\n${erros.join('\n')}`, tipo: 'err' });
          return;
        }

        setPlanilhaImAcaoNovasCartas(novas);
        setPlanilhaImAcaoFeedback({ txt: `✅ Planilha analisada! ${novas.length} cartas prontas para importação.`, tipo: 'ok' });

      } catch (err) {
        setPlanilhaImAcaoFeedback({ txt: `❌ Erro de processamento: ${err.message}`, tipo: 'err' });
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const confirmarImportacaoPlanilhaImAcao = (modo) => {
    if (!planilhaImAcaoNovasCartas.length) return;
    if (modo === 'sub') {
      setCartasImAcao(planilhaImAcaoNovasCartas);
    } else {
      const novas = [...cartasImAcao, ...planilhaImAcaoNovasCartas];
      setCartasImAcao(novas);
    }
    alert(`Sucesso! ${planilhaImAcaoNovasCartas.length} cartas de Imagem e Ação importadas.`);
    setPlanilhaImAcaoNovasCartas([]);
    setPlanilhaImAcaoFeedback(null);
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

    const p = fila[rodAtual - 1];
    if (!p) return;

    const novasPontuacoes = [...pts];
    const limite = (p && p.tempo !== undefined && p.tempo !== null) ? p.tempo : (globalTimerEnabled ? globalTempo : null);
    const limiteEficaz = limite !== null ? limite : 0;
    let alguemAcertou = false;

    // Calcular quem pontua nas de Múltipla Escolha e V/F
    if (p.tipo === 'mc' || p.tipo === 'vf') {
      const respostaCerta = p.resp;

      for (let j = 0; j < 2; j++) {
        const apostaMult = (modoApostas && apostasRodada[j] !== null) ? apostasRodada[j] : 1.0;
        if (respJ[j] !== null) {
          const acertou = String(respJ[j]) === String(respostaCerta);
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
      // Velocidade que estourou o tempo
      playSound('error');
    }

    // Adicionar no histórico
    const j1Desc = respJ[0] !== null ? (p.tipo === 'mc' ? (KAHOOT[respJ[0]]?.name || respJ[0]) : respJ[0] === 'v' ? 'Verdadeiro' : 'Falso') : 'Não respondeu';
    const j2Desc = respJ[1] !== null ? (p.tipo === 'mc' ? (KAHOOT[respJ[1]]?.name || respJ[1]) : respJ[1] === 'v' ? 'Verdadeiro' : 'Falso') : 'Não respondeu';
    const histItem = {
      rodada: rodAtual,
      txt: p.txt,
      tipo: p.tipo,
      j1: j1Desc,
      j2: j2Desc,
      correta: p.tipo === 'mc' ? (KAHOOT[p.resp]?.name || p.resp) : p.tipo === 'vf' ? (p.resp === 'v' ? 'Verdadeiro' : 'Falso') : p.resp,
      pontos: [...novasPontuacoes]
    };
    setHistorico(h => [...h, histItem]);
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

    const j1Desc = respostasFinais[0] !== null ? (p.tipo === 'mc' ? (KAHOOT[respostasFinais[0]]?.name || respostasFinais[0]) : respostasFinais[0] === 'v' ? 'Verdadeiro' : 'Falso') : 'Não respondeu';
    const j2Desc = respostasFinais[1] !== null ? (p.tipo === 'mc' ? (KAHOOT[respostasFinais[1]]?.name || respostasFinais[1]) : respostasFinais[1] === 'v' ? 'Verdadeiro' : 'Falso') : 'Não respondeu';

    const histItem = {
      rodada: rodAtual,
      txt: p.txt,
      tipo: p.tipo,
      j1: j1Desc,
      j2: j2Desc,
      correta: p.tipo === 'mc' ? (KAHOOT[p.resp]?.name || p.resp) : p.tipo === 'vf' ? (p.resp === 'v' ? 'Verdadeiro' : 'Falso') : p.resp,
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

  // --- FUNÇÕES E LÓGICAS DO JOGO DAS TRÊS PISTAS ---
  
  const moverPeaoGradual = (equipeIndex, posicaoFinal, callback = null) => {
    // Foca suavemente no tabuleiro rolando a tela se necessário
    setTimeout(() => {
      document.getElementById('pistas-tabuleiro-container')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 50);

    const executarPasso = (posAtual) => {
      if (posAtual === posicaoFinal) {
        if (callback) callback();
        return;
      }

      // Determina se avança ou recua
      const proximo = posAtual < posicaoFinal ? posAtual + 1 : posAtual - 1;
      
      setPistasPontuacao(prev => {
        const nova = [...prev];
        nova[equipeIndex] = proximo;
        return nova;
      });

      playSound('tick');

      // Executa o próximo passo após 350ms
      setTimeout(() => {
        executarPasso(proximo);
      }, 350);
    };

    // Pega a posição inicial daquela equipe de forma segura
    setPistasPontuacao(prev => {
      const posPartida = prev[equipeIndex];
      setTimeout(() => {
        executarPasso(posPartida);
      }, 50);
      return prev;
    });
  };

  const iniciarPartidaPistas = () => {
    if (cartasPistas.length === 0) {
      alert('Nenhuma carta de pistas cadastrada no banco de dados! Cadastre no menu primeiro.');
      return;
    }
    
    // Limpa cronômetros de palpite se houver
    if (pistasTimerIntRef.current) clearInterval(pistasTimerIntRef.current);
    setPistasTimerSeg(null);

    // Embaralhar cartas usando o algoritmo Fisher-Yates e limitar à quantidade de rodadas escolhida
    const cartasCopiadas = [...cartasPistas];
    for (let i = cartasCopiadas.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const temp = cartasCopiadas[i];
      cartasCopiadas[i] = cartasCopiadas[j];
      cartasCopiadas[j] = temp;
    }
    const totalRodadasDesejadas = Math.min(pistasQtdRodadas, cartasPistas.length);
    const filaEmbaralhada = cartasCopiadas.slice(0, totalRodadasDesejadas);
    
    // Configurar pistas bônus dinamicamente nas rodadas pares de forma revezada
    let indexRevezado = 0;
    const filaConfigurada = filaEmbaralhada.map((carta, index) => {
      // As cartas nos índices ímpares da fila (rodada 2, 4, 6...) terão 1 pista bônus secreta.
      if (index % 2 === 1) {
        const cartaComBonus = {
          ...carta,
          pistaBonusIdx: indexRevezado
        };
        // Revesa o index da pista bônus (0 a 4) em ciclo para a próxima
        indexRevezado = (indexRevezado + 1) % 5;
        return cartaComBonus;
      } else {
        return {
          ...carta,
          pistaBonusIdx: null
        };
      }
    });
    
    setPistasFila(filaConfigurada);
    
    // Reseta peões na casa 1
    setPistasPontuacao([1, 1]);
    
    // Configura a primeira carta e limpa estados (Nenhuma pista começa revelada)
    setCartaPistaAtual(1);
    setPistasReveladas([false, false, false, false, false]);
    setPistasTentouAdivinhar([false, false]);
    setPistasEfeitoAtivo(null);
    setPistasFluxoPalpite(null);
    setPistasVezPassada(false);
    
    // Sorteia ou define a vez inicial (Equipe configurada começa)
    setPistasEquipeVez(pistasEquipeIniciar);
    
    setModoJogo('pistas');
    irParaTela('pistas-jogo');
  };

  const processarEfeitoPista = (efeito, equipeIndex) => {
    if (!efeito) return;
    
    const oponenteIndex = equipeIndex === 0 ? 1 : 0;
    let desc = '';
    let tipo = 'bonus';
    let targetEquipe = equipeIndex;
    let posFinal = pistasPontuacao[targetEquipe];
    
    if (efeito === 'avance_1') {
      posFinal = Math.min(30, pistasPontuacao[equipeIndex] + 1);
      desc = `✨ Bônus: ${equipeIndex === 0 ? nomeJ1 : nomeJ2} avançou 1 casa!`;
      playSound('success');
    } else if (efeito === 'avance_2') {
      posFinal = Math.min(30, pistasPontuacao[equipeIndex] + 2);
      desc = `🔥 Super Bônus: ${equipeIndex === 0 ? nomeJ1 : nomeJ2} avançou 2 casas!`;
      playSound('success');
    } else if (efeito === 'recue_1') {
      posFinal = Math.max(1, pistasPontuacao[equipeIndex] - 1);
      desc = `⚠️ Obstáculo: ${equipeIndex === 0 ? nomeJ1 : nomeJ2} recuou 1 casa!`;
      tipo = 'penalidade';
      playSound('error');
    } else if (efeito === 'recue_2') {
      posFinal = Math.max(1, pistasPontuacao[equipeIndex] - 2);
      desc = `💥 Armadilha: ${equipeIndex === 0 ? nomeJ1 : nomeJ2} recuou 2 casas!`;
      tipo = 'penalidade';
      playSound('error');
    } else if (efeito === 'oponente_avance_1') {
      targetEquipe = oponenteIndex;
      posFinal = Math.min(30, pistasPontuacao[oponenteIndex] + 1);
      desc = `🎁 Generosidade: Oponente (${oponenteIndex === 0 ? nomeJ1 : nomeJ2}) avançou 1 casa!`;
      playSound('success');
    } else if (efeito === 'oponente_recue_1') {
      targetEquipe = oponenteIndex;
      posFinal = Math.max(1, pistasPontuacao[oponenteIndex] - 1);
      desc = `🎯 Ataque: Oponente (${oponenteIndex === 0 ? nomeJ1 : nomeJ2}) recuou 1 casa!`;
      tipo = 'penalidade';
      playSound('error');
    } else if (efeito === 'oponente_recue_2') {
      targetEquipe = oponenteIndex;
      posFinal = Math.max(1, pistasPontuacao[oponenteIndex] - 2);
      desc = `⚡ Raio Tático: Oponente (${oponenteIndex === 0 ? nomeJ1 : nomeJ2}) recuou 2 casas!`;
      tipo = 'penalidade';
      playSound('error');
    }

    setPistasEfeitoAtivo({ equipe: equipeIndex, desc, tipo });
    
    // Executa a movimentação lenta e gradual
    moverPeaoGradual(targetEquipe, posFinal, () => {
      if (posFinal >= 30) {
        setTimeout(() => {
          finalizarPartidaPistas();
        }, 1500);
      }
    });

    // Tira o popup do efeito após 3.5 segundos
    setTimeout(() => {
      setPistasEfeitoAtivo(null);
    }, 3500);
  };

  const revelarPista = (pistaIndex) => {
    if (pistasReveladas[pistaIndex] || pistasEfeitoAtivo || pistasFluxoPalpite) return;
    
    // Obter o número total de pistas que já foram reveladas na carta
    const totalReveladas = pistasReveladas.filter(Boolean).length;

    // Se já houver alguma pista revelada, as próximas só abrem se a equipe passou a vez
    if (totalReveladas > 0 && !pistasVezPassada) {
      alert("A equipe atual precisa passar a vez antes de revelar a próxima pista!");
      return;
    }
    
    const novasReveladas = [...pistasReveladas];
    novasReveladas[pistaIndex] = true;
    setPistasReveladas(novasReveladas);
    
    // Se não for a primeira pista da rodada, reseta o indicador de passagem de vez
    if (totalReveladas > 0) {
      setPistasVezPassada(false);
    }
    
    // Ao revelar, reseta a trava de tentativa de resposta da equipe da vez 
    setPistasTentouAdivinhar([false, false]);
    
    playSound('reveal');
    
    const carta = pistasFila[cartaPistaAtual - 1];
    if (carta) {
      // Se for a Pista Bônus Secreta configurada para esta carta
      if (carta.pistaBonusIdx === pistaIndex) {
        const efeitosBotoes = ['avance_1', 'avance_2', 'recue_1', 'oponente_recue_1'];
        const efeitoSorteado = efeitosBotoes[Math.floor(Math.random() * efeitosBotoes.length)];
        processarEfeitoPista(efeitoSorteado, pistasEquipeVez);
      } else {
        // Se for pista normal, processa o efeito original caso cadastrado
        const efeito = carta.pistas[pistaIndex]?.efeito;
        if (efeito) {
          processarEfeitoPista(efeito, pistasEquipeVez);
        }
      }
    }
  };

  const julgarPalpitePistas = (acertou) => {
    if (pistasEfeitoAtivo) return;
    
    // Limpar timer do palpite
    if (pistasTimerIntRef.current) clearInterval(pistasTimerIntRef.current);
    setPistasTimerSeg(null);

    const carta = pistasFila[cartaPistaAtual - 1] || cartasPistas[0];
    const temBonus = carta && carta.pistaBonusIdx !== null && carta.pistaBonusIdx !== undefined;
    
    // Total de pistas normais de dica (4 se tem bônus, 5 se não)
    const totalPistasNormais = temBonus ? 4 : 5;
    
    // Quantidade de pistas normais que foram de fato reveladas
    const totalPistasNormaisReveladas = pistasReveladas.filter((rev, idx) => {
      if (!rev) return false;
      if (temBonus && idx === carta.pistaBonusIdx) return false; // Bônus não conta como pista normal
      return true;
    }).length;
    
    // Casas conquistadas = pistas normais restantes (pista normais totais - pistas normais reveladas)
    const casasGanhas = Math.max(1, totalPistasNormais - totalPistasNormaisReveladas);
    
    const oponenteIndex = pistasEquipeVez === 0 ? 1 : 0;
    
    setPistasFluxoPalpite(null);
    
    if (acertou) {
      playSound('victory');
      const posFinal = Math.min(30, pistasPontuacao[pistasEquipeVez] + casasGanhas);
      
      moverPeaoGradual(pistasEquipeVez, posFinal, () => {
        if (posFinal >= 30) {
          finalizarPartidaPistas();
          return;
        }
        alert(`🎉 Correto! ${pistasEquipeVez === 0 ? nomeJ1 : nomeJ2} acertou e avançou ${casasGanhas} casa(s) restantes!`);
        avancarCartaPistas();
      });
      
    } else {
      playSound('error');
      const posFinal = Math.min(30, pistasPontuacao[oponenteIndex] + casasGanhas);
      
      moverPeaoGradual(oponenteIndex, posFinal, () => {
        if (posFinal >= 30) {
          finalizarPartidaPistas();
          return;
        }
        alert(`❌ Incorreto! A resposta estava errada. A equipe adversária (${oponenteIndex === 0 ? nomeJ1 : nomeJ2}) herdou os pontos e avançou ${casasGanhas} casa(s) restantes!`);
        avancarCartaPistas();
      });
    }
  };

  const tratarEsgotamentoTempoPalpitePistas = () => {
    if (pistasTimerIntRef.current) clearInterval(pistasTimerIntRef.current);
    setPistasTimerSeg(null);
    setPistasFluxoPalpite(null);
    
    playSound('error');
    
    const oponenteIndex = pistasEquipeVez === 0 ? 1 : 0;
    const carta = pistasFila[cartaPistaAtual - 1] || cartasPistas[0];
    const temBonus = carta && carta.pistaBonusIdx !== null && carta.pistaBonusIdx !== undefined;
    const totalPistasNormais = temBonus ? 4 : 5;
    const totalPistasNormaisReveladas = pistasReveladas.filter((rev, idx) => {
      if (!rev) return false;
      if (temBonus && idx === carta.pistaBonusIdx) return false;
      return true;
    }).length;
    const casasGanhas = Math.max(1, totalPistasNormais - totalPistasNormaisReveladas);
    
    const posFinal = Math.min(30, pistasPontuacao[oponenteIndex] + casasGanhas);
    
    moverPeaoGradual(oponenteIndex, posFinal, () => {
      if (posFinal >= 30) {
        finalizarPartidaPistas();
        return;
      }
      alert(`⏰ Tempo Esgotado! A equipe da vez não respondeu a tempo. A equipe adversária (${oponenteIndex === 0 ? nomeJ1 : nomeJ2}) herdou os pontos e avançou ${casasGanhas} casa(s) restantes!`);
      avancarCartaPistas();
    });
  };

  const iniciarTimerPalpitePistas = () => {
    if (pistasTimerIntRef.current) clearInterval(pistasTimerIntRef.current);
    setPistasTimerSeg(15); // 15 segundos regulamentares para resposta oral
    pistasTimerIntRef.current = setInterval(() => {
      setPistasTimerSeg(prev => {
        if (prev === null) return null;
        if (prev <= 1) {
          clearInterval(pistasTimerIntRef.current);
          tratarEsgotamentoTempoPalpitePistas();
          return 0;
        }
        if (prev <= 6) {
          playSound('tick');
        }
        return prev - 1;
      });
    }, 1000);
  };

  const passarVezPistas = () => {
    if (pistasEfeitoAtivo || pistasFluxoPalpite) return;
    playSound('click');
    const proximo = pistasEquipeVez === 0 ? 1 : 0;
    setPistasEquipeVez(proximo);
    setPistasVezPassada(true);
  };

  const avancarCartaPistas = () => {
    setPistasFluxoPalpite(null);
    if (pistasTimerIntRef.current) clearInterval(pistasTimerIntRef.current);
    setPistasTimerSeg(null);
    if (cartaPistaAtual >= pistasFila.length) {
      finalizarPartidaPistas();
    } else {
      setCartaPistaAtual(prev => prev + 1);
      setPistasReveladas([false, false, false, false, false]);
      setPistasTentouAdivinhar([false, false]);
      setPistasEfeitoAtivo(null);
      setPistasVezPassada(false);
      
      // Alterna a vez de quem começa a rodada
      setPistasEquipeVez(cartaPistaAtual % 2); 
    }
  };

  const finalizarPartidaPistas = () => {
    if (pistasTimerIntRef.current) clearInterval(pistasTimerIntRef.current);
    setPistasTimerSeg(null);
    playSound('victory');
    setTela('pistas-fim');
  };

  // --- FUNÇÃO AUXILIAR PARA GERADOR DE IA CONTEXTUAL ---
  const renderGeradorIA = () => {
    return (
      <div className="tab-panel ativa">
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
            placeholder="Ex: História do Brasil, Física Quântica, Conhecimentos Gerais..." 
            value={iaMateria}
            onChange={(e) => setIaMateria(e.target.value)}
          />

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '14px' }}>
            <div>
              <label>Turma / Ano (Para salvar no banco)</label>
              <input 
                placeholder="Ex: 8º Ano A..." 
                value={iaTurma}
                onChange={(e) => setIaTurma(e.target.value)}
                style={{ fontSize: '0.9rem', padding: '12px' }}
              />
            </div>
            <div>
              <label>Tema Específico (Opcional)</label>
              <input 
                placeholder="Ex: Frações, Ásia..." 
                value={iaTema}
                onChange={(e) => setIaTema(e.target.value)}
                style={{ fontSize: '0.9rem', padding: '12px' }}
              />
            </div>
          </div>

          <label style={{ marginTop: '14px' }}>Instruções Extras / Prompt Adicional (Opcional)</label>
          <textarea 
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

          <label style={{ marginTop: '14px' }}>
            {iaAba !== 'duelo' ? 'Quantidade de cartas a gerar: ' : 'Quantidade de perguntas: '} 
            <span className="range-val">{iaQtd > (iaAba !== 'duelo' ? 10 : 20) ? (iaAba !== 'duelo' ? 10 : 20) : iaQtd}</span>
          </label>
          <div className="range-group">
            <span style={{ fontSize: '0.82rem', color: '#6b7280' }}>1</span>
            <input 
              type="range" 
              min="1" 
              max={iaAba !== 'duelo' ? 10 : 20} 
              value={iaQtd > (iaAba !== 'duelo' ? 10 : 20) ? (iaAba !== 'duelo' ? 10 : 20) : iaQtd} 
              onChange={(e) => setIaQtd(Number(e.target.value))}
            />
            <span style={{ fontSize: '0.82rem', color: '#6b7280' }}>{iaAba !== 'duelo' ? 10 : 20}</span>
          </div>

          {iaAba === 'duelo' && (
            <>
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
            </>
          )}

          <div style={{ marginTop: '24px', textAlign: 'center' }}>
            <button className="btn-ia" onClick={gerarPerguntasIA} disabled={iaLoading}>
              {iaLoading ? <><span className="ia-spinner"></span> Gerando...</> : (iaAba !== 'duelo' ? '✨ Gerar cartas com IA' : '✨ Gerar perguntas com IA')}
            </button>
          </div>

          {iaFeedback && (
            <div className={iaFeedback.tipo === 'ok' ? 'msg-ok' : iaFeedback.tipo === 'err' ? 'msg-err' : 'msg-warn'}>
              {iaFeedback.txt}
            </div>
          )}
        </div>

        {/* Preview das perguntas da IA */}
        {iaAba === 'duelo' && iaPergsGeradas.length > 0 && (
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

        {/* Preview das cartas de pistas da IA */}
        {iaAba === 'pistas' && iaPistasGeradas.length > 0 && (
          <div className="card" id="ia-pistas-resultado" style={{ marginTop: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyItems: 'space-between', justifyContent: 'space-between', marginBottom: '14px' }}>
              <div className="sec" style={{ margin: 0 }}>Cartas de Três Pistas Formuladas pela IA</div>
              <div className="ia-counter" style={{ background: '#7c3aed', color: '#fff', padding: '4px 10px', borderRadius: '20px', fontSize: '0.8rem', fontWeight: 'bold' }}>
                {iaPistasGeradas.length} carta(s) prontas
              </div>
            </div>
            
            <div id="ia-lista-pistas-preview" style={{ maxHeight: '450px', overflowY: 'auto', paddingRight: '6px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {iaPistasGeradas.map((c, i) => (
                <div key={i} className="ia-perg-preview" style={{ borderLeft: '4px solid #7c3aed', padding: '16px', background: 'rgba(255, 255, 255, 0.02)', borderRadius: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                    <span style={{ fontSize: '0.9rem', color: '#a78bfa', fontWeight: 800 }}>Carta #{i + 1}</span>
                    <span style={{ background: 'rgba(124, 58, 237, 0.2)', color: '#c4b5fd', padding: '2px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 'bold', textTransform: 'uppercase' }}>
                      📂 {c.cat}
                    </span>
                  </div>
                  
                  <div style={{ fontSize: '1.1rem', fontWeight: 'bold', color: '#10b981', marginBottom: '12px' }}>
                    🔑 Segredo/Resposta: {c.resp}
                  </div>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', paddingLeft: '8px' }}>
                    {c.pistas.map((p, pi) => (
                      <div key={pi} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', fontSize: '0.9rem', background: 'rgba(255,255,255,0.01)', padding: '8px', borderRadius: '6px' }}>
                        <span style={{ fontWeight: 'bold', color: '#8b5cf6', minWidth: '70px' }}>Pista {pi + 1}:</span>
                        <span style={{ flex: 1, color: '#e5e7eb' }}>{p.txt}</span>
                        {p.efeito && (
                          <span style={{ 
                            fontSize: '0.75rem', 
                            padding: '2px 6px', 
                            borderRadius: '4px', 
                            fontWeight: 'bold',
                            background: p.efeito.includes('recue') ? 'rgba(239, 68, 68, 0.2)' : 'rgba(16, 185, 129, 0.2)',
                            color: p.efeito.includes('recue') ? '#f87171' : '#34d399'
                          }}>
                            {p.efeito === 'avance_1' && '⚡ Avance 1'}
                            {p.efeito === 'avance_2' && '🔥 Avance 2'}
                            {p.efeito === 'recue_1' && '⚠️ Recue 1'}
                            {p.efeito === 'recue_2' && '💥 Recue 2'}
                            {p.efeito === 'oponente_avance_1' && '🎁 Adv. Avance 1'}
                            {p.efeito === 'oponente_recue_1' && '🎯 Adv. Recue 1'}
                            {p.efeito === 'oponente_recue_2' && '⚡ Adv. Recue 2'}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', gap: '12px', marginTop: '16px', flexWrap: 'wrap' }}>
              <button className="btn-importar" style={{ background: 'linear-gradient(90deg, #7c3aed, #4f46e5)' }} onClick={() => confirmarImportacaoPistasIA('add')}>
                ➕ Adicionar ao Banco de Cartas
              </button>
              <button className="btn-importar" style={{ background: 'linear-gradient(90deg, #374151, #4b5563)', boxShadow: 'none' }} onClick={() => confirmarImportacaoPistasIA('sub')}>
                ⬆ Substituir Banco de Cartas Completo
              </button>
            </div>
          </div>
        )}

        {/* Preview das cartas de Imagem e Ação da IA */}
        {iaAba === 'imacao' && iaImAcaoGeradas.length > 0 && (
          <div className="card" id="ia-imacao-resultado" style={{ marginTop: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyItems: 'space-between', justifyContent: 'space-between', marginBottom: '14px' }}>
              <div className="sec" style={{ margin: 0 }}>Cartas de Imagem e Ação Formuladas pela IA</div>
              <div className="ia-counter" style={{ background: '#10b981', color: '#fff', padding: '4px 10px', borderRadius: '20px', fontSize: '0.8rem', fontWeight: 'bold' }}>
                {iaImAcaoGeradas.length} carta(s) prontas
              </div>
            </div>
            
            <div id="ia-lista-imacao-preview" style={{ maxHeight: '450px', overflowY: 'auto', paddingRight: '6px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {iaImAcaoGeradas.map((c, i) => (
                <div key={i} className="ia-perg-preview" style={{ borderLeft: '4px solid #10b981', padding: '16px', background: 'rgba(255, 255, 255, 0.02)', borderRadius: '8px' }}>
                  <div style={{ fontSize: '0.9rem', color: '#6ee7b7', fontWeight: 800, marginBottom: '10px' }}>
                    Carta #{i + 1}
                  </div>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', paddingLeft: '8px' }}>
                    {c.opcoes.map((o, oi) => (
                      <div key={oi} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', fontSize: '0.9rem', background: 'rgba(255,255,255,0.01)', padding: '8px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.03)' }}>
                        <span style={{ fontWeight: 'bold', color: obterCorCasaImAcao(o.cat), minWidth: '120px' }}>
                          {o.num}. {o.cat}:
                        </span>
                        <span style={{ flex: 1, color: '#e5e7eb', fontWeight: 'bold' }}>
                          {o.resp}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', gap: '12px', marginTop: '16px', flexWrap: 'wrap' }}>
              <button className="btn-importar" style={{ background: 'linear-gradient(90deg, #10b981, #3b82f6)' }} onClick={() => confirmarImportacaoImAcaoIA('add')}>
                ➕ Adicionar ao Banco de Cartas
              </button>
              <button className="btn-importar" style={{ background: 'linear-gradient(90deg, #374151, #4b5563)', boxShadow: 'none' }} onClick={() => confirmarImportacaoImAcaoIA('sub')}>
                ⬆ Substituir Banco de Cartas Completo
              </button>
            </div>
          </div>
        )}
      </div>
    );
  };

  // --- RENDERS DE TELAS ---

  return (
    <div style={{ width: '100%' }}>
      {appError && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(2,6,23,0.92)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ maxWidth: 900, width: '100%', borderRadius: 12, padding: 18, background: 'linear-gradient(180deg, rgba(17,24,39,0.98), rgba(7,10,20,0.98))', boxShadow: '0 8px 40px rgba(2,6,23,0.6)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
              <div>
                <div style={{ fontSize: '1.1rem', fontWeight: 800 }}>Erro de Aplicação Detectado</div>
                <div style={{ fontSize: '0.85rem', color: '#9ca3af', marginTop: 6 }}>{appError.message}</div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn-menu btn-outline" style={{ padding: '8px 12px' }} onClick={() => { navigator.clipboard?.writeText(`${appError.message}\n\n${appError.stack || ''}`); }}>
                  Copiar
                </button>
                <button className="btn-menu btn-outline" style={{ padding: '8px 12px' }} onClick={() => setAppError(null)}>
                  Fechar
                </button>
              </div>
            </div>
            <pre style={{ marginTop: 12, maxHeight: '50vh', overflow: 'auto', background: 'rgba(0,0,0,0.3)', padding: 12, borderRadius: 8, fontSize: '0.8rem', color: '#f8fafc' }}>{appError.stack}</pre>
          </div>
        </div>
      )}
      {/* 1. TELA MENU */}
      <div id="tela-menu" className={`tela ${tela === 'menu' ? 'ativa' : ''}`}>
        <div style={{ fontSize: '4.5rem', filter: 'drop-shadow(0 0 25px rgba(124, 58, 237, 0.45))' }}>🏆</div>
        <h1 style={{ textAlign: 'center' }}>Arena de Jogos</h1>
        <p style={{ textAlign: 'center', marginBottom: '30px' }}>Selecione a modalidade que deseja jogar na sala de aula</p>
        
        <div className="jogos-selecao-grid" style={{ width: '100%', maxWidth: '850px', margin: '0 auto 30px' }}>
          {/* Card Duelo */}
          <div className="card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', padding: '30px 20px', justifyContent: 'space-between', border: '1px solid rgba(79, 70, 229, 0.25)', boxShadow: '0 8px 32px rgba(79, 70, 229, 0.15)' }}>
            <div>
              <div style={{ fontSize: '3rem', marginBottom: '14px' }}>⚔️</div>
              <h3 style={{ fontSize: '1.4rem', color: '#60a5fa', marginBottom: '10px', fontFamily: 'Outfit' }}>Duelo na Sala</h3>
              <p style={{ fontSize: '0.85rem', color: '#c4b5fd', lineHeight: '1.5' }}>
                Responda rápido, ganhe pontos e use poderes (Bloqueio, 50/50, Pontos Duplos) usando o Gamepad ou controles na tela!
              </p>
            </div>
            <button className="btn-menu btn-play" style={{ marginTop: '20px', maxWidth: '100%' }} onClick={() => { setMateriasSelecionadas([]); irParaTela('selecao'); }}>
              ▶ Jogar Duelo
            </button>
          </div>

          {/* Card Três Pistas */}
          <div className="card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', padding: '30px 20px', justifyContent: 'space-between', border: '1px solid rgba(139, 92, 246, 0.25)', boxShadow: '0 8px 32px rgba(139, 92, 246, 0.15)' }}>
            <div>
              <div style={{ fontSize: '3rem', marginBottom: '14px' }}>🗺️</div>
              <h3 style={{ fontSize: '1.4rem', color: '#ec4899', marginBottom: '10px', fontFamily: 'Outfit' }}>Jogo das Três Pistas</h3>
              <p style={{ fontSize: '0.85rem', color: '#f472b6', lineHeight: '1.5' }}>
                Jogo clássico de tabuleiro estilo Perfil. Revele até 5 pistas, movimente seus peões de 1 a 30 e tome cuidado com bônus e penalidades!
              </p>
            </div>
            <button className="btn-menu btn-play" style={{ marginTop: '20px', maxWidth: '100%', background: 'linear-gradient(90deg, #ec4899, #7c3aed)', boxShadow: '0 8px 30px rgba(236, 72, 153, 0.4)' }} onClick={() => { setNomeJ1('Equipe Azul'); setNomeJ2('Equipe Rosa'); irParaTela('pistas-nomes'); }}>
              ▶ Jogar Três Pistas
            </button>
          </div>

          {/* Card Imagem e Ação */}
          <div className="card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', padding: '30px 20px', justifyContent: 'space-between', border: '1px solid rgba(16, 185, 129, 0.25)', boxShadow: '0 8px 32px rgba(16, 185, 129, 0.15)' }}>
            <div>
              <div style={{ fontSize: '3rem', marginBottom: '14px' }}>🎨</div>
              <h3 style={{ fontSize: '1.4rem', color: '#10b981', marginBottom: '10px', fontFamily: 'Outfit' }}>Imagem e Ação</h3>
              <p style={{ fontSize: '0.85rem', color: '#6ee7b7', lineHeight: '1.5' }}>
                Jogo de desenho e mímica tática em tela dupla. Exiba o tabuleiro e as cartas ocultas para os alunos, e controle tudo em sigilo!
              </p>
            </div>
            <button className="btn-menu btn-play" style={{ marginTop: '20px', maxWidth: '100%', background: 'linear-gradient(90deg, #10b981, #3b82f6)', boxShadow: '0 8px 30px rgba(16, 185, 129, 0.4)' }} onClick={() => { setNomeJ1('Equipe Azul'); setNomeJ2('Equipe Rosa'); irParaTela('ia-nomes'); }}>
              ▶ Jogar Imagem e Ação
            </button>
          </div>

          {/* Card Jogo da Memória */}
          <div className="card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', padding: '30px 20px', justifyContent: 'space-between', border: '1px solid rgba(139, 92, 246, 0.25)', boxShadow: '0 8px 32px rgba(139, 92, 246, 0.15)' }}>
            <div>
              <div style={{ fontSize: '3rem', marginBottom: '14px' }}>🧠</div>
              <h3 style={{ fontSize: '1.4rem', color: '#a78bfa', marginBottom: '10px', fontFamily: 'Outfit' }}>Jogo da Memória</h3>
              <p style={{ fontSize: '0.85rem', color: '#c4b5fd', lineHeight: '1.5' }}>
                Disputa pedagógica em dupla tela com 30 cartas! Associe perguntas e respostas e ative cartas surpresas de embaralhamento 🌪️ e revelação rápida 👁️.
              </p>
            </div>
            <button className="btn-menu btn-play" style={{ marginTop: '20px', maxWidth: '100%', background: 'linear-gradient(90deg, #8b5cf6, #3b82f6)', boxShadow: '0 8px 30px rgba(139, 92, 246, 0.4)' }} onClick={() => { setNomeJ1('Equipe Azul'); setNomeJ2('Equipe Rosa'); setMemoMateria(materias.length > 0 ? materias[0] : ''); irParaTela('memo-nomes'); }}>
              ▶ Jogar Memória
            </button>
          </div>
        </div>

      </div>

      {/* 2. TELA GERADOR IA */}


      {/* 3. TELA CONTROLES */}
      <div id="tela-controles" className={`tela ${tela === 'controles' ? 'ativa' : ''}`}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '12px' }}>
          <button className="btn-volta" onClick={() => {
            if (origemConfig) {
              irParaTela(origemConfig);
            } else {
              irParaTela('menu');
            }
          }}>
            ← Voltar ao {origemConfig ? 'Lobby' : 'Menu'}
          </button>
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

        <button className="btn-menu btn-play" style={{ margin: '16px auto 0', width: 'fit-content' }} onClick={() => {
          if (origemConfig) {
            irParaTela(origemConfig);
          } else {
            irParaTela('menu');
          }
        }}>
          ✅ Mapeamento concluído
        </button>
      </div>

      {/* 4. TELA CADASTRO */}
      <div id="tela-cadastro" className={`tela ${tela === 'cadastro' ? 'ativa' : ''}`}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '18px' }}>
          <button className="btn-volta" onClick={() => {
            if (origemConfig) {
              irParaTela(origemConfig);
            } else {
              irParaTela('menu');
            }
          }}>
            ← Voltar ao {origemConfig ? 'Lobby' : 'Menu'}
          </button>
          <h2 style={{ fontSize: '1.6rem', fontWeight: 900 }}>⚙️ Gerenciar Conteúdo do Jogo</h2>
        </div>

        {/* Painel de Sincronização em Nuvem (Firebase) */}
        {cadGerenciadorAba !== 'memoria' && (
          <div className="card" style={{ 
            background: 'linear-gradient(135deg, rgba(22, 33, 62, 0.75) 0%, rgba(13, 10, 35, 0.9) 100%)', 
            border: '1.5px solid rgba(139, 92, 246, 0.4)', 
            boxShadow: '0 0 25px rgba(139, 92, 246, 0.15)',
            padding: '18px', 
            borderRadius: '16px', 
            marginBottom: '20px', 
            width: '100%', 
            boxSizing: 'border-box'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '14px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1, minWidth: '280px' }}>
                <div style={{ fontSize: '1.2rem', fontWeight: 900, color: '#a78bfa', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  ☁️ Sincronização Online em Nuvem (Firebase)
                </div>
                <p style={{ fontSize: '0.82rem', color: '#cbd5e1', margin: 0 }}>
                  Sincronize todo o seu banco de perguntas, cartas e imagens de todos os jogos com a nuvem do Firebase!
                </p>
              </div>
              
              {/* Input e Controles */}
              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center', flex: 1.5, minWidth: '280px', justifyContent: 'flex-end' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                  <label style={{ fontSize: '0.78rem', color: '#c4b5fd', fontWeight: 'bold' }}>Código de Acesso Online</label>
                  <input 
                    value={codigoSalaOnline}
                    onChange={(e) => setCodigoSalaOnline(e.target.value)}
                    placeholder="Ex: LUCAS-GEOMETRIA"
                    style={{
                      background: '#0f172a',
                      color: '#fff',
                      border: '1.5px solid rgba(139, 92, 246, 0.4)',
                      borderRadius: '8px',
                      padding: '8px 14px',
                      fontSize: '0.88rem',
                      textTransform: 'uppercase',
                      textAlign: 'center',
                      letterSpacing: '0.5px',
                      width: '180px'
                    }}
                  />
                </div>

                <div style={{ display: 'flex', gap: '8px', marginTop: '14px' }}>
                  <button 
                    onClick={handleEnviarParaNuvem}
                    className="btn-start"
                    style={{
                      padding: '10px 18px',
                      fontSize: '0.85rem',
                      background: 'linear-gradient(90deg, #3b82f6, #60a5fa)',
                      boxShadow: '0 4px 12px rgba(59, 130, 246, 0.25)'
                    }}
                  >
                    ☁️ Enviar para Nuvem
                  </button>
                  <button 
                    onClick={handleBaixarDaNuvem}
                    className="btn-start"
                    style={{
                      padding: '10px 18px',
                      fontSize: '0.85rem',
                      background: 'linear-gradient(90deg, #10b981, #34d399)',
                      boxShadow: '0 4px 12px rgba(16, 185, 129, 0.25)'
                    }}
                  >
                    ☁️ Baixar da Nuvem
                  </button>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '14px', paddingTop: '14px', borderTop: '1px solid rgba(255,255,255,0.06)', flexWrap: 'wrap', gap: '10px' }}>
              {/* Status do Sincronismo */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', color: '#9ca3af' }}>
                <span>Status:</span>
                <strong style={{ 
                  color: statusSincronismo.startsWith('✅') ? '#34d399' :
                         statusSincronismo.startsWith('❌') ? '#f87171' :
                         statusSincronismo.startsWith('⏳') ? '#fbbf24' : '#a78bfa',
                  textShadow: '0 0 10px rgba(255,255,255,0.05)'
                }}>
                  {statusSincronismo}
                </strong>
              </div>

              {/* Switch de Auto-Sincronismo */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }} onClick={() => setSincronismoAutomatico(!sincronismoAutomatico)}>
                <div style={{
                  width: '40px',
                  height: '22px',
                  borderRadius: '11px',
                  background: sincronismoAutomatico ? '#3b82f6' : '#334155',
                  position: 'relative',
                  transition: 'background 0.2s',
                  boxShadow: sincronismoAutomatico ? '0 0 10px rgba(59, 130, 246, 0.5)' : 'none'
                }}>
                  <div style={{
                    width: '16px',
                    height: '16px',
                    borderRadius: '50%',
                    background: '#fff',
                    position: 'absolute',
                    top: '3px',
                    left: sincronismoAutomatico ? '21px' : '3px',
                    transition: 'left 0.2s'
                  }} />
                </div>
                <span style={{ fontSize: '0.82rem', color: '#e2e8f0', fontWeight: 'bold' }}>
                  🔄 Sincronização Automática ao Editar
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Abas superiores do gerenciador geral */}
        {!origemConfig && (
          <div style={{ display: 'flex', gap: '8px', marginBottom: '18px', background: 'rgba(255,255,255,0.02)', padding: '6px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.06)', flexWrap: 'wrap' }}>
            <button 
              style={{ flex: '1 1 200px', padding: '12px', borderRadius: '8px', border: 'none', background: cadGerenciadorAba === 'duelo' ? '#4f46e5' : 'transparent', color: cadGerenciadorAba === 'duelo' ? '#fff' : '#a78bfa', fontWeight: 'bold', fontSize: '0.95rem', cursor: 'pointer', transition: 'all 0.2s' }}
              onClick={() => setCadGerenciadorAba('duelo')}
            >
              ⚔️ Perguntas do Duelo
            </button>
            <button 
              style={{ flex: '1 1 200px', padding: '12px', borderRadius: '8px', border: 'none', background: cadGerenciadorAba === 'pistas' ? '#7c3aed' : 'transparent', color: cadGerenciadorAba === 'pistas' ? '#fff' : '#a78bfa', fontWeight: 'bold', fontSize: '0.95rem', cursor: 'pointer', transition: 'all 0.2s' }}
              onClick={() => setCadGerenciadorAba('pistas')}
            >
              🗺️ Cartas de Três Pistas
            </button>
            <button 
              style={{ flex: '1 1 200px', padding: '12px', borderRadius: '8px', border: 'none', background: cadGerenciadorAba === 'imacao' ? '#10b981' : 'transparent', color: cadGerenciadorAba === 'imacao' ? '#fff' : '#a78bfa', fontWeight: 'bold', fontSize: '0.95rem', cursor: 'pointer', transition: 'all 0.2s' }}
              onClick={() => setCadGerenciadorAba('imacao')}
            >
              🎨 Cartas de Imagem e Ação
            </button>
            <button 
              style={{ flex: '1 1 200px', padding: '12px', borderRadius: '8px', border: 'none', background: cadGerenciadorAba === 'memoria' ? '#f59e0b' : 'transparent', color: cadGerenciadorAba === 'memoria' ? '#fff' : '#a78bfa', fontWeight: 'bold', fontSize: '0.95rem', cursor: 'pointer', transition: 'all 0.2s' }}
              onClick={() => setCadGerenciadorAba('memoria')}
            >
              🧠 Imagens da Memória
            </button>
          </div>
        )}

        {cadGerenciadorAba === 'duelo' && (
          <>
            <div className="tabs">
              <button className={`tab ${cadTab === 'manual' ? 'ativa' : ''}`} onClick={() => setCadTab('manual')}>✏️ Manual</button>
              <button className={`tab ${cadTab === 'importar' ? 'ativa' : ''}`} onClick={() => setCadTab('importar')}>📥 Importar Planilha</button>
              <button className={`tab ${cadTab === 'lista' ? 'ativa' : ''}`} onClick={() => setCadTab('lista')}>📋 Perguntas ({perguntas.length})</button>
              <button className={`tab ${cadTab === 'ia' ? 'ativa' : ''}`} onClick={() => { setCadTab('ia'); setIaAba('duelo'); setIaFeedback(null); }}>✨ Gerar com IA</button>
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

            {cadTab === 'ia' && renderGeradorIA()}
          </>
        )}

        {/* GERENCIADOR DO JOGO DAS TRÊS PISTAS */}
        {cadGerenciadorAba === 'pistas' && (
          <div className="tab-panel ativa">
            <div className="tabs">
              <button className={`tab ${cadTab === 'manual' ? 'ativa' : ''}`} onClick={() => setCadTab('manual')}>✏️ Manual</button>
              <button className={`tab ${cadTab === 'importar' ? 'ativa' : ''}`} onClick={() => setCadTab('importar')}>📥 Importar Planilha</button>
              <button className={`tab ${cadTab === 'lista' ? 'ativa' : ''}`} onClick={() => setCadTab('lista')}>📋 Cartas ({cartasPistas.length})</button>
              <button className={`tab ${cadTab === 'ia' ? 'ativa' : ''}`} onClick={() => { setCadTab('ia'); setIaAba('pistas'); if (iaQtd > 10) setIaQtd(10); setIaFeedback(null); }}>✨ Gerar com IA</button>
              <button className={`tab ${cadTab === 'backup' ? 'ativa' : ''}`} onClick={() => setCadTab('backup')}>💾 Backup JSON</button>
            </div>

            {cadTab === 'manual' && (
            <div className="tab-panel ativa">
            <div className="card">
              <div className="sec">➕ Cadastrar Carta de Três Pistas</div>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
                <div>
                  <label>Categoria</label>
                  <input 
                    placeholder="Ex: Pessoa, Lugar, Animal, Coisa, Ano..." 
                    value={cadPistasCat}
                    onChange={(e) => setCadPistasCat(e.target.value)}
                  />
                </div>
                <div>
                  <label>Resposta / Segredo</label>
                  <input 
                    placeholder="Ex: Albert Einstein, Paris, Celular..." 
                    value={cadPistasResp}
                    onChange={(e) => setCadPistasResp(e.target.value)}
                  />
                </div>
              </div>

              {/* 5 inputs para as pistas */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {Array.from({ length: 5 }).map((_, idx) => (
                  <div key={idx} style={{ background: 'rgba(255, 255, 255, 0.02)', padding: '12px', borderRadius: '8px', border: '1px solid rgba(255, 255, 255, 0.04)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                      <span style={{ fontSize: '0.82rem', fontWeight: 800, color: '#a78bfa' }}>Pista {idx + 1} (Vale {5 - idx} casas)</span>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '10px' }}>
                      <input 
                        placeholder={`Digite a pista ${idx + 1}...`}
                        value={cadPistasTextos[idx]}
                        onChange={(e) => {
                          const novosTextos = [...cadPistasTextos];
                          novosTextos[idx] = e.target.value;
                          setCadPistasTextos(novosTextos);
                        }}
                      />
                      <select 
                        value={cadPistasEfeitos[idx] || ''}
                        onChange={(e) => {
                          const novosEfeitos = [...cadPistasEfeitos];
                          novosEfeitos[idx] = e.target.value || null;
                          setCadPistasEfeitos(novosEfeitos);
                        }}
                        style={{ fontSize: '0.85rem' }}
                      >
                        <option value="">Nenhum Efeito</option>
                        <option value="avance_1">✨ Avance 1 casa</option>
                        <option value="avance_2">🔥 Avance 2 casas (Super)</option>
                        <option value="recue_1">⚠️ Recue 1 casa</option>
                        <option value="recue_2">💥 Recue 2 casas (Armadilha)</option>
                        <option value="oponente_avance_1">🎁 Oponente avance 1 casa</option>
                        <option value="oponente_recue_1">🎯 Oponente recue 1 casa</option>
                        <option value="oponente_recue_2">⚡ Oponente recue 2 casas</option>
                      </select>
                    </div>
                  </div>
                ))}
              </div>

              <button 
                className="btn-ac btn-add" 
                style={{ width: '100%', marginTop: '20px', background: 'linear-gradient(90deg, #7c3aed, #4f46e5)', padding: '14px' }}
                onClick={adicionarCartaPistasManual}
              >
                🗺️ Salvar Carta de Pistas
              </button>
            </div>

            {/* Listagem de Cartas Salvas */}
            <div className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                <div className="sec" style={{ margin: 0 }}>Cartas no Banco ({cartasPistas.length})</div>
                <button 
                  className="btn-del" 
                  onClick={() => {
                    if (window.confirm('Deseja realmente restaurar as cartas padrão e apagar todas as customizadas?')) {
                      setCartasPistas(PISTAS_PADRAO);
                    }
                  }}
                >
                  🔄 Restaurar Padrão
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '350px', overflowY: 'auto', paddingRight: '4px' }}>
                {cartasPistas.length === 0 ? (
                  <div className="lista-vazia">Nenhuma carta de pistas cadastrada.</div>
                ) : (
                  cartasPistas.map((c, i) => (
                    <div key={i} className="item-row">
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: 0 }}>
                        <span className="badge" style={{ background: 'rgba(124, 58, 237, 0.15)', color: '#a78bfa', fontSize: '0.75rem', padding: '2px 8px' }}>
                          🔍 {c.cat}
                        </span>
                        <strong style={{ fontSize: '0.9rem', color: '#e5e7eb', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                          {c.resp}
                        </strong>
                        <span style={{ fontSize: '0.78rem', color: '#6b7280' }}>
                          ({c.pistas.filter(p => p.efeito).length} efeito(s))
                        </span>
                      </div>
                      <button className="btn-del" onClick={() => deletarCartaPistas(i)}>✕</button>
                    </div>
                  ))
                )}
              </div>
            </div>
            </div>
            )}

            {/* TAB: IMPORTAR PLANILHA PISTAS */}
            {cadTab === 'importar' && (
            <div className="tab-panel ativa">
            <div className="card">
              <div className="sec">📥 Importar Cartas de Pistas via Planilha Excel</div>
              <p style={{ color: '#c4b5fd', fontSize: '0.85rem', marginBottom: '14px' }}>
                O sistema lê arquivos Excel (.xlsx, .xls) ou arquivos texto delimitados (.csv).
              </p>

              <div className="msg-warn" style={{ marginTop: '14px' }}>
                <strong>Regras de Colunas:</strong><br />
                A planilha precisa ter as seguintes colunas:<br />
                <code>categoria | resposta | pista_1 | efeito_1 | pista_2 | efeito_2 | ... | pista_5 | efeito_5</code><br />
                • categoria: Ex: Pessoa, Lugar, Coisa<br />
                • resposta: O segredo/resposta correta<br />
                • pista_X: O texto da pista (1 a 5)<br />
                • efeito_X: Opcional - nenhum efeito, avance_1, avance_2, recue_1, recue_2, oponente_avance_1, oponente_recue_1, oponente_recue_2
              </div>

              <div 
                className="drop-area" 
                style={{ marginTop: '20px' }}
                onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add('drag'); }}
                onDragLeave={(e) => e.currentTarget.classList.remove('drag')}
                onDrop={(e) => { e.preventDefault(); e.currentTarget.classList.remove('drag'); processarPlanilhaPistas(e); }}
                onClick={() => document.getElementById('sheet-file-pistas').click()}
              >
                <input 
                  type="file" 
                  id="sheet-file-pistas" 
                  accept=".xlsx,.xls,.csv" 
                  style={{ display: 'none' }}
                  onChange={processarPlanilhaPistas}
                />
                <div style={{ fontSize: '2.5rem' }}>📊</div>
                <div style={{ color: '#c4b5fd', fontWeight: 700 }}>Arraste a planilha ou clique para fazer upload</div>
                <div style={{ color: '#6b7280', fontSize: '0.8rem' }}>Suporta planilhas .xlsx, .xls e .csv</div>
              </div>

              {planilhaPistasFeedback && (
                <div className={planilhaPistasFeedback.tipo === 'ok' ? 'msg-ok' : planilhaPistasFeedback.tipo === 'err' ? 'msg-err' : 'msg-warn'}>
                  {planilhaPistasFeedback.txt}
                </div>
              )}

              {planilhaPistasNovasCartas.length > 0 && (
                <div style={{ marginTop: '20px' }}>
                  <div className="sec">Preview das cartas da planilha</div>
                  <table className="preview-table">
                    <thead>
                      <tr>
                        <th>Categoria</th>
                        <th>Resposta</th>
                        <th>Pistas</th>
                      </tr>
                    </thead>
                    <tbody>
                      {planilhaPistasNovasCartas.slice(0, 5).map((c, idx) => (
                        <tr key={idx}>
                          <td>{c.cat}</td>
                          <td>{c.resp}</td>
                          <td>{c.pistas.length}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {planilhaPistasNovasCartas.length > 5 && (
                    <p style={{ color: '#6b7280', fontSize: '0.8rem', marginTop: '6px', fontStyle: 'italic' }}>
                      ... e mais {planilhaPistasNovasCartas.length - 5} carta(s).
                    </p>
                  )}

                  <div style={{ display: 'flex', gap: '12px', marginTop: '16px', flexWrap: 'wrap' }}>
                    <button className="btn-importar" onClick={() => confirmarImportacaoPlanilhaPistas('add')}>
                      ➕ Mesclar ao Banco de Dados
                    </button>
                    <button className="btn-importar" style={{ background: 'linear-gradient(90deg, #374151, #4b5563)', boxShadow: 'none' }} onClick={() => confirmarImportacaoPlanilhaPistas('sub')}>
                      ⬆ Substituir Banco Completo
                    </button>
                  </div>
                </div>
              )}
            </div>
            </div>
            )}

            {/* TAB: LISTA PISTAS */}
            {cadTab === 'lista' && (
            <div className="tab-panel ativa">
            <div className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                <div className="sec" style={{ margin: 0 }}>Cartas no Banco ({cartasPistas.length})</div>
                <button 
                  className="btn-del" 
                  onClick={() => {
                    if (window.confirm('Deseja realmente restaurar as cartas padrão e apagar todas as customizadas?')) {
                      setCartasPistas(PISTAS_PADRAO);
                    }
                  }}
                >
                  🔄 Restaurar Padrão
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '400px', overflowY: 'auto', paddingRight: '4px' }}>
                {cartasPistas.length === 0 ? (
                  <div className="lista-vazia">Nenhuma carta de pistas cadastrada.</div>
                ) : (
                  cartasPistas.map((c, i) => (
                    <div key={i} className="item-row">
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: 0 }}>
                        <span className="badge" style={{ background: 'rgba(124, 58, 237, 0.15)', color: '#a78bfa', fontSize: '0.75rem', padding: '2px 8px' }}>
                          🔍 {c.cat}
                        </span>
                        <strong style={{ fontSize: '0.9rem', color: '#e5e7eb', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                          {c.resp}
                        </strong>
                        <span style={{ fontSize: '0.78rem', color: '#6b7280' }}>
                          ({c.pistas.filter(p => p.efeito).length} efeito(s))
                        </span>
                      </div>
                      <button className="btn-del" onClick={() => deletarCartaPistas(i)}>✕</button>
                    </div>
                  ))
                )}
              </div>
            </div>
            </div>
            )}

            {/* TAB: BACKUP TRÊS PISTAS */}
            {cadTab === 'backup' && (
              <div className="tab-panel ativa">
                <div className="card">
                  <div className="sec">💾 Backup e Restauração de Três Pistas</div>
                  <p style={{ color: '#c4b5fd', fontSize: '0.85rem', marginBottom: '20px' }}>
                    Exporte todo o seu banco de cartas personalizadas de Três Pistas para salvaguardar o seu trabalho ou compartilhe com outros computadores.
                  </p>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                    {/* Bloco Exportar */}
                    <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '12px', padding: '16px', textAlign: 'center' }}>
                      <h3 style={{ fontSize: '1.2rem', color: '#60a5fa', margin: '0 0 10px 0' }}>📤 Exportar Backup</h3>
                      <p style={{ fontSize: '0.78rem', color: '#9ca3af', marginBottom: '16px' }}>
                        Gera um arquivo JSON contendo todas as suas {cartasPistas.length} cartas de Três Pistas cadastradas.
                      </p>
                      <button 
                        className="btn-start" 
                        onClick={exportarPistasBackup}
                        style={{ padding: '10px 24px', fontSize: '0.9rem', width: '100%', background: 'linear-gradient(90deg, #3b82f6, #60a5fa)' }}
                      >
                        Exportar JSON
                      </button>
                    </div>

                    {/* Bloco Importar */}
                    <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '12px', padding: '16px', textAlign: 'center' }}>
                      <h3 style={{ fontSize: '1.2rem', color: '#34d399', margin: '0 0 10px 0' }}>📥 Importar Backup</h3>
                      <p style={{ fontSize: '0.78rem', color: '#9ca3af', marginBottom: '16px' }}>
                        Selecione um arquivo de backup (.json) gerado anteriormente para restaurar ou mesclar cartas.
                      </p>
                      <div style={{ position: 'relative', width: '100%' }}>
                        <input 
                          type="file" 
                          accept=".json" 
                          onChange={importarPistasBackup}
                          style={{
                            position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer'
                          }}
                        />
                        <button 
                          className="btn-start" 
                          style={{ padding: '10px 24px', fontSize: '0.9rem', width: '100%', background: 'linear-gradient(90deg, #10b981, #34d399)' }}
                        >
                          Selecionar Arquivo JSON
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {cadTab === 'ia' && renderGeradorIA()}
          </div>
        )}

        {/* GERENCIADOR DO JOGO IMAGEM E AÇÃO */}
        {cadGerenciadorAba === 'imacao' && (
          <div className="tab-panel ativa">
            <div className="tabs">
              <button className={`tab ${cadTab === 'manual' ? 'ativa' : ''}`} onClick={() => setCadTab('manual')}>✏️ Manual</button>
              <button className={`tab ${cadTab === 'importar' ? 'ativa' : ''}`} onClick={() => setCadTab('importar')}>📥 Importar Planilha</button>
              <button className={`tab ${cadTab === 'lista' ? 'ativa' : ''}`} onClick={() => setCadTab('lista')}>📋 Cartas ({cartasImAcao.length})</button>
              <button className={`tab ${cadTab === 'ia' ? 'ativa' : ''}`} onClick={() => { setCadTab('ia'); setIaAba('imacao'); if (iaQtd > 10) setIaQtd(10); setIaFeedback(null); }}>✨ Gerar com IA</button>
              <button className={`tab ${cadTab === 'backup' ? 'ativa' : ''}`} onClick={() => setCadTab('backup')}>💾 Backup JSON</button>
            </div>

            {cadTab === 'manual' && (
            <div className="tab-panel ativa">
            <div className="card">
              <div className="sec">➕ Cadastrar Carta de Imagem e Ação</div>
              
              <div style={{ marginBottom: '14px' }}>
                <label style={{ fontWeight: 'bold' }}>Nome da Carta / Tema / Assunto</label>
                <input 
                  placeholder="Ex: Esportes, Super-Heróis, Comidas..." 
                  value={cadImAcaoNome}
                  onChange={(e) => setCadImAcaoNome(e.target.value)}
                />
              </div>

              {/* 5 inputs para as respostas de cada categoria */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {['Ação', 'Objeto', 'Lugar', 'Pessoa/Animal', 'Difícil'].map((cat, idx) => {
                  const corCat = obterCorCasaImAcao(cat);
                  return (
                    <div key={idx} style={{ background: 'rgba(255, 255, 255, 0.02)', padding: '14px', borderRadius: '12px', border: `1.5px solid ${corCat}33`, boxShadow: `0 0 10px ${corCat}0f` }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                        <span style={{ 
                          width: '24px', 
                          height: '24px', 
                          borderRadius: '50%', 
                          background: corCat, 
                          color: '#fff', 
                          display: 'flex', 
                          alignItems: 'center', 
                          justifyContent: 'center', 
                          fontWeight: 'bold', 
                          fontSize: '0.75rem' 
                        }}>
                          {idx + 1}
                        </span>
                        <span style={{ fontSize: '0.85rem', fontWeight: 'bold', color: corCat, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                          Categoria: {cat}
                        </span>
                      </div>
                      <input 
                        placeholder={`Digite a resposta secreta de ${cat}...`}
                        value={cadImAcaoRespostas[idx]}
                        onChange={(e) => {
                          const novasRespostas = [...cadImAcaoRespostas];
                          novasRespostas[idx] = e.target.value;
                          setCadImAcaoRespostas(novasRespostas);
                        }}
                      />
                    </div>
                  );
                })}
              </div>

              <button 
                className="btn-ac btn-add" 
                style={{ width: '100%', marginTop: '20px', background: 'linear-gradient(90deg, #10b981, #059669)', padding: '14px', boxShadow: '0 4px 15px rgba(16, 185, 129, 0.25)' }}
                onClick={adicionarCartaImAcaoManual}
              >
                🎨 Salvar Carta de Imagem e Ação
              </button>
            </div>

            {/* Listagem de Cartas Salvas */}
            <div className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                <div className="sec" style={{ margin: 0 }}>Cartas no Banco ({cartasImAcao.length})</div>
                <button 
                  className="btn-del" 
                  onClick={() => {
                    if (window.confirm('Deseja realmente restaurar as cartas padrão e apagar todas as customizadas?')) {
                      setCartasImAcao(IMAGEM_ACAO_PADRAO);
                    }
                  }}
                >
                  🔄 Restaurar Padrão
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '350px', overflowY: 'auto', paddingRight: '4px' }}>
                {cartasImAcao.length === 0 ? (
                  <div className="lista-vazia">Nenhuma carta de Imagem e Ação cadastrada.</div>
                ) : (
                  cartasImAcao.map((c, i) => (
                    <div key={c.id || i} className="item-row" style={{ padding: '12px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)', background: 'rgba(255,255,255,0.01)' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span className="badge" style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#6ee7b7', fontSize: '0.78rem', padding: '2px 10px', fontWeight: 'bold' }}>
                            🏷️ {c.nome}
                          </span>
                        </div>
                        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginTop: '2px' }}>
                          {c.opcoes.map((op, idx) => (
                            <span key={idx} style={{ fontSize: '0.75rem', color: '#9ca3af' }}>
                              <strong style={{ color: obterCorCasaImAcao(op.cat) }}>{op.cat[0]}:</strong> {op.resp}
                            </span>
                          ))}
                        </div>
                      </div>
                      <button className="btn-del" style={{ alignSelf: 'center' }} onClick={() => deletarCartaImAcao(i)}>✕</button>
                    </div>
                  ))
                )}
              </div>
            </div>
            </div>
            )}

            {/* TAB: IMPORTAR PLANILHA IMAGEM E AÇÃO */}
            {cadTab === 'importar' && (
            <div className="tab-panel ativa">
            <div className="card">
              <div className="sec">📥 Importar Cartas de Imagem e Ação via Planilha Excel</div>
              <p style={{ color: '#c4b5fd', fontSize: '0.85rem', marginBottom: '14px' }}>
                O sistema lê arquivos Excel (.xlsx, .xls) ou arquivos texto delimitados (.csv).
              </p>

              <div className="msg-warn" style={{ marginTop: '14px' }}>
                <strong>Regras de Colunas:</strong><br />
                A planilha precisa ter as seguintes colunas:<br />
                <code>nome | acao | objeto | lugar | pessoa_animal | dificil</code><br />
                • nome: O tema/assunto da carta (Ex: Esportes, Animais)<br />
                • acao: Resposta para categoria "Ação"<br />
                • objeto: Resposta para categoria "Objeto"<br />
                • lugar: Resposta para categoria "Lugar"<br />
                • pessoa_animal: Resposta para categoria "Pessoa/Animal"<br />
                • dificil: Resposta para categoria "Difícil"
              </div>

              <div 
                className="drop-area" 
                style={{ marginTop: '20px' }}
                onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add('drag'); }}
                onDragLeave={(e) => e.currentTarget.classList.remove('drag')}
                onDrop={(e) => { e.preventDefault(); e.currentTarget.classList.remove('drag'); processarPlanilhaImAcao(e); }}
                onClick={() => document.getElementById('sheet-file-imacao').click()}
              >
                <input 
                  type="file" 
                  id="sheet-file-imacao" 
                  accept=".xlsx,.xls,.csv" 
                  style={{ display: 'none' }}
                  onChange={processarPlanilhaImAcao}
                />
                <div style={{ fontSize: '2.5rem' }}>📊</div>
                <div style={{ color: '#c4b5fd', fontWeight: 700 }}>Arraste a planilha ou clique para fazer upload</div>
                <div style={{ color: '#6b7280', fontSize: '0.8rem' }}>Suporta planilhas .xlsx, .xls e .csv</div>
              </div>

              {planilhaImAcaoFeedback && (
                <div className={planilhaImAcaoFeedback.tipo === 'ok' ? 'msg-ok' : planilhaImAcaoFeedback.tipo === 'err' ? 'msg-err' : 'msg-warn'}>
                  {planilhaImAcaoFeedback.txt}
                </div>
              )}

              {planilhaImAcaoNovasCartas.length > 0 && (
                <div style={{ marginTop: '20px' }}>
                  <div className="sec">Preview das cartas da planilha</div>
                  <table className="preview-table">
                    <thead>
                      <tr>
                        <th>Nome/Tema</th>
                        <th>Opções</th>
                      </tr>
                    </thead>
                    <tbody>
                      {planilhaImAcaoNovasCartas.slice(0, 5).map((c, idx) => (
                        <tr key={idx}>
                          <td>{c.nome}</td>
                          <td>{c.opcoes.length}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {planilhaImAcaoNovasCartas.length > 5 && (
                    <p style={{ color: '#6b7280', fontSize: '0.8rem', marginTop: '6px', fontStyle: 'italic' }}>
                      ... e mais {planilhaImAcaoNovasCartas.length - 5} carta(s).
                    </p>
                  )}

                  <div style={{ display: 'flex', gap: '12px', marginTop: '16px', flexWrap: 'wrap' }}>
                    <button className="btn-importar" onClick={() => confirmarImportacaoPlanilhaImAcao('add')}>
                      ➕ Mesclar ao Banco de Dados
                    </button>
                    <button className="btn-importar" style={{ background: 'linear-gradient(90deg, #374151, #4b5563)', boxShadow: 'none' }} onClick={() => confirmarImportacaoPlanilhaImAcao('sub')}>
                      ⬆ Substituir Banco Completo
                    </button>
                  </div>
                </div>
              )}
            </div>
            </div>
            )}

            {/* TAB: LISTA IMAGEM E AÇÃO */}
            {cadTab === 'lista' && (
            <div className="tab-panel ativa">
            <div className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                <div className="sec" style={{ margin: 0 }}>Cartas no Banco ({cartasImAcao.length})</div>
                <button 
                  className="btn-del" 
                  onClick={() => {
                    if (window.confirm('Deseja realmente restaurar as cartas padrão e apagar todas as customizadas?')) {
                      setCartasImAcao(IMAGEM_ACAO_PADRAO);
                    }
                  }}
                >
                  🔄 Restaurar Padrão
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '400px', overflowY: 'auto', paddingRight: '4px' }}>
                {cartasImAcao.length === 0 ? (
                  <div className="lista-vazia">Nenhuma carta de Imagem e Ação cadastrada.</div>
                ) : (
                  cartasImAcao.map((c, i) => (
                    <div key={c.id || i} className="item-row" style={{ padding: '12px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)', background: 'rgba(255,255,255,0.01)' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span className="badge" style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#6ee7b7', fontSize: '0.78rem', padding: '2px 10px', fontWeight: 'bold' }}>
                            🏷️ {c.nome}
                          </span>
                        </div>
                        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginTop: '2px' }}>
                          {c.opcoes.map((op, idx) => (
                            <span key={idx} style={{ fontSize: '0.75rem', color: '#9ca3af' }}>
                              <strong style={{ color: obterCorCasaImAcao(op.cat) }}>{op.cat[0]}:</strong> {op.resp}
                            </span>
                          ))}
                        </div>
                      </div>
                      <button className="btn-del" style={{ alignSelf: 'center' }} onClick={() => deletarCartaImAcao(i)}>✕</button>
                    </div>
                  ))
                )}
              </div>
            </div>
            </div>
            )}

            {/* TAB: BACKUP IMAGEM E AÇÃO */}
            {cadTab === 'backup' && (
              <div className="tab-panel ativa">
                <div className="card">
                  <div className="sec">💾 Backup e Restauração de Imagem e Ação</div>
                  <p style={{ color: '#c4b5fd', fontSize: '0.85rem', marginBottom: '20px' }}>
                    Exporte todo o seu banco de cartas personalizadas de Imagem e Ação para salvaguardar o seu trabalho ou compartilhe com outros computadores.
                  </p>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                    {/* Bloco Exportar */}
                    <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '12px', padding: '16px', textAlign: 'center' }}>
                      <h3 style={{ fontSize: '1.2rem', color: '#60a5fa', margin: '0 0 10px 0' }}>📤 Exportar Backup</h3>
                      <p style={{ fontSize: '0.78rem', color: '#9ca3af', marginBottom: '16px' }}>
                        Gera um arquivo JSON contendo todas as suas {cartasImAcao.length} cartas de Imagem e Ação cadastradas.
                      </p>
                      <button 
                        className="btn-start" 
                        onClick={exportarImAcaoBackup}
                        style={{ padding: '10px 24px', fontSize: '0.9rem', width: '100%', background: 'linear-gradient(90deg, #3b82f6, #60a5fa)' }}
                      >
                        Exportar JSON
                      </button>
                    </div>

                    {/* Bloco Importar */}
                    <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '12px', padding: '16px', textAlign: 'center' }}>
                      <h3 style={{ fontSize: '1.2rem', color: '#34d399', margin: '0 0 10px 0' }}>📥 Importar Backup</h3>
                      <p style={{ fontSize: '0.78rem', color: '#9ca3af', marginBottom: '16px' }}>
                        Selecione um arquivo de backup (.json) gerado anteriormente para restaurar ou mesclar cartas.
                      </p>
                      <div style={{ position: 'relative', width: '100%' }}>
                        <input 
                          type="file" 
                          accept=".json" 
                          onChange={importarImAcaoBackup}
                          style={{
                            position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer'
                          }}
                        />
                        <button 
                          className="btn-start" 
                          style={{ padding: '10px 24px', fontSize: '0.9rem', width: '100%', background: 'linear-gradient(90deg, #10b981, #34d399)' }}
                        >
                          Selecionar Arquivo JSON
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {cadTab === 'ia' && renderGeradorIA()}
          </div>
        )}

        {/* GERENCIADOR DAS IMAGENS DO JOGO DA MEMÓRIA */}
        {cadGerenciadorAba === 'memoria' && (
          <div className="tab-panel ativa" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            
            {/* BLOCO 1: SINCRONIZAÇÃO EM NUVEM & BACKUP (MINIMALISTA) */}
            <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '12px', padding: '16px', background: 'rgba(22, 33, 62, 0.45)', border: '1.5px solid rgba(139, 92, 246, 0.35)', borderRadius: '14px', margin: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid rgba(255, 255, 255, 0.08)', paddingBottom: '8px' }}>
                <span style={{ fontSize: '1.1rem' }}>☁️</span>
                <span style={{ fontWeight: 'bold', fontSize: '0.9rem', color: '#c4b5fd' }}>Sincronização em Nuvem & Backup</span>
              </div>
              
              <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
                {/* Lado Esquerdo: Firebase */}
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center', flex: '1 1 350px' }}>
                  <input 
                    value={codigoSalaOnline}
                    onChange={(e) => setCodigoSalaOnline(e.target.value)}
                    placeholder="Código de Acesso (Ex: SALA10)"
                    style={{ background: '#0f172a', color: '#fff', border: '1.5px solid rgba(139, 92, 246, 0.4)', borderRadius: '6px', padding: '6px 12px', fontSize: '0.8rem', textTransform: 'uppercase', width: '160px', textAlign: 'center' }}
                  />
                  <button 
                    onClick={handleEnviarParaNuvem}
                    className="btn-start"
                    style={{ padding: '6px 12px', fontSize: '0.8rem', background: 'linear-gradient(90deg, #3b82f6, #60a5fa)', margin: 0, width: 'auto', boxShadow: 'none', height: '32px', lineHeight: '18px' }}
                  >
                    Enviar 📤
                  </button>
                  <button 
                    onClick={handleBaixarDaNuvem}
                    className="btn-menu btn-play"
                    style={{ padding: '6px 12px', fontSize: '0.8rem', background: 'linear-gradient(90deg, #10b981, #34d399)', margin: 0, width: 'auto', boxShadow: 'none', height: '32px', lineHeight: '18px' }}
                  >
                    Baixar 📥
                  </button>
                </div>

                {/* Lado Direito: Backup JSON */}
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flex: '1 1 250px', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                  <button 
                    onClick={exportarMemoriaBackup}
                    className="btn-menu btn-play"
                    style={{ padding: '6px 12px', fontSize: '0.8rem', background: 'linear-gradient(90deg, #374151, #4b5563)', margin: 0, width: 'auto', height: '32px', lineHeight: '18px', boxShadow: 'none', borderColor: 'rgba(255,255,255,0.1)' }}
                  >
                    Exportar JSON 📤
                  </button>
                  <div style={{ position: 'relative' }}>
                    <input 
                      type="file" 
                      accept=".json" 
                      onChange={importarMemoriaBackup}
                      style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer' }}
                    />
                    <button 
                      className="btn-start" 
                      style={{ padding: '6px 12px', fontSize: '0.8rem', background: 'linear-gradient(90deg, #8b5cf6, #3b82f6)', margin: 0, width: 'auto', height: '32px', lineHeight: '18px', boxShadow: 'none' }}
                    >
                      Importar JSON 📥
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* BLOCO 2: GERENCIAR IMAGENS DO JOGO DA MEMÓRIA */}
            <div className="card" style={{ margin: 0 }}>
              <div className="sec" style={{ marginBottom: '14px' }}>🧠 Gerenciar Imagens do Jogo da Memória</div>
              
              {/* Input de nova imagem */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '20px' }}>
                <label style={{ fontWeight: 'bold' }}>Adicionar Imagem por URL</label>
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
                  <input 
                    placeholder="Cole a URL da imagem aqui... (Ex: https://images.unsplash.com/...)" 
                    value={cadMemoImagemUrl}
                    onChange={(e) => setCadMemoImagemUrl(e.target.value)}
                    style={{ flex: 2, minWidth: '240px' }}
                  />
                  <select
                    value={cadMemoImagemMateria}
                    onChange={(e) => {
                      if (e.target.value === 'NEW_CATEGORY') {
                        setMostrarCriarCategoriaMemo(true);
                        setNovaCategoriaMemoInput('');
                      } else {
                        setCadMemoImagemMateria(e.target.value);
                        setMostrarCriarCategoriaMemo(false);
                      }
                    }}
                    style={{ flex: 1, minWidth: '150px', background: '#1a1f38', color: '#fff', border: '1px solid rgba(139, 92, 246, 0.3)', borderRadius: '8px', padding: '10px 14px', fontSize: '0.85rem', cursor: 'pointer', boxSizing: 'border-box', height: '42px' }}
                  >
                    <option value="">🌍 Geral / Todas</option>
                    {materias.map((m, i) => (
                      <option key={i} value={m}>{m}</option>
                    ))}
                    <option value="NEW_CATEGORY">➕ Criar nova categoria...</option>
                  </select>
                  <button 
                    className="btn-ac btn-add" 
                    style={{ background: 'linear-gradient(90deg, #f59e0b, #d97706)', boxShadow: '0 4px 12px rgba(245, 158, 11, 0.3)', padding: '10px 24px', margin: 0, height: '42px' }}
                    onClick={adicionarMemoImagemManual}
                  >
                    Adicionar
                  </button>
                </div>

                {mostrarCriarCategoriaMemo && (
                  <div style={{ display: 'flex', gap: '8px', marginTop: '10px', width: '100%', background: 'rgba(16, 185, 129, 0.05)', border: '1px solid rgba(16, 185, 129, 0.2)', padding: '12px', borderRadius: '8px', alignItems: 'center' }}>
                    <input 
                      placeholder="Nome da nova categoria..." 
                      value={novaCategoriaMemoInput} 
                      onChange={(e) => setNovaCategoriaMemoInput(e.target.value)} 
                      style={{ flex: 1, background: '#0b0f19', color: '#fff', border: '1px solid rgba(16, 185, 129, 0.4)', borderRadius: '6px', padding: '8px 12px' }} 
                    />
                    <button 
                      className="btn-ac btn-add" 
                      style={{ padding: '8px 16px', background: 'linear-gradient(90deg, #10b981, #059669)', margin: 0, height: '38px', boxShadow: 'none' }}
                      onClick={salvarNovaCategoriaMemo}
                    >
                      Salvar
                    </button>
                    <button 
                      className="btn-del" 
                      style={{ padding: '8px 16px', margin: 0, height: '38px', background: '#374151' }}
                      onClick={() => { setMostrarCriarCategoriaMemo(false); setNovaCategoriaMemoInput(''); setCadMemoImagemMateria(''); }}
                    >
                      Cancelar
                    </button>
                  </div>
                )}
              </div>

              {/* Linha Divisória interna sutil */}
              <div style={{ height: '1px', background: 'rgba(255, 255, 255, 0.08)', margin: '20px 0' }}></div>

              {/* Cabeçalho Imagens no Banco integrado filtrado por Categoria */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
                <div style={{ fontSize: '1rem', fontWeight: 'bold', color: '#a78bfa' }}>
                  🖼️ Imagens Cadastradas ({cadMemoImagemMateria ? `Filtradas por: ${cadMemoImagemMateria}` : 'Geral'}) 
                  <span style={{ fontSize: '0.8rem', color: '#9ca3af', marginLeft: '6px', fontWeight: 'normal' }}>
                    (Total no banco: {memoImagensPool.length})
                  </span>
                </div>
                <button 
                  className="btn-del" 
                  style={{ background: 'linear-gradient(90deg, #374151, #4b5563)', color: '#cbd5e1', boxShadow: 'none', padding: '6px 14px', fontSize: '0.78rem' }}
                  onClick={restaurarMemoImagensPadrao}
                >
                  🔄 Restaurar Padrão de Fábrica
                </button>
              </div>

              {/* Grid de Imagens Filtradas por Categoria */}
              {(() => {
                const imagensFiltradas = memoImagensPool.filter(item => {
                  const itemMat = typeof item === 'object' ? item.mat : '';
                  return itemMat === cadMemoImagemMateria;
                });

                if (imagensFiltradas.length === 0) {
                  return (
                    <div style={{ background: 'rgba(255,255,255,0.01)', border: '1px dashed rgba(255,255,255,0.08)', borderRadius: '8px', padding: '24px', textAlign: 'center', color: '#9ca3af', fontSize: '0.82rem', fontStyle: 'italic' }}>
                      Nenhuma imagem cadastrada na categoria "{cadMemoImagemMateria ? cadMemoImagemMateria : 'Geral'}". Cole links acima para adicionar imagens.
                    </div>
                  );
                }

                return (
                  <div style={{ 
                    display: 'grid', 
                    gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', 
                    gap: '12px', 
                    maxHeight: '400px', 
                    overflowY: 'auto', 
                    paddingRight: '6px' 
                  }}>
                    {imagensFiltradas.map((item, idx) => {
                      const url = typeof item === 'object' ? item.url : item;
                      const mat = typeof item === 'object' ? item.mat : '';
                      // Encontrar o index global no pool para as funções deletar e duplicar funcionarem corretamente
                      const globalIdx = memoImagensPool.findIndex(x => x === item);

                      return (
                        <div 
                          key={idx} 
                          style={{ 
                            background: 'rgba(15, 23, 42, 0.6)', 
                            border: '1px solid rgba(255, 255, 255, 0.08)', 
                            borderRadius: '10px', 
                            padding: '6px', 
                            position: 'relative', 
                            display: 'flex', 
                            flexDirection: 'column', 
                            alignItems: 'center', 
                            boxSizing: 'border-box' 
                          }}
                        >
                          <div style={{ 
                            width: '100%', 
                            aspectRatio: '1/1', 
                            borderRadius: '6px', 
                            overflow: 'hidden', 
                            background: '#020108',
                            position: 'relative'
                          }}>
                            <img 
                              src={url} 
                              alt={`Preview ${idx + 1}`} 
                              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                              onError={(e) => {
                                e.currentTarget.src = "https://images.unsplash.com/photo-1594322436404-5a0526db4d13?q=80&w=250&auto=format&fit=crop"; // fallback de erro
                              }}
                            />
                            <span style={{ 
                              position: 'absolute', 
                              top: '4px', 
                              left: '4px', 
                              background: 'rgba(15, 23, 42, 0.85)', 
                              color: '#f59e0b', 
                              fontSize: '0.62rem', 
                              fontWeight: 'bold', 
                              padding: '2px 6px', 
                              borderRadius: '4px',
                              border: '1px solid rgba(245, 158, 11, 0.2)'
                            }}>
                              {idx + 1}
                            </span>
                          </div>
                          
                          {/* Indicador de Categoria */}
                          <div style={{
                            marginTop: '5px',
                            fontSize: '0.65rem',
                            fontWeight: 'bold',
                            color: mat ? '#c084fc' : '#9ca3af',
                            background: mat ? 'rgba(139, 92, 246, 0.12)' : 'rgba(255, 255, 255, 0.03)',
                            border: mat ? '1px solid rgba(139, 92, 246, 0.25)' : '1px solid rgba(255, 255, 255, 0.06)',
                            borderRadius: '4px',
                            padding: '1px 5px',
                            textAlign: 'center',
                            width: '100%',
                            boxSizing: 'border-box',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis'
                          }} title={mat ? `Matéria: ${mat}` : 'Geral (Disponível em todas as matérias)'}>
                            {mat ? `📚 ${mat}` : '🌍 Geral'}
                          </div>

                          {/* Seletor compacto para editar categoria */}
                          <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '3px', marginTop: '6px', textAlign: 'left' }}>
                            <span style={{ fontSize: '0.62rem', color: '#9ca3af', fontWeight: 'bold' }}>Mover para:</span>
                            <select
                              value={mat}
                              onChange={(e) => editarMemoImagemMateria(globalIdx, e.target.value)}
                              style={{ width: '100%', background: '#111827', color: '#fff', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '4px', padding: '2px 4px', fontSize: '0.7rem', cursor: 'pointer', height: '22px' }}
                            >
                              <option value="">🌍 Geral / Todas</option>
                              {materias.map((m, i) => (
                                <option key={i} value={m}>{m}</option>
                              ))}
                            </select>
                          </div>

                          {/* Botões Duplicar e Remover */}
                          <div style={{ display: 'flex', gap: '6px', width: '100%', marginTop: '6px' }}>
                            <button 
                              className="btn-menu btn-play" 
                              style={{ 
                                flex: 1, 
                                padding: '4px', 
                                fontSize: '0.7rem', 
                                borderRadius: '6px',
                                justifyContent: 'center',
                                display: 'flex',
                                background: 'linear-gradient(90deg, #3b82f6, #60a5fa)',
                                margin: 0,
                                height: '24px',
                                lineHeight: '16px',
                                boxShadow: 'none'
                              }} 
                              onClick={() => duplicarMemoImagem(globalIdx)}
                            >
                              Duplicar
                            </button>
                            <button 
                              className="btn-del" 
                              style={{ 
                                flex: 1, 
                                padding: '4px', 
                                fontSize: '0.7rem', 
                                borderRadius: '6px',
                                justifyContent: 'center',
                                display: 'flex',
                                margin: 0,
                                height: '24px',
                                lineHeight: '16px'
                              }} 
                              onClick={() => deletarMemoImagem(globalIdx)}
                            >
                              Remover ✕
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </div>

          </div>
        )}
      </div>

      {/* 5. TELA SELEÇÃO DE MATÉRIA */}
      <div id="tela-selecao" className={`tela ${tela === 'selecao' ? 'ativa' : ''}`}>
        <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center', marginBottom: '14px' }}>
          <button className="btn-volta" onClick={() => irParaTela('menu')} style={{ margin: 0 }}>← Voltar</button>
          <button className="btn-menu btn-outline" style={{ fontSize: '0.85rem', padding: '8px 14px', display: 'flex', alignItems: 'center', gap: '6px', margin: 0, width: 'auto' }} onClick={() => { setCadGerenciadorAba('duelo'); setCadTab('manual'); setOrigemConfig('selecao'); irParaTela('cadastro'); }}>
            ⚙️ Gerenciar Perguntas & IA
          </button>
        </div>
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
        <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center', marginBottom: '14px' }}>
          <button className="btn-volta" onClick={() => irParaTela('selecao')} style={{ margin: 0 }}>← Voltar</button>
          <button className="btn-menu btn-outline" style={{ fontSize: '0.85rem', padding: '8px 14px', display: 'flex', alignItems: 'center', gap: '6px', margin: 0, width: 'auto' }} onClick={() => { setFeedbackControles(null); setDetectMode(null); setOrigemConfig('nomes'); irParaTela('controles'); }}>
            🎮 Configurar Gamepads
          </button>
        </div>
        
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

                {/* PAINEL DE FEEDBACK DE FIM DE RODADA / TEMPO ESGOTADO */}
                {rodDescanso && (
                  <div className="card" style={{ 
                    background: 'rgba(22, 33, 62, 0.75)', 
                    border: '2px solid rgba(139, 92, 246, 0.4)', 
                    borderRadius: '16px', 
                    padding: '20px', 
                    textAlign: 'center', 
                    marginBottom: '16px',
                    animation: 'fadeIn 0.4s ease-out',
                    boxShadow: '0 8px 32px rgba(124, 58, 237, 0.25)'
                  }}>
                    {((fila[rodAtual - 1].tipo === 'veloc' ? velocBateu === null : (respJ[0] === null && respJ[1] === null))) ? (
                      <div>
                        <h3 style={{ fontSize: '1.6rem', color: '#f87171', margin: '0 0 10px 0', fontWeight: '900' }}>
                          ⏰ TEMPO ESGOTADO!
                        </h3>
                        <p style={{ color: '#c4b5fd', fontSize: '1.05rem', margin: '0 0 16px 0' }}>
                          Ninguém respondeu a tempo e ninguém pontuou nesta rodada.
                        </p>
                      </div>
                    ) : (
                      <div>
                        <h3 style={{ fontSize: '1.6rem', color: '#34d399', margin: '0 0 10px 0', fontWeight: '900' }}>
                          🏁 RODADA CONCLUÍDA!
                        </h3>
                        <p style={{ color: '#c4b5fd', fontSize: '1.05rem', margin: '0 0 16px 0' }}>
                          Veja abaixo o desempenho e a resposta certa.
                        </p>
                      </div>
                    )}

                    {/* Resposta Correta destacada */}
                    <div style={{ 
                      background: 'rgba(16, 185, 129, 0.1)', 
                      border: '2px solid #10b981', 
                      borderRadius: '12px', 
                      padding: '14px 28px', 
                      display: 'inline-block',
                      boxShadow: '0 0 20px rgba(16, 185, 129, 0.2)',
                      animation: 'pulse 1.5s infinite alternate'
                    }}>
                      <span style={{ fontSize: '0.85rem', color: '#a7f3d0', display: 'block', marginBottom: '4px', textTransform: 'uppercase', fontWeight: 'bold', letterSpacing: '0.5px' }}>
                        🟢 Resposta Correta:
                      </span>
                      <strong style={{ fontSize: '1.6rem', color: '#10b981', fontFamily: 'Outfit, sans-serif' }}>
                        {fila[rodAtual - 1].tipo === 'mc' ? (
                          <>
                            <span style={{ marginRight: '8px' }}>{KAHOOT[fila[rodAtual - 1].resp]?.label || ''}</span>
                            <MathText text={fila[rodAtual - 1].alts[fila[rodAtual - 1].resp] || fila[rodAtual - 1].resp || ''} />
                          </>
                        ) : fila[rodAtual - 1].tipo === 'vf' ? (
                          fila[rodAtual - 1].resp === 'v' ? '🔵 Verdadeiro' : '🔴 Falso'
                        ) : (
                          <MathText text={fila[rodAtual - 1].resp || ''} />
                        )}
                      </strong>
                    </div>
                  </div>
                )}

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
                        !rodDescanso ? (
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
                          <div className="msg-ok" style={{ width: 'fit-content', margin: '0 auto', background: 'rgba(239, 68, 68, 0.15)', color: '#fca5a5', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
                            Tempo limite esgotado antes de qualquer batida.
                          </div>
                        )
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
                  <div className={`sj-card ${efeitosRodada.bloqueado === 0 ? 'bloqueado' : respJ[0] !== null ? 'respondeu' : rodDescanso ? 'bloqueado' : 'aguardando'}`}>
                    🔵 {nomeJ1}: {efeitosRodada.bloqueado === 0 ? '🚫 BLOQUEADO!' : respJ[0] !== null ? (rodDescanso ? `Escolheu ${fila[rodAtual - 1].tipo === 'mc' ? (KAHOOT[respJ[0]]?.name || respJ[0]) : respJ[0] === 'v' ? 'Verdadeiro' : 'Falso'}` : 'Pronto!') : (rodDescanso ? '❌ Não respondeu!' : 'Aguardando...')}
                  </div>
                  <div className={`sj-card ${efeitosRodada.bloqueado === 1 ? 'bloqueado' : respJ[1] !== null ? 'respondeu' : rodDescanso ? 'bloqueado' : 'aguardando'}`}>
                    🩷 {nomeJ2}: {efeitosRodada.bloqueado === 1 ? '🚫 BLOQUEADO!' : respJ[1] !== null ? (rodDescanso ? `Escolheu ${fila[rodAtual - 1].tipo === 'mc' ? (KAHOOT[respJ[1]]?.name || respJ[1]) : respJ[1] === 'v' ? 'Verdadeiro' : 'Falso'}` : 'Pronto!') : (rodDescanso ? '❌ Não respondeu!' : 'Aguardando...')}
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

      {/* 9. TELA CONFIGURAÇÃO DE NOMES TRÊS PISTAS */}
      <div id="tela-pistas-nomes" className={`tela ${tela === 'pistas-nomes' ? 'ativa' : ''}`} style={{ alignItems: 'center', textAlign: 'center' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center', marginBottom: '14px' }}>
          <button className="btn-volta" onClick={() => irParaTela('menu')} style={{ margin: 0 }}>← Voltar ao Menu</button>
          <button className="btn-menu btn-outline" style={{ fontSize: '0.85rem', padding: '8px 14px', display: 'flex', alignItems: 'center', gap: '6px', margin: 0, width: 'auto' }} onClick={() => { setCadGerenciadorAba('pistas'); setCadTab('manual'); setOrigemConfig('pistas-nomes'); irParaTela('cadastro'); }}>
            ⚙️ Gerenciar Cartas & IA
          </button>
        </div>
        <div style={{ fontSize: '4rem', filter: 'drop-shadow(0 0 25px rgba(236, 72, 153, 0.45))', margin: '20px 0', width: '100%' }}>🗺️</div>
        <h2 style={{ fontSize: '2.2rem', fontWeight: 900, textAlign: 'center', width: '100%' }}>Configurar Equipes (Três Pistas)</h2>
        <p style={{ color: '#c4b5fd', fontSize: '1.05rem', textAlign: 'center', width: '100%', marginTop: '4px' }}>Informe o nome das duas equipes rivais que disputarão o tabuleiro</p>

        <div className="dupla" style={{ margin: '30px auto', width: '100%', maxWidth: '600px', display: 'flex', gap: '16px', justifyContent: 'center' }}>
          <div className="jcard j1" style={{ flex: 1 }}>
            <h3>🔵 Equipe 1</h3>
            <input 
              value={nomeJ1}
              onChange={(e) => setNomeJ1(e.target.value)}
              placeholder="Ex: Equipe Azul"
            />
          </div>
          <div className="jcard j2" style={{ flex: 1 }}>
            <h3>🩷 Equipe 2</h3>
            <input 
              value={nomeJ2}
              onChange={(e) => setNomeJ2(e.target.value)}
              placeholder="Ex: Equipe Rosa"
            />
          </div>
        </div>

        {/* Painel de Configuração do Número de Rodadas */}
        <div className="card" style={{ width: '100%', maxWidth: '500px', margin: '0 auto 24px', padding: '16px', background: 'rgba(22, 33, 62, 0.45)', textAlign: 'left', border: '1px solid rgba(236, 72, 153, 0.15)' }}>
          <div style={{ fontSize: '1rem', fontWeight: 800, color: '#f472b6', marginBottom: '10px', borderLeft: '3px solid #ec4899', paddingLeft: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            ⚙️ Duração da Partida (Número de Rodadas)
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <span style={{ fontSize: '0.88rem', color: '#c4b5fd', fontWeight: 'bold' }}>
              Quantidade de cartas/rodadas: <span style={{ color: '#fb923c', fontSize: '1.05rem' }}>{pistasQtdRodadas} rodada(s)</span>
            </span>
            <input 
              type="range" 
              min="1" 
              max={Math.max(1, cartasPistas.length)} 
              step="1"
              value={pistasQtdRodadas}
              onChange={(e) => setPistasQtdRodadas(Number(e.target.value))}
              style={{ accentColor: '#ec4899', height: '6px', background: 'rgba(255, 255, 255, 0.1)', border: 'none', cursor: 'pointer' }}
            />
            <span style={{ fontSize: '0.75rem', color: '#9ca3af', fontStyle: 'italic' }}>
              * Selecione quantas cartas de pistas aleatórias serão sorteadas da pool total do banco de dados (máximo de {cartasPistas.length} cadastradas).
            </span>
          </div>
        </div>

        {/* Escolha de quem começa a partida */}
        <div className="card" style={{ width: '100%', maxWidth: '500px', margin: '0 auto 24px', padding: '16px', background: 'rgba(22, 33, 62, 0.45)', textAlign: 'left', border: '1px solid rgba(236, 72, 153, 0.15)' }}>
          <div style={{ fontSize: '1rem', fontWeight: 800, color: '#f472b6', marginBottom: '10px', borderLeft: '3px solid #ec4899', paddingLeft: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            🚩 Vez Inicial (Quem Começa a Jogar?)
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button 
              onClick={() => setPistasEquipeIniciar(0)}
              style={{
                flex: 1,
                padding: '10px',
                borderRadius: '8px',
                border: '1.5px solid #3b82f6',
                background: pistasEquipeIniciar === 0 ? 'rgba(59, 130, 246, 0.25)' : 'transparent',
                color: pistasEquipeIniciar === 0 ? '#60a5fa' : '#9ca3af',
                fontWeight: 'bold',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
              🔵 {nomeJ1 || 'Equipe 1'}
            </button>
            <button 
              onClick={() => setPistasEquipeIniciar(1)}
              style={{
                flex: 1,
                padding: '10px',
                borderRadius: '8px',
                border: '1.5px solid #ec4899',
                background: pistasEquipeIniciar === 1 ? 'rgba(236, 72, 246, 0.25)' : 'transparent',
                color: pistasEquipeIniciar === 1 ? '#f472b6' : '#9ca3af',
                fontWeight: 'bold',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
              🩷 {nomeJ2 || 'Equipe 2'}
            </button>
          </div>
        </div>

        <button className="btn-start" style={{ width: '100%', maxWidth: '300px', padding: '14px 28px', background: 'linear-gradient(90deg, #ec4899, #7c3aed)', boxShadow: '0 8px 30px rgba(236, 72, 153, 0.45)', margin: '10px auto' }} onClick={iniciarPartidaPistas}>
          Iniciar Partida 🚀
        </button>
      </div>

      {/* 10. ARENA DO JOGO DAS TRÊS PISTAS */}
      <div id="tela-pistas-jogo" className={`tela ${tela === 'pistas-jogo' ? 'ativa' : ''}`} style={{ alignItems: 'center' }}>
        {/* Popups e Efeitos de Tabuleiro das Três Pistas */}
        {pistasEfeitoAtivo && (
          <div 
            className="efeito-popup"
            style={{ 
              position: 'fixed', 
              top: '50%', 
              left: '50%', 
              transform: 'translate(-50%, -50%)', 
              zIndex: 9999,
              background: pistasEfeitoAtivo.tipo === 'bonus' ? 'rgba(16, 185, 129, 0.95)' : 'rgba(220, 38, 38, 0.95)',
              border: '3px solid #fff',
              borderRadius: '20px',
              padding: '24px 40px',
              boxShadow: '0 0 50px rgba(255,255,255,0.4)',
              textAlign: 'center',
              color: '#ffffff',
              animation: 'bounceIn 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards',
              pointerEvents: 'none'
            }}
          >
            <div style={{ fontSize: '3rem', marginBottom: '8px' }}>
              {pistasEfeitoAtivo.tipo === 'bonus' ? '🔥' : '💥'}
            </div>
            <h2 style={{ fontSize: '1.6rem', fontWeight: 900, fontFamily: 'Outfit' }}>
              {pistasEfeitoAtivo.desc}
            </h2>
          </div>
        )}

        <div className="jogo-inner" style={{ maxWidth: '950px' }}>
          {/* Cabeçalho com Placar e Posições */}
          <div className="placar-bar" style={{ width: '100%', marginBottom: '16px' }}>
            <div className="pl-bloco pl-j1">
              <div className="pl-nome">🔵 {nomeJ1}</div>
              <div className="pl-pts">Casa {pistasPontuacao[0]} / 30</div>
            </div>
            <div className="rod-info">
              Três Pistas 🗺️
            </div>
            <div className="pl-bloco pl-j2">
              <div className="pl-nome">🩷 {nomeJ2}</div>
              <div className="pl-pts">Casa {pistasPontuacao[1]} / 30</div>
            </div>
          </div>

          {/* Wrapper Layout Lado a Lado (PC) / Empilhado (Celular) */}
          <div className="pistas-layout">
            
            {/* Coluna do Tabuleiro */}
            <div id="pistas-tabuleiro-container" className="pistas-col-tabuleiro">
              <div style={{ fontSize: '0.9rem', color: '#a78bfa', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '12px', textAlign: 'center' }}>
                🗺️ Tabuleiro (1 a 30)
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(60px, 1fr))', gap: '6px', width: '100%' }}>
                {Array.from({ length: 30 }, (_, idx) => {
                  const casa = idx + 1;
                  const temJ1 = pistasPontuacao[0] === casa;
                  const temJ2 = pistasPontuacao[1] === casa;
                  return (
                    <div 
                      key={casa} 
                      className="tab-casa"
                      style={{ 
                        height: '60px', 
                        borderRadius: '8px', 
                        display: 'flex', 
                        flexDirection: 'column', 
                        alignItems: 'center', 
                        justifyContent: 'center', 
                        position: 'relative',
                        background: casa === 30 ? 'linear-gradient(135deg, #f59e0b, #d97706)' : casa % 2 === 0 ? 'rgba(30, 41, 59, 0.6)' : 'rgba(15, 23, 42, 0.6)', 
                        border: casa === 30 ? '2px solid #fbbf24' : '1px solid rgba(255,255,255,0.08)',
                        color: casa === 30 ? '#000' : '#e5e7eb',
                        fontWeight: 'bold',
                        fontSize: '0.85rem'
                      }}
                    >
                      {casa === 30 ? '🏁 30' : casa}
                      <div style={{ display: 'flex', gap: '4px', position: 'absolute', bottom: '4px' }}>
                        {temJ1 && <span className="peon" style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#3b82f6', border: '1.5px solid #fff', boxShadow: '0 0 8px #3b82f6' }} title={nomeJ1}></span>}
                        {temJ2 && <span className="peon" style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#ec4899', border: '1.5px solid #fff', boxShadow: '0 0 8px #ec4899' }} title={nomeJ2}></span>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Coluna do Conteúdo do Jogo (Pistas e Moderação) */}
            <div className="pistas-col-conteudo">
              {(() => {
                const carta = pistasFila[cartaPistaAtual - 1] || cartasPistas[0];
                if (!carta) return (
                  <div className="card text-center" style={{ width: '100%' }}>
                    <p>Nenhuma carta de pistas carregada. Por favor reinicie o jogo.</p>
                    <button className="btn-prox" onClick={() => irParaTela('menu')}>Voltar ao Menu</button>
                  </div>
                );
                
                return (
                  <div className="card" style={{ width: '100%', border: '1px solid rgba(255,255,255,0.08)', boxShadow: '0 12px 40px rgba(0,0,0,0.4)', background: 'rgba(22, 33, 62, 0.55)', padding: '24px', margin: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '12px', marginBottom: '20px' }}>
                      <span style={{ fontSize: '1.15rem', fontWeight: 800, color: '#fcd34d', letterSpacing: '0.5px' }}>
                        🔍 CATEGORIA: <span style={{ textTransform: 'uppercase', color: '#fff' }}>{carta.cat}</span>
                      </span>
                      <span className="badge" style={{ background: 'rgba(139, 92, 246, 0.15)', color: '#a78bfa' }}>
                        Carta {cartaPistaAtual} de {pistasFila.length || cartasPistas.length}
                      </span>
                    </div>
                    
                    <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                      <div style={{ fontSize: '0.85rem', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '1.5px', fontWeight: 'bold' }}>Equipe da Vez:</div>
                      <div style={{ fontSize: '1.6rem', fontWeight: 900, color: pistasEquipeVez === 0 ? '#60a5fa' : '#f472b6', textShadow: '0 2px 10px rgba(0,0,0,0.3)', marginTop: '4px' }}>
                        {pistasEquipeVez === 0 ? `🔵 ${nomeJ1}` : `🩷 ${nomeJ2}`}
                      </div>
                    </div>

                    {/* Grid das 5 Pistas */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' }}>
                      {carta.pistas.map((p, idx) => {
                        const revelada = pistasReveladas[idx];
                        const isPistaBonus = carta.pistaBonusIdx === idx;
                        
                        return (
                          <div 
                            key={idx}
                            style={{ 
                              background: revelada ? 'rgba(255, 255, 255, 0.03)' : 'rgba(0, 0, 0, 0.25)', 
                              border: revelada ? '1px solid rgba(167, 139, 250, 0.3)' : '1px solid rgba(255, 255, 255, 0.05)',
                              borderRadius: '12px',
                              padding: '14px 18px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              gap: '16px',
                              transition: 'all 0.25s ease'
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, minWidth: 0 }}>
                              <span style={{ 
                                width: '32px', 
                                height: '32px', 
                                borderRadius: '50%', 
                                background: revelada ? '#7c3aed' : 'rgba(255,255,255,0.06)', 
                                color: '#fff', 
                                display: 'flex', 
                                alignItems: 'center', 
                                justifyContent: 'center',
                                fontWeight: 'bold',
                                fontSize: '0.85rem',
                                flexShrink: 0
                              }}>
                                {idx + 1}
                              </span>
                              
                              {revelada ? (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', flex: 1, minWidth: 0 }}>
                                  {isPistaBonus ? (
                                    <span style={{ fontSize: '1rem', color: '#fbbf24', fontWeight: 'bold' }}>
                                      🎁 BÔNUS SECRETO REVELADO! (Efeito de Tabuleiro Ativado)
                                    </span>
                                  ) : (
                                    <span style={{ fontSize: '1rem', color: '#ffffff', lineHeight: '1.4' }}>
                                      <MathText text={p.txt} />
                                    </span>
                                  )}
                                  {/* Caso a pista normal tenha efeito customizado */}
                                  {!isPistaBonus && p.efeito && (
                                    <span style={{ fontSize: '0.78rem', fontWeight: 800, color: p.efeito.includes('oponente') ? '#ef4444' : p.efeito.includes('recue') ? '#fca5a5' : '#4ade80' }}>
                                      {p.efeito === 'avance_1' && '✨ Efeito: Avance 1 casa!'}
                                      {p.efeito === 'avance_2' && '🔥 Super Bônus: Avance 2 casas!'}
                                      {p.efeito === 'recue_1' && '⚠️ Efeito: Recue 1 casa!'}
                                      {p.efeito === 'recue_2' && '💥 Efeito: Recue 2 casas!'}
                                      {p.efeito === 'oponente_avance_1' && '🎁 Efeito: Oponente avance 1 casa!'}
                                      {p.efeito === 'oponente_recue_1' && '🎯 Efeito: Oponente recue 1 casa!'}
                                      {p.efeito === 'oponente_recue_2' && '⚡ Efeito: Oponente recue 2 casas!'}
                                    </span>
                                  )}
                                </div>
                              ) : (
                                <span style={{ fontSize: '0.95rem', color: '#6b7280', fontStyle: 'italic' }}>
                                  🔍 Pista de Dica Oculta...
                                </span>
                              )}
                            </div>
                            
                            {!revelada && (
                              <button 
                                className="btn-ac btn-add" 
                                style={{ padding: '8px 16px', fontSize: '0.82rem', borderRadius: '8px', flexShrink: 0, background: '#4f46e5' }}
                                onClick={() => revelarPista(idx)}
                              >
                                👁️ Revelar Pista
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {/* Ações de Moderação */}
                    <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '20px', display: 'flex', flexDirection: 'column', gap: '14px', alignItems: 'center', width: '100%' }}>
                      <div style={{ fontSize: '0.85rem', color: '#9ca3af', fontWeight: 'bold', letterSpacing: '0.5px' }}>PAINEL DO PROFESSOR / MODERADOR:</div>
                      
                      {(() => {
                        const temBonus = carta.pistaBonusIdx !== null && carta.pistaBonusIdx !== undefined;
                        const totalPistasNormais = temBonus ? 4 : 5;
                        const totalPistasNormaisReveladas = pistasReveladas.filter((rev, idx) => {
                          if (!rev) return false;
                          if (temBonus && idx === carta.pistaBonusIdx) return false;
                          return true;
                        }).length;
                        const casasAtuais = Math.max(1, totalPistasNormais - totalPistasNormaisReveladas);
                        
                        if (pistasFluxoPalpite === null) {
                          return (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', width: '100%', alignItems: 'center' }}>
                              <div style={{ fontSize: '0.9rem', color: '#fb923c', fontWeight: 'bold', background: 'rgba(245,158,11,0.08)', padding: '6px 16px', borderRadius: '20px', border: '1px solid rgba(245,158,11,0.2)' }}>
                                🎯 O palpite correto vale atualmente: <strong>{casasAtuais} {casasAtuais === 1 ? 'casa' : 'casas'}</strong>
                              </div>
                              
                              <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap', justifyContent: 'center', width: '100%' }}>
                                <button 
                                  className="btn-start" 
                                  style={{ 
                                    flex: 1, 
                                    padding: '14px 28px', 
                                    fontSize: '1rem', 
                                    background: 'linear-gradient(90deg, #10b981, #059669)', 
                                    boxShadow: '0 4px 15px rgba(16, 185, 129, 0.3)'
                                  }}
                                  onClick={() => {
                                    if (pistasReveladas.filter(Boolean).length === 0) {
                                      alert('Revele pelo menos uma pista antes de palpitar!');
                                      return;
                                    }
                                    setPistasFluxoPalpite('palpite');
                                    iniciarTimerPalpitePistas();
                                  }}
                                >
                                  🎤 Palpitar / Chutar
                                </button>
                                
                                <button 
                                  className="btn-start" 
                                  style={{ flex: 1, padding: '14px 28px', fontSize: '1rem', background: 'linear-gradient(90deg, #3b82f6, #1d4ed8)', boxShadow: '0 4px 15px rgba(59, 130, 246, 0.3)' }}
                                  onClick={passarVezPistas}
                                >
                                  👉 Passar a Vez
                                </button>
                              </div>
                            </div>
                          );
                        }
                        
                        if (pistasFluxoPalpite === 'palpite') {
                          return (
                            <div className="card" style={{ width: '100%', background: 'rgba(0,0,0,0.3)', border: '1.5px solid #ec4899', boxShadow: '0 0 20px rgba(236,72,153,0.15)', padding: '20px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', margin: 0 }}>
                              <h3 style={{ fontSize: '1.3rem', fontWeight: 900, color: '#f472b6', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                🎤 {pistasEquipeVez === 0 ? nomeJ1 : nomeJ2} Palpite / Chute!
                              </h3>
                              
                              {/* Visualização do Cronômetro do Palpite das Pistas */}
                              <div style={{ margin: '6px 0 10px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', width: '100%' }}>
                                <div style={{ fontSize: '2.4rem', fontWeight: 900, color: pistasTimerSeg <= 5 ? '#ef4444' : '#a78bfa', fontFamily: 'monospace', textShadow: pistasTimerSeg <= 5 ? '0 0 10px rgba(239,68,68,0.5)' : 'none', animation: pistasTimerSeg <= 5 ? 'pulse 0.5s infinite alternate' : 'none' }}>
                                  ⏱️ {pistasTimerSeg}s
                                </div>
                                <div className="timer-bar" style={{ width: '100%', maxWidth: '240px', height: '6px', background: 'rgba(255,255,255,0.1)', borderRadius: '3px', overflow: 'hidden' }}>
                                  <div style={{ width: `${(pistasTimerSeg / 15) * 100}%`, height: '100%', background: pistasTimerSeg <= 5 ? '#ef4444' : 'linear-gradient(90deg, #ec4899, #7c3aed)', transition: 'width 1s linear' }}></div>
                                </div>
                              </div>

                              <p style={{ fontSize: '0.9rem', color: '#d1d5db', textAlign: 'center', lineHeight: '1.5' }}>
                                A equipe da vez deve falar o seu palpite oralmente agora.<br/>
                                Após a resposta, o moderador clica no botão abaixo para revelar o gabarito.
                              </p>
                              <div style={{ fontSize: '1rem', color: '#fb923c', fontWeight: 'bold', marginBottom: '6px' }}>
                                Valendo: {casasAtuais} {casasAtuais === 1 ? 'casa' : 'casas'} (se errar, oponente ganha!)
                              </div>
                              
                              <button 
                                className="btn-start"
                                style={{ padding: '12px 32px', fontSize: '0.95rem', background: 'linear-gradient(90deg, #ec4899, #7c3aed)', boxShadow: '0 6px 20px rgba(236,72,153,0.3)' }}
                                onClick={() => { 
                                  playSound('click'); 
                                  if (pistasTimerIntRef.current) clearInterval(pistasTimerIntRef.current);
                                  setPistasTimerSeg(null);
                                  setPistasFluxoPalpite('revelado'); 
                                }}
                              >
                                👁️ Revelar Resposta
                              </button>
                            </div>
                          );
                        }
                        
                        if (pistasFluxoPalpite === 'revelado') {
                          return (
                            <div className="card" style={{ width: '100%', background: 'rgba(0,0,0,0.45)', border: '1.5px solid #10b981', boxShadow: '0 0 20px rgba(16,185,129,0.2)', padding: '20px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '14px', margin: 0 }}>
                              <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#a78bfa', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                GABARITO DA CARTA
                              </h3>
                              <div style={{ fontSize: '2.2rem', fontWeight: 950, color: '#10b981', background: 'rgba(16,185,129,0.08)', padding: '12px 24px', borderRadius: '12px', border: '1px solid rgba(16,185,129,0.25)', textShadow: '0 2px 15px rgba(16,185,129,0.35)', marginBottom: '4px', textTransform: 'uppercase' }}>
                                {carta.resp}
                              </div>
                              
                              <p style={{ fontSize: '0.95rem', color: '#d1d5db', textAlign: 'center', fontWeight: 'bold' }}>
                                A equipe [ {pistasEquipeVez === 0 ? nomeJ1 : nomeJ2} ] respondeu corretamente?
                              </p>
                              
                              <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap', justifyContent: 'center', width: '100%' }}>
                                <button 
                                  className="btn-start"
                                  style={{ flex: 1, padding: '12px 24px', fontSize: '0.95rem', background: 'linear-gradient(90deg, #10b981, #059669)', boxShadow: '0 6px 18px rgba(16,185,129,0.3)' }}
                                  onClick={() => julgarPalpitePistas(true)}
                                >
                                  ✅ Certo (+{casasAtuais} {casasAtuais === 1 ? 'casa' : 'casas'})
                                </button>
                                <button 
                                  className="btn-start"
                                  style={{ flex: 1, padding: '12px 24px', fontSize: '0.95rem', background: 'linear-gradient(90deg, #dc2626, #b91c1c)', boxShadow: '0 6px 18px rgba(220,38,38,0.3)' }}
                                  onClick={() => julgarPalpitePistas(false)}
                                >
                                  ❌ Errado (Oponente ganha)
                                </button>
                              </div>
                              
                              <button 
                                className="btn-resetar"
                                style={{ width: 'auto', padding: '4px 12px', fontSize: '0.78rem', marginTop: '6px' }}
                                onClick={() => { playSound('click'); setPistasFluxoPalpite('palpite'); }}
                              >
                                ↩️ Voltar ao Palpite
                              </button>
                            </div>
                          );
                        }
                        
                        return null;
                      })()}
                      
                      <button 
                        className="btn-resetar" 
                        style={{ width: 'auto', padding: '6px 16px', fontSize: '0.8rem', marginTop: '10px' }}
                        onClick={() => {
                          if (window.confirm('Deseja realmente abandonar a partida atual de Três Pistas e voltar ao menu?')) {
                            irParaTela('menu');
                          }
                        }}
                      >
                        🚪 Abandonar Partida
                      </button>
                    </div>
                  </div>
                );
              })()}
            </div>
            
          </div>
        </div>
      </div>

      {/* 12. TELA DE CONFIGURAÇÃO IMAGEM E AÇÃO */}
      <div id="tela-ia-nomes" className={`tela ${tela === 'ia-nomes' ? 'ativa' : ''}`} style={{ display: tela === 'ia-nomes' ? 'flex' : 'none', flexDirection: 'column', alignItems: 'center', textAlign: 'center', justifyContent: 'center', minHeight: '100vh', padding: '20px', boxSizing: 'border-box' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', maxWidth: '600px', alignItems: 'center', marginBottom: '14px' }}>
          <button className="btn-volta" onClick={() => irParaTela('menu')} style={{ margin: 0 }}>← Voltar ao Menu</button>
          <button className="btn-menu btn-outline" style={{ fontSize: '0.85rem', padding: '8px 14px', display: 'flex', alignItems: 'center', gap: '6px', margin: 0, width: 'auto' }} onClick={() => { setCadGerenciadorAba('imacao'); setCadTab('manual'); setOrigemConfig('ia-nomes'); irParaTela('cadastro'); }}>
            ⚙️ Gerenciar Cartas & IA
          </button>
        </div>
        <div style={{ fontSize: '4.5rem', filter: 'drop-shadow(0 0 25px rgba(16, 185, 129, 0.45))', margin: '14px 0', width: '100%' }}>🎨</div>
        <h2 style={{ fontSize: '2.2rem', fontWeight: 900, textAlign: 'center', width: '100%', fontFamily: 'Outfit' }}>Configurar Equipes (Imagem e Ação)</h2>
        <p style={{ color: '#6ee7b7', fontSize: '1.05rem', textAlign: 'center', width: '100%', marginTop: '4px' }}>Configuração da disputa tática de desenho e mímica</p>

        <div className="dupla" style={{ margin: '24px auto 16px', width: '100%', maxWidth: '600px', display: 'flex', gap: '16px', justifyContent: 'center' }}>
          <div className="jcard j1" style={{ flex: 1, textAlign: 'center' }}>
            <h3 style={{ textAlign: 'center', justifyContent: 'center' }}>🔵 Equipe 1</h3>
            <input value={nomeJ1} onChange={(e) => setNomeJ1(e.target.value)} placeholder="Equipe Azul" style={{ textAlign: 'center' }} />
          </div>
          <div className="jcard j2" style={{ flex: 1, textAlign: 'center' }}>
            <h3 style={{ textAlign: 'center', justifyContent: 'center' }}>🩷 Equipe 2</h3>
            <input value={nomeJ2} onChange={(e) => setNomeJ2(e.target.value)} placeholder="Equipe Rosa" style={{ textAlign: 'center' }} />
          </div>
        </div>

        {/* Seletor de Tempo */}
        <div className="card" style={{ width: '100%', maxWidth: '500px', margin: '14px auto', padding: '16px', background: 'rgba(22, 33, 62, 0.45)', textAlign: 'center' }}>
          <div style={{ fontSize: '1rem', fontWeight: 800, color: '#10b981', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.5px', textAlign: 'center' }}>
            ⏱️ Tempo Limite por Carta
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'center' }}>
            <span style={{ fontSize: '0.85rem', color: '#6ee7b7', fontWeight: 'bold', textAlign: 'center' }}>
              Duração da rodada: <span style={{ color: '#fb923c', fontSize: '1rem' }}>{imAcaoMaxTimer} segundos</span>
            </span>
            <input 
              type="range" 
              min="30" 
              max="120" 
              step="15"
              value={imAcaoMaxTimer}
              onChange={(e) => setImAcaoMaxTimer(Number(e.target.value))}
              style={{ accentColor: '#10b981', height: '6px', background: 'rgba(255, 255, 255, 0.1)', border: 'none', width: '100%', cursor: 'pointer' }}
            />
          </div>
        </div>

        {/* Escolha de quem começa a partida */}
        <div className="card" style={{ width: '100%', maxWidth: '500px', margin: '0 auto 14px', padding: '16px', background: 'rgba(22, 33, 62, 0.45)', textAlign: 'center' }}>
          <div style={{ fontSize: '1rem', fontWeight: 800, color: '#10b981', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.5px', textAlign: 'center' }}>
            🚩 Vez Inicial (Quem Começa a Jogar?)
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button 
              onClick={() => setImAcaoEquipeIniciar(0)}
              style={{
                flex: 1,
                padding: '10px',
                borderRadius: '8px',
                border: '1.5px solid #3b82f6',
                background: imAcaoEquipeIniciar === 0 ? 'rgba(59, 130, 246, 0.25)' : 'transparent',
                color: imAcaoEquipeIniciar === 0 ? '#60a5fa' : '#9ca3af',
                fontWeight: 'bold',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
              🔵 {nomeJ1 || 'Equipe 1'}
            </button>
            <button 
              onClick={() => setImAcaoEquipeIniciar(1)}
              style={{
                flex: 1,
                padding: '10px',
                borderRadius: '8px',
                border: '1.5px solid #ec4899',
                background: imAcaoEquipeIniciar === 1 ? 'rgba(236, 72, 246, 0.25)' : 'transparent',
                color: imAcaoEquipeIniciar === 1 ? '#f472b6' : '#9ca3af',
                fontWeight: 'bold',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
              🩷 {nomeJ2 || 'Equipe 2'}
            </button>
          </div>
        </div>

        {/* Botão de segunda tela */}
        <div style={{ margin: '20px 0 10px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <button 
            className="btn-menu btn-outline" 
            style={{ borderColor: '#10b981', color: '#10b981', background: 'rgba(16, 185, 129, 0.05)', fontSize: '1rem', padding: '12px 30px', alignSelf: 'center' }}
            onClick={() => window.open(window.location.origin + window.location.pathname + '?projetor=true', '_blank', 'width=1200,height=800')}
          >
            📺 Abrir Tela do Projetor (Segunda Tela)
          </button>
          <p style={{ fontSize: '0.78rem', color: '#9ca3af', marginTop: '6px', maxWidth: '400px', textAlign: 'center' }}>
            Dica: Abra esta segunda tela e arraste-a para o projetor/quadro da sala de aula antes de clicar em começar.
          </p>
        </div>

        <button className="btn-start" style={{ background: 'linear-gradient(90deg, #10b981, #3b82f6)', boxShadow: '0 8px 30px rgba(16, 185, 129, 0.45)', padding: '16px 64px', marginTop: '20px', alignSelf: 'center' }} onClick={() => iniciarPartidaImAcao(imAcaoMaxTimer)}>
          Começar Disputa! 🚀
        </button>
      </div>

      <div id="tela-ia-jogo" className={`tela ${tela === 'ia-jogo' ? 'ativa' : ''}`}>
        {imAcaoCartaAtual && (
          <div className="imacao-wrapper">

            {/* ── BARRA DE PLACAR NO TOPO ── */}
            <div className="imacao-placar-top">
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#3b82f6', boxShadow: '0 0 8px #3b82f6' }} />
                <span style={{ fontWeight: 800, color: '#60a5fa', fontFamily: 'Outfit', fontSize: '0.95rem' }}>🔵 {nomeJ1}</span>
                <span style={{ background: 'rgba(59,130,246,0.15)', border: '1px solid rgba(59,130,246,0.3)', color: '#93c5fd', borderRadius: '8px', padding: '2px 10px', fontSize: '0.85rem', fontWeight: 700 }}>
                  Casa {imAcaoPontuacao[0]}
                </span>
              </div>
              <div style={{ textAlign: 'center', flex: 1 }}>
                <span style={{ fontSize: '0.78rem', color: '#a78bfa', textTransform: 'uppercase', fontWeight: 800, letterSpacing: '1px', fontFamily: 'Outfit' }}>
                  Rodada {imAcaoRodada}
                </span>
                <div style={{ fontSize: '0.8rem', background: imAcaoEquipeVez === 0 ? 'rgba(59,130,246,0.15)' : 'rgba(236,72,153,0.15)', color: imAcaoEquipeVez === 0 ? '#60a5fa' : '#f472b6', padding: '2px 10px', borderRadius: '10px', fontWeight: 700, display: 'inline-block', marginTop: '2px' }}>
                  ▶ Vez de: {imAcaoEquipeVez === 0 ? nomeJ1 : nomeJ2}
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ background: 'rgba(236,72,153,0.15)', border: '1px solid rgba(236,72,153,0.3)', color: '#f9a8d4', borderRadius: '8px', padding: '2px 10px', fontSize: '0.85rem', fontWeight: 700 }}>
                  Casa {imAcaoPontuacao[1]}
                </span>
                <span style={{ fontWeight: 800, color: '#f472b6', fontFamily: 'Outfit', fontSize: '0.95rem' }}>🩷 {nomeJ2}</span>
                <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#ec4899', boxShadow: '0 0 8px #ec4899' }} />
              </div>
            </div>

            {/* ── GRID PRINCIPAL 3 COLUNAS ── */}
            <div className="imacao-layout">

              {/* ═══ COLUNA 1: TABULEIRO ═══ */}
              <div className="imacao-col-tabuleiro" id="ia-tabuleiro-container">
                <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#10b981', marginBottom: '10px', borderLeft: '3px solid #10b981', paddingLeft: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  🗺️ Trilha do Tabuleiro
                </div>
                <div className="imacao-grid-casas">
                  {Array.from({ length: 30 }, (_, index) => {
                    const num = index + 1;
                    const catCasa = obterCatCasaImAcao(num);
                    const corCasa = obterCorCasaImAcao(catCasa);
                    const j1Aqui = imAcaoPontuacao[0] === num;
                    const j2Aqui = imAcaoPontuacao[1] === num;
                    return (
                      <div 
                        key={num}
                        id={`casa-ia-${num}`}
                        className="tab-casa"
                        style={{ background: 'rgba(22, 33, 62, 0.55)', border: `2px solid ${corCasa}`, borderRadius: '8px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', alignItems: 'center', padding: '3px', position: 'relative', width: '100%' }}
                      >
                        <span style={{ fontSize: num === 1 || num === 30 ? '0.55rem' : '0.65rem', fontWeight: 'bold', color: num === 1 || num === 30 ? '#10b981' : '#9ca3af', textTransform: 'uppercase', lineHeight: 1, textAlign: 'center' }}>
                          {num === 1 ? '🚪 Saída' : num === 30 ? '🏁 Chegada' : num - 1}
                        </span>
                        {catCasa === 'Todos Jogam' && num !== 30 ? (
                          <span style={{ fontSize: '0.8rem', filter: 'drop-shadow(0 0 5px #a855f7)' }} title="Todos Jogam">👥</span>
                        ) : null}
                        <div style={{ display: 'flex', gap: '2px', position: 'absolute', bottom: '1px', left: '50%', transform: 'translateX(-50%)' }}>
                          {j1Aqui && (<div className="peon-gigante" style={{ '--glow-color': '#3b82f6', background: '#3b82f6', boxShadow: '0 0 8px #3b82f6' }}>AZ</div>)}
                          {j2Aqui && (<div className="peon-gigante" style={{ '--glow-color': '#ec4899', background: '#ec4899', boxShadow: '0 0 8px #ec4899' }}>RS</div>)}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* ═══ COLUNA 2: DADOS + DESENHISTA ═══ */}
              <div className="imacao-col-conteudo">
                {/* Painel de Dados */}
                <div className="card" style={{ padding: '12px', textAlign: 'center', border: '1px solid rgba(167, 139, 250, 0.25)', background: 'rgba(22, 33, 62, 0.55)', display: 'flex', flexDirection: 'column', gap: '8px', margin: 0 }}>
                  <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#a78bfa', borderLeft: '3px solid #7c3aed', paddingLeft: '8px', textTransform: 'uppercase', letterSpacing: '0.5px', textAlign: 'left' }}>
                    🎲 Dados Virtuais
                  </div>
                  {(imAcaoFluxo === 'julgada' || (imAcaoFluxo === 'preparacao' && imAcaoRodada === 1)) && (
                    <div style={{ background: 'rgba(245,158,11,0.12)', border: '2px solid #f59e0b', borderRadius: '10px', padding: '8px', color: '#fbe5a2', fontSize: '0.8rem', fontWeight: 900, textAlign: 'center', boxShadow: '0 0 12px rgba(245,158,11,0.2)', textTransform: 'uppercase', letterSpacing: '0.5px', animation: 'pulse 1.2s infinite alternate' }}>
                      {imAcaoFluxo === 'preparacao' && imAcaoRodada === 1 ? '🎲 Gire os dados para iniciar!' : '🎲 Jogue os dados para a próxima rodada!'}
                    </div>
                  )}
                  <div className="dados-area-flex">
                    <div className="dado-virtual-wrap">
                      <div className={`dado-virtual ${imAcaoDadosRolando ? 'rolando-cat' : ''} dado-cat-${imAcaoDadoCategoria}`}>
                        <span style={{ fontSize: '0.65rem', color: '#9ca3af', textTransform: 'uppercase', fontWeight: 'bold' }}>Categoria</span>
                        <strong style={{ fontSize: '1.6rem', color: '#fff', margin: '1px 0' }}>{imAcaoDadoCategoria}</strong>
                        <span style={{ fontSize: imAcaoDadoCategoria === 4 ? '0.4rem' : '0.55rem', letterSpacing: imAcaoDadoCategoria === 4 ? '-0.3px' : 'normal', color: obterCorCasaImAcao(imAcaoDadoCategoria === 6 ? 'Difícil' : ['Ação', 'Objeto', 'Lugar', 'Pessoa/Animal', 'Difícil'][imAcaoDadoCategoria - 1]), fontWeight: 'bold', textTransform: 'uppercase' }}>
                          {imAcaoDadoCategoria === 6 ? '🌟 Livre' : ['Ação', 'Objeto', 'Lugar', 'Pessoa/Animal', 'Difícil'][imAcaoDadoCategoria - 1]}
                        </span>
                      </div>
                    </div>
                    <div className="dado-virtual-wrap">
                      <div className={`dado-virtual dado-mov ${imAcaoDadosRolando ? 'rolando-mov' : ''}`}>
                        <span style={{ fontSize: '0.65rem', color: '#9ca3af', textTransform: 'uppercase', fontWeight: 'bold' }}>Casas</span>
                        <strong style={{ fontSize: '1.6rem', color: '#3b82f6', margin: '0px' }}>{imAcaoDadoMovimentacao}</strong>
                        <span style={{ fontSize: '0.55rem', color: '#60a5fa', fontWeight: 'bold' }}>AVANÇAR</span>
                      </div>
                    </div>
                    <div className="dado-virtual-wrap" title="Clique para Rolar o Desafio!" onClick={rolarDadoDesafioImAcao} style={{ cursor: imAcaoDadoDesafioRolando ? 'not-allowed' : 'pointer' }}>
                      <div className={`dado-virtual dado-desafio ${imAcaoDadoDesafioRolando ? 'rolando-desafio' : ''}`}>
                        <span style={{ fontSize: '0.65rem', color: '#9ca3af', textTransform: 'uppercase', fontWeight: 'bold' }}>Desafio</span>
                        <strong style={{ fontSize: '1.1rem', color: '#fff', margin: '1px 0', textShadow: '0 0 10px rgba(249,115,22,0.6)' }}>{obterDesafioTexto(imAcaoDadoDesafio).centro}</strong>
                        <span style={{ fontSize: '0.5rem', color: '#f97316', fontWeight: 'bold', textTransform: 'uppercase' }}>{obterDesafioTexto(imAcaoDadoDesafio).desc}</span>
                      </div>
                    </div>
                  </div>
                  <button className="btn-start" style={{ background: 'linear-gradient(90deg, #7c3aed, #4f46e5)', fontSize: '0.85rem', padding: '7px 20px', width: 'fit-content', margin: '2px auto 0' }} onClick={rolarDadosImAcao} disabled={imAcaoDadosRolando}>
                    🎲 Rolar Dados!
                  </button>
                  <div style={{ fontSize: '0.72rem', color: '#f97316', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                    💡 Toque no dado de desafio para rolá-lo opcionalmente!
                  </div>
                </div>

                {/* Painel do Desenhista / Mímico */}
                <div className="card" style={{ padding: '12px', border: '1.5px solid rgba(16, 185, 129, 0.25)', margin: 0, flex: 1 }}>
                  <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#10b981', marginBottom: '10px', borderLeft: '3px solid #10b981', paddingLeft: '8px', textTransform: 'uppercase', letterSpacing: '0.5px', textAlign: 'left' }}>
                    🕵️ Escolha do Desenhista / Mímico
                  </div>
                  <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', marginBottom: '12px' }}>
                    <button className="btn-poder" style={{ flex: 1, padding: '8px', background: imAcaoModoRepresentacao === 'Mímica' ? 'rgba(124,58,237,0.2)' : 'rgba(0,0,0,0.15)', borderColor: imAcaoModoRepresentacao === 'Mímica' ? '#7c3aed' : 'rgba(255,255,255,0.08)', color: imAcaoModoRepresentacao === 'Mímica' ? '#c4b5fd' : '#9ca3af', fontSize: '0.8rem' }} onClick={() => { if (!imAcaoDadosRolando) selecionarModoRepresentacaoImAcao('Mímica'); }}>🎭 Fazer Mímica</button>
                    <button className="btn-poder" style={{ flex: 1, padding: '8px', background: imAcaoModoRepresentacao === 'Desenho' ? 'rgba(16,185,129,0.15)' : 'rgba(0,0,0,0.15)', borderColor: imAcaoModoRepresentacao === 'Desenho' ? '#10b981' : 'rgba(255,255,255,0.08)', color: imAcaoModoRepresentacao === 'Desenho' ? '#6ee7b7' : '#9ca3af', fontSize: '0.8rem' }} onClick={() => { if (!imAcaoDadosRolando) selecionarModoRepresentacaoImAcao('Desenho'); }}>✏️ Fazer Desenho</button>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '7px', marginBottom: '12px' }}>
                    {imAcaoCartaAtual.opcoes.map((opcao, idx) => {
                      const sorteada = (imAcaoDadoCategoria === (idx + 1)) || (imAcaoDadoCategoria === 6 && imAcaoOpcaoSelecionada === idx);
                      const selecionada = imAcaoOpcaoSelecionada === idx;
                      const corCat = obterCorCasaImAcao(opcao.cat);
                      return (
                        <div key={opcao.num} style={{ background: selecionada ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.15)', border: selecionada ? `2px solid ${corCat}` : sorteada ? '2px dashed rgba(250,204,21,0.4)' : '1px solid rgba(255,255,255,0.05)', boxShadow: selecionada ? `0 0 12px ${corCat}33` : 'none', borderRadius: '10px', padding: '8px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', cursor: 'pointer', transition: 'all 0.2s' }} onClick={() => { if (!imAcaoDadosRolando) selecionarOpcaoImAcao(idx); }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ width: '22px', height: '22px', borderRadius: '50%', background: corCat, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '0.75rem', flexShrink: 0 }}>{opcao.num}</span>
                            <span style={{ fontSize: '0.82rem', fontWeight: 'bold', color: corCat, textTransform: 'uppercase' }}>{opcao.cat}</span>
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            {imAcaoCartaRevelada && imAcaoOpcaoSelecionada === idx ? (
                              <strong style={{ fontSize: '0.92rem', color: '#fff' }}><MathText text={opcao.resp} /></strong>
                            ) : (
                              <span style={{ fontSize: '0.75rem', color: '#6b7280', fontStyle: 'italic' }}>Oculto</span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  {!imAcaoCartaRevelada ? (
                    <button className="btn-prox" style={{ background: '#10b981', fontSize: '0.85rem', padding: '8px 20px' }} onClick={revelarCartaImAcao}>👁️ Revelar Segredo</button>
                  ) : (
                    <div style={{ color: '#fb923c', fontSize: '0.78rem', fontWeight: 'bold', background: 'rgba(245,158,11,0.08)', padding: '6px 10px', borderRadius: '8px', border: '1px solid rgba(245,158,11,0.2)', textAlign: 'center' }}>
                      💡 Opção {imAcaoOpcaoSelecionada + 1} · Modo: {imAcaoModoRepresentacao}
                    </div>
                  )}
                </div>
              </div>

              {/* ═══ COLUNA 3: CRONÔMETRO + JULGAMENTO + CONTROLES ═══ */}
              <div className="imacao-col-controles">
                {/* Cronômetro */}
                <div className="card" style={{ padding: '14px', textAlign: 'center', margin: 0 }}>
                  <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#a78bfa', marginBottom: '10px', borderLeft: '3px solid #7c3aed', paddingLeft: '8px', textTransform: 'uppercase', letterSpacing: '0.5px', textAlign: 'left' }}>
                    ⏱️ Controle de Tempo
                  </div>
                  <div style={{ fontSize: '3.2rem', fontWeight: 'bold', fontFamily: 'monospace', color: imAcaoTimer <= 5 ? '#ef4444' : '#fff', textShadow: imAcaoTimer <= 5 ? '0 0 20px rgba(239,68,68,0.5)' : 'none', lineHeight: 1, margin: '4px 0 12px' }}>
                    {imAcaoTimer}s
                  </div>
                  <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', flexWrap: 'wrap' }}>
                    {imAcaoFluxo !== 'jogando' ? (
                      <button className="btn-ac btn-add" style={{ background: '#10b981', padding: '8px 18px', fontSize: '0.85rem' }} onClick={iniciarCronometroImAcao}>▶ Iniciar</button>
                    ) : (
                      <button className="btn-ac" style={{ background: '#f59e0b', color: '#fff', padding: '8px 18px', fontSize: '0.85rem' }} onClick={pausarCronometroImAcao}>⏸ Pausar</button>
                    )}
                    <button className="btn-del" style={{ padding: '8px 18px', fontSize: '0.85rem' }} onClick={() => { pausarCronometroImAcao(); setImAcaoTimer(imAcaoMaxTimer); enviarMsgProjetor('SORTEAR_CARTA', { carta: imAcaoCartaAtual, timer: imAcaoMaxTimer }); }}>🔄 Reiniciar</button>
                </div>
                </div>

                {/* Julgamento */}
                {imAcaoCartaRevelada && (() => {
                  const numeroCasaAtual = imAcaoPontuacao[imAcaoEquipeVez];
                  const ehTodosJogam = obterCatCasaImAcao(numeroCasaAtual) === 'Todos Jogam';
                  return (
                    <div className="card" style={{ padding: '14px', border: ehTodosJogam ? '2px solid #a855f7' : '1px solid rgba(255,255,255,0.08)', boxShadow: ehTodosJogam ? '0 0 15px rgba(168,85,247,0.15)' : 'none', display: 'flex', flexDirection: 'column', gap: '10px', margin: 0 }}>
                      {ehTodosJogam ? (
                        <>
                          <div style={{ fontSize: '0.85rem', color: '#d8b4fe', fontWeight: 'bold', textAlign: 'center', textTransform: 'uppercase', letterSpacing: '0.5px' }}>👥 Todos Jogam!</div>
                          <div style={{ fontSize: '0.78rem', color: '#9ca3af', fontWeight: 'bold', textAlign: 'center' }}>Quem adivinhou primeiro?</div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <button className="btn-ac btn-add" style={{ background: 'rgba(59,130,246,0.15)', borderColor: '#3b82f6', color: '#60a5fa', padding: '10px', fontSize: '0.85rem' }} onClick={() => julgarImAcaoEspecial(0)}>🔵 {nomeJ1} Adivinhou! (+{imAcaoDadoMovimentacao})</button>
                            <button className="btn-ac btn-add" style={{ background: 'rgba(236,72,153,0.15)', borderColor: '#ec4899', color: '#f472b6', padding: '10px', fontSize: '0.85rem' }} onClick={() => julgarImAcaoEspecial(1)}>🩷 {nomeJ2} Adivinhou! (+{imAcaoDadoMovimentacao})</button>
                            <button className="btn-ac" style={{ background: 'rgba(220,38,38,0.15)', borderColor: '#dc2626', color: '#f87171', padding: '10px', fontSize: '0.85rem' }} onClick={() => julgarImAcaoEspecial(null)}>❌ Nenhuma adivinhou</button>
                          </div>
                        </>
                      ) : (
                        <>
                          <div style={{ fontSize: '0.85rem', color: '#9ca3af', fontWeight: 'bold', textAlign: 'center' }}>O grupo adivinhou a tempo?</div>
                          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                            <button className="btn-ac btn-add" style={{ flex: 1, background: '#10b981', padding: '10px', fontSize: '0.85rem', minWidth: '110px' }} onClick={() => julgarImAcao(true)}>✅ Adivinhou (+{imAcaoDadoMovimentacao})</button>
                            <button className="btn-ac" style={{ flex: 1, background: '#dc2626', color: '#fff', padding: '10px', fontSize: '0.85rem', minWidth: '110px' }} onClick={() => julgarImAcao(false)}>❌ Passou a Vez</button>
                          </div>
                        </>
                      )}
                    </div>
                  );
                })()}

                {/* Botão Abandonar */}
                <button className="btn-del" style={{ width: '100%', marginTop: 'auto', fontSize: '0.82rem', padding: '8px' }} onClick={() => { if(window.confirm('Quer mesmo sair da partida?')) irParaTela('menu'); }}>
                  🚪 Abandonar Partida
                </button>
              </div>

            </div>
          </div>
        )}
      </div>

      <div id="tela-ia-projetor" className={`tela ${tela === 'ia-projetor' ? 'ativa' : ''}`} style={{ background: 'radial-gradient(circle at 50% 50%, #0d0722 0%, #03020a 100%)', minHeight: '100vh', padding: '24px', boxSizing: 'border-box', position: 'relative', display: tela === 'ia-projetor' ? 'flex' : 'none', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        {imAcaoCartaAtual ? (() => {
          const bgProjetor = 'radial-gradient(circle at 50% 50%, #0d0722 0%, #03020a 100%)';
          return (
            <div className="projetor-screen">
              {/* ── Header ── */}
              <div style={{ display: 'flex', width: '100%', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.07)', paddingBottom: '12px', flexShrink: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <span style={{ fontSize: '2rem' }}>🎨</span>
                  <div>
                    <h1 style={{ fontSize: '1.5rem', fontWeight: 900, color: '#fff', margin: 0, fontFamily: 'Outfit' }}>Imagem e Ação</h1>
                    <div style={{ display: 'inline-flex', flexWrap: 'wrap', alignItems: 'center', gap: '0.95rem', fontSize: '0.82rem', color: '#6ee7b7', fontWeight: 'bold' }}>
                      <span>Rodada {imAcaoRodada}</span>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', color: '#a5f3fc' }}>
                        <span>▶</span>
                        <span style={{ fontWeight: 800 }}>Vez de:</span>
                        <span style={{ color: '#c7f9d0' }}>{imAcaoEquipeVez === 0 ? nomeJ1 : nomeJ2}</span>
                      </span>
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                  <div style={{ background: 'rgba(59,130,246,0.15)', border: '1px solid rgba(59,130,246,0.3)', borderRadius: '12px', padding: '5px 14px', textAlign: 'center' }}>
                    <div style={{ fontSize: '0.68rem', color: '#93c5fd', fontWeight: 'bold' }}>🔵 {nomeJ1}</div>
                    <div style={{ fontSize: '1rem', fontWeight: 900, color: '#60a5fa' }}>Casa {imAcaoPontuacao[0]}</div>
                  </div>
                  <div style={{ background: 'rgba(236,72,153,0.15)', border: '1px solid rgba(236,72,153,0.3)', borderRadius: '12px', padding: '5px 14px', textAlign: 'center' }}>
                    <div style={{ fontSize: '0.68rem', color: '#f9a8d4', fontWeight: 'bold' }}>🩷 {nomeJ2}</div>
                    <div style={{ fontSize: '1rem', fontWeight: 900, color: '#f472b6' }}>Casa {imAcaoPontuacao[1]}</div>
                  </div>
                </div>
              </div>

              {/* ── Grid 3 Colunas ── */}
              <div className="projetor-grid">

                {/* ═══ COL 1: TABULEIRO ═══ */}
                <div className="projetor-col">
                  <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#10b981', borderLeft: '4px solid #10b981', paddingLeft: '10px', textTransform: 'uppercase', letterSpacing: '0.5px', flexShrink: 0 }}>🗺️ Tabuleiro</div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '7px', overflowY: 'visible' }}>
                    {Array.from({ length: 30 }, (_, index) => {
                      const num = index + 1;
                      const catCasa = obterCatCasaImAcao(num);
                      const corCasa = obterCorCasaImAcao(catCasa);
                      const j1Aqui = imAcaoPontuacao[0] === num;
                      const j2Aqui = imAcaoPontuacao[1] === num;
                      const casaLabel = num === 1 ? '🚪 Saída' : num === 30 ? '🏁 Chegada' : num - 1;
                      return (
                        <div key={num} id={`casa-ia-proj-${num}`} className="tab-casa" style={{ height: '68px', background: (j1Aqui || j2Aqui) ? `${corCasa}18` : 'rgba(15,23,42,0.5)', border: `2.5px solid ${corCasa}`, borderRadius: '10px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', alignItems: 'center', padding: '4px', position: 'relative', boxShadow: (j1Aqui || j2Aqui) ? `0 0 14px ${corCasa}` : 'none', maxWidth: 'none' }}>
                          <span style={{ fontSize: num === 1 || num === 30 ? '0.6rem' : '0.68rem', fontWeight: 'bold', color: num === 1 || num === 30 ? '#10b981' : '#9ca3af', lineHeight: 1, textAlign: 'center' }}>{casaLabel}</span>
                          {catCasa === 'Todos Jogam' && num !== 30 ? (<span style={{ fontSize: '1rem', filter: 'drop-shadow(0 0 5px #a855f7)' }}>👥</span>) : null}
                          <div style={{ display: 'flex', gap: '2px', position: 'absolute', bottom: '3px', left: '50%', transform: 'translateX(-50%)' }}>
                            {j1Aqui && (<div className="peon-gigante" style={{ '--glow-color': '#3b82f6', background: '#3b82f6', width: '28px', height: '28px', fontSize: '0.72rem', borderWidth: '2px', boxShadow: '0 0 10px #3b82f6' }}>AZ</div>)}
                            {j2Aqui && (<div className="peon-gigante" style={{ '--glow-color': '#ec4899', background: '#ec4899', width: '28px', height: '28px', fontSize: '0.72rem', borderWidth: '2px', boxShadow: '0 0 10px #ec4899' }}>RS</div>)}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* ═══ COL 2: DADOS + CRONÔMETRO ═══ */}
                <div className="projetor-col" style={{ alignItems: 'center', justifyContent: 'flex-start' }}>
                  <div style={{ fontSize: '1.15rem', fontWeight: 'bold', color: imAcaoEquipeVez === 0 ? '#60a5fa' : '#f472b6', padding: '6px 16px', borderRadius: '30px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', textAlign: 'center' }}>
                    🎭 {imAcaoEquipeVez === 0 ? nomeJ1 : nomeJ2}
                  </div>

                  {(imAcaoFluxo === 'julgada' || (imAcaoFluxo === 'preparacao' && imAcaoRodada === 1)) && (
                    <div style={{ background: 'rgba(124,58,237,0.1)', border: '2px dashed #7c3aed', borderRadius: '14px', padding: '10px 16px', color: '#d8b4fe', fontSize: '0.95rem', fontWeight: 'bold', textAlign: 'center', animation: 'pulse 1.2s infinite alternate' }}>
                      {imAcaoFluxo === 'preparacao' && imAcaoRodada === 1 ? '🎲 Gire os dados!' : '🎲 Jogue os dados!'}
                    </div>
                  )}

                  <div className="dados-area-flex" style={{ width: '100%', padding: '0 8px' }}>
                    <div className="dado-virtual-wrap" style={{ flex: 1, minWidth: 0, display: 'flex', justifyContent: 'center' }}>
                      <div className={`dado-virtual ${imAcaoDadosRolando ? 'rolando-cat' : ''} dado-cat-${imAcaoDadoCategoria}`}>
                        <span style={{ fontSize: '0.6rem', color: '#9ca3af', textTransform: 'uppercase', fontWeight: 'bold' }}>Cat.</span>
                        <strong style={{ fontSize: '1.6rem', color: '#fff' }}>{imAcaoDadoCategoria}</strong>
                        <span style={{ fontSize: '0.45rem', color: obterCorCasaImAcao(imAcaoDadoCategoria === 6 ? 'Difícil' : ['Ação', 'Objeto', 'Lugar', 'Pessoa/Animal', 'Difícil'][imAcaoDadoCategoria - 1]), fontWeight: 'bold', textTransform: 'uppercase', textAlign: 'center', lineHeight: 1.1 }}>
                          {imAcaoDadoCategoria === 6 ? '🌟 Livre' : ['Ação', 'Objeto', 'Lugar', 'Pessoa/Animal', 'Difícil'][imAcaoDadoCategoria - 1]}
                        </span>
                      </div>
                    </div>
                    <div className="dado-virtual-wrap" style={{ flex: 1, minWidth: 0, display: 'flex', justifyContent: 'center' }}>
                      <div className={`dado-virtual dado-mov ${imAcaoDadosRolando ? 'rolando-mov' : ''}`}>
                        <span style={{ fontSize: '0.6rem', color: '#9ca3af', textTransform: 'uppercase', fontWeight: 'bold' }}>Casas</span>
                        <strong style={{ fontSize: '1.6rem', color: '#3b82f6' }}>{imAcaoDadoMovimentacao}</strong>
                        <span style={{ fontSize: '0.5rem', color: '#60a5fa', fontWeight: 'bold' }}>AVANÇAR</span>
                      </div>
                    </div>
                    <div className="dado-virtual-wrap" style={{ flex: 1, minWidth: 0, display: 'flex', justifyContent: 'center' }}>
                      <div className={`dado-virtual dado-desafio ${imAcaoDadoDesafioRolando ? 'rolando-desafio' : ''}`}>
                        <span style={{ fontSize: '0.6rem', color: '#9ca3af', textTransform: 'uppercase', fontWeight: 'bold' }}>Desafio</span>
                        <strong style={{ fontSize: '1rem', color: '#fff', textShadow: '0 0 8px rgba(249,115,22,0.6)', textAlign: 'center', lineHeight: 1.1 }}>{obterDesafioTexto(imAcaoDadoDesafio).centro}</strong>
                        <span style={{ fontSize: '0.48rem', color: '#f97316', fontWeight: 'bold', textTransform: 'uppercase' }}>{obterDesafioTexto(imAcaoDadoDesafio).desc}</span>
                      </div>
                    </div>
                  </div>

                  <div className="cronometro-circular">
                    <svg viewBox="0 0 120 120">
                      <circle className="bg-circle" cx="60" cy="60" r="54" />
                      <circle className="progress-circle" cx="60" cy="60" r="54"
                        stroke={imAcaoTimer <= 5 ? '#ef4444' : imAcaoTimer <= 15 ? '#f59e0b' : '#10b981'}
                        strokeDasharray={`${2 * Math.PI * 54}`}
                        strokeDashoffset={`${2 * Math.PI * 54 * (1 - imAcaoTimer / imAcaoMaxTimer)}`}
                      />
                    </svg>
                    <span className="timer-text" style={{ color: imAcaoTimer <= 5 ? '#ef4444' : '#fff' }}>{imAcaoTimer}</span>
                  </div>

                  {imAcaoModoRepresentacao && (
                    <div style={{ background: imAcaoModoRepresentacao === 'Mímica' ? 'rgba(124,58,237,0.15)' : 'rgba(16,185,129,0.15)', border: `1.5px solid ${imAcaoModoRepresentacao === 'Mímica' ? '#7c3aed' : '#10b981'}`, borderRadius: '12px', padding: '7px 18px', color: imAcaoModoRepresentacao === 'Mímica' ? '#c4b5fd' : '#6ee7b7', fontSize: '0.95rem', fontWeight: 'bold', textAlign: 'center' }}>
                      {imAcaoModoRepresentacao === 'Mímica' ? '🎭 Modo: Mímica' : '✏️ Modo: Desenho'}
                    </div>
                  )}
                </div>

                {/* ═══ COL 3: QUADRO BRANCO ═══ */}
                <div className="projetor-col">
                  <button
                    id="btn-toggle-quadro"
                    className="projetor-btn-toggle"
                    onClick={toggleTelaBrancaImAcao}
                    style={{
                      background: imAcaoTelaBrancaAtiva ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.06)',
                      borderColor: imAcaoTelaBrancaAtiva ? 'rgba(255,255,255,0.4)' : 'rgba(255,255,255,0.15)',
                      color: imAcaoTelaBrancaAtiva ? '#ffffff' : '#cbd5e1'
                    }}
                  >
                    {imAcaoTelaBrancaAtiva ? '🌑 Escurecer o quadro' : '⬜ Iluminar o quadro'}
                  </button>
                  <div className={`projetor-quadro ${imAcaoTelaBrancaAtiva ? 'branco' : 'escuro'}`} />
                </div>

              </div>
            </div>
          );
        })() : (
          <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#fff', height: '100%', padding: '40px', boxSizing: 'border-box' }}>
            <div style={{ fontSize: '6rem', marginBottom: '20px', filter: 'drop-shadow(0 0 35px rgba(16, 185, 129, 0.5))', animation: 'pulse 2s infinite' }}>🎨</div>
            <h2 style={{ fontSize: '2.8rem', fontWeight: 900, fontFamily: 'Outfit', background: 'linear-gradient(90deg, #10b981, #3b82f6)', webkitBackgroundClip: 'text', webkitTextFillColor: 'transparent', margin: '0 0 10px', letterSpacing: '-0.5px' }}>Imagem e Ação</h2>
            <p style={{ color: '#6ee7b7', fontSize: '1.2rem', fontWeight: 600, letterSpacing: '1px', textTransform: 'uppercase', margin: '0 0 30px' }}>Painel do Projetor Conectado</p>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '12px', background: 'rgba(255, 255, 255, 0.03)', padding: '14px 28px', borderRadius: '30px', border: '1px solid rgba(16, 185, 129, 0.25)', boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)' }}>
              <span style={{ width: '12px', height: '12px', background: '#10b981', borderRadius: '50%', display: 'inline-block', boxShadow: '0 0 10px #10b981' }} />
              <span style={{ color: '#cbd5e1', fontSize: '0.95rem', fontWeight: 'bold' }}>Aguardando o moderador iniciar a disputa...</span>
            </div>
          </div>
        )}
      </div>


      {/* 15. TELA DE FIM DE PARTIDA IMAGEM E AÇÃO */}
      <div id="tela-ia-fim" className={`tela ${tela === 'ia-fim' ? 'ativa' : ''}`} style={{ alignItems: 'center' }}>
        <div className="trofeu">🏆</div>
        <h2 style={{ fontFamily: 'Outfit', letterSpacing: '1.5px' }}>Resultado Final - Imagem e Ação</h2>
        
        <div className="venc-final" style={{ background: 'linear-gradient(135deg, #ffffff 0%, #10b981 50%, #3b82f6 100%)', webkitBackgroundClip: 'text', webkitTextFillColor: 'transparent', textAlign: 'center' }}>
          {imAcaoPontuacao[0] >= 30 ? `🎉 ${nomeJ1} é a Campeã! 🏆` : `🎉 ${nomeJ2} é a Campeã! 🏆`}
        </div>

        <div className="placar-final">
          <div className="pf-item">
            <div className="pf-nome" style={{ color: '#60a5fa' }}>🔵 {nomeJ1}</div>
            <div className="pf-pts" style={{ color: '#60a5fa' }}>Casa {imAcaoPontuacao[0]}</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', color: '#a78bfa', fontSize: '1.6rem', fontWeight: 800 }}>×</div>
          <div className="pf-item">
            <div className="pf-nome" style={{ color: '#f472b6' }}>🩷 {nomeJ2}</div>
            <div className="pf-pts" style={{ color: '#f472b6' }}>Casa {imAcaoPontuacao[1]}</div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap', justifyContent: 'center', marginTop: '10px' }}>
          <button className="btn-start" style={{ background: 'linear-gradient(90deg, #10b981, #3b82f6)', boxShadow: '0 8px 30px rgba(16, 185, 129, 0.45)' }} onClick={() => iniciarPartidaImAcao(imAcaoMaxTimer)}>
            Jogar Novamente 🔄
          </button>
          <button className="btn-start" style={{ background: 'linear-gradient(90deg, #374151, #4b5563)', boxShadow: 'none' }} onClick={() => irParaTela('menu')}>
            Voltar ao Menu 🏠
          </button>
        </div>
      </div>

      {/* 16. TELA DE CONFIGURAÇÃO JOGO DA MEMÓRIA */}
      <div id="tela-memo-nomes" className={`tela ${tela === 'memo-nomes' ? 'ativa' : ''}`} style={{ display: tela === 'memo-nomes' ? 'flex' : 'none', flexDirection: 'column', alignItems: 'center', textAlign: 'center', justifyContent: 'center', minHeight: '100vh', padding: '14px', boxSizing: 'border-box', maxWidth: 'none' }}>

        
        {/* Título Compacto */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', justifyContent: 'center', marginBottom: '8px' }}>
          <span style={{ fontSize: '2.5rem', filter: 'drop-shadow(0 0 15px rgba(139, 92, 246, 0.45))' }}>🧠</span>
          <h2 style={{ fontSize: '1.8rem', fontWeight: 900, margin: 0, fontFamily: 'Outfit' }}>Configurar Jogo da Memória</h2>
        </div>
        <p style={{ color: '#c4b5fd', fontSize: '0.88rem', margin: '0 0 14px', textAlign: 'center' }}>Duelo pedagógico em dupla tela com 35 cartas!</p>

        {/* Layout Master Centralizado Unificado */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', width: '100%', maxWidth: '580px', margin: '0 auto' }}>
          
          {/* Nomes das Equipes Rivais e Vez Inicial (Fundido) */}
          <div className="card" style={{ padding: '12px 16px', background: 'rgba(22, 33, 62, 0.45)', margin: 0 }}>
            <div style={{ fontSize: '0.9rem', fontWeight: 800, color: '#a78bfa', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px', textAlign: 'left', borderLeft: '3px solid #8b5cf6', paddingLeft: '8px' }}>
              👥 Equipes Rivais & Vez Inicial
            </div>
            <div className="dupla" style={{ display: 'flex', gap: '12px', margin: 0, width: '100%' }}>
              <div 
                className="jcard j1" 
                style={{ 
                  flex: 1, 
                  textAlign: 'center', 
                  padding: '8px',
                  border: memoEquipeIniciar === 0 ? '1.5px solid #3b82f6' : '1px solid rgba(255, 255, 255, 0.08)',
                  borderRadius: '8px',
                  background: memoEquipeIniciar === 0 ? 'rgba(59, 130, 246, 0.1)' : 'transparent',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
                onClick={() => setMemoEquipeIniciar(0)}
              >
                <h3 style={{ fontSize: '0.85rem', margin: '0 0 6px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', color: memoEquipeIniciar === 0 ? '#60a5fa' : '#fff' }}>
                  🔵 Equipe 1 {memoEquipeIniciar === 0 && <span style={{ fontSize: '0.75rem' }}>🚩 (Começa)</span>}
                </h3>
                <input 
                  value={nomeJ1} 
                  onChange={(e) => setNomeJ1(e.target.value)} 
                  onClick={(e) => e.stopPropagation()} // impede o click de mudar a vez ao digitar
                  placeholder="Equipe Azul" 
                  style={{ textAlign: 'center', padding: '6px', fontSize: '0.85rem', width: '100%', boxSizing: 'border-box' }} 
                />
              </div>
              <div 
                className="jcard j2" 
                style={{ 
                  flex: 1, 
                  textAlign: 'center', 
                  padding: '8px',
                  border: memoEquipeIniciar === 1 ? '1.5px solid #ec4899' : '1px solid rgba(255, 255, 255, 0.08)',
                  borderRadius: '8px',
                  background: memoEquipeIniciar === 1 ? 'rgba(236, 72, 246, 0.1)' : 'transparent',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
                onClick={() => setMemoEquipeIniciar(1)}
              >
                <h3 style={{ fontSize: '0.85rem', margin: '0 0 6px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', color: memoEquipeIniciar === 1 ? '#f472b6' : '#fff' }}>
                  🩷 Equipe 2 {memoEquipeIniciar === 1 && <span style={{ fontSize: '0.75rem' }}>🚩 (Começa)</span>}
                </h3>
                <input 
                  value={nomeJ2} 
                  onChange={(e) => setNomeJ2(e.target.value)} 
                  onClick={(e) => e.stopPropagation()} // impede o click de mudar a vez ao digitar
                  placeholder="Equipe Rosa" 
                  style={{ textAlign: 'center', padding: '6px', fontSize: '0.85rem', width: '100%', boxSizing: 'border-box' }} 
                />
              </div>
            </div>
          </div>

          {/* Matéria Pedagógica */}
          <div className="card" style={{ padding: '12px 16px', background: 'rgba(22, 33, 62, 0.45)', margin: 0 }}>
            <div style={{ fontSize: '0.9rem', fontWeight: 800, color: '#a78bfa', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px', textAlign: 'left', borderLeft: '3px solid #8b5cf6', paddingLeft: '8px' }}>
              📚 Matéria Pedagógica
            </div>
            <select 
              value={memoMateria}
              onChange={(e) => setMemoMateria(e.target.value)}
              style={{ background: '#1a1f38', color: '#fff', border: '1px solid rgba(139, 92, 246, 0.3)', borderRadius: '8px', padding: '8px 12px', fontSize: '0.9rem', width: '100%', cursor: 'pointer', textAlign: 'center' }}
            >
              {materias.length === 0 ? (
                <option value="">Nenhuma matéria cadastrada</option>
              ) : (
                materias.map((m, idx) => (
                  <option key={idx} value={m}>{m}</option>
                ))
              )}
            </select>
          </div>

          {/* Escolha das Imagens das Cartas Surpresas (Troca-Tudo e Olho Mágico apenas) */}
          <div className="card" style={{ padding: '12px 16px', background: 'rgba(22, 33, 62, 0.45)', margin: 0 }}>
            <div style={{ fontSize: '0.9rem', fontWeight: 800, color: '#f59e0b', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px', textAlign: 'left', borderLeft: '3px solid #f59e0b', paddingLeft: '8px' }}>
              🖼️ Selecionar Imagens das Surpresas ({memoMateria || 'Geral'})
            </div>
            
            {(() => {
              // Obter as imagens cadastradas na categoria ativa ou Geral
              let imagensDisponiveis = memoImagensPool.filter(img => typeof img === 'object' ? img.mat === memoMateria : false);
              if (imagensDisponiveis.length === 0) {
                imagensDisponiveis = memoImagensPool.filter(img => typeof img === 'object' ? !img.mat : true);
              }
              const poolUrls = imagensDisponiveis.map(img => typeof img === 'object' ? img.url : img);
              const poolUrlsFinal = poolUrls.length > 0 ? poolUrls : IMAGENS_PADRAO_MEMORIA;

              const atualEmbaralhar = memoMateria ? (memoSurpresasPorMateria[memoMateria]?.embaralhar || memoImgSurpresaEmbaralhar) : memoImgSurpresaEmbaralhar;
              const atualOlho = memoMateria ? (memoSurpresasPorMateria[memoMateria]?.olho || memoImgSurpresaOlho) : memoImgSurpresaOlho;

              // Garantir que as URLs ativas estejam no pool (se não estiverem, insere no início)
              const poolEmbaralhar = poolUrlsFinal.includes(atualEmbaralhar) ? poolUrlsFinal : [atualEmbaralhar, ...poolUrlsFinal];
              const poolOlho = poolUrlsFinal.includes(atualOlho) ? poolUrlsFinal : [atualOlho, ...poolUrlsFinal];

              return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', width: '100%' }}>
                  {/* Surpresa 1: Troca-Tudo */}
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <img 
                      src={atualEmbaralhar} 
                      alt="Preview Troca-Tudo"
                      style={{ width: '36px', height: '36px', borderRadius: '6px', border: '1px solid rgba(245, 158, 11, 0.4)', objectFit: 'cover' }}
                      onError={(e) => { e.target.src = "https://images.unsplash.com/photo-1527489377706-5bf97e608852?q=80&w=250&auto=format&fit=crop"; }}
                    />
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '2px', textAlign: 'left' }}>
                      <span style={{ fontSize: '0.65rem', fontWeight: 'bold', color: '#f59e0b' }}>Troca-Tudo 🌪️ (2 Cartas na Mesa)</span>
                      <select 
                        value={atualEmbaralhar} 
                        onChange={(e) => {
                          const url = e.target.value;
                          if (!memoMateria) {
                            setMemoImgSurpresaEmbaralhar(url);
                          } else {
                            setMemoSurpresasPorMateria(prev => {
                              const mat = prev[memoMateria] || {};
                              return { ...prev, [memoMateria]: { ...mat, embaralhar: url } };
                            });
                          }
                        }}
                        style={{ fontSize: '0.75rem', padding: '4px 8px', background: '#0c0e1a', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '4px', color: '#fff', width: '100%', boxSizing: 'border-box', cursor: 'pointer' }}
                      >
                        {poolEmbaralhar.map((url, idx) => (
                          <option key={idx} value={url}>Imagem {idx + 1} ({url.substring(0, 35)}...)</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Surpresa 2: Olho Mágico */}
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <img 
                      src={atualOlho} 
                      alt="Preview Olho"
                      style={{ width: '36px', height: '36px', borderRadius: '6px', border: '1px solid rgba(139, 92, 246, 0.4)', objectFit: 'cover' }}
                      onError={(e) => { e.target.src = "https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=250&auto=format&fit=crop"; }}
                    />
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '2px', textAlign: 'left' }}>
                      <span style={{ fontSize: '0.65rem', fontWeight: 'bold', color: '#8b5cf6' }}>Olho Mágico 👁️ (1 Carta na Mesa)</span>
                      <select 
                        value={atualOlho} 
                        onChange={(e) => {
                          const url = e.target.value;
                          if (!memoMateria) {
                            setMemoImgSurpresaOlho(url);
                          } else {
                            setMemoSurpresasPorMateria(prev => {
                              const mat = prev[memoMateria] || {};
                              return { ...prev, [memoMateria]: { ...mat, olho: url } };
                            });
                          }
                        }}
                        style={{ fontSize: '0.75rem', padding: '4px 8px', background: '#0c0e1a', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '4px', color: '#fff', width: '100%', boxSizing: 'border-box', cursor: 'pointer' }}
                      >
                        {poolOlho.map((url, idx) => (
                          <option key={idx} value={url}>Imagem {idx + 1} ({url.substring(0, 35)}...)</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>

          {/* Ajuste de Escala */}
          <div className="card" style={{ padding: '12px 16px', background: 'rgba(22, 33, 62, 0.45)', margin: 0 }}>
            <div style={{ fontSize: '0.9rem', fontWeight: 800, color: '#3b82f6', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px', textAlign: 'left', borderLeft: '3px solid #3b82f6', paddingLeft: '8px' }}>
              📐 Escala do Projetor (Epson 16:10)
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
              <span style={{ fontSize: '0.75rem', color: '#9ca3af', fontWeight: 'bold' }}>Menor (80%)</span>
              <input 
                type="range" 
                min="80" 
                max="135" 
                value={memoCartaEscala}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  setMemoCartaEscala(val);
                  enviarMsgProjetor('MEMO_ATUALIZAR', { cartaEscala: val });
                }}
                style={{ flex: 1, accentColor: '#3b82f6', cursor: 'pointer', height: '4px' }}
              />
              <span style={{ fontSize: '0.75rem', color: '#60a5fa', fontWeight: 'bold' }}>({memoCartaEscala}%)</span>
            </div>
          </div>

          {/* Ações e Botão de Projetor */}
          <div style={{ display: 'flex', gap: '10px', marginTop: '4px', flexWrap: 'wrap' }}>
            <button 
              className="btn-menu btn-outline" 
              style={{ flex: 1, borderColor: '#8b5cf6', color: '#a78bfa', background: 'rgba(139, 92, 246, 0.05)', fontSize: '0.82rem', padding: '8px 12px', alignSelf: 'center', whiteSpace: 'nowrap' }}
              onClick={() => window.open(window.location.origin + window.location.pathname + '?projetor=true', '_blank', 'width=1200,height=800')}
            >
              📺 Abrir Segunda Tela
            </button>
            
            <button className="btn-start" style={{ flex: 1.3, background: 'linear-gradient(90deg, #8b5cf6, #3b82f6)', boxShadow: '0 6px 20px rgba(139, 92, 246, 0.35)', padding: '8px 16px', fontSize: '0.9rem', margin: 0 }} onClick={() => iniciarPartidaMemoria(memoMateria)}>
              Começar Disputa! 🚀
            </button>
          </div>

          {/* Botões Secundários de Navegação e Configuração (Movidos para baixo!) */}
          <div style={{ display: 'flex', gap: '10px', marginTop: '8px', width: '100%' }}>
            <button 
              className="btn-volta" 
              onClick={() => irParaTela('menu')} 
              style={{ flex: 1, margin: 0, padding: '8px 12px', fontSize: '0.82rem', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)' }}
            >
              ← Voltar ao Menu
            </button>
            <button 
              className="btn-menu btn-outline" 
              style={{ flex: 1, fontSize: '0.82rem', padding: '8px 12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', margin: 0 }} 
              onClick={() => { setCadGerenciadorAba('memoria'); setCadTab('manual'); setOrigemConfig('memo-nomes'); irParaTela('cadastro'); }}
            >
              ⚙️ Gerenciar Imagens
            </button>
          </div>

        </div>

      </div>

      {/* 17. TELA DE CONTROLE/MODERAÇÃO DO JOGO DA MEMÓRIA */}
      <div id="tela-memo-jogo" className={`tela ${tela === 'memo-jogo' ? 'ativa' : ''}`} style={{ display: tela === 'memo-jogo' ? 'flex' : 'none', flexDirection: 'column', padding: '16px', boxSizing: 'border-box', minHeight: '100vh' }}>
        
        {/* Barra de Placar e Status */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(15, 23, 42, 0.65)', border: '1px solid rgba(139, 92, 246, 0.25)', borderRadius: '16px', padding: '12px 24px', marginBottom: '16px', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#3b82f6', boxShadow: '0 0 8px #3b82f6' }} />
            <span style={{ fontWeight: 800, color: '#60a5fa', fontSize: '0.95rem' }}>🔵 {nomeJ1}</span>
            <span style={{ background: 'rgba(59,130,246,0.15)', border: '1px solid rgba(59,130,246,0.3)', color: '#93c5fd', borderRadius: '8px', padding: '2px 10px', fontSize: '0.85rem', fontWeight: 700 }}>
              {memoPontuacao[0]} pts
            </span>
          </div>
          
          <div style={{ textAlign: 'center' }}>
            <span style={{ fontSize: '0.78rem', color: '#c4b5fd', textTransform: 'uppercase', fontWeight: 800, letterSpacing: '1px' }}>
              🧠 Jogo da Memória Pedagógico
            </span>
            <div style={{ fontSize: '0.85rem', background: memoEquipeVez === 0 ? 'rgba(59,130,246,0.15)' : 'rgba(236,72,153,0.15)', color: memoEquipeVez === 0 ? '#60a5fa' : '#f472b6', padding: '4px 14px', borderRadius: '10px', fontWeight: 700, display: 'inline-block', marginTop: '2px', border: memoEquipeVez === 0 ? '1px solid rgba(59,130,246,0.3)' : '1px solid rgba(236,72,153,0.3)' }}>
              ▶ Vez de jogar: {memoEquipeVez === 0 ? nomeJ1 : nomeJ2}
            </div>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ background: 'rgba(236,72,153,0.15)', border: '1px solid rgba(236,72,153,0.3)', color: '#f9a8d4', borderRadius: '8px', padding: '2px 10px', fontSize: '0.85rem', fontWeight: 700 }}>
              {memoPontuacao[1]} pts
            </span>
            <span style={{ fontWeight: 800, color: '#f472b6', fontSize: '0.95rem' }}>🩷 {nomeJ2}</span>
            <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#ec4899', boxShadow: '0 0 8px #ec4899' }} />
          </div>
        </div>

        {/* Barra de Ferramentas de Moderação: Escala e Informações */}
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', background: 'rgba(30, 41, 59, 0.45)', border: '1px solid rgba(255, 255, 255, 0.05)', borderRadius: '12px', padding: '8px 20px', marginBottom: '14px', flexShrink: 0 }}>
          <div style={{ fontSize: '0.88rem', color: '#cbd5e1' }}>
            📚 Matéria Ativa: <strong style={{ color: '#a78bfa' }}>{memoMateria || 'Geral'}</strong>
          </div>
        </div>

        {/* Notificação de Efeito Ativo */}
        {memoEfeitoAtivo && (
          <div style={{ background: memoEfeitoAtivo === 'embaralhar' ? 'rgba(245, 158, 11, 0.15)' : 'rgba(139, 92, 246, 0.15)', border: `2px dashed ${memoEfeitoAtivo === 'embaralhar' ? '#f59e0b' : '#8b5cf6'}`, borderRadius: '12px', padding: '10px 20px', color: memoEfeitoAtivo === 'embaralhar' ? '#fde047' : '#c084fc', fontSize: '1rem', fontWeight: 'bold', textAlign: 'center', margin: '0 auto 16px', maxWidth: '600px', width: '100%', animation: 'pulse 1s infinite alternate', boxSizing: 'border-box' }}>
            {memoEfeitoAtivo === 'embaralhar' ? '🌪️ Efeito Troca-Tudo: Embaralhando cartas fechadas...' : '👁️ Efeito Olho Mágico: Revelando um par secreto por 2.5s...'}
          </div>
        )}

        {/* Destaque das Cartas Viradas no Turno removido */}

        {/* Tabuleiro de Cartas (Painel do Professor - Semitransparentes) */}
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 0 }}>
          <div className="memo-grid-moderacao">
            {memoCartas.map((carta, idx) => {
              const selecionada = memoCartasSelecionadas.includes(idx);
              const encontrada = carta.encontradaPor !== null;
              
              // Define a cor de borda baseada no tipo da carta no painel do moderador
              let borderStyle = '1px solid rgba(255, 255, 255, 0.2)';
              let bgStyle = 'rgba(30, 41, 59, 0.4)';
              let textColor = '#cbd5e1';
              
              if (encontrada) {
                borderStyle = carta.encontradaPor === 0 ? '2px solid #3b82f6' : '2px solid #ec4899';
                bgStyle = carta.encontradaPor === 0 ? 'rgba(59, 130, 246, 0.15)' : 'rgba(236, 72, 153, 0.15)';
                textColor = carta.encontradaPor === 0 ? '#93c5fd' : '#f9a8d4';
              } else if (selecionada) {
                borderStyle = '2px solid #a78bfa';
                bgStyle = 'rgba(139, 92, 246, 0.25)';
                textColor = '#ffffff';
              } else {
                if (carta.tipo && carta.tipo.startsWith('surpresa-')) {
                  // Qualquer carta surpresa exibe borda dourada/laranja neon e fundo premium no moderador
                  borderStyle = '2px solid #f59e0b';
                  bgStyle = 'rgba(245, 158, 11, 0.15)';
                  textColor = '#fef08a';
                } else if (carta.tipo === 'pergunta') {
                  borderStyle = '1.5px solid rgba(59, 130, 246, 0.5)';
                  bgStyle = 'rgba(59, 130, 246, 0.05)';
                  textColor = '#93c5fd';
                } else if (carta.tipo === 'resposta') {
                  borderStyle = '1.5px solid rgba(16, 185, 129, 0.5)';
                  bgStyle = 'rgba(16, 185, 129, 0.05)';
                  textColor = '#6ee7b7';
                }
              }

              return (
                <div 
                  key={carta.id} 
                  onClick={() => virarCartaMemoria(idx)}
                  className={`card-moderador ${encontrada ? 'desabilitada' : ''}`}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: borderStyle,
                    background: bgStyle,
                    borderRadius: '8px',
                    padding: '4px',
                    cursor: encontrada ? 'default' : 'pointer',
                    userSelect: 'none',
                    textAlign: 'center',
                    transition: 'all 0.2s',
                    opacity: encontrada ? 0.45 : 1,
                    position: 'relative',
                    minHeight: 0,
                    boxSizing: 'border-box'
                  }}
                >
                  {/* Imagem de Fundo para Moderação (Mais Visível!) */}
                  {carta.imagem && (
                    <img 
                      src={carta.imagem} 
                      alt="Ilustração" 
                      style={{ 
                        position: 'absolute', 
                        top: 0, 
                        left: 0, 
                        width: '100%', 
                        height: '100%', 
                        objectFit: 'cover', 
                        opacity: encontrada ? 0.25 : 0.65, 
                        pointerEvents: 'none', 
                        borderRadius: '6px' 
                      }}
                    />
                  )}

                  {/* Etiqueta compacta para o moderador no topo */}
                  <div style={{ 
                    position: 'absolute', 
                    top: '4px', 
                    left: '4px', 
                    right: '4px', 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    zIndex: 2, 
                    background: 'rgba(15, 23, 42, 0.8)', 
                    padding: '2px 5px', 
                    borderRadius: '4px', 
                    fontSize: '0.55rem', 
                    fontWeight: 'bold', 
                    color: '#fff',
                    border: '1px solid rgba(255,255,255,0.1)',
                    alignItems: 'center'
                  }}>
                    <span style={{ color: carta.parId >= 0 ? '#cbd5e1' : '#fbbf24' }}>
                      {carta.parId >= 0 ? `PAR ${carta.parId + 1}` : 'SURPRESA'}
                    </span>
                    <span style={{ background: '#3b82f6', color: '#fff', padding: '1px 4px', borderRadius: '3px', fontSize: '0.55rem', fontWeight: 900 }}>
                      {idx + 1}
                    </span>
                  </div>
                  
                  {/* Indicador de carta aberta no projetor */}
                  {carta.aberta && !encontrada && (
                    <span style={{ fontSize: '0.55rem', fontWeight: 800, background: '#ef4444', color: '#fff', borderRadius: '4px', padding: '1px 4px', position: 'absolute', bottom: '3px', transform: 'scale(0.95)' }}>
                      VIRADA
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Barra inferior */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px', flexShrink: 0 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            <span style={{ fontSize: '0.8rem', color: '#9ca3af' }}>Matéria: <strong style={{ color: '#fff' }}>{memoMateria}</strong></span>
            <span style={{ fontSize: '0.75rem', color: '#9ca3af' }}>Dica: Você (Moderador) vê tudo em segredo. As cartas viradas aparecem na tela do projetor para os alunos.</span>
          </div>
          <button className="btn-start" style={{ background: 'linear-gradient(90deg, #374151, #4b5563)', padding: '10px 24px', fontSize: '0.9rem', boxShadow: 'none' }} onClick={() => { if(confirm('Deseja mesmo abandonar o Jogo da Memória?')) irParaTela('menu'); }}>
            Abandonar Partida 🚪
          </button>
        </div>
      </div>

      {/* 18. TELA DE PROJEÇÃO DO JOGO DA MEMÓRIA (TELA DOS ALUNOS) */}
      <div id="tela-memo-projetor" className={`tela ${tela === 'memo-projetor' ? 'ativa' : ''}`} style={{ background: 'radial-gradient(circle at 50% 50%, #0c0824 0%, #020108 100%)', height: '100vh', width: '100vw', padding: 0, boxSizing: 'border-box', position: 'relative', display: tela === 'memo-projetor' ? 'flex' : 'none', flexDirection: 'column', alignItems: 'stretch', justifyContent: 'flex-start', overflow: 'hidden' }}>
        
        {/* POP-UP GIGACHAD DE AURA POINTS (Meme "Farmar Aura" 🗿🔥) */}
        {memoAuraFeedback && (
          <div 
            style={{ 
              position: 'absolute', 
              top: '50%', 
              left: '50%', 
              transform: 'translate(-50%, -50%)', 
              zIndex: 9999, 
              background: memoAuraFeedback.equipe === 0 ? 'rgba(30, 58, 138, 0.95)' : 'rgba(131, 24, 67, 0.95)', 
              border: `4px solid ${memoAuraFeedback.equipe === 0 ? '#3b82f6' : '#ec4899'}`, 
              borderRadius: '24px', 
              padding: '24px 48px', 
              color: '#fff', 
              fontSize: '2rem', 
              fontWeight: 900, 
              textAlign: 'center', 
              boxShadow: memoAuraFeedback.equipe === 0 ? '0 0 50px rgba(59, 130, 246, 0.8)' : '0 0 50px rgba(236, 72, 153, 0.8)', 
              animation: 'pulse 0.4s ease infinite alternate',
              pointerEvents: 'none',
              whiteSpace: 'nowrap'
            }}
          >
            <div style={{ fontSize: '3.5rem', marginBottom: '8px' }}>🗿🔥⚡</div>
            <div style={{ textTransform: 'uppercase', letterSpacing: '1px', fontSize: '1.6rem' }}>
              {memoAuraFeedback.txt}
            </div>
            <div style={{ fontSize: '1.2rem', color: '#fde047', marginTop: '8px', fontWeight: 800 }}>
              +1000 Aura Points! FARMARAM MUITO! 😎👑
            </div>
          </div>
        )}

        {memoCartas.length > 0 ? (
          <div style={{ width: '100vw', height: '100vh', display: 'flex', overflow: 'hidden', padding: '8px', boxSizing: 'border-box' }}>
            {/* Tabuleiro de Cartas 3D — com escala dinâmica do projetor */}
            <div 
              className="memo-grid"
              style={{ 
                width: '100%', 
                height: '100%',
                transform: `scale(${memoProjetorCartaEscala / 100})`,
                transformOrigin: 'center center',
                transition: 'transform 0.3s ease-out'
              }}
            >
              {memoCartas.map((carta, idx) => {
                const virada = carta.aberta || carta.encontradaPor !== null;
                const encontrada = carta.encontradaPor !== null;
                
                // Classes dinâmicas para as cartas
                let cardTypeClass = '';
                if (encontrada) {
                  cardTypeClass = carta.encontradaPor === 0 ? 'card-encontrada-azul' : 'card-encontrada-rosa';
                } else {
                  if (carta.tipo === 'surpresa-embaralhar') cardTypeClass = 'card-surpresa-embaralhar';
                  else if (carta.tipo === 'surpresa-olho') cardTypeClass = 'card-surpresa-olho';
                  else if (carta.tipo === 'surpresa-ganhar-aura') cardTypeClass = 'card-surpresa-olho';
                  else if (carta.tipo === 'surpresa-perder-aura') cardTypeClass = 'card-surpresa-embaralhar';
                  else if (carta.tipo === 'surpresa-vez-extra') cardTypeClass = 'card-surpresa-olho';
                  else if (carta.tipo === 'pergunta') cardTypeClass = 'card-pergunta';
                  else if (carta.tipo === 'resposta') cardTypeClass = 'card-resposta';
                }

                // Efeito de redemoinho durante embaralhamento surpresa
                const rolandoEmbaralhar = memoEfeitoAtivo === 'embaralhar' && !encontrada;

                return (
                  <div 
                    key={carta.id} 
                    onClick={() => virarCartaMemoria(idx)}
                    className={`card-3d ${virada ? 'virada' : ''} ${cardTypeClass} ${rolandoEmbaralhar ? 'efeito-redemoinho' : ''}`}
                    style={{ pointerEvents: 'auto', cursor: 'pointer' }}
                  >
                    <div className="card-3d-inner" style={{ pointerEvents: 'none' }}>
                      {/* Verso da carta (Oculta) */}
                      <div className="card-3d-back" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <span style={{ fontSize: '1.6rem', opacity: 0.65 }}>🧠</span>
                        <span style={{ fontSize: '0.95rem', fontWeight: 800, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '1px' }}>
                          {idx + 1}
                        </span>
                      </div>
                      
                      {/* Frente da carta (Aberta / Virada - Com imagem em vez de texto!) */}
                      <div className="card-3d-front" style={{ display: 'flex', flexDirection: 'column', gap: '0', padding: '0', overflow: 'hidden', position: 'relative' }}>
                        {/* Imagem do cartão */}
                        {carta.imagem ? (
                          <img 
                            src={carta.imagem} 
                            alt="Ilustração" 
                            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                          />
                        ) : (
                          /* Fallback se a imagem falhar */
                          <div style={{ fontSize: '2rem' }}>{carta.tipo === 'surpresa-embaralhar' ? '🌪️' : '👁️'}</div>
                        )}
                        
                        {/* Emblema da Equipe se foi encontrada (overlay) */}
                        {encontrada && (
                          <span style={{ fontSize: '0.62rem', fontWeight: 900, background: carta.encontradaPor === 0 ? '#3b82f6' : '#ec4899', color: '#fff', borderRadius: '4px', padding: '2px 6px', position: 'absolute', top: '5px', left: '5px', boxShadow: '0 0 8px rgba(0,0,0,0.5)', zIndex: 2 }}>
                            {carta.encontradaPor === 0 ? nomeJ1 : nomeJ2}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#fff', height: '100%', padding: '40px', boxSizing: 'border-box' }}>
            <div style={{ fontSize: '6rem', marginBottom: '20px', filter: 'drop-shadow(0 0 35px rgba(139, 92, 246, 0.5))', animation: 'pulse 2s infinite' }}>🧠</div>
            <h2 style={{ fontSize: '2.8rem', fontWeight: 900, fontFamily: 'Outfit', background: 'linear-gradient(90deg, #8b5cf6, #3b82f6)', webkitBackgroundClip: 'text', webkitTextFillColor: 'transparent', margin: '0 0 10px', letterSpacing: '-0.5px' }}>Jogo da Memória Pedagógico</h2>
            <p style={{ color: '#c4b5fd', fontSize: '1.2rem', fontWeight: 600, letterSpacing: '1px', textTransform: 'uppercase', margin: '0 0 30px' }}>Painel do Projetor Conectado</p>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '12px', background: 'rgba(255, 255, 255, 0.03)', padding: '14px 28px', borderRadius: '30px', border: '1px solid rgba(139, 92, 246, 0.25)', boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)' }}>
              <span style={{ width: '12px', height: '12px', background: '#8b5cf6', borderRadius: '50%', display: 'inline-block', boxShadow: '0 0 10px #8b5cf6' }} />
              <span style={{ color: '#cbd5e1', fontSize: '0.95rem', fontWeight: 'bold' }}>Aguardando o professor iniciar a partida...</span>
            </div>
          </div>
        )}
      </div>

      {/* 19. TELA DE FIM DE PARTIDA DO JOGO DA MEMÓRIA */}
      <div id="tela-memo-fim" className={`tela ${tela === 'memo-fim' ? 'ativa' : ''}`} style={{ alignItems: 'center', display: tela === 'memo-fim' ? 'flex' : 'none', flexDirection: 'column', justifyContent: 'center', minHeight: '100vh', padding: '20px', boxSizing: 'border-box' }}>
        <div className="trofeu" style={{ filter: 'drop-shadow(0 0 30px rgba(245, 158, 11, 0.5))', fontSize: '6rem', margin: '14px 0' }}>🏆</div>
        <h2 style={{ fontFamily: 'Outfit', letterSpacing: '1.5px', fontSize: '2.2rem', fontWeight: 900 }}>Resultado Final - Jogo da Memória</h2>
        
        <div className="venc-final" style={{ background: 'linear-gradient(135deg, #ffffff 0%, #8b5cf6 50%, #3b82f6 100%)', webkitBackgroundClip: 'text', webkitTextFillColor: 'transparent', textAlign: 'center', fontSize: '1.8rem', fontWeight: 900, margin: '14px 0', fontFamily: 'Outfit' }}>
          {memoPontuacao[0] === memoPontuacao[1] ? (
            `🎉 Empate técnico sensacional! 🤝`
          ) : memoPontuacao[0] > memoPontuacao[1] ? (
            `🎉 ${nomeJ1} é a Campeã! 🏆`
          ) : (
            `🎉 ${nomeJ2} é a Campeã! 🏆`
          )}
        </div>

        <div className="placar-final" style={{ display: 'flex', gap: '24px', alignItems: 'center', margin: '20px 0', background: 'rgba(255,255,255,0.02)', padding: '20px 40px', borderRadius: '18px', border: '1px solid rgba(139, 92, 246, 0.25)' }}>
          <div className="pf-item" style={{ textAlign: 'center' }}>
            <div className="pf-nome" style={{ color: '#60a5fa', fontSize: '1.1rem', fontWeight: 'bold' }}>🔵 {nomeJ1}</div>
            <div className="pf-pts" style={{ color: '#60a5fa', fontSize: '1.75rem', fontWeight: 900 }}>{memoPontuacao[0]} pares</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', color: '#a78bfa', fontSize: '2rem', fontWeight: 800 }}>×</div>
          <div className="pf-item" style={{ textAlign: 'center' }}>
            <div className="pf-nome" style={{ color: '#f472b6', fontSize: '1.1rem', fontWeight: 'bold' }}>🩷 {nomeJ2}</div>
            <div className="pf-pts" style={{ color: '#f472b6', fontSize: '1.75rem', fontWeight: 900 }}>{memoPontuacao[1]} pares</div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap', justifyContent: 'center', marginTop: '20px' }}>
          <button className="btn-start" style={{ background: 'linear-gradient(90deg, #8b5cf6, #3b82f6)', boxShadow: '0 8px 30px rgba(139, 92, 246, 0.45)' }} onClick={() => iniciarPartidaMemoria(memoMateria)}>
            Jogar Novamente 🔄
          </button>
          <button className="btn-start" style={{ background: 'linear-gradient(90deg, #374151, #4b5563)', boxShadow: 'none' }} onClick={() => irParaTela('menu')}>
            Voltar ao Menu 🏠
          </button>
        </div>
      </div>


    </div>
  );
}
