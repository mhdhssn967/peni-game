import './App.css'
import GameCanvas from './components/GameCanvas.jsx'

function App() {
  return (
    <div className="game-app">
      <div className="background-glow" />
      <div className="phone-wrapper">
        <div className="phone-speaker" />
        <div className="phone-volume-btn up" />
        <div className="phone-volume-btn down" />
        <div className="phone-power-btn" />

        <div className="phone-screen">
          <GameCanvas gameState="playing" />
        </div>
      </div>
    </div>
  )
}

export default App
