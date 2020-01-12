import * as fs from "fs";
import * as path from "path";

import * as rdf from "rdflib";
import {
  IndexedFormula,
  Namespace,
  Query,
  Node,
  Collection,
  Literal
} from "rdflib";

import { Args, shuffle, random, shittyReadTurtleFile } from "./util";

// TODO: Join stores together and use 4th argument to specify source
// TODO: Support multiple prompts
// TODO: Add weight to questions?

const OWL = Namespace("http://www.w3.org/2002/07/owl#");
const RDFS = Namespace("http://www.w3.org/2000/01/rdf-schema#");
const XSD = Namespace("http://www.w3.org/2001/XMLSchema#");
const RDF = Namespace("http://www.w3.org/1999/02/22-rdf-syntax-ns#");

const FC = Namespace("file:///flashcard.ttl#");
const Q = Namespace("file:///questions/questions.ttl#");
const LIT = Namespace("file:///dataset/ontology.ttl#");
const ML = Namespace("file:///dataset/data.ttl#");

/**
 * Type alias for rdflib.IndexedFormula because that's long to type, confusing,
 * and clutters the code. For all our use cases, Graph better reflects the type.
 */
type Graph = IndexedFormula;

export class Quiz {
  private dataset: Graph;
  private questions: Graph;
  private flashcard: Graph;
  private args: Args;

  private context: Node;
  private formats: Node[];
  private prefixes: Node[];
  private prefix: string;

  constructor(args: Args) {
    this.args = args;

    this.dataset = shittyReadTurtleFile(args.dataset);
    this.questions = shittyReadTurtleFile(args.questions);
    this.flashcard = shittyReadTurtleFile("./flashcard.ttl");

    this.context = this.questions.any(
      undefined,
      RDF("type"),
      FC("QuizContext")
    )!; // TODO: Validate

    this.prefixes = this.questions.each(
      this.context,
      FC("hasPrefix"),
      undefined
    );

    this.formats = this.questions.each(null, RDF("type"), FC("QuestionFormat"));

    this.prefix =
      this.prefixes.map(prefix => `prefix ${prefix}`).join("\n") + "\n";
  }

  public name(): string {
    return `./${path.relative(".", this.args.dir)}/`;
  }

  /**
   * This is the 'generator' generating questions.
   */
  // TODO: Validate all queries
  public getQuestion() {
    const format = random(this.formats);
    const numOfOptions = parseInt(
      random(this.questions.each(format, FC("shouldSuggest"))).value,
      10
    );

    const promptSPARQL = this.questions.anyValue(format, FC("hasPrompt"));
    const prompts = this.dataset.querySync(this.querify(promptSPARQL));
    if (prompts.length <= 0) {
      throw new Error(`Couldn't find valid prompts for format ${format}`);
    }
    const prompt = random(prompts)["?prompt"];

    const optionsSPARQL = this.questions.anyValue(format, FC("hasOptions"));
    const options = this.dataset
      .querySync(this.querify(optionsSPARQL))
      .map(binding => binding["?answer"]);

    const answerSPARQL = this.questions.anyValue(format, FC("hasAnswer"));
    const answerQuery = this.querify(answerSPARQL);
    const tmp = console.log; // Save console.log behaviour
    console.log = function() {}; // Disable console.log for the next line cause it's very annoying
    answerQuery.pat = answerQuery.pat.substitute({ "?prompt": prompt });
    console.log = tmp; // Re enable console.log
    const answers = this.dataset
      .querySync(answerQuery)
      .map(binding => binding["?answer"]);

    if (answers.length === 0) {
      throw new Error(
        `No answers could be selected for question format ${format} with prompt ${prompt}`
      );
    }

    const answer = random(answers);
    // TODO: Fix, sometimes doesn't work, e.g. format2 dante 2 times 14 available
    const wrongAnswers = new Set(options.filter(o => !new Set(answers).has(o)));
    const possibleSuggestions = Array.from(wrongAnswers);
    shuffle(possibleSuggestions);
    const suggestions =
      numOfOptions - 1 <= wrongAnswers.size
        ? possibleSuggestions.slice(0, numOfOptions - 1)
        : possibleSuggestions.slice(0, wrongAnswers.size);

    return { format, prompt, answer, suggestions };
  }

  public formatPrompt(questionFormat: Node, prompt: Node): string {
    const promptFormat = random(
      this.questions.each(questionFormat, FC("hasPromptFormat"))
    );
    const label = this.labelify(prompt);
    const segments = (promptFormat as Collection).elements.map(s => s.value);
    segments.splice(1, 0, label);
    return segments.join("");
  }

  public formatOption(questionFormat: Node, option: Node): string {
    return this.labelify(option);
  }

  public formatAnswer(questionFormat: Node, answer: Node): string {
    return this.labelify(answer);
  }

  private querify(sparqlQuery: string): Query {
    const sparql = this.prefix + sparqlQuery;
    return SPARQLToQuery(sparql, false, this.dataset);
  }

  private labelify(node: Node): string {
    const labels = this.dataset
      .each(node, RDF("label"))
      .filter(label => (label as Literal).lang === "nl");
    return labels.length >= 1 ? labels[0].value : node.value;
  }
}

const SPARQLToQuery: (
  sparql: string,
  isTest: boolean,
  store: any
) => Query = (rdf as any).SPARQLToQuery;
