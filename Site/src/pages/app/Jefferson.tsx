import { useState, useEffect } from "react";
import "./Jefferson.css";

const FRASES_GOTICAS = [
  "No breu da noite, o Monster branco clareia a minha alma.",
  "Mais um chamado resolvido, mais um gole de trevas geladas.",
  "Góticas suaves não choram, elas tomam Monster sem açúcar.",
  "Dizem que o amor é cego, mas o meu Monster branco é perfeitamente visível.",
  "Nem toda alma sombria habita castelos; algumas estão no suporte atendendo clientes.",
  "Sob a luz do luar, a lata gelada brilha como prata na escuridão.",
  "Góticas e Monster: a única combinação estável neste universo caótico.",
  "A noite é longa, mas o Monster branco é infinito.",
  "Bebendo Monster branco e esperando a chuva ácida começar.",
  "Enquanto o mundo desmorona, meu ping continua baixo e meu Monster gelado.",
  "Minhas roupas são pretas, mas a lata do meu Monster é branca como o meu fantasma de estimação.",
  "Suporte de TI das trevas: reiniciamos sua ONU e invocamos demônios em portas lógicas.",
  "Alguns seguem a luz, eu sigo o roteador que está piscando em vermelho.",
  "Gótica rabugenta: especialista em fibra óptica e rituais de reativação de sinal.",
];

export default function Jefferson() {
  const [contador, setContador] = useState(() => {
    return Number(localStorage.getItem("jefferson-monster-count") || 0);
  });
  const [frase, setFrase] = useState(FRASES_GOTICAS[0]);
  const [bats, setBats] = useState<{ id: number; left: number; top: number; delay: number; duration: number }[]>([]);

  useEffect(() => {
    localStorage.setItem("jefferson-monster-count", contador.toString());
  }, [contador]);

  // Inicializa morcegos com posições aleatórias
  useEffect(() => {
    const newBats = Array.from({ length: 8 }).map((_, i) => ({
      id: i,
      left: Math.random() * 90 + 5, // 5% a 95%
      top: Math.random() * 80 + 10,
      delay: Math.random() * 5,
      duration: 6 + Math.random() * 6, // 6s a 12s
    }));
    setBats(newBats);
  }, []);

  const gerarNovaFrase = () => {
    const disponiveis = FRASES_GOTICAS.filter(f => f !== frase);
    const aleatoria = disponiveis[Math.floor(Math.random() * disponiveis.length)];
    setFrase(aleatoria);
  };

  return (
    <div className="jefferson-page">
      {/* Morcegos de fundo */}
      {bats.map(bat => (
        <div 
          key={bat.id}
          className="jeff-bat"
          style={{
            left: `${bat.left}%`,
            top: `${bat.top}%`,
            animationDelay: `${bat.delay}s`,
            animationDuration: `${bat.duration}s`
          }}
        >
          🦇
        </div>
      ))}
      <div className="jeff-header">
        <h1 className="jeff-title">🦇 Área Secreta do Jefferson</h1>
        <p className="jeff-subtitle">Goticas & Monster Branco: O Templo Supremo</p>
      </div>

      <div className="jeff-grid">
        {/* Card de Imagem */}
        <div className="jeff-card img-card">
          <div className="jeff-img-wrapper">
            <img 
              src="/ati/goticas_monster.png" 
              alt="Gótica com Monster Branco" 
              className="jeff-main-img" 
            />
          </div>
          <span className="jeff-img-caption">Arte Oficial Jefferson Mode v1.0</span>
        </div>

        {/* Card Interativo */}
        <div className="jeff-card ctrl-card">
          <div className="jeff-section">
            <h2 className="jeff-card-title">🥤 Contador de Monster (Sem Açúcar)</h2>
            <p className="jeff-desc">Acompanhe a sua cota diária de energia das trevas:</p>
            <div className="jeff-counter-wrap">
              <button 
                className="counter-btn minus" 
                onClick={() => setContador(prev => Math.max(0, prev - 1))}
              >
                -
              </button>
              <span className="counter-val">{contador}</span>
              <button 
                className="counter-btn plus" 
                onClick={() => setContador(prev => prev + 1)}
              >
                +
              </button>
            </div>
            <span className="counter-msg">
              {contador === 0 ? "⚠️ Nível de energia crítico. Compre um Monster!" : 
               contador <= 2 ? "🟢 Energia sob controle." : 
               contador <= 4 ? "🟡 Cuidado com a taquicardia!" : 
               "🔴 Modo Deus das Trevas ativado."}
            </span>
          </div>

          <div className="jeff-divider" />

          <div className="jeff-section">
            <h2 className="jeff-card-title">🕯️ Sabedoria Obscura</h2>
            <div className="jeff-quote-box">
              <p className="jeff-quote">"{frase}"</p>
            </div>
            <button className="jeff-btn-gerar" onClick={gerarNovaFrase}>
              ⚡ Invocar Nova Frase
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
