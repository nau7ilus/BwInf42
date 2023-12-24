'use strict';

const w = (a, b) => !(a && b);
const r = (a) => !a;

const QuelleStatus = {};
const Empfaenger = {}

const getBlockPair = (matrix, col, row) => {
  let blockIndex = 0;
  for (let x = 0; x < col; x++) {
    if (matrix[row][x] === 'X') blockIndex = 0;
    else blockIndex = (blockIndex + 1) % 2;
  }
  return blockIndex ? col - 1 : col + 1;
}

const solve = (matrix, x, y) => {
  if (x < 0 || y < 0 || matrix[y][x] === 'X') return false;
  const cell = matrix[y][x];
  if (cell.startsWith("Q")) return QuelleStatus[cell]
  const Actions = {
    B: () => solve(matrix, x, y - 1),
    R: () => r(solve(matrix, x, y - 1)),
    W: () => w(solve(matrix, x, y - 1), solve(matrix, getBlockPair(matrix, x, y), y - 1)),
    r: () => solve(matrix, getBlockPair(matrix, x, y), y),
  }
  return Actions[cell]();
}

process.stdin.on('data', async data => {
  const lines = Buffer.from(data).toString('utf8').split("\n")
  let input = lines.map(e => e.split(/ +/))
  const [col, row] = input.shift().map(e => +e);
  input = input.slice(0, row);

  for (let y = row - 1; y >= 0; y--) {
    for (let x = 0; x < col; x++) {
      const cell = input[y][x];
      if (cell.startsWith("L")) {
        Empfaenger[cell] = () => solve(input, x, y - 1);
      } else if (cell.startsWith("Q")) {
        QuelleStatus[cell] = false;
      }
    }
  }

  const allSources = Object.keys(QuelleStatus)

  const tableHeader = [...allSources, ...Object.keys(Empfaenger)].join("\t")
  console.log(tableHeader)

  for (let i = 0; i < Math.pow(2, allSources.length); i++) {
    for (let j = 0; j < allSources.length; j++) {
      QuelleStatus[allSources[j]] = !!(i & Math.pow(2, j));
    }
    const results = await Promise.all(Object.values(Empfaenger).map(fn => fn()));
    console.log([...Object.values(QuelleStatus), ...results].map(e => e ? "Ein" : "Aus").join('\t'));

  }
})
