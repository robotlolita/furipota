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
    AST.Get
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

    Tagged: ({ tag, value }) => {
      return `^${prettyPrint(tag, depth)} ${p(value, depth)}`;
    },

    Define: ({ id, expression }) => {
      return 'define ' + prettyPrint(id, depth) + ' = \n' + ' '.repeat(depth + 2) + prettyPrint(expression, depth + 2);
    },

    Import: ({ kind, path }) => {
      return 'import ' + kind + ' ' + prettyPrint(path, depth);
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

    Invoke: ({ callee, input, options }) => {
      return p(callee, depth) + ' ' + p(input, depth) + ' ' + prettyPrint(options, depth); 
    },

    Partial: ({ callee, options }) => {
      return p(callee, depth) + ' _ ' + prettyPrint(options, depth);
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
