import { useState } from 'react';
import './App.css';
import GameCanvas from './components/GameCanvas.jsx';

function App() {
  const [hasStarted, setHasStarted] = useState(false);

  const startGame = async () => {
    try {
      if (document.documentElement.requestFullscreen) {
        await document.documentElement.requestFullscreen();
      } else if (document.documentElement.webkitRequestFullscreen) {
        await document.documentElement.webkitRequestFullscreen();
      }
    } catch (err) {
      console.warn("Fullscreen request failed", err);
    }
    setHasStarted(true);
  };

  return (
    <div className="game-app">
      <div className="background-glow" />
      
      {!hasStarted ? (
        <div className="start-screen">
          <h1 className="game-main-title">PENI</h1>
          <h2 className="game-sub-title">ICE CANDY RUNNER</h2>
          <button className="main-play-btn" onClick={startGame}>
            START GAME
          </button>
        </div>
      ) : (
        <div className="fullscreen-game-container">
          <GameCanvas gameState="playing" />
        </div>
      )}
    </div>
  );
}

export default App;
