import * as path from "path";
import * as fs from "fs";

export interface Args {
  dir: string;
  dataset: string;
  questions: string;
}

/**
 * Validate user passed arguments, checks wether there are enough, and if the
 * context provided matches what we need: a directory with a `questions.ttl` and a
 * `dataset.ttl` file.
 * @param args the (CLI) args that need to be validated.
 */
export function validateInput(args: string[]): Args {
  if (args.length !== 3) {
    throw new Error("Invalid amount of args.");
  }

  const dir = path.resolve(args[2]);
  if (!fs.existsSync(dir) || !fs.lstatSync(dir).isDirectory()) {
    throw new Error("Data dir does not exists or is not a directory.");
  }

  const dataset = path.join(dir, "dataset.ttl");
  if (!(fs.existsSync(dataset) || !fs.lstatSync(dataset).isFile())) {
    throw new Error("dataset.ttl does not exist in data dir");
  }

  const questions = path.join(dir, "questions.ttl");
  if (!(fs.existsSync(questions) || !fs.lstatSync(questions).isFile())) {
    throw new Error("questions.ttl does not exist in data dir");
  }

  return { dataset, questions, dir };
}

/**
 * Shuffles array in place.
 * @param {Array} a items An array containing the items.
 */
export function shuffle<T>(a: T[]): T[] {
  var j, x, i;
  for (i = a.length - 1; i > 0; i--) {
    j = Math.floor(Math.random() * (i + 1));
    x = a[i];
    a[i] = a[j];
    a[j] = x;
  }
  return a;
}

/**
 * Pick a random item from @param items.
 * @param items the array to pick an item from
 */
export function random<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

/**
 * Inclusive begin and end.
 * @param begin
 * @param end
 */
export function randomBetween(begin: number, end: number): number {
  const min = Math.ceil(begin);
  const max = Math.floor(end);
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
