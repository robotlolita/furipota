//----------------------------------------------------------------------
//
// This source file is part of the furipota project.
//
// Licensed under MIT. See LICENCE for full licence information.
// See CONTRIBUTORS for the list of contributors to the project.
//
//----------------------------------------------------------------------

const { data, derivations } = require('folktale/core/adt');

const AST = data('furipota:ast', {
  Seq(items) {
    return { items };
  },

  // --[ Basic entities ]-----------------------------------------------
  Identifier(name) {
    return { name };
  },

  Keyword(name) {
    return { name };
  },

  Text(value) {
    return { value };
  },

  Character(character) {
    return { character };
  },

  InterpolateExpression(expression) {
    return { expression };
  },

  Interpolate(items) {
    return { items };
  },

  Integer(sign, value) {
    return { sign, value };
  },

  Decimal(sign, integral, decimal, exponent) {
    return { sign, integral, decimal, exponent };
  },

  Boolean(value) {
    return { value };
  },

  Vector(items) {
    return { items };
  },

  VectorSpread(expression) {
    return { expression };
  },

  VectorElement(expression) {
    return { expression };
  },

  Record(pairs) {
    return { pairs };
  },

  Lambda(value, options, expression) {
    return { value, options, expression };
  },

  Tagged(tag, value) {
    return { tag, value };
  },

  // --[ Declarations ]-------------------------------------------------
  Define(id, expression, documentation) {
    return { id, expression, documentation };
  },

  Import(path, kind) {
    return { path, kind };
  },

  ImportAliasing(path, alias, kind) {
    return { path, alias, kind };
  },

  Export(identifier) {
    return { identifier };
  },

  ExportAliasing(identifier, alias) {
    return { identifier, alias };
  },

  // --[ Expressions ]--------------------------------------------------
  Invoke(callee, input, options) {
    return { callee, input, options };
  },

  Partial(callee, options) {
    return { callee, options };
  },

  Pipe(input, transformation) {
    return { input, transformation };
  },

  Variable(id) {
    return { id };
  },

  Let(binding, value, expression) {
    return { binding, value, expression };
  },

  IfThenElse(condition, consequent, alternate) {
    return { condition, consequent, alternate };
  },

  Get(expression, property) {
    return { expression, property };
  },

  Infix(operator, left, right) {
    return { operator, left, right };
  },

  Prefix(operator, expression) {
    return { operator, expression };
  },


  // --[ Shell sublanguage ]-------------------------------------------
  Shell(command, args, options) {
    return { command, args, options }
  },

  ShellSymbol(symbol) {
    return { symbol };
  },

  ShellSpread(items) {
    return { items };
  },

  ShellExpression(expression) {
    return { expression };
  },


  // --[ Imperative sublanguage ]--------------------------------------
  Do(instructions) {
    return { instructions };
  },

  DoCall(expression) {
    return { expression };
  },

  DoAction(expression) {
    return { expression };
  },

  DoReturn(expression) {
    return { expression };
  },

  DoBind(id, expression) {
    return { id, expression };
  },

  DoLet(id, expression) {
    return { id, expression };
  },

  DoIfThenElse(condition, consequent, alternate) {
    return { condition, consequent, alternate };
  },

  // --[ Entry point ]--------------------------------------------------
  Program(declarations) {
    return { declarations };
  }
}).derive(
  derivations.equality,
  derivations.debugRepresentation,
  derivations.serialization
);

const provide = (union, method, pattern) =>
  Object.keys(pattern).forEach(k => union[k].prototype[method] = pattern[k]);

const needsParenthesis = (ast) =>
  ![
    AST.Identifier, AST.Keyword, AST.Text, AST.Integer, AST.Decimal, 
    AST.Boolean, AST.Record, AST.Vector, AST.Variable, AST.Shell,
    AST.Get
  ].some(
    x => x.hasInstance(ast)
  );

const p = (ast, depth) =>
  needsParenthesis(ast) ? `(${ast.prettyPrint(depth)})`
: /* otherwise */         ast.prettyPrint(depth);


provide(AST, 'prettyPrint', {
  Seq(depth) {
    return this.items.map(x => x.prettyPrint(depth)).join('\n' + ' '.repeat(depth));
  },

  Identifier(depth) {
    return this.name;
  },

  Keyword(depth) {
    return this.name + ':';
  },

  Text(depth) {
    return JSON.stringify(this.value);
  },

  Interpolate(depth) {
    return JSON.stringify(this.items.map(x => x.prettyPrint(depth)));
  },

  Character(depth) {
    return this.character;
  },

  InterpolateExpression(depth) {
    return `{${this.expression.prettyPrint(depth)}}`;
  },

  Integer(depth) {
    return this.sign + this.value;
  },

  Decimal(depth) {
    return this.sign + this.integral + '.' + this.decimal + (this.exponent || '');
  },

  Boolean(depth) {
    return String(this.value);
  },

  Vector(depth) {
    return '[' + this.items.map(x => x.prettyPrint(depth)).join(', ') + ']';
  },

  VectorSpread(depth) {
    return `...${this.expression.prettyPrint(depth)}`;
  },

  VectorElement(depth) {
    return this.expression.prettyPrint(depth);
  },

  Record(depth) {
    return '{' + this.pairs.map(([k, v]) => k.prettyPrint(depth) + ' ' + p(v, depth)).join(' ') + '}';
  },

  Lambda(depth) {
    return `${this.value.prettyPrint(depth)} @${this.options.prettyPrint(depth)} -> ${this.expression.prettyPrint(depth)}`
  },

  Tagged(depth) {
    return `^${this.tag.prettyPrint(depth)} ${p(this.value, depth)}`;
  },

  Define(depth) {
    return 'define ' + this.id.prettyPrint(depth) + ' = \n' + ' '.repeat(depth + 2) + this.expression.prettyPrint(depth + 2);
  },

  Import(depth) {
    return 'import ' + this.kind + ' ' + this.path.prettyPrint(depth);
  },

  ImportAliasing(depth) {
    return 'import ' + this.kind + ' ' + this.path.prettyPrint(depth) + ' as ' + this.alias.prettyPrint(depth);
  },

  Export(depth) {
    return 'export ' + this.identifier.prettyPrint(depth);
  },

  ExportAliasing(depth) {
    return 'export ' + this.identifier.prettyPrint(depth) + ' as ' + this.alias.prettyPrint(depth);
  },

  Invoke(depth) {
    return p(this.callee, depth) + ' ' + p(this.input, depth) + ' ' + this.options.prettyPrint(depth); 
  },

  Partial(depth) {
    return p(this.callee, depth) + ' _ ' + this.options.prettyPrint(depth);
  },

  Pipe(depth) {
    return p(this.input, depth) + ' |> ' + p(this.transformation, depth); 
  },

  Variable(depth) {
    return this.id.prettyPrint(depth);
  },

  Let(depth) {
    return 'let ' + this.binding.prettyPrint(depth) + ' = ' + this.value.prettyPrint(depth) + ' in\n'
    +      ' '.repeat(depth) + this.expression.prettyPrint(depth); 
  },

  IfThenElse(depth) {
    return 'if ' + this.condition.prettyPrint(depth) + ' then ' + this.consequent.prettyPrint(depth) + ' else ' + this.alternate.prettyPrint(depth);
  },

  Get(depth) {
    return p(this.expression, depth) + '.' + this.property.prettyPrint(depth);
  },

  Infix(depth) {
    return p(this.left, depth) + ' `' + this.operator.prettyPrint(depth) + ' ' + p(this.right, depth);
  },

  Prefix(depth) {
    return this.operator.prettyPrint(depth) + ' ' + p(this.expression, depth);
  },

  Shell(depth) {
    return `\$(${this.command.prettyPrint(depth)} ${this.args.map(x => x.prettyPrint(depth)).join(' ')} @ ${this.options.prettyPrint(depth)})`;
  },

  ShellSymbol(depth) {
    return this.symbol;
  },

  ShellSpread(depth) {
    return this.items.prettyPrint(depth);
  },

  ShellExpression(depth) {
    return p(this.expression, depth);
  },

  Do(depth) {
    return `do\n  ${this.instructions.map(x => x.prettyPrint(depth + 2)).join('\n' + ' '.repeat(depth + 2))}`;
  },

  DoCall(depth) {
    return `call ${this.expression.prettyPrint(depth)}`;
  },

  DoAction(depth) {
    return `action ${this.expression.prettyPrint(depth)}`;
  },

  DoReturn(depth) {
    return `return ${this.expression.prettyPrint(depth)}`;
  },

  DoBind(depth) {
    return `bind ${this.id.prettyPrint(depth)} <- ${this.expression.prettyPrint(depth)}`;
  },

  DoLet(depth) {
    return `let ${this.id.prettyPrint(depth)} = ${this.expression.prettyPrint(depth)}`;
  },

  DoIfThenElse(depth) {
    return [
      `if ${this.condition.prettyPrint(depth)}`,
      'then',
        ...this.consequent.map(x => `  ${x.prettyPrint(depth + 2)}`),
      'else',
        ...this.alternate.map(x => `  ${x.prettyPrint(depth + 2)}`)
    ].join('\n' + ' '.repeat(depth));
  },

  Program(depth) {
    return this.declarations.map(x => x.prettyPrint(depth)).join('\n' + ' '.repeat(depth));
  }
});



module.exports = AST;
