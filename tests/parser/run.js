const glob = require('glob').sync;
const yaml = require('js-yaml');
const fs = require('fs');
const path = require('path');
const chalk = require('chalk');
const Result = require('folktale/data/result');
const diff = require('deep-diff').diff;

const ast = require('../../furipota/ast');
const Parser = require('../../furipota/parser').FuripotaParser;

// --[ Schema definition for YAML ]-------------------------------------
const Identifier = new yaml.Type('!Identifier', {
  kind: 'scalar',
  construct: ast.Identifier
});

const Keyword = new yaml.Type('!Keyword', {
  kind: 'scalar',
  construct: ast.Keyword
});

const Integer = new yaml.Type('!Integer', {
  kind: 'mapping',
  construct: ({ sign, value }) =>
    ast.Integer(sign, value)
});

const Decimal = new yaml.Type('!Decimal', {
  kind: 'mapping',
  construct: ({ sign, integral, decimal, exponent }) =>
    ast.Decimal(sign, integral, decimal, exponent)
});

const Text = new yaml.Type('!Text', {
  kind: 'scalar',
  construct: ast.Text
});

const Vector = new yaml.Type('!Vector', {
  kind: 'sequence',
  construct: ast.Vector
});

const Record = new yaml.Type('!Record', {
  kind: 'sequence',
  construct: ast.Record
});

const Define = new yaml.Type('!Define', {
  kind: 'mapping',
  construct: ({ id, expression }) => ast.Define(id, expression)
});

const Import = new yaml.Type('!Import', {
  kind: 'mapping',
  construct: ({ path }) => ast.Import(path)
});

const Invoke = new yaml.Type('!Invoke', {
  kind: 'mapping',
  construct: ({ callee, input, options }) => ast.Invoke(callee, input, options)
});

const Partial = new yaml.Type('!Partial', {
  kind: 'mapping',
  construct: ({ callee, options }) => ast.Partial(callee, options)
});

const Pipe = new yaml.Type('!Pipe', {
  kind: 'mapping',
  construct: ({ input, transformation, options }) =>
    ast.Pipe(input, transformation, options)
});

const Variable = new yaml.Type('!Variable', {
  kind: 'mapping',
  construct: ({ id }) => ast.Variable(id)
});

const Program = new yaml.Type('!Program', {
  kind: 'sequence',
  construct: ast.Program
});

const FuripotaSchema = yaml.Schema.create([
  Identifier,
  Keyword,
  Text,
  Integer,
  Decimal,
  Vector,
  Record,
  Define,
  Import,
  Invoke,
  Partial,
  Pipe,
  Variable,
  Program,
]);


// --[ Processing test files ]------------------------------------------
const flatten = (xss) => xss.reduce((a, b) => a.concat(b), []);

const diffToTerm = (actual, expected) => {
  const diffs = diff(actual, expected);
  return flatten(diffs.map(x => {
    const path = (x.path || []).join('.') + ':';
    switch (x.kind) {
      case 'E':
      return [
        chalk.gray(`In ${path}`),
        chalk.green(`  + ${JSON.stringify(x.lhs)}`),
        chalk.red(`  - ${JSON.stringify(x.rhs)}`),
        ''
      ];

      case 'N':
      return [
        chalk.gray(`In ${path}`),
        chalk.red(`  - ${JSON.stringify(x.rhs)}`),
        ''
      ];

      case 'D':
      return [
        chalk.gray(`In ${path}`),
        chalk.green(`  + ${JSON.stringify(x.lhs)}`),
        ''
      ];

      case 'A': switch(x.item.kind) {
        case 'E':
        return [
          chalk.gray(`In ${path}[${x.index}]`),
          chalk.green(`  + ${JSON.stringify(x.lhs)}`),
          chalk.red(`  - ${JSON.stringify(x.rhs)}`),
          ''
        ];

        case 'N':
        return [
          chalk.gray(`In ${path}[${x.index}]`),
          chalk.red(`  - ${JSON.stringify(x.rhs)}`),
          ''
        ];

        case 'D':
        return [
          chalk.gray(`In ${path}[${x.index}]`),
          chalk.green(`  + ${JSON.stringify(x.lhs)}`),
          ''
        ];

        default: return [];
      }

      default: return [];
    }
  }));
};

const parseTest = (text) => {
  const documents = text.split(/^\*\*\*+\s*$/m);
  return documents.map(doc => {
    const [source, metaText] = doc.trimLeft().split(/^---\s*$/m);
    const meta = yaml.load(metaText, { schema: FuripotaSchema });
    return { source, meta };
  });
};

const runTests = (file) => {
  const text = fs.readFileSync(file, 'utf8');
  const tests = parseTest(text);
  return tests.map(({ source, meta }) => {
    try {
      const ast = Parser.matchAll(source, meta.rule || 'Program');
      if (meta.result === 'FAIL') {
        return Result.Error({
          message: 'Expected the parser to fail, but it succeeded.',
          ast: ast
        });
      } else if (meta.result === 'OK' && meta.ast.equals(ast)) {
        return Result.Ok();
      } else {
        return Result.Error({
          message: 'Expected AST and actual AST don’t match',
          expected: meta.ast,
          ast: ast
        });
      }
    } catch (error) {
      if (meta.result === 'FAIL') {
        return Result.Ok();
      } else {
        return Result.Error({
          message: `${error.name}: ${error.message}`,
          stack: error.stack
        });
      }
    }
  });
};


// --[ Running ]--------------------------------------------------------
glob(path.join(__dirname, '**/*.yaml')).forEach((file, i, all) => {
  const relPath = path.relative(__dirname, file);
  const results = runTests(file);
  const failed = results.some(x => Result.Error.hasInstance(x));
  const total = all.length;
  if (failed) {
    console.log(chalk.red(  `[${i + 1}/${total}] ERR  ${relPath}`));
  } else {
    console.log(chalk.green(`[${i + 1}/${total}] OK   ${relPath}`));
  }


  runTests(file).forEach((result, index) => result.matchWith({
    Ok: () => {},

    Error: ({ value: e }) => {
      console.error(chalk.red(`${index})`), chalk.gray(e.message));
      if (e.ast) {
        console.error(chalk.gray('= Actual AST:'));
        console.error(chalk.gray(JSON.stringify(e.ast.toJSON(), null, 2)));
        console.error('');
      }
      if (e.ast && e.expected) {
        console.error(chalk.green('+ ACTUAL'), chalk.red('- EXPECTED'));
        console.error(diffToTerm(e.ast, e.expected).join('\n'));
      }
      console.error('');
    }
  }));
});
