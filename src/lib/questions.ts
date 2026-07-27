import type { Skill, TestType } from "./store";

// ─── Legacy Question type (kept for compatibility) ────────────────────────────

export interface Question {
  id: number;
  prompt: string;
  options: string[];
  correct: number;
  code?: string;
  scenario?: string;
}

// Re-export AIQuestion from openrouter for convenience
export type { AIQuestion } from "./openrouter";

// ─── Static fallback questions (used if AI generation fails) ─────────────────

const base = (skill: Skill): Question[] => {
  const lang =
    skill === "java"
      ? "Java"
      : skill === "python"
        ? "Python"
        : skill === "cpp"
          ? "C++"
          : skill === "flutter"
            ? "Flutter/Dart"
            : skill === "react"
              ? "React"
              : skill === "nodejs"
                ? "Node.js"
                : skill === "ai"
                  ? "AI"
                  : skill === "ml"
                    ? "Machine Learning"
                    : "Data Science";
  return [
    {
      id: 1,
      prompt: `Which of the following is the correct time complexity of binary search?`,
      options: ["O(n)", "O(log n)", "O(n log n)", "O(1)"],
      correct: 1,
    },
    {
      id: 2,
      prompt: `In ${lang}, which data structure offers O(1) average lookup?`,
      options: ["Array", "Linked List", "Hash Map", "Binary Tree"],
      correct: 2,
    },
    {
      id: 3,
      prompt: `What does the SOLID 'S' stand for?`,
      options: ["Single Responsibility", "Simple Interface", "Static Object", "Segregation Layer"],
      correct: 0,
    },
    {
      id: 4,
      prompt: `Which sorting algorithm is stable and O(n log n) worst-case?`,
      options: ["Quick Sort", "Heap Sort", "Merge Sort", "Selection Sort"],
      correct: 2,
    },
    {
      id: 5,
      prompt: `A recursive function without a base case will most likely cause:`,
      options: [
        "Compilation error",
        "Stack overflow",
        "Segmentation fault",
        "Infinite loop that returns",
      ],
      correct: 1,
    },
    {
      id: 6,
      prompt: `Which pattern best decouples object creation?`,
      options: ["Observer", "Factory", "Singleton", "Adapter"],
      correct: 1,
    },
    {
      id: 7,
      prompt: `What is the output of a well-formed unit test?`,
      options: [
        "Deployment logs",
        "A pass/fail assertion result",
        "A new database row",
        "Compiled bytecode",
      ],
      correct: 1,
    },
    {
      id: 8,
      prompt: `Which HTTP status indicates a client-side error?`,
      options: ["200", "301", "404", "500"],
      correct: 2,
    },
    {
      id: 9,
      prompt: `Which is NOT a principle of REST?`,
      options: [
        "Statelessness",
        "Cacheability",
        "Persistent connection per client",
        "Uniform interface",
      ],
      correct: 2,
    },
    {
      id: 10,
      prompt: `In big-O notation, which grows fastest?`,
      options: ["O(n²)", "O(2ⁿ)", "O(n log n)", "O(n!)"],
      correct: 3,
    },
  ];
};

export function getQuestions(skill: Skill, type: TestType): Question[] {
  const qs = base(skill);
  if (type === "vibe") {
    return qs.map((q) => ({
      ...q,
      scenario: `Scenario: You're pair-programming with an AI. ${q.prompt}`,
    }));
  }
  if (type === "experience") {
    return qs.map((q) => ({
      ...q,
      scenario: `Real-world context: On a production incident, ${q.prompt.toLowerCase()}`,
    }));
  }
  return qs.map((q, i) => ({
    ...q,
    code:
      i % 3 === 0
        ? `// ${skill.toUpperCase()} snippet\nfunction solve(x) {\n  return x.map(v => v * 2);\n}`
        : undefined,
  }));
}
