//----------------------------------------------------------------------
//
// This source file is part of the furipota project.
//
// Licensed under MIT. See LICENCE for full licence information.
// See CONTRIBUTORS for the list of contributors to the project.
//
//----------------------------------------------------------------------

const AST = require('./ast');

const needsParenthesis = (ast) =>
  ![
    AST.Identifier, AST.Keyword, AST.Text, AST.Integer, AST.Decimal, 
    AST.Boolean, AST.Record, AST.Vector, AST.Variable, AST.Shell,
    AST.Get, AST.Hole
  ].some(
    x => x.hasInstance(ast)
  );


const p = (ast, depth) =>
  needsParenthesis(ast) ? `(${prettyPrint(ast, depth)})`
: /* otherwise */         prettyPrint(ast, depth);


const prettyPrint = (node, depth = 0) => {
  return node.matchWith({
    Seq: ({ items }) => {
      return items.map(x => prettyPrint(x, depth)).join('\n' + ' '.repeat(depth));
    },

    Identifier: ({ name }) => {
      return name;
    },

    Hole: () => {
      return '_';
    },

    Keyword: ({ name }) => {
      return name + ':';
    },

    Text: ({ value }) => {
      return JSON.stringify(value);
    },

    Interpolate: ({ items }) => {
      return JSON.stringify(items.map(x => prettyPrint(x, depth)));
    },

    Character: ({ character }) => {
      return character;
    },

    InterpolateExpression: ({ expression }) => {
      return `{${prettyPrint(expression, depth)}}`;
    },

    Integer: ({ sign, value }) => {
      return `${sign}${value}`;
    },

    Decimal: ({ sign, integral, decimal, exponent }) => {
      return `${sign}${integral}.${decimal}${exponent || ''}`;
    },

    Boolean: ({ value }) => {
      return String(value);
    },

    Vector: ({ items }) => {
      return '[' + items.map(x => prettyPrint(x, depth)).join(', ') + ']';
    },

    VectorSpread: ({ expression }) => {
      return `...${prettyPrint(expression, depth)}`;
    },

    VectorElement: ({ expression }) => {
      return prettyPrint(expression, depth);
    },

    Record: ({ pairs }) => {
      return '{' + pairs.map(([k, v]) => prettyPrint(k, depth) + ' ' + p(v, depth)).join(' ') + '}';
    },

    Lambda: ({ value, options, expression }) => {
      return `${prettyPrint(value, depth)} @${prettyPrint(options, depth)} -> ${prettyPrint(expression, depth)}`
    },

    Tagged: ({ tag, predicates }) => {
      return `^${prettyPrint(tag, depth)} ${predicates.map(x => p(x, depth))}`;
    },

    Match: ({ expression, cases }) => {
      const pad = ' '.repeat(depth + 2);
      return `match ${prettyPrint(expression, depth)} with\n${pad}${cases.map(x => prettyPrint(x, depth + 2)).join('\n' + pad)}`;
    },

    MatchCase: ({ pattern, expression }) => {
      return `case ${prettyPrint(pattern, depth)} then ${p(expression, depth)}`;
    },

    MatchBind: ({ identifier }) => {
      return prettyPrint(identifier, depth);
    },

    MatchEquals: ({ identifier, expression }) => {
      return `${prettyPrint(identifier, depth)} if ${p(expression, depth)}`;
    },

    MatchTagged: ({ tag, patterns }) => {
      return `^${p(tag, depth)} ${patterns.map(x => p(x, depth)).join(' ')}`;
    },

    MatchVector: ({ items }) => {
      return `[${items.map(x => p(x, depth)).join(', ')}]`;
    },

    MatchVectorSpread: ({ pattern }) => {
      return `...${prettyPrint(pattern, depth)}`;
    },

    MatchVectorElement: ({ pattern }) => {
      return prettyPrint(pattern, depth);
    },

    MatchAny: () => {
      return '_';
    },

    Define: ({ id, expression }) => {
      return 'define ' + prettyPrint(id, depth) + ' = \n' + ' '.repeat(depth + 2) + prettyPrint(expression, depth + 2);
    },

    Import: ({ kind, path, modifier }) => {
      return 'import ' + kind + ' ' + prettyPrint(path, depth) + ' ' + prettyPrint(modifier, depth);
    },

    ImportAliasing: ({ kind, path, alias }) => {
      return 'import ' + kind + ' ' + prettyPrint(path, depth) + ' as ' + prettyPrint(alias, depth);
    },

    Export: ({ identifier }) => {
      return 'export ' + prettyPrint(identifier, depth);
    },

    ExportAliasing: ({ identifier, alias }) => {
      return 'export ' + prettyPrint(identifier, depth) + ' as ' + prettyPrint(alias, depth);
    },

    ExprSequence: ({ expression, rest }) => {
      return `${prettyPrint(expression, depth)};\n${' '.repeat(depth)}${prettyPrint(rest, depth)}`;
    },

    Invoke: ({ callee, input, options }) => {
      return p(callee, depth) + ' ' + p(input, depth) + ' ' + prettyPrint(options, depth); 
    },

    Pipe: ({ input, transformation }) => {
      return p(input, depth) + ' |> ' + p(transformation, depth); 
    },

    Variable: ({ id }) => {
      return prettyPrint(id, depth);
    },

    Let: ({ binding, value, expression }) => {
      return 'let ' + prettyPrint(binding, depth) + ' = ' + prettyPrint(value, depth) + ' in\n'
      +      ' '.repeat(depth) + prettyPrint(expression, depth); 
    },

    IfThenElse: ({ condition, consequent, alternate }) => {
      return 'if ' + prettyPrint(condition, depth) + ' then ' + prettyPrint(consequent, depth) + ' else ' + prettyPrint(alternate, depth);
    },

    Get: ({ expression, property }) => {
      return p(expression, depth) + '.' + prettyPrint(property, depth);
    },

    Infix: ({ left, right, operator }) => {
      return p(left, depth) + ' `' + prettyPrint(operator, depth) + ' ' + p(right, depth);
    },

    Prefix: ({ operator, expression }) => {
      return prettyPrint(operator, depth) + ' ' + p(expression, depth);
    },

    Open: ({ record, modifier, body }) => {
      return `open ${prettyPrint(record, depth)} ${prettyPrint(modifier, depth)} in ${prettyPrint(body, depth)}`;
    },

    OpenExpose: ({ bindings }) => {
      return 'exposing ' + bindings.map(x => prettyPrint(x, depth)).join(', ');
    },

    OpenHide: ({ bindings }) => {
      return 'excluding ' + bindings.join(', ');
    },

    OpenAll: () => {
      return '';
    },

    OpenBinding: ({ name, alias }) => {
      return name === alias ?  name
      :      /* else */        `${name} as ${alias}`;
    },

    Shell: ({ command, args, options }) => {
      return `\$(${prettyPrint(command, depth)} ${args.map(x => prettyPrint(x, depth)).join(' ')} @ ${prettyPrint(options, depth)})`;
    },

    ShellSymbol: ({ symbol }) => {
      return symbol;
    },

    ShellSpread: ({ items }) => {
      return prettyPrint(items, depth);
    },

    ShellExpression: ({ expression }) => {
      return p(expression, depth);
    },

    Do: ({ instructions }) => {
      return `do\n  ${instructions.map(x => prettyPrint(x, depth + 2)).join('\n' + ' '.repeat(depth + 2))}`;
    },

    DoCall: ({ expression }) => {
      return `call ${prettyPrint(expression, depth)}`;
    },

    DoAction: ({ expression }) => {
      return `action ${prettyPrint(expression, depth)}`;
    },

    DoReturn: ({ expression }) => {
      return `return ${prettyPrint(expression, depth)}`;
    },

    DoBind: ({ id, expression }) => {
      return `bind ${prettyPrint(id, depth)} <- ${prettyPrint(expression, depth)}`;
    },

    DoLet: ({ id, expression }) => {
      return `let ${prettyPrint(id, depth)} = ${prettyPrint(expression, depth)}`;
    },

    DoIfThenElse: ({ condition, consequent, alternate }) => {
      return [
        `if ${prettyPrint(condition, depth)}`,
        'then',
          ...consequent.map(x => `  ${prettyPrint(x, depth + 2)}`),
        'else',
          ...alternate.map(x => `  ${prettyPrint(x, depth + 2)}`)
      ].join('\n' + ' '.repeat(depth));
    },

    Program: ({ declarations }) => {
      return declarations.map(x => prettyPrint(x, depth)).join('\n' + ' '.repeat(depth));
    }
  });
};


module.exports = prettyPrint;
