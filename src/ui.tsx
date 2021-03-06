import React, { Component, Context } from "react";
import { render, Box, Text, Color } from "ink";
import SelectInput, { Item } from "ink-select-input";

import { Quiz } from "./quiz";
import { randomBetween } from "./util";

const QuizContext: Context<Quiz> = React.createContext(null as any);

export function show(quiz: Quiz): void {
  render(
    <QuizContext.Provider value={quiz}>
      <QuizUI />
    </QuizContext.Provider>,
    { debug: false }
  );
}

interface QuizState {
  questionNumber: number;
  questionLog: QuestionStat[];
}

class QuizUI extends Component<{}, QuizState> {
  state: QuizState = {
    questionNumber: 1,
    questionLog: []
  };

  render() {
    const { questionNumber, questionLog } = this.state;
    return (
      <Box flexDirection="column">
        <Welcome />
        <Feedback questionsLog={questionLog} />
        <Stats questionsLog={questionLog} />
        <Question
          number={questionNumber}
          onNextQuestion={this.onNextQuestion}
        />
      </Box>
    );
  }

  onNextQuestion = (stats: QuestionStat) => {
    this.setState({
      questionNumber: this.state.questionNumber + 1,
      questionLog: [...this.state.questionLog, stats]
    });
  };
}

interface QuestionStat {
  answer: "correct" | "wrong" | "skipped";
  correct: any;
}

interface QuestionProps {
  number: number;
  onNextQuestion(stats: QuestionStat): void;
}

class Question extends Component<QuestionProps> {
  static contextType = QuizContext;

  public context!: Quiz;

  public render() {
    const quiz = this.context;
    const { number, onNextQuestion } = this.props;
    const { answer, suggestions, prompt, format } = quiz.getQuestion();
    const correctIndex = randomBetween(0, suggestions.length);
    const options = [...suggestions];
    options.splice(correctIndex, 0, answer);

    const onSelect = (item: Item) => {
      const correct = quiz.formatAnswer(format, answer);
      if (item.value === "skipped") {
        return onNextQuestion({ answer: "skipped", correct });
      }
      if (item.value === correctIndex) {
        return onNextQuestion({ answer: "correct", correct });
      }
      return onNextQuestion({ answer: "wrong", correct });
    };

    return (
      <Box key={number} flexDirection="column">
        <Text italic>{quiz.formatPrompt(format, prompt)}</Text>
        <SelectInput
          items={options
            .map((o, i) => ({
              label: quiz.formatOption(format, o),
              value: i as string | number
            }))
            .concat([{ label: "Skip", value: "skipped" as string | number }])}
          onSelect={onSelect}
        />
      </Box>
    );
  }
}

class Welcome extends Component {
  static contextType = QuizContext;

  public context!: Quiz;

  public render() {
    const quiz = this.context;
    return `## Quizzing you about ${quiz.name()}`;
  }
}

interface FeedbackProps {
  questionsLog: QuestionStat[];
}

class Feedback extends Component<FeedbackProps> {
  public render() {
    const log = this.props.questionsLog;
    if (log.length <= 0) {
      return null;
    }

    const last = log[log.length - 1];
    switch (last.answer) {
      case "wrong":
        return (
          <Box>
            <Color red>-- wrong</Color> (answer was '
            <Text italic>{last.correct}</Text>');
          </Box>
        );
      case "skipped":
        return (
          <Box>
            <Color yellow>-- skipped</Color> (answer was{" "}
            <Text bold>{last.correct}</Text>);
          </Box>
        );
      case "correct":
        return <Color green>-- correct</Color>;
      default:
        return <Color red>Something went wrong!</Color>;
    }
  }
}

interface StatsProps {
  questionsLog: QuestionStat[];
}

class Stats extends Component<StatsProps> {
  static contextType = QuizContext;

  public context!: Quiz;

  public render() {
    const quiz = this.context;
    const log = this.props.questionsLog;
    const amount = log.length;
    const correct = log.filter(q => q.answer === "correct").length;
    const wrong = log.filter(q => q.answer === "wrong").length;
    const skipped = log.filter(q => q.answer === "skipped").length;

    // TODO: Colour green red, orange.
    return (
      <Box flexDirection="column">
        <Text bold={true}>
          -- {amount} questions of which <Color green>{correct} correct</Color>,{" "}
          <Color red>{wrong} wrong</Color>, and{" "}
          <Color yellow>{skipped} skipped</Color>
        </Text>
      </Box>
    );
  }
}
