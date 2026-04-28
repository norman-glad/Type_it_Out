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
let toastTimeout: number | null = null;
let wordCount: number = 50;

async function initialize(): Promise<void> {
  typeTextBox = document.querySelector("#typeTextBox") as HTMLInputElement;

  if (!typeTextBox) {
    console.error('Type textbox not found');
    return;
  }

  setupWordCountSelector();
  resetTimePressedArray();
  typeTextBox.addEventListener("input", onInput);

  await loadNewPassage();

  window.addEventListener('keydown', (e) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      typeTextBox.focus();
    }
  });
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

function setupWordCountSelector(): void {
  const buttons = document.querySelectorAll('.wc-btn') as NodeListOf<HTMLButtonElement>;

  buttons.forEach(btn => {
    btn.addEventListener('click', () => {
      const count = parseInt(btn.dataset.count!);
      if (count === wordCount) return;

      wordCount = count;

      buttons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      if (!isViewingResults) {
        loadNewPassage();
      }
    });
  });
}

function generateSortedCharList(passageResult: PassageResult): void {
  const charList = document.getElementById("charList");
  if (!charList) return;

  const charData: Array<{ charIndex: number; char: string; wrongCount: number; accuracy: number }> = [];

  for (let i = 0; i < 26; i++) {
    const char = String.fromCharCode(65 + i);
    const correct = passageResult.correctChars[i];
    const wrong = passageResult.wrongChars[i];
    const total = correct + wrong;
    const accuracy = total > 0 ? (correct / total) * 100 : 100;

    charData.push({ charIndex: i, char, wrongCount: wrong, accuracy });
  }

  charData.sort((a, b) => {
    if (b.wrongCount !== a.wrongCount) {
      return b.wrongCount - a.wrongCount;
    }
    return a.accuracy - b.accuracy;
  });

  charList.innerHTML = '';
  charData.forEach(({ charIndex, char, wrongCount, accuracy }) => {
    const charDiv = document.createElement("div");
    charDiv.className = "char";

    if (wrongCount > 0 && accuracy < 70) {
      charDiv.classList.add("char-worst");
    } else if (wrongCount > 0 && accuracy < 90) {
      charDiv.classList.add("char-mid");
    } else {
      charDiv.classList.add("char-good");
    }

    charDiv.textContent = char;
    charDiv.addEventListener("click", () => {
      updateCharStatsDisplay(charIndex, passageResult);
    });
    charList.appendChild(charDiv);
  });
}

function showToast(message: string): void {
  const toast = document.getElementById("toast");
  if (!toast) return;

  toast.textContent = message;
  toast.classList.add("visible");

  if (toastTimeout) {
    clearTimeout(toastTimeout);
  }

  toastTimeout = window.setTimeout(() => {
    toast.classList.remove("visible");
    toastTimeout = null;
  }, 2000);
}

function hideToast(): void {
  const toast = document.getElementById("toast");
  if (!toast) return;

  toast.classList.remove("visible");

  if (toastTimeout) {
    clearTimeout(toastTimeout);
    toastTimeout = null;
  }
}

async function loadNewPassage(): Promise<void> {
  const weakestChars = sessionTracker.getWeakestChars(3);
  await passageHandler.getPassage(weakestChars, wordCount);

  wordIndex = 0;
  lastInput = "";
  startingTime = -1;
  typeTextBox.value = "";
  resetTimePressedArray();

  hideResults();
  showTypingPlace();
  typeTextBox.focus();
}

function waitForKeystroke(): Promise<void> {
  return new Promise<void>((resolve) => {
    const handleKeystroke = (e: KeyboardEvent) => {
      if (e.key === " ") {
        e.preventDefault();
        window.removeEventListener('keydown', handleKeystroke);
        resolve();
      }
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
  if (wordIndex >= passageHandler.wordTags.length) {
    finishPassage();
    return;
  }

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

  generateSortedCharList(passageResult);
  updateCharStatsDisplay(0, passageResult);
  showToast("Press spacebar to continue");

  hideTypingPlace();

  const charList = document.getElementById("charList")!;
  const results = document.getElementById("results")!;

  charList.style.display = "flex";
  results.style.display = "flex";

  requestAnimationFrame(() => {
    charList.classList.add("visible");
    results.classList.add("visible");
  });
}

function updateCharStatsDisplay(charIndex: number, passageResult: PassageResult): void {
  const charName = String.fromCharCode(65 + charIndex);

  document.getElementById("charName")!.textContent = charName;
  document.getElementById("charSpeed")!.textContent = passageResult.charSpeeds[charIndex].toString();
  document.getElementById("charAccuracy")!.textContent = passageResult.charAccuracies[charIndex].toString() + "%";
  document.getElementById("correctChars")!.textContent = passageResult.correctChars[charIndex].toString();
  document.getElementById("wrongChars")!.textContent = passageResult.wrongChars[charIndex].toString();
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

function showTypingPlace(): void {
  const typingPlace = document.getElementById("typingPlace")!;
  typingPlace.classList.remove("hidden");
}

function hideTypingPlace(): void {
  const typingPlace = document.getElementById("typingPlace")!;
  typingPlace.classList.add("hidden");
}

async function hideResultsAndContinue(): Promise<void> {
  hideToast();

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
  showTypingPlace();

  await loadNewPassage();
}

document.addEventListener('DOMContentLoaded', initialize);
