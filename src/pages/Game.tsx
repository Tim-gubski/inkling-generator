import { useState } from "react";
import wordsByLength from "../assets/wordlist/words-by-length.json";
import "./Game.css";
import GuessModal from "../components/GuessModal";

type WordsByLength = Record<string, string[]>;

const WORD_LENGTHS = ["4", "5", "6", "7", "8", "9"] as const;

const POINTS_BY_LENGTH: Record<(typeof WORD_LENGTHS)[number], number> = {
  "4": 1,
  "5": 1,
  "6": 1,
  "7": 2,
  "8": 2,
  "9": 3,
};

const POINT_TIERS = [1, 2, 3] as const;

function pickRandomWords(): Record<string, string> {
  const picks: Record<string, string> = {};
  for (const length of WORD_LENGTHS) {
    const words = (wordsByLength as WordsByLength)[length];
    picks[length] = words[Math.floor(Math.random() * words.length)];
  }
  return picks;
}

function WordLabel({ word }: { word: string }) {
  const text = word.toUpperCase();

  return (
    <span className="word-list-word">
      <span className="word-list-word-initial">{text[0]}</span>
      {text.slice(1)}
    </span>
  );
}

function Game() {
  const [words, setWords] = useState<Record<string, string> | null>(null);

  return (
    <div className="game">
      <button
        className="counter"
        type="button"
        onClick={() => setWords(pickRandomWords())}
      >
        Pick words
      </button>
      {words && (
        <article className="word-list-card">
          <h2 className="word-list-title">WORD LIST</h2>
          <div className="word-list-sections">
            {POINT_TIERS.map((points) => (
              <section
                className={`word-list-section word-list-section--${points}`}
                key={points}
              >
                <span className="word-list-badge">{points}</span>
                <div className="word-list-words">
                  {WORD_LENGTHS.filter(
                    (length) => POINTS_BY_LENGTH[length] === points,
                  ).map((length) => (
                    <WordLabel key={length} word={words[length]} />
                  ))}
                </div>
              </section>
            ))}
          </div>
        </article>
      )}
      <div>
        <h2>Guesses</h2>
        <h2>&lt;- -&gt;</h2>
        <button>Left</button>
        <button>Right</button>
      </div>
      <GuessModal />
    </div>
  );
}

export default Game;
