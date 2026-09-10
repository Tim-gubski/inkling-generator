import React, { useState, useEffect, useCallback, useRef } from "react";
import "./ScorecardModal.css";

export interface ScorecardRow {
  guess: string;
  pts: string;
}

export interface ScorecardData {
  yourName: string;
  /** Sum of all four subtotals (2 auto-calculated + 2 manual). Read-only. */
  total: number;
  left: {
    name: string;
    rows: ScorecardRow[];
    /** Auto-calculated sum of this column's Pts. Read-only. */
    subtotalA: number;
    /** Manually entered by the player. */
    subtotalB: string;
  };
  right: {
    name: string;
    rows: ScorecardRow[];
    /** Auto-calculated sum of this column's Pts. Read-only. */
    subtotalA: number;
    /** Manually entered by the player. */
    subtotalB: string;
  };
}

export interface ScorecardModalProps {
  /** Whether the modal is visible. Parent owns this state. */
  isOpen: boolean;
  /** Called when the user asks to close the modal (backdrop click, Esc, close button). */
  onClose: () => void;
  /** Number of Guess/Pts rows per player column. Defaults to 7, matching the original card. */
  numRows?: number;
  /** Optional callback fired with the current form contents whenever something changes. */
  onChange?: (data: ScorecardData) => void;
}

/** Counts alphabetic characters only — spaces, digits, and punctuation don't count as letters. */
const countLetters = (text: string): number => (text.match(/[a-zA-Z]/g) ?? []).length;

/** Sums the Pts column for a set of rows, treating blank/invalid entries as 0. */
const sumPts = (rows: ScorecardRow[]): number =>
  rows.reduce((total, row) => total + (Number(row.pts) || 0), 0);

const emptyRows = (count: number): ScorecardRow[] =>
  Array.from({ length: count }, () => ({ guess: "", pts: "" }));

/** Keeps an existing rows array at the target length, preserving any data already entered. */
const resizeRows = (rows: ScorecardRow[], count: number): ScorecardRow[] => {
  if (rows.length === count) return rows;
  if (rows.length > count) return rows.slice(0, count);
  return [...rows, ...emptyRows(count - rows.length)];
};

const CornerArrow: React.FC<{ flip?: boolean }> = ({ flip }) => (
  <svg
    className={`sc-corner-arrow${flip ? " sc-corner-arrow--flip" : ""}`}
    viewBox="0 0 60 60"
    aria-hidden="true"
  >
    <path
      d="M 6 54 C 6 24, 24 6, 50 6"
      fill="none"
      stroke="currentColor"
      strokeWidth="9"
      strokeLinecap="round"
    />
    <path d="M 34 4 L 54 6 L 46 24 Z" fill="currentColor" />
  </svg>
);

export const ScorecardModal: React.FC<ScorecardModalProps> = ({
  isOpen,
  onClose,
  numRows = 7,
  onChange,
}) => {
  const [yourName, setYourName] = useState("");

  const [leftName, setLeftName] = useState("");
  const [leftRows, setLeftRows] = useState<ScorecardRow[]>(emptyRows(numRows));
  const [leftSubB, setLeftSubB] = useState("");

  const [rightName, setRightName] = useState("");
  const [rightRows, setRightRows] = useState<ScorecardRow[]>(emptyRows(numRows));
  const [rightSubB, setRightSubB] = useState("");

  // Auto-calculated: each column's subtotal A is the sum of its Pts entries,
  // and the grand total is the sum of all four subtotals (2 auto + 2 manual).
  const leftSubA = sumPts(leftRows);
  const rightSubA = sumPts(rightRows);
  const total = leftSubA + (Number(leftSubB) || 0) + rightSubA + (Number(rightSubB) || 0);

  const overlayRef = useRef<HTMLDivElement | null>(null);
  const rafRef = useRef<number>(0);
  const clearConfirmTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // "Clear" requires a second click within a few seconds to confirm, so a
  // stray click doesn't wipe out everything someone just filled in.
  const [confirmingClear, setConfirmingClear] = useState(false);

  // Controls mount/unmount (stays true a beat longer than isOpen so the
  // closing animation has time to play) and the visible flag that drives
  // the slide transform via CSS class.
  const [shouldRender, setShouldRender] = useState(isOpen);
  const [visible, setVisible] = useState(false);

  const CLOSE_ANIMATION_MS = 280;

  useEffect(() => {
    if (isOpen) {
      setShouldRender(true);
      // A single rAF isn't reliably enough delay here: React can commit the
      // "hidden" and "visible" style changes within the same paint, so the
      // browser never actually renders the starting position and the
      // transition gets skipped. Nesting two rAFs guarantees a real paint
      // of the hidden state happens before we flip to visible.
      const raf1 = requestAnimationFrame(() => {
        const raf2 = requestAnimationFrame(() => setVisible(true));
        rafRef.current = raf2;
      });
      rafRef.current = raf1;
      return () => cancelAnimationFrame(rafRef.current);
    }

    setVisible(false);
    setConfirmingClear(false);
    if (clearConfirmTimeoutRef.current) clearTimeout(clearConfirmTimeoutRef.current);
    const timeout = setTimeout(() => setShouldRender(false), CLOSE_ANIMATION_MS);
    return () => clearTimeout(timeout);
  }, [isOpen]);

  // Keep row arrays in sync if numRows changes while preserving existing entries.
  useEffect(() => {
    setLeftRows((prev) => resizeRows(prev, numRows));
    setRightRows((prev) => resizeRows(prev, numRows));
  }, [numRows]);

  // Close on Escape, lock background scroll while mounted (including
  // during the closing animation, so the page doesn't jump underneath it).
  useEffect(() => {
    if (!shouldRender) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKeyDown);

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [shouldRender, onClose]);

  // Report changes upward, if requested.
  useEffect(() => {
    if (!onChange) return;
    onChange({
      yourName,
      total,
      left: { name: leftName, rows: leftRows, subtotalA: leftSubA, subtotalB: leftSubB },
      right: { name: rightName, rows: rightRows, subtotalA: rightSubA, subtotalB: rightSubB },
    });
  }, [
    yourName,
    total,
    leftName,
    leftRows,
    leftSubA,
    leftSubB,
    rightName,
    rightRows,
    rightSubA,
    rightSubB,
    onChange,
  ]);

  const handleOverlayClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (e.target === overlayRef.current) onClose();
    },
    [onClose]
  );

  const clearAllWordsAndScores = useCallback(() => {
    setLeftRows(emptyRows(numRows));
    setRightRows(emptyRows(numRows));
    setLeftSubB("");
    setRightSubB("");
  }, [numRows]);

  const handleClearClick = useCallback(() => {
    if (!confirmingClear) {
      setConfirmingClear(true);
      clearConfirmTimeoutRef.current = setTimeout(() => setConfirmingClear(false), 3000);
      return;
    }
    if (clearConfirmTimeoutRef.current) clearTimeout(clearConfirmTimeoutRef.current);
    setConfirmingClear(false);
    clearAllWordsAndScores();
  }, [confirmingClear, clearAllWordsAndScores]);

  const updateRow = (
    side: "left" | "right",
    index: number,
    field: "guess" | "pts",
    value: string
  ) => {
    const setRows = side === "left" ? setLeftRows : setRightRows;
    setRows((prev) =>
      prev.map((row, i) => (i === index ? { ...row, [field]: value } : row))
    );
  };

  const handlePtsChange = (
    side: "left" | "right",
    index: number,
    raw: string
  ) => {
    // Allow empty string, optional leading minus, and digits only.
    if (raw === "" || /^-?\d*$/.test(raw)) {
      updateRow(side, index, "pts", raw);
    }
  };

  const handleNumericChange = (
    setter: React.Dispatch<React.SetStateAction<string>>,
    raw: string
  ) => {
    if (raw === "" || /^-?\d*$/.test(raw)) {
      setter(raw);
    }
  };

  if (!shouldRender) return null;

  const renderColumn = (side: "left" | "right") => {
    const isLeft = side === "left";
    const name = isLeft ? leftName : rightName;
    const setName = isLeft ? setLeftName : setRightName;
    const rows = isLeft ? leftRows : rightRows;
    const subA = isLeft ? leftSubA : rightSubA;
    const subB = isLeft ? leftSubB : rightSubB;
    const setSubB = isLeft ? setLeftSubB : setRightSubB;

    return (
      <div className="sc-column">
        <div className="sc-column-header">
          <span className="sc-column-label">
            Player {isLeft ? "Left" : "Right"}
          </span>
          <input
            type="text"
            className="sc-name-input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Name"
            aria-label={`Player ${isLeft ? "left" : "right"} name`}
          />
        </div>

        <div className="sc-subheader">
          <span className="sc-subheader-label">Guess</span>
          <span className="sc-subheader-line" aria-hidden="true" />
          <span className="sc-subheader-label sc-subheader-label--letters">
            #
          </span>
          <span className="sc-subheader-label sc-subheader-label--pts">Pts</span>
        </div>

        <div className="sc-rows">
          {rows.map((row, i) => (
            <div className="sc-row" key={i}>
              <input
                type="text"
                className="sc-guess-input"
                value={row.guess}
                onChange={(e) => updateRow(side, i, "guess", e.target.value)}
                aria-label={`Player ${isLeft ? "left" : "right"} guess ${i + 1}`}
              />
              <input
                type="text"
                readOnly
                tabIndex={-1}
                className="sc-letters-input"
                value={countLetters(row.guess)}
                aria-label={`Player ${isLeft ? "left" : "right"} letter count ${i + 1}`}
              />
              <input
                type="text"
                inputMode="numeric"
                className="sc-pts-input"
                value={row.pts}
                onChange={(e) => handlePtsChange(side, i, e.target.value)}
                aria-label={`Player ${isLeft ? "left" : "right"} points ${i + 1}`}
              />
            </div>
          ))}
        </div>

        <div className={`sc-subtotal-row sc-subtotal-row--${side}`}>
          <input
            type="text"
            readOnly
            tabIndex={-1}
            className="sc-subtotal-input sc-subtotal-input--auto"
            value={subA}
            title="Automatically calculated: sum of this column's Pts"
            aria-label={`Player ${isLeft ? "left" : "right"} subtotal A (auto-calculated)`}
          />
          <span className="sc-plus">+</span>
          <input
            type="text"
            inputMode="numeric"
            className="sc-subtotal-input"
            value={subB}
            onChange={(e) => handleNumericChange(setSubB, e.target.value)}
            aria-label={`Player ${isLeft ? "left" : "right"} subtotal B`}
          />
        </div>
      </div>
    );
  };

  return (
    <div
      className={`sc-overlay${visible ? " sc-overlay--visible" : ""}`}
      ref={overlayRef}
      onMouseDown={handleOverlayClick}
      role="presentation"
    >
      <div
        className={`sc-card${visible ? " sc-card--visible" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-label="Scorecard"
      >
        <button
          type="button"
          className={`sc-clear-btn${confirmingClear ? " sc-clear-btn--confirm" : ""}`}
          onClick={handleClearClick}
          aria-label={
            confirmingClear
              ? "Click again to confirm clearing all guesses and points"
              : "Clear all guesses and points"
          }
        >
          {confirmingClear ? "Sure?" : "Clear"}
        </button>

        <button
          type="button"
          className="sc-close-btn"
          onClick={onClose}
          aria-label="Close scorecard"
        >
          &times;
        </button>

        <div className="sc-torn-edge" aria-hidden="true" />

        <div className="sc-body">
          <CornerArrow />
          <CornerArrow flip />

          <div className="sc-columns">
            {renderColumn("left")}
            <div className="sc-center-divider" aria-hidden="true" />
            {renderColumn("right")}
          </div>
        </div>

        <div className="sc-footer">
          <label className="sc-footer-name">
            <span className="sc-footer-label">
              Your
              <br />
              Name
            </span>
            <input
              type="text"
              className="sc-footer-input sc-footer-input--name"
              value={yourName}
              onChange={(e) => setYourName(e.target.value)}
              aria-label="Your name"
            />
          </label>

          <label className="sc-footer-total">
            <span className="sc-footer-label">Total</span>
            <input
              type="text"
              readOnly
              tabIndex={-1}
              className="sc-footer-input sc-footer-input--total"
              value={total}
              title="Automatically calculated: sum of all four subtotals"
              aria-label="Total (auto-calculated)"
            />
          </label>
        </div>
      </div>
    </div>
  );
};

export default ScorecardModal;
