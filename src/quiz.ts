import * as fs from "fs";
import * as path from "path";

import * as rdf from "rdflib";
import { IndexedFormula, Namespace, Query, Node, Bindings } from "rdflib";

import { Args, shuffle, random } from "./util";

// TODO: Join stores together and use 4th argument to specify source
// TODO: Support multiple prompts
// TODO: Add weight to questions?

const OWL = Namespace("http://www.w3.org/2002/07/owl#");
const RDFS = Namespace("http://www.w3.org/2000/01/rdf-schema#");
const XSD = Namespace("http://www.w3.org/2001/XMLSchema#");
const RDF = Namespace("http://www.w3.org/1999/02/22-rdf-syntax-ns#");

const FC = Namespace("file:///questions/ontology.ttl#");
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
  private args: Args;

  private context: Node;
  private formats: Node[];
  private prefixes: Node[];
  private prefix: string;

  constructor(args: Args) {
    this.args = args;

    this.dataset = rdf.graph();
    rdf.parse(
      fs.readFileSync(args.dataset).toString(),
      this.dataset,
      "file:///",
      "text/turtle",
      (err, _) => {
        if (err) {
          console.log(err);
          throw err;
        }
      }
    );

    this.questions = rdf.graph();
    rdf.parse(
      fs.readFileSync(args.questions).toString(),
      this.questions,
      "file:///",
      "text/turtle",
      (err, _) => {
        if (err) {
          console.log(err);
          throw err;
        }
      }
    );

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

  // TODO: Validate all queries
  public getQuestion() {
    const format = random(this.formats);
    const promptFormat = random(
      this.questions.each(format, FC("hasPromptFormat"))
    );
    const numOfOptions = parseInt(
      random(this.questions.each(format, FC("shouldSuggest"))).value,
      10
    );

    const promptSPARQL = this.questions.anyValue(format, FC("hasPrompt"));
    const prompts = this.dataset.querySync(this.querify(promptSPARQL));
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
    const wrongAnswers = new Set(options.filter(o => !new Set(answers).has(o)));
    const possibleSuggestions = Array.from(wrongAnswers);
    shuffle(possibleSuggestions);
    const suggestions =
      numOfOptions - 1 <= wrongAnswers.size
        ? possibleSuggestions.slice(0, numOfOptions - 1)
        : possibleSuggestions.slice(0, wrongAnswers.size);

    return { prompt, answer, suggestions };
  }

  private querify(sparqlQuery: string): Query {
    const sparql = this.prefix + sparqlQuery;
    return SPARQLToQuery(sparql, false, this.dataset);
  }
}

const SPARQLToQuery: (
  sparql: string,
  isTest: boolean,
  store: any
) => Query = (rdf as any).SPARQLToQuery;
