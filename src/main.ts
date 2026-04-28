import { PassageHandler } from './PassageHandler.js';
import { PassageStatistics, PassageResult } from './PassageStatistics.js';
import { SessionTracker } from './SessionTracker.js';

const passageHandler = new PassageHandler();
const sessionTracker = new SessionTracker();

let typeTextBox: HTMLInputElement;
let wordIndex: number = 0;
let lastInput: string = "";
let timePressed: Array<Array<number>> = [];
let startingTime: number = -1;
let passageCount: number = 0;
let isViewingResults: boolean = false;

async function initialize(): Promise<void> {
  typeTextBox = document.querySelector("#typeTextBox") as HTMLInputElement;


  if (!typeTextBox) {
    console.error('Type textbox not found');
    return;
  }

  generateCharList();
  resetTimePressedArray();

  typeTextBox.addEventListener("input", onInput);

  await loadNewPassage();

  window.addEventListener('keydown', (e) => {
    if (isViewingResults) return;

    if (e.key === 'Tab') {
      e.preventDefault();
      typeTextBox.focus();
    }
  });
}

function generateCharList(): void {
  const charList = document.getElementById("charList");
  if (!charList) return;

  charList.innerHTML = '';
  for (let i = 0; i < 26; i++) {
    const char = String.fromCharCode(65 + i);
    const charDiv = document.createElement("div");
    charDiv.className = "char";
    charDiv.textContent = char;
    charDiv.addEventListener("click", () => {
      updateCharStatsDisplay(i);
    });
    charList.appendChild(charDiv);
  }
}

async function loadNewPassage(): Promise<void> {
  const weakestChars = sessionTracker.getWeakestChars(3);
  await passageHandler.getPassage(weakestChars);

  wordIndex = 0;
  lastInput = "";
  startingTime = -1;
  typeTextBox.value = "";
  resetTimePressedArray();

  hideResults();
  typeTextBox.focus();
}

function onInput(e: Event): void {
  if (isViewingResults) return;

  const currentTime: number = Date.now();
  const target = e.target as HTMLInputElement;
  const userInput: string = target.value;

  if (wordIndex >= passageHandler.wordArray.length) {
    finishPassage();
    return;
  }

  if (userInput === lastInput) return;
  else if (userInput === "") {
    passageHandler.unformatWordTag(wordIndex);
    passageHandler.formatWordTagAsCurrent(wordIndex);
    timePressed[wordIndex] = Array<number>(passageHandler.wordArray[wordIndex].length);
    return;
  }

  if (startingTime === -1) startingTime = currentTime;

  if (target.value[target.value.length - 1] === " ") {
    for (let i = userInput.length; i < passageHandler.wordArray[wordIndex].length; i++) {
      timePressed[wordIndex][i] = undefined as any;
    }

    if (wordIndex >= passageHandler.wordArray.length - 1 || passageHandler.isNewLineStarting(wordIndex)) {
      passageHandler.hideWordTagsUntilIndex(wordIndex);
      target.value = "";
    }

    moveToNextWord(userInput.substr(0, userInput.length - 1));
  } else {
    passageHandler.validateAndFormatWord(wordIndex, userInput, false);

    const selectionStart = target.selectionStart ?? 0;
    const charIndex = selectionStart - 1;
    if (selectionStart !== userInput.length) {
      if (userInput.length < lastInput.length) {
        shiftValuesToLeft(charIndex);
      } else if (userInput.length > lastInput.length) {
        shiftValuesToRight(charIndex);
      }
    }

    if (charIndex < passageHandler.wordArray[wordIndex].length && lastInput.length <= userInput.length) {
      timePressed[wordIndex][charIndex] = currentTime;
    }

    for (let i = userInput.length; i < passageHandler.wordArray[wordIndex].length; i++) {
      timePressed[wordIndex][i] = undefined as any;
    }

    lastInput = userInput;
  }
}

function resetTimePressedArray(): void {
  timePressed = [];
  for (let i = 0; i < passageHandler.wordArray.length; i++) {
    timePressed[i] = Array<number>(passageHandler.wordArray[i].length);
  }
}

function waitForKeystroke(): Promise<void> {
  return new Promise<void>((resolve) => {
    const handleKeystroke = (e: KeyboardEvent) => {
      e.preventDefault();
      window.removeEventListener('keydown', handleKeystroke);
      resolve();
    };
    window.addEventListener('keydown', handleKeystroke);
  });
}

function shiftValuesToRight(index: number): void {
  for (let i = passageHandler.wordArray[wordIndex].length - 1; i > index; i--)
    timePressed[wordIndex][i] = timePressed[wordIndex][i - 1];
}

function shiftValuesToLeft(index: number): void {
  for (let i = index + 2; i < timePressed[wordIndex].length; i++) {
    timePressed[wordIndex][i - 1] = timePressed[wordIndex][i];
  }
}

function moveToNextWord(userInput: string): void {
  passageHandler.unformatWordTag(wordIndex);
  passageHandler.validateAndFormatWord(wordIndex, userInput, true);

  typeTextBox.value = "";
  lastInput = "";

  wordIndex++;
  if (wordIndex >= passageHandler.wordTags.length) return;

  passageHandler.formatWordTagAsCurrent(wordIndex);
}

async function finishPassage(): Promise<void> {
  const passageStats = new PassageStatistics(passageHandler.wordTags, passageHandler.spanTags, startingTime, timePressed);
  const passageResult = passageStats.getStatistics();

  if (passageResult) {
    displayResults(passageResult);
    sessionTracker.recordPassage(passageResult.correctChars, passageResult.wrongChars, passageResult.charSpeeds);
    passageCount++;

    isViewingResults = true;
    typeTextBox.disabled = true;

    await waitForKeystroke();

    await hideResultsAndContinue();
  } else {
    await loadNewPassage();
  }
}

function displayResults(passageResult: PassageResult): void {
  document.getElementById("wordSpeed")!.textContent = passageResult.wordSpeed.toString();
  document.getElementById("wordAccuracy")!.textContent = passageResult.wordAccuracy.toString() + "%";
  document.getElementById("correctWords")!.textContent = passageResult.correctWords.toString();
  document.getElementById("wrongWords")!.textContent = passageResult.wrongWords.toString();

  updateCharStatsDisplay(0, passageResult);

  const charList = document.getElementById("charList")!;
  const results = document.getElementById("results")!;

  charList.style.display = "flex";
  results.style.display = "flex";

  requestAnimationFrame(() => {
    charList.classList.add("visible");
    results.classList.add("visible");
  });
}

function updateCharStatsDisplay(charIndex: number, passageResult?: PassageResult): void {
  const charName = String.fromCharCode(65 + charIndex);

  if (passageResult) {
    document.getElementById("charName")!.textContent = charName;
    document.getElementById("charSpeed")!.textContent = passageResult.charSpeeds[charIndex].toString();
    document.getElementById("charAccuracy")!.textContent = passageResult.charAccuracies[charIndex].toString() + "%";
    document.getElementById("correctChars")!.textContent = passageResult.correctChars[charIndex].toString();
    document.getElementById("wrongChars")!.textContent = passageResult.wrongChars[charIndex].toString();
  } else {
    const sessionSummary = sessionTracker.getSessionSummary();
    const charStats = sessionSummary.characterStats.get(charName);

    if (charStats) {
      const total = charStats.correct + charStats.wrong;
      const speed = charStats.correct > 0 ? Math.floor(charStats.correct / (charStats.totalTime / 60000)) : 0;
      const accuracy = total > 0 ? Math.floor((charStats.correct / total) * 100) : 0;

      document.getElementById("charName")!.textContent = charName;
      document.getElementById("charSpeed")!.textContent = speed.toString();
      document.getElementById("charAccuracy")!.textContent = accuracy.toString() + "%";
      document.getElementById("correctChars")!.textContent = charStats.correct.toString();
      document.getElementById("wrongChars")!.textContent = charStats.wrong.toString();
    }
  }
}

function hideResults(): void {
  const charList = document.getElementById("charList")!;
  const results = document.getElementById("results")!;

  charList.classList.remove("visible");
  results.classList.remove("visible");

  setTimeout(() => {
    charList.style.display = "none";
    results.style.display = "none";
  }, 300);
}

async function hideResultsAndContinue(): Promise<void> {
  const charList = document.getElementById("charList")!;
  const results = document.getElementById("results")!;

  charList.classList.remove("visible");
  results.classList.remove("visible");

  await new Promise<void>((resolve) => {
    setTimeout(() => {
      charList.style.display = "none";
      results.style.display = "none";
      resolve();
    }, 300);
  });

  isViewingResults = false;
  typeTextBox.disabled = false;

  await loadNewPassage();
}

document.addEventListener('DOMContentLoaded', initialize);
