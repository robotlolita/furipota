//----------------------------------------------------------------------
//
// This source file is part of the furipota project.
//
// Licensed under MIT. See LICENCE for full licence information.
// See CONTRIBUTORS for the list of contributors to the project.
//
//----------------------------------------------------------------------

const ast = require('../ast');


class BindingBox {
  constructor() {
    this.count = 0;
  }

  fresh() {
    return `$${++this.count}`;
  }
}


const makeLambda = (args, recordArg, expr) => {
  const lastArg = args[args.length - 1];
  return args.slice(0, -1).reduceRight((fn, arg) => {
    return ast.Lambda(arg, ast.Identifier('_'), fn);
  }, ast.Lambda(lastArg, recordArg, expr))
};


const collectInvokeHoles = (bindings, node) => {
  if (!ast.Invoke.hasInstance(node)) {
    throw new SyntaxError(`Expected an Invoke node, got ${node}`);
  }

  const [choles, callee] = collectImmediateHoles(bindings, node.callee);
  const [iholes, input] = collectHole(bindings, node.input);
  const [oholes, options] = collectOptionHoles(bindings, node.options);
  const holes = [...choles, ...iholes, ...oholes];

  return [holes, ast.Invoke(callee, input, options)];
};


const collectHole = (bindings, input) => {
  if (ast.Hole.hasInstance(input)) {
    const name = bindings.fresh();
    return [[name], ast.Variable(ast.Identifier(name))];
  } else {
    return [[], desugarHoles(bindings, input)];
  }
};


const collectOptionHoles = (bindings, options) => {
  if (!ast.Record.hasInstance(options)) {
    throw new SyntaxError(`Expected a record for options, got ${options}`);
  }

  const [holes, pairs] = options.pairs.reduce(
    ([holes, pairs], [key, value]) => {
      const [newHoles, newValue] = collectHole(bindings, value);
      return [
        [...holes, ...newHoles], 
        [...pairs, [key, newValue]]
      ];
    },
    [[], []]
  );

  return [holes, ast.Record(pairs)];
};


const collectImmediateHoles = (bindings, node) => {
  if (ast.Invoke.hasInstance(node)) {
    return collectInvokeHoles(bindings, node);
  } else {
    return collectHole(bindings, node);
  }
};


const maybeSimplifyInvokeHoles = (bindings, node) => {
  const [holes, newNode] = collectInvokeHoles(bindings, node);

  if (holes.length > 0) {
    return makeLambda(
      holes.map(ast.Identifier),
      ast.Identifier('_'),
      newNode
    );
  } else {
    return newNode;
  }
};


const collectPipeHoles = (bindings, node) => {
  const [holes, newTransformation] = collectImmediateHoles(bindings, node.transformation);
  return [holes, ast.Pipe(desugarHoles(bindings, node.input), newTransformation)];
};


const maybeSimplifyPipeHoles = (bindings, node) => {
  const [holes, newNode] = collectPipeHoles(bindings, node);

  if (holes.length > 0) {
    return ast.Pipe(
      newNode.input,
      makeLambda(
        holes.map(ast.Identifier),
        ast.Identifier('_'),
        newNode.transformation
      )
    );
  } else {
    return newNode;
  }
};



const desugarHoles = (bindings, node) =>
  node.matchWith({
    Seq: ({ items }) =>
      ast.Seq(items.map(x => desugarHoles(bindings, x))),

    Identifier: ({ name }) =>
      ast.Identifier(name),

    Hole: () => {
      throw new SyntaxError(`Holes are only allowed in function applications.`);
    },

    Keyword: ({ name }) =>
      ast.Keyword(name),

    Text: ({ value }) =>
      ast.Text(value),

    Character: ({ character }) =>
      ast.Character(character),

    InterpolateExpression: ({ expression }) =>
      ast.InterpolateExpression(desugarHoles(bindings, expression)),

    Interpolate: ({ items }) =>
      ast.Interpolate(items.map(x => desugarHoles(bindings, x))),

    Integer: ({ sign, value }) =>
      ast.Integer(sign, value),

    Decimal: ({ sign, integral, decimal, exponent }) =>
      ast.Decimal(sign, integral, decimal, exponent),

    Boolean: ({ value }) =>
      ast.Boolean(value),

    Vector: ({ items }) =>
      ast.Vector(items.map(x => desugarHoles(bindings, x))),

    VectorSpread: ({ expression }) =>
      ast.VectorSpread(desugarHoles(bindings, expression)),

    VectorElement: ({ expression }) =>
      ast.VectorElement(desugarHoles(bindings, expression)),

    Record: ({ pairs }) =>
      ast.Record(
        pairs.map(([k, v]) => 
          [k, desugarHoles(bindings, v)]
        )
      ),

    Lambda: ({ value, options, expression }) =>
      ast.Lambda(value, options, desugarHoles(bindings, expression)),

    Tagged: ({ tag, predicates }) =>
      ast.Tagged(tag, predicates.map(x => desugarHoles(bindings, x))),

    Match: ({ expression, cases }) =>
      ast.Match(
        desugarHoles(bindings, expression),
        cases.map(x => desugarHoles(bindings, x))
      ),

    MatchCase: ({ pattern, expression }) =>
      ast.MatchCase(
        desugarHoles(bindings, pattern),
        desugarHoles(bindings, expression)
      ),

    MatchBind: ({ identifier }) =>
      ast.MatchBind(identifier),

    MatchEquals: ({ identifier, expression }) =>
      ast.MatchEquals(identifier, desugarHoles(bindings, expression)),

    MatchTagged: ({ tag, patterns }) =>
      ast.MatchTagged(
        desugarHoles(bindings, tag),
        patterns.map(x => desugarHoles(bindings, x))
      ),

    MatchVector: ({ items }) =>
      ast.MatchVector(items.map(x => desugarHoles(bindings, x))),

    MatchVectorSpread: ({ pattern }) =>
      ast.MatchVectorSpread(desugarHoles(bindings, pattern)),

    MatchVectorElement: ({ pattern }) =>
      ast.MatchVectorElement(desugarHoles(bindings, pattern)),

    MatchAny: () => 
      ast.MatchAny(),

    Define: ({ id, expression, documentation }) =>
      ast.Define(id, desugarHoles(bindings, expression), documentation),

    Import: ({ path, kind, modifier }) =>
      ast.Import(path, kind, modifier),

    ImportAliasing: ({ path, alias, kind }) =>
      ast.ImportAliasing(path, alias, kind),

    Export: ({ identifier }) =>
      ast.Export(identifier),

    ExportAliasing: ({ identifier, alias }) =>
      ast.ExportAliasing(identifier, alias),

    ExprSequence: ({ expression, rest }) =>
      ast.ExprSequence(
        desugarHoles(bindings, expression),
        desugarHoles(bindings, rest)
      ),

    Invoke: ({ callee, input, options }) =>
      maybeSimplifyInvokeHoles(bindings, ast.Invoke(callee, input, options)),

    Pipe: ({ input, transformation }) =>
      maybeSimplifyPipeHoles(bindings, ast.Pipe(input, transformation)),

    Variable: ({ id }) =>
      ast.Variable(id),

    Let: ({ binding, value, expression }) =>
      ast.Let(binding, desugarHoles(bindings, value), desugarHoles(bindings, expression)),

    IfThenElse: ({ condition, consequent, alternate }) =>
      ast.IfThenElse(
        desugarHoles(bindings, condition),
        desugarHoles(bindings, consequent),
        desugarHoles(bindings, alternate)
      ),

    Get: ({ expression, property }) =>
      ast.Get(desugarHoles(bindings, expression), property),

    Infix: ({ operator, left, right }) => {
      throw new SyntaxError(`Infix node found while desugaring holes, after desugaring applications. This is probably an error in the Furipota compiler.`);
    },

    Prefix: ({ operator, expression }) => {
      throw new SyntaxError(`Prefix node found while desugaring holes, after desugaring applications. This is probably an error in the Furipota compiler.`)
    },

    Open: ({ record, modifier, body }) =>
      ast.Open(
        desugarHoles(bindings, record),
        modifier,
        desugarHoles(bindings, body)
      ),

    Shell: ({ command, args, options }) =>
      ast.Shell(
        desugarHoles(bindings, command), 
        args.map(x => desugarHoles(bindings, x)), 
        desugarHoles(bindings, options)
      ),

    ShellSymbol: ({ symbol }) =>
      ast.ShellSymbol(symbol),

    ShellSpread: ({ items }) =>
      ast.ShellSpread(desugarHoles(bindings, items)),

    ShellExpression: ({ expression }) =>
      ast.ShellExpression(desugarHoles(bindings, expression)),

    Do: ({ instructions }) =>
      ast.Do(instructions.map(x => desugarHoles(bindings, x))),

    DoCall: ({ expression }) =>
      ast.DoCall(desugarHoles(bindings, expression)),

    DoAction: ({ expression }) =>
      ast.DoAction(desugarHoles(bindings, expression)),

    DoReturn: ({ expression }) =>
      ast.DoReturn(desugarHoles(bindings, expression)),

    DoBind: ({ id, expression }) =>
      ast.DoBind(id, desugarHoles(bindings, expression)),

    DoLet: ({ id, expression }) =>
      ast.DoLet(id, desugarHoles(bindings, expression)),

    DoIfThenElse: ({ condition, consequent, alterenate }) =>
      ast.DoIfThenElse(
        desugarHoles(bindings, condition),
        desugarHoles(bindings, consequent),
        desugarHoles(bindings, alternate)
      ),

    Program: ({ declarations }) =>
      ast.Program(declarations.map(x => desugarHoles(bindings, x)))
  });


module.exports = (node) => desugarHoles(new BindingBox(), node);
