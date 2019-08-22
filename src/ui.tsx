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
    const { answer, suggestions, prompt } = quiz.getQuestion();
    const correct = randomBetween(0, suggestions.length);
    const options = [...suggestions];
    options.splice(correct, 0, answer);

    const onSelect = (item: Item) => {
      if (item.value === "skipped") {
        return onNextQuestion({ answer: "skipped", correct: answer.value });
      }

      if (item.value === correct) {
        return onNextQuestion({ answer: "correct", correct: answer.value });
      }

      return onNextQuestion({ answer: "wrong", correct: answer.value });
    };

    return (
      <Box key={number} flexDirection="column">
        {prompt.value}
        <SelectInput
          items={options
            .map((o, i) => ({
              label: o.value,
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
            <Color red>-- wrong</Color> (answer was {last.correct});
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
