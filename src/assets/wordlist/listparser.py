import json
from pathlib import Path

WORDLIST_PATH = Path(__file__).parent / "google-10000-english-usa.txt"
OUTPUT_PATH = Path(__file__).parent / "words-by-length.json"
MIN_LENGTH = 4
MAX_LENGTH = 9


def load_words_by_length(
    min_length: int = MIN_LENGTH,
    max_length: int = MAX_LENGTH,
) -> dict[int, list[str]]:
    words_by_length: dict[int, list[str]] = {}
    with WORDLIST_PATH.open(encoding="utf-8") as f:
        for line in f:
            word = line.strip()
            if not word:
                continue
            length = len(word)
            if length < min_length or length > max_length:
                continue
            words_by_length.setdefault(length, []).append(word)
    return words_by_length


def write_words_json(
    words_by_length: dict[int, list[str]],
    output_path: Path = OUTPUT_PATH,
) -> None:
    with output_path.open("w", encoding="utf-8") as f:
        json.dump(words_by_length, f, indent=2)


words_by_length: dict[int, list[str]] = load_words_by_length()

if __name__ == "__main__":
    write_words_json(words_by_length)
    total = sum(len(words) for words in words_by_length.values())
    print(f"Wrote {total} words across {len(words_by_length)} lengths to {OUTPUT_PATH.name}")
    for length in sorted(words_by_length):
        print(f"  length {length}: {len(words_by_length[length])} words")
