export interface PassageResult {
  correctWords: number;
  wrongWords: number;
  wordSpeed: number;
  wordAccuracy: number;
  correctChars: number[];
  wrongChars: number[];
  charSpeeds: number[];
  charAccuracies: number[];
}

export class PassageStatistics {
  private wordTags: NodeListOf<HTMLElement>;
  private spanTags: Array<NodeListOf<HTMLSpanElement>>;
  private startingTime: number;
  private timePressed: Array<Array<number>>;

  constructor(wordTags: NodeListOf<HTMLElement>, spanTags: Array<NodeListOf<HTMLSpanElement>>, startingTime: number, timePressed: Array<Array<number>>) {
    this.wordTags = wordTags;
    this.spanTags = spanTags;
    this.startingTime = startingTime;
    this.timePressed = timePressed;
  }

  public getStatistics(): PassageResult | null {
    if (this.wordTags[0].classList.contains("current")) return null;

    let correctWords: number = 0;
    let wrongWords: number = 0;
    let totalTime: number = 0;

    const correctCharNumber: number[] = this.getNumberArray();
    const wrongCharNumber: number[] = this.getNumberArray();
    const totalTimeChar: number[] = this.getNumberArray();

    let lastTimePressed: number = this.startingTime;

    for (let i = 0; i < this.wordTags.length; i++) {
      const wordTag = this.wordTags[i];
      if (wordTag.classList.contains("current")) break;
      const spanTags = this.spanTags[i];
      const timePressed = this.timePressed[i];

      if (wordTag.classList.contains("correct")) correctWords++;
      else wrongWords++;

      const seenIndexes: number[] = Array(wordTag.textContent.length);
      let currentIndex = this.getSmallestValueIndex(timePressed, seenIndexes);

      while (currentIndex !== -1) {
        const charIndex = this.getCharIndex(wordTag.textContent[currentIndex]);
        if (spanTags[currentIndex].classList.contains("wrong")) wrongCharNumber[charIndex]++;
        else correctCharNumber[charIndex]++;

        const currentTimePressed = timePressed[currentIndex];
        if (currentTimePressed !== null && currentTimePressed !== undefined) {
          const charTimeTaken = currentTimePressed - lastTimePressed;
          totalTime += charTimeTaken;
          totalTimeChar[charIndex] += charTimeTaken;
          lastTimePressed = currentTimePressed;
        }

        seenIndexes.push(currentIndex);
        currentIndex = this.getSmallestValueIndex(timePressed, seenIndexes);
      }
    }

    const passageResult: PassageResult = {
      correctWords: 0,
      wrongWords: 0,
      wordSpeed: 0,
      wordAccuracy: 0,
      correctChars: this.getNumberArray(),
      wrongChars: this.getNumberArray(),
      charSpeeds: this.getNumberArray(),
      charAccuracies: this.getNumberArray()
    };

    let correctChars = 0;
    for (let i = 0; i < this.wordTags.length; i++) {
      const wordTag = this.wordTags[i];
      if (wordTag.classList.contains("current")) break;
      if (wordTag.classList.contains("correct")) correctChars += wordTag.textContent.length + 1;
    }

    const realCorrectWords = Math.floor(correctChars / 5);

    passageResult.wordSpeed = correctWords === 0 ? 0 : Math.floor(realCorrectWords / (totalTime / 60000));
    passageResult.wordAccuracy = Math.floor((correctWords / (wrongWords + correctWords)) * 100);
    passageResult.correctWords = correctWords;
    passageResult.wrongWords = wrongWords;

    for (let i = 0; i < 26; i++) {
      const charSpeed: number = Math.floor(correctCharNumber[i] / (totalTimeChar[i] / 60000));
      const charAccuracy: number = Math.floor((correctCharNumber[i] / (wrongCharNumber[i] + correctCharNumber[i])) * 100);

      passageResult.correctChars[i] = correctCharNumber[i];
      passageResult.wrongChars[i] = wrongCharNumber[i];
      if (correctCharNumber[i] === 0) {
        passageResult.charSpeeds[i] = 0;
        passageResult.charAccuracies[i] = 0;
      } else {
        passageResult.charSpeeds[i] = charSpeed;
        passageResult.charAccuracies[i] = charAccuracy;
      }
    }

    return passageResult;
  }

  private getNumberArray(): number[] {
    const array: number[] = Array(26);
    for (let i = 0; i < array.length; i++) {
      array[i] = 0;
    }
    return array;
  }

  private getCharIndex(char: string): number {
    return char.toUpperCase().charCodeAt(0) - 65;
  }

  private getSmallestValueIndex(searchArray: number[], seenArray: number[]): number {
    let smallestValueIndex: number = -1;

    if (searchArray === null || searchArray === undefined) return smallestValueIndex;

    for (let i = 0; i < searchArray.length; i++) {
      if (seenArray !== undefined && seenArray !== null && seenArray.includes(i)) continue;
      if (searchArray[i] === null || searchArray[i] === undefined) return i;

      if (smallestValueIndex === -1 || searchArray[i] < searchArray[smallestValueIndex]) {
        smallestValueIndex = i;
      }
    }

    return smallestValueIndex;
  }
}
