//----------------------------------------------------------------------
//
// This source file is part of the furipota project.
//
// Licensed under MIT. See LICENCE for full licence information.
// See CONTRIBUTORS for the list of contributors to the project.
//
//----------------------------------------------------------------------

const ast = require('../ast');


const desugarApplication = (node) => 
  node.matchWith({
    Seq: ({ items }) =>
      ast.Seq(items.map(desugarApplication)),

    Identifier: ({ name }) =>
      ast.Identifier(name),

    Hole: () =>
      ast.Hole(),

    Keyword: ({ name }) =>
      ast.Keyword(name),

    Text: ({ value }) =>
      ast.Text(value),

    Character: ({ character }) =>
      ast.Character(character),

    InterpolateExpression: ({ expression }) =>
      ast.InterpolateExpression(desugarApplication(expression)),

    Interpolate: ({ items }) =>
      ast.Interpolate(items.map(desugarApplication)),

    Integer: ({ sign, value }) =>
      ast.Integer(sign, value),

    Decimal: ({ sign, integral, decimal, exponent }) =>
      ast.Decimal(sign, integral, decimal, exponent),

    Boolean: ({ value }) =>
      ast.Boolean(value),

    Vector: ({ items }) =>
      ast.Vector(items.map(desugarApplication)),

    VectorSpread: ({ expression }) =>
      ast.VectorSpread(desugarApplication(expression)),

    VectorElement: ({ expression }) =>
      ast.VectorElement(desugarApplication(expression)),

    Record: ({ pairs }) =>
      ast.Record(
        pairs.map(([k, v]) => [k, desugarApplication(v)])
      ),

    Lambda: ({ value, options, expression }) =>
      ast.Lambda(value, options, desugarApplication(expression)),

    Tagged: ({ tag, predicates }) =>
      ast.Tagged(tag, predicates.map(desugarApplication)),

    Match: ({ expression, cases }) =>
      ast.Match(
        desugarApplication(expression),
        cases.map(desugarApplication)
      ),

    MatchCase: ({ pattern, expression }) =>
      ast.MatchCase(desugarApplication(pattern), desugarApplication(expression)),

    MatchBind: ({ identifier }) =>
      ast.MatchBind(identifier),

    MatchEquals: ({ identifier, expression }) =>
      ast.MatchEquals(identifier, desugarApplication(expression)),

    MatchTagged: ({ tag, patterns }) =>
      ast.MatchTagged(desugarApplication(tag), patterns.map(desugarApplication)),

    MatchVector: ({ items }) =>
      ast.MatchVector(items.map(desugarApplication)),

    MatchVectorSpread: ({ pattern }) =>
      ast.MatchVectorSpread(desugarApplication(pattern)),

    MatchVectorElement: ({ pattern }) =>
      ast.MatchVectorElement(desugarApplication(pattern)),

    MatchAny: () => 
      ast.MatchAny(),

    Define: ({ id, expression, documentation }) =>
      ast.Define(id, desugarApplication(expression), documentation),

    Import: ({ path, kind, modifier }) =>
      ast.Import(path, kind, modifier),

    ImportAliasing: ({ path, alias, kind }) =>
      ast.ImportAliasing(path, alias, kind),

    Export: ({ identifier }) =>
      ast.Export(identifier),

    ExportAliasing: ({ identifier, alias }) =>
      ast.ExportAliasing(identifier, alias),

    ExprSequence: ({ expression, rest }) =>
      ast.ExprSequence(desugarApplication(expression), desugarApplication(rest)),

    Invoke: ({ callee, input, options }) =>
      ast.Invoke(desugarApplication(callee), desugarApplication(input), desugarApplication(options)),

    Pipe: ({ input, transformation }) =>
      ast.Pipe(desugarApplication(input), desugarApplication(transformation)),

    Variable: ({ id }) =>
      ast.Variable(id),

    Let: ({ binding, value, expression }) =>
      ast.Let(binding, desugarApplication(value), desugarApplication(expression)),

    IfThenElse: ({ condition, consequent, alternate }) =>
      ast.IfThenElse(
        desugarApplication(condition),
        desugarApplication(consequent),
        desugarApplication(alternate)
      ),

    Get: ({ expression, property }) =>
      ast.Get(desugarApplication(expression), property),

    Infix: ({ operator, left, right }) =>
      ast.Invoke(
        ast.Invoke(
          operator,
          desugarApplication(left),
          ast.Record([])
        ),
        desugarApplication(right),
        ast.Record([])
      ),

    Prefix: ({ operator, expression }) =>
      ast.Invoke(operator, desugarApplication(expression), ast.Record([])),

    Open: ({ record, modifier, body }) =>
      ast.Open(desugarApplication(record), modifier, desugarApplication(body)),

    Shell: ({ command, args, options }) =>
      ast.Shell(desugarApplication(command), args.map(desugarApplication), desugarApplication(options)),

    ShellSymbol: ({ symbol }) =>
      ast.ShellSymbol(symbol),

    ShellSpread: ({ items }) =>
      ast.ShellSpread(desugarApplication(items)),

    ShellExpression: ({ expression }) =>
      ast.ShellExpression(desugarApplication(expression)),

    Do: ({ instructions }) =>
      ast.Do(instructions.map(desugarApplication)),

    DoCall: ({ expression }) =>
      ast.DoCall(desugarApplication(expression)),

    DoAction: ({ expression }) =>
      ast.DoAction(desugarApplication(expression)),

    DoReturn: ({ expression }) =>
      ast.DoReturn(desugarApplication(expression)),

    DoBind: ({ id, expression }) =>
      ast.DoBind(id, desugarApplication(expression)),

    DoLet: ({ id, expression }) =>
      ast.DoLet(id, desugarApplication(expression)),

    DoIfThenElse: ({ condition, consequent, alternate }) =>
      ast.DoIfThenElse(
        desugarApplication(condition),
        desugarApplication(consequent),
        desugarApplication(alternate)
      ),

    Program: ({ declarations }) =>
      ast.Program(declarations.map(desugarApplication))
  });


module.exports = desugarApplication;