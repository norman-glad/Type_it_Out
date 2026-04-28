export interface CharacterStats {
  correct: number;
  wrong: number;
  totalTime: number;
}

export interface SessionSummary {
  totalCorrect: number;
  totalWrong: number;
  averageWPM: number;
  averageAccuracy: number;
  characterStats: Map<string, CharacterStats>;
}

export class SessionTracker {
  private stats: Map<string, CharacterStats>;
  private storageKey: string;

  constructor() {
    this.stats = new Map();
    this.storageKey = 'typing-session-stats';
    this.loadFromStorage();
  }

  private loadFromStorage(): void {
    try {
      const stored = localStorage.getItem(this.storageKey);
      if (stored) {
        const data = JSON.parse(stored);
        this.stats = new Map(Object.entries(data));
      }
    } catch (e) {
      console.error('Failed to load session stats:', e);
      this.stats = new Map();
    }
  }

  private saveToStorage(): void {
    try {
      const obj: Record<string, CharacterStats> = {};
      this.stats.forEach((value, key) => {
        obj[key] = value;
      });
      localStorage.setItem(this.storageKey, JSON.stringify(obj));
    } catch (e) {
      console.error('Failed to save session stats:', e);
    }
  }

  public recordPassage(correctChars: number[], wrongChars: number[], charSpeeds: number[]): void {
    for (let i = 0; i < 26; i++) {
      const char = String.fromCharCode(65 + i);
      const existing = this.stats.get(char) || { correct: 0, wrong: 0, totalTime: 0 };

      existing.correct += correctChars[i];
      existing.wrong += wrongChars[i];

      if (charSpeeds[i] > 0) {
        existing.totalTime += (60000 / charSpeeds[i]) * (correctChars[i] + wrongChars[i]);
      }

      this.stats.set(char, existing);
    }

    this.saveToStorage();
  }

  public getWeakestChars(count: number = 3): string[] {
    const scores: Array<{ char: string; score: number }> = [];

    this.stats.forEach((stats, char) => {
      const total = stats.correct + stats.wrong;
      let score = 0;

      if (total === 0) {
        score = -1;
      } else {
        const accuracy = stats.correct / total;
        const speed = stats.correct > 0 ? (stats.correct / (stats.totalTime / 60000)) : 0;
        score = accuracy * speed;
      }

      scores.push({ char, score });
    });

    scores.sort((a, b) => a.score - b.score);
    return scores.slice(0, count).map(s => s.char);
  }

  public getSessionSummary(): SessionSummary {
    let totalCorrect = 0;
    let totalWrong = 0;
    const characterStats = new Map<string, CharacterStats>();

    this.stats.forEach((value, char) => {
      characterStats.set(char, { ...value });
      totalCorrect += value.correct;
      totalWrong += value.wrong;
    });

    const total = totalCorrect + totalWrong;
    const averageAccuracy = total > 0 ? (totalCorrect / total) * 100 : 0;

    let totalSpeedSum = 0;
    let speedCount = 0;
    this.stats.forEach((stats) => {
      if (stats.totalTime > 0) {
        const speed = stats.correct / (stats.totalTime / 60000);
        totalSpeedSum += speed;
        speedCount++;
      }
    });
    const averageWPM = speedCount > 0 ? totalSpeedSum / speedCount : 0;

    return {
      totalCorrect,
      totalWrong,
      averageWPM: Math.floor(averageWPM),
      averageAccuracy: Math.floor(averageAccuracy),
      characterStats
    };
  }

  public reset(): void {
    this.stats.clear();
    localStorage.removeItem(this.storageKey);
  }
}
