export class PassageHandler {
  wordArray: string[];
  wordTags: NodeListOf<HTMLElement>;
  spanTags: Array<NodeListOf<HTMLSpanElement>>;
  private allWords: string[] = [];
  private wordList: Record<string, string[]> = {};
  private passageCount: number = 0;

  constructor() {
    this.wordArray = [];
    this.wordTags = null as any;
    this.spanTags = [];
    this.loadWordData();
  }

  private async loadWordData(): Promise<void> {
    try {
      const [wordsResponse, wordListResponse] = await Promise.all([
        fetch('/Words.json'),
        fetch('/WordList.json')
      ]);

      this.allWords = await wordsResponse.json();
      const wordListData: string[][] = await wordListResponse.json();

      for (let i = 0; i < 26; i++) {
        const char = String.fromCharCode(65 + i);
        this.wordList[char] = wordListData[i] || [];
      }
    } catch (e) {
      console.error('Failed to load word data:', e);
    }
  }

  public async getPassage(weakestChars: string[] = [], wordCount: number = 50): Promise<void> {
    await this.loadWordData();

    const isAdaptive = this.passageCount >= 2 && weakestChars.length > 0;
    const selectedWords = this.selectWords(isAdaptive, weakestChars, wordCount);

    this.renderPassage(selectedWords);
    this.passageCount++;
  }

  private selectWords(isAdaptive: boolean, weakestChars: string[], wordCount: number): string[] {
    const words: string[] = [];

    if (!isAdaptive || weakestChars.length === 0) {
      for (let i = 0; i < wordCount; i++) {
        const randomIndex = Math.floor(Math.random() * this.allWords.length);
        words.push(this.allWords[randomIndex]);
      }
      return words;
    }

    const adaptiveRatio = 0.6;
    const adaptiveCount = Math.floor(wordCount * adaptiveRatio);
    const randomCount = wordCount - adaptiveCount;

    for (let i = 0; i < adaptiveCount; i++) {
      const char = weakestChars[Math.floor(Math.random() * weakestChars.length)];
      const charWords = this.wordList[char];
      if (charWords && charWords.length > 0) {
        const randomIndex = Math.floor(Math.random() * charWords.length);
        words.push(charWords[randomIndex]);
      } else {
        const randomIndex = Math.floor(Math.random() * this.allWords.length);
        words.push(this.allWords[randomIndex]);
      }
    }

    for (let i = 0; i < randomCount; i++) {
      const randomIndex = Math.floor(Math.random() * this.allWords.length);
      words.push(this.allWords[randomIndex]);
    }

    return this.shuffleArray(words);
  }

  private shuffleArray<T>(array: T[]): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  private renderPassage(words: string[]): void {
    this.wordArray = words;

    let finalHTML = "";
    words.forEach(word => {
      finalHTML += "<word>";
      for (let i = 0; i < word.length; i++)
        finalHTML += "<span>" + word[i] + "</span>";
      finalHTML += "</word><wbr> ";
    });
    finalHTML = finalHTML.substring(0, finalHTML.length - 1);

    const typeText = document.querySelector("#typeText");
    if (typeText) {
      typeText.innerHTML = finalHTML;
      this.wordTags = typeText.querySelectorAll("word");
      this.spanTags = Array<NodeListOf<HTMLSpanElement>>(this.wordTags.length);
      for (let i = 0; i < this.wordTags.length; i++)
        this.spanTags[i] = this.wordTags[i].querySelectorAll("span") as NodeListOf<HTMLSpanElement>;
      this.formatWordTagAsCurrent(0);
    }
  }

  public validateAndFormatWord(wordIndex: number, userInput: string, wordCompleted: boolean): void {
    if (wordIndex >= this.wordTags.length) return;
    const word = this.wordArray[wordIndex];
    const wordTag = this.wordTags[wordIndex];

    this.unformatWordTag(wordIndex);

    if (userInput === word) {
      wordTag.classList.add("correct");
      return;
    } else if (userInput.length < word.length && !wordCompleted) {
      this.wordTags[wordIndex].classList.add("current");
      this.spanTags[wordIndex][userInput.length].classList.add("current");
    }

    if (userInput.length > word.length || (userInput !== word && wordCompleted)) {
      wordTag.classList.add("wrong");
    }

    for (let i = 0; i < word.length; i++) {
      if (i >= userInput.length && !wordCompleted) break;
      if (userInput[i] !== word[i]) {
        this.wordTags[wordIndex].classList.add("wrong");
        this.spanTags[wordIndex][i].classList.add("wrong");
      } else {
        this.spanTags[wordIndex][i].classList.add("correct");
      }
    }
  }

  public formatWordTagAsCurrent(wordIndex: number): void {
    this.wordTags[wordIndex].classList.add("current");
    this.spanTags[wordIndex][0].classList.add("current");
  }

  public unformatWordTag(wordIndex: number): void {
    this.wordTags[wordIndex].classList.value = "";
    this.spanTags[wordIndex].forEach(spanTag => {
      spanTag.classList.value = "";
    });
  }

  public hideWordTagsUntilIndex(wordIndex: number): void {
    for (let i = 0; i <= wordIndex; i++) {
      this.wordTags[i].style.display = "none";
    }
  }

  public isNewLineStarting(wordIndex: number): boolean {
    if (wordIndex + 1 >= this.wordArray.length)
      return true;

    if (this.wordTags[wordIndex].offsetTop < this.wordTags[wordIndex + 1].offsetTop)
      return true;
    else
      return false;
  }

  public scrollToCurrentWord(wordIndex: number): void {
    if (wordIndex >= this.wordTags.length) return;

    const wordTag = this.wordTags[wordIndex];
    const typeText = document.querySelector("#typeText") as HTMLElement;

    if (!typeText || !wordTag) return;

    const lineHeight = wordTag.offsetHeight * 1.8;
    const targetScrollTop = wordTag.offsetTop - lineHeight;

    typeText.scrollTop = Math.max(0, targetScrollTop);
  }
}
