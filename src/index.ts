import * as path from "path";
import * as fs from "fs";

import * as rdf from "rdflib";
import { IndexedFormula, Namespace, Query, Node } from "rdflib";

type Graph = IndexedFormula;

const SPARQLToQuery: (
  sparql: string,
  isTest: boolean,
  store: any
) => Query = (rdf as any).SPARQLToQuery;

const queryToSPARQL: (query: Query) => string = (rdf as any).queryToSPARQL;

// @prefix owl: <http://www.w3.org/2002/07/owl#> .
// @prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#> .
// @prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .
// @prefix xsd: <http://www.w3.org/2001/XMLSchema#> .
const RDF = Namespace("http://www.w3.org/1999/02/22-rdf-syntax-ns#");

const FC = Namespace("file:///questions/ontology.ttl#");
const Q = Namespace("file:///questions/questions.ttl#");
const LIT = Namespace("file:///dataset/ontology.ttl#");
const ML = Namespace("file:///dataset/data.ttl#");

// TODO: Join stores together and use 4th argument to specify source
// TODO: Support multiple prompts
// TODO: Add weight to questions?

function main() {
  const [dataset, questions] = validateInput(process.argv);

  const formats = questions.each(undefined, RDF("type"), FC("QuestionFormat"));
  const context = questions.any(undefined, RDF("type"), FC("QuizContext"));
  const prefixes = questions.each(context, FC("hasPrefix"), undefined);
  const prefix = prefixes.map(prefix => `prefix ${prefix}`).join("\n") + "\n";

  // while (true) {
  const format = chooseQuestionFormat(formats);
  const promptFormat = random(questions.each(format, FC("hasPromptFormat")));
  const numOfOptions = parseInt(
    random(questions.each(format, FC("shouldSuggest"))).value,
    10
  );

  // Get possible options for prompts.
  const promptSPARQL = prefix + questions.anyValue(format, FC("hasPrompt"));
  const promptQuery = SPARQLToQuery(promptSPARQL, false, dataset);
  const prompts = dataset.querySync(promptQuery);
  const prompt = random(prompts)["?prompt"];

  // Get answer suggestions / possibilities
  const optionSPARQL = prefix + questions.anyValue(format, FC("hasOptions"));
  const optionsQuery = SPARQLToQuery(optionSPARQL, false, dataset);
  const options = dataset
    .querySync(optionsQuery)
    .map(binding => binding["?answer"]);

  // Get possible correct answers
  const answerSPARQL = prefix + questions.anyValue(format, FC("hasAnswer"));
  const answerQuery = SPARQLToQuery(answerSPARQL, false, dataset);
  answerQuery.pat = answerQuery.pat.substitute({ "?prompt": prompt });
  const answers = dataset
    .querySync(answerQuery)
    .map(binding => binding["?answer"]);

  if (answers.length === 0) {
    throw new Error(
      `No answers could be selected for question format ${format} with prompt ${prompt}`
    );
  }

  const question = constructQuestion(numOfOptions, options, answers as any);
  console.log(prompt);
  console.log(question);
  // }
}

function chooseQuestionFormat(questions: Node[]): Node {
  return random(questions);
}

function random<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

/**
 * This function selects @param numOfOptions entities, of which exactly one is
 * correct, while the other suggested options at least semantically make sense.
 * @param numOfOptions the number of options to suggest to the user
 * @param options the possible options that have the correct type
 * @param answers the answers that are correct
 */
function constructQuestion(
  numOfOptions: number,
  options: Node[],
  answers: Node[]
) {
  const answer = random(answers);
  const actualOptionsSet = new Set(options);
  answers.forEach(correct => {
    actualOptionsSet.delete(correct);
  });
  const actualOptionsArr = Array.from(actualOptionsSet);
  shuffle(actualOptionsArr);

  const suggestions =
    numOfOptions - 1 <= actualOptionsSet.size
      ? actualOptionsArr.slice(0, numOfOptions - 1)
      : actualOptionsArr.slice(0, actualOptionsSet.size);

  return { answer, suggestions };
}

/**
 * Shuffles array in place.
 * @param {Array} a items An array containing the items.
 */
function shuffle<T>(a: T[]): T[] {
  var j, x, i;
  for (i = a.length - 1; i > 0; i--) {
    j = Math.floor(Math.random() * (i + 1));
    x = a[i];
    a[i] = a[j];
    a[j] = x;
  }
  return a;
}

function validateInput(args: string[]): [Graph, Graph] {
  if (args.length !== 3) {
    throw new Error("Invalid amount of args.");
  }

  const dataDir = path.resolve(args[2]);
  if (!fs.existsSync(dataDir) || !fs.lstatSync(dataDir).isDirectory()) {
    throw new Error("Data dir does not exists or is not a directory.");
  }

  const datasetPath = path.join(dataDir, "dataset.ttl");
  const questionsPath = path.join(dataDir, "questions.ttl");

  if (!(fs.existsSync(datasetPath) || !fs.lstatSync(datasetPath).isFile())) {
    throw new Error("dataset.ttl does not exist in data dir");
  }

  if (
    !(fs.existsSync(questionsPath) || !fs.lstatSync(questionsPath).isFile())
  ) {
    throw new Error("questions.ttl does not exist in data dir");
  }

  const dataset = rdf.graph();
  rdf.parse(
    fs.readFileSync(datasetPath).toString(),
    dataset,
    "file:///",
    "text/turtle",
    (err, _) => {
      if (err) {
        console.log(err);
      }
    }
  );

  const questions = rdf.graph();
  rdf.parse(
    fs.readFileSync(questionsPath).toString(),
    questions,
    "file:///",
    "text/turtle",
    (err, _) => {
      if (err) {
        console.log(err);
        throw err;
      }
    }
  );

  return [dataset, questions];
}

main();
