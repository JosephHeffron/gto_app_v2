import React from 'react';
import GTOPokerTrainer from './GTOPokerTrainer';
import { Analytics } from '@vercel/analytics/react';

function App() {
    return (
        <div className="App">
            <GTOPokerTrainer />
            <Analytics />
        </div>
    );
}

export default App;
