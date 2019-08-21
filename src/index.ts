import * as path from "path";
import * as fs from "fs";

import * as rdf from "rdflib";
import { IndexedFormula } from "rdflib";

type Graph = IndexedFormula;

function main() {
  const [dataset, questions] = validateInput(process.argv);

  dataset.statementsMatching(undefined, undefined, undefined).forEach(node => {
    console.log(node);
  });
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
    dataset,
    "file:///",
    "text/turtle",
    (err, _) => {
      if (err) {
        console.log(err);
      }
    }
  );

  return [dataset, questions];
}

main();
